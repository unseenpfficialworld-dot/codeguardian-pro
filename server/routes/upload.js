// server/routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { Project } = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { githubService } = require('../services/githubIntegration');
const { googleDriveService } = require('../services/googleDriveService');
const { fileProcessor } = require('../services/fileProcessor');
const rateLimit = require('express-rate-limit');

// Rate limiting for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 upload requests per windowMs
  message: {
    error: 'Too many upload requests, please try again later.'
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow all file types for now, but validate in processing
  const allowedExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.html', '.css', '.scss', '.json',
    '.xml', '.md', '.yml', '.yaml', '.txt', '.zip'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 100 // max 100 files per upload
  }
});

// Apply rate limiting to all upload routes
router.use(uploadLimiter);

/**
 * @route   POST /api/upload/direct
 * @desc    Handle direct file uploads
 * @access  Private
 */
router.post('/direct', authenticateToken, upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const { projectName, description } = req.body;
    
    if (!projectName) {
      // Clean up uploaded files
      await cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        error: 'Project name is required'
      });
    }

    const processedFiles = [];
    
    // Process each uploaded file
    for (const file of req.files) {
      try {
        const fileContent = await fs.readFile(file.path, 'utf8');
        
        processedFiles.push({
          name: file.originalname,
          path: file.originalname,
          content: fileContent,
          language: detectFileLanguage(file.originalname),
          size: file.size,
          uploadDate: new Date()
        });

        // Remove temp file after processing
        await fs.unlink(file.path);
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files
      }
    }

    if (processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid files could be processed'
      });
    }

    // Create project in database
    const project = new Project({
      name: projectName,
      description: description || '',
      userId: req.user.userId,
      files: processedFiles,
      language: detectProjectLanguage(processedFiles),
      status: 'UPLOADED',
      source: 'direct_upload',
      metadata: {
        totalFiles: processedFiles.length,
        totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0),
        uploadMethod: 'direct'
      }
    });

    await project.save();

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        fileCount: project.files.length,
        language: project.language,
        createdAt: project.createdAt
      },
      message: `Successfully uploaded ${processedFiles.length} files`
    });

  } catch (error) {
    console.error('Direct upload error:', error);
    
    // Clean up any uploaded files on error
    if (req.files) {
      await cleanupFiles(req.files);
    }

    res.status(500).json({
      success: false,
      error: 'File upload failed'
    });
  }
});

/**
 * @route   POST /api/upload/zip
 * @desc    Handle ZIP file upload and extraction
 * @access  Private
 */
router.post('/zip', authenticateToken, upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No ZIP file uploaded'
      });
    }

    const { projectName, description } = req.body;
    
    if (!projectName) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Project name is required'
      });
    }

    // Extract ZIP file
    const extractedFiles = await fileProcessor.extractZipFile(req.file.path);
    
    // Remove ZIP file after extraction
    await fs.unlink(req.file.path);

    if (extractedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid files found in ZIP archive'
      });
    }

    // Process extracted files
    const processedFiles = extractedFiles.map(file => ({
      name: file.name,
      path: file.path,
      content: file.content,
      language: detectFileLanguage(file.name),
      size: Buffer.from(file.content).length,
      uploadDate: new Date()
    }));

    // Create project
    const project = new Project({
      name: projectName,
      description: description || '',
      userId: req.user.userId,
      files: processedFiles,
      language: detectProjectLanguage(processedFiles),
      status: 'UPLOADED',
      source: 'zip_upload',
      metadata: {
        totalFiles: processedFiles.length,
        totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0),
        uploadMethod: 'zip',
        originalZipName: req.file.originalname
      }
    });

    await project.save();

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        fileCount: project.files.length,
        language: project.language,
        createdAt: project.createdAt
      },
      message: `Successfully extracted ${processedFiles.length} files from ZIP`
    });

  } catch (error) {
    console.error('ZIP upload error:', error);
    
    // Clean up ZIP file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up ZIP file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'ZIP file processing failed'
    });
  }
});

/**
 * @route   POST /api/upload/github
 * @desc    Handle GitHub repository import
 * @access  Private
 */
