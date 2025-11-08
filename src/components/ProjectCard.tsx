import React from 'react';
import Link from 'next/link';

interface ProjectCardProps {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'failed' | 'queued';
  uploadDate: string;
  errorCount: number;
  fileCount: number;
  lastAnalyzed?: string;
  onDelete: (id: string) => void;
  onReanalyze: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  status,
  uploadDate,
  errorCount,
  fileCount,
  lastAnalyzed,
  onDelete,
  onReanalyze
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'queued': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      case 'queued': return 'Queued';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '🔄';
      case 'failed': return '❌';
      case 'queued': return '⏳';
      default: return '📁';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border border-gray-700">
      {/* Project Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {getStatusIcon(status)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{name}</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
              <span className="text-sm text-gray-400">{getStatusText(status)}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">{formatDate(uploadDate)}</div>
          {lastAnalyzed && (
            <div className="text-xs text-gray-500 mt-1">
              Analyzed: {formatDate(lastAnalyzed)}
            </div>
          )}
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{fileCount}</div>
          <div className="text-xs text-gray-400">Files</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            errorCount > 0 ? 'text-red-400' : 'text-green-400'
          }`}>
            {errorCount}
          </div>
          <div className="text-xs text-gray-400">Errors</div>
        </div>
      </div>

      {/* Progress Bar for Processing Status */}
      {status === 'processing' && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Processing...</span>
            <span>65%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: '65%' }}
            ></div>
          </div>
        </div>
      )}

      {/* Quality Score for Completed Projects */}
      {status === 'completed' && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Code Quality</span>
            <span className="text-xs font-semibold text-green-400">85%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full"
              style={{ width: '85%' }}
            ></div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {status === 'completed' && (
          <>
            <Link 
              href={`/results/${id}`}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-center py-2 rounded-lg transition-colors text-sm font-medium"
            >
              View Results
            </Link>
            <button 
              onClick={() => onReanalyze(id)}
              className="px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
              title="Reanalyze"
            >
              🔄
            </button>
          </>
        )}
        {status === 'processing' && (
          <Link 
            href={`/processing/${id}`}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-center py-2 rounded-lg transition-colors text-sm font-medium"
          >
            View Progress
          </Link>
        )}
        {status === 'failed' && (
          <button 
            onClick={() => onReanalyze(id)}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-center py-2 rounded-lg transition-colors text-sm font-medium"
          >
            Retry Analysis
          </button>
        )}
        {status === 'queued' && (
          <div className="flex-1 text-center py-2 text-gray-400 text-sm bg-gray-700 rounded-lg">
            Waiting in Queue
          </div>
        )}
        <button 
          onClick={() => onDelete(id)}
          className="px-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-sm"
          title="Delete Project"
        >
          🗑️
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Project ID: {id.slice(0, 8)}...</span>
          <span>{fileCount} files</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;