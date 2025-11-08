// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, Session } = require('../models/User');

class AuthMiddleware {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'codeguardian-pro-secret-key-2024';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '90d';
    
    // Rate limiting for authentication attempts
    this.failedAttempts = new Map();
    this.MAX_ATTEMPTS = 5;
    this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Generate JWT token for user
   */
  generateToken(payload, options = {}) {
    const tokenOptions = {
      expiresIn: options.expiresIn || this.JWT_EXPIRES_IN,
      issuer: 'codeguardian-pro',
      audience: 'codeguardian-pro-users'
    };

    return jwt.sign(payload, this.JWT_SECRET, tokenOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'codeguardian-pro',
        audience: 'codeguardian-pro-users'
      });
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId, sessionId) {
    return jwt.sign(
      { 
        userId: userId.toString(),
        sessionId: sessionId.toString(),
        type: 'refresh'
      },
      this.JWT_SECRET,
      { 
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'codeguardian-pro',
        audience: 'codeguardian-pro-users'
      }
    );
  }

  /**
   * Main authentication middleware
   */
  authenticate = async (req, res, next) => {
    try {
      // Get token from header, cookie, or query parameter
      const token = this.extractToken(req);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access token required',
          code: 'MISSING_TOKEN'
        });
      }

      // Verify token
      const decoded = this.verifyToken(token);
      
      // Check if user exists and is active
      const user = await User.findById(decoded.userId)
        .select('-password -verificationToken -resetPasswordToken -twoFactorSecret -backupCodes');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Account is not active',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          error: 'Account temporarily locked due to too many failed attempts',
          code: 'ACCOUNT_LOCKED',
          lockUntil: user.lockUntil
        });
      }

      // Verify session if session ID is present
      if (decoded.sessionId) {
        const session = await Session.findById(decoded.sessionId);
        if (!session || !session.isActive || session.isExpired()) {
          return res.status(401).json({
            success: false,
            error: 'Session expired or invalid',
            code: 'SESSION_EXPIRED'
          });
        }

        // Update session last activity
        session.lastActivity = new Date();
        await session.save();

        req.session = session;
      }

      // Attach user to request
      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      if (error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      if (error.message.includes('invalid')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no token
   */
  optionalAuth = async (req, res, next) => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return next();
      }

      const decoded = this.verifyToken(token);
      const user = await User.findById(decoded.userId)
        .select('-password -verificationToken -resetPasswordToken -twoFactorSecret -backupCodes');

      if (user && user.status === 'active') {
        req.user = user;
        req.token = token;

        // Update session if exists
        if (decoded.sessionId) {
          const session = await Session.findById(decoded.sessionId);
          if (session && session.isActive && !session.isExpired()) {
            session.lastActivity = new Date();
            await session.save();
            req.session = session;
          }
        }
      }

      next();
    } catch (error) {
      // Continue without authentication for optional auth
      next();
    }
  }

  /**
   * Guest authentication
   */
  guestAuth = async (req, res, next) => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        // Create guest user if no token
        return this.createGuestUser(req, res, next);
      }

      const decoded = this.verifyToken(token);
      
      // Check if it's a guest token
      if (!decoded.isGuest) {
        return res.status(401).json({
          success: false,
          error: 'Invalid guest token',
          code: 'INVALID_GUEST_TOKEN'
        });
      }

      const user = await User.findOne({ 
        githubId: decoded.guestId,
        isGuest: true 
      });

      if (!user || user.status !== 'active') {
        return this.createGuestUser(req, res, next);
      }

      // Check if guest session expired
      if (user.guestExpiresAt && user.guestExpiresAt < new Date()) {
        await User.findByIdAndDelete(user._id);
        return this.createGuestUser(req, res, next);
      }

      req.user = user;
      req.token = token;
      req.isGuest = true;

      next();
    } catch (error) {
      // Create new guest user on any error
      this.createGuestUser(req, res, next);
    }
  }

  /**
   * Admin role requirement middleware
   */
  requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user has admin role (you can extend this based on your role system)
    if (!req.user.isAdmin && req.user.subscription.plan !== 'enterprise') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  }

  /**
   * Subscription requirement middleware
   */
  requireSubscription = (plan = 'pro') => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (req.user.isGuest) {
        return res.status(403).json({
          success: false,
          error: 'Guest users cannot access this feature',
          code: 'GUEST_ACCESS_DENIED'
        });
      }

      const planHierarchy = {
        'free': 0,
        'pro': 1,
        'team': 2,
        'enterprise': 3
      };

      const userPlanLevel = planHierarchy[req.user.subscription.plan] || 0;
      const requiredPlanLevel = planHierarchy[plan] || 0;

      if (userPlanLevel < requiredPlanLevel) {
        return res.status(403).json({
          success: false,
          error: `${plan} subscription required`,
          code: 'SUBSCRIPTION_REQUIRED',
          requiredPlan: plan,
          currentPlan: req.user.subscription.plan
        });
      }

      next();
    };
  }

  /**
   * Rate limiting middleware for authentication endpoints
   */
  authRateLimit = (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Clean up old entries
    this.cleanupFailedAttempts();

    const attempts = this.failedAttempts.get(identifier) || { count: 0, firstAttempt: now };

    // Check if user is locked out
    if (attempts.lockUntil && attempts.lockUntil > now) {
      const remainingTime = Math.ceil((attempts.lockUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        error: `Too many authentication attempts. Try again in ${remainingTime} seconds.`,
        code: 'RATE_LIMITED',
        retryAfter: remainingTime
      });
    }

    // Reset counter if window has passed
    if (now - attempts.firstAttempt > this.LOCKOUT_TIME) {
      attempts.count = 0;
      attempts.firstAttempt = now;
    }

    // Increment attempt count
    attempts.count++;
    this.failedAttempts.set(identifier, attempts);

    // Set lockout if max attempts reached
    if (attempts.count >= this.MAX_ATTEMPTS) {
      attempts.lockUntil = now + this.LOCKOUT_TIME;
      this.failedAttempts.set(identifier, attempts);

      return res.status(429).json({
        success: false,
        error: `Too many authentication attempts. Account locked for ${this.LOCKOUT_TIME / 1000 / 60} minutes.`,
        code: 'ACCOUNT_LOCKED',
        retryAfter: this.LOCKOUT_TIME / 1000
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': this.MAX_ATTEMPTS,
      'X-RateLimit-Remaining': this.MAX_ATTEMPTS - attempts.count,
      'X-RateLimit-Reset': Math.ceil((attempts.firstAttempt + this.LOCKOUT_TIME) / 1000)
    });

    next();
  }

  /**
   * CORS middleware for authentication endpoints
   */
  corsMiddleware = (req, res, next) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://codeguardian.pro',
      'https://www.codeguardian.pro',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV === 'development') {
      // Allow all origins in development
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  }

  /**
   * Two-factor authentication middleware
   */
  require2FA = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.twoFactorEnabled && !req.headers['x-2fa-verified']) {
      return res.status(403).json({
        success: false,
        error: 'Two-factor authentication required',
        code: '2FA_REQUIRED'
      });
    }

    next();
  }

  /**
   * Extract token from request
   */
  extractToken(req) {
    // From Authorization header
    if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    // From cookie
    if (req.cookies && req.cookies.auth_token) {
      return req.cookies.auth_token;
    }

    // From query parameter
    if (req.query && req.query.token) {
      return req.query.token;
    }

    return null;
  }

  /**
   * Create guest user
   */
  async createGuestUser(req, res, next) {
    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const guestUser = new User({
        githubId: guestId,
        username: `guest_${Math.random().toString(36).substr(2, 9)}`,
        email: `guest_${Date.now()}@codeguardian.local`,
        profile: {
          name: 'Guest User',
          avatar: '/images/default-avatar.png'
        },
        isGuest: true,
        guestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        preferences: {
          theme: 'dark',
          notifications: {
            email: false,
            push: false,
            projectUpdates: false
          }
        },
        subscription: {
          plan: 'guest',
          features: ['basic_analysis', 'file_upload']
        }
      });

      await guestUser.save();

      // Generate token for guest
      const token = this.generateToken({
        userId: guestUser._id,
        guestId: guestUser.githubId,
        username: guestUser.username,
        isGuest: true
      });

      req.user = guestUser;
      req.token = token;
      req.isGuest = true;

      // Set token in cookie for guest
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      next();
    } catch (error) {
      console.error('Error creating guest user:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create guest session'
      });
    }
  }

  /**
   * Clean up failed attempts cache
   */
  cleanupFailedAttempts() {
    const now = Date.now();
    for (const [identifier, attempts] of this.failedAttempts.entries()) {
      if (now - attempts.firstAttempt > this.LOCKOUT_TIME * 2) {
        this.failedAttempts.delete(identifier);
      }
    }
  }

  /**
   * Reset failed attempts for an IP
   */
  resetFailedAttempts(identifier) {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Get authentication configuration
   */
  getConfig() {
    return {
      jwtExpiresIn: this.JWT_EXPIRES_IN,
      refreshTokenExpiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      maxAttempts: this.MAX_ATTEMPTS,
      lockoutTime: this.LOCKOUT_TIME
    };
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

module.exports = authMiddleware;