import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface CodeIssue {
  type: 'syntax' | 'logical' | 'security' | 'performance' | 'style' | 'type' | 'dependency';
  severity: 'high' | 'medium' | 'low';
  line: number;
  column?: number;
  message: string;
  suggestion: string;
  codeSnippet?: string;
  confidence: number;
}

export interface CodeAnalysis {
  filePath: string;
  language: string;
  issues: CodeIssue[];
  score: number;
  summary: string;
  metrics: {
    linesOfCode: number;
    complexity: number;
    maintainability: number;
  };
}

export interface CodeFix {
  originalCode: string;
  fixedCode: string;
  explanation: string;
  changes: Array<{
    line: number;
    original: string;
    fixed: string;
    reason: string;
  }>;
}

export interface ProjectAnalysis {
  projectId: string;
  files: CodeAnalysis[];
  overallScore: number;
  totalIssues: number;
  issueBreakdown: {
    [key in CodeIssue['type']]: number;
  };
  severityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
  generatedAt: Date;
}

export interface AnalysisOptions {
  language?: string;
  focusAreas?: CodeIssue['type'][];
  strictMode?: boolean;
  includeSuggestions?: boolean;
  maxIssuesPerFile?: number;
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isInitialized: boolean = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
      this.isInitialized = false;
    }
  }

  // Health Check
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    if (!this.isInitialized) {
      return { healthy: false, message: 'Gemini AI not initialized' };
    }

    try {
      const prompt = "Respond with 'OK' if you're working.";
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        message: error instanceof Error ? error.message : 'Health check failed' 
      };
    }
  }

  // Single File Analysis
  async analyzeCode(
    code: string, 
    filePath: string, 
    options: AnalysisOptions = {}
  ): Promise<CodeAnalysis> {
    if (!this.isInitialized) {
      throw new Error('Gemini AI not initialized');
    }

    const language = options.language || this.detectLanguage(filePath);
    const focusAreas = options.focusAreas || ['syntax', 'logical', 'security', 'performance', 'style'];

    const prompt = this.buildAnalysisPrompt(code, language, focusAreas, options.strictMode || false);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAnalysisResponse(text, filePath, language, code);
    } catch (error) {
      console.error('Error analyzing code:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch File Analysis
  async analyzeMultipleFiles(
    files: Array<{ path: string; content: string }>,
    options: AnalysisOptions = {}
  ): Promise<CodeAnalysis[]> {
    const analyses: CodeAnalysis[] = [];

    // Process files in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(file => 
        this.analyzeCode(file.content, file.path, options)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          analyses.push(result.value);
        } else {
          console.error(`Failed to analyze ${batch[index].path}:`, result.reason);
          // Push a failed analysis result
          analyses.push(this.createFailedAnalysis(batch[index].path, batch[index].content, result.reason));
        }
      });

      // Rate limiting delay
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return analyses;
  }

  // Project Analysis
  async analyzeProject(
    projectId: string,
    files: Array<{ path: string; content: string }>,
    options: AnalysisOptions = {}
  ): Promise<ProjectAnalysis> {
    const fileAnalyses = await this.analyzeMultipleFiles(files, options);

    const totalIssues = fileAnalyses.reduce((sum, analysis) => sum + analysis.issues.length, 0);
    const overallScore = this.calculateOverallScore(fileAnalyses);

    const issueBreakdown = this.calculateIssueBreakdown(fileAnalyses);
    const severityBreakdown = this.calculateSeverityBreakdown(fileAnalyses);
    const recommendations = this.generateRecommendations(fileAnalyses);

    return {
      projectId,
      files: fileAnalyses,
      overallScore,
      totalIssues,
      issueBreakdown,
      severityBreakdown,
      recommendations,
      generatedAt: new Date()
    };
  }

  // Code Fix Generation
  async generateFix(
    code: string,
    issues: CodeIssue[],
    filePath: string
  ): Promise<CodeFix> {
    if (!this.isInitialized) {
      throw new Error('Gemini AI not initialized');
    }

    const language = this.detectLanguage(filePath);
    const prompt = this.buildFixPrompt(code, issues, language);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseFixResponse(text, code, issues);
    } catch (error) {
      console.error('Error generating fix:', error);
      throw new Error(`Fix generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Code Optimization
  async optimizeCode(
    code: string,
    filePath: string,
    optimizationType: 'performance' | 'readability' | 'security' | 'all' = 'all'
  ): Promise<{
    originalCode: string;
    optimizedCode: string;
    improvements: string[];
    beforeMetrics: any;
    afterMetrics: any;
  }> {
    if (!this.isInitialized) {
      throw new Error('Gemini AI not initialized');
    }

    const language = this.detectLanguage(filePath);
    const prompt = this.buildOptimizationPrompt(code, language, optimizationType);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseOptimizationResponse(text, code);
    } catch (error) {
      console.error('Error optimizing code:', error);
      throw new Error(`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Code Explanation
  async explainCode(
    code: string,
    filePath: string,
    complexity: 'simple' | 'detailed' | 'technical' = 'detailed'
  ): Promise<{
    overview: string;
    keyFunctions: Array<{
      name: string;
      purpose: string;
      parameters: string[];
      returns: string;
    }>;
    complexity: string;
    potentialIssues: string[];
    bestPractices: string[];
  }> {
    if (!this.isInitialized) {
      throw new Error('Gemini AI not initialized');
    }

    const language = this.detectLanguage(filePath);
    const prompt = this.buildExplanationPrompt(code, language, complexity);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseExplanationResponse(text);
    } catch (error) {
      console.error('Error explaining code:', error);
      throw new Error(`Explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private Methods
  private buildAnalysisPrompt(
    code: string, 
    language: string, 
    focusAreas: string[], 
    strictMode: boolean
  ): string {
    return `
Analyze the following ${language} code for issues and provide a structured analysis.

FOCUS AREAS: ${focusAreas.join(', ')}
STRICT MODE: ${strictMode ? 'Yes' : 'No'}

CODE:
\`\`\`${language}
${code}
\`\`\`

Please analyze this code and provide a JSON response with the following structure:

{
  "issues": [
    {
      "type": "syntax|logical|security|performance|style|type|dependency",
      "severity": "high|medium|low",
      "line": number,
      "column": number (optional),
      "message": "clear description of the issue",
      "suggestion": "specific suggestion to fix",
      "codeSnippet": "relevant code snippet (optional)",
      "confidence": 0.0-1.0
    }
  ],
  "score": 0-100,
  "summary": "overall assessment",
  "metrics": {
    "linesOfCode": number,
    "complexity": 1-10,
    "maintainability": 0-100
  }
}

Be thorough but concise. Focus on actual issues rather than style preferences unless in strict mode.
`;
  }

  private buildFixPrompt(code: string, issues: CodeIssue[], language: string): string {
    const issuesText = issues.map(issue => 
      `- Line ${issue.line}: [${issue.type.toUpperCase()}] ${issue.message}`
    ).join('\n');

    return `
Please fix the following ${language} code based on the identified issues.

ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`

ISSUES TO FIX:
${issuesText}

Provide the fixed code and a detailed explanation of changes. Use this JSON format:

{
  "originalCode": "the original code",
  "fixedCode": "the complete fixed code",
  "explanation": "summary of what was fixed",
  "changes": [
    {
      "line": number,
      "original": "original line",
      "fixed": "fixed line",
      "reason": "why this change was made"
    }
  ]
}

Ensure the fixed code is functional and maintains the original logic while fixing all identified issues.
`;
  }

  private buildOptimizationPrompt(code: string, language: string, optimizationType: string): string {
    return `
Optimize the following ${language} code for ${optimizationType}. Provide the optimized version and explain improvements.

ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`

Please provide a JSON response with:

{
  "originalCode": "original code",
  "optimizedCode": "optimized code",
  "improvements": ["list of specific improvements made"],
  "beforeMetrics": {"performance": 1-10, "readability": 1-10, "security": 1-10},
  "afterMetrics": {"performance": 1-10, "readability": 1-10, "security": 1-10}
}

Focus on meaningful optimizations that improve code quality without breaking functionality.
`;
  }

  private buildExplanationPrompt(code: string, language: string, complexity: string): string {
    return `
Explain the following ${language} code with a ${complexity} level of detail:

\`\`\`${language}
${code}
\`\`\`

Provide a JSON response with:

{
  "overview": "high-level explanation",
  "keyFunctions": [
    {
      "name": "function name",
      "purpose": "what it does",
      "parameters": ["param1", "param2"],
      "returns": "return value description"
    }
  ],
  "complexity": "assessment of code complexity",
  "potentialIssues": ["list of potential problems"],
  "bestPractices": ["suggestions for improvement"]
}

Make the explanation appropriate for the requested complexity level.
`;
  }

  private parseAnalysisResponse(response: string, filePath: string, language: string, originalCode: string): CodeAnalysis {
    try {
      // Extract JSON from response (handling cases where AI adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Calculate lines of code from original code
      const linesOfCode = originalCode.split('\n').length;

      return {
        filePath,
        language,
        issues: parsed.issues || [],
        score: parsed.score || 0,
        summary: parsed.summary || 'No summary provided',
        metrics: {
          linesOfCode: parsed.metrics?.linesOfCode || linesOfCode,
          complexity: parsed.metrics?.complexity || 5,
          maintainability: parsed.metrics?.maintainability || 50
        }
      };
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return this.createFailedAnalysis(filePath, originalCode, 'Failed to parse analysis response');
    }
  }

  private parseFixResponse(response: string, originalCode: string, issues: CodeIssue[]): CodeFix {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in fix response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        originalCode: parsed.originalCode || originalCode,
        fixedCode: parsed.fixedCode || originalCode,
        explanation: parsed.explanation || 'No explanation provided',
        changes: parsed.changes || []
      };
    } catch (error) {
      console.error('Error parsing fix response:', error);
      throw new Error('Failed to parse fix response');
    }
  }

  private parseOptimizationResponse(response: string, originalCode: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in optimization response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing optimization response:', error);
      throw new Error('Failed to parse optimization response');
    }
  }

  private parseExplanationResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in explanation response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing explanation response:', error);
      throw new Error('Failed to parse explanation response');
    }
  }

  private detectLanguage(filePath: string): string {
    const extension = filePath.toLowerCase().split('.').pop();
    
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'text',
      'sh': 'bash',
      'bash': 'bash',
      'ps1': 'powershell',
      'sql': 'sql',
      'graphql': 'graphql',
      'gql': 'graphql',
      'vue': 'vue',
      'svelte': 'svelte'
    };

    return languageMap[extension!] || 'text';
  }

  private createFailedAnalysis(filePath: string, code: string, error: any): CodeAnalysis {
    const linesOfCode = code.split('\n').length;
    
    return {
      filePath,
      language: this.detectLanguage(filePath),
      issues: [],
      score: 0,
      summary: `Analysis failed: ${error}`,
      metrics: {
        linesOfCode,
        complexity: 0,
        maintainability: 0
      }
    };
  }

  private calculateOverallScore(analyses: CodeAnalysis[]): number {
    if (analyses.length === 0) return 100;

    const totalScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0);
    return Math.round(totalScore / analyses.length);
  }

  private calculateIssueBreakdown(analyses: CodeAnalysis[]): { [key in CodeIssue['type']]: number } {
    const breakdown: { [key in CodeIssue['type']]: number } = {
      syntax: 0,
      logical: 0,
      security: 0,
      performance: 0,
      style: 0,
      type: 0,
      dependency: 0
    };

    analyses.forEach(analysis => {
      analysis.issues.forEach(issue => {
        breakdown[issue.type] = (breakdown[issue.type] || 0) + 1;
      });
    });

    return breakdown;
  }

  private calculateSeverityBreakdown(analyses: CodeAnalysis[]): { high: number; medium: number; low: number } {
    const breakdown = { high: 0, medium: 0, low: 0 };

    analyses.forEach(analysis => {
      analysis.issues.forEach(issue => {
        breakdown[issue.severity]++;
      });
    });

    return breakdown;
  }

  private generateRecommendations(analyses: CodeAnalysis[]): string[] {
    const recommendations: string[] = [];
    const issueCount = this.calculateIssueBreakdown(analyses);
    const severityCount = this.calculateSeverityBreakdown(analyses);

    if (severityCount.high > 0) {
      recommendations.push(`Address ${severityCount.high} high severity issues as they may cause runtime errors or security vulnerabilities.`);
    }

    if (issueCount.security > 0) {
      recommendations.push('Review and fix security vulnerabilities to protect against potential attacks.');
    }

    if (issueCount.performance > 0) {
      recommendations.push('Optimize performance issues to improve application speed and efficiency.');
    }

    if (issueCount.style > 5) {
      recommendations.push('Improve code style consistency for better readability and maintainability.');
    }

    if (analyses.length > 0) {
      const avgMaintainability = analyses.reduce((sum, a) => sum + a.metrics.maintainability, 0) / analyses.length;
      if (avgMaintainability < 60) {
        recommendations.push('Consider refactoring to improve overall code maintainability.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Code quality is good! Continue following current best practices.');
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }
}

// Create singleton instance
export const geminiService = new GeminiService();

export default GeminiServic;