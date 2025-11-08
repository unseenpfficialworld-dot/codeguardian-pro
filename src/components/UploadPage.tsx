import React, { useState, useCallback } from 'react';
import Link from 'next/link';

const UploadPage = () => {
  const [activeTab, setActiveTab] = useState('github');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('GitHub URL:', githubUrl);
    // Process GitHub URL
  };

  const handleGoogleDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Google Drive URL:', googleDriveUrl);
    // Process Google Drive URL
  };

  const handleDirectUpload = () => {
    console.log('Uploading files:', selectedFiles);
    // Process direct upload
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadOptions = [
    { id: 'github', name: 'GitHub', icon: '🐙' },
    { id: 'drive', name: 'Google Drive', icon: '☁️' },
    { id: 'direct', name: 'Direct Upload', icon: '📁' },
    { id: 'zip', name: 'ZIP File', icon: '🗜️' },
    { id: 'url', name: 'URL Import', icon: '🔗' }
  ];

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
            <Link href="/auth" className="hover:text-blue-400 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Upload Your Project</h1>
            <p className="text-xl text-gray-300">
              Choose your preferred method to upload code for AI-powered debugging
            </p>
          </div>

          {/* Upload Options Tabs */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {uploadOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveTab(option.id)}
                  className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                    activeTab === option.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-2">{option.icon}</span>
                  <span className="text-sm font-medium">{option.name}</span>
                </button>
              ))}
            </div>

            {/* Upload Content */}
            <div className="border-t border-gray-700 pt-6">
              {/* GitHub Upload */}
              {activeTab === 'github' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Import from GitHub</h3>
                  <form onSubmit={handleGithubSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        GitHub Repository URL
                      </label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username/repository"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Import Repository
                    </button>
                  </form>
                </div>
              )}

              {/* Google Drive Upload */}
              {activeTab === 'drive' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Import from Google Drive</h3>
                  <form onSubmit={handleGoogleDriveSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Google Drive File/Folder URL
                      </label>
                      <input
                        type="url"
                        value={googleDriveUrl}
                        onChange={(e) => setGoogleDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Import from Drive
                    </button>
                  </form>
                </div>
              )}

              {/* Direct Upload */}
              {activeTab === 'direct' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Direct File Upload</h3>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-400 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-4xl mb-4">📁</div>
                    <p className="text-lg mb-2">Drag and drop your files here</p>
                    <p className="text-gray-400 mb-4">or</p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-colors inline-block"
                    >
                      Choose Files
                    </label>
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold mb-3">Selected Files</h4>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-700 px-4 py-3 rounded-lg"
                          >
                            <span className="text-sm">{file.name}</span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleDirectUpload}
                        className="mt-4 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Upload {selectedFiles.length} File(s)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ZIP Upload */}
              {activeTab === 'zip' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Upload ZIP Archive</h3>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">🗜️</div>
                    <p className="text-lg mb-4">Upload your project as a ZIP file</p>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="zip-upload"
                    />
                    <label
                      htmlFor="zip-upload"
                      className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-colors inline-block"
                    >
                      Choose ZIP File
                    </label>
                  </div>
                </div>
              )}

              {/* URL Import */}
              {activeTab === 'url' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Import from URL</h3>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Project URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/project.zip"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Import from URL
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Supported Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-3">
                <span className="text-green-400">✓</span>
                <span>Syntax Error Detection</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-400">✓</span>
                <span>Security Vulnerability Scanning</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-400">✓</span>
                <span>Performance Optimization</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-400">✓</span>
                <span>Code Quality Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;