// server/routes/projects.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Project, AnalysisResult } = require('../models/Project');
const { User } = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { geminiService } = require('../services/geminiAnalysis');
const { fileProcessor } = require('../services/fileProcessor');

// Rate limiting for project endpoints
const projectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many project requests, please try again later.'
  }
});

// Apply rate limiting to all project routes
router.use(projectLimiter);

/**
 * @route   GET /api/projects
 * @desc    Get all projects for authenticated user
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filter = { userId: req.user.userId };
    if (status && status !== 'all') {
      filter.status = status.toUpperCase();
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await Project.find(filter)
      .select('-files.content -analysisResults.fixedCode')
      .populate('analysisResults', 'errorCount fixedFileCount createdAt status')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      projects: projects.map(project => ({
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        fileCount: project.files.length,
        language: project.language,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        analysisResults: project.analysisResults,
        metadata: project.metadata
      })),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        pageSize: parseInt(limit),
        totalProjects: total
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('analysisResults');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        files: project.files.map(file => ({
          id: file._id,
          name: file.name,
          path: file.path,
          language: file.language,
          size: file.size,
          uploadDate: file.uploadDate
        })),
        language: project.language,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        analysisResults: project.analysisResults,
        metadata: project.metadata
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, files, source, metadata } = req.body;

    if (!name || !files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        error: 'Project name and files are required'
      });
    }

    // Validate file structure
    for (const file of files) {
      if (!file.name || !file.content) {
        return res.status(400).json({
          success: false,
          error: 'Each file must have name and content'
        });
      }
    }

    // Detect project language based on files
    const language = detectProjectLanguage(files);

    const project = new Project({
      name,
      description: description || '',
      userId: req.user.userId,
      files: files.map(file => ({
        name: file.name,
        path: file.path || file.name,
        content: file.content,
        language: file.language || detectFileLanguage(file.name),
        size: Buffer.from(file.content).length,
        uploadDate: new Date()
      })),
      language,
      status: 'UPLOADED',
      source: source || 'direct_upload',
      metadata: {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + Buffer.from(file.content).length, 0),
        uploadMethod: source || 'direct_upload',
        ...metadata
      }
    });

    await project.save();

    // Update user's project count
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'stats.projectCount': 1 }
    });

    res.status(201).json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        fileCount: project.files.length,
        language: project.language,
        createdAt: project.createdAt,
        metadata: project.metadata
      },
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, metadata } = req.body;

    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.status === 'PROCESSING') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update project while processing'
      });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (metadata) updates.metadata = { ...project.metadata, ...metadata };

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-files.content -analysisResults.fixedCode');

    res.json({
      success: true,
      project: {
        id: updatedProject._id,
        name: updatedProject.name,
        description: updatedProject.description,
        status: updatedProject.status,
        fileCount: updatedProject.files.length,
        language: updatedProject.language,
        updatedAt: updatedProject.updatedAt,
        metadata: updatedProject.metadata
      },
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Delete associated analysis results
    await AnalysisResult.deleteMany({ projectId: req.params.id });

    // Delete project
    await Project.findByIdAndDelete(req.params.id);

    // Update user's project count
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'stats.projectCount': -1 }
    });

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

/**
 * @route   POST /api/projects/:id/analyze
 * @desc    Start project analysis
 * @access  Private
 */
router.post('/:id/analyze', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.status === 'PROCESSING') {
      return res.status(400).json({
        success: false,
        error: 'Project is already being processed'
      });
    }

    if (project.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Project analysis already completed'
      });
    }

    // Update project status
    project.status = 'PROCESSING';
    project.analysisStartedAt = new Date();
    await project.save();

    // Start analysis in background
    analyzeProjectBackground(project._id);

    res.json({
      success: true,
      message: 'Project analysis started',
      projectId: project._id,
      status: project.status
    });
  } catch (error) {
    console.error('Start analysis error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to start analysis'
    });
  }
});

/**
 * @route   GET /api/projects/:id/status
 * @desc    Get project analysis status
 * @access  Private
 */
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).select('status analysisStartedAt analysisCompletedAt files metadata');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const analysisResult = await AnalysisResult.findOne({
      projectId: req.params.id
    }).select('errorCount fixedFileCount progress currentFile');

    res.json({
      success: true,
      status: project.status,
      progress: analysisResult?.progress || 0,
      currentFile: analysisResult?.currentFile || '',
      fileCount: project.files.length,
      analysisStartedAt: project.analysisStartedAt,
      analysisCompletedAt: project.analysisCompletedAt,
      stats: analysisResult ? {
        errorCount: analysisResult.errorCount,
        fixedFileCount: analysisResult.fixedFileCount
      } : null
    });
  } catch (error) {
    console.error('Get project status error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to get project status'
    });
  }
});

/**
 * @route   GET /api/projects/:id/results
 * @desc    Get project analysis results
 * @access  Private
 */
