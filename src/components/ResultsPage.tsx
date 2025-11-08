import React, { useState } from 'react';
import Link from 'next/link';

const ResultsPage = () => {
  const [selectedFile, setSelectedFile] = useState('src/components/Button.js');
  const [activeTab, setActiveTab] = useState('comparison');

  const files = [
    'src/components/Button.js',
    'src/utils/helpers.ts',
    'src/styles/main.css',
    'package.json',
    'src/hooks/useAuth.js',
    'src/pages/index.js'
  ];

  const errors = [
    { id: 1, type: 'Syntax Error', severity: 'high', file: 'Button.js', line: 15, description: 'Missing semicolon' },
    { id: 2, type: 'Security', severity: 'high', file: 'useAuth.js', line: 8, description: 'Potential XSS vulnerability' },
    { id: 3, type: 'Performance', severity: 'medium', file: 'helpers.ts', line: 23, description: 'Inefficient loop' },
    { id: 4, type: 'Code Style', severity: 'low', file: 'index.js', line: 5, description: 'Unused variable' }
  ];

  const originalCode = `import React from 'react';

const Button = ({ onClick, children }) => {
  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  return (
    <button onClick={handleClick} style={{ padding: '10px' }}>
      {children}
    </button>
  )
}

export default Button`;

  const fixedCode = `import React from 'react';

const Button = ({ onClick, children }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <button 
      onClick={handleClick} 
      style={{ padding: '10px' }}
      className="btn-primary"
    >
      {children}
    </button>
  );
};

export default Button;`;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  };

  const handleDownload = () => {
    console.log('Downloading fixed project...');
  };

  const handleShare = () => {
    console.log('Sharing results...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
            <span className="text-xl font-bold">CodeGuardian Pro</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
              Dashboard
            </Link>
            <Link href="/upload" className="hover:text-blue-400 transition-colors">
              New Project
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analysis Results</h1>
            <p className="text-gray-400">E-commerce Website - Completed 2 minutes ago</p>
          </div>
          <div className="flex space-x-3 mt-4 lg:mt-0">
            <button
              onClick={handleShare}
              className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
            >
              Share Results
            </button>
            <button
              onClick={handleDownload}
              className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg transition-colors"
            >
              Download Fixed Code
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">12</div>
            <div className="text-gray-400 text-sm">Files Analyzed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">4</div>
            <div className="text-gray-400 text-sm">Errors Found</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">4</div>
            <div className="text-gray-400 text-sm">Errors Fixed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">85%</div>
            <div className="text-gray-400 text-sm">Code Quality</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-1 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Project Files</h3>
            <div className="space-y-1">
              {files.map((file) => (
                <button
                  key={file}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedFile === file
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {file}
                </button>
              ))}
            </div>

            {/* Error Breakdown */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Error Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-red-400">High Severity</span>
                  <span>2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-400">Medium Severity</span>
                  <span>1</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400">Low Severity</span>
                  <span>1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'comparison' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Code Comparison
              </button>
              <button
                onClick={() => setActiveTab('errors')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'errors' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Error Details
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'summary' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Summary
              </button>
            </div>

            {/* Code Comparison */}
            {activeTab === 'comparison' && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Code Comparison</h3>
                  <div className="flex space-x-2 text-sm">
                    <span className="text-red-400">Original</span>
                    <span className="text-green-400">Fixed</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-t-lg font-semibold">
                      Original Code
                    </div>
                    <pre className="bg-gray-900 p-4 rounded-b-lg overflow-x-auto text-sm font-mono">
                      {originalCode}
                    </pre>
                  </div>
                  <div>
                    <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-t-lg font-semibold">
                      Fixed Code
                    </div>
                    <pre className="bg-gray-900 p-4 rounded-b-lg overflow-x-auto text-sm font-mono">
                      {fixedCode}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details */}
            {activeTab === 'errors' && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Detected Errors</h3>
                <div className="space-y-3">
                  {errors.map((error) => (
                    <div key={error.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getSeverityColor(error.severity)}`}></div>
                          <span className="font-semibold">{error.type}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(error.severity)}`}>
                          {getSeverityText(error.severity)}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{error.description}</p>
                      <div className="text-xs text-gray-400">
                        File: {error.file} | Line: {error.line}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {activeTab === 'summary' && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Analysis Summary</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Improvements Made</h4>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Fixed 4 syntax errors</li>
                      <li>Patched 2 security vulnerabilities</li>
                      <li>Optimized 3 performance issues</li>
                      <li>Improved code readability</li>
                      <li>Added proper error handling</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Code Quality Metrics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-green-400">Before: 65%</div>
                        <div className="text-gray-400">Code Quality</div>
                      </div>
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-green-400">After: 85%</div>
                        <div className="text-gray-400">Code Quality</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            <div className="bg-gray-800 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <p>✅ All critical errors have been fixed automatically</p>
                <p>🔧 Consider adding TypeScript for better type safety</p>
                <p>⚡ Implement caching for improved performance</p>
                <p>🛡️ Add input validation for enhanced security</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;