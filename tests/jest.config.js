module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'jsdom',

  // The root directory that Jest should scan for tests and modules within
  rootDir: process.cwd(),

  // A list of paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>/src',
    '<rootDir>/server',
    '<rootDir>/tests'
  ],

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/',
    '/out/',
    '/coverage/'
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'server/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!server/**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.next/**',
    '!**/out/**',
    '!**/coverage/**'
  ],

  // Coverage threshold configuration
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover',
    'html'
  ],

  // An array of file extensions your modules use
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources
  moduleNameMapping: {
    // Handle CSS imports (with CSS modules)
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js',
    
    // Handle module path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1'
  },

  // A list of paths to modules that run some code to configure or set up the testing framework
  setupFilesAfterEnv: [
    '<rootDir>/tests/setupTests.js'
  ],

  // The paths to modules that run some code to configure or set up the testing environment
  setupFiles: [
    '<rootDir>/tests/setupEnv.js'
  ],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$'
  ],

  // An array of regexp pattern strings that are matched against all module paths before moduleNameMapping is applied
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/.next/',
    '<rootDir>/out/'
  ],

  // This option allows the use of a custom results processor
  testResultsProcessor: 'jest-sonar-reporter',

  // This option sets the URL for the jsdom environment
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Maximum amount of workers used to run your tests
  maxWorkers: '50%',

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // The number of seconds after which a test is considered as slow and reported as such in the results
  slowTestThreshold: 10,

  // The number of milliseconds after which a test times out
  testTimeout: 30000,

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Reset the module registry before running each individual test
  resetModules: false,

  // Restore mock state between every test
  restoreMocks: true,

  // A list of paths to modules that export a Jest-preset
  preset: 'ts-jest',

  // Global setup module
  globalSetup: '<rootDir>/tests/globalSetup.js',

  // Global teardown module
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  // Use this configuration option to add custom reporters to Jest
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage',
        filename: 'test-report.html',
        expand: true
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml'
      }
    ]
  ],

  // Watch plugin configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Collect coverage when running in CI
  collectCoverage: process.env.CI === 'true',

  // Force coverage collection from ignored files
  forceCoverageMatch: [],

  // Module directores for node modules
  moduleDirectories: [
    'node_modules',
    'src'
  ],

  // Extra configurations for specific environments
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
      moduleNameMapping: {
        '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js',
        '^@/(.*)$': '<rootDir>/src/$1'
      }
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/server/**/*.{test,spec}.{js,ts}',
        '<rootDir>/tests/integration/**/*.{test,spec}.{js,ts}'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setupServerTests.js']
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/e2e/**/*.{test,spec}.{js,ts}'
      ],
      globalSetup: '<rootDir>/tests/e2e/setup.js',
      globalTeardown: '<rootDir>/tests/e2e/teardown.js',
      testTimeout: 60000
    }
  ],

  // Coverage provider
  coverageProvider: 'v8',

  // Error on missing coverage
  errorOnDeprecated: true
};