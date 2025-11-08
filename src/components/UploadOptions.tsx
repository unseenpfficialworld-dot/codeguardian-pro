import React, { useCallback } from 'react';

interface UploadOptionsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onFileSelect: (files: FileList | null) => void;
  onGitHubSubmit: (url: string) => void;
  onGoogleDriveSubmit: (url: string) => void;
  onUrlImport: (url: string) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  onDirectUpload: () => void;
}

const UploadOptions: React.FC<UploadOptionsProps> = ({
  activeTab,
  setActiveTab,
  onFileSelect,
  onGitHubSubmit,
  onGoogleDriveSubmit,
  onUrlImport,
  selectedFiles,
  onRemoveFile,
  onDirectUpload
}) => {
  const [githubUrl, setGithubUrl] = React.useState('');
  const [googleDriveUrl, setGoogleDriveUrl] = React.useState('');
  const [importUrl, setImportUrl] = React.useState('');
  const [isDragging, setIsDragging] = React.useState(false);

  const uploadOptions = [
    { id: 'github', name: 'GitHub', icon: '🐙', description: 'Import from GitHub repository' },
    { id: 'drive', name: 'Google Drive', icon: '☁️', description: 'Import from Google Drive' },
    { id: 'direct', name: 'Direct Upload', icon: '📁', description: 'Upload files directly' },
    { id: 'zip', name: 'ZIP File', icon: '🗜️', description: 'Upload ZIP archive' },
    { id: 'url', name: 'URL Import', icon: '🔗', description: 'Import from URL' }
  ];

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
    onFileSelect(e.dataTransfer.files);
  }, [onFileSelect]);

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGitHubSubmit(githubUrl);
    setGithubUrl('');
  };

  const handleGoogleDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGoogleDriveSubmit(googleDriveUrl);
    setGoogleDriveUrl('');
  };

  const handleUrlImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUrlImport(importUrl);
    setImportUrl('');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Upload Options Tabs */}
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
            <span className="text-xs mt-1 opacity-75">{option.description}</span>
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
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Import Repository
                </button>
                <button
                  type="button"
                  className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Browse Repositories
                </button>
              </div>
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
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Import from Drive
                </button>
                <button
                  type="button"
                  className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Browse Drive
                </button>
              </div>
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
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-colors inline-block"
              >
                Choose Files
              </label>
              <p className="text-sm text-gray-400 mt-4">
                Supported: .js, .ts, .jsx, .tsx, .json, .html, .css, .py, .java, .cpp, .c, .php, .rb, .go
              </p>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">Selected Files ({selectedFiles.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-700 px-4 py-3 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">📄</span>
                        <div>
                          <div className="text-sm font-medium">{file.name}</div>
                          <div className="text-xs text-gray-400">
                            {(file.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFile(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onDirectUpload}
                  className="mt-4 w-full bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold transition-colors"
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
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <div className="text-4xl mb-4">🗜️</div>
              <p className="text-lg mb-4">Upload your project as a ZIP file</p>
              <input
                type="file"
                accept=".zip,.rar,.7z"
                onChange={handleFileInputChange}
                className="hidden"
                id="zip-upload"
              />
              <label
                htmlFor="zip-upload"
                className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-colors inline-block"
              >
                Choose ZIP File
              </label>
              <p className="text-sm text-gray-400 mt-4">
                Supports: .zip, .rar, .7z files (Max: 100MB)
              </p>
            </div>
          </div>
        )}

        {/* URL Import */}
        {activeTab === 'url' && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Import from URL</h3>
            <form onSubmit={handleUrlImportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project URL
                </label>
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/project.zip or Git repository URL"
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

      {/* Upload Tips */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Upload Tips</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Maximum file size: 100MB per project</li>
          <li>• Supported languages: JavaScript, TypeScript, Python, Java, C++, etc.</li>
          <li>• For best results, include all project dependencies</li>
          <li>• Large projects may take longer to analyze</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadOptions;