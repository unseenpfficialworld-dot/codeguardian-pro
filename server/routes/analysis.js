// server/routes/analysis.js
const express = require('express');
const router = express.Router();
const { Project, AnalysisResult } = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { geminiService } = require('../services/geminiAnalysis');
const { fileProcessor } = require('../services/fileProcessor');
const rateLimit = require('express-rate-limit');

// Rate limiting for analysis endpoints
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 analysis requests per windowMs
  message: {
    error: 'Too many analysis requests, please try again later.'
  }
});

// Apply rate limiting to all analysis routes
router.use(analysisLimiter);

/**
 * @route   POST /api/analyze/:projectId
 * @desc    Start comprehensive code analysis for a project
 * @access  Private
 */
router.post('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { analysisType = 'comprehensive', options = {} } = req.body;

    const project = await Project.findOne({
      _id: projectId,
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
        error: 'Project is already being analyzed'
      });
    }

    // Update project status
    project.status = 'PROCESSING';
    project.analysisStartedAt = new Date();
    project.analysisType = analysisType;
    await project.save();

    // Create analysis result record
    const analysisResult = new AnalysisResult({
      projectId: projectId,
      status: 'PROCESSING',
      analysisType: analysisType,
      options: options,
      progress: 0,
      currentStage: 'initializing',
      errors: [],
      fixes: [],
      fixedCode: [],
      metrics: {
        totalFiles: project.files.length,
        filesProcessed: 0,
        startTime: new Date()
      }
    });

    await analysisResult.save();

    // Start background analysis
    startComprehensiveAnalysis(project, analysisResult, options);

    res.json({
      success: true,
      message: 'Code analysis started successfully',
      analysisId: analysisResult._id,
      projectId: projectId,
      status: 'PROCESSING',
      estimatedTime: estimateAnalysisTime(project.files.length, analysisType)
    });

  } catch (error) {
    console.error('Start analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start code analysis'
    });
  }
});

/**
 * @route   GET /api/analyze/:projectId/status
 * @desc    Get real-time analysis status and progress
 * @access  Private
 */
router.get('/:projectId/status', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('status name analysisStartedAt analysisCompletedAt');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const analysisResult = await AnalysisResult.findOne({
      projectId: projectId
    }).select('status progress currentStage metrics errors fixes');

    if (!analysisResult) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found for this project'
      });
    }

    const statusData = {
      projectId: projectId,
      projectName: project.name,
      status: analysisResult.status,
      progress: analysisResult.progress,
      currentStage: analysisResult.currentStage,
      metrics: analysisResult.metrics,
      errorsFound: analysisResult.errors.length,
      fixesGenerated: analysisResult.fixes.length,
      startedAt: project.analysisStartedAt,
      completedAt: project.analysisCompletedAt
    };

    // Add estimated time remaining for processing status
    if (analysisResult.status === 'PROCESSING') {
      statusData.estimatedTimeRemaining = calculateTimeRemaining(
        analysisResult.progress,
        project.analysisStartedAt
      );
    }

    res.json({
      success: true,
      analysis: statusData
    });

  } catch (error) {
    console.error('Get analysis status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis status'
    });
  }
});

/**
 * @route   GET /api/analyze/:projectId/results
 * @desc    Get detailed analysis results
 * @access  Private
 */
router.get('/:projectId/results', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { includeFixedCode = false } = req.query;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('name files language metadata');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const analysisResult = await AnalysisResult.findOne({
      projectId: projectId,
      status: 'COMPLETED'
    });

    if (!analysisResult) {
      return res.status(400).json({
        success: false,
        error: 'Analysis not completed or not found'
      });
    }

    const results = {
      id: analysisResult._id,
      projectId: projectId,
      projectName: project.name,
      analysisType: analysisResult.analysisType,
      status: analysisResult.status,
      completedAt: analysisResult.completedAt,
      analysisTime: analysisResult.analysisTime,
      metrics: analysisResult.metrics,
      errors: analysisResult.errors,
      fixes: analysisResult.fixes,
      summary: generateAnalysisSummary(analysisResult),
      recommendations: analysisResult.recommendations || []
    };

    // Include fixed code if requested
    if (includeFixedCode === 'true') {
      results.fixedCode = analysisResult.fixedCode;
    }

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Get analysis results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis results'
    });
  }
});

