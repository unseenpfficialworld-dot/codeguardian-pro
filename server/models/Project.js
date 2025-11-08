// server/models/Project.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// File Schema (embedded in Project)
const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'php', 'ruby', 'go', 'rust', 'html', 'css', 'scss', 'sass', 'less',
      'json', 'xml', 'yaml', 'markdown', 'text', 'sql', 'shell', 'powershell',
      'batch', 'unknown'
    ],
    default: 'unknown'
  },
  size: {
    type: Number, // in bytes
    required: true,
    min: 0
  },
  encoding: {
    type: String,
    default: 'utf-8'
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  checksum: {
    type: String
  },
  lineCount: {
    type: Number,
    default: 0
  },
  complexity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  }
});

// Error Schema (embedded in AnalysisResult)
const errorSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  file: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'SYNTAX', 'TYPE', 'LOGIC', 'SECURITY', 'PERFORMANCE', 'QUALITY',
      'MEMORY', 'DEPENDENCY', 'CONFIGURATION', 'BUILD', 'STYLE', 'OTHER'
    ]
  },
  severity: {
    type: String,
    required: true,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
    default: 'MEDIUM'
  },
  category: {
    type: String,
    required: true,
    enum: ['syntax', 'type', 'logic', 'security', 'performance', 'memory', 'dependency', 'style'],
    default: 'syntax'
  },
  message: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  line: {
    type: Number,
    min: 1
  },
  column: {
    type: Number,
    min: 0
  },
  suggestion: {
    type: String
  },
  codeSnippet: {
    type: String
  },
  ruleId: {
    type: String
  },
  cwe: {
    type: String // Common Weakness Enumeration
  },
  confidence: {
    type: Number, // 0-100
    min: 0,
    max: 100,
    default: 80
  },
  tags: [{
    type: String
  }]
});

// Fix Schema (embedded in AnalysisResult)
const fixSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  errorId: {
    type: String,
    required: true
  },
  file: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['CODE_CHANGE', 'CONFIG_UPDATE', 'DEPENDENCY_UPDATE', 'REFACTOR', 'OTHER']
  },
  description: {
    type: String,
    required: true
  },
  applied: {
    type: Boolean,
    default: false
  },
  line: {
    type: Number,
    min: 1
  },
  changes: {
    original: String,
    fixed: String
  },
  complexity: {
    type: String,
    enum: ['SIMPLE', 'MODERATE', 'COMPLEX'],
    default: 'SIMPLE'
  },
  risk: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  }
});

// Fixed Code Schema (embedded in AnalysisResult)
const fixedCodeSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  originalContent: {
    type: String,
    required: true
  },
  fixedContent: {
    type: String,
    required: true
  },
  changes: {
    type: Number,
    default: 0,
    min: 0
  },
  appliedFixes: [{
    type: String // fix IDs
  }],
  diff: {
    type: String // Unified diff format
  },
  complexityChange: {
    type: String,
    enum: ['DECREASED', 'SAME', 'INCREASED'],
    default: 'SAME'
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
});

// Analysis Result Schema
const analysisResultSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  analysisType: {
    type: String,
    enum: ['QUICK', 'STANDARD', 'COMPREHENSIVE', 'SECURITY', 'PERFORMANCE'],
    default: 'STANDARD'
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
      'INITIALIZING', 'SYNTAX_ANALYSIS', 'TYPE_CHECKING', 'SECURITY_SCAN',
      'PERFORMANCE_ANALYSIS', 'CODE_QUALITY', 'GENERATING_FIXES', 'FINALIZING'
    ],
    default: 'INITIALIZING'
  },
  currentFile: {
    type: String
  },
  
  // Analysis data
  errors: [errorSchema],
  fixes: [fixSchema],
  fixedCode: [fixedCodeSchema],
  
  // Metrics and statistics
  metrics: {
    totalFiles: {
      type: Number,
      default: 0
    },
    filesProcessed: {
      type: Number,
      default: 0
    },
    errorCount: {
      type: Number,
      default: 0
    },
    warningCount: {
      type: Number,
      default: 0
    },
    fixedFileCount: {
      type: Number,
      default: 0
    },
    fixesGenerated: {
      type: Number,
      default: 0
    },
    fixesApplied: {
      type: Number,
      default: 0
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date
    },
    analysisTime: {
      type: Number // in milliseconds
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    securityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    performanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    maintainabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Recommendations
  recommendations: [{
    type: {
      type: String,
      enum: ['ARCHITECTURE', 'SECURITY', 'PERFORMANCE', 'MAINTAINABILITY', 'BEST_PRACTICE'],
      required: true
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
    },
    message: {
      type: String,
      required: true
    },
    suggestion: {
      type: String
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
  
  // Analysis options
  options: {
    includeSecurityScan: {
      type: Boolean,
      default: true
    },
    includePerformanceAnalysis: {
      type: Boolean,
      default: true
    },
    includeCodeQuality: {
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
      enum: ['DEFAULT', 'STRICT', 'LENIENT', 'CUSTOM'],
      default: 'DEFAULT'
    }
  },
  
  // Error handling
  error: {
    message: String,
    stack: String,
    stage: String,
    file: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
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

// Project Schema
const projectSchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Project files
  files: [fileSchema],
  
  // Project metadata
  language: {
    type: String,
    required: true,
    enum: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'php', 'ruby', 'go', 'rust', 'html', 'css', 'scss', 'sass', 'less',
      'json', 'xml', 'yaml', 'markdown', 'text', 'sql', 'shell', 'powershell',
      'batch', 'mixed', 'unknown'
    ],
    default: 'unknown'
  },
  framework: {
    type: String,
    enum: [
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'express',
      'django', 'flask', 'spring', 'laravel', 'rails', 'aspnet', 'none'
    ],
    default: 'none'
  },
  
  // Project status
  status: {
    type: String,
    required: true,
    enum: ['UPLOADING', 'UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'ARCHIVED'],
    default: 'UPLOADED'
  },
  
  // Source information
  source: {
    type: String,
    enum: ['github', 'google_drive', 'direct_upload', 'zip_upload', 'url', 'gitlab', 'bitbucket'],
    required: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  sourceMetadata: {
    type: mongoose.Schema.Types.Mixed // Flexible object for source-specific data
  },
  
  // Analysis information
  analysisResults: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnalysisResult'
  }],
  currentAnalysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnalysisResult'
  },
  analysisStartedAt: {
    type: Date
  },
  analysisCompletedAt: {
    type: Date
  },
  
  // Project statistics
  statistics: {
    totalFiles: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number, // in bytes
      default: 0
    },
    largestFile: {
      name: String,
      size: Number
    },
    averageFileSize: {
      type: Number,
      default: 0
    },
    languageDistribution: {
      type: Map,
      of: Number
    },
    fileTypeDistribution: {
      type: Map,
      of: Number
    },
    totalLines: {
      type: Number,
      default: 0
    },
    complexity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW'
    }
  },
  
  // Project settings
  settings: {
    public: {
      type: Boolean,
      default: false
    },
    allowForking: {
      type: Boolean,
      default: false
    },
    autoAnalyze: {
      type: Boolean,
      default: true
    },
    analysisDepth: {
      type: String,
      enum: ['QUICK', 'STANDARD', 'DEEP'],
      default: 'STANDARD'
    },
    notificationSettings: {
      onCompletion: {
        type: Boolean,
        default: true
      },
      onError: {
        type: Boolean,
        default: true
      },
      weeklyReport: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Version control (for tracking changes)
  version: {
    type: Number,
    default: 1
  },
  parentProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  forks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: ['WEB', 'MOBILE', 'DESKTOP', 'API', 'LIBRARY', 'SCRIPT', 'CONFIG', 'OTHER'],
    default: 'OTHER'
  },
  
  // Access control
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['VIEWER', 'EDITOR', 'ANALYZER'],
      default: 'VIEWER'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Audit and metadata
  metadata: {
    originalName: String,
    uploadMethod: String,
    clientInfo: {
      userAgent: String,
      ipAddress: String
    },
    processingTime: Number,
    checksum: String
  },
  
  // Soft delete
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
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

// Indexes for better query performance
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ status: 1 });
projectSchema.index({ language: 1 });
projectSchema.index({ 'tags': 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ 'statistics.totalSize': -1 });
projectSchema.index({ name: 'text', description: 'text' });

analysisResultSchema.index({ projectId: 1, createdAt: -1 });
analysisResultSchema.index({ status: 1 });
analysisResultSchema.index({ createdAt: -1 });

// Virtual for project URL
projectSchema.virtual('url').get(function() {
  return `/projects/${this._id}`;
});

// Virtual for analysis duration
analysisResultSchema.virtual('duration').get(function() {
  if (this.metrics.startTime && this.metrics.endTime) {
    return this.metrics.endTime - this.metrics.startTime;
  }
  return null;
});

// Pre-save middleware for Project
projectSchema.pre('save', function(next) {
  // Update statistics before save
  if (this.isModified('files')) {
    this.statistics.totalFiles = this.files.length;
    this.statistics.totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
    this.statistics.averageFileSize = this.files.length > 0 ? 
      this.statistics.totalSize / this.files.length : 0;
    
    // Find largest file
    if (this.files.length > 0) {
      const largestFile = this.files.reduce((largest, file) => 
        file.size > largest.size ? file : largest
      );
      this.statistics.largestFile = {
        name: largestFile.name,
        size: largestFile.size
      };
    }
    
    // Calculate language distribution
    const languageDist = {};
    const fileTypeDist = {};
    
    this.files.forEach(file => {
      languageDist[file.language] = (languageDist[file.language] || 0) + 1;
      const fileType = this.getFileType(file.name);
      fileTypeDist[fileType] = (fileTypeDist[fileType] || 0) + 1;
    });
    
    this.statistics.languageDistribution = languageDist;
    this.statistics.fileTypeDistribution = fileTypeDist;
    
    // Calculate total lines
    this.statistics.totalLines = this.files.reduce((sum, file) => 
      sum + (file.lineCount || file.content.split('\n').length), 0
    );
  }
  
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware for AnalysisResult
analysisResultSchema.pre('save', function(next) {
  // Update metrics before save
  if (this.isModified('errors')) {
    this.metrics.errorCount = this.errors.length;
    this.metrics.warningCount = this.errors.filter(e => e.severity === 'LOW' || e.severity === 'INFO').length;
  }
  
  if (this.isModified('fixes')) {
    this.metrics.fixesGenerated = this.fixes.length;
    this.metrics.fixesApplied = this.fixes.filter(f => f.applied).length;
  }
  
  if (this.isModified('fixedCode')) {
    this.metrics.fixedFileCount = this.fixedCode.length;
  }
  
  // Calculate analysis time when completed
  if (this.status === 'COMPLETED' && this.metrics.startTime && !this.metrics.endTime) {
    this.metrics.endTime = new Date();
    this.metrics.analysisTime = this.metrics.endTime - this.metrics.startTime;
    this.completedAt = new Date();
  }
  
  this.updatedAt = Date.now();
  next();
});

// Instance methods for Project
projectSchema.methods.getFileTree = function() {
  const tree = {};
  
  this.files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = file;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  });
  
  return tree;
};

projectSchema.methods.findFile = function(filePath) {
  return this.files.find(file => file.path === filePath);
};

projectSchema.methods.addFile = function(fileData) {
  const file = {
    ...fileData,
    lineCount: fileData.content.split('\n').length,
    size: Buffer.from(fileData.content).length
  };
  this.files.push(file);
  return file;
};

projectSchema.methods.removeFile = function(filePath) {
  const index = this.files.findIndex(file => file.path === filePath);
  if (index !== -1) {
    return this.files.splice(index, 1)[0];
  }
  return null;
};

projectSchema.methods.getLanguageStats = function() {
  const stats = {};
  this.files.forEach(file => {
    stats[file.language] = (stats[file.language] || 0) + 1;
  });
  return stats;
};

// Instance methods for AnalysisResult
analysisResultSchema.methods.getErrorSummary = function() {
  const summary = {
    bySeverity: {},
    byCategory: {},
    byType: {}
  };
  
  this.errors.forEach(error => {
    summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
    summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
    summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
  });
  
  return summary;
};

analysisResultSchema.methods.getFilesWithErrors = function() {
  const files = new Set();
  this.errors.forEach(error => files.add(error.file));
  return Array.from(files);
};

analysisResultSchema.methods.getFixesForError = function(errorId) {
  return this.fixes.filter(fix => fix.errorId === errorId);
};

analysisResultSchema.methods.getFixedFile = function(filePath) {
  return this.fixedCode.find(fixed => fixed.filePath === filePath);
};

// Static methods for Project
projectSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, deleted: false };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.language) {
    query.language = options.language;
  }
  
  if (options.tags) {
    query.tags = { $in: options.tags };
  }
  
  return this.find(query)
    .sort({ [options.sortBy || 'createdAt']: options.sortOrder || -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .populate('currentAnalysis');
};

projectSchema.statics.getUserProjectStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), deleted: false } },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        completedProjects: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
        totalFiles: { $sum: '$statistics.totalFiles' },
        totalSize: { $sum: '$statistics.totalSize' },
        averageFilesPerProject: { $avg: '$statistics.totalFiles' }
      }
    }
  ]);
};

// Static methods for AnalysisResult
analysisResultSchema.statics.getProjectAnalysisHistory = function(projectId) {
  return this.find({ projectId })
    .sort({ createdAt: -1 })
    .select('status analysisType metrics.errorCount metrics.fixedFileCount createdAt completedAt');
};

// Helper method to get file type
projectSchema.methods.getFileType = function(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'];
  const configExtensions = ['json', 'yaml', 'yml', 'xml', 'config', 'ini', 'env'];
  const docExtensions = ['md', 'txt', 'rst'];
  
  if (codeExtensions.includes(ext)) return 'code';
  if (configExtensions.includes(ext)) return 'config';
  if (docExtensions.includes(ext)) return 'documentation';
  return 'other';
};

// Create models
const Project = mongoose.model('Project', projectSchema);
const AnalysisResult = mongoose.model('AnalysisResult', analysisResultSchema);

module.exports = {
  Project,
  AnalysisResult
};