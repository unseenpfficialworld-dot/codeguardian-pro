// server/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const path = require('path');

// Database and configuration
const databaseConfig = require('./database/config');
const authMiddleware = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const uploadRoutes = require('./routes/upload');
const analysisRoutes = require('./routes/analysis');
const downloadRoutes = require('./routes/download');

class CodeGuardianServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = process.env.PORT || 5000;
    this.environment = process.env.NODE_ENV || 'development';
    
    // Initialize server
    this.initializeMiddlewares();
    this.initializeSecurity();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize all middleware
   */
  initializeMiddlewares() {
    // Trust proxy for reverse proxy setups
    this.app.set('trust proxy', 1);

    // Body parsing middleware
    this.app.use(express.json({
      limit: '50mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    
    this.app.use(express.urlencoded({
      extended: true,
      limit: '50mb'
    }));

    // Cookie parser
    this.app.use(cookieParser());

    // CORS configuration
    this.app.use(cors({
      origin: this.getCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-2FA-Verified']
    }));

    // Security headers
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "https://api.github.com", "https://www.googleapis.com"]
        }
      }
    }));

    // Compression
    this.app.use(compression());

    // Logging
    if (this.environment !== 'test') {
      this.app.use(morgan(this.environment === 'production' ? 'combined' : 'dev'));
    }

    // Rate limiting
    this.initializeRateLimiting();

    // Security middleware
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    this.app.use('/public', express.static(path.join(__dirname, '../public')));

    // Request logging middleware
    this.app.use((req, res, next) => {
      req.requestId = require('crypto').randomUUID();
      console.log(`[${req.requestId}] ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  /**
   * Initialize security measures
   */
  initializeSecurity() {
    // Security headers
    this.app.disable('x-powered-by');
    
    // Rate limiting for different endpoints
    this.initializeRateLimiting();
  }

  /**
   * Initialize rate limiting
   */
  initializeRateLimiting() {
    // General rate limiter
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    // Strict rate limiter for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 10 requests per windowMs
      message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    // API rate limiter
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // limit each IP to 200 requests per windowMs
      message: {
        success: false,
        error: 'Too many API requests, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    // Slow down for heavy endpoints
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per windowMs, then...
      delayMs: 500 // begin adding 500ms of delay per request above 50
    });

    // Apply rate limiters
    this.app.use('/api/auth', authLimiter);
    this.app.use('/api/upload', speedLimiter);
    this.app.use('/api/', apiLimiter);
    this.app.use('/', generalLimiter);
  }

  /**
   * Initialize all routes
   */
  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await databaseConfig.healthCheck();
        const servicesHealth = await this.checkServicesHealth();

        const healthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: this.environment,
          database: dbHealth,
          services: servicesHealth,
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0'
        };

        // Determine overall health
        if (!dbHealth.healthy || !servicesHealth.overallHealthy) {
          healthStatus.status = 'unhealthy';
          return res.status(503).json(healthStatus);
        }

        res.json(healthStatus);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/projects', authMiddleware.authenticate, projectRoutes);
    this.app.use('/api/upload', authMiddleware.authenticate, uploadRoutes);
    this.app.use('/api/analyze', authMiddleware.authenticate, analysisRoutes);
    this.app.use('/api/download', authMiddleware.authenticate, downloadRoutes);

    // Demo endpoint for testing
    this.app.get('/api/demo', authMiddleware.optionalAuth, (req, res) => {
      res.json({
        success: true,
        message: 'CodeGuardian Pro API is working!',
        user: req.user ? {
          id: req.user.id,
          username: req.user.username,
          isGuest: req.user.isGuest
        } : null,
        timestamp: new Date().toISOString()
      });
    });

    // Catch-all handler for undefined routes
    this.app.all('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND'
      });
    });
  }

  /**
   * Initialize error handling middleware
   */
  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND'
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error(`[${req.requestId || 'NO_ID'}] Error:`, error);

      // Mongoose validation error
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
          code: 'VALIDATION_ERROR'
        });
      }

      // Mongoose duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({
          success: false,
          error: `${field} already exists`,
          code: 'DUPLICATE_ENTRY'
        });
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Rate limit error
      if (error.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMITED'
        });
      }

      // Default error
      const statusCode = error.status || error.statusCode || 500;
      const message = this.environment === 'production' 
        ? 'Something went wrong' 
        : error.message;

      res.status(statusCode).json({
        success: false,
        error: message,
        code: error.code || 'INTERNAL_ERROR',
        ...(this.environment !== 'production' && { stack: error.stack })
      });
    });

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // In production, you might want to exit the process
      if (this.environment === 'production') {
        process.exit(1);
      }
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // In production, you might want to exit the process
      if (this.environment === 'production') {
        process.exit(1);
      }
    });
  }

  /**
   * Get CORS origins based on environment
   */
  getCorsOrigins() {
    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    ];

    const productionOrigins = [
      'https://codeguardian.pro',
      'https://www.codeguardian.pro',
      'https://app.codeguardian.pro'
    ];

    const customOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : [];

    if (this.environment === 'development') {
      return [...defaultOrigins, ...customOrigins];
    } else {
      return [...productionOrigins, ...customOrigins];
    }
  }

  /**
   * Check health of external services
   */
  async checkServicesHealth() {
    const health = {
      overallHealthy: true,
      services: {}
    };

    try {
      // Check Gemini AI service
      const { geminiService } = require('./services/geminiAnalysis');
      const geminiHealth = await geminiService.healthCheck();
      health.services.gemini = geminiHealth;
      if (!geminiHealth.healthy) health.overallHealthy = false;

      // Check GitHub integration
      const { githubService } = require('./services/githubIntegration');
      const githubHealth = await githubService.healthCheck();
      health.services.github = githubHealth;
      if (!githubHealth.healthy) health.overallHealthy = false;

      // Check Google Drive integration
      const { googleDriveService } = require('./services/googleDriveService');
      const driveHealth = await googleDriveService.healthCheck();
      health.services.googleDrive = driveHealth;
      if (!driveHealth.healthy) health.overallHealthy = false;

    } catch (error) {
      health.overallHealthy = false;
      health.services.error = error.message;
    }

    return health;
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Connect to database
      console.log('📀 Connecting to database...');
      await databaseConfig.connect();
      
      // Create database indexes
      await databaseConfig.createIndexes();

      // Initialize sample data in development
      if (this.environment === 'development') {
        await databaseConfig.initializeSampleData();
      }

      // Start HTTP server
      this.server = this.app.listen(this.port, () => {
        console.log(`
🚀 CodeGuardian Pro Server Started!
📍 Environment: ${this.environment}
📍 Port: ${this.port}
📍 URL: http://localhost:${this.port}
📍 Health: http://localhost:${this.port}/health
📍 Database: ${databaseConfig.isConnected ? 'Connected ✅' : 'Disconnected ❌'}
⏰ Started at: ${new Date().toISOString()}
        `);

        // Log server information
        this.logServerInfo();
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

      return this.server;

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    try {
      console.log('🛑 Stopping server...');
      
      if (this.server) {
        await new Promise((resolve, reject) => {
          this.server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      // Disconnect from database
      await databaseConfig.disconnect();

      console.log('✅ Server stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n${signal} received, starting graceful shutdown...`);
        
        try {
          await this.stop();
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });
  }

  /**
   * Log server information
   */
  logServerInfo() {
    console.log(`
📊 Server Information:
├── Node.js: ${process.version}
├── Platform: ${process.platform}
├── Architecture: ${process.arch}
├── Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB
├── PID: ${process.pid}
├── Uptime: ${process.uptime().toFixed(2)}s
└── Environment: ${this.environment}
    `);

    // Log available routes in development
    if (this.environment === 'development') {
      this.logAvailableRoutes();
    }
  }

  /**
   * Log available API routes
   */
  logAvailableRoutes() {
    const routes = [];
    
    this.app._router.stack.forEach(middleware => {
      if (middleware.route) {
        // Routes registered directly on the app
        const methods = Object.keys(middleware.route.methods).map(method => method.toUpperCase());
        routes.push({
          path: middleware.route.path,
          methods: methods
        });
      } else if (middleware.name === 'router') {
        // Router middleware
        middleware.handle.stack.forEach(handler => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).map(method => method.toUpperCase());
            routes.push({
              path: handler.route.path,
              methods: methods
            });
          }
        });
      }
    });

    console.log('🛣️  Available Routes:');
    routes.forEach(route => {
      console.log(`   ${route.methods.join(', ').padEnd(15)} ${route.path}`);
    });
  }

  /**
   * Get server instance for testing
   */
  getApp() {
    return this.app;
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      environment: this.environment,
      port: this.port,
      running: !!this.server,
      database: databaseConfig.getConnectionStatus(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

// Create server instance
const server = new CodeGuardianServer();

// Export for testing and programmatic usage
module.exports = server;

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}