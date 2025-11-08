// server/services/googleDriveService.js
const { google } = require('googleapis');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const stream = require('stream');

class GoogleDriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL}/api/auth/google/callback`
    );

    this.drive = google.drive({
      version: 'v3',
      auth: this.oauth2Client
    });

    this.scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    this.supportedMimeTypes = this.getSupportedMimeTypes();
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Health check for Google Drive API
   */
  async healthCheck(accessToken = null) {
    try {
      if (accessToken) {
        this.oauth2Client.setCredentials({ access_token: accessToken });
      }

      const response = await this.drive.about.get({
        fields: 'user,storageQuota'
      });

      return {
        healthy: true,
        message: 'Google Drive API is accessible',
        user: response.data.user,
        storageQuota: response.data.storageQuota
      };
    } catch (error) {
      console.error('Google Drive API health check failed:', error);
      return {
        healthy: false,
        error: this.normalizeGoogleError(error)
      };
    }
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(accessToken) {
    this.oauth2Client.setCredentials({
      access_token: accessToken
    });
  }

  /**
   * Generate authentication URL
   */
  generateAuthUrl(state = null) {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: state || uuidv4(),
      prompt: 'consent',
      include_granted_scopes: true
    });

    return {
      url: authUrl,
      state: state
    };
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken) {
    try {
      this.setAccessToken(accessToken);

      const response = await this.drive.about.get({
        fields: 'user'
      });

      const user = response.data.user;

      return {
        success: true,
        profile: {
          id: user.permissionId,
          email: user.emailAddress,
          name: user.displayName,
          photo: user.photoLink,
          permissionId: user.permissionId
        }
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        error: this.normalizeGoogleError(error)
      };
    }
  }

  /**
   * List files and folders with pagination
   */
  async listFiles(accessToken, options = {}) {
    try {
      this.setAccessToken(accessToken);

      const {
        pageSize = 100,
        pageToken = null,
        folderId = 'root',
        query = '',
        orderBy = 'name',
        fields = 'files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,parents)'
      } = options;

      let driveQuery = `'${folderId}' in parents and trashed = false`;

      if (query) {
        driveQuery += ` and (name contains '${query}' or fullText contains '${query}')`;
      }

      // Filter by supported file types for code analysis
      if (options.onlySupported) {
        const mimeTypes = Object.values(this.supportedMimeTypes);
        const mimeQuery = mimeTypes.map(type => `mimeType = '${type}'`).join(' or ');
        driveQuery += ` and (${mimeQuery})`;
      }

      const response = await this.drive.files.list({
        pageSize: pageSize,
        pageToken: pageToken,
        q: driveQuery,
        orderBy: orderBy,
        fields: `nextPageToken, files(${fields})`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const files = response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : 0,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        parents: file.parents || [],
        type: this.getFileType(file.mimeType),
        language: this.detectFileLanguage(file.name, file.mimeType),
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        isGoogleDoc: file.mimeType && file.mimeType.startsWith('application/vnd.google-apps.'),
        canDownload: this.canDownloadFile(file.mimeType)
      }));

      return {
        success: true,
        files: files,
        nextPageToken: response.data.nextPageToken,
        totalFiles: files.length
      };

    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      return {
        success: false,
        error: this.normalizeGoogleError(error),
        files: []
      };
    }
  }

  /**
   * Search files across Google Drive
   */
  async searchFiles(accessToken, query, options = {}) {
    try {
      this.setAccessToken(accessToken);

      const {
        pageSize = 50,
        pageToken = null,
        mimeTypes = null
      } = options;

      let driveQuery = `name contains '${query}' or fullText contains '${query}' and trashed = false`;

      if (mimeTypes) {
        const mimeQuery = mimeTypes.map(type => `mimeType = '${type}'`).join(' or ');
        driveQuery += ` and (${mimeQuery})`;
      }

      const response = await this.drive.files.list({
        pageSize: pageSize,
        pageToken: pageToken,
        q: driveQuery,
        orderBy: 'modifiedTime desc',
        fields: 'nextPageToken, files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const files = response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : 0,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        parents: file.parents || [],
        type: this.getFileType(file.mimeType),
        language: this.detectFileLanguage(file.name, file.mimeType),
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        isGoogleDoc: file.mimeType && file.mimeType.startsWith('application/vnd.google-apps.'),
        canDownload: this.canDownloadFile(file.mimeType)
      }));

      return {
        success: true,
        files: files,
        nextPageToken: response.data.nextPageToken,
        totalResults: files.length
      };

    } catch (error) {
      console.error('Error searching Google Drive files:', error);
      return {
        success: false,
        error: this.normalizeGoogleError(error),
        files: []
      };
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(accessToken, fileId) {
    try {
      this.setAccessToken(accessToken);

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,parents,description,fileExtension,md5Checksum,iconLink,thumbnailLink',
        supportsAllDrives: true
      });

      const file = response.data;

      return {
        success: true,
        file: {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ? parseInt(file.size) : 0,
          modifiedTime: file.modifiedTime,
          createdTime: file.createdTime,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
          parents: file.parents || [],
          description: file.description,
          fileExtension: file.fileExtension,
          md5Checksum: file.md5Checksum,
          iconLink: file.iconLink,
          thumbnailLink: file.thumbnailLink,
          type: this.getFileType(file.mimeType),
          language: this.detectFileLanguage(file.name, file.mimeType),
          isFolder: file.mimeType === 'application/vnd.google-apps.folder',
          isGoogleDoc: file.mimeType && file.mimeType.startsWith('application/vnd.google-apps.'),
          canDownload: this.canDownloadFile(file.mimeType)
        }
      };

    } catch (error) {
      console.error(`Error getting file metadata for ${fileId}:`, error);
      return {
        success: false,
        error: this.normalizeGoogleError(error)
      };
    }
  }

  /**
   * Download file content
   */
  async downloadFile(accessToken, fileId, options = {}) {
    const cacheKey = `file_${fileId}_${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      this.setAccessToken(accessToken);

      // First get file metadata
      const metadata = await this.getFileMetadata(accessToken, fileId);
      if (!metadata.success) {
        throw new Error(metadata.error);
      }

      const file = metadata.file;

      // Check file size
      if (file.size > this.maxFileSize) {
        throw new Error(`File size ${file.size} bytes exceeds maximum limit of ${this.maxFileSize} bytes`);
      }

      let fileContent;
      let downloadInfo;

      // Handle different file types
      if (file.isGoogleDoc) {
        // For Google Docs, export to plain text
        fileContent = await this.exportGoogleDoc(accessToken, fileId, file.mimeType);
        downloadInfo = {
          method: 'export',
          format: 'text/plain'
        };
      } else {
        // For regular files, download directly
        fileContent = await this.downloadFileDirect(accessToken, fileId);
        downloadInfo = {
          method: 'direct',
          format: file.mimeType
        };
      }

      const result = {
        success: true,
        files: [{
          id: file.id,
          name: file.name,
          content: fileContent,
          size: Buffer.from(fileContent).length,
          mimeType: file.mimeType,
          language: file.language,
          downloadInfo: downloadInfo,
          downloadedAt: new Date()
        }],
        totalFiles: 1,
        totalSize: Buffer.from(fileContent).length
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

      return result;

    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      return {
        success: false,
        error: this.normalizeGoogleError(error),
        files: []
      };
    }
  }

  /**
   * Download multiple files
   */
  async downloadFiles(accessToken, fileIds, options = {}) {
    try {
      const files = [];
      let totalSize = 0;
      const maxFiles = options.maxFiles || 100;
      const maxSize = options.maxSize || this.maxFileSize * 10; // 500MB for multiple files

      for (const fileId of fileIds.slice(0, maxFiles)) {
        try {
          const result = await this.downloadFile(accessToken, fileId, options);
          
          if (result.success && result.files.length > 0) {
            const file = result.files[0];
            
            // Check total size limit
            totalSize += file.size;
            if (totalSize > maxSize) {
              console.warn(`Total download size limit reached (${maxSize}), stopping`);
              break;
            }

            files.push(file);
          }

          // Small delay to avoid rate limiting
          await this.delay(200);
        } catch (fileError) {
          console.error(`Error downloading file ${fileId}:`, fileError);
          // Continue with other files
        }
      }

      return {
        success: true,
        files: files,
        totalFiles: files.length,
        totalSize: totalSize,
        downloadedFiles: files.length,
        failedFiles: fileIds.length - files.length
      };

    } catch (error) {
      console.error('Error downloading multiple files:', error);
      return {
        success: false,
        error: this.normalizeGoogleError(error),
        files: []
      };
    }
  }

  /**
   * Download folder contents recursively
   */
  async downloadFolder(accessToken, folderId, options = {}) {
    try {
      this.setAccessToken(accessToken);

      const {
        maxDepth = 5,
        currentDepth = 0,
        maxFiles = 1000,
        maxSize = 100 * 1024 * 1024 // 100MB
      } = options;

      if (currentDepth > maxDepth) {
        return { success: true, files: [], totalSize: 0 };
      }

      // List files in folder
      const listResult = await this.listFiles(accessToken, {
        folderId: folderId,
        onlySupported: true,
        pageSize: 1000
      });

      if (!listResult.success) {
        throw new Error(listResult.error);
      }

      const files = [];
      let totalSize = 0;

      for (const item of listResult.files) {
        if (files.length >= maxFiles) break;
        if (totalSize >= maxSize) break;

        try {
          if (item.isFolder) {
            // Recursively download subfolder
            const subfolderResult = await this.downloadFolder(accessToken, item.id, {
              ...options,
              currentDepth: currentDepth + 1
            });

            if (subfolderResult.success) {
              files.push(...subfolderResult.files);
              totalSize += subfolderResult.totalSize;
            }
          } else if (item.canDownload) {
            // Download file
            const downloadResult = await this.downloadFile(accessToken, item.id);
            
            if (downloadResult.success && downloadResult.files.length > 0) {
              const file = downloadResult.files[0];
              files.push(file);
              totalSize += file.size;
            }

            // Small delay to avoid rate limiting
            await this.delay(100);
          }
        } catch (itemError) {
          console.error(`Error processing item ${item.name}:`, itemError);
          // Continue with other items
        }
      }

      return {
        success: true,
        files: files,
        totalFiles: files.length,
        totalSize: totalSize,
        folderId: folderId,
        depth: currentDepth
      };

    } catch (error) {
      console.error(`Error downloading folder ${folderId}:`, error);
      return {
        success: false,
        error: this.normalizeGoogleError(error),
        files: []
      };
    }
  }

  /**
   * Get folder tree structure
   */
  async getFolderTree(accessToken, folderId = 'root', options = {}) {
    try {
      this.setAccessToken(accessToken);

      const {
        maxDepth = 5,
        currentDepth = 0,
        includeFiles = true
      } = options;

      if (currentDepth > maxDepth) {
        return { name: '...', type: 'folder', children: [] };
      }

      // Get folder metadata
      const folderMetadata = await this.getFileMetadata(accessToken, folderId);
      if (!folderMetadata.success) {
        throw new Error(folderMetadata.error);
      }

      const folder = {
        id: folderMetadata.file.id,
        name: folderMetadata.file.name,
        type: 'folder',
        mimeType: folderMetadata.file.mimeType,
        children: []
      };

      // List folder contents
      const listResult = await this.listFiles(accessToken, {
        folderId: folderId,
        pageSize: 1000
      });

      if (!listResult.success) {
        throw new Error(listResult.error);
      }

      for (const item of listResult.files) {
        if (item.isFolder) {
          // Recursively get subfolder tree
          const subfolder = await this.getFolderTree(accessToken, item.id, {
            ...options,
            currentDepth: currentDepth + 1
          });
          folder.children.push(subfolder);
        } else if (includeFiles) {
          folder.children.push({
            id: item.id,
            name: item.name,
            type: 'file',
            mimeType: item.mimeType,
            size: item.size,
            language: item.language,
            canDownload: item.canDownload
          });
        }
      }

      // Sort: folders first, then files
      folder.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return folder;

    } catch (error) {
      console.error(`Error getting folder tree for ${folderId}:`, error);
      return {
        id: folderId,
        name: 'Error',
        type: 'folder',
        children: [],
        error: this.normalizeGoogleError(error)
      };
    }
  }

  /**
   * Get recent files
   */
  async getRecentFiles(accessToken, options = {}) {
    try {
      this.setAccessToken(accessToken);

      const {
        pageSize = 50,
        pageToken = null,
        days = 7
      } = options;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTime = cutoffDate.toISOString();

      const response = await this.drive.files.list({
        pageSize: pageSize,
        pageToken: pageToken,
        q: `modifiedTime > '${cutoffTime}' and trashed = false`,
        orderBy: 'modifiedTime desc',
        fields: 'nextPageToken, files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const files = response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : 0,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        parents: file.parents || [],
        type: this.getFileType(file.mimeType),
        language: this.detectFileLanguage(file.name, file.mimeType),
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        isGoogleDoc: file.mimeType && file.mimeType.startsWith('application/vnd.google-apps.'),
        canDownload: this.canDownloadFile(file.mimeType)
      }));

      return {
        success: true,
        files: files,
        nextPageToken: response.data.nextPageToken,
        totalFiles: files.length,
        cutoffTime: cutoffTime
      };

    } catch (error) {
      console.error('Error getting recent files:', error);
      return {
        success: false,
        error: this.normalizeGoogleError(error),
        files: []
      };
    }
  }

  // Helper Methods

  /**
   * Direct file download
   */
  async downloadFileDirect(accessToken, fileId) {
    return new Promise((resolve, reject) => {
      this.setAccessToken(accessToken);

      this.drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' },
        (err, response) => {
          if (err) {
            reject(err);
            return;
          }

          const chunks = [];
          response.data
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => {
              const buffer = Buffer.concat(chunks);
              resolve(buffer.toString('utf8'));
            })
            .on('error', reject);
        }
      );
    });
  }

  /**
   * Export Google Doc to text
   */
  async exportGoogleDoc(accessToken, fileId, mimeType) {
    this.setAccessToken(accessToken);

    // Map Google Doc types to export formats
    const exportMimeType = this.getExportMimeType(mimeType);

    const response = await this.drive.files.export(
      {
        fileId: fileId,
        mimeType: exportMimeType
      },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      const chunks = [];
      response.data
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('utf8'));
        })
        .on('error', reject);
    });
  }

  /**
   * Get supported MIME types for code analysis
   */
  getSupportedMimeTypes() {
    return {
      // Text files
      'text/plain': 'text/plain',
      'text/x-python': 'text/x-python',
      'text/x-java': 'text/x-java',
      'text/x-c': 'text/x-c',
      'text/x-c++': 'text/x-c++',
      'text/x-csharp': 'text/x-csharp',
      'text/x-php': 'text/x-php',
      'text/x-ruby': 'text/x-ruby',
      'text/x-go': 'text/x-go',
      'text/x-rust': 'text/x-rust',
      'text/x-shellscript': 'text/x-shellscript',
      
      // Web files
      'text/html': 'text/html',
      'text/css': 'text/css',
      'text/javascript': 'text/javascript',
      'application/javascript': 'application/javascript',
      'application/json': 'application/json',
      'application/xml': 'application/xml',
      
      // Google Docs (exportable)
      'application/vnd.google-apps.document': 'application/vnd.google-apps.document',
      'application/vnd.google-apps.script': 'application/vnd.google-apps.script'
    };
  }

  /**
   * Get file type category
   */
  getFileType(mimeType) {
    if (mimeType.startsWith('application/vnd.google-apps.')) {
      return 'google-doc';
    } else if (mimeType.startsWith('text/')) {
      return 'text';
    } else if (mimeType.startsWith('application/')) {
      return 'application';
    } else {
      return 'other';
    }
  }

  /**
   * Detect file language from name and MIME type
   */
  detectFileLanguage(filename, mimeType) {
    const ext = path.extname(filename).toLowerCase();
    
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'text',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.ps1': 'powershell',
      '.bat': 'batch',
      '.cmd': 'batch'
    };

    // Check MIME type for Google Docs
    if (mimeType === 'application/vnd.google-apps.document') {
      return 'text';
    } else if (mimeType === 'application/vnd.google-apps.script') {
      return 'javascript';
    }

    return languageMap[ext] || 'text';
  }

  /**
   * Check if file can be downloaded
   */
  canDownloadFile(mimeType) {
    // Can download regular files and export Google Docs
    return !mimeType.startsWith('application/vnd.google-apps.') || 
           mimeType === 'application/vnd.google-apps.document' ||
           mimeType === 'application/vnd.google-apps.script';
  }

  /**
   * Get export MIME type for Google Docs
   */
  getExportMimeType(googleMimeType) {
    const exportMap = {
      'application/vnd.google-apps.document': 'text/plain',
      'application/vnd.google-apps.script': 'application/javascript'
    };

    return exportMap[googleMimeType] || 'text/plain';
  }

  /**
   * Normalize Google API errors
   */
  normalizeGoogleError(error) {
    if (error.code === 401) {
      return 'Authentication failed - invalid or expired token';
    } else if (error.code === 403) {
      return 'Access forbidden - check file permissions';
    } else if (error.code === 404) {
      return 'File or folder not found';
    } else if (error.code === 429) {
      return 'Google API rate limit exceeded';
    } else if (error.message) {
      return error.message;
    } else {
      return 'Unknown Google API error';
    }
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      supportedMimeTypes: Object.keys(this.supportedMimeTypes).length,
      maxFileSize: this.maxFileSize,
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Validate Google Drive file ID
   */
  validateFileId(fileId) {
    // Basic validation for Google Drive file IDs
    // They are typically alphanumeric and 25-50 characters long
    if (!fileId || typeof fileId !== 'string') {
      return { valid: false, error: 'Invalid file ID format' };
    }

    if (fileId.length < 25 || fileId.length > 50) {
      return { valid: false, error: 'File ID length invalid' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return { valid: false, error: 'File ID contains invalid characters' };
    }

    return { valid: true };
  }
}

// Create singleton instance
const googleDriveService = new GoogleDriveService();

module.exports = { googleDriveService, GoogleDriveService };