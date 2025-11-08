// index.ts - CodeGuardian Pro Main Entry Point and Exports

// React and Next.js
export { default as React } from 'react';
export { default as Next } from 'next';

// Core Components
export { default as LandingPage } from './LandingPage';
export { default as AuthPage } from './AuthPage';
export { default as UploadPage } from './UploadPage';
export { default as Dashboard } from './Dashboard';
export { default as Processing } from './Processing';
export { default as ResultsPage } from './ResultsPage';
export { default as HistoryPage } from './HistoryPage';
export { default as SettingsPage } from './SettingsPage';
export { default as Navbar } from './Navbar';
export { default as Footer } from './Footer';
export { default as ProjectCard } from './ProjectCard';
export { default as UploadOptions } from './UploadOptions';
export { default as ProgressBar } from './ProgressBar';
export { default as CodeEditor } from './CodeEditor';
export { default as ErrorList } from './ErrorList';
export { default as AdSenseAd } from './AdSenseAd';

// Service Exports
export { default as githubService, GitHubService } from './githubService';
export { default as googleDriveService, GoogleDriveService } from './googleDriveService';
export { default as uploadService, UploadService } from './uploadService';
export { default as geminiService, GeminiService } from './geminiService';

// Type Exports
export type { 
  // GitHub Service Types
  GitHubUser,
  GitHubRepository,
  GitHubFile,
  GitHubTree,
  GitHubCommit,
  GitHubWebhook,
  
  // Google Drive Service Types
  GoogleDriveFile,
  GoogleDriveFolder,
  GoogleDriveUser,
  DriveFileContent,
  FolderStructure,
  
  // Upload Service Types
  UploadProgress,
  UploadFile,
  UploadProject,
  UploadOptions as UploadServiceOptions,
  GitHubUploadParams,
  GoogleDriveUploadParams,
  URLUploadParams,
  UploadResult,
  
  // Gemini Service Types
  CodeIssue,
  CodeAnalysis,
  CodeFix,
  ProjectAnalysis,
  AnalysisOptions
} from './types';

// Utility Functions
export * from './utils/helpers';
export * from './utils/constants';
export * from './utils/validators';

// Configuration
export { default as appConfig } from './config/app';
export { default as themeConfig } from './config/theme';

// Hooks
export { default as useAuth } from './hooks/useAuth';
export { default as useUpload } from './hooks/useUpload';
export { default as useAnalysis } from './hooks/useAnalysis';
export { default as useProjects } from './hooks/useProjects';
export { default as useLocalStorage } from './hooks/useLocalStorage';
export { default as useDebounce } from './hooks/useDebounce';

// Constants
export const APP_NAME = 'CodeGuardian Pro';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-Powered Complete Project Debugging Platform';

// Environment Variables (Public)
export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
} as const;

// Feature Flags
export const FEATURES = {
  GITHUB_INTEGRATION: true,
  GOOGLE_DRIVE_INTEGRATION: true,
  AI_ANALYSIS: true,
  ADSENSE_MONETIZATION: true,
  USER_AUTHENTICATION: true,
  PROJECT_HISTORY: true,
  REAL_TIME_PROCESSING: true,
  CODE_COMPARISON: true,
  MULTI_FILE_UPLOAD: true,
  BATCH_ANALYSIS: true,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    GITHUB: '/api/auth/github',
    GOOGLE: '/api/auth/google',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
  },
  PROJECTS: {
    CREATE: '/api/projects',
    LIST: '/api/projects',
    GET: (id: string) => `/api/projects/${id}`,
    UPDATE: (id: string) => `/api/projects/${id}`,
    DELETE: (id: string) => `/api/projects/${id}`,
    ANALYZE: (id: string) => `/api/projects/${id}/analyze`,
    DOWNLOAD: (id: string) => `/api/projects/${id}/download`,
  },
  UPLOAD: {
    GITHUB: '/api/upload/github',
    GOOGLE_DRIVE: '/api/upload/google-drive',
    DIRECT: '/api/upload/direct',
    ZIP: '/api/upload/zip',
    URL: '/api/upload/url',
  },
  ANALYSIS: {
    STATUS: (id: string) => `/api/analysis/${id}/status`,
    RESULTS: (id: string) => `/api/analysis/${id}/results`,
  },
  USER: {
    PROFILE: '/api/user/profile',
    HISTORY: '/api/user/history',
    SETTINGS: '/api/user/settings',
  },
} as const;

// Supported Languages for Analysis
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'go',
  'rust',
  'swift',
  'kotlin',
  'scala',
  'html',
  'css',
  'scss',
  'less',
  'json',
  'xml',
  'yaml',
  'markdown',
  'text',
] as const;

// Error Severity Levels
export const ERROR_SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

// Error Types
export const ERROR_TYPES = {
  SYNTAX: 'syntax',
  LOGICAL: 'logical',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  STYLE: 'style',
  TYPE: 'type',
  DEPENDENCY: 'dependency',
} as const;

// Project Status Types
export const PROJECT_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  QUEUED: 'queued',
} as const;

// Upload Types
export const UPLOAD_TYPES = {
  GITHUB: 'github',
  GOOGLE_DRIVE: 'google-drive',
  DIRECT: 'direct',
  ZIP: 'zip',
  URL: 'url',
} as const;

// Theme Constants
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
} as const;