router.get('/:id/results', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).select('name status files language');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Project analysis not completed yet'
      });
    }

    const analysisResults = await AnalysisResult.find({
      projectId: req.params.id
    }).sort({ createdAt: -1 }).limit(1);

    if (!analysisResults.length) {
      return res.status(404).json({
        success: false,
        error: 'Analysis results not found'
      });
    }

    const result = analysisResults[0];

    res.json({
      success: true,
      results: {
        id: result._id,
        projectId: result.projectId,
        errors: result.errors,
        fixes: result.fixes,
        fixedCode: result.fixedCode,
        metrics: result.metrics,
        errorCount: result.errorCount,
        fixedFileCount: result.fixedFileCount,
        createdAt: result.createdAt,
        analysisTime: result.analysisTime
      },
      project: {
        name: project.name,
        fileCount: project.files.length,
        language: project.language
      }
    });
  } catch (error) {
    console.error('Get project results error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis results'
    });
  }
});

/**
 * @route   POST /api/projects/:id/reanalyze
 * @desc    Reanalyze project
 * @access  Private
 */
router.post('/:id/reanalyze', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Delete old analysis results
    await AnalysisResult.deleteMany({ projectId: req.params.id });

    // Reset project status
    project.status = 'UPLOADED';
    project.analysisStartedAt = null;
    project.analysisCompletedAt = null;
    await project.save();

    // Start new analysis
    analyzeProjectBackground(project._id);

    res.json({
      success: true,
      message: 'Project reanalysis started',
      projectId: project._id,
      status: project.status
    });
  } catch (error) {
    console.error('Reanalyze project error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to reanalyze project'
    });
  }
});

/**
 * @route   GET /api/projects/:id/download
 * @desc    Download fixed project files
 * @access  Private
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).select('name files');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const analysisResult = await AnalysisResult.findOne({
      projectId: req.params.id
    }).select('fixedCode');

    if (!analysisResult || !analysisResult.fixedCode) {
      return res.status(400).json({
        success: false,
        error: 'No fixed code available for download'
      });
    }

    // Create ZIP file with fixed code
    const zipBuffer = await fileProcessor.createProjectZip(
      analysisResult.fixedCode,
      project.name
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${project.name}_fixed.zip"`,
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);
  } catch (error) {
    console.error('Download project error:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to download project'
    });
  }
});

// Background analysis function
async function analyzeProjectBackground(projectId) {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;

    // Create analysis result record
    const analysisResult = new AnalysisResult({
      projectId: projectId,
      status: 'PROCESSING',
      progress: 0,
      currentFile: ''
    });
    await analysisResult.save();

    // Process each file
    let processedFiles = 0;
    const totalFiles = project.files.length;
    const analysisStartTime = Date.now();

    for (const file of project.files) {
      // Update progress
      analysisResult.currentFile = file.name;
      analysisResult.progress = Math.round((processedFiles / totalFiles) * 100);
      await analysisResult.save();

      try {
        // Analyze file with Gemini AI
        const analysis = await geminiService.analyzeFile({
          name: file.name,
          content: file.content,
          language: file.language
        });

        // Store analysis results
        analysisResult.errors.push(...analysis.errors);
        analysisResult.fixes.push(...analysis.fixes);
        
        if (analysis.fixedCode) {
          analysisResult.fixedCode.push({
            fileId: file._id,
            fileName: file.name,
            originalContent: file.content,
            fixedContent: analysis.fixedCode,
            changes: analysis.changes
          });
        }

        processedFiles++;
      } catch (fileError) {
        console.error(`Error analyzing file ${file.name}:`, fileError);
        analysisResult.errors.push({
          file: file.name,
          type: 'ANALYSIS_ERROR',
          message: `Failed to analyze file: ${fileError.message}`,
          line: 0,
          severity: 'HIGH'
        });
      }
    }

    // Calculate metrics
    analysisResult.errorCount = analysisResult.errors.length;
    analysisResult.fixedFileCount = analysisResult.fixedCode.length;
    analysisResult.status = 'COMPLETED';
    analysisResult.progress = 100;
    analysisResult.analysisTime = Date.now() - analysisStartTime;
    analysisResult.completedAt = new Date();

    await analysisResult.save();

    // Update project status
    project.status = 'COMPLETED';
    project.analysisCompletedAt = new Date();
    await project.save();

  } catch (error) {
    console.error('Background analysis error:', error);
    
    // Update project status to failed
    await Project.findByIdAndUpdate(projectId, {
      status: 'FAILED',
      analysisCompletedAt: new Date()
    });

    // Update analysis result
    await AnalysisResult.findOneAndUpdate(
      { projectId: projectId },
      {
        status: 'FAILED',
        error: error.message
      }
    );
  }
}

// Helper function to detect project language
function detectProjectLanguage(files) {
  const languageCount = {};
  
  files.forEach(file => {
    const lang = detectFileLanguage(file.name);
    languageCount[lang] = (languageCount[lang] || 0) + 1;
  });

  return Object.keys(languageCount).reduce((a, b) => 
    languageCount[a] > languageCount[b] ? a : b, 'javascript'
  );
}

// Helper function to detect file language from extension
function detectFileLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'xml': 'xml',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml'
  };

  return languageMap[ext] || 'text';
}

module.exports = router;