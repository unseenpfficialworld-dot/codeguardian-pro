import React, { useState, useMemo } from 'react';

interface ErrorItem {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column?: number;
  description: string;
  suggestion?: string;
  codeSnippet?: string;
  category: 'syntax' | 'security' | 'performance' | 'style' | 'logic';
  timestamp?: string;
}

interface ErrorListProps {
  errors: ErrorItem[];
  onErrorClick?: (error: ErrorItem) => void;
  selectedErrorId?: string;
  showFilters?: boolean;
  className?: string;
}

const ErrorList: React.FC<ErrorListProps> = ({
  errors,
  onErrorClick,
  selectedErrorId,
  showFilters = true,
  className = ''
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'syntax' | 'security' | 'performance' | 'style' | 'logic'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'file' | 'line'>('severity');

  const filteredAndSortedErrors = useMemo(() => {
    let filtered = errors.filter(error => {
      // Severity filter
      if (severityFilter !== 'all' && error.severity !== severityFilter) {
        return false;
      }
      
      // Category filter
      if (categoryFilter !== 'all' && error.category !== categoryFilter) {
        return false;
      }
      
      // Search filter
      if (searchTerm && 
          !error.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !error.file.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !error.type.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });

    // Sort errors
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        
        case 'file':
          return a.file.localeCompare(b.file);
        
        case 'line':
          return a.line - b.line;
        
        default:
          return 0;
      }
    });

    return filtered;
  }, [errors, severityFilter, categoryFilter, searchTerm, sortBy]);

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'syntax': return '🔤';
      case 'security': return '🛡️';
      case 'performance': return '⚡';
      case 'style': return '🎨';
      case 'logic': return '🔍';
      default: return '❓';
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'syntax': return 'Syntax';
      case 'security': return 'Security';
      case 'performance': return 'Performance';
      case 'style': return 'Style';
      case 'logic': return 'Logic';
      default: return 'Unknown';
    }
  };

  const errorStats = useMemo(() => ({
    total: errors.length,
    high: errors.filter(e => e.severity === 'high').length,
    medium: errors.filter(e => e.severity === 'medium').length,
    low: errors.filter(e => e.severity === 'low').length,
    byCategory: {
      syntax: errors.filter(e => e.category === 'syntax').length,
      security: errors.filter(e => e.category === 'security').length,
      performance: errors.filter(e => e.category === 'performance').length,
      style: errors.filter(e => e.category === 'style').length,
      logic: errors.filter(e => e.category === 'logic').length,
    }
  }), [errors]);

  const handleErrorClick = (error: ErrorItem) => {
    onErrorClick?.(error);
  };

  const handleQuickFix = (error: ErrorItem, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Applying quick fix for:', error.id);
    // Quick fix logic would be implemented here
  };

  const handleIgnoreError = (error: ErrorItem, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Ignoring error:', error.id);
    // Ignore error logic would be implemented here
  };

  const exportErrors = () => {
    const data = JSON.stringify(filteredAndSortedErrors, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code-errors.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Header with Stats */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Detected Errors</h2>
            <p className="text-gray-400 text-sm">
              {filteredAndSortedErrors.length} of {errors.length} errors shown
            </p>
          </div>
          <button
            onClick={exportErrors}
            className="mt-2 lg:mt-0 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Export Errors
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{errorStats.high}</div>
            <div className="text-xs text-gray-400">High Severity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{errorStats.medium}</div>
            <div className="text-xs text-gray-400">Medium Severity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{errorStats.low}</div>
            <div className="text-xs text-gray-400">Low Severity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{errorStats.total}</div>
            <div className="text-xs text-gray-400">Total Errors</div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search errors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                🔍
              </div>
            </div>

            {/* Severity Filter */}
            <select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Category Filter */}
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="syntax">Syntax</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="style">Style</option>
              <option value="logic">Logic</option>
            </select>

            {/* Sort By */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="severity">Sort by Severity</option>
              <option value="file">Sort by File</option>
              <option value="line">Sort by Line</option>
            </select>
          </div>
        )}
      </div>

      {/* Errors List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAndSortedErrors.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-white mb-2">No errors found</h3>
            <p className="text-gray-400">
              {errors.length === 0 
                ? 'Great! No errors detected in your code.' 
                : 'No errors match your current filters.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredAndSortedErrors.map((error) => (
              <div
                key={error.id}
                onClick={() => handleErrorClick(error)}
                className={`p-4 hover:bg-gray-750 cursor-pointer transition-colors ${
                  selectedErrorId === error.id ? 'bg-blue-500/20 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(error.severity)}`}></div>
                    <span className="font-semibold text-white">{error.type}</span>
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(error.severity)}`}>
                      {getSeverityText(error.severity)}
                    </span>
                    <div className="flex items-center space-x-1 text-xs text-gray-400">
                      <span>{getCategoryIcon(error.category)}</span>
                      <span>{getCategoryText(error.category)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {error.file}:{error.line}
                    {error.column && `:${error.column}`}
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-3">{error.description}</p>

                {error.codeSnippet && (
                  <div className="bg-gray-900 rounded p-3 mb-3 font-mono text-xs">
                    <code className="text-gray-300">{error.codeSnippet}</code>
                  </div>
                )}

                {error.suggestion && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mb-3">
                    <div className="text-blue-400 text-sm font-medium mb-1">Suggestion:</div>
                    <div className="text-blue-300 text-sm">{error.suggestion}</div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {error.timestamp && `Detected: ${error.timestamp}`}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => handleQuickFix(error, e)}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-xs transition-colors"
                    >
                      Quick Fix
                    </button>
                    <button
                      onClick={(e) => handleIgnoreError(error, e)}
                      className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-xs transition-colors"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {filteredAndSortedErrors.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm">
            <div className="text-gray-400 mb-2 sm:mb-0">
              Showing {filteredAndSortedErrors.length} errors
              {severityFilter !== 'all' && ` (${getSeverityText(severityFilter)} severity only)`}
              {categoryFilter !== 'all' && ` (${getCategoryText(categoryFilter)} category only)`}
            </div>
            <div className="flex space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>High ({errorStats.high})</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Medium ({errorStats.medium})</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Low ({errorStats.low})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorList;