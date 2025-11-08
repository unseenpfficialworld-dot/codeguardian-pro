// server/routes/download.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const { Project, AnalysisResult } = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { fileProcessor } = require('../services/fileProcessor');
const rateLimit = require('express-rate-limit');

// Rate limiting for download endpoints
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 download requests per windowMs
  message: {
    error: 'Too many download requests, please try again later.'
  }
});

// Apply rate limiting to all download routes
router.use(downloadLimiter);

/**
 * @route   GET /api/download/:projectId/project
 * @desc    Download fixed project as ZIP file
 * @access  Private
 */
router.get('/:projectId/project', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'zip', includeOriginal = false } = req.query;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('name files');

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

    if (!analysisResult || !analysisResult.fixedCode || analysisResult.fixedCode.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fixed code available for download. Please complete analysis first.'
      });
    }

    // Set response headers
    const filename = `${project.name}_fixed_${Date.now()}.${format}`;
    
    if (format === 'zip') {
      await downloadAsZip(project, analysisResult, includeOriginal === 'true', res, filename);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported download format. Only ZIP is supported.'
      });
    }

  } catch (error) {
    console.error('Download project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download project'
    });
  }
});

/**
 * @route   GET /api/download/:projectId/report
 * @desc    Download analysis report in various formats
 * @access  Private
 */
router.get('/:projectId/report', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'pdf', type = 'detailed' } = req.query;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('name files language metadata analysisStartedAt analysisCompletedAt');

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

    let reportData;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'pdf':
        reportData = await generatePDFReport(project, analysisResult, type);
        contentType = 'application/pdf';
        filename = `${project.name}_analysis_report_${type}.pdf`;
        break;

      case 'html':
        reportData = generateHTMLReport(project, analysisResult, type);
        contentType = 'text/html';
        filename = `${project.name}_analysis_report_${type}.html`;
        break;

      case 'json':
        reportData = JSON.stringify({
          project: {
            id: project._id,
            name: project.name,
            language: project.language,
            fileCount: project.files.length,
            analysisStartedAt: project.analysisStartedAt,
            analysisCompletedAt: project.analysisCompletedAt,
            metadata: project.metadata
          },
          analysis: {
            id: analysisResult._id,
            type: analysisResult.analysisType,
            status: analysisResult.status,
            completedAt: analysisResult.completedAt,
            analysisTime: analysisResult.analysisTime,
            metrics: analysisResult.metrics,
            errors: analysisResult.errors,
            fixes: analysisResult.fixes,
            summary: generateAnalysisSummary(analysisResult),
            recommendations: analysisResult.recommendations || []
          }
        }, null, 2);
        contentType = 'application/json';
        filename = `${project.name}_analysis_report.json`;
        break;

      case 'csv':
        reportData = generateCSVReport(analysisResult, type);
        contentType = 'text/csv';
        filename = `${project.name}_analysis_${type}.csv`;
        break;

      case 'markdown':
        reportData = generateMarkdownReport(project, analysisResult, type);
        contentType = 'text/markdown';
        filename = `${project.name}_analysis_report.md`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported report format'
        });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(reportData)
    });

    res.send(reportData);

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate download report'
    });
  }
});

/**
 * @route   GET /api/download/:projectId/file/:fileId
 * @desc    Download individual fixed file
 * @access  Private
 */
router.get('/:projectId/file/:fileId', authenticateToken, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const { version = 'fixed' } = req.query; // 'original' or 'fixed'

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

    const file = project.files.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found in project'
      });
    }

    let fileContent;
    let filename;

    if (version === 'original') {
      fileContent = file.content;
      filename = file.name;
    } else {
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

      const fixedFile = analysisResult.fixedCode.find(f => 
        f.fileId && f.fileId.toString() === fileId
      );

      if (!fixedFile) {
        return res.status(400).json({
          success: false,
          error: 'Fixed version not available for this file'
        });
      }

      fileContent = fixedFile.fixedContent;
      filename = `fixed_${file.name}`;
    }

    res.set({
      'Content-Type': getContentType(file.name),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(fileContent)
    });

    res.send(fileContent);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

/**
 * @route   GET /api/download/:projectId/comparison
 * @desc    Download code comparison report
 * @access  Private
 */
router.get('/:projectId/comparison', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'html' } = req.query;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('name files');

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

    const comparisons = [];
    const maxFiles = Math.min(project.files.length, 50); // Limit to 50 files for performance

    for (let i = 0; i < maxFiles; i++) {
      const file = project.files[i];
      const fixedFile = analysisResult.fixedCode.find(f => 
        f.fileId && f.fileId.toString() === file._id.toString()
      );

      if (fixedFile) {
        comparisons.push({
          fileName: file.name,
          filePath: file.path,
          originalContent: file.content,
          fixedContent: fixedFile.fixedContent,
          changes: fixedFile.changes,
          appliedFixes: fixedFile.appliedFixes
        });
      }
    }

    let comparisonData;
    let contentType;
    let filename;

    if (format === 'html') {
      comparisonData = generateComparisonHTML(project, comparisons);
      contentType = 'text/html';
      filename = `${project.name}_code_comparison.html`;
    } else if (format === 'json') {
      comparisonData = JSON.stringify({
        project: {
          name: project.name,
          totalFiles: project.files.length,
          filesWithFixes: comparisons.length
        },
        comparisons: comparisons
      }, null, 2);
      contentType = 'application/json';
      filename = `${project.name}_code_comparison.json`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported comparison format'
      });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(comparisonData)
    });

    res.send(comparisonData);

  } catch (error) {
    console.error('Download comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comparison download'
    });
  }
});

/**
 * @route   GET /api/download/:projectId/errors
 * @desc    Download error list in various formats
 * @access  Private
 */
router.get('/:projectId/errors', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'csv', severity, category } = req.query;

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

    if (category) {
      errors = errors.filter(error => error.category === category);
    }

    let errorData;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'csv':
        errorData = generateErrorCSV(errors, fixes);
        contentType = 'text/csv';
        filename = `${projectId}_errors.csv`;
        break;

      case 'json':
        errorData = JSON.stringify({
          errors: errors,
          fixes: fixes,
          summary: {
            total: errors.length,
            bySeverity: groupBySeverity(errors),
            byCategory: groupByCategory(errors)
          }
        }, null, 2);
        contentType = 'application/json';
        filename = `${projectId}_errors.json`;
        break;

      case 'html':
        errorData = generateErrorHTML(errors, fixes);
        contentType = 'text/html';
        filename = `${projectId}_errors.html`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported error format'
        });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.byteLength(errorData)
    });

    res.send(errorData);

  } catch (error) {
    console.error('Download errors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download error list'
    });
  }
});

/**
 * @route   POST /api/download/:projectId/bundle
 * @desc    Create and download a complete project bundle
 * @access  Private
 */
router.post('/:projectId/bundle', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      includeOriginal = true,
      includeFixed = true,
      includeReports = true,
      includeComparison = false 
    } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.user.userId
    }).select('name files');

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

    const filename = `${project.name}_complete_bundle_${Date.now()}.zip`;
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to create bundle'
      });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add original files if requested
    if (includeOriginal) {
      project.files.forEach(file => {
        archive.append(file.content, { 
          name: `original/${file.path || file.name}` 
        });
      });
    }

    // Add fixed files if requested
    if (includeFixed && analysisResult.fixedCode) {
      analysisResult.fixedCode.forEach(file => {
        archive.append(file.fixedContent, { 
          name: `fixed/${file.filePath || file.fileName}` 
        });
      });
    }

    // Add reports if requested
    if (includeReports) {
      const htmlReport = generateHTMLReport(project, analysisResult, 'detailed');
      archive.append(htmlReport, { name: 'reports/analysis_report.html' });

      const jsonReport = JSON.stringify({
        project: project,
        analysis: analysisResult
      }, null, 2);
      archive.append(jsonReport, { name: 'reports/analysis_report.json' });

      const csvReport = generateCSVReport(analysisResult, 'detailed');
      archive.append(csvReport, { name: 'reports/errors.csv' });
    }

    // Add comparison if requested
    if (includeComparison) {
      const comparisonData = generateComparisonHTML(project, analysisResult.fixedCode || []);
      archive.append(comparisonData, { name: 'reports/code_comparison.html' });
    }

    // Add README file
    const readmeContent = generateBundleReadme(project, analysisResult, {
      includeOriginal,
      includeFixed,
      includeReports,
      includeComparison
    });
    archive.append(readmeContent, { name: 'README.md' });

    // Finalize archive
    await archive.finalize();

  } catch (error) {
    console.error('Download bundle error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project bundle'
    });
  }
});

// Helper function to download project as ZIP
async function downloadAsZip(project, analysisResult, includeOriginal, res, filename) {
  return new Promise((resolve, reject) => {
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('end', () => {
      resolve();
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add fixed files
    analysisResult.fixedCode.forEach(file => {
      archive.append(file.fixedContent, { 
        name: file.filePath || file.fileName 
      });
    });

    // Add original files if requested
    if (includeOriginal) {
      project.files.forEach(file => {
        archive.append(file.content, { 
          name: `original/${file.path || file.name}` 
        });
      });
    }

    // Add a README file with project info
    const readmeContent = generateProjectReadme(project, analysisResult, includeOriginal);
    archive.append(readmeContent, { name: 'README.md' });

    // Finalize archive
    archive.finalize();
  });
}

// Helper function to generate PDF report (simplified - in real implementation, use a PDF library)
async function generatePDFReport(project, analysisResult, type) {
  // This is a simplified version. In production, use libraries like pdfkit, puppeteer, etc.
  const htmlContent = generateHTMLReport(project, analysisResult, type);
  
  // For now, return HTML content as we don't have PDF generation set up
  // In real implementation, convert HTML to PDF
  return Buffer.from(htmlContent);
}

// Helper function to generate HTML report
function generateHTMLReport(project, analysisResult, type) {
  const summary = generateAnalysisSummary(analysisResult);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Analysis Report - ${project.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
        }
        .card .value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .card.critical { border-left: 4px solid #dc3545; }
        .card.high { border-left: 4px solid #fd7e14; }
        .card.medium { border-left: 4px solid #ffc107; }
        .card.low { border-left: 4px solid #28a745; }
        .error-list {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .error-item {
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #ddd;
            background: #f8f9fa;
        }
        .error-item.critical { border-left-color: #dc3545; background: #f8d7da; }
        .error-item.high { border-left-color: #fd7e14; background: #fff3cd; }
        .error-item.medium { border-left-color: #ffc107; background: #fff3cd; }
        .error-item.low { border-left-color: #28a745; background: #d1ecf1; }
        .error-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 5px;
        }
        .error-file {
            font-weight: bold;
            color: #495057;
        }
        .error-type {
            background: #6c757d;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
        }
        .error-message {
            color: #495057;
            margin: 5px 0;
        }
        .error-details {
            font-size: 12px;
            color: #6c757d;
        }
        .recommendations {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .recommendation-item {
            padding: 10px;
            margin: 5px 0;
            background: #e7f3ff;
            border-left: 4px solid #007bff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Code Analysis Report</h1>
        <h2>${project.name}</h2>
        <p>Generated on ${new Date().toLocaleString()} | ${project.language} Project</p>
    </div>

    <div class="summary-cards">
        <div class="card">
            <h3>Total Files</h3>
            <div class="value">${project.files.length}</div>
        </div>
        <div class="card critical">
            <h3>Critical Errors</h3>
            <div class="value">${summary.criticalErrors}</div>
        </div>
        <div class="card high">
            <h3>High Errors</h3>
            <div class="value">${summary.highErrors}</div>
        </div>
        <div class="card">
            <h3>Quality Score</h3>
            <div class="value">${summary.qualityScore}/100</div>
        </div>
        <div class="card">
            <h3>Files Fixed</h3>
            <div class="value">${summary.filesFixed}</div>
        </div>
        <div class="card">
            <h3>Analysis Time</h3>
            <div class="value">${(summary.analysisDuration / 1000).toFixed(2)}s</div>
        </div>
    </div>

    <div class="error-list">
        <h3>Error Breakdown (${analysisResult.errors.length} total)</h3>
        ${analysisResult.errors.map(error => `
            <div class="error-item ${error.severity.toLowerCase()}">
                <div class="error-header">
                    <span class="error-file">${error.file}</span>
                    <span class="error-type">${error.type}</span>
                </div>
                <div class="error-message">${error.message}</div>
                <div class="error-details">
                    ${error.line ? `Line ${error.line} • ` : ''}
                    ${error.category || 'Unknown'} • 
                    ${error.severity}
                </div>
            </div>
        `).join('')}
    </div>

    ${analysisResult.recommendations && analysisResult.recommendations.length > 0 ? `
    <div class="recommendations">
        <h3>Recommendations</h3>
        ${analysisResult.recommendations.map(rec => `
            <div class="recommendation-item">
                <strong>${rec.type}:</strong> ${rec.message}
                ${rec.suggestion ? `<br><em>Suggested fix:</em> ${rec.suggestion}` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <footer style="margin-top: 40px; text-align: center; color: #6c757d; font-size: 12px;">
        <p>Generated by CodeGuardian Pro - AI-Powered Code Analysis</p>
    </footer>
</body>
</html>`;
}

// Helper function to generate CSV report
function generateCSVReport(analysisResult, type) {
  if (type === 'detailed') {
    const headers = ['File', 'Type', 'Severity', 'Category', 'Line', 'Message', 'Fix Available'];
    const rows = analysisResult.errors.map(error => [
      error.file,
      error.type,
      error.severity,
      error.category || 'N/A',
      error.line || 'N/A',
      `"${error.message.replace(/"/g, '""')}"`,
      analysisResult.fixes.some(fix => fix.errorId === error.id) ? 'Yes' : 'No'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  } else {
    // Summary CSV
    const summary = generateAnalysisSummary(analysisResult);
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Files', summary.totalFiles],
      ['Total Errors', summary.totalErrors],
      ['Critical Errors', summary.criticalErrors],
      ['High Errors', summary.highErrors],
      ['Files Fixed', summary.filesFixed],
      ['Quality Score', summary.qualityScore],
      ['Analysis Duration (ms)', summary.analysisDuration]
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Helper function to generate Markdown report
function generateMarkdownReport(project, analysisResult, type) {
  const summary = generateAnalysisSummary(analysisResult);
  
  return `# Code Analysis Report - ${project.name}

**Generated:** ${new Date().toLocaleString()}  
**Project Language:** ${project.language}  
**Total Files:** ${project.files.length}

## Summary

- **Total Errors:** ${summary.totalErrors}
- **Critical Errors:** ${summary.criticalErrors}
- **High Errors:** ${summary.highErrors}
- **Files Fixed:** ${summary.filesFixed}
- **Quality Score:** ${summary.qualityScore}/100
- **Analysis Time:** ${(summary.analysisDuration / 1000).toFixed(2)} seconds

## Error Breakdown

${analysisResult.errors.map(error => `
### ${error.file}${error.line ? `:${error.line}` : ''}

**Type:** ${error.type}  
**Severity:** ${error.severity}  
**Category:** ${error.category || 'N/A'}  

\`\`\`
${error.message}
\`\`\`

`).join('')}

## Recommendations

${analysisResult.recommendations ? analysisResult.recommendations.map(rec => `
- **${rec.type}:** ${rec.message}${rec.suggestion ? `\n  - *Suggestion:* ${rec.suggestion}` : ''}
`).join('') : 'No specific recommendations.'}

---
*Report generated by CodeGuardian Pro - AI-Powered Code Analysis*`;
}

// Helper function to generate comparison HTML
function generateComparisonHTML(project, comparisons) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Code Comparison - ${project.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .file-comparison { margin: 20px 0; border: 1px solid #ddd; }
        .file-header { background: #f5f5f5; padding: 10px; border-bottom: 1px solid #ddd; }
        .code-comparison { display: flex; }
        .original, .fixed { flex: 1; padding: 10px; }
        .original { background: #fff5f5; border-right: 1px solid #ddd; }
        .fixed { background: #f5fff5; }
        pre { margin: 0; white-space: pre-wrap; }
        .diff-added { background: #e6ffed; }
        .diff-removed { background: #ffeef0; }
    </style>
</head>
<body>
    <h1>Code Comparison - ${project.name}</h1>
    <p>Showing ${comparisons.length} files with fixes</p>
    
    ${comparisons.map(comp => `
    <div class="file-comparison">
        <div class="file-header">
            <strong>${comp.fileName}</strong> - ${comp.changes} changes
        </div>
        <div class="code-comparison">
            <div class="original">
                <h3>Original Code</h3>
                <pre>${escapeHtml(comp.originalContent)}</pre>
            </div>
            <div class="fixed">
                <h3>Fixed Code</h3>
                <pre>${escapeHtml(comp.fixedContent)}</pre>
            </div>
        </div>
    </div>
    `).join('')}
</body>
</html>`;
}

// Helper function to generate error CSV
function generateErrorCSV(errors, fixes) {
  const headers = ['File', 'Line', 'Type', 'Severity', 'Category', 'Message', 'Fix Available', 'Fix Description'];
  const rows = errors.map(error => {
    const fix = fixes.find(f => f.errorId === error.id);
    return [
      error.file,
      error.line || 'N/A',
      error.type,
      error.severity,
      error.category || 'N/A',
      `"${error.message.replace(/"/g, '""')}"`,
      fix ? 'Yes' : 'No',
      fix ? `"${fix.description.replace(/"/g, '""')}"` : 'N/A'
    ];
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Helper function to generate error HTML
function generateErrorHTML(errors, fixes) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Error Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .error { padding: 10px; margin: 5px 0; border-left: 4px solid; }
        .critical { border-color: #dc3545; background: #f8d7da; }
        .high { border-color: #fd7e14; background: #fff3cd; }
        .medium { border-color: #ffc107; background: #fff3cd; }
        .low { border-color: #28a745; background: #d1ecf1; }
    </style>
</head>
<body>
    <h1>Error Report</h1>
    <p>Total Errors: ${errors.length}</p>
    
    ${errors.map(error => {
      const fix = fixes.find(f => f.errorId === error.id);
      return `
      <div class="error ${error.severity.toLowerCase()}">
        <strong>${error.file}${error.line ? `:${error.line}` : ''}</strong><br>
        <strong>${error.type}</strong> (${error.severity}) - ${error.category || 'N/A'}<br>
        ${error.message}<br>
        ${fix ? `<em>Fix:</em> ${fix.description}` : ''}
      </div>
      `;
    }).join('')}
</body>
</html>`;
}

// Helper function to generate bundle README
function generateBundleReadme(project, analysisResult, options) {
  return `# ${project.name} - Complete Analysis Bundle

This bundle contains the complete analysis results for the project "${project.name}".

## Contents

${options.includeOriginal ? '- **original/**: Original project files\n' : ''}
${options.includeFixed ? '- **fixed/**: Fixed and optimized code files\n' : ''}
${options.includeReports ? '- **reports/**: Analysis reports in various formats\n' : ''}
${options.includeComparison ? '- **reports/code_comparison.html**: Side-by-side code comparison\n' : ''}

## Project Summary

- **Total Files:** ${project.files.length}
- **Language:** ${project.language}
- **Total Errors:** ${analysisResult.errors.length}
- **Files Fixed:** ${analysisResult.fixedCode ? analysisResult.fixedCode.length : 0}
- **Analysis Time:** ${analysisResult.analysisTime}ms

## Usage

1. Extract this ZIP file
2. Review the analysis reports in the 'reports/' directory
3. Use the fixed code in the 'fixed/' directory
4. Compare with original code in the 'original/' directory (if included)

## Generated by

CodeGuardian Pro - AI-Powered Code Analysis
Generated on: ${new Date().toLocaleString()}
`;
}

// Helper function to generate project README
function generateProjectReadme(project, analysisResult, includeOriginal) {
  return `# ${project.name} - Fixed Code

This project has been analyzed and fixed by CodeGuardian Pro.

## Project Information

- **Original Project:** ${project.name}
- **Language:** ${project.language}
- **Total Files:** ${project.files.length}
- **Files Fixed:** ${analysisResult.fixedCode.length}
- **Analysis Completed:** ${analysisResult.completedAt.toLocaleString()}

## What's Included

- Fixed and optimized code files
${includeOriginal ? '- Original code files (in original/ directory)\n' : ''}
- This README file

## Changes Made

The following types of issues were fixed:

${Array.from(new Set(analysisResult.fixes.map(fix => fix.type))).map(type => `- ${type}`).join('\n')}

## Notes

- All fixes have been generated using AI analysis
- Please review the changes before deploying to production
- Some fixes may require additional manual verification

---
Generated by CodeGuardian Pro - AI-Powered Code Analysis
`;
}

// Helper function to get content type for file download
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.js': 'application/javascript',
    '.jsx': 'application/javascript',
    '.ts': 'application/typescript',
    '.tsx': 'application/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.py': 'text/x-python',
    '.java': 'text/x-java',
    '.cpp': 'text/x-c++',
    '.c': 'text/x-c',
    '.php': 'text/x-php',
    '.rb': 'text/x-ruby',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to generate analysis summary
function generateAnalysisSummary(analysisResult) {
  const criticalErrors = analysisResult.errors.filter(e => e.severity === 'CRITICAL').length;
  const highErrors = analysisResult.errors.filter(e => e.severity === 'HIGH').length;
  
  return {
    totalFiles: analysisResult.metrics.totalFiles,
    totalErrors: analysisResult.errors.length,
    criticalErrors: criticalErrors,
    highErrors: highErrors,
    filesFixed: analysisResult.fixedCode ? analysisResult.fixedCode.length : 0,
    qualityScore: Math.max(0, 100 - (criticalErrors * 10) - (highErrors * 5)),
    analysisDuration: analysisResult.analysisTime
  };
}

// Helper function to group errors by severity
function groupBySeverity(errors) {
  return errors.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {});
}

// Helper function to group errors by category
function groupByCategory(errors) {
  return errors.reduce((acc, error) => {
    const category = error.category || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
}

module.exports = router;