/**
 * @route   GET /api/analyze/:projectId/errors
 * @desc    Get detailed error breakdown
 * @access  Private
 */
router.get('/:projectId/errors', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { severity, type, file } = req.query;

    const analysisResult = await AnalysisResult.findOne({
      projectId: projectId
    }).select('errors fixes');

    if (!analysisResult) {
      return res.status(404).json({
        success: false,
        error: 'Analysis results not found'
      });
    }

    let errors = analysisResult.errors;
    let fixes = analysisResult.fixes;

    // Apply filters
    if (severity) {
      errors = errors.filter(error => error.severity === severity.toUpperCase());
    }

    if (type) {
      errors = errors.filter(error => error.type === type.toUpperCase());
    }

    if (file) {
      errors = errors.filter(error => error.file.includes(file));
      fixes = fixes.filter(fix => fix.file.includes(file));
    }

    // Group errors by category
    const errorCategories = {
      syntax: errors.filter(e => e.category === 'syntax'),
      type: errors.filter(e => e.category === 'type'),
      logic: errors.filter(e => e.category === 'logic'),
      security: errors.filter(e => e.category === 'security'),
      performance: errors.filter(e => e.category === 'performance'),
      style: errors.filter(e => e.category === 'style')
    };

    // Calculate statistics
    const errorStats = {
      total: errors.length,
      bySeverity: {
        critical: errors.filter(e => e.severity === 'CRITICAL').length,
        high: errors.filter(e => e.severity === 'HIGH').length,
        medium: errors.filter(e => e.severity === 'MEDIUM').length,
        low: errors.filter(e => e.severity === 'LOW').length
      },
      byCategory: {
        syntax: errorCategories.syntax.length,
        type: errorCategories.type.length,
        logic: errorCategories.logic.length,
        security: errorCategories.security.length,
        performance: errorCategories.performance.length,
        style: errorCategories.style.length
      }
    };

    res.json({
      success: true,
      errors: {
        list: errors,
        fixes: fixes,
        categories: errorCategories,
        statistics: errorStats
      }
    });

  } catch (error) {
    console.error('Get error details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get error details'
    });
  }
});

/**
 * @route   POST /api/analyze/:projectId/quick
 * @desc    Perform quick analysis on specific files
 * @access  Private
 */
router.post('/:projectId/quick', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePaths, analysisTypes = ['syntax', 'security'] } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Filter files to analyze
    const filesToAnalyze = project.files.filter(file => 
      filePaths.includes(file.path) || filePaths.includes(file.name)
    );

    if (filesToAnalyze.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No matching files found for analysis'
      });
    }

    const quickResults = {
      analyzedFiles: [],
      errors: [],
      warnings: [],
      suggestions: [],
      analysisTime: 0
    };

    const startTime = Date.now();

    // Analyze each file
    for (const file of filesToAnalyze) {
      try {
        const fileAnalysis = await geminiService.quickAnalyzeFile({
          name: file.name,
          content: file.content,
          language: file.language,
          analysisTypes: analysisTypes
        });

        quickResults.analyzedFiles.push({
          name: file.name,
          path: file.path,
          language: file.language
        });

        quickResults.errors.push(...fileAnalysis.errors);
        quickResults.warnings.push(...fileAnalysis.warnings);
        quickResults.suggestions.push(...fileAnalysis.suggestions);

      } catch (fileError) {
        console.error(`Quick analysis error for ${file.name}:`, fileError);
        quickResults.errors.push({
          file: file.name,
          type: 'ANALYSIS_ERROR',
          message: `Failed to analyze file: ${fileError.message}`,
          severity: 'HIGH'
        });
      }
    }

    quickResults.analysisTime = Date.now() - startTime;

    res.json({
      success: true,
      analysis: quickResults,
      summary: {
        filesAnalyzed: quickResults.analyzedFiles.length,
        totalErrors: quickResults.errors.length,
        totalWarnings: quickResults.warnings.length,
        totalSuggestions: quickResults.suggestions.length,
        analysisTime: quickResults.analysisTime
      }
    });

  } catch (error) {
    console.error('Quick analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Quick analysis failed'
    });
  }
});

/**
 * @route   GET /api/analyze/:projectId/comparison
 * @desc    Get code comparison between original and fixed versions
 * @access  Private
 */