router.post('/github', authenticateToken, async (req, res) => {
  try {
    const { repoUrl, projectName, description, branch = 'main' } = req.body;

    if (!repoUrl || !projectName) {
      return res.status(400).json({
        success: false,
        error: 'Repository URL and project name are required'
      });
    }

    // Extract owner and repo from URL
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GitHub repository URL'
      });
    }

    const [, owner, repo] = repoMatch;

    // Get user's GitHub access token from sessions
    const Session = require('../models/User').Session;
    const session = await Session.findOne({
      userId: req.user.userId,
      provider: 'github'
    });

    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'GitHub authentication required. Please connect your GitHub account first.'
      });
    }

    // Download repository files
    const repoFiles = await githubService.downloadRepository(
      owner,
      repo,
      branch,
      session.token
    );

    if (repoFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files found in repository or repository is empty'
      });
    }

    // Process repository files
    const processedFiles = repoFiles.map(file => ({
      name: file.name,
      path: file.path,
      content: file.content,
      language: detectFileLanguage(file.name),
      size: Buffer.from(file.content).length,
      uploadDate: new Date()
    }));

    // Create project
    const project = new Project({
      name: projectName,
      description: description || `Imported from GitHub: ${owner}/${repo}`,
      userId: req.user.userId,
      files: processedFiles,
      language: detectProjectLanguage(processedFiles),
      status: 'UPLOADED',
      source: 'github',
      metadata: {
        totalFiles: processedFiles.length,
        totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0),
        uploadMethod: 'github',
        githubRepo: `${owner}/${repo}`,
        githubBranch: branch,
        githubUrl: repoUrl
      }
    });

    await project.save();

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        fileCount: project.files.length,
        language: project.language,
        createdAt: project.createdAt
      },
      message: `Successfully imported ${processedFiles.length} files from GitHub repository`
    });

  } catch (error) {
    console.error('GitHub upload error:', error);
    
    let errorMessage = 'GitHub repository import failed';
    if (error.response?.status === 404) {
      errorMessage = 'Repository not found or access denied';
    } else if (error.response?.status === 403) {
      errorMessage = 'GitHub API rate limit exceeded';
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * @route   POST /api/upload/google-drive
 * @desc    Handle Google Drive file import
 * @access  Private
 */
router.post('/google-drive', authenticateToken, async (req, res) => {
  try {
    const { fileId, projectName, description } = req.body;

    if (!fileId || !projectName) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive file ID and project name are required'
      });
    }

    // Get user's Google access token from sessions
    const Session = require('../models/User').Session;
    const session = await Session.findOne({
      userId: req.user.userId,
      provider: 'google'
    });

    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Google authentication required. Please connect your Google account first.'
      });
    }

    // Download file from Google Drive
    const driveFiles = await googleDriveService.downloadFile(
      fileId,
      session.token
    );

    if (!driveFiles || driveFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files could be downloaded from Google Drive'
      });
    }

    // Process downloaded files
    const processedFiles = driveFiles.map(file => ({
      name: file.name,
      path: file.name,
      content: file.content,
      language: detectFileLanguage(file.name),
      size: Buffer.from(file.content).length,
      uploadDate: new Date()
    }));

    // Create project
    const project = new Project({
      name: projectName,
      description: description || 'Imported from Google Drive',
      userId: req.user.userId,
      files: processedFiles,
      language: detectProjectLanguage(processedFiles),
      status: 'UPLOADED',
      source: 'google_drive',
      metadata: {
        totalFiles: processedFiles.length,
        totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0),
        uploadMethod: 'google_drive',
        googleDriveFileId: fileId
      }
    });

    await project.save();

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        fileCount: project.files.length,
        language: project.language,
        createdAt: project.createdAt
      },
      message: `Successfully imported ${processedFiles.length} files from Google Drive`
    });

  } catch (error) {
    console.error('Google Drive upload error:', error);
    
    let errorMessage = 'Google Drive file import failed';
    if (error.response?.status === 404) {
      errorMessage = 'File not found or access denied';
    } else if (error.response?.status === 403) {
      errorMessage = 'Google Drive access denied';
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * @route   POST /api/upload/url
 * @desc    Handle URL-based project import
 * @access  Private
 */
router.post('/url', authenticateToken, async (req, res) => {
  try {
    const { url, projectName, description } = req.body;

    if (!url || !projectName) {
      return res.status(400).json({
        success: false,
        error: 'URL and project name are required'
      });
    }

    let processedFiles = [];

    // Check if it's a GitHub URL
    if (url.includes('github.com')) {
      return res.status(400).json({
        success: false,
        error: 'Please use the GitHub upload method for GitHub repositories'
      });
    }

    // Check if it's a direct file URL
    try {
      const response = await axios.get(url, {
        responseType: 'text',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024 // 10MB max
      });

      const fileName = path.basename(url) || 'downloaded_file';
      const fileContent = response.data;

      processedFiles.push({
        name: fileName,
        path: fileName,
        content: fileContent,
        language: detectFileLanguage(fileName),
        size: Buffer.from(fileContent).length,
        uploadDate: new Date()
      });

    } catch (downloadError) {
      console.error('URL download error:', downloadError);
      return res.status(400).json({
        success: false,
        error: 'Could not download file from URL'
      });
    }

    if (processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files could be downloaded from URL'
      });
    }

    // Create project
    const project = new Project({
      name: projectName,
      description: description || `Imported from URL: ${url}`,
      userId: req.user.userId,
      files: processedFiles,
      language: detectProjectLanguage(processedFiles),
      status: 'UPLOADED',
      source: 'url',
      metadata: {
        totalFiles: processedFiles.length,
        totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0),
        uploadMethod: 'url',
        sourceUrl: url
      }
    });

    await project.save();

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        fileCount: project.files.length,
        language: project.language,
        createdAt: project.createdAt
      },
      message: 'Successfully imported file from URL'
    });

  } catch (error) {
    console.error('URL upload error:', error);
    res.status(500).json({
      success: false,
      error: 'URL import failed'
    });
  }
});

