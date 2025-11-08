import React, { useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'failed' | 'queued';
  uploadDate: string;
  errorCount: number;
  fileCount: number;
  lastAnalyzed?: string;
}

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'E-commerce Website',
      status: 'completed',
      uploadDate: '2024-01-15',
      errorCount: 12,
      fileCount: 45,
      lastAnalyzed: '2024-01-15'
    },
    {
      id: '2',
      name: 'React Todo App',
      status: 'processing',
      uploadDate: '2024-01-16',
      errorCount: 0,
      fileCount: 8
    },
    {
      id: '3',
      name: 'Node.js API',
      status: 'failed',
      uploadDate: '2024-01-14',
      errorCount: 23,
      fileCount: 32,
      lastAnalyzed: '2024-01-14'
    },
    {
      id: '4',
      name: 'Python Data Analysis',
      status: 'queued',
      uploadDate: '2024-01-16',
      errorCount: 0,
      fileCount: 15
    }
  ]);

  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    } else {
      return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
    }
  });

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    processing: projects.filter(p => p.status === 'processing').length,
    failed: projects.filter(p => p.status === 'failed').length,
    totalErrors: projects.reduce((sum, p) => sum + p.errorCount, 0)
  };

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

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
  };

  const handleReanalyze = (projectId: string) => {
    // Reanalyze logic will be implemented later
    console.log('Reanalyzing project:', projectId);
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
            <Link href="/upload" className="hover:text-blue-400 transition-colors">
              Upload
            </Link>
            <Link href="/auth" className="hover:text-blue-400 transition-colors">
              Profile
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Project Dashboard</h1>
          <p className="text-gray-400">Manage and track your code analysis projects</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
            <div className="text-gray-400">Total Projects</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-gray-400">Completed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
            <div className="text-gray-400">Processing</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-gray-400">Failed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-yellow-400">{stats.totalErrors}</div>
            <div className="text-gray-400">Total Errors</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                All Projects
              </button>
              <button 
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'completed' ? 'bg-green-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Completed
              </button>
              <button 
                onClick={() => setFilter('processing')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'processing' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Processing
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              <Link 
                href="/upload"
                className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                New Project
              </Link>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((project) => (
            <div key={project.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`}></div>
                    <span className="text-sm text-gray-400">{getStatusText(project.status)}</span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400">
                  {project.uploadDate}
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Files:</span>
                  <span>{project.fileCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Errors Found:</span>
                  <span className={project.errorCount > 0 ? 'text-red-400' : 'text-green-400'}>
                    {project.errorCount}
                  </span>
                </div>
                {project.lastAnalyzed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Last Analyzed:</span>
                    <span>{project.lastAnalyzed}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {project.status === 'completed' && (
                  <>
                    <Link 
                      href={`/results/${project.id}`}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-center py-2 rounded-lg transition-colors text-sm"
                    >
                      View Results
                    </Link>
                    <button 
                      onClick={() => handleReanalyze(project.id)}
                      className="px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                    >
                      🔄
                    </button>
                  </>
                )}
                {project.status === 'processing' && (
                  <Link 
                    href={`/processing/${project.id}`}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-center py-2 rounded-lg transition-colors text-sm"
                  >
                    View Progress
                  </Link>
                )}
                {project.status === 'failed' && (
                  <button 
                    onClick={() => handleReanalyze(project.id)}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-center py-2 rounded-lg transition-colors text-sm"
                  >
                    Retry
                  </button>
                )}
                {project.status === 'queued' && (
                  <div className="flex-1 text-center py-2 text-gray-400 text-sm">
                    Waiting in Queue
                  </div>
                )}
                <button 
                  onClick={() => handleDeleteProject(project.id)}
                  className="px-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {sortedProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold mb-2">No projects found</h3>
            <p className="text-gray-400 mb-6">Get started by uploading your first project</p>
            <Link 
              href="/upload"
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
            >
              Upload Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;