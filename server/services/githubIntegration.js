// server/services/githubIntegration.js
const { Octokit } = require('@octokit/rest');
const { request } = require('@octokit/request');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class GitHubIntegrationService {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_PAT, // Personal Access Token for app-level operations
      userAgent: 'CodeGuardian Pro v1.0',
      timeZone: 'UTC',
      log: {
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error
      }
    });

    this.rateLimit = {
      remaining: 5000,
      reset: 0,
      used: 0
    };

    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Health check for GitHub API
   */
  async healthCheck() {
    try {
      const response = await this.octokit.rest.meta.get();
      this.updateRateLimit(response.headers);
      
      return {
        healthy: true,
        message: 'GitHub API is accessible',
        rateLimit: this.rateLimit,
        githubLimits: response.data
      };
    } catch (error) {
      console.error('GitHub API health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        rateLimit: this.rateLimit
      };
    }
  }

  /**
   * Get authenticated user's repositories
   */
  async getUserRepositories(accessToken, options = {}) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const params = {
        sort: 'updated',
        direction: 'desc',
        per_page: options.perPage || 100,
        page: options.page || 1
      };

      if (options.visibility) {
        params.visibility = options.visibility;
      }

      if (options.affiliation) {
        params.affiliation = options.affiliation;
      }

      const response = await userOctokit.rest.repos.listForAuthenticatedUser(params);
      this.updateRateLimit(response.headers);

      const repositories = response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        private: repo.private,
        fork: repo.fork,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        size: repo.size,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        pushedAt: repo.pushed_at,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        language: repo.language,
        topics: repo.topics || []
      }));

      return {
        success: true,
        repositories: repositories,
        pagination: this.parsePagination(response.headers),
        totalCount: response.data.length
      };

    } catch (error) {
      console.error('Error fetching user repositories:', error);
      return {
        success: false,
        error: this.normalizeGitHubError(error),
        repositories: []
      };
    }
  }

  /**
   * Get repository details
   */
  async getRepository(accessToken, owner, repo) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      const response = await userOctokit.rest.repos.get({ owner, repo });
      this.updateRateLimit(response.headers);

      const repository = response.data;

      return {
        success: true,
        repository: {
          id: repository.id,
          name: repository.name,
          fullName: repository.full_name,
          owner: repository.owner.login,
          description: repository.description,
          private: repository.private,
          url: repository.html_url,
          cloneUrl: repository.clone_url,
          defaultBranch: repository.default_branch,
          size: repository.size,
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          openIssues: repository.open_issues_count,
          pushedAt: repository.pushed_at,
          createdAt: repository.created_at,
          updatedAt: repository.updated_at,
          language: repository.language,
          topics: repository.topics || [],
          permissions: repository.permissions,
          license: repository.license
        }
      };

    } catch (error) {
      console.error(`Error fetching repository ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error)
      };
    }
  }

  /**
   * Get repository tree (file structure)
   */
  async getRepositoryTree(accessToken, owner, repo, options = {}) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const branch = options.branch || 'main';
      const recursive = options.recursive !== false;

      // First, get the branch to get the latest commit SHA
      const branchResponse = await userOctokit.rest.repos.getBranch({
        owner,
        repo,
        branch
      });

      const treeResponse = await userOctokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branchResponse.data.commit.sha,
        recursive: recursive ? '1' : undefined
      });

      this.updateRateLimit(treeResponse.headers);

      const tree = this.buildFileTree(treeResponse.data.tree, options.filter);

      return {
        success: true,
        tree: tree,
        sha: treeResponse.data.sha,
        totalFiles: treeResponse.data.tree.filter(item => item.type === 'blob').length,
        totalSize: this.calculateTreeSize(treeResponse.data.tree)
      };

    } catch (error) {
      console.error(`Error fetching repository tree for ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error),
        tree: []
      };
    }
  }

  /**
   * Download entire repository content
   */
  async downloadRepository(accessToken, owner, repo, branch = 'main', options = {}) {
    await this.checkRateLimit();

    const cacheKey = `repo_${owner}_${repo}_${branch}_${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      // Get repository tree recursively
      const treeResult = await this.getRepositoryTree(accessToken, owner, repo, {
        branch: branch,
        recursive: true,
        filter: options.filter
      });

      if (!treeResult.success) {
        throw new Error(treeResult.error);
      }

      const files = [];
      const maxFiles = options.maxFiles || 1000;
      const maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB
      let totalSize = 0;

      // Download file contents
      for (const item of treeResult.tree) {
        if (files.length >= maxFiles) break;
        if (totalSize >= maxSize) break;

        if (item.type === 'file' && this.isSupportedFile(item.path)) {
          try {
            const fileContent = await this.getFileContent(accessToken, owner, repo, item.path, branch);
            
            if (fileContent.success) {
              totalSize += fileContent.size;
              files.push({
                name: path.basename(item.path),
                path: item.path,
                content: fileContent.content,
                size: fileContent.size,
                language: this.detectFileLanguage(item.path),
                sha: fileContent.sha,
                downloadUrl: fileContent.downloadUrl
              });
            }

            // Small delay to avoid rate limiting
            await this.delay(100);
          } catch (fileError) {
            console.error(`Error downloading file ${item.path}:`, fileError);
            // Continue with other files
          }
        }
      }

      const result = {
        success: true,
        files: files,
        totalFiles: files.length,
        totalSize: totalSize,
        repository: `${owner}/${repo}`,
        branch: branch,
        tree: treeResult.tree
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

      return result;

    } catch (error) {
      console.error(`Error downloading repository ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error),
        files: []
      };
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(accessToken, owner, repo, path, ref = 'main') {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const response = await userOctokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      this.updateRateLimit(response.headers);

      if (Array.isArray(response.data)) {
        throw new Error('Path is a directory, not a file');
      }

      let content;
      if (response.data.encoding === 'base64') {
        content = Buffer.from(response.data.content, 'base64').toString('utf8');
      } else {
        content = response.data.content;
      }

      return {
        success: true,
        content: content,
        size: Buffer.from(content).length,
        sha: response.data.sha,
        path: response.data.path,
        name: path.basename(response.data.path),
        downloadUrl: response.data.download_url,
        language: this.detectFileLanguage(response.data.path)
      };

    } catch (error) {
      console.error(`Error fetching file content for ${owner}/${repo}/${path}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error)
      };
    }
  }

  /**
   * Search repositories by query
   */
  async searchRepositories(accessToken, query, options = {}) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const searchParams = {
        q: query,
        sort: options.sort || 'stars',
        order: options.order || 'desc',
        per_page: options.perPage || 30,
        page: options.page || 1
      };

      const response = await userOctokit.rest.search.repos(searchParams);
      this.updateRateLimit(response.headers);

      const repositories = response.data.items.map(item => ({
        id: item.id,
        name: item.name,
        fullName: item.full_name,
        owner: item.owner.login,
        description: item.description,
        private: item.private,
        url: item.html_url,
        cloneUrl: item.clone_url,
        defaultBranch: item.default_branch,
        size: item.size,
        stars: item.stargazers_count,
        forks: item.forks_count,
        openIssues: item.open_issues_count,
        pushedAt: item.pushed_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        language: item.language,
        score: item.score
      }));

      return {
        success: true,
        repositories: repositories,
        totalCount: response.data.total_count,
        pagination: this.parsePagination(response.headers)
      };

    } catch (error) {
      console.error('Error searching repositories:', error);
      return {
        success: false,
        error: this.normalizeGitHubError(error),
        repositories: []
      };
    }
  }

  /**
   * Get repository branches
   */
  async getRepositoryBranches(accessToken, owner, repo) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const response = await userOctokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      this.updateRateLimit(response.headers);

      const branches = response.data.map(branch => ({
        name: branch.name,
        protected: branch.protected,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url
        }
      }));

      return {
        success: true,
        branches: branches,
        defaultBranch: branches.find(b => b.name === 'main') || branches.find(b => b.name === 'master') || branches[0]
      };

    } catch (error) {
      console.error(`Error fetching branches for ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error),
        branches: []
      };
    }
  }

  /**
   * Get repository languages
   */
  async getRepositoryLanguages(accessToken, owner, repo) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const response = await userOctokit.rest.repos.listLanguages({
        owner,
        repo
      });

      this.updateRateLimit(response.headers);

      const languages = Object.entries(response.data).map(([name, bytes]) => ({
        name,
        bytes,
        percentage: (bytes / Object.values(response.data).reduce((a, b) => a + b, 0)) * 100
      }));

      return {
        success: true,
        languages: languages,
        primaryLanguage: languages[0]?.name || 'Unknown'
      };

    } catch (error) {
      console.error(`Error fetching languages for ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error),
        languages: []
      };
    }
  }

  /**
   * Get repository contributors
   */
  async getRepositoryContributors(accessToken, owner, repo) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const response = await userOctokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 50
      });

      this.updateRateLimit(response.headers);

      const contributors = response.data.map(contributor => ({
        login: contributor.login,
        id: contributor.id,
        avatarUrl: contributor.avatar_url,
        url: contributor.html_url,
        contributions: contributor.contributions,
        type: contributor.type
      }));

      return {
        success: true,
        contributors: contributors
      };

    } catch (error) {
      console.error(`Error fetching contributors for ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error),
        contributors: []
      };
    }
  }

  /**
   * Get repository README
   */
  async getRepositoryReadme(accessToken, owner, repo, ref = 'main') {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const response = await userOctokit.rest.repos.getReadme({
        owner,
        repo,
        ref
      });

      this.updateRateLimit(response.headers);

      let content;
      if (response.data.encoding === 'base64') {
        content = Buffer.from(response.data.content, 'base64').toString('utf8');
      } else {
        content = response.data.content;
      }

      return {
        success: true,
        content: content,
        name: response.data.name,
        path: response.data.path,
        sha: response.data.sha,
        size: response.data.size,
        downloadUrl: response.data.download_url
      };

    } catch (error) {
      console.error(`Error fetching README for ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error)
      };
    }
  }

  /**
   * Download repository as ZIP (using GitHub's archive link)
   */
  async downloadRepositoryArchive(accessToken, owner, repo, ref = 'main') {
    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      // Get the archive URL
      const archiveUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;
      
      // Download the ZIP file
      const response = await axios({
        method: 'GET',
        url: archiveUrl,
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'CodeGuardian Pro v1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        maxContentLength: 100 * 1024 * 1024, // 100MB
        timeout: 30000 // 30 seconds
      });

      return {
        success: true,
        zipData: response.data,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        fileName: `${owner}-${repo}-${ref}.zip`
      };

    } catch (error) {
      console.error(`Error downloading repository archive for ${owner}/${repo}:`, error);
      return {
        success: false,
        error: this.normalizeGitHubError(error)
      };
    }
  }

  /**
   * Validate GitHub repository URL
   */
  validateRepositoryUrl(url) {
    try {
      const regex = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(\.git)?\/?/;
      const match = url.match(regex);
      
      if (match) {
        return {
          valid: true,
          owner: match[1],
          repo: match[2].replace('.git', ''),
          url: `https://github.com/${match[1]}/${match[2].replace('.git', '')}`
        };
      }
      
      return { valid: false, error: 'Invalid GitHub repository URL' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(accessToken) {
    await this.checkRateLimit();

    try {
      const userOctokit = new Octokit({ auth: accessToken });
      
      const response = await userOctokit.rest.users.getAuthenticated();
      this.updateRateLimit(response.headers);

      const user = response.data;

      return {
        success: true,
        user: {
          login: user.login,
          id: user.id,
          avatarUrl: user.avatar_url,
          url: user.html_url,
          name: user.name,
          company: user.company,
          blog: user.blog,
          location: user.location,
          email: user.email,
          bio: user.bio,
          twitterUsername: user.twitter_username,
          publicRepos: user.public_repos,
          publicGists: user.public_gists,
          followers: user.followers,
          following: user.following,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          privateRepos: user.total_private_repos,
          ownedPrivateRepos: user.owned_private_repos
        }
      };

    } catch (error) {
      console.error('Error fetching user info:', error);
      return {
        success: false,
        error: this.normalizeGitHubError(error)
      };
    }
  }

  // Utility Methods

  /**
   * Build file tree structure from GitHub tree
   */
  buildFileTree(treeItems, filter = null) {
    const root = { name: '', type: 'directory', children: [] };
    
    treeItems.forEach(item => {
      if (item.type !== 'blob' && item.type !== 'tree') return;
      
      // Apply filter if provided
      if (filter && !this.matchesFilter(item.path, filter)) {
        return;
      }

      const parts = item.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1 && item.type === 'blob';

        let existing = current.children.find(child => child.name === part);
        
        if (!existing) {
          existing = {
            name: part,
            type: isFile ? 'file' : 'directory',
            path: parts.slice(0, i + 1).join('/'),
            ...(isFile && {
              sha: item.sha,
              size: item.size,
              mode: item.mode,
              language: this.detectFileLanguage(item.path)
            })
          };
          
          if (!isFile) {
            existing.children = [];
          }
          
          current.children.push(existing);
        }

        if (!isFile) {
          current = existing;
        }
      }
    });

    return this.sortTree(root).children;
  }

  /**
   * Sort tree alphabetically (directories first)
   */
  sortTree(node) {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      node.children.forEach(child => this.sortTree(child));
    }
    return node;
  }

  /**
   * Calculate total size of tree
   */
  calculateTreeSize(treeItems) {
    return treeItems
      .filter(item => item.type === 'blob')
      .reduce((total, item) => total + (item.size || 0), 0);
  }

  /**
   * Check if file is supported
   */
  isSupportedFile(filePath) {
    const supportedExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
      '.php', '.rb', '.go', '.rs', '.html', '.htm', '.css', '.scss', '.sass',
      '.less', '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.sql',
      '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd'
    ];
    
    const ext = path.extname(filePath).toLowerCase();
    return supportedExtensions.includes(ext);
  }

  /**
   * Detect file language from extension
   */
  detectFileLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'text',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.ps1': 'powershell',
      '.bat': 'batch',
      '.cmd': 'batch'
    };

    return languageMap[ext] || 'text';
  }

  /**
   * Check if path matches filter
   */
  matchesFilter(path, filter) {
    if (typeof filter === 'function') {
      return filter(path);
    }
    
    if (Array.isArray(filter)) {
      return filter.some(pattern => path.includes(pattern));
    }
    
    if (typeof filter === 'string') {
      return path.includes(filter);
    }
    
    return true;
  }

  /**
   * Update rate limit information from headers
   */
  updateRateLimit(headers) {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimit.remaining = parseInt(headers['x-ratelimit-remaining']);
      this.rateLimit.used = parseInt(headers['x-ratelimit-used'] || '0');
      this.rateLimit.reset = parseInt(headers['x-ratelimit-reset'] || '0');
    }
  }

  /**
   * Check rate limit and wait if necessary
   */
  async checkRateLimit() {
    if (this.rateLimit.remaining < 10) {
      const now = Math.floor(Date.now() / 1000);
      const waitTime = this.rateLimit.reset - now + 10; // Add 10 seconds buffer
      
      if (waitTime > 0) {
        console.warn(`GitHub rate limit nearly exceeded. Waiting ${waitTime} seconds...`);
        await this.delay(waitTime * 1000);
      }
    }
  }

  /**
   * Parse pagination information from headers
   */
  parsePagination(headers) {
    const linkHeader = headers.link;
    if (!linkHeader) return null;

    const links = {};
    linkHeader.split(',').forEach(part => {
      const section = part.split(';');
      if (section.length !== 2) return;
      
      const url = section[0].replace(/<(.*)>/, '$1').trim();
      const name = section[1].replace(/rel="(.*)"/, '$1').trim();
      links[name] = url;
    });

    return {
      first: links['first'],
      prev: links['prev'],
      next: links['next'],
      last: links['last']
    };
  }

  /**
   * Normalize GitHub API errors
   */
  normalizeGitHubError(error) {
    if (error.status === 404) {
      return 'Repository or resource not found';
    } else if (error.status === 403) {
      if (error.headers?.['x-ratelimit-remaining'] === '0') {
        return 'GitHub API rate limit exceeded';
      }
      return 'Access forbidden - check repository permissions';
    } else if (error.status === 401) {
      return 'Authentication failed - invalid or expired token';
    } else if (error.status === 422) {
      return 'Validation failed - check repository parameters';
    } else if (error.message) {
      return error.message;
    } else {
      return 'Unknown GitHub API error';
    }
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      rateLimit: this.rateLimit,
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create singleton instance
const githubService = new GitHubIntegrationService();

module.exports = { githubService, GitHubIntegrationService };