/**
 * @route   GET /api/upload/progress/:uploadId
 * @desc    Get upload progress for large files
 * @access  Private
 */
router.get('/progress/:uploadId', authenticateToken, (req, res) => {
  // This would typically integrate with a real-time progress system
  // For now, return a mock response
  res.json({
    success: true,
    uploadId: req.params.uploadId,
    progress: 100,
    status: 'completed'
  });
});

/**
 * @route   POST /api/upload/validate
 * @desc    Validate files before upload
 * @access  Private
 */
router.post('/validate', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided for validation'
      });
    }

    const validationResults = {
      validFiles: [],
      invalidFiles: [],
      totalSize: 0,
      supportedLanguages: new Set()
    };

    for (const file of req.files) {
      try {
        const fileStats = await fs.stat(file.path);
        const fileExt = path.extname(file.originalname).toLowerCase();
        const language = detectFileLanguage(file.originalname);

        if (fileStats.size > 5 * 1024 * 1024) { // 5MB per file limit
          validationResults.invalidFiles.push({
            name: file.originalname,
            error: 'File size exceeds 5MB limit'
          });
        } else if (!isSupportedFileType(fileExt)) {
          validationResults.invalidFiles.push({
            name: file.originalname,
            error: `File type ${fileExt} is not supported`
          });
        } else {
          validationResults.validFiles.push({
            name: file.originalname,
            size: fileStats.size,
            language: language,
            extension: fileExt
          });
          validationResults.totalSize += fileStats.size;
          validationResults.supportedLanguages.add(language);
        }

        // Clean up temp file
        await fs.unlink(file.path);
      } catch (fileError) {
        console.error(`Error validating file ${file.originalname}:`, fileError);
        validationResults.invalidFiles.push({
          name: file.originalname,
          error: 'File validation failed'
        });
      }
    }

    res.json({
      success: true,
      validation: validationResults,
      summary: {
        totalFiles: req.files.length,
        validFiles: validationResults.validFiles.length,
        invalidFiles: validationResults.invalidFiles.length,
        totalSize: validationResults.totalSize,
        languages: Array.from(validationResults.supportedLanguages)
      }
    });

  } catch (error) {
    console.error('File validation error:', error);
    
    // Clean up any remaining files
    if (req.files) {
      await cleanupFiles(req.files);
    }

    res.status(500).json({
      success: false,
      error: 'File validation failed'
    });
  }
});

// Helper function to clean up uploaded files
async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error(`Error cleaning up file ${file.path}:`, error);
    }
  }
}

// Helper function to detect file language from extension
function detectFileLanguage(filename) {
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
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.xml': 'xml',
    '.md': 'markdown',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.txt': 'text'
  };

  return languageMap[ext] || 'text';
}

// Helper function to detect project language from files
function detectProjectLanguage(files) {
  const languageCount = {};
  
  files.forEach(file => {
    const lang = file.language;
    languageCount[lang] = (languageCount[lang] || 0) + 1;
  });

  return Object.keys(languageCount).reduce((a, b) => 
    languageCount[a] > languageCount[b] ? a : b, 'unknown'
  );
}

// Helper function to check if file type is supported
function isSupportedFileType(extension) {
  const supportedExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.html', '.css', '.scss', '.json',
    '.xml', '.md', '.yml', '.yaml', '.txt'
  ];
  
  return supportedExtensions.includes(extension);
}

module.exports = router;