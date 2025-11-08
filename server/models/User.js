// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// User Schema
const userSchema = new mongoose.Schema({
  // Authentication fields
  githubId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true
  },
  password: {
    type: String,
    minlength: 6,
    // Only required for non-OAuth users
    required: function() {
      return !this.githubId && !this.googleId;
    }
  },

  // Profile information
  profile: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    avatar: {
      type: String,
      default: '/images/default-avatar.png'
    },
    bio: {
      type: String,
      maxlength: 500
    },
    company: {
      type: String,
      maxlength: 100
    },
    location: {
      type: String,
      maxlength: 100
    },
    website: {
      type: String,
      trim: true
    },
    githubUrl: {
      type: String,
      trim: true
    },
    linkedinUrl: {
      type: String,
      trim: true
    },
    twitterHandle: {
      type: String,
      trim: true,
      maxlength: 15
    }
  },

  // User preferences and settings
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light', 'auto'],
      default: 'dark'
    },
    language: {
      type: String,
      enum: ['en', 'es', 'fr', 'de', 'hi', 'ja', 'ko', 'zh'],
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      projectUpdates: {
        type: Boolean,
        default: true
      },
      newsletter: {
        type: Boolean,
        default: false
      }
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    codeTheme: {
      type: String,
      default: 'github-dark'
    },
    fontSize: {
      type: Number,
      min: 12,
      max: 24,
      default: 14
    },
    tabSize: {
      type: Number,
      min: 2,
      max: 8,
      default: 2
    },
    lineWrapping: {
      type: Boolean,
      default: true
    }
  },

  // Subscription and billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'team', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid'],
      default: 'active'
    },
    currentPeriodStart: {
      type: Date
    },
    currentPeriodEnd: {
      type: Date
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    features: {
      type: [String],
      default: ['basic_analysis', 'file_upload', 'project_management']
    },
    stripeCustomerId: {
      type: String,
      sparse: true
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true
    }
  },

  // Usage statistics and limits
  usage: {
    projectsCreated: {
      type: Number,
      default: 0
    },
    filesAnalyzed: {
      type: Number,
      default: 0
    },
    totalAnalysisTime: {
      type: Number, // in milliseconds
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number, // in bytes
      default: 0
    }
  },

  // Account limits based on subscription
  limits: {
    maxProjects: {
      type: Number,
      default: 10
    },
    maxFilesPerProject: {
      type: Number,
      default: 100
    },
    maxFileSize: {
      type: Number, // in bytes
      default: 50 * 1024 * 1024 // 50MB
    },
    maxTotalStorage: {
      type: Number, // in bytes
      default: 100 * 1024 * 1024 // 100MB
    },
    maxAnalysisTime: {
      type: Number, // in milliseconds
      default: 5 * 60 * 1000 // 5 minutes
    },
    concurrentAnalyses: {
      type: Number,
      default: 1
    }
  },

  // Security and verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  backupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    }
  }],

  // Account status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },
  deactivatedAt: {
    type: Date
  },
  suspensionReason: {
    type: String
  },

  // Audit fields
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },

  // Guest account flag
  isGuest: {
    type: Boolean,
    default: false
  },
  guestExpiresAt: {
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
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.twoFactorSecret;
      delete ret.backupCodes;
      return ret;
    }
  }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ githubId: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastLogin: -1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for checking subscription status
userSchema.virtual('hasActiveSubscription').get(function() {
  return this.subscription.status === 'active' && 
         (!this.subscription.currentPeriodEnd || 
          this.subscription.currentPeriodEnd > new Date());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if user has feature access
userSchema.methods.hasFeature = function(feature) {
  return this.subscription.features.includes(feature);
};

// Instance method to check usage limits
userSchema.methods.checkUsageLimit = function(limitType, currentUsage = 0) {
  const limits = {
    projects: this.limits.maxProjects,
    fileSize: this.limits.maxFileSize,
    storage: this.limits.maxTotalStorage,
    analysisTime: this.limits.maxAnalysisTime
  };

  return currentUsage < limits[limitType];
};

// Instance method to increment usage
userSchema.methods.incrementUsage = function(field, amount = 1) {
  if (this.usage[field] !== undefined) {
    this.usage[field] += amount;
  }
};

// Instance method to generate verification token
userSchema.methods.generateVerificationToken = function() {
  this.verificationToken = uuidv4();
  return this.verificationToken;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  this.resetPasswordToken = uuidv4();
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return this.resetPasswordToken;
};

// Instance method to record login
userSchema.methods.recordLogin = function(success = true) {
  if (success) {
    this.lastLogin = new Date();
    this.loginCount += 1;
    this.failedLoginAttempts = 0;
    this.lockUntil = undefined;
  } else {
    this.failedLoginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    }
  }
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    profile: this.profile,
    preferences: this.preferences,
    subscription: this.subscription,
    usage: this.usage,
    limits: this.limits,
    status: this.status,
    isGuest: this.isGuest,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
};

// Static method to find by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Static method to find by GitHub ID
userSchema.statics.findByGitHubId = function(githubId) {
  return this.findOne({ githubId });
};

// Static method to find by Google ID
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        guestUsers: {
          $sum: { $cond: ['$isGuest', 1, 0] }
        },
        proUsers: {
          $sum: { $cond: [{ $eq: ['$subscription.plan', 'pro'] }, 1, 0] }
        },
        teamUsers: {
          $sum: { $cond: [{ $eq: ['$subscription.plan', 'team'] }, 1, 0] }
        },
        averageProjects: { $avg: '$usage.projectsCreated' },
        totalStorageUsed: { $sum: '$usage.storageUsed' },
        totalAnalysisTime: { $sum: '$usage.totalAnalysisTime' }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    guestUsers: 0,
    proUsers: 0,
    teamUsers: 0,
    averageProjects: 0,
    totalStorageUsed: 0,
    totalAnalysisTime: 0
  };
};

// Session Schema for managing user sessions
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['github', 'google', 'local', 'guest'],
    required: true
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  },
  location: {
    country: String,
    city: String,
    region: String
  },
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet']
    },
    browser: String,
    os: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for session cleanup
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Session instance method to check if expired
sessionSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// Session instance method to refresh
sessionSchema.methods.refresh = function(duration = 30 * 24 * 60 * 60 * 1000) { // 30 days
  this.expiresAt = new Date(Date.now() + duration);
  this.lastActivity = new Date();
};

// Session static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Session static method to get active sessions for user
sessionSchema.statics.getUserSessions = function(userId) {
  return this.find({ 
    userId, 
    expiresAt: { $gt: new Date() },
    isActive: true
  }).sort({ lastActivity: -1 });
};

// Create models
const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);

// Export models
module.exports = {
  User,
  Session
};