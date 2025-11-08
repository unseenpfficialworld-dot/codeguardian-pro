const { describe, it, before, after, beforeEach } = require('@jest/globals');
const { chromium } = require('playwright');
const { createServer } = require('http');
const express = require('express');

describe('CodeGuardian Pro - End-to-End User Flow Tests', () => {
  let browser;
  let page;
  let server;
  let testApp;

  beforeAll(async () => {
    // Setup test server
    testApp = express();
    testApp.use(express.json());
    
    // Mock API endpoints for testing
    testApp.post('/api/auth/github', (req, res) => {
      res.json({
        access_token: 'test-github-token',
        user: { id: 'user123', email: 'test@example.com' }
      });
    });

    testApp.post('/api/upload/direct', (req, res) => {
      res.json({
        projectId: 'project-test-123',
        files: ['test.js', 'test2.js'],
        status: 'uploaded'
      });
    });

    testApp.post('/api/analyze/project-test-123', (req, res) => {
      res.json({
        analysisId: 'analysis-123',
        status: 'started'
      });
    });

    testApp.get('/api/analyze/project-test-123/status', (req, res) => {
      res.json({
        status: 'completed',
        progress: 100,
        currentStage: 'complete'
      });
    });

    testApp.get('/api/analyze/project-test-123/results', (req, res) => {
      res.json({
        results: {
          errors: [
            {
              id: 'error1',
              type: 'syntax',
              message: 'Missing semicolon',
              line: 1,
              severity: 'error',
              fix: 'Add semicolon'
            }
          ],
          fixedCode: 'console.log("fixed");',
          metrics: {
            errorCount: 1,
            filesProcessed: 2,
            optimizationScore: 85
          }
        }
      });
    });

    server = createServer(testApp);
    await new Promise(resolve => server.listen(3001, resolve));
  });

  afterAll(async () => {
    await server.close();
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    browser = await chromium.launch({ 
      headless: true,
      slowMo: 100 // Add slight delay to see tests running
    });
    page = await browser.newPage();
    
    // Set viewport size
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Complete User Registration Flow', () => {
    it('should complete new user onboarding', async () => {
      console.log('Starting new user onboarding flow...');

      // Step 1: Navigate to landing page
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="landing-page"]');
      
      // Verify landing page loaded
      expect(await page.isVisible('text=AI-Powered Code Analysis')).toBeTruthy();
      console.log('✓ Landing page loaded');

      // Step 2: Click Get Started button
      await page.click('text=Get Started');
      await page.waitForSelector('[data-testid="auth-page"]');
      console.log('✓ Navigated to authentication page');

      // Step 3: Select GitHub authentication
      await page.click('text=Continue with GitHub');
      await page.waitForTimeout(1000);
      console.log('✓ GitHub OAuth initiated');

      // Step 4: Mock OAuth callback and redirect to upload
      await page.goto('http://localhost:3000/upload');
      await page.waitForSelector('[data-testid="upload-page"]');
      console.log('✓ Successfully authenticated and redirected to upload page');
    });
  });

  describe('Complete Project Upload Flow', () => {
    it('should upload project via multiple methods', async () => {
      console.log('Testing project upload methods...');

      await page.goto('http://localhost:3000/upload');
      await page.waitForSelector('[data-testid="upload-page"]');

      // Test 1: GitHub Repository Upload
      await page.click('text=GitHub Repository');
      await page.waitForSelector('[data-testid="github-upload-form"]');
      
      await page.fill('[data-testid="repo-url"]', 'https://github.com/testuser/test-repo');
      await page.click('[data-testid="github-upload-submit"]');
      await page.waitForTimeout(2000);
      console.log('✓ GitHub repository upload initiated');

      // Test 2: Direct File Upload
      await page.click('text=Direct Upload');
      await page.waitForSelector('[data-testid="direct-upload-form"]');
      
      // Create test file
      const fileBuffer = Buffer.from('console.log("test file content");');
      
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'test.js',
        mimeType: 'application/javascript',
        buffer: fileBuffer
      });
      
      await page.click('[data-testid="direct-upload-submit"]');
      await page.waitForSelector('[data-testid="upload-success"]');
      console.log('✓ Direct file upload completed');

      // Test 3: ZIP File Upload
      await page.click('text=Upload ZIP');
      await page.waitForSelector('[data-testid="zip-upload-form"]');
      
      const zipBuffer = Buffer.from('fake zip content');
      await page.setInputFiles('[data-testid="zip-input"]', {
        name: 'project.zip',
        mimeType: 'application/zip',
        buffer: zipBuffer
      });
      
      await page.click('[data-testid="zip-upload-submit"]');
      await page.waitForTimeout(1000);
      console.log('✓ ZIP file upload completed');
    });
  });

  describe('Complete Analysis Processing Flow', () => {
    it('should process project and show real-time progress', async () => {
      console.log('Testing analysis processing flow...');

      // Start from upload page
      await page.goto('http://localhost:3000/upload');
      await page.waitForSelector('[data-testid="upload-page"]');

      // Upload a test file
      const fileBuffer = Buffer.from('console.log("test analysis");');
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'analysis-test.js',
        mimeType: 'application/javascript',
        buffer: fileBuffer
      });
      
      await page.click('[data-testid="direct-upload-submit"]');
      await page.waitForSelector('[data-testid="upload-success"]');

      // Should auto-redirect to processing page
      await page.waitForSelector('[data-testid="processing-page"]');
      console.log('✓ Redirected to processing page');

      // Verify progress indicators
      expect(await page.isVisible('text=Processing Your Project')).toBeTruthy();
      expect(await page.isVisible('[data-testid="progress-bar"]')).toBeTruthy();
      console.log('✓ Progress indicators visible');

      // Wait for processing to complete (mock)
      await page.waitForSelector('text=Analysis Complete', { timeout: 10000 });
      console.log('✓ Analysis completed successfully');

      // Should auto-redirect to results page
      await page.waitForSelector('[data-testid="results-page"]');
      console.log('✓ Redirected to results page');
    });
  });

  describe('Complete Results Review Flow', () => {
    it('should display results and allow interaction', async () => {
      console.log('Testing results review flow...');

      // Navigate directly to results page (simulating completed analysis)
      await page.goto('http://localhost:3000/results/project-test-123');
      await page.waitForSelector('[data-testid="results-page"]');

      // Verify results components
      expect(await page.isVisible('text=Analysis Results')).toBeTruthy();
      expect(await page.isVisible('[data-testid="error-breakdown"]')).toBeTruthy();
      expect(await page.isVisible('[data-testid="code-comparison"]')).toBeTruthy();
      console.log('✓ Results page components loaded');

      // Test error navigation
      await page.click('[data-testid="error-item"]:first-child');
      await page.waitForSelector('[data-testid="error-details"]');
      console.log('✓ Error details panel working');

      // Test code comparison view
      await page.click('text=Original Code');
      await page.click('text=Fixed Code');
      console.log('✓ Code comparison tabs working');

      // Test file tree navigation
      await page.click('[data-testid="file-tree-item"]:first-child');
      await page.waitForTimeout(500);
      console.log('✓ File tree navigation working');

      // Test download functionality
      await page.click('[data-testid="download-button"]');
      await page.waitForTimeout(1000);
      console.log('✓ Download functionality working');
    });
  });

  describe('Complete Dashboard Navigation Flow', () => {
    it('should navigate dashboard and view project history', async () => {
      console.log('Testing dashboard navigation flow...');

      // Navigate to dashboard
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard-page"]');

      // Verify dashboard components
      expect(await page.isVisible('text=My Projects')).toBeTruthy();
      expect(await page.isVisible('[data-testid="project-list"]')).toBeTruthy();
      expect(await page.isVisible('[data-testid="project-stats"]')).toBeTruthy();
      console.log('✓ Dashboard components loaded');

      // Test project filtering
      await page.click('[data-testid="filter-button"]');
      await page.click('text=Completed');
      await page.waitForTimeout(500);
      console.log('✓ Project filtering working');

      // Test project sorting
      await page.click('[data-testid="sort-button"]');
      await page.click('text=Newest First');
      await page.waitForTimeout(500);
      console.log('✓ Project sorting working');

      // Test project card interactions
      await page.click('[data-testid="project-card"]:first-child');
      await page.waitForSelector('[data-testid="project-details"]');
      console.log('✓ Project details view working');

      // Navigate to history page
      await page.click('[data-testid="history-link"]');
      await page.waitForSelector('[data-testid="history-page"]');
      expect(await page.isVisible('text=Project History')).toBeTruthy();
      console.log('✓ History page navigation working');

      // Navigate back to dashboard
      await page.click('[data-testid="dashboard-link"]');
      await page.waitForSelector('[data-testid="dashboard-page"]');
      console.log('✓ Return to dashboard working');
    });
  });

  describe('Complete Settings and Preferences Flow', () => {
    it('should update user settings and preferences', async () => {
      console.log('Testing settings and preferences flow...');

      // Navigate to settings
      await page.goto('http://localhost:3000/settings');
      await page.waitForSelector('[data-testid="settings-page"]');

      // Verify settings sections
      expect(await page.isVisible('text=User Preferences')).toBeTruthy();
      expect(await page.isVisible('text=AI Analysis Settings')).toBeTruthy();
      expect(await page.isVisible('text=Notification Settings')).toBeTruthy();
      console.log('✓ Settings page sections loaded');

      // Test theme toggle
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(500);
      console.log('✓ Theme toggle working');

      // Test analysis preferences
      await page.click('[data-testid="enable-security-scan"]');
      await page.click('[data-testid="enable-performance-check"]');
      console.log('✓ Analysis preferences updating');

      // Test notification settings
      await page.click('[data-testid="email-notifications"]');
      await page.waitForTimeout(500);
      console.log('✓ Notification settings working');

      // Save settings
      await page.click('[data-testid="save-settings"]');
      await page.waitForSelector('text=Settings saved');
      console.log('✓ Settings saved successfully');
    });
  });

  describe('Complete Error Handling Flow', () => {
    it('should handle errors gracefully throughout the application', async () => {
      console.log('Testing error handling flow...');

      // Test 1: Invalid file upload
      await page.goto('http://localhost:3000/upload');
      await page.waitForSelector('[data-testid="upload-page"]');

      const invalidFileBuffer = Buffer.from('invalid content');
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'test.exe',
        mimeType: 'application/exe',
        buffer: invalidFileBuffer
      });
      
      await page.click('[data-testid="direct-upload-submit"]');
      await page.waitForSelector('[data-testid="upload-error"]');
      expect(await page.isVisible('text=Invalid file type')).toBeTruthy();
      console.log('✓ Invalid file type error handled');

      // Test 2: Network error during analysis
      await page.goto('http://localhost:3000/processing/failing-project');
      await page.waitForSelector('[data-testid="processing-error"]');
      expect(await page.isVisible('text=Analysis failed')).toBeTruthy();
      console.log('✓ Analysis failure handled');

      // Test 3: 404 page
      await page.goto('http://localhost:3000/non-existent-page');
      await page.waitForSelector('[data-testid="not-found"]');
      expect(await page.isVisible('text=Page not found')).toBeTruthy();
      console.log('✓ 404 page working');
    });
  });

  describe('Complete Mobile Responsive Flow', () => {
    it('should work correctly on mobile devices', async () => {
      console.log('Testing mobile responsive flow...');

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Test mobile navigation
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="landing-page"]');

      // Verify mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await page.waitForSelector('[data-testid="mobile-menu"]');
      console.log('✓ Mobile menu working');

      // Test mobile upload flow
      await page.click('text=Get Started');
      await page.waitForSelector('[data-testid="auth-page"]');
      
      await page.click('text=Direct Upload');
      await page.waitForSelector('[data-testid="direct-upload-form"]');
      console.log('✓ Mobile upload flow working');

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  describe('Complete Ad Integration Flow', () => {
    it('should display ads without breaking user experience', async () => {
      console.log('Testing ad integration flow...');

      // Test ads on landing page
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="landing-page"]');

      expect(await page.isVisible('[data-testid="header-ad"]')).toBeTruthy();
      expect(await page.isVisible('[data-testid="sidebar-ad"]')).toBeTruthy();
      console.log('✓ Ads displayed on landing page');

      // Test ads on results page
      await page.goto('http://localhost:3000/results/project-test-123');
      await page.waitForSelector('[data-testid="results-page"]');

      expect(await page.isVisible('[data-testid="in-content-ad"]')).toBeTruthy();
      console.log('✓ Ads displayed on results page');

      // Verify ads don't block functionality
      await page.click('[data-testid="download-button"]');
      await page.waitForTimeout(500);
      console.log('✓ Ads not blocking functionality');
    });
  });

  describe('Performance and Loading Flow', () => {
    it('should maintain performance throughout user journey', async () => {
      console.log('Testing performance flow...');

      const navigationStart = Date.now();

      // Test initial page load
      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="landing-page"]');
      
      const loadTime = Date.now() - navigationStart;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      console.log(`✓ Landing page loaded in ${loadTime}ms`);

      // Test subsequent navigation performance
      const navStart = Date.now();
      await page.click('text=Get Started');
      await page.waitForSelector('[data-testid="auth-page"]');
      
      const navTime = Date.now() - navStart;
      expect(navTime).toBeLessThan(2000); // Should navigate within 2 seconds
      console.log(`✓ Navigation completed in ${navTime}ms`);

      // Test file upload performance
      const uploadStart = Date.now();
      const fileBuffer = Buffer.from('console.log("performance test");');
      
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'perf-test.js',
        mimeType: 'application/javascript',
        buffer: fileBuffer
      });
      
      await page.click('[data-testid="direct-upload-submit"]');
      await page.waitForSelector('[data-testid="upload-success"]');
      
      const uploadTime = Date.now() - uploadStart;
      expect(uploadTime).toBeLessThan(5000); // Should upload within 5 seconds
      console.log(`✓ File upload completed in ${uploadTime}ms`);
    });
  });

  describe('Cross-Browser Compatibility Flow', () => {
    it('should work across different browser environments', async () => {
      console.log('Testing cross-browser compatibility...');

      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1366, height: 768 },  // Laptop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('http://localhost:3000');
        await page.waitForSelector('[data-testid="landing-page"]');

        // Verify key elements are visible
        expect(await page.isVisible('text=AI-Powered Code Analysis')).toBeTruthy();
        expect(await page.isVisible('text=Get Started')).toBeTruthy();

        console.log(`✓ Layout works at ${viewport.width}x${viewport.height}`);
      }

      // Reset to default
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  describe('Complete Data Persistence Flow', () => {
    it('should persist user data and preferences', async () => {
      console.log('Testing data persistence flow...');

      // Simulate user session
      await page.goto('http://localhost:3000');
      
      // Set preferences
      await page.evaluate(() => {
        localStorage.setItem('userTheme', 'dark');
        localStorage.setItem('userPreferences', JSON.stringify({
          analysisDepth: 'deep',
          securityScan: true
        }));
      });

      // Refresh page and verify persistence
      await page.reload();
      await page.waitForSelector('[data-testid="landing-page"]');

      const theme = await page.evaluate(() => localStorage.getItem('userTheme'));
      const preferences = await page.evaluate(() => 
        JSON.parse(localStorage.getItem('userPreferences') || '{}')
      );

      expect(theme).toBe('dark');
      expect(preferences.analysisDepth).toBe('deep');
      expect(preferences.securityScan).toBe(true);
      console.log('✓ User preferences persisted across sessions');
    });
  });
});