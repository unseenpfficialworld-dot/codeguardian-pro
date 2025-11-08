// server/services/fileProcessor.js
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');

class FileProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, '../../uploads/temp');
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.maxTotalSize = 100 * 1024 * 1024; // 100MB
    this.supportedExtensions = this.getSupportedExtensions();
    
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Initialize file processor
   */
  async initialize() {
    try {
      await this.ensureTempDirectory();
      await this.cleanupOldTempFiles();
      return { success: true, message: 'File processor initialized' };
    } catch (error) {
      console.error('File processor initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract ZIP file and return file contents
   */
  async extractZipFile(zipPath, options = {}) {
    try {
      const {
        maxFiles = 1000,
        maxSize = this.maxTotalSize,
        includePatterns = null,
        excludePatterns = ['.git', 'node_modules', '.DS_Store']
      } = options;

      if (!await this.fileExists(zipPath)) {
        throw new Error('ZIP file not found');
      }

      const stats = await fs.stat(zipPath);
      if (stats.size > this.maxFileSize) {
        throw new Error(`ZIP file too large: ${stats.size} bytes (max: ${this.maxFileSize})`);
      }

      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      const extractedFiles = [];

      let totalSize = 0;
      let processedFiles = 0;

      for (const entry of zipEntries) {
        if (processedFiles >= maxFiles) {
          console.warn(`Reached maximum file limit (${maxFiles}), stopping extraction`);
          break;
        }

        if (entry.isDirectory) continue;

        // Check file patterns
        if (this.shouldExcludeFile(entry.entryName, includePatterns, excludePatterns)) {
          continue;
        }

        // Check file size
        if (entry.header.size > 5 * 1024 * 1024) { // 5MB per file
          console.warn(`File too large, skipping: ${entry.entryName}`);
          continue;
        }

        totalSize += entry.header.size;
        if (totalSize > maxSize) {
          console.warn(`Reached maximum total size (${maxSize}), stopping extraction`);
          break;
        }

        try {
          const fileContent = entry.getData().toString('utf8');
          const fileExtension = path.extname(entry.entryName).toLowerCase();

          if (this.isSupportedFileType(entry.entryName)) {
            extractedFiles.push({
              name: path.basename(entry.entryName),
              path: entry.entryName,
              content: fileContent,
              size: entry.header.size,
              extension: fileExtension,
              language: this.detectFileLanguage(entry.entryName)
            });
            processedFiles++;
          }
        } catch (fileError) {
          console.error(`Error processing file ${entry.entryName}:`, fileError);
          // Continue with other files
        }
      }

      return extractedFiles;

    } catch (error) {
      console.error('ZIP extraction error:', error);
      throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
  }

  /**
   * Create ZIP file from project files
   */
  async createProjectZip(files, projectName, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          includeOriginal = false,
          originalFiles = [],
          format = 'zip'
        } = options;

        const tempZipPath = path.join(this.tempDir, `${projectName}_${uuidv4()}.zip`);
        const output = require('fs').createWriteStream(tempZipPath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        output.on('close', async () => {
          try {
            const zipBuffer = await fs.readFile(tempZipPath);
            // Clean up temp file
            await fs.unlink(tempZipPath);
            resolve(zipBuffer);
          } catch (error) {
            reject(error);
          }
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        // Add fixed files
        files.forEach(file => {
          if (file.fixedContent) {
            archive.append(file.fixedContent, {
              name: file.filePath || file.fileName
            });
          }
        });

        // Add original files if requested
        if (includeOriginal && originalFiles.length > 0) {
          originalFiles.forEach(file => {
            if (file.content) {
              archive.append(file.content, {
                name: `original/${file.path || file.name}`
              });
            }
          });
        }

        // Add README file
        const readmeContent = this.generateProjectReadme(projectName, files.length, originalFiles.length);
        archive.append(readmeContent, { name: 'README.md' });

        await archive.finalize();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Validate uploaded files
   */
  async validateFiles(files, options = {}) {
    const {
      maxFiles = 100,
      maxTotalSize = this.maxTotalSize,
      allowedExtensions = this.supportedExtensions
    } = options;

    const validationResults = {
      valid: true,
      files: [],
      errors: [],
      totalSize: 0,
      statistics: {
        totalFiles: files.length,
        validFiles: 0,
        invalidFiles: 0,
        totalSize: 0,
        languages: new Set()
      }
    };

    for (const file of files) {
      const fileValidation = {
        name: file.originalname || file.name,
        size: file.size || 0,
        valid: true,
        errors: []
      };

      // Check file size
      if (fileValidation.size > 5 * 1024 * 1024) {
        fileValidation.valid = false;
        fileValidation.errors.push('File size exceeds 5MB limit');
      }

      // Check file extension
      const fileExtension = path.extname(fileValidation.name).toLowerCase();
      if (!this.isSupportedFileType(fileValidation.name, allowedExtensions)) {
        fileValidation.valid = false;
        fileValidation.errors.push(`File type ${fileExtension} is not supported`);
      }

      // Check if too many files
      if (validationResults.files.length >= maxFiles) {
        fileValidation.valid = false;
        fileValidation.errors.push('Maximum file limit reached');
      }

      // Check total size
      validationResults.totalSize += fileValidation.size;
      if (validationResults.totalSize > maxTotalSize) {
        fileValidation.valid = false;
        fileValidation.errors.push('Total file size exceeds limit');
      }

      if (fileValidation.valid) {
        fileValidation.language = this.detectFileLanguage(fileValidation.name);
        validationResults.statistics.languages.add(fileValidation.language);
        validationResults.statistics.validFiles++;
        validationResults.files.push(fileValidation);
      } else {
        validationResults.statistics.invalidFiles++;
        validationResults.errors.push({
          file: fileValidation.name,
          errors: fileValidation.errors
        });
      }
    }

    validationResults.valid = validationResults.errors.length === 0;
    validationResults.statistics.totalSize = validationResults.totalSize;

    return validationResults;
  }

  /**
   * Process uploaded files and extract content
   */
  async processUploadedFiles(files, options = {}) {
    const processedFiles = [];
    const { validateContent = true } = options;

    for (const file of files) {
      try {
        let fileContent;

        if (file.path && await this.fileExists(file.path)) {
          // Read from temporary file
          fileContent = await fs.readFile(file.path, 'utf8');
        } else if (file.buffer) {
          // Read from buffer
          fileContent = file.buffer.toString('utf8');
        } else if (file.content) {
          // Use provided content
          fileContent = file.content;
        } else {
          throw new Error('No file content available');
        }

        // Validate content if requested
        if (validateContent) {
          const contentValidation = this.validateFileContent(fileContent, file.originalname || file.name);
          if (!contentValidation.valid) {
            console.warn(`Content validation failed for ${file.name}:`, contentValidation.errors);
            // Continue anyway, but log the issue
          }
        }

        const processedFile = {
          name: file.originalname || file.name,
          path: file.originalname || file.name,
          content: fileContent,
          size: Buffer.from(fileContent).length,
          language: this.detectFileLanguage(file.originalname || file.name),
          extension: path.extname(file.originalname || file.name).toLowerCase(),
          uploadDate: new Date()
        };

        processedFiles.push(processedFile);

      } catch (error) {
        console.error(`Error processing file ${file.originalname || file.name}:`, error);
        // Continue with other files
      }
    }

    return processedFiles;
  }

  /**
   * Scan directory structure (for future folder upload support)
   */
  async scanDirectory(dirPath, options = {}) {
    const {
      maxDepth = 5,
      currentDepth = 0,
      includePatterns = null,
      excludePatterns = ['.git', 'node_modules', '.DS_Store']
    } = options;

    if (currentDepth > maxDepth) {
      return [];
    }

    try {
      const files = [];
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);

        if (this.shouldExcludeFile(item, includePatterns, excludePatterns)) {
          continue;
        }

        if (stats.isDirectory()) {
          // Recursively scan subdirectory
          const subFiles = await this.scanDirectory(fullPath, {
            ...options,
            currentDepth: currentDepth + 1
          });
          files.push(...subFiles);
        } else if (stats.isFile() && this.isSupportedFileType(item)) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            files.push({
              name: item,
              path: path.relative(dirPath, fullPath),
              content: content,
              size: stats.size,
              language: this.detectFileLanguage(item),
              extension: path.extname(item).toLowerCase()
            });
          } catch (readError) {
            console.error(`Error reading file ${fullPath}:`, readError);
          }
        }
      }

      return files;
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Generate file tree structure for display
   */
  generateFileTree(files) {
    const tree = {
      name: 'root',
      type: 'directory',
      children: []
    };

    files.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = tree.children;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        let existingNode = currentLevel.find(node => node.name === part);

        if (!existingNode) {
          existingNode = {
            name: part,
            type: isFile ? 'file' : 'directory',
            path: parts.slice(0, i + 1).join('/'),
            ...(isFile && {
              size: file.size,
              language: file.language,
              extension: file.extension
            })
          };

          if (!isFile) {
            existingNode.children = [];
          }

          currentLevel.push(existingNode);
        }

        if (!isFile) {
          currentLevel = existingNode.children;
        }
      }
    });

    return this.sortFileTree(tree);
  }

  /**
   * Calculate project statistics
   */
  calculateProjectStats(files) {
    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      languages: {},
      extensions: {},
      averageFileSize: 0,
      largestFile: { name: '', size: 0 },
      fileTypes: {
        code: 0,
        config: 0,
        documentation: 0,
        other: 0
      }
    };

    files.forEach(file => {
      stats.totalSize += file.size;

      // Language statistics
      stats.languages[file.language] = (stats.languages[file.language] || 0) + 1;

      // Extension statistics
      stats.extensions[file.extension] = (stats.extensions[file.extension] || 0) + 1;

      // File type categorization
      if (this.isCodeFile(file.name)) {
        stats.fileTypes.code++;
      } else if (this.isConfigFile(file.name)) {
        stats.fileTypes.config++;
      } else if (this.isDocumentationFile(file.name)) {
        stats.fileTypes.documentation++;
      } else {
        stats.fileTypes.other++;
      }

      // Largest file
      if (file.size > stats.largestFile.size) {
        stats.largestFile = { name: file.name, size: file.size };
      }
    });

    stats.averageFileSize = stats.totalSize / stats.totalFiles;

    return stats;
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(filePaths) {
    const results = {
      success: true,
      cleaned: [],
      errors: []
    };

    for (const filePath of filePaths) {
      try {
        if (await this.fileExists(filePath)) {
          await fs.unlink(filePath);
          results.cleaned.push(filePath);
        }
      } catch (error) {
        results.errors.push({
          file: filePath,
          error: error.message
        });
        results.success = false;
      }
    }

    return results;
  }

  /**
   * Merge multiple projects/files
   */
  async mergeProjects(projects, options = {}) {
    const {
      conflictResolution = 'rename', // 'rename', 'overwrite', 'skip'
      mergeMetadata = true
    } = options;

    const mergedFiles = [];
    const fileMap = new Map();
    const conflicts = [];

    for (const project of projects) {
      for (const file of project.files) {
        const existingFile = fileMap.get(file.path);

        if (existingFile) {
          // Conflict detected
          conflicts.push({
            path: file.path,
            existing: existingFile,
            new: file,
            resolution: conflictResolution
          });

          switch (conflictResolution) {
            case 'rename':
              const newPath = this.generateUniquePath(file.path, Array.from(fileMap.keys()));
              file.path = newPath;
              fileMap.set(newPath, file);
              mergedFiles.push(file);
              break;

            case 'overwrite':
              fileMap.set(file.path, file);
              // Replace the existing file in mergedFiles
              const index = mergedFiles.findIndex(f => f.path === file.path);
              if (index !== -1) {
                mergedFiles[index] = file;
              }
              break;

            case 'skip':
              // Do nothing, keep the existing file
              break;
          }
        } else {
          fileMap.set(file.path, file);
          mergedFiles.push(file);
        }
      }
    }

    return {
      files: mergedFiles,
      conflicts: conflicts,
      statistics: this.calculateProjectStats(mergedFiles)
    };
  }

  // Utility Methods

  /**
   * Ensure temp directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
      throw error;
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupOldTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          console.error(`Error cleaning up file ${filePath}:`, error);
        }
      }

      return { cleanedCount, totalFiles: files.length };
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
      return { cleanedCount: 0, totalFiles: 0, error: error.message };
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions() {
    return {
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
  }

  /**
   * Detect file language from extension
   */
  detectFileLanguage(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedExtensions[ext] || 'text';
  }

  /**
   * Check if file type is supported
   */
  isSupportedFileType(filename, allowedExtensions = null) {
    const ext = path.extname(filename).toLowerCase();
    const extensions = allowedExtensions || this.supportedExtensions;
    return ext in extensions;
  }

  /**
   * Check if file should be excluded
   */
  shouldExcludeFile(filename, includePatterns, excludePatterns) {
    // Check exclude patterns
    if (excludePatterns) {
      for (const pattern of excludePatterns) {
        if (filename.includes(pattern)) {
          return true;
        }
      }
    }

    // Check include patterns
    if (includePatterns) {
      let included = false;
      for (const pattern of includePatterns) {
        if (filename.includes(pattern)) {
          included = true;
          break;
        }
      }
      if (!included) return true;
    }

    return false;
  }

  /**
   * Validate file content
   */
  validateFileContent(content, filename) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check content length
    if (!content || content.length === 0) {
      validation.valid = false;
      validation.errors.push('File is empty');
    }

    // Check for binary content (basic check)
    if (content.includes('\0') && !this.isBinaryFileAllowed(filename)) {
      validation.valid = false;
      validation.errors.push('File appears to be binary data');
    }

    // Check line endings
    const crlfCount = (content.match(/\r\n/g) || []).length;
    const lfCount = (content.match(/\n/g) || []).length - crlfCount;
    
    if (crlfCount > 0 && lfCount > 0) {
      validation.warnings.push('Mixed line endings detected');
    }

    // Check encoding (basic)
    try {
      Buffer.from(content, 'utf8').toString('utf8');
    } catch {
      validation.warnings.push('Potential encoding issues detected');
    }

    return validation;
  }

  /**
   * Check if binary files are allowed for this file type
   */
  isBinaryFileAllowed(filename) {
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip'];
    const ext = path.extname(filename).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  /**
   * Sort file tree alphabetically
   */
  sortFileTree(tree) {
    if (tree.children) {
      tree.children.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      tree.children.forEach(child => {
        if (child.children) {
          this.sortFileTree(child);
        }
      });
    }
    return tree;
  }

  /**
   * Generate unique file path
   */
  generateUniquePath(originalPath, existingPaths) {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);

    let counter = 1;
    let newPath = originalPath;

    while (existingPaths.includes(newPath)) {
      newPath = path.join(dir, `${base}_${counter}${ext}`);
      counter++;
    }

    return newPath;
  }

  /**
   * Categorize file types
   */
  isCodeFile(filename) {
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'];
    const ext = path.extname(filename).toLowerCase();
    return codeExtensions.includes(ext);
  }

  isConfigFile(filename) {
    const configExtensions = ['.json', '.yaml', '.yml', '.xml', '.config', '.ini', '.env'];
    const configNames = ['package.json', 'webpack.config', 'tsconfig.json', '.eslintrc', '.prettierrc'];
    const ext = path.extname(filename).toLowerCase();
    const name = filename.toLowerCase();
    
    return configExtensions.includes(ext) || configNames.some(configName => name.includes(configName));
  }

  isDocumentationFile(filename) {
    const docExtensions = ['.md', '.txt', '.rst'];
    const docNames = ['readme', 'license', 'contributing', 'changelog'];
    const ext = path.extname(filename).toLowerCase();
    const name = filename.toLowerCase();
    
    return docExtensions.includes(ext) || docNames.some(docName => name.includes(docName));
  }

  /**
   * Generate project README content
   */
  generateProjectReadme(projectName, fixedFileCount, originalFileCount = 0) {
    return `# ${projectName} - Fixed Code

This project has been analyzed and fixed by CodeGuardian Pro.

## Project Information

- **Project Name:** ${projectName}
- **Fixed Files:** ${fixedFileCount}
- **Original Files:** ${originalFileCount}
- **Generated:** ${new Date().toLocaleString()}

## About

This code has been automatically analyzed and fixed using AI-powered code analysis. The fixes include:

- Syntax error corrections
- Type error fixes
- Security vulnerability patches
- Performance optimizations
- Code quality improvements

## Usage

1. Review the fixed code files
2. Compare with original files (if included) to see changes
3. Test the code thoroughly before deployment
4. Consider additional manual review for critical applications

## Notes

- All fixes are generated by AI and should be reviewed by developers
- Some fixes may require additional manual adjustments
- The original functionality should be preserved

---
Generated by CodeGuardian Pro - AI-Powered Code Analysis
https://codeguardian.pro
`;
  }

  /**
   * Get file processor statistics
   */
  getStats() {
    return {
      tempDirectory: this.tempDir,
      maxFileSize: this.maxFileSize,
      maxTotalSize: this.maxTotalSize,
      supportedExtensions: Object.keys(this.supportedExtensions).length,
      supportedLanguages: new Set(Object.values(this.supportedExtensions)).size
    };
  }
}

// Create singleton instance
const fileProcessor = new FileProcessor();

module.exports = { fileProcessor, FileProcessor };