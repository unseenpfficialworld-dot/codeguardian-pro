const request = require('supertest');
const express = require('express');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock external dependencies
jest.mock('../server/services/geminiAnalysis');
jest.mock('../server/services/githubIntegration');
jest.mock('../server/services/googleDriveService');
jest.mock('../server/middleware/auth');
jest.mock('../server/database/config');

const app = express();
app.use(express.json());

// Import routes
const authRoutes = require('../server/routes/auth');
const projectRoutes = require('../server/routes/projects');
const uploadRoutes = require('../server/routes/upload');
const analysisRoutes = require('../server/routes/analysis');
const downloadRoutes = require('../server/routes/download');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/download', downloadRoutes);

describe('API Integration Tests', () => {
  let testToken;
  let testProjectId;

  beforeEach(() => {
    // Setup test data
    testToken = 'test-jwt-token-123';
    testProjectId = 'project-test-id-456';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication API', () => {
    it('POST /api/auth/github - should initiate GitHub OAuth', async () => {
      const response = await request(app)
        .post('/api/auth/github')
        .send({ code: 'github-auth-code-123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
    });

    it('POST /api/auth/google - should initiate Google OAuth', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({ code: 'google-auth-code-456' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
    });

    it('POST /api/auth/logout - should logout user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('GET /api/auth/me - should get current user', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
    });
  });

  describe('Project Management API', () => {
    it('POST /api/projects - should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test project description',
        files: []
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('project');
      expect(response.body.project.name).toBe('Test Project');
      expect(response.body.project).toHaveProperty('id');
      testProjectId = response.body.project.id;
    });

    it('GET /api/projects - should list user projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
    });

    it('GET /api/projects/:id - should get project details', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('project');
      expect(response.body.project.id).toBe(testProjectId);
    });

    it('PUT /api/projects/:id - should update project', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.project.name).toBe('Updated Project Name');
    });

    it('DELETE /api/projects/:id - should delete project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Project deleted successfully');
    });
  });

  describe('File Upload API', () => {
    it('POST /api/upload/github - should upload from GitHub', async () => {
      const githubData = {
        repoUrl: 'https://github.com/testuser/test-repo',
        branch: 'main'
      };

      const response = await request(app)
        .post('/api/upload/github')
        .set('Authorization', `Bearer ${testToken}`)
        .send(githubData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('files');
    });

    it('POST /api/upload/google-drive - should upload from Google Drive', async () => {
      const driveData = {
        fileId: 'google-drive-file-id-123',
        fileName: 'project-files.zip'
      };

      const response = await request(app)
        .post('/api/upload/google-drive')
        .set('Authorization', `Bearer ${testToken}`)
        .send(driveData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('files');
    });

    it('POST /api/upload/direct - should handle direct file upload', async () => {
      const response = await request(app)
        .post('/api/upload/direct')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('files', Buffer.from('console.log("test");'), 'test.js')
        .field('projectName', 'Direct Upload Test');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('uploadedFiles');
    });

    it('POST /api/upload/zip - should extract and process ZIP files', async () => {
      const response = await request(app)
        .post('/api/upload/zip')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('zipFile', Buffer.from('fake-zip-content'), 'project.zip')
        .field('projectName', 'ZIP Upload Test');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('extractedFiles');
    });

    it('POST /api/upload/url - should import from URL', async () => {
      const urlData = {
        projectUrl: 'https://example.com/project-source',
        projectName: 'URL Import Test'
      };

      const response = await request(app)
        .post('/api/upload/url')
        .set('Authorization', `Bearer ${testToken}`)
        .send(urlData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectId');
    });
  });

  describe('Analysis API', () => {
    it('POST /api/analyze/:projectId - should start AI analysis', async () => {
      const response = await request(app)
        .post(`/api/analyze/${testProjectId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analysisId');
      expect(response.body).toHaveProperty('status', 'started');
    });

    it('GET /api/analyze/:projectId/status - should get analysis status', async () => {
      const response = await request(app)
        .get(`/api/analyze/${testProjectId}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('currentStage');
    });

    it('GET /api/analyze/:projectId/results - should get analysis results', async () => {
      const response = await request(app)
        .get(`/api/analyze/${testProjectId}/results`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveProperty('errors');
      expect(response.body.results).toHaveProperty('fixedCode');
      expect(response.body.results).toHaveProperty('metrics');
    });

    it('POST /api/analyze/:projectId/cancel - should cancel analysis', async () => {
      const response = await request(app)
        .post(`/api/analyze/${testProjectId}/cancel`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Analysis cancelled');
    });
  });

  describe('Download API', () => {
    it('GET /api/download/:projectId - should download fixed project', async () => {
      const response = await request(app)
        .get(`/api/download/${testProjectId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('GET /api/download/:projectId/report - should download analysis report', async () => {
      const response = await request(app)
        .get(`/api/download/${testProjectId}/report`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('GET /api/download/:projectId/file/:fileId - should download specific file', async () => {
      const fileId = 'file-test-id-789';
      const response = await request(app)
        .get(`/api/download/${testProjectId}/file/${fileId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/projects');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent projects', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid file uploads', async () => {
      const response = await request(app)
        .post('/api/upload/direct')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('files', Buffer.from('invalid content'), 'test.exe');

      expect(response.status).toBe(400);
    });

    it('should return 429 for rate limited requests', async () => {
      // Make multiple rapid requests to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        await request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${testToken}`);
      }

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(429);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent upload requests', async () => {
      const uploadPromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/upload/direct')
          .set('Authorization', `Bearer ${testToken}`)
          .attach('files', Buffer.from(`console.log(${i});`), `file${i}.js`)
          .field('projectName', `Concurrent Test ${i}`)
      );

      const responses = await Promise.all(uploadPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should process large files within timeout', async () => {
      const largeFileContent = 'console.log("x");\n'.repeat(10000); // ~200KB

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/upload/direct')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('files', Buffer.from(largeFileContent), 'large-file.js')
        .field('projectName', 'Large File Test')
        .timeout(30000); // 30 second timeout

      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Data Validation', () => {
    it('should validate project creation data', async () => {
      const invalidData = {
        name: '', // Empty name
        description: 123 // Wrong type
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should validate GitHub upload data', async () => {
      const invalidData = {
        repoUrl: 'invalid-url',
        branch: '' // Empty branch
      };

      const response = await request(app)
        .post('/api/upload/github')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should validate analysis parameters', async () => {
      const response = await request(app)
        .post('/api/analyze/invalid-project-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Security Tests', () => {
    it('should prevent directory traversal in file downloads', async () => {
      const response = await request(app)
        .get('/api/download/../sensitive-file')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });

    it('should sanitize file names', async () => {
      const response = await request(app)
        .post('/api/upload/direct')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('files', Buffer.from('test'), '../../etc/passwd')
        .field('projectName', 'Path Traversal Test');

      expect(response.status).toBe(400);
    });

    it('should validate JWT tokens', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});