import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink: string;
  webContentLink?: string;
  fileExtension?: string;
  md5Checksum?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink: string;
}

export interface GoogleDriveUser {
  email: string;
  name: string;
  picture?: string;
}

export interface DriveFileContent {
  fileId: string;
  fileName: string;
  content: Buffer;
  mimeType: string;
  size: number;
}

export interface FolderStructure {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FolderStructure[];
  mimeType?: string;
  size?: number;
}

class GoogleDriveService {
  private drive: drive_v3.Drive;
  private oauth2Client: any;
  private accessToken: string | null = null;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/google/callback`
    );

    this.drive = google.drive({
      version: 'v3',
      auth: this.oauth2Client
    });
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    this.oauth2Client.setCredentials({
      access_token: token
    });
  }

  clearAccessToken(): void {
    this.accessToken = null;
    this.oauth2Client.setCredentials(null);
  }

  // OAuth Methods
  getOAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });
  }

  async exchangeCodeForToken(code: string): Promise<{ tokens: any }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return { tokens };
  }

  // User Methods
  async getCurrentUser(): Promise<GoogleDriveUser> {
    const oauth2 = google.oauth2({
      version: 'v2',
      auth: this.oauth2Client
    });

    const response = await oauth2.userinfo.get();
    return {
      email: response.data.email!,
      name: response.data.name!,
      picture: response.data.picture
    };
  }

  // File Methods
  async listFiles(pageSize: number = 100, pageToken?: string): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
  }> {
    const response = await this.drive.files.list({
      pageSize,
      pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, fileExtension, md5Checksum)',
      orderBy: 'modifiedTime desc'
    });

    return {
      files: response.data.files as GoogleDriveFile[],
      nextPageToken: response.data.nextPageToken || undefined
    };
  }

  async searchFiles(query: string, pageSize: number = 50): Promise<GoogleDriveFile[]> {
    const response = await this.drive.files.list({
      q: query,
      pageSize,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, fileExtension, md5Checksum)'
    });

    return response.data.files as GoogleDriveFile[];
  }

  async getFile(fileId: string): Promise<GoogleDriveFile> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, fileExtension, md5Checksum'
    });

    return response.data as GoogleDriveFile;
  }

  async downloadFile(fileId: string): Promise<DriveFileContent> {
    const [fileMetadata, fileContent] = await Promise.all([
      this.getFile(fileId),
      this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      )
    ]);

    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      fileContent.data.on('data', (chunk: Buffer) => chunks.push(chunk));
      fileContent.data.on('end', () => {
        const content = Buffer.concat(chunks);
        resolve({
          fileId,
          fileName: fileMetadata.name,
          content,
          mimeType: fileMetadata.mimeType,
          size: fileMetadata.size || content.length
        });
      });
      fileContent.data.on('error', reject);
    });
  }

  async downloadFileAsText(fileId: string): Promise<string> {
    const fileContent = await this.downloadFile(fileId);
    return fileContent.content.toString('utf-8');
  }

  // Folder Methods
  async listFolders(pageSize: number = 100): Promise<GoogleDriveFolder[]> {
    const response = await this.drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      pageSize,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, parents, webViewLink)',
      orderBy: 'modifiedTime desc'
    });

    return response.data.files as GoogleDriveFolder[];
  }

  async getFolderContents(folderId: string, pageSize: number = 100): Promise<{
    files: GoogleDriveFile[];
    folders: GoogleDriveFolder[];
  }> {
    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      pageSize,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, fileExtension, md5Checksum)',
      orderBy: 'name'
    });

    const items = response.data.files as GoogleDriveFile[];
    
    const files = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');
    const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder') as GoogleDriveFolder[];

    return { files, folders };
  }

  async getFolderTree(folderId: string, maxDepth: number = 3): Promise<FolderStructure> {
    const folder = await this.getFile(folderId);
    
    const structure: FolderStructure = {
      id: folder.id,
      name: folder.name,
      type: 'folder',
      children: []
    };

    if (maxDepth > 0) {
      const contents = await this.getFolderContents(folderId, 1000);
      
      // Process files
      for (const file of contents.files) {
        structure.children!.push({
          id: file.id,
          name: file.name,
          type: 'file',
          mimeType: file.mimeType,
          size: file.size
        });
      }

      // Process subfolders recursively
      for (const subfolder of contents.folders) {
        const subfolderStructure = await this.getFolderTree(subfolder.id, maxDepth - 1);
        structure.children!.push(subfolderStructure);
      }
    }

    return structure;
  }

  // Special File Type Handling
  async exportGoogleDoc(fileId: string, mimeType: string = 'text/plain'): Promise<DriveFileContent> {
    const fileMetadata = await this.getFile(fileId);
    
    const response = await this.drive.files.export(
      { fileId, mimeType },
      { responseType: 'stream' }
    );

    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.data.on('end', () => {
        const content = Buffer.concat(chunks);
        resolve({
          fileId,
          fileName: `${fileMetadata.name}.txt`,
          content,
          mimeType,
          size: content.length
        });
      });
      response.data.on('error', reject);
    });
  }

  async getFilePreviewUrl(fileId: string): Promise<string> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'webContentLink'
    });

    return response.data.webContentLink || '';
  }

  // Batch Operations
  async downloadFolderContents(folderId: string, includeSubfolders: boolean = true): Promise<Map<string, DriveFileContent>> {
    const filesMap = new Map<string, DriveFileContent>();
    
    const processFolder = async (currentFolderId: string, currentPath: string = '') => {
      const contents = await this.getFolderContents(currentFolderId, 1000);
      
      // Download files in current folder
      for (const file of contents.files) {
        try {
          // Skip non-code files
          if (!this.isCodeFile(file.name)) {
            continue;
          }

          const fileContent = await this.downloadFile(file.id);
          const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
          
          filesMap.set(filePath, fileContent);
        } catch (error) {
          console.warn(`Failed to download file: ${file.name}`, error);
        }
      }

      // Process subfolders if requested
      if (includeSubfolders) {
        for (const folder of contents.folders) {
          const folderPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
          await processFolder(folder.id, folderPath);
        }
      }
    };

    await processFolder(folderId);
    return filesMap;
  }

  async downloadMultipleFiles(fileIds: string[]): Promise<DriveFileContent[]> {
    const batchSize = 5;
    const results: DriveFileContent[] = [];

    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);
      const promises = batch.map(async (fileId) => {
        try {
          return await this.downloadFile(fileId);
        } catch (error) {
          console.warn(`Failed to download file: ${fileId}`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter(Boolean) as DriveFileContent[]);

      // Rate limiting
      if (i + batchSize < fileIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  // File Type Detection
  isCodeFile(fileName: string): boolean {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r',
      '.html', '.css', '.scss', '.less', '.json', '.xml', '.yaml', '.yml',
      '.md', '.txt', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat',
      '.sql', '.graphql', '.gql', '.vue', '.svelte', '.elm'
    ];

    return codeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  getFileType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    
    const typeMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'text'
    };

    return typeMap[extension!] || 'text';
  }

  // Utility Methods
  async getStorageUsage(): Promise<{
    totalUsage: number;
    limit: number;
    usagePercentage: number;
  }> {
    const about = await this.drive.about.get({
      fields: 'storageQuota'
    });

    const storageQuota = about.data.storageQuota;
    const totalUsage = parseInt(storageQuota?.usage || '0');
    const limit = parseInt(storageQuota?.limit || '0');

    return {
      totalUsage,
      limit,
      usagePercentage: limit > 0 ? (totalUsage / limit) * 100 : 0
    };
  }

  async validateFileAccess(fileId: string): Promise<boolean> {
    try {
      await this.getFile(fileId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRecentFiles(days: number = 7): Promise<GoogleDriveFile[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const isoDate = cutoffDate.toISOString();
    
    const response = await this.drive.files.list({
      q: `modifiedTime > '${isoDate}' and trashed=false`,
      pageSize: 50,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, fileExtension, md5Checksum)',
      orderBy: 'modifiedTime desc'
    });

    return response.data.files as GoogleDriveFile[];
  }

  // File Sharing and Permissions
  async checkFilePermissions(fileId: string): Promise<{
    canRead: boolean;
    canEdit: boolean;
    canShare: boolean;
  }> {
    try {
      const permissions = await this.drive.permissions.list({
        fileId,
        fields: 'permissions(id, role, type)'
      });

      const userPermission = permissions.data.permissions?.find(
        p => p.type === 'user'
      );

      return {
        canRead: true, // We were able to list permissions
        canEdit: userPermission?.role === 'writer' || userPermission?.role === 'owner',
        canShare: userPermission?.role === 'owner'
      };
    } catch (error) {
      return {
        canRead: false,
        canEdit: false,
        canShare: false
      };
    }
  }
}

// Create singleton instance
export const googleDriveService = new GoogleDriveService();

export default GoogleDriveService;