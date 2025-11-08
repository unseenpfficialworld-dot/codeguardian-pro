CodeGuardian Pro - API Documentation

Overview

CodeGuardian Pro provides a comprehensive REST API for AI-powered code analysis and debugging. All API endpoints are authenticated and return JSON responses.

Base URL: https://api.codeguardian.pro/v1

Authentication

GitHub OAuth Flow

```http
POST /auth/github
Content-Type: application/json

{
  "code": "github_oauth_code"
}
```

Response:

```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://avatars.githubusercontent.com/u/123"
  }
}
```

Google OAuth Flow

```http
POST /auth/google
Content-Type: application/json

{
  "code": "google_oauth_code"
}
```

Response: Same structure as GitHub OAuth response.

Refresh Token

```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

Project Management

Create Project

```http
POST /projects
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "language": "typescript",
  "settings": {
    "enableSecurityScan": true,
    "enablePerformanceCheck": true,
    "analysisDepth": "deep"
  }
}
```

Response:

```json
{
  "project": {
    "id": "proj_123",
    "name": "My Project",
    "description": "Project description",
    "status": "created",
    "language": "typescript",
    "settings": {
      "enableSecurityScan": true,
      "enablePerformanceCheck": true,
      "analysisDepth": "deep"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

List Projects

```http
GET /projects
Authorization: Bearer <access_token>
Query Parameters:
  page: 1 (optional)
  limit: 20 (optional)
  status: "completed" (optional)
  sort: "newest" (optional)
```

Response:

```json
{
  "projects": [
    {
      "id": "proj_123",
      "name": "My Project",
      "status": "completed",
      "errorCount": 5,
      "fileCount": 12,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

Get Project Details

```http
GET /projects/{projectId}
Authorization: Bearer <access_token>
```

Response:

```json
{
  "project": {
    "id": "proj_123",
    "name": "My Project",
    "description": "Project description",
    "status": "completed",
    "language": "typescript",
    "files": [
      {
        "id": "file_123",
        "name": "index.ts",
        "path": "src/index.ts",
        "size": 1024,
        "language": "typescript"
      }
    ],
    "settings": {
      "enableSecurityScan": true,
      "enablePerformanceCheck": true,
      "analysisDepth": "deep"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:45:00Z"
  }
}
```

Update Project

```http
PUT /projects/{projectId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description",
  "settings": {
    "enableSecurityScan": false
  }
}
```

Delete Project

```http
DELETE /projects/{projectId}
Authorization: Bearer <access_token>
```

File Upload

Direct File Upload

```http
POST /upload/direct
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Body:
- projectId: proj_123 (optional, creates new project if not provided)
- files: [file1, file2, ...] (required)
```

Response:

```json
{
  "projectId": "proj_123",
  "uploadedFiles": [
    {
      "id": "file_123",
      "name": "index.ts",
      "path": "src/index.ts",
      "size": 1024,
      "language": "typescript",
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalSize": 2048,
  "fileCount": 2
}
```

GitHub Repository Upload

```http
POST /upload/github
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "repoUrl": "https://github.com/username/repo",
  "branch": "main",
  "includeSubmodules": false,
  "projectId": "proj_123" (optional)
}
```

Response:

```json
{
  "projectId": "proj_123",
  "repoInfo": {
    "name": "repository-name",
    "owner": "username",
    "branch": "main",
    "description": "Repository description",
    "language": "TypeScript"
  },
  "downloadedFiles": 45,
  "totalSize": 156789
}
```

Google Drive Upload

```http
POST /upload/google-drive
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fileId": "google_drive_file_id",
  "fileName": "project.zip",
  "projectId": "proj_123" (optional)
}
```

ZIP File Upload

```http
POST /upload/zip
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Body:
- zipFile: file (required)
- projectId: proj_123 (optional)
- extractPath: "src" (optional)
```

URL Import

```http
POST /upload/url
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "projectUrl": "https://example.com/project-source",
  "projectName": "Imported Project"
}
```

AI Analysis

Start Analysis

```http
POST /analyze/{projectId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "analysisType": "full", // "quick", "full", "security", "performance"
  "priority": "normal" // "low", "normal", "high"
}
```

Response:

```json
{
  "analysisId": "analysis_123",
  "projectId": "proj_123",
  "status": "started",
  "estimatedTime": 120, // seconds
  "startedAt": "2024-01-15T10:30:00Z"
}
```

Get Analysis Status

```http
GET /analyze/{projectId}/status
Authorization: Bearer <access_token>
```

Response:

```json
{
  "analysisId": "analysis_123",
  "projectId": "proj_123",
  "status": "processing", // "queued", "processing", "completed", "failed"
  "progress": 65,
  "currentStage": "security_analysis",
  "filesProcessed": 23,
  "totalFiles": 35,
  "errorsFound": 12,
  "startedAt": "2024-01-15T10:30:00Z",
  "estimatedCompletion": "2024-01-15T10:32:00Z"
}
```

Get Analysis Results

```http
GET /analyze/{projectId}/results
Authorization: Bearer <access_token>
```

Response:

```json
{
  "results": {
    "summary": {
      "totalFiles": 35,
      "filesAnalyzed": 35,
      "totalErrors": 15,
      "criticalErrors": 2,
      "warnings": 8,
      "suggestions": 5,
      "analysisTime": 45.2
    },
    "errors": [
      {
        "id": "error_123",
        "type": "syntax",
        "severity": "error", // "info", "warning", "error", "critical"
        "message": "Missing semicolon",
        "file": "src/index.ts",
        "line": 15,
        "column": 5,
        "codeSnippet": "console.log('hello world')",
        "fix": "Add semicolon at end of line",
        "fixedCode": "console.log('hello world');",
        "explanation": "JavaScript requires semicolons to terminate statements.",
        "category": "syntax" // "security", "performance", "logic", "style"
      }
    ],
    "metrics": {
      "codeQualityScore": 85,
      "securityScore": 92,
      "performanceScore": 78,
      "maintainabilityScore": 88
    },
    "optimizations": [
      {
        "type": "performance",
        "description": "Use const instead of let for unchanged variables",
        "impact": "medium",
        "filesAffected": ["src/utils.ts"]
      }
    ]
  }
}
```

Cancel Analysis

```http
POST /analyze/{projectId}/cancel
Authorization: Bearer <access_token>
```

Download

Download Fixed Project

```http
GET /download/{projectId}
Authorization: Bearer <access_token>
```

Response: ZIP file containing the fixed project

Download Analysis Report

```http
GET /download/{projectId}/report
Authorization: Bearer <access_token>
Query Parameters:
  format: "pdf" | "html" | "json" (default: "pdf")
```

Response: Analysis report in requested format

Download Specific File

```http
GET /download/{projectId}/file/{fileId}
Authorization: Bearer <access_token>
```

Response: Individual file content

User Management

Get User Profile

```http
GET /user/profile
Authorization: Bearer <access_token>
```

Response:

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://avatars.githubusercontent.com/u/123",
    "preferences": {
      "theme": "dark",
      "language": "en",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "usage": {
      "projectsCreated": 15,
      "filesAnalyzed": 234,
      "totalAnalysisTime": 4567
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

Update User Profile

```http
PUT /user/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "preferences": {
    "theme": "light",
    "language": "es"
  }
}
```

Get User History

```http
GET /user/history
Authorization: Bearer <access_token>
Query Parameters:
  page: 1 (optional)
  limit: 50 (optional)
  type: "project" | "analysis" (optional)
```

Analytics

Track User Event

```http
POST /analytics/track
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "event": "project_created",
  "properties": {
    "project_id": "proj_123",
    "file_count": 12,
    "language": "typescript"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Get Analytics Dashboard

```http
GET /analytics/dashboard
Authorization: Bearer <access_token>
```

Response:

```json
{
  "overview": {
    "totalProjects": 45,
    "projectsThisMonth": 12,
    "totalAnalysis": 156,
    "successRate": 94.5
  },
  "recentActivity": [
    {
      "type": "project_created",
      "projectId": "proj_123",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "languageStats": {
    "TypeScript": 35,
    "JavaScript": 25,
    "Python": 15,
    "Java": 10,
    "Other": 15
  }
}
```

Error Handling

All API endpoints use standard HTTP status codes:

· 200 - Success
· 201 - Created
· 400 - Bad Request
· 401 - Unauthorized
· 403 - Forbidden
· 404 - Not Found
· 429 - Rate Limit Exceeded
· 500 - Internal Server Error

Error Response Format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Email is required"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

Rate Limiting

· Unauthenticated: 100 requests per hour
· Authenticated: 1000 requests per hour
· File Upload: 10 uploads per hour
· AI Analysis: 5 concurrent analyses per user

Rate Limit Headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642231800
```

Webhooks

Webhook Events

· project.created
· analysis.started
· analysis.completed
· analysis.failed
· project.deleted

Webhook Payload

```json
{
  "event": "analysis.completed",
  "data": {
    "projectId": "proj_123",
    "analysisId": "analysis_123",
    "status": "completed",
    "errorCount": 5,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "signature": "webhook_signature"
}
```

SDK Examples

JavaScript/TypeScript

```typescript
import { CodeGuardianClient } from '@codeguardian/sdk';

const client = new CodeGuardianClient({
  apiKey: 'your_api_key',
  baseURL: 'https://api.codeguardian.pro/v1'
});

// Upload and analyze project
const project = await client.projects.create({
  name: 'My Project',
  language: 'typescript'
});

const analysis = await client.analysis.start(project.id);
const results = await client.analysis.results(project.id);
```

Python

```python
from codeguardian import Client

client = Client(api_key='your_api_key')

project = client.projects.create(
    name='My Project',
    language='python'
)

analysis = client.analysis.start(project['id'])
results = client.analysis.results(project['id'])
```

Support

For API support, contact:

· Email: api-support@codeguardian.pro
· Documentation: https://docs.codeguardian.pro
· Status: https://status.codeguardian.pro

---

Last Updated: January 15, 2024
API Version: v1.0.0