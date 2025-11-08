import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const Processing = () => {
  const [progress, setProgress] = useState({
    filesProcessed: 0,
    totalFiles: 15,
    currentStage: 'analyzing',
    errorsFound: 0,
    fixesApplied: 0,
    timeRemaining: '2 minutes'
  });

  const [liveLogs, setLiveLogs] = useState([
    'Project uploaded successfully',
    'Starting code analysis...',
    'Scanning for syntax errors...',
    'Checking security vulnerabilities...'
  ]);

  const stages = [
    { id: 'uploading', name: 'Uploading', completed: true },
    { id: 'analyzing', name: 'Analyzing', completed: false, current: true },
    { id: 'fixing', name: 'Fixing', completed: false },
    { id: 'complete', name: 'Complete', completed: false }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newFilesProcessed = Math.min(prev.filesProcessed + 1, prev.totalFiles);
        const newErrorsFound = prev.errorsFound + (Math.random() > 0.7 ? 1 : 0);
        const newFixesApplied = prev.fixesApplied + (Math.random() > 0.5 ? 1 : 0);
        
        let newStage = prev.currentStage;
        if (newFilesProcessed === prev.totalFiles) {
          newStage = 'fixing';
        }
        if (prev.fixesApplied >= prev.errorsFound && prev.errorsFound > 0) {
          newStage = 'complete';
        }

        return {
          ...prev,
          filesProcessed: newFilesProcessed,
          errorsFound: newErrorsFound,
          fixesApplied: newFixesApplied,
          currentStage: newStage,
          timeRemaining: `${Math.max(0, (prev.totalFiles - newFilesProcessed) * 2)} seconds`
        };
      });

      setLiveLogs(prev => {
        const newLogs = [...prev];
        if (newLogs.length < 10) {
          const logMessages = [
            'Processing file: utils/helpers.js',
            'Found potential performance issue',
            'Applying security patch',
            'Optimizing function: calculateTotal',
            'Fixed syntax error in line 45',
            'Removed unused variables',
            'Enhanced error handling',
            'Updated dependency checks'
          ];
          newLogs.push(logMessages[Math.floor(Math.random() * logMessages.length)]);
        }
        return newLogs.slice(-8);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStageColor = (stage: any) => {
    if (stage.completed) return 'bg-green-500';
    if (stage.current) return 'bg-blue-500';
    return 'bg-gray-600';
  };

  const getStageIcon = (stage: any) => {
    if (stage.completed) return '✅';
    if (stage.current) return '🔄';
    return '⏳';
  };

  const handleCancel = () => {
    console.log('Cancelling processing...');
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Processing Your Project</h1>
            <p className="text-gray-400">AI is analyzing and fixing your code in real-time</p>
          </div>

          {/* Progress Overview */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{progress.filesProcessed}/{progress.totalFiles}</div>
                <div className="text-gray-400 text-sm">Files Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{progress.errorsFound}</div>
                <div className="text-gray-400 text-sm">Errors Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{progress.fixesApplied}</div>
                <div className="text-gray-400 text-sm">Fixes Applied</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{progress.timeRemaining}</div>
                <div className="text-gray-400 text-sm">Time Remaining</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Overall Progress</span>
                <span>{Math.round((progress.filesProcessed / progress.totalFiles) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(progress.filesProcessed / progress.totalFiles) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Stage Indicator */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Processing Stages</h3>
            <div className="flex justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-gray-700 -z-10"></div>
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStageColor(stage)} mb-2`}>
                    {getStageIcon(stage)}
                  </div>
                  <span className={`text-sm ${stage.current ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>
                    {stage.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Logs */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Live Processing Logs</h3>
              <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                {liveLogs.map((log, index) => (
                  <div key={index} className="mb-2 text-gray-300">
                    <span className="text-green-400">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
                <div className="text-blue-400 animate-pulse">
                  █ Processing...
                </div>
              </div>
            </div>

            {/* File Progress */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">File Processing</h3>
              <div className="space-y-3">
                {[
                  'src/components/Button.js',
                  'src/utils/helpers.ts',
                  'src/styles/main.css',
                  'package.json',
                  'src/hooks/useAuth.js',
                  'src/pages/index.js'
                ].map((file, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 truncate">{file}</span>
                    <div className={`text-xs px-2 py-1 rounded ${
                      index < progress.filesProcessed ? 'bg-green-500' : 'bg-gray-700'
                    }`}>
                      {index < progress.filesProcessed ? 'Completed' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-red-500 hover:bg-red-600 py-2 rounded-lg transition-colors"
                >
                  Cancel Processing
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition-colors text-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* AI Status */}
          <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400">Gemini AI is actively analyzing your code</span>
              </div>
              <div className="text-sm text-gray-400">
                Using advanced pattern recognition
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Processing;