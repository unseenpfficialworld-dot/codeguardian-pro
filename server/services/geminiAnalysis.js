// server/services/geminiAnalysis.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

class GeminiAnalysisService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    this.analysisCache = new Map();
    this.rateLimit = {
      requests: 0,
      lastReset: Date.now(),
      maxRequests: 1000 // per minute
    };
  }

  /**
   * Health check for Gemini API
   */
  async healthCheck() {
    try {
      const prompt = "Respond with 'OK' if you're working properly.";
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return {
        healthy: true,
        message: 'Gemini API is responding correctly',
        model: 'gemini-pro'
      };
    } catch (error) {
      console.error('Gemini API health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        model: 'gemini-pro'
      };
    }
  }

  /**
   * Comprehensive file analysis
   */
  async analyzeFile(fileData) {
    const cacheKey = `file_${fileData.name}_${Buffer.from(fileData.content).toString('base64').substring(0, 50)}`;
    
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    await this.checkRateLimit();

    try {
      const prompt = this.buildFileAnalysisPrompt(fileData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = this.parseAnalysisResponse(response.text(), fileData);

      // Cache successful analysis
      this.analysisCache.set(cacheKey, analysis);
      
      return analysis;
    } catch (error) {
      console.error(`Error analyzing file ${fileData.name}:`, error);
      throw new Error(`Failed to analyze file: ${error.message}`);
    }
  }

  /**
   * Quick analysis for specific issue types
   */
  async quickAnalyzeFile(fileData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildQuickAnalysisPrompt(fileData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parseQuickAnalysisResponse(response.text(), fileData);
    } catch (error) {
      console.error(`Quick analysis error for ${fileData.name}:`, error);
      return {
        errors: [],
        warnings: [],
        suggestions: [],
        analysisError: error.message
      };
    }
  }

  /**
   * Syntax analysis
   */
  async analyzeSyntax(fileData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildSyntaxAnalysisPrompt(fileData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parseSyntaxAnalysisResponse(response.text(), fileData);
    } catch (error) {
      console.error(`Syntax analysis error for ${fileData.name}:`, error);
      return { errors: [] };
    }
  }

  /**
   * Type checking analysis
   */
  async analyzeTypes(fileData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildTypeAnalysisPrompt(fileData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parseTypeAnalysisResponse(response.text(), fileData);
    } catch (error) {
      console.error(`Type analysis error for ${fileData.name}:`, error);
      return { errors: [] };
    }
  }

  /**
   * Security vulnerability analysis
   */
  async analyzeSecurity(fileData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildSecurityAnalysisPrompt(fileData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parseSecurityAnalysisResponse(response.text(), fileData);
    } catch (error) {
      console.error(`Security analysis error for ${fileData.name}:`, error);
      return { vulnerabilities: [] };
    }
  }

  /**
   * Performance analysis
   */
  async analyzePerformance(fileData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildPerformanceAnalysisPrompt(fileData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parsePerformanceAnalysisResponse(response.text(), fileData);
    } catch (error) {
      console.error(`Performance analysis error for ${fileData.name}:`, error);
      return { issues: [] };
    }
  }

  /**
   * Code quality analysis
   */
  async analyzeCodeQuality(fileData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildCodeQualityPrompt(fileData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parseCodeQualityResponse(response.text(), fileData);
    } catch (error) {
      console.error(`Code quality analysis error for ${fileData.name}:`, error);
      return { issues: [] };
    }
  }

  /**
   * Generate fixes for identified errors
   */
  async generateFixes(fixData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildFixGenerationPrompt(fixData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parseFixGenerationResponse(response.text(), fixData);
    } catch (error) {
      console.error(`Fix generation error for ${fixData.file}:`, error);
      return {
        fixedCode: fixData.content, // Return original if fix fails
        changes: 0,
        fixes: [],
        appliedFixes: []
      };
    }
  }

  /**
   * Generate overall project recommendations
   */
  async generateRecommendations(projectData) {
    await this.checkRateLimit();

    try {
      const prompt = this.buildRecommendationsPrompt(projectData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return this.parseRecommendationsResponse(response.text());
    } catch (error) {
      console.error('Recommendations generation error:', error);
      return [];
    }
  }

  /**
   * Batch analyze multiple files
   */
  async analyzeFilesBatch(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const analysis = await this.analyzeFile(file);
        results.push({
          file: file.name,
          success: true,
          analysis: analysis
        });
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        });
      }

      // Add small delay to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  // Prompt building methods
  buildFileAnalysisPrompt(fileData) {
    return `
CRITICAL: You are a senior code analyzer. Analyze the following ${fileData.language} code for ALL types of issues.

FILE: ${fileData.name}
LANGUAGE: ${fileData.language}
CODE:
\`\`\`${fileData.language}
${fileData.content}
\`\`\`

ANALYSIS REQUIREMENTS:

1. SYNTAX ERRORS: Identify any syntax errors, missing semicolons, brackets, etc.
2. TYPE ERRORS: Identify type mismatches, undefined variables, incorrect function calls.
3. LOGIC ERRORS: Identify logical flaws, infinite loops, incorrect conditions.
4. SECURITY ISSUES: Identify XSS, SQL injection, authentication issues, insecure dependencies.
5. PERFORMANCE ISSUES: Identify slow algorithms, memory leaks, inefficient operations.
6. CODE QUALITY: Identify code smells, bad practices, style violations.
7. BEST PRACTICES: Suggest improvements following ${fileData.language} best practices.

RESPONSE FORMAT (JSON only):
{
  "errors": [
    {
      "id": "unique_error_id",
      "type": "SYNTAX|TYPE|LOGIC|SECURITY|PERFORMANCE|QUALITY",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "message": "Clear description of the issue",
      "line": 10,
      "suggestion": "How to fix this issue",
      "category": "syntax|type|logic|security|performance|style"
    }
  ],
  "warnings": [
    {
      "id": "unique_warning_id", 
      "type": "WARNING_TYPE",
      "message": "Warning description",
      "line": 15,
      "suggestion": "Improvement suggestion"
    }
  ],
  "suggestions": [
    {
      "type": "IMPROVEMENT_TYPE",
      "message": "General improvement suggestion",
      "priority": "HIGH|MEDIUM|LOW"
    }
  ],
  "metrics": {
    "complexity": "LOW|MEDIUM|HIGH",
    "maintainability": "LOW|MEDIUM|HIGH",
    "securityScore": 0-100
  }
}

Respond with JSON only, no additional text.
`;
  }

  buildQuickAnalysisPrompt(fileData) {
    return `
Quick analysis for ${fileData.name} (${fileData.language}):

\`\`\`${fileData.language}
${fileData.content}
\`\`\`

Focus on critical issues only. Respond with JSON:
{
  "errors": [{"type": "...", "message": "...", "line": 1, "severity": "CRITICAL|HIGH"}],
  "warnings": [{"type": "...", "message": "...", "line": 1}],
  "suggestions": [{"message": "...", "priority": "HIGH"}]
}
`;
  }

  buildSyntaxAnalysisPrompt(fileData) {
    return `
Analyze ${fileData.name} for syntax errors:

\`\`\`${fileData.language}
${fileData.content}
\`\`\`

Identify syntax errors, missing punctuation, invalid expressions.
Respond with JSON: {"errors": [{"type": "SYNTAX", "message": "...", "line": 1, "severity": "..."}]}
`;
  }

  buildTypeAnalysisPrompt(fileData) {
    return `
Analyze ${fileData.name} for type-related issues:

\`\`\`${fileData.language}
${fileData.content}
\`\`\`

Identify type mismatches, undefined variables, incorrect function signatures.
Respond with JSON: {"errors": [{"type": "TYPE", "message": "...", "line": 1, "severity": "..."}]}
`;
  }

  buildSecurityAnalysisPrompt(fileData) {
    return `
Security analysis for ${fileData.name}:

\`\`\`${fileData.language}
${fileData.content}
\`\`\`

Identify security vulnerabilities: XSS, SQLi, auth issues, insecure data handling.
Respond with JSON: {"vulnerabilities": [{"type": "...", "message": "...", "line": 1, "severity": "...", "cwe": "CWE-ID"}]}
`;
  }

  buildPerformanceAnalysisPrompt(fileData) {
    return `
Performance analysis for ${fileData.name}:

\`\`\`${fileData.language}
${fileData.content}
\`\`\`

Identify performance issues: slow algorithms, memory leaks, inefficient operations.
Respond with JSON: {"issues": [{"type": "PERFORMANCE", "message": "...", "line": 1, "severity": "...", "impact": "HIGH|MEDIUM|LOW"}]}
`;
  }

  buildCodeQualityPrompt(fileData) {
    return `
Code quality analysis for ${fileData.name}:

\`\`\`${fileData.language}
${fileData.content}
\`\`\`

Identify code smells, style violations, maintainability issues.
Respond with JSON: {"issues": [{"type": "QUALITY", "message": "...", "line": 1, "severity": "LOW", "category": "readability|maintainability|style"}]}
`;
  }

  buildFixGenerationPrompt(fixData) {
    const errorsText = fixData.errors.map(error => 
      `Line ${error.line}: [${error.type}] ${error.message}`
    ).join('\n');

    return `
Generate fixes for the following ${fixData.language} code:

ORIGINAL CODE:
\`\`\`${fixData.language}
${fixData.content}
\`\`\`

ISSUES TO FIX:
${errorsText}

REQUIREMENTS:
1. Fix ALL identified issues
2. Maintain original functionality
3. Follow ${fixData.language} best practices
4. Keep the same code structure where possible
5. Add comments for major changes

Respond with JSON:
{
  "fixedCode": "the complete fixed code here",
  "changes": 5,
  "fixes": [
    {
      "errorId": "original_error_id",
      "description": "What was fixed",
      "line": 10,
      "type": "FIX_TYPE"
    }
  ],
  "appliedFixes": ["list of fixed error IDs"]
}

Include the complete fixed code in the "fixedCode" field.
`;
  }

  buildRecommendationsPrompt(projectData) {
    return `
Generate project-wide recommendations based on analysis:

PROJECT SUMMARY:
- Language: ${projectData.projectLanguage}
- Files: ${projectData.fileCount}
- Errors Found: ${projectData.errors.length}
- Fixes Generated: ${projectData.fixes.length}

KEY ISSUES:
${projectData.errors.slice(0, 10).map(e => `- ${e.type}: ${e.message}`).join('\n')}

Provide architectural and best practice recommendations.
Respond with JSON:
[
  {
    "type": "ARCHITECTURE|SECURITY|PERFORMANCE|MAINTAINABILITY",
    "message": "Recommendation description",
    "priority": "HIGH|MEDIUM|LOW",
    "suggestion": "Specific action to take"
  }
]
`;
  }

  // Response parsing methods
  parseAnalysisResponse(responseText, fileData) {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Add IDs and normalize structure
      analysis.errors = (analysis.errors || []).map(error => ({
        id: uuidv4(),
        file: fileData.name,
        ...error,
        line: error.line || 1,
        severity: error.severity || 'MEDIUM',
        category: this.mapErrorTypeToCategory(error.type)
      }));

      analysis.warnings = (analysis.warnings || []).map(warning => ({
        id: uuidv4(),
        file: fileData.name,
        ...warning,
        line: warning.line || 1
      }));

      analysis.suggestions = analysis.suggestions || [];
      analysis.metrics = analysis.metrics || {};

      return analysis;
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return {
        errors: [],
        warnings: [],
        suggestions: [],
        metrics: {}
      };
    }
  }

  parseQuickAnalysisResponse(responseText, fileData) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { errors: [], warnings: [], suggestions: [] };

      const analysis = JSON.parse(jsonMatch[0]);
      
      analysis.errors = (analysis.errors || []).map(error => ({
        id: uuidv4(),
        file: fileData.name,
        ...error
      }));

      return analysis;
    } catch (error) {
      return { errors: [], warnings: [], suggestions: [] };
    }
  }

  parseSyntaxAnalysisResponse(responseText, fileData) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { errors: [] };

      const analysis = JSON.parse(jsonMatch[0]);
      
      analysis.errors = (analysis.errors || []).map(error => ({
        id: uuidv4(),
        file: fileData.name,
        type: 'SYNTAX',
        category: 'syntax',
        ...error
      }));

      return analysis;
    } catch (error) {
      return { errors: [] };
    }
  }

  parseTypeAnalysisResponse(responseText, fileData) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { errors: [] };

      const analysis = JSON.parse(jsonMatch[0]);
      
      analysis.errors = (analysis.errors || []).map(error => ({
        id: uuidv4(),
        file: fileData.name,
        type: 'TYPE',
        category: 'type',
        ...error
      }));

      return analysis;
    } catch (error) {
      return { errors: [] };
    }
  }

  parseSecurityAnalysisResponse(responseText, fileData) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { vulnerabilities: [] };

      const analysis = JSON.parse(jsonMatch[0]);
      
      analysis.vulnerabilities = (analysis.vulnerabilities || []).map(vuln => ({
        id: uuidv4(),
        file: fileData.name,
        type: 'SECURITY',
        category: 'security',
        ...vuln
      }));

      return analysis;
    } catch (error) {
      return { vulnerabilities: [] };
    }
  }

  parsePerformanceAnalysisResponse(responseText, fileData) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { issues: [] };

      const analysis = JSON.parse(jsonMatch[0]);
      
      analysis.issues = (analysis.issues || []).map(issue => ({
        id: uuidv4(),
        file: fileData.name,
        type: 'PERFORMANCE',
        category: 'performance',
        ...issue
      }));

      return analysis;
    } catch (error) {
      return { issues: [] };
    }
  }

  parseCodeQualityResponse(responseText, fileData) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { issues: [] };

      const analysis = JSON.parse(jsonMatch[0]);
      
      analysis.issues = (analysis.issues || []).map(issue => ({
        id: uuidv4(),
        file: fileData.name,
        type: 'QUALITY',
        category: 'style',
        severity: 'LOW',
        ...issue
      }));

      return analysis;
    } catch (error) {
      return { issues: [] };
    }
  }

  parseFixGenerationResponse(responseText, fixData) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in fix response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // Validate fixed code exists
      if (!result.fixedCode || typeof result.fixedCode !== 'string') {
        throw new Error('Invalid fixed code in response');
      }

      // Normalize fixes array
      result.fixes = (result.fixes || []).map(fix => ({
        id: uuidv4(),
        ...fix
      }));

      result.appliedFixes = result.appliedFixes || [];
      result.changes = result.changes || 1;

      return result;
    } catch (error) {
      console.error('Error parsing fix response:', error);
      throw new Error(`Failed to parse fix response: ${error.message}`);
    }
  }

  parseRecommendationsResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const recommendations = JSON.parse(jsonMatch[0]);
      return recommendations.map(rec => ({
        id: uuidv4(),
        ...rec
      }));
    } catch (error) {
      return [];
    }
  }

  // Utility methods
  mapErrorTypeToCategory(errorType) {
    const typeMap = {
      'SYNTAX': 'syntax',
      'TYPE': 'type', 
      'LOGIC': 'logic',
      'SECURITY': 'security',
      'PERFORMANCE': 'performance',
      'QUALITY': 'style'
    };
    
    return typeMap[errorType] || 'general';
  }

  async checkRateLimit() {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter if more than 1 minute has passed
    if (now - this.rateLimit.lastReset > oneMinute) {
      this.rateLimit.requests = 0;
      this.rateLimit.lastReset = now;
    }

    // Check if we've exceeded the rate limit
    if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
      const waitTime = oneMinute - (now - this.rateLimit.lastReset);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    this.rateLimit.requests++;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cache management
  clearCache() {
    this.analysisCache.clear();
  }

  getCacheStats() {
    return {
      size: this.analysisCache.size,
      hits: this.cacheHits || 0,
      misses: this.cacheMisses || 0
    };
  }
}

// Create singleton instance
const geminiService = new GeminiAnalysisService();

module.exports = { geminiService, GeminiAnalysisService };