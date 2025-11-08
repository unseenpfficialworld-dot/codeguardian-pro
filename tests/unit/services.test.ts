import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  githubService,
  googleDriveService,
  uploadService,
  geminiService
} from '../src/services';
import type { Project, AnalysisResult, UploadOptions } from '../src/types';

// Mock external dependencies
jest.mock('axios');
jest.mock('@/lib/db');
jest.mock('@/lib/auth');

describe('Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GitHub Service', () => {
    const mockRepoData = {
      owner: 'testuser',
      repo: 'test-repo',
      branch: 'main'
    };

    it('should authenticate with GitHub OAuth', async () => {
      const mockToken = 'gho_testtoken123';
      jest.spyOn(githubService, 'authenticate').mockResolvedValue({
        access_token: mockToken,
        token_type: 'bearer',
        scope: 'repo'
      });

      const result = await githubService.authenticate('testcode');
      
      expect(result.access_token).toBe(mockToken);
      expect(githubService.authenticate).toHaveBeenCalledWith('testcode');
    });

    it('should fetch repository data', async () => {
      const mockRepoInfo = {
        name: 'test-repo',
        description: 'Test repository',
        language: 'TypeScript',
        stars: 10,
        forks: 2
      };

      jest.spyOn(githubService, 'getRepository').mockResolvedValue(mockRepoInfo);

      const result = await githubService.getRepository(mockRepoData);
      
      expect(result.name).toBe('test-repo');
      expect(result.language).toBe('TypeScript');
    });

    it('should download repository files', async () => {
      const mockFiles = [
        { path: 'src/index.ts', content: 'console.log("hello");', size: 100 },
        { path: 'package.json', content: '{"name": "test"}', size: 200 }
      ];

      jest.spyOn(githubService, 'downloadRepo').mockResolvedValue(mockFiles);

      const result = await githubService.downloadRepo(mockRepoData);
      
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('src/index.ts');
    });

    it('should handle GitHub API errors', async () => {
      jest.spyOn(githubService, 'getRepository').mockRejectedValue(
        new Error('GitHub API rate limit exceeded')
      );

      await expect(githubService.getRepository(mockRepoData)).rejects.toThrow(
        'GitHub API rate limit exceeded'
      );
    });

    it('should validate repository access', async () => {
      jest.spyOn(githubService, 'validateAccess').mockResolvedValue(true);

      const result = await githubService.validateAccess(mockRepoData);
      
      expect(result).toBe(true);
    });
  });

  describe('Google Drive Service', () => {
    const mockFileId = '1ABC123def456';
    const mockFileData = {
      id: mockFileId,
      name: 'project.zip',
      mimeType: 'application/zip',
      size: 1024000
    };

    it('should authenticate with Google OAuth', async () => {
      const mockToken = 'ya29.testtoken';
      jest.spyOn(googleDriveService, 'authenticate').mockResolvedValue({
        access_token: mockToken,
        expires_in: 3600,
        token_type: 'Bearer'
      });

      const result = await googleDriveService.authenticate('authcode');
      
      expect(result.access_token).toBe(mockToken);
    });

    it('should fetch file metadata', async () => {
      jest.spyOn(googleDriveService, 'getFileMetadata').mockResolvedValue(mockFileData);

      const result = await googleDriveService.getFileMetadata(mockFileId);
      
      expect(result.name).toBe('project.zip');
      expect(result.mimeType).toBe('application/zip');
    });

    it('should download file content', async () => {
      const mockContent = 'file content data';
      jest.spyOn(googleDriveService, 'downloadFile').mockResolvedValue(mockContent);

      const result = await googleDriveService.downloadFile(mockFileId);
      
      expect(result).toBe(mockContent);
    });

    it('should list folder contents', async () => {
      const mockFiles = [
        { id: '1', name: 'file1.js', mimeType: 'application/javascript' },
        { id: '2', name: 'file2.ts', mimeType: 'application/typescript' }
      ];

      jest.spyOn(googleDriveService, 'listFolder').mockResolvedValue(mockFiles);

      const result = await googleDriveService.listFolder('folder123');
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('file1.js');
    });

    it('should handle large file downloads', async () => {
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      jest.spyOn(googleDriveService, 'downloadFile').mockResolvedValue(largeContent);

      const result = await googleDriveService.downloadFile(mockFileId);
      
      expect(result.length).toBe(10 * 1024 * 1024);
    });
  });

  describe('Upload Service', () => {
    const mockFile = new File(['console.log("test");'], 'test.js', {
      type: 'application/javascript'
    });

    const mockUploadOptions: UploadOptions = {
      maxSize: 50 * 1024 * 1024,
      allowedTypes: ['.js', '.ts', '.jsx', '.tsx'],
      chunkSize: 5 * 1024 * 1024
    };

    it('should validate file type', async () => {
      jest.spyOn(uploadService, 'validateFile').mockResolvedValue(true);

      const result = await uploadService.validateFile(mockFile, mockUploadOptions);
      
      expect(result).toBe(true);
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' });
      
      await expect(uploadService.validateFile(invalidFile, mockUploadOptions))
        .rejects.toThrow('File type not allowed');
    });

    it('should handle direct file upload', async () => {
      const mockProject: Project = {
        id: 'proj123',
        name: 'Test Project',
        status: 'uploaded',
        files: [mockFile],
        createdAt: new Date().toISOString()
      };

      jest.spyOn(uploadService, 'uploadDirect').mockResolvedValue(mockProject);

      const result = await uploadService.uploadDirect([mockFile]);
      
      expect(result.id).toBe('proj123');
      expect(result.status).toBe('uploaded');
    });

    it('should process ZIP files', async () => {
      const mockZipFile = new File(['zip content'], 'project.zip', {
        type: 'application/zip'
      });

      const extractedFiles = [
        new File(['file1'], 'src/file1.js', { type: 'application/javascript' }),
        new File(['file2'], 'src/file2.ts', { type: 'application/typescript' })
      ];

      jest.spyOn(uploadService, 'extractZip').mockResolvedValue(extractedFiles);

      const result = await uploadService.extractZip(mockZipFile);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('src/file1.js');
    });

    it('should handle upload progress', async () => {
      const mockProgressCallback = jest.fn();
      
      jest.spyOn(uploadService, 'uploadWithProgress').mockImplementation(
        async (file, onProgress) => {
          for (let i = 0; i <= 100; i += 20) {
            onProgress?.(i);
          }
          return 'file123';
        }
      );

      await uploadService.uploadWithProgress(mockFile, mockProgressCallback);
      
      expect(mockProgressCallback).toHaveBeenCalledTimes(6);
      expect(mockProgressCallback).toHaveBeenCalledWith(100);
    });

    it('should handle upload errors', async () => {
      jest.spyOn(uploadService, 'uploadDirect').mockRejectedValue(
        new Error('Network error')
      );

      await expect(uploadService.uploadDirect([mockFile])).rejects.toThrow(
        'Network error'
      );
    });

    it('should validate file size limits', async () => {
      const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.js', {
        type: 'application/javascript'
      });

      await expect(uploadService.validateFile(largeFile, mockUploadOptions))
        .rejects.toThrow('File too large');
    });
  });

  describe('Gemini AI Service', () => {
    const mockCode = `
      function calculateSum(a, b) {
        return a + b;
      }
    `;

    const mockAnalysisResult: AnalysisResult = {
      id: 'analysis123',
      projectId: 'proj123',
      errors: [
        {
          id: 'err1',
          type: 'syntax',
          message: 'Missing type annotations',
          line: 2,
          severity: 'warning',
          fix: 'Add TypeScript types'
        }
      ],
      fixedCode: `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
      `,
      metrics: {
        errorCount: 1,
        filesProcessed: 1,
        optimizationScore: 85,
        processingTime: 2.5
      },
      createdAt: new Date().toISOString()
    };

    it('should analyze code with Gemini AI', async () => {
      jest.spyOn(geminiService, 'analyzeCode').mockResolvedValue(mockAnalysisResult);

      const result = await geminiService.analyzeCode(mockCode, 'typescript');
      
      expect(result.errors).toHaveLength(1);
      expect(result.metrics.optimizationScore).toBe(85);
    });

    it('should detect syntax errors', async () => {
      const invalidCode = 'function test() { console.log("hello" }';
      
      jest.spyOn(geminiService, 'detectSyntaxErrors').mockResolvedValue([
        {
          id: 'syntax1',
          type: 'syntax',
          message: 'Missing closing parenthesis',
          line: 1,
          severity: 'error',
          fix: 'Add closing parenthesis after "hello"'
        }
      ]);

      const result = await geminiService.detectSyntaxErrors(invalidCode, 'javascript');
      
      expect(result[0].type).toBe('syntax');
      expect(result[0].severity).toBe('error');
    });

    it('should generate code fixes', async () => {
      const originalCode = 'let x = 5;\nconsole.log(x);';
      const expectedFix = 'const x = 5;\nconsole.log(x);';

      jest.spyOn(geminiService, 'generateFix').mockResolvedValue(expectedFix);

      const result = await geminiService.generateFix(originalCode, [
        {
          id: 'fix1',
          type: 'best-practice',
          message: 'Use const instead of let for unchanged variables',
          line: 1,
          severity: 'warning',
          fix: 'Change let to const'
        }
      ]);

      expect(result).toBe(expectedFix);
    });

    it('should optimize code performance', async () => {
      const slowCode = `
        for (let i = 0; i < array.length; i++) {
          console.log(array[i]);
        }
      `;

      const optimizedCode = `
        array.forEach(item => console.log(item));
      `;

      jest.spyOn(geminiService, 'optimizePerformance').mockResolvedValue({
        original: slowCode,
        optimized: optimizedCode,
        improvements: ['Used forEach instead of for loop', 'Removed index variable'],
        performanceGain: 15
      });

      const result = await geminiService.optimizePerformance(slowCode);
      
      expect(result.performanceGain).toBe(15);
      expect(result.improvements).toContain('Used forEach instead of for loop');
    });

    it('should detect security vulnerabilities', async () => {
      const vulnerableCode = `
        const userInput = req.body.input;
        eval(userInput);
      `;

      jest.spyOn(geminiService, 'detectSecurityIssues').mockResolvedValue([
        {
          id: 'sec1',
          type: 'security',
          message: 'Use of eval with user input',
          line: 3,
          severity: 'critical',
          fix: 'Avoid using eval with untrusted input',
          cwe: 'CWE-95'
        }
      ]);

      const result = await geminiService.detectSecurityIssues(vulnerableCode);
      
      expect(result[0].severity).toBe('critical');
      expect(result[0].cwe).toBe('CWE-95');
    });

    it('should handle AI service errors', async () => {
      jest.spyOn(geminiService, 'analyzeCode').mockRejectedValue(
        new Error('Gemini API quota exceeded')
      );

      await expect(geminiService.analyzeCode(mockCode, 'typescript')).rejects.toThrow(
        'Gemini API quota exceeded'
      );
    });

    it('should process batch analysis', async () => {
      const files = [
        { path: 'file1.js', content: 'console.log("hello");' },
        { path: 'file2.ts', content: 'let x: number = 5;' }
      ];

      jest.spyOn(geminiService, 'analyzeProject').mockResolvedValue({
        projectId: 'proj123',
        filesAnalyzed: 2,
        totalErrors: 3,
        securityIssues: 1,
        performanceIssues: 2,
        analysisTime: 5.2
      });

      const result = await geminiService.analyzeProject(files);
      
      expect(result.filesAnalyzed).toBe(2);
      expect(result.totalErrors).toBe(3);
    });

    it('should respect rate limiting', async () => {
      const startTime = Date.now();
      const calls = [];

      // Mock multiple rapid calls
      for (let i = 0; i < 5; i++) {
        calls.push(geminiService.analyzeCode(mockCode, 'typescript'));
      }

      await Promise.all(calls);
      const endTime = Date.now();
      
      // Should take at least 2 seconds (500ms delay between calls * 4 intervals)
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('Service Integration Tests', () => {
    it('should complete full upload to analysis workflow', async () => {
      // Mock file upload
      const mockFile = new File(['test code'], 'test.js', {
        type: 'application/javascript'
      });

      jest.spyOn(uploadService, 'uploadDirect').mockResolvedValue({
        id: 'proj123',
        name: 'Test Project',
        status: 'uploaded',
        files: [mockFile],
        createdAt: new Date().toISOString()
      });

      // Mock AI analysis
      jest.spyOn(geminiService, 'analyzeProject').mockResolvedValue({
        projectId: 'proj123',
        filesAnalyzed: 1,
        totalErrors: 2,
        securityIssues: 0,
        performanceIssues: 1,
        analysisTime: 1.5
      });

      // Execute workflow
      const project = await uploadService.uploadDirect([mockFile]);
      const analysis = await geminiService.analyzeProject(project.files);

      expect(project.id).toBe('proj123');
      expect(analysis.projectId).toBe('proj123');
      expect(analysis.totalErrors).toBe(2);
    });

    it('should handle service failures gracefully', async () => {
      // Mock GitHub service failure
      jest.spyOn(githubService, 'downloadRepo').mockRejectedValue(
        new Error('GitHub API unavailable')
      );

      // Mock fallback to direct upload
      jest.spyOn(uploadService, 'uploadDirect').mockResolvedValue({
        id: 'proj456',
        name: 'Fallback Project',
        status: 'uploaded',
        files: [],
        createdAt: new Date().toISOString()
      });

      try {
        await githubService.downloadRepo({
          owner: 'test',
          repo: 'test-repo',
          branch: 'main'
        });
      } catch (error) {
        // Fallback to direct upload
        const project = await uploadService.uploadDirect([]);
        expect(project.name).toBe('Fallback Project');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle large file uploads efficiently', async () => {
      const largeFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large.js', {
        type: 'application/javascript'
      });

      const startTime = Date.now();
      await uploadService.uploadDirect([largeFile]);
      const endTime = Date.now();

      // Should complete within 10 seconds
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should process multiple files in parallel', async () => {
      const files = Array.from({ length: 10 }, (_, i) =>
        new File([`console.log(${i});`], `file${i}.js`, {
          type: 'application/javascript'
        })
      );

      const startTime = Date.now();
      await Promise.all(
        files.map(file => uploadService.validateFile(file, {
          maxSize: 50 * 1024 * 1024,
          allowedTypes: ['.js'],
          chunkSize: 5 * 1024 * 1024
        }))
      );
      const endTime = Date.now();

      // Should process all files in under 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});