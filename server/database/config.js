// server/database/config.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

class DatabaseConfig {
  constructor() {
    this.mongoose = mongoose;
    this.isConnected = false;
    this.connection = null;
    this.memoryServer = null;
    this.connectionOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
  }

  /**
   * Get MongoDB connection URI from environment variables
   */
  getMongoURI() {
    const {
      NODE_ENV = 'development',
      MONGODB_URI,
      MONGODB_HOST = 'localhost',
      MONGODB_PORT = 27017,
      MONGODB_DATABASE = 'codeguardian_pro',
      MONGODB_USERNAME,
      MONGODB_PASSWORD,
    } = process.env;

    // If full URI is provided, use it
    if (MONGODB_URI) {
      return MONGODB_URI;
    }

    // For testing environment, use in-memory database
    if (NODE_ENV === 'test') {
      return 'mongodb://localhost:27017/codeguardian_test';
    }

    // Build connection string from individual components
    let uri = `mongodb://`;
    
    if (MONGODB_USERNAME && MONGODB_PASSWORD) {
      uri += `${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@`;
    }
    
    uri += `${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;

    // Add connection options for production
    if (NODE_ENV === 'production') {
      uri += '?retryWrites=true&w=majority';
    }

    return uri;
  }

  /**
   * Initialize in-memory MongoDB for testing
   */
  async initializeMemoryServer() {
    try {
      this.memoryServer = await MongoMemoryServer.create();
      const uri = this.memoryServer.getUri();
      console.log('📁 In-memory MongoDB server started:', uri);
      return uri;
    } catch (error) {
      console.error('Failed to start in-memory MongoDB:', error);
      throw error;
    }
  }

  /**
   * Connect to MongoDB database
   */
  async connect() {
    try {
      const NODE_ENV = process.env.NODE_ENV || 'development';
      
      let mongoURI;
      
      // Use in-memory database for testing
      if (NODE_ENV === 'test') {
        mongoURI = await this.initializeMemoryServer();
      } else {
        mongoURI = this.getMongoURI();
      }

      console.log(`🔌 Connecting to MongoDB (${NODE_ENV})...`);

      // Set Mongoose options
      this.mongoose.set('strictQuery', false);
      this.mongoose.set('bufferCommands', false);

      // Add Mongoose plugins
      this.applyPlugins();

      // Connect to database
      this.connection = await this.mongoose.connect(mongoURI, this.connectionOptions);

      this.isConnected = true;
      
      console.log(`✅ MongoDB connected successfully to: ${mongoURI.replace(/:([^:@])+@/, ':***@')}`);

      // Set up event listeners
      this.setupEventListeners();

      return this.connection;

    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Apply global Mongoose plugins
   */
  applyPlugins() {
    // Add timestamps plugin to all schemas
    this.mongoose.plugin((schema) => {
      schema.add({
        createdAt: {
          type: Date,
          default: Date.now
        },
        updatedAt: {
          type: Date,
          default: Date.now
        }
      });

      schema.pre('save', function(next) {
        this.updatedAt = Date.now();
        next();
      });

      schema.pre('updateOne', function(next) {
        this.set({ updatedAt: Date.now() });
        next();
      });

      schema.pre('updateMany', function(next) {
        this.set({ updatedAt: Date.now() });
        next();
      });

      schema.pre('findOneAndUpdate', function(next) {
        this.set({ updatedAt: Date.now() });
        next();
      });
    });

    // Add toJSON transformation plugin
    this.mongoose.plugin((schema) => {
      if (schema.options.toJSON === undefined) {
        schema.options.toJSON = {};
      }

      schema.options.toJSON.transform = function(doc, ret) {
        // Remove version and convert _id to id
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        
        // Remove sensitive fields
        if (ret.password) delete ret.password;
        if (ret.tokens) delete ret.tokens;
        if (ret.verificationToken) delete ret.verificationToken;
        if (ret.resetPasswordToken) delete ret.resetPasswordToken;
        
        return ret;
      };
    });
  }

  /**
   * Set up database event listeners
   */
  setupEventListeners() {
    this.mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    this.mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
      this.isConnected = false;
    });

    this.mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    this.mongoose.connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Close connection on app termination
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  /**
   * Gracefully shutdown database connection
   */
  async gracefulShutdown() {
    console.log('🛑 Received shutdown signal, closing MongoDB connection...');
    
    try {
      await this.mongoose.connection.close();
      
      // Stop in-memory server if running
      if (this.memoryServer) {
        await this.memoryServer.stop();
      }
      
      console.log('✅ MongoDB connection closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during MongoDB shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await this.mongoose.connection.close();
        this.isConnected = false;
        console.log('✅ MongoDB disconnected successfully');
      }

      if (this.memoryServer) {
        await this.memoryServer.stop();
        console.log('✅ In-memory MongoDB stopped');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Drop database (for testing)
   */
  async dropDatabase() {
    try {
      if (this.isConnected) {
        await this.mongoose.connection.db.dropDatabase();
        console.log('✅ Database dropped successfully');
      }
    } catch (error) {
      console.error('❌ Error dropping database:', error);
      throw error;
    }
  }

  /**
   * Get database connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.mongoose.connection.readyState,
      host: this.mongoose.connection.host,
      port: this.mongoose.connection.port,
      name: this.mongoose.connection.name,
      models: Object.keys(this.mongoose.connection.models),
      collections: Object.keys(this.mongoose.connection.collections || {})
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const stats = await this.mongoose.connection.db.stats();
      const collections = await this.mongoose.connection.db.listCollections().toArray();

      return {
        database: stats.db,
        collections: collections.length,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize,
        indexes: stats.indexes,
        avgObjSize: stats.avgObjSize
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }

  /**
   * Create database indexes for better performance
   */
  async createIndexes() {
    try {
      console.log('📊 Creating database indexes...');

      // User indexes
      const User = require('../models/User').User;
      await User.createIndexes();

      // Project indexes
      const Project = require('../models/Project').Project;
      await Project.createIndexes();

      // Analysis indexes
      const AnalysisSession = require('../models/Analysis').AnalysisSession;
      await AnalysisSession.createIndexes();

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
      throw error;
    }
  }

  /**
   * Initialize database with sample data (for development)
   */
  async initializeSampleData() {
    try {
      const NODE_ENV = process.env.NODE_ENV || 'development';
      
      if (NODE_ENV !== 'development') {
        console.log('⚠️ Sample data initialization skipped for non-development environment');
        return;
      }

      console.log('🎨 Initializing sample data...');

      const User = require('../models/User').User;
      const Project = require('../models/Project').Project;

      // Check if sample data already exists
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        console.log('✅ Sample data already exists');
        return;
      }

      // Create sample user
      const sampleUser = new User({
        githubId: 'sample_github_123',
        username: 'sample_developer',
        email: 'sample@codeguardian.pro',
        profile: {
          name: 'Sample Developer',
          avatar: '/images/default-avatar.png',
          bio: 'This is a sample user for demonstration purposes',
          location: 'Internet'
        },
        preferences: {
          theme: 'dark',
          notifications: {
            email: true,
            push: true,
            projectUpdates: true
          }
        },
        subscription: {
          plan: 'pro',
          status: 'active',
          features: ['basic_analysis', 'advanced_analysis', 'priority_support']
        }
      });

      await sampleUser.save();

      // Create sample project
      const sampleProject = new Project({
        name: 'Sample JavaScript Project',
        description: 'A sample project demonstrating CodeGuardian Pro features',
        userId: sampleUser._id,
        files: [
          {
            name: 'app.js',
            path: 'app.js',
            content: `// Sample JavaScript application
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// This has a potential security issue
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  // SQL injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userId;
  
  res.send('User data for: ' + userId);
});

// Performance issue: nested loops
function processData(data) {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data.length; j++) {
      result.push(data[i] + data[j]);
    }
  }
  return result;
}

app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});`,
            language: 'javascript',
            size: 1024,
            lineCount: 28
          },
          {
            name: 'package.json',
            path: 'package.json',
            content: `{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "Sample project for CodeGuardian Pro",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}`,
            language: 'json',
            size: 512,
            lineCount: 18
          }
        ],
        language: 'javascript',
        source: 'direct_upload',
        statistics: {
          totalFiles: 2,
          totalSize: 1536,
          largestFile: {
            name: 'app.js',
            size: 1024
          },
          averageFileSize: 768,
          totalLines: 46
        }
      });

      await sampleProject.save();

      console.log('✅ Sample data initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing sample data:', error);
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          healthy: false,
          error: 'Database not connected',
          timestamp: new Date()
        };
      }

      // Perform a simple query to verify connection
      await this.mongoose.connection.db.admin().ping();

      const stats = await this.getDatabaseStats();

      return {
        healthy: true,
        timestamp: new Date(),
        connection: {
          readyState: this.mongoose.connection.readyState,
          host: this.mongoose.connection.host,
          port: this.mongoose.connection.port,
          name: this.mongoose.connection.name
        },
        database: stats
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get database configuration
   */
  getConfig() {
    const NODE_ENV = process.env.NODE_ENV || 'development';
    
    return {
      environment: NODE_ENV,
      uri: this.getMongoURI().replace(/:([^:@])+@/, ':***@'),
      options: this.connectionOptions,
      memoryServer: !!this.memoryServer,
      connected: this.isConnected
    };
  }
}

// Create and export singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;