// Default Configuration
export const DEFAULT_CONFIG = {
  UPLOAD: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_TOTAL_SIZE: 500 * 1024 * 1024, // 500MB
    ALLOWED_FILE_TYPES: [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
      '.html', '.css', '.scss', '.less', '.sass', '.json', '.xml',
      '.yaml', '.yml', '.md', '.txt', '.sh', '.bash', '.ps1',
      '.sql', '.graphql', '.gql', '.vue', '.svelte', '.elm',
    ],
    CONCURRENT_UPLOADS: 3,
    CHUNK_SIZE: 1024 * 1024, // 1MB
  },
  ANALYSIS: {
    TIMEOUT: 5 * 60 * 1000, // 5 minutes
    MAX_FILES_PER_BATCH: 10,
    MAX_ISSUES_PER_FILE: 50,
  },
  UI: {
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 5000,
    LOADING_DELAY: 1000,
  },
} as const;

// Utility Functions for the App
export const utils = {
  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Generate unique ID
  generateId: (): string => {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Debounce function
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    };
  },

  // Copy to clipboard
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch (fallbackError) {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  },

  // Validate email
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Sanitize filename
  sanitizeFilename: (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  },

  // Get file extension
  getFileExtension: (filename: string): string => {
    return filename.toLowerCase().split('.').pop() || '';
  },

  // Check if file is code file
  isCodeFile: (filename: string): boolean => {
    const codeExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h',
      'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala',
      'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml',
      'md', 'txt', 'sh', 'bash', 'ps1', 'sql', 'graphql', 'gql',
      'vue', 'svelte', 'elm'
    ];
    const extension = utils.getFileExtension(filename);
    return codeExtensions.includes(extension);
  },

  // Calculate progress percentage
  calculateProgress: (loaded: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((loaded / total) * 100);
  },

  // Format date
  formatDate: (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  // Format time
  formatTime: (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Get relative time
  getRelativeTime: (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return utils.formatDate(d);
  },

  // Truncate text
  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  // Generate random color
  generateColor: (): string => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // Check if mobile device
  isMobile: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  },

  // Open in new tab
  openInNewTab: (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  // Download file
  downloadFile: (content: string, filename: string, type: string = 'text/plain'): void => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// Main App Initialization
export const initializeApp = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if all required environment variables are set
    const requiredEnvVars = [
      'NEXT_PUBLIC_GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GEMINI_API_KEY',
      'NEXT_PUBLIC_APP_URL',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('Missing environment variables:', missingVars);
      return {
        success: false,
        message: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    // Initialize services
    const services = [
      { name: 'GitHub Service', check: () => githubService.healthCheck() },
      { name: 'Google Drive Service', check: () => googleDriveService.healthCheck() },
      { name: 'Gemini AI Service', check: () => geminiService.healthCheck() },
    ];

    for (const service of services) {
      try {
        const health = await service.check();
        if (!health.healthy) {
          console.warn(`${service.name} health check failed:`, health.message);
        }
      } catch (error) {
        console.warn(`${service.name} initialization failed:`, error);
      }
    }

    return {
      success: true,
      message: 'CodeGuardian Pro initialized successfully'
    };

  } catch (error) {
    console.error('App initialization failed:', error);
    return {
      success: false,
      message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Default export for the entire application
const CodeGuardianPro = {
  // Components
  components: {
    LandingPage,
    AuthPage,
    UploadPage,
    Dashboard,
    Processing,
    ResultsPage,
    HistoryPage,
    SettingsPage,
    Navbar,
    Footer,
    ProjectCard,
    UploadOptions,
    ProgressBar,
    CodeEditor,
    ErrorList,
    AdSenseAd,
  },

  // Services
  services: {
    githubService,
    googleDriveService,
    uploadService,
    geminiService,
  },

  // Utilities
  utils,

  // Configuration
  config: {
    APP_NAME,
    APP_VERSION,
    APP_DESCRIPTION,
    ENV,
    FEATURES,
    API_ENDPOINTS,
    SUPPORTED_LANGUAGES,
    ERROR_SEVERITY,
    ERROR_TYPES,
    PROJECT_STATUS,
    UPLOAD_TYPES,
    THEMES,
    DEFAULT_CONFIG,
  },

  // Initialization
  initializeApp,
};

export default CodeGuardianPro;

// Quick start helper
export const createCodeGuardianApp = () => {
  return CodeGuardianPro;
};

// Type exports for the entire library
export type CodeGuardianApp = typeof CodeGuardianPro;
export type { default as LandingPageProps } from './LandingPage';
export type { default as AuthPageProps } from './AuthPage';
export type { default as UploadPageProps } from './UploadPage';
export type { default as DashboardProps } from './Dashboard';
export type { default as ProcessingProps } from './Processing';
export type { default as ResultsPageProps } from './ResultsPage';
export type { default as HistoryPageProps } from './HistoryPage';
export type { default as SettingsPageProps } from './SettingsPage';
export type { default as ProjectCardProps } from './ProjectCard';
export type { default as UploadOptionsProps } from './UploadOptions';
export type { default as ProgressBarProps } from './ProgressBar';
export type { default as CodeEditorProps } from './CodeEditor';
export type { default as ErrorListProps } from './ErrorList';
export type { default as AdSenseAdProps } from './AdSenseAd';