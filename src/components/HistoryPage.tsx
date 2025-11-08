import React, { useState } from 'react';
import Link from 'next/link';

interface ProjectHistory {
  id: string;
  name: string;
  status: 'completed' | 'failed';
  uploadDate: string;
  analysisDate: string;
  errorCount: number;
  fileCount: number;
  duration: string;
  qualityScore: number;
}

const HistoryPage = () => {
  const [timeFilter, setTimeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const historyData: ProjectHistory[] = [
    {
      id: '1',
      name: 'E-commerce Website',
      status: 'completed',
      uploadDate: '2024-01-15',
      analysisDate: '2024-01-15',
      errorCount: 12,
      fileCount: 45,
      duration: '2m 15s',
      qualityScore: 85
    },
    {
      id: '2',
      name: 'React Todo App',
      status: 'completed',
      uploadDate: '2024-01-16',
      analysisDate: '2024-01-16',
      errorCount: 3,
      fileCount: 8,
      duration: '45s',
      qualityScore: 92
    },
    {
      id: '3',
      name: 'Node.js API',
      status: 'failed',
      uploadDate: '2024-01-14',
      analysisDate: '2024-01-14',
      errorCount: 23,
      fileCount: 32,
      duration: '1m 30s',
      qualityScore: 65
    },
    {
      id: '4',
      name: 'Python Data Analysis',
      status: 'completed',
      uploadDate: '2024-01-13',
      analysisDate: '2024-01-13',
      errorCount: 7,
      fileCount: 15,
      duration: '1m 10s',
      qualityScore: 88
    },
    {
      id: '5',
      name: 'Mobile App UI',
      status: 'completed',
      uploadDate: '2024-01-12',
      analysisDate: '2024-01-12',
      errorCount: 5,
      fileCount: 22,
      duration: '1m 45s',
      qualityScore: 90
    },
    {
      id: '6',
      name: 'Database Schema',
      status: 'failed',
      uploadDate: '2024-01-11',
      analysisDate: '2024-01-11',
      errorCount: 18,
      fileCount: 12,
      duration: '50s',
      qualityScore: 70
    }
  ];

  const filteredHistory = historyData.filter(project => {
    // Status filter
    if (statusFilter !== 'all' && project.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Time filter (simplified)
    if (timeFilter !== 'all') {
      const projectDate = new Date(project.uploadDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - projectDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeFilter === 'week' && diffDays > 7) return false;
      if (timeFilter === 'month' && diffDays > 30) return false;
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    return status === 'completed' ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = (status: string) => {
    return status === 'completed' ? 'Completed' : 'Failed';
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-yellow-400';
    if (score >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const stats = {
    total: historyData.length,
    completed: historyData.filter(p => p.status === 'completed').length,
    failed: historyData.filter(p => p.status === 'failed').length,
    avgQuality: Math.round(historyData.reduce((sum, p) => sum + p.qualityScore, 0) / historyData.length),
    totalErrors: historyData.reduce((sum, p) => sum + p.errorCount, 0)
  };

  const handleReanalyze = (projectId: string) => {
    console.log('Reanalyzing project:', projectId);
  };

  const handleDeleteHistory = (projectId: string) => {
    console.log('Deleting history:', projectId);
  };

  const handleClearAll = () => {
    console.log('Clearing all history');
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
              Upload
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Project History</h1>
            <p className="text-gray-400">View your past code analysis projects and results</p>
          </div>
          <button
            onClick={handleClearAll}
            className="mt-4 lg:mt-0 bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg transition-colors"
          >
            Clear All History
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
            <div className="text-gray-400 text-sm">Total Projects</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-gray-400 text-sm">Completed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-gray-400 text-sm">Failed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.totalErrors}</div>
            <div className="text-gray-400 text-sm">Total Errors</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.avgQuality}%</div>
            <div className="text-gray-400 text-sm">Avg Quality</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  🔍
                </div>
              </div>

              {/* Time Filter */}
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>

              {/* Status Filter */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="text-sm text-gray-400">
              Showing {filteredHistory.length} of {historyData.length} projects
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-700 text-gray-400 text-sm font-semibold">
            <div className="col-span-4">Project Name</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-center">Quality</div>
            <div className="col-span-2 text-center">Date</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-700">
            {filteredHistory.map((project) => (
              <div key={project.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-750 transition-colors">
                {/* Project Name */}
                <div className="col-span-4">
                  <div className="font-semibold">{project.name}</div>
                  <div className="text-sm text-gray-400">
                    {project.fileCount} files • {project.errorCount} errors • {project.duration}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`}></div>
                    <span>{getStatusText(project.status)}</span>
                  </div>
                </div>

                {/* Quality Score */}
                <div className="col-span-2 text-center">
                  <div className={`text-lg font-bold ${getQualityColor(project.qualityScore)}`}>
                    {project.qualityScore}%
                  </div>
                </div>

                {/* Date */}
                <div className="col-span-2 text-center text-sm text-gray-400">
                  {project.analysisDate}
                </div>

                {/* Actions */}
                <div className="col-span-2 text-center">
                  <div className="flex justify-center space-x-2">
                    {project.status === 'completed' && (
                      <Link
                        href={`/results/${project.id}`}
                        className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm transition-colors"
                      >
                        View
                      </Link>
                    )}
                    <button
                      onClick={() => handleReanalyze(project.id)}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Re-run
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(project.id)}
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredHistory.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">No history found</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all' || timeFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Get started by analyzing your first project'
                }
              </p>
              <Link 
                href="/upload"
                className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
              >
                Analyze Project
              </Link>
            </div>
          )}
        </div>

        {/* Export Options */}
        {filteredHistory.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition-colors">
              Export History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;