router.get('/:projectId/comparison', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath } = req.query;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('files');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const analysisResult = await AnalysisResult.findOne({
      projectId: projectId,
      status: 'COMPLETED'
    }).select('fixedCode');

    if (!analysisResult) {
      return res.status(400).json({
        success: false,
        error: 'Analysis not completed'
      });
    }

    let comparisons = [];

    if (filePath) {
      // Single file comparison
      const originalFile = project.files.find(f => f.path === filePath || f.name === filePath);
      const fixedFile = analysisResult.fixedCode.find(f => f.fileName === filePath || f.filePath === filePath);

      if (!originalFile) {
        return res.status(404).json({
          success: false,
          error: 'File not found in project'
        });
      }

      const comparison = await generateFileComparison(originalFile, fixedFile);
      comparisons.push(comparison);

    } else {
      // Multiple file comparisons (limited to 10 for performance)
      const filesToCompare = project.files.slice(0, 10);
      
      for (const originalFile of filesToCompare) {
        const fixedFile = analysisResult.fixedCode.find(f => 
          f.fileId && f.fileId.toString() === originalFile._id.toString()
        );

        const comparison = await generateFileComparison(originalFile, fixedFile);
        comparisons.push(comparison);
      }
    }

    res.json({
      success: true,
      comparisons: comparisons,
      totalFiles: project.files.length,
      filesWithFixes: analysisResult.fixedCode.length
    });

  } catch (error) {
    console.error('Get comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate code comparison'
    });
  }
});

/**
 * @route   POST /api/analyze/:projectId/export
 * @desc    Export analysis results in various formats
 * @access  Private
 */
router.post('/:projectId/export', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'json', includeCode = false } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('name files language metadata');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const analysisResult = await AnalysisResult.findOne({
      projectId: projectId,
      status: 'COMPLETED'
    });

    if (!analysisResult) {
      return res.status(400).json({
        success: false,
        error: 'Analysis not completed'
      });
    }

    let exportData;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'json':
        exportData = JSON.stringify({
          project: {
            name: project.name,
            language: project.language,
            fileCount: project.files.length,
            metadata: project.metadata
          },
          analysis: {
            id: analysisResult._id,
            type: analysisResult.analysisType,
            completedAt: analysisResult.completedAt,
            analysisTime: analysisResult.analysisTime,
            metrics: analysisResult.metrics,
            errors: analysisResult.errors,
            fixes: analysisResult.fixes,
            summary: generateAnalysisSummary(analysisResult),
            recommendations: analysisResult.recommendations || []
          },
          ...(includeCode && { fixedCode: analysisResult.fixedCode })
        }, null, 2);
        contentType = 'application/json';
        filename = `${project.name}_analysis.json`;
        break;

      case 'html':
        exportData = generateHTMLReport(project, analysisResult);
        contentType = 'text/html';
        filename = `${project.name}_analysis_report.html`;
        break;

      case 'csv':
        exportData = generateCSVReport(analysisResult.errors);
        contentType = 'text/csv';
        filename = `${project.name}_errors.csv`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported export format'
        });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(exportData)
    });

    res.send(exportData);

  } catch (error) {
    console.error('Export analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analysis results'
    });
  }
});

// Background analysis function
async function startComprehensiveAnalysis(project, analysisResult, options) {
  try {
    const stages = [
      'initializing',
      'syntax_analysis',
      'type_checking',
      'security_scan',
      'performance_analysis',
      'code_quality',
      'generating_fixes',
      'finalizing'
    ];

    let currentStageIndex = 0;

    for (const stage of stages) {
      // Update current stage
      analysisResult.currentStage = stage;
      analysisResult.progress = Math.round((currentStageIndex / stages.length) * 100);
      await analysisResult.save();

      try {
        switch (stage) {
          case 'syntax_analysis':
            await performSyntaxAnalysis(project, analysisResult);
            break;

          case 'type_checking':
            await performTypeChecking(project, analysisResult);
            break;

          case 'security_scan':
            await performSecurityScan(project, analysisResult);
            break;

          case 'performance_analysis':
            await performPerformanceAnalysis(project, analysisResult);
            break;

          case 'code_quality':
            await performCodeQualityAnalysis(project, analysisResult);
            break;

          case 'generating_fixes':
            await generateCodeFixes(project, analysisResult);
            break;

          case 'finalizing':
            await finalizeAnalysis(project, analysisResult);
            break;
        }
      } catch (stageError) {
        console.error(`Error in stage ${stage}:`, stageError);
        analysisResult.errors.push({
          type: 'STAGE_ERROR',
          message: `Failed in ${stage}: ${stageError.message}`,
          severity: 'HIGH',
          stage: stage
        });
      }

      currentStageIndex++;
    }

    // Mark analysis as completed
    analysisResult.status = 'COMPLETED';
    analysisResult.progress = 100;
    analysisResult.completedAt = new Date();
    analysisResult.analysisTime = Date.now() - analysisResult.metrics.startTime;
    await analysisResult.save();

    // Update project status
    project.status = 'COMPLETED';
    project.analysisCompletedAt = new Date();
    await project.save();

  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    
    // Mark analysis as failed
    analysisResult.status = 'FAILED';
    analysisResult.error = error.message;
    await analysisResult.save();

    // Update project status
    project.status = 'FAILED';
    project.analysisCompletedAt = new Date();
    await project.save();
  }
}

// Analysis stage functions
async function performSyntaxAnalysis(project, analysisResult) {
  for (const file of project.files) {
    const syntaxAnalysis = await geminiService.analyzeSyntax({
      content: file.content,
      language: file.language
    });

    analysisResult.errors.push(...syntaxAnalysis.errors.map(error => ({
      ...error,
      file: file.name,
      category: 'syntax'
    })));

    analysisResult.metrics.filesProcessed++;
    await analysisResult.save();
  }
}

async function performTypeChecking(project, analysisResult) {
  for (const file of project.files) {
    const typeAnalysis = await geminiService.analyzeTypes({
      content: file.content,
      language: file.language
    });

    analysisResult.errors.push(...typeAnalysis.errors.map(error => ({
      ...error,
      file: file.name,
      category: 'type'
    })));

    analysisResult.metrics.filesProcessed++;
    await analysisResult.save();
  }
}

async function performSecurityScan(project, analysisResult) {
  for (const file of project.files) {
    const securityAnalysis = await geminiService.analyzeSecurity({
      content: file.content,
      language: file.language
    });

    analysisResult.errors.push(...securityAnalysis.vulnerabilities.map(error => ({
      ...error,
      file: file.name,
      category: 'security'
    })));

    analysisResult.metrics.filesProcessed++;
    await analysisResult.save();
  }
}

async function performPerformanceAnalysis(project, analysisResult) {
  for (const file of project.files) {
    const performanceAnalysis = await geminiService.analyzePerformance({
      content: file.content,
      language: file.language
    });

    analysisResult.errors.push(...performanceAnalysis.issues.map(error => ({
      ...error,
      file: file.name,
      category: 'performance'
    })));

    analysisResult.metrics.filesProcessed++;
    await analysisResult.save();
  }
}

async function performCodeQualityAnalysis(project, analysisResult) {
  for (const file of project.files) {
    const qualityAnalysis = await geminiService.analyzeCodeQuality({
      content: file.content,
      language: file.language
    });

    analysisResult.errors.push(...qualityAnalysis.issues.map(error => ({
      ...error,
      file: file.name,
      category: 'style',
      severity: 'LOW'
    })));

    analysisResult.metrics.filesProcessed++;
    await analysisResult.save();
  }
}

async function generateCodeFixes(project, analysisResult) {
  const filesWithErrors = project.files.filter(file => 
    analysisResult.errors.some(error => error.file === file.name)
  );

  for (const file of filesWithErrors) {
    const fileErrors = analysisResult.errors.filter(error => error.file === file.name);
    
    const fixes = await geminiService.generateFixes({
      content: file.content,
      language: file.language,
      errors: fileErrors
    });

    if (fixes.fixedCode) {
      analysisResult.fixedCode.push({
        fileId: file._id,
        fileName: file.name,
        filePath: file.path,
        originalContent: file.content,
        fixedContent: fixes.fixedCode,
        changes: fixes.changes,
        appliedFixes: fixes.appliedFixes
      });
    }

    analysisResult.fixes.push(...fixes.fixes.map(fix => ({
      ...fix,
      file: file.name
    })));

    await analysisResult.save();
  }
}

async function finalizeAnalysis(project, analysisResult) {
  // Generate summary and recommendations
  analysisResult.metrics.totalErrors = analysisResult.errors.length;
  analysisResult.metrics.filesWithFixes = analysisResult.fixedCode.length;
  analysisResult.metrics.fixesGenerated = analysisResult.fixes.length;

  analysisResult.recommendations = await geminiService.generateRecommendations({
    errors: analysisResult.errors,
    fixes: analysisResult.fixes,
    projectLanguage: project.language,
    fileCount: project.files.length
  });
}

// Helper functions
function estimateAnalysisTime(fileCount, analysisType) {
  const baseTime = fileCount * 2; // 2 seconds per file base
  const multiplier = analysisType === 'comprehensive' ? 1.5 : 1;
  return Math.round(baseTime * multiplier * 1000); // Convert to milliseconds
}

function calculateTimeRemaining(progress, startTime) {
  if (progress === 0) return null;
  
  const elapsed = Date.now() - startTime;
  const totalEstimated = (elapsed / progress) * 100;
  return Math.round(totalEstimated - elapsed);
}

function generateAnalysisSummary(analysisResult) {
  const criticalErrors = analysisResult.errors.filter(e => e.severity === 'CRITICAL').length;
  const highErrors = analysisResult.errors.filter(e => e.severity === 'HIGH').length;
  
  return {
    totalErrors: analysisResult.errors.length,
    criticalErrors: criticalErrors,
    highErrors: highErrors,
    filesFixed: analysisResult.fixedCode.length,
    successRate: analysisResult.files.length > 0 ? 
      ((analysisResult.files.length - analysisResult.errors.length) / analysisResult.files.length) * 100 : 0,
    qualityScore: Math.max(0, 100 - (criticalErrors * 10) - (highErrors * 5)),
    analysisDuration: analysisResult.analysisTime
  };
}

async function generateFileComparison(originalFile, fixedFile) {
  const comparison = {
    fileName: originalFile.name,
    filePath: originalFile.path,
    language: originalFile.language,
    hasFixes: !!fixedFile,
    changes: fixedFile ? fixedFile.changes : 0
  };

  if (fixedFile) {
    comparison.originalContent = originalFile.content;
    comparison.fixedContent = fixedFile.fixedContent;
    
    // Generate diff (simplified)
    comparison.diff = await generateSimpleDiff(originalFile.content, fixedFile.fixedContent);
  }

  return comparison;
}

async function generateSimpleDiff(original, fixed) {
  // Simplified diff generation - in real implementation, use a proper diff library
  const originalLines = original.split('\n');
  const fixedLines = fixed.split('\n');
  
  const diff = [];
  const maxLines = Math.max(originalLines.length, fixedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const originalLine = originalLines[i] || '';
    const fixedLine = fixedLines[i] || '';

    if (originalLine !== fixedLine) {
      diff.push({
        line: i + 1,
        original: originalLine,
        fixed: fixedLine,
        type: 'modified'
      });
    }
  }

  return diff;
}

function generateHTMLReport(project, analysisResult) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Analysis Report - ${project.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { background: #e8f4fd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .error { background: #ffeaea; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .critical { border-left: 4px solid #dc3545; }
        .high { border-left: 4px solid #fd7e14; }
        .medium { border-left: 4px solid #ffc107; }
        .low { border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Code Analysis Report</h1>
        <h2>${project.name}</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h3>Summary</h3>
        <p>Total Errors: ${analysisResult.errors.length}</p>
        <p>Files Fixed: ${analysisResult.fixedCode.length}</p>
        <p>Analysis Time: ${analysisResult.analysisTime}ms</p>
    </div>
    
    <h3>Errors</h3>
    ${analysisResult.errors.map(error => `
        <div class="error ${error.severity.toLowerCase()}">
            <strong>${error.file}</strong> - ${error.type} (${error.severity})<br>
            ${error.message}
        </div>
    `).join('')}
</body>
</html>
  `;
}

function generateCSVReport(errors) {
  const headers = ['File', 'Type', 'Severity', 'Message', 'Line', 'Category'];
  const rows = errors.map(error => [
    error.file,
    error.type,
    error.severity,
    `"${error.message.replace(/"/g, '""')}"`,
    error.line || '',
    error.category || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

module.exports = router;