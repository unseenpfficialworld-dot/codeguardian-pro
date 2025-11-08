// server/models/Analysis.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Error Pattern Schema (for learning from common errors)
const errorPatternSchema = new mongoose.Schema({
  patternId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  errorType: {
    type: String,
    required: true,
    enum: [
      'SYNTAX_ERROR', 'TYPE_ERROR', 'LOGIC_ERROR', 'SECURITY_VULNERABILITY',
      'PERFORMANCE_ISSUE', 'MEMORY_LEAK', 'DEPENDENCY_CONFLICT', 'CODE_SMELL'
    ]
  },
  language: {
    type: String,
    required: true
  },
  pattern: {
    type: String,
    required: true // Regex or pattern description
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    required: true
  },
  fixTemplate: {
    type: String,
    required: true
  },
  examples: [{
    before: String,
    after: String,
    description: String
  }],
  frequency: {
    type: Number,
    default: 0
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Code Quality Metric Schema
const codeQualityMetricSchema = new mongoose.Schema({
  metricId: {
    type: String,
    default: uuidv4
  },
  name: {
    type: String,
    required: true,
    enum: [
      'MAINTAINABILITY_INDEX', 'CYCLOMATIC_COMPLEXITY', 'CODE_DUPLICATION',
      'COMMENT_DENSITY', 'FUNCTION_SIZE', 'DEPTH_OF_INHERITANCE',
      'COUPLING', 'COHESION', 'TEST_COVERAGE'
    ]
  },
  value: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PASS', 'WARNING', 'FAIL'],
    required: true
  },
  weight: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.1
  }
});

// Security Vulnerability Schema
const securityVulnerabilitySchema = new mongoose.Schema({
  vulnerabilityId: {
    type: String,
    default: uuidv4
  },
  cweId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    required: true
  },
  cvssScore: {
    type: Number,
    min: 0,
    max: 10
  },
  file: {
    type: String,
    required: true
  },
  line: {
    type: Number,
    required: true
  },
  codeSnippet: {
    type: String
  },
  recommendation: {
    type: String,
    required: true
  },
  references: [{
    title: String,
    url: String
  }],
  detectedAt: {
    type: Date,
    default: Date.now
  }
});

// Performance Issue Schema
const performanceIssueSchema = new mongoose.Schema({
  issueId: {
    type: String,
    default: uuidv4
  },
  type: {
    type: String,
    enum: [
      'TIME_COMPLEXITY', 'SPACE_COMPLEXITY', 'MEMORY_LEAK',
      'INEFFICIENT_ALGORITHM', 'BLOCKING_OPERATION', 'EXCESSIVE_IO'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  impact: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    required: true
  },
  file: {
    type: String,
    required: true
  },
  line: {
    type: Number,
    required: true
  },
  codeSnippet: {
    type: String
  },
  suggestedOptimization: {
    type: String,
    required: true
  },
  estimatedImprovement: {
    type: String // e.g., "50% faster", "Reduced memory by 2x"
  },
  complexity: {
    current: String,
    suggested: String
  }
});

// Code Fix Schema
const codeFixSchema = new mongoose.Schema({
  fixId: {
    type: String,
    default: uuidv4
  },
  errorId: {
    type: String,
    required: true
  },
  file: {
    type: String,
    required: true
  },
  originalCode: {
    type: String,
    required: true
  },
  fixedCode: {
    type: String,
    required: true
  },
  diff: {
    type: String // Unified diff format
  },
  changeType: {
    type: String,
    enum: ['ADDITION', 'DELETION', 'MODIFICATION', 'REPLACEMENT'],
    required: true
  },
  complexity: {
    type: String,
    enum: ['SIMPLE', 'MODERATE', 'COMPLEX'],
    default: 'SIMPLE'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  applied: {
    type: Boolean,
    default: false
  },
  appliedAt: {
    type: Date
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING'
  }
});

// Analysis Session Schema
const analysisSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Session Configuration
  analysisType: {
    type: String,
    enum: ['QUICK', 'STANDARD', 'COMPREHENSIVE', 'SECURITY', 'PERFORMANCE', 'CUSTOM'],
    default: 'STANDARD'
  },
  configuration: {
    includeSecurity: {
      type: Boolean,
      default: true
    },
    includePerformance: {
      type: Boolean,
      default: true
    },
    includeQuality: {
      type: Boolean,
      default: true
    },
    generateFixes: {
      type: Boolean,
      default: true
    },
    fixLevel: {
      type: String,
      enum: ['AUTOMATIC', 'SUGGESTIONS', 'NONE'],
      default: 'SUGGESTIONS'
    },
    ruleset: {
      type: String,
      enum: ['DEFAULT', 'STRICT', 'LENIENT', 'ENTERPRISE'],
      default: 'DEFAULT'
    },
    timeout: {
      type: Number, // in milliseconds
      default: 300000 // 5 minutes
    }
  },
  
  // Session Status
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'],
    default: 'PENDING'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  currentStage: {
    type: String,
    enum: [
      'INITIALIZING', 'PARSING', 'SYNTAX_ANALYSIS', 'TYPE_CHECKING',
      'SECURITY_SCAN', 'PERFORMANCE_ANALYSIS', 'QUALITY_ANALYSIS',
      'FIX_GENERATION', 'REPORT_GENERATION', 'FINALIZING'
    ],
    default: 'INITIALIZING'
  },
  
  // Analysis Results
  filesAnalyzed: {
    type: Number,
    default: 0
  },
  totalFiles: {
    type: Number,
    default: 0
  },
  
  // Error Statistics
  errorStatistics: {
    totalErrors: {
      type: Number,
      default: 0
    },
    bySeverity: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 }
    },
    byCategory: {
      syntax: { type: Number, default: 0 },
      type: { type: Number, default: 0 },
      logic: { type: Number, default: 0 },
      security: { type: Number, default: 0 },
      performance: { type: Number, default: 0 },
      quality: { type: Number, default: 0 }
    }
  },
  
  // Quality Metrics
  qualityMetrics: [codeQualityMetricSchema],
  overallQualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Detailed Findings
  securityVulnerabilities: [securityVulnerabilitySchema],
  performanceIssues: [performanceIssueSchema],
  codeFixes: [codeFixSchema],
  
  // Analysis Metadata
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in milliseconds
  },
  
  // Resource Usage
  resourceUsage: {
    memoryPeak: Number, // in MB
    cpuTime: Number, // in milliseconds
    apiCalls: {
      type: Number,
      default: 0
    }
  },
  
  // Error Handling
  error: {
    message: String,
    stack: String,
    stage: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Recommendations
  recommendations: [{
    category: {
      type: String,
      enum: ['ARCHITECTURE', 'SECURITY', 'PERFORMANCE', 'MAINTAINABILITY', 'BEST_PRACTICES'],
      required: true
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    suggestion: {
      type: String,
      required: true
    },
    impact: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
    },
    effort: {
      type: String,
      enum: ['QUICK', 'MODERATE', 'EXTENSIVE'],
      default: 'MODERATE'
    }
  }],
  
  // Export and Reporting
  reports: {
    htmlReport: String,
    jsonReport: String,
    pdfReport: String,
    csvReport: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Analysis History Schema (for tracking analysis patterns)
const analysisHistorySchema = new mongoose.Schema({
  historyId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Historical Data
  sessions: [{
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisSession'
    },
    timestamp: Date,
    analysisType: String,
    errorCount: Number,
    qualityScore: Number,
    duration: Number
  }],
  
  // Trend Analysis
  trends: {
    errorTrend: {
      type: Map,
      of: Number // Date string to error count
    },
    qualityTrend: {
      type: Map,
      of: Number // Date string to quality score
    },
    performanceTrend: {
      type: Map,
      of: Number // Date string to performance score
    }
  },
  
  // Common Patterns
  frequentErrors: [{
    errorType: String,
    count: Number,
    firstSeen: Date,
    lastSeen: Date
  }],
  
  // Improvement Tracking
  improvements: [{
    description: String,
    beforeScore: Number,
    afterScore: Number,
    improvement: Number,
    timestamp: Date
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// AI Model Performance Schema
const aiModelPerformanceSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: true,
    index: true
  },
  modelName: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  },
  
  // Performance Metrics
  accuracy: {
    type: Number,
    min: 0,
    max: 1
  },
  precision: {
    type: Number,
    min: 0,
    max: 1
  },
  recall: {
    type: Number,
    min: 0,
    max: 1
  },
  f1Score: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Usage Statistics
  totalAnalyses: {
    type: Number,
    default: 0
  },
  successfulAnalyses: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number // in milliseconds
  },
  
  // Error Analysis
  commonFailures: [{
    errorType: String,
    count: Number,
    resolution: String
  }],
  
  // Model Configuration
  configuration: {
    temperature: Number,
    maxTokens: Number,
    topP: Number,
    frequencyPenalty: Number,
    presencePenalty: Number
  },
  
  // Timestamps
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
analysisSessionSchema.index({ projectId: 1, createdAt: -1 });
analysisSessionSchema.index({ userId: 1, status: 1 });
analysisSessionSchema.index({ status: 1, createdAt: -1 });
analysisSessionSchema.index({ 'errorStatistics.totalErrors': -1 });
analysisSessionSchema.index({ overallQualityScore: -1 });

analysisHistorySchema.index({ projectId: 1, userId: 1 });
analysisHistorySchema.index({ createdAt: -1 });

aiModelPerformanceSchema.index({ modelName: 1, version: 1 });
aiModelPerformanceSchema.index({ accuracy: -1 });

errorPatternSchema.index({ errorType: 1, language: 1 });
errorPatternSchema.index({ frequency: -1 });

// Virtual for analysis duration
analysisSessionSchema.virtual('analysisDuration').get(function() {
  if (this.startTime && this.endTime) {
    return this.endTime - this.startTime;
  }
  return null;
});

// Virtual for success rate
aiModelPerformanceSchema.virtual('successRate').get(function() {
  if (this.totalAnalyses > 0) {
    return this.successfulAnalyses / this.totalAnalyses;
  }
  return 0;
});

// Pre-save middleware for AnalysisSession
analysisSessionSchema.pre('save', function(next) {
  // Update duration when completed
  if (this.status === 'COMPLETED' && this.startTime && !this.endTime) {
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
  }
  
  // Update error statistics
  if (this.isModified('securityVulnerabilities') || this.isModified('performanceIssues')) {
    this.updateErrorStatistics();
  }
  
  // Update quality score
  if (this.isModified('qualityMetrics')) {
    this.calculateOverallQualityScore();
  }
  
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware for AnalysisHistory
analysisHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods for AnalysisSession
analysisSessionSchema.methods.updateErrorStatistics = function() {
  const stats = {
    totalErrors: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    byCategory: { syntax: 0, type: 0, logic: 0, security: 0, performance: 0, quality: 0 }
  };
  
  // Count security vulnerabilities
  this.securityVulnerabilities.forEach(vuln => {
    stats.totalErrors++;
    stats.bySeverity[vuln.severity.toLowerCase()]++;
    stats.byCategory.security++;
  });
  
  // Count performance issues
  this.performanceIssues.forEach(issue => {
    stats.totalErrors++;
    stats.bySeverity[issue.impact.toLowerCase()]++;
    stats.byCategory.performance++;
  });
  
  this.errorStatistics = stats;
};

analysisSessionSchema.methods.calculateOverallQualityScore = function() {
  if (this.qualityMetrics.length === 0) {
    this.overallQualityScore = 0;
    return;
  }
  
  let totalScore = 0;
  let totalWeight = 0;
  
  this.qualityMetrics.forEach(metric => {
    const normalizedScore = metric.value / metric.threshold;
    const score = Math.min(normalizedScore, 1) * 100;
    totalScore += score * metric.weight;
    totalWeight += metric.weight;
  });
  
  this.overallQualityScore = totalWeight > 0 ? totalScore / totalWeight : 0;
};

analysisSessionSchema.methods.getSecuritySummary = function() {
  const summary = {
    total: this.securityVulnerabilities.length,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    byCWE: {}
  };
  
  this.securityVulnerabilities.forEach(vuln => {
    summary.bySeverity[vuln.severity.toLowerCase()]++;
    summary.byCWE[vuln.cweId] = (summary.byCWE[vuln.cweId] || 0) + 1;
  });
  
  return summary;
};

analysisSessionSchema.methods.getPerformanceSummary = function() {
  const summary = {
    total: this.performanceIssues.length,
    byType: {},
    byImpact: {
      high: 0,
      medium: 0,
      low: 0
    }
  };
  
  this.performanceIssues.forEach(issue => {
    summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
    summary.byImpact[issue.impact.toLowerCase()]++;
  });
  
  return summary;
};

analysisSessionSchema.methods.generateReport = function(format = 'json') {
  const report = {
    sessionId: this.sessionId,
    projectId: this.projectId,
    analysisType: this.analysisType,
    status: this.status,
    timestamp: this.createdAt,
    duration: this.duration,
    summary: {
      filesAnalyzed: this.filesAnalyzed,
      totalErrors: this.errorStatistics.totalErrors,
      qualityScore: this.overallQualityScore,
      securityVulnerabilities: this.securityVulnerabilities.length,
      performanceIssues: this.performanceIssues.length
    },
    details: {
      errorStatistics: this.errorStatistics,
      securitySummary: this.getSecuritySummary(),
      performanceSummary: this.getPerformanceSummary(),
      recommendations: this.recommendations
    }
  };
  
  if (format === 'html') {
    return this.generateHTMLReport(report);
  } else if (format === 'csv') {
    return this.generateCSVReport(report);
  }
  
  return report;
};

analysisSessionSchema.methods.generateHTMLReport = function(report) {
  // Basic HTML report generation
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Analysis Report - ${report.sessionId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Code Analysis Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">Files Analyzed: ${report.summary.filesAnalyzed}</div>
        <div class="metric">Total Errors: ${report.summary.totalErrors}</div>
        <div class="metric">Quality Score: ${report.summary.qualityScore}</div>
    </div>
</body>
</html>
  `;
};

analysisSessionSchema.methods.generateCSVReport = function(report) {
  let csv = 'Category,Count\n';
  csv += `Files Analyzed,${report.summary.filesAnalyzed}\n`;
  csv += `Total Errors,${report.summary.totalErrors}\n`;
  csv += `Quality Score,${report.summary.qualityScore}\n`;
  csv += `Security Vulnerabilities,${report.summary.securityVulnerabilities}\n`;
  csv += `Performance Issues,${report.summary.performanceIssues}\n`;
  return csv;
};

// Instance methods for AnalysisHistory
analysisHistorySchema.methods.addSession = function(session) {
  this.sessions.push({
    sessionId: session._id,
    timestamp: session.createdAt,
    analysisType: session.analysisType,
    errorCount: session.errorStatistics.totalErrors,
    qualityScore: session.overallQualityScore,
    duration: session.duration
  });
  
  // Update trends
  this.updateTrends();
};

analysisHistorySchema.methods.updateTrends = function() {
  const errorTrend = {};
  const qualityTrend = {};
  const performanceTrend = {};
  
  this.sessions.forEach(session => {
    const date = session.timestamp.toISOString().split('T')[0];
    errorTrend[date] = session.errorCount;
    qualityTrend[date] = session.qualityScore;
    // Performance trend would need additional data
  });
  
  this.trends = {
    errorTrend,
    qualityTrend,
    performanceTrend
  };
};

analysisHistorySchema.methods.getImprovementRate = function() {
  if (this.sessions.length < 2) return 0;
  
  const firstSession = this.sessions[0];
  const lastSession = this.sessions[this.sessions.length - 1];
  
  const errorImprovement = ((firstSession.errorCount - lastSession.errorCount) / firstSession.errorCount) * 100;
  const qualityImprovement = ((lastSession.qualityScore - firstSession.qualityScore) / firstSession.qualityScore) * 100;
  
  return {
    errorImprovement: Math.max(0, errorImprovement),
    qualityImprovement: Math.max(0, qualityImprovement),
    overallImprovement: (errorImprovement + qualityImprovement) / 2
  };
};

// Static methods for AnalysisSession
analysisSessionSchema.statics.getUserSessions = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.analysisType) {
    query.analysisType = options.analysisType;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

analysisSessionSchema.statics.getProjectSessions = function(projectId) {
  return this.find({ projectId })
    .sort({ createdAt: -1 })
    .select('sessionId analysisType status progress errorStatistics overallQualityScore createdAt duration');
};

// Static methods for AnalysisHistory
analysisHistorySchema.statics.getProjectHistory = function(projectId) {
  return this.findOne({ projectId })
    .populate('sessions.sessionId');
};

// Static methods for AI Model Performance
aiModelPerformanceSchema.statics.getBestPerformingModel = function() {
  return this.findOne()
    .sort({ accuracy: -1, successRate: -1 })
    .limit(1);
};

// Create models
const AnalysisSession = mongoose.model('AnalysisSession', analysisSessionSchema);
const AnalysisHistory = mongoose.model('AnalysisHistory', analysisHistorySchema);
const AIModelPerformance = mongoose.model('AIModelPerformance', aiModelPerformanceSchema);
const ErrorPattern = mongoose.model('ErrorPattern', errorPatternSchema);

module.exports = {
  AnalysisSession,
  AnalysisHistory,
  AIModelPerformance,
  ErrorPattern
};