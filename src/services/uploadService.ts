import axios, { AxiosProgressEvent } from 'axios';
import { githubService, GitHubRepository } from './githubService';
import { googleDriveService, DriveFileContent } from './googleDriveService';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
}

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  path: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress?: UploadProgress;
  error?: string;
}

export interface UploadProject {
  id: string;
  name: string;
  type: 'github' | 'google-drive' | 'direct' | 'zip' | 'url';
  files: UploadFile[];
  status: 'processing' | 'completed' | 'error';
  createdAt: Date;
  totalFiles: number;
  processedFiles: number;
  source?: string;
}

export interface UploadOptions {
  maxFileSize?: number;
  allowedFileTypes?: string[];
  maxTotalSize?: number;
  chunkSize?: number;
  concurrentUploads?: number;
}

export interface GitHubUploadParams {
  repoUrl: string;
  branch?: string;
  includeSubfolders?: boolean;
}

export interface GoogleDriveUploadParams {
  fileId?: string;
  folderId?: string;
  includeSubfolders?: boolean;
}

export interface URLUploadParams {
  url: string;
  fileName?: string;
}

export interface UploadResult {
  success: boolean;
  projectId?: string;
  error?: string;
  files?: UploadFile[];
  totalSize?: number;
}

class UploadService {
  private static instance: UploadService;
  private projects: Map<string, UploadProject> = new Map();
  private defaultOptions: UploadOptions = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFileTypes: [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
      '.html', '.css', '.scss', '.less', '.sass', '.json', '.xml',
      '.yaml', '.yml', '.md', '.txt', '.sh', '.bash', '.ps1',
      '.sql', '.graphql', '.gql', '.vue', '.svelte', '.elm',
      '.config', '.env', '.gitignore', '.dockerfile'
    ],
    maxTotalSize: 500 * 1024 * 1024, // 500MB
    chunkSize: 1024 * 1024, // 1MB
    concurrentUploads: 3
  };

  private constructor() {}

  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  // Validation Methods
  validateFile(file: File, options: UploadOptions = this.defaultOptions): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > (options.maxFileSize || this.defaultOptions.maxFileSize!)) {
      return {
        valid: false,
        error: `File ${file.name} exceeds maximum size limit of ${this.formatFileSize(options.maxFileSize || this.defaultOptions.maxFileSize!)}`
      };
    }

    // Check file type
    const fileExtension = '.' + file.name.toLowerCase().split('.').pop();
    const allowedTypes = options.allowedFileTypes || this.defaultOptions.allowedFileTypes!;
    
    if (!allowedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  validateFiles(files: File[], options: UploadOptions = this.defaultOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let totalSize = 0;

    for (const file of files) {
      const validation = this.validateFile(file, options);
      if (!validation.valid && validation.error) {
        errors.push(validation.error);
      }
      totalSize += file.size;
    }

    // Check total size
    const maxTotalSize = options.maxTotalSize || this.defaultOptions.maxTotalSize!;
    if (totalSize > maxTotalSize) {
      errors.push(`Total files size ${this.formatFileSize(totalSize)} exceeds maximum limit of ${this.formatFileSize(maxTotalSize)}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Direct File Upload
  async uploadDirectFiles(files: File[], options: UploadOptions = this.defaultOptions): Promise<UploadResult> {
    try {
      // Validate files
      const validation = this.validateFiles(files, options);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      const projectId = this.generateProjectId();
      const uploadFiles: UploadFile[] = files.map(file => ({
        id: this.generateFileId(),
        name: file.name,
        size: file.size,
        type: file.type,
        path: file.name,
        status: 'pending'
      }));

      const project: UploadProject = {
        id: projectId,
        name: `Direct Upload - ${new Date().toLocaleString()}`,
        type: 'direct',
        files: uploadFiles,
        status: 'processing',
        createdAt: new Date(),
        totalFiles: files.length,
        processedFiles: 0
      };

      this.projects.set(projectId, project);

      // Process files in batches
      await this.processFilesInBatches(files, uploadFiles, projectId, options);

      return {
        success: true,
        projectId,
        files: uploadFiles,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      };

    } catch (error) {
      console.error('Direct upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // GitHub Repository Upload
  async uploadGitHubRepository(params: GitHubUploadParams, options: UploadOptions = this.defaultOptions): Promise<UploadResult> {
    try {
      const { repoUrl, branch = 'main', includeSubfolders = true } = params;
      
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return {
          success: false,
          error: 'Invalid GitHub repository URL'
        };
      }

      const [, owner, repo] = match;

      // Download repository files
      const filesMap = await githubService.downloadEntireRepository(owner, repo, branch);
      const files: UploadFile[] = [];

      for (const [filePath, content] of Object.entries(filesMap)) {
        files.push({
          id: this.generateFileId(),
          name: filePath.split('/').pop() || filePath,
          size: content.length,
          type: this.getFileType(filePath),
          content,
          path: filePath,
          status: 'completed'
        });
      }

      const projectId = this.generateProjectId();
      const project: UploadProject = {
        id: projectId,
        name: `${owner}/${repo}`,
        type: 'github',
        files,
        status: 'completed',
        createdAt: new Date(),
        totalFiles: files.length,
        processedFiles: files.length,
        source: repoUrl
      };

      this.projects.set(projectId, project);

      return {
        success: true,
        projectId,
        files,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      };

    } catch (error) {
      console.error('GitHub upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download GitHub repository'
      };
    }
  }

  // Google Drive Upload
  async uploadGoogleDrive(params: GoogleDriveUploadParams, options: UploadOptions = this.defaultOptions): Promise<UploadResult> {
    try {
      const { fileId, folderId, includeSubfolders = true } = params;

      if (!fileId && !folderId) {
        return {
          success: false,
          error: 'Either fileId or folderId must be provided'
        };
      }

      let filesMap: Map<string, DriveFileContent>;
      let sourceName: string;

      if (fileId) {
        const file = await googleDriveService.getFile(fileId);
        sourceName = file.name;
        const content = await googleDriveService.downloadFile(fileId);
        filesMap = new Map([[file.name, content]]);
      } else {
        const folder = await googleDriveService.getFile(folderId!);
        sourceName = folder.name;
        filesMap = await googleDriveService.downloadFolderContents(folderId!, includeSubfolders);
      }

      const files: UploadFile[] = [];

      for (const [filePath, fileContent] of filesMap.entries()) {
        // Only include code files
        if (googleDriveService.isCodeFile(filePath)) {
          files.push({
            id: this.generateFileId(),
            name: filePath.split('/').pop() || filePath,
            size: fileContent.size,
            type: googleDriveService.getFileType(filePath),
            content: fileContent.content.toString('utf-8'),
            path: filePath,
            status: 'completed'
          });
        }
      }

      const projectId = this.generateProjectId();
      const project: UploadProject = {
        id: projectId,
        name: sourceName,
        type: 'google-drive',
        files,
        status: 'completed',
        createdAt: new Date(),
        totalFiles: files.length,
        processedFiles: files.length,
        source: fileId || folderId
      };

      this.projects.set(projectId, project);

      return {
        success: true,
        projectId,
        files,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      };

    } catch (error) {
      console.error('Google Drive upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download from Google Drive'
      };
    }
  }

  // ZIP File Upload
  async uploadZipFile(file: File, options: UploadOptions = this.defaultOptions): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file, options);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check if it's a ZIP file
      if (!file.name.toLowerCase().endsWith('.zip')) {
        return {
          success: false,
          error: 'File must be a ZIP archive'
        };
      }

      // In a real implementation, we would extract the ZIP file here
      // For now, we'll simulate the extraction
      const projectId = this.generateProjectId();
      const uploadFiles: UploadFile[] = [
        {
          id: this.generateFileId(),
          name: file.name,
          size: file.size,
          type: 'application/zip',
          path: file.name,
          status: 'completed'
        }
      ];

      const project: UploadProject = {
        id: projectId,
        name: `ZIP Upload - ${file.name}`,
        type: 'zip',
        files: uploadFiles,
        status: 'completed',
        createdAt: new Date(),
        totalFiles: 1,
        processedFiles: 1
      };

      this.projects.set(projectId, project);

      // Simulate ZIP extraction (in real implementation, use adm-zip or similar)
      console.log('ZIP extraction would happen here for file:', file.name);

      return {
        success: true,
        projectId,
        files: uploadFiles,
        totalSize: file.size
      };

    } catch (error) {
      console.error('ZIP upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process ZIP file'
      };
    }
  }

  // URL Upload
  async uploadFromUrl(params: URLUploadParams, options: UploadOptions = this.defaultOptions): Promise<UploadResult> {
    try {
      const { url, fileName } = params;

      // Validate URL
      try {
        new URL(url);
      } catch {
        return {
          success: false,
          error: 'Invalid URL provided'
        };
      }

      // Download file from URL
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
          // Progress tracking could be implemented here
        }
      });

      const content = Buffer.from(response.data);
      const actualFileName = fileName || this.extractFileNameFromUrl(url);

      // Validate file size
      if (content.length > (options.maxFileSize || this.defaultOptions.maxFileSize!)) {
        return {
          success: false,
          error: `Downloaded file exceeds maximum size limit of ${this.formatFileSize(options.maxFileSize || this.defaultOptions.maxFileSize!)}`
        };
      }

      const projectId = this.generateProjectId();
      const uploadFiles: UploadFile[] = [{
        id: this.generateFileId(),
        name: actualFileName,
        size: content.length,
        type: response.headers['content-type'] || 'application/octet-stream',
        content: content.toString('utf-8'),
        path: actualFileName,
        status: 'completed'
      }];

      const project: UploadProject = {
        id: projectId,
        name: `URL Upload - ${actualFileName}`,
        type: 'url',
        files: uploadFiles,
        status: 'completed',
        createdAt: new Date(),
        totalFiles: 1,
        processedFiles: 1,
        source: url
      };

      this.projects.set(projectId, project);

      return {
        success: true,
        projectId,
        files: uploadFiles,
        totalSize: content.length
      };

    } catch (error) {
      console.error('URL upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download from URL'
      };
    }
  }

  // Project Management
  getProject(projectId: string): UploadProject | undefined {
    return this.projects.get(projectId);
  }

  getAllProjects(): UploadProject[] {
    return Array.from(this.projects.values());
  }

  deleteProject(projectId: string): boolean {
    return this.projects.delete(projectId);
  }

  getProjectFiles(projectId: string): UploadFile[] {
    const project = this.projects.get(projectId);
    return project?.files || [];
  }

  // Utility Methods
  private generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileType(fileName: string): string {
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

  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'downloaded_file';
    } catch {
      return 'downloaded_file';
    }
  }

  private async processFilesInBatches(
    files: File[], 
    uploadFiles: UploadFile[], 
    projectId: string, 
    options: UploadOptions
  ): Promise<void> {
    const batchSize = options.concurrentUploads || this.defaultOptions.concurrentUploads!;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchUploadFiles = uploadFiles.slice(i, i + batchSize);
      
      const promises = batch.map((file, index) => 
        this.processSingleFile(file, batchUploadFiles[index], projectId)
      );
      
      await Promise.all(promises);
      
      // Update project progress
      const project = this.projects.get(projectId);
      if (project) {
        project.processedFiles = Math.min(i + batchSize, files.length);
        this.projects.set(projectId, project);
      }
    }

    // Mark project as completed
    const project = this.projects.get(projectId);
    if (project) {
      project.status = 'completed';
      this.projects.set(projectId, project);
    }
  }

  private async processSingleFile(file: File, uploadFile: UploadFile, projectId: string): Promise<void> {
    try {
      // Update file status to uploading
      uploadFile.status = 'uploading';
      this.updateProjectFile(projectId, uploadFile);

      // Simulate file processing (in real implementation, upload to server)
      await new Promise<void>((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            uploadFile.status = 'completed';
            uploadFile.progress = {
              loaded: file.size,
              total: file.size,
              percentage: 100,
              speed: 0,
              timeRemaining: 0
            };
            this.updateProjectFile(projectId, uploadFile);
            resolve();
          } else {
            uploadFile.progress = {
              loaded: (file.size * progress) / 100,
              total: file.size,
              percentage: progress,
              speed: 1000000, // 1MB/s simulated
              timeRemaining: (100 - progress) / 10 // simulated
            };
            this.updateProjectFile(projectId, uploadFile);
          }
        }, 100);
      });

    } catch (error) {
      uploadFile.status = 'error';
      uploadFile.error = error instanceof Error ? error.message : 'Upload failed';
      this.updateProjectFile(projectId, uploadFile);
    }
  }

  private updateProjectFile(projectId: string, updatedFile: UploadFile): void {
    const project = this.projects.get(projectId);
    if (project) {
      const fileIndex = project.files.findIndex(f => f.id === updatedFile.id);
      if (fileIndex !== -1) {
        project.files[fileIndex] = updatedFile;
        this.projects.set(projectId, project);
      }
    }
  }

  // Cleanup old projects (older than 24 hours)
  cleanupOldProjects(): number {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const [projectId, project] of this.projects.entries()) {
      if (project.createdAt < twentyFourHoursAgo) {
        this.projects.delete(projectId);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

// Create singleton instance
export const uploadService = UploadService.getInstance();

export default UploadServic;