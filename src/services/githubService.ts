import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
  email: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  private: boolean;
  fork: boolean;
  language: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  default_branch: string;
  pushed_at: string;
  updated_at: string;
  owner: {
    login: string;
    id: number;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
}

export interface GitHubWebhook {
  id: number;
  type: string;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: string;
  };
}

class GitHubService {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeGuardian-Pro-App'
      }
    });

    // Add request interceptor to include access token
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `token ${this.accessToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('GitHub API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  // OAuth Methods
  getOAuthUrl(): string {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/github/callback`;
    const scope = 'user:email,repo,read:org';
    
    return `https://github.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
    const response = await axios.post(
      'https://github.com/oauth/access_token',
      {
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/github/callback`
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  // User Methods
  async getCurrentUser(): Promise<GitHubUser> {
    const response: AxiosResponse<GitHubUser> = await this.client.get('/user');
    return response.data;
  }

  async getUserRepositories(): Promise<GitHubRepository[]> {
    const response: AxiosResponse<GitHubRepository[]> = await this.client.get('/user/repos', {
      params: {
        sort: 'updated',
        per_page: 100
      }
    });
    return response.data;
  }

  async getUserStarredRepositories(): Promise<GitHubRepository[]> {
    const response: AxiosResponse<GitHubRepository[]> = await this.client.get('/user/starred', {
      params: {
        per_page: 100
      }
    });
    return response.data;
  }

  // Repository Methods
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const response: AxiosResponse<GitHubRepository> = await this.client.get(`/repos/${owner}/${repo}`);
    return response.data;
  }

  async getRepositoryContent(owner: string, repo: string, path: string = ''): Promise<GitHubFile[]> {
    const response: AxiosResponse<GitHubFile[]> = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`);
    return response.data;
  }

  async getRepositoryTree(owner: string, repo: string, branch: string = 'main'): Promise<GitHubTree> {
    const response: AxiosResponse<GitHubTree> = await this.client.get(`/repos/${owner}/${repo}/git/trees/${branch}`, {
      params: {
        recursive: '1'
      }
    });
    return response.data;
  }

  async getFileContent(owner: string, repo: string, path: string, ref: string = 'main'): Promise<string> {
    const response: AxiosResponse<GitHubFile> = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`, {
      params: {
        ref
      }
    });

    if (response.data.content && response.data.encoding === 'base64') {
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    }

    throw new Error('Unable to decode file content');
  }

  async downloadRepository(owner: string, repo: string, branch: string = 'main'): Promise<Blob> {
    const response: AxiosResponse<Blob> = await this.client.get(`/repos/${owner}/${repo}/zipball/${branch}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getRepositoryBranches(owner: string, repo: string): Promise<any[]> {
    const response: AxiosResponse<any[]> = await this.client.get(`/repos/${owner}/${repo}/branches`);
    return response.data;
  }

  async getRepositoryCommits(owner: string, repo: string, branch: string = 'main', limit: number = 10): Promise<GitHubCommit[]> {
    const response: AxiosResponse<GitHubCommit[]> = await this.client.get(`/repos/${owner}/${repo}/commits`, {
      params: {
        sha: branch,
        per_page: limit
      }
    });
    return response.data;
  }

  // Search Methods
  async searchRepositories(query: string, limit: number = 10): Promise<GitHubRepository[]> {
    const response = await this.client.get('/search/repositories', {
      params: {
        q: query,
        per_page: limit,
        sort: 'updated'
      }
    });
    return response.data.items;
  }

  async searchCode(owner: string, repo: string, query: string): Promise<any[]> {
    const response = await this.client.get('/search/code', {
      params: {
        q: `${query} repo:${owner}/${repo}`
      }
    });
    return response.data.items;
  }

  // Repository Management
  async createRepository(name: string, description: string = '', isPrivate: boolean = false): Promise<GitHubRepository> {
    const response: AxiosResponse<GitHubRepository> = await this.client.post('/user/repos', {
      name,
      description,
      private: isPrivate,
      auto_init: true
    });
    return response.data;
  }

  async createFile(owner: string, repo: string, path: string, content: string, message: string = 'Create file'): Promise<any> {
    const response = await this.client.put(`/repos/${owner}/${repo}/contents/${path}`, {
      message,
      content: Buffer.from(content).toString('base64')
    });
    return response.data;
  }

  async createPullRequest(owner: string, repo: string, title: string, head: string, base: string = 'main', body: string = ''): Promise<any> {
    const response = await this.client.post(`/repos/${owner}/${repo}/pulls`, {
      title,
      head,
      base,
      body
    });
    return response.data;
  }

  // Webhook Methods
  async createWebhook(owner: string, repo: string, webhookUrl: string, events: string[] = ['push']): Promise<GitHubWebhook> {
    const response: AxiosResponse<GitHubWebhook> = await this.client.post(`/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      active: true,
      events,
      config: {
        url: webhookUrl,
        content_type: 'json'
      }
    });
    return response.data;
  }

  async getWebhooks(owner: string, repo: string): Promise<GitHubWebhook[]> {
    const response: AxiosResponse<GitHubWebhook[]> = await this.client.get(`/repos/${owner}/${repo}/hooks`);
    return response.data;
  }

  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.client.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  }

  // Rate Limit Methods
  async getRateLimit(): Promise<any> {
    const response = await this.client.get('/rate_limit');
    return response.data;
  }

  // Utility Methods
  async validateRepositoryAccess(owner: string, repo: string): Promise<boolean> {
    try {
      await this.getRepository(owner, repo);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRepositoryLanguages(owner: string, repo: string): Promise<{ [key: string]: number }> {
    const response = await this.client.get(`/repos/${owner}/${repo}/languages`);
    return response.data;
  }

  async getRepositoryContributors(owner: string, repo: string): Promise<any[]> {
    const response = await this.client.get(`/repos/${owner}/${repo}/contributors`);
    return response.data;
  }

  // Batch Operations
  async downloadEntireRepository(owner: string, repo: string, branch: string = 'main'): Promise<{ [filePath: string]: string }> {
    const tree = await this.getRepositoryTree(owner, repo, branch);
    const files: { [filePath: string]: string } = {};

    const fileItems = tree.tree.filter(item => item.type === 'blob');
    
    // Process files in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < fileItems.length; i += batchSize) {
      const batch = fileItems.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        try {
          const content = await this.getFileContent(owner, repo, item.path, branch);
          files[item.path] = content;
        } catch (error) {
          console.warn(`Failed to download file: ${item.path}`, error);
          files[item.path] = `// Error: Could not load file content\n// Path: ${item.path}`;
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches to be respectful of rate limits
      if (i + batchSize < fileItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return files;
  }

  // Repository Analysis
  async analyzeRepositoryStructure(owner: string, repo: string): Promise<{
    totalFiles: number;
    totalSize: number;
    languages: { [key: string]: number };
    fileTypes: { [key: string]: number };
    mainBranch: string;
  }> {
    const [repoInfo, tree, languages] = await Promise.all([
      this.getRepository(owner, repo),
      this.getRepositoryTree(owner, repo),
      this.getRepositoryLanguages(owner, repo)
    ]);

    const fileTypes: { [key: string]: number } = {};
    let totalSize = 0;

    tree.tree.forEach(item => {
      if (item.type === 'blob' && item.size) {
        const extension = item.path.split('.').pop() || 'unknown';
        fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        totalSize += item.size;
      }
    });

    return {
      totalFiles: tree.tree.filter(item => item.type === 'blob').length,
      totalSize,
      languages,
      fileTypes,
      mainBranch: repoInfo.default_branch
    };
  }
}

// Create singleton instance
export const githubService = new GitHubService();

export default GitHubService;