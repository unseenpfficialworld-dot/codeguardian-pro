import React, { useState } from 'react';
import Link from 'next/link';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    // Profile
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Tech Corp',
    bio: 'Full-stack developer passionate about clean code',
    
    // Preferences
    theme: 'dark',
    language: 'en',
    notifications: true,
    autoSave: true,
    
    // GitHub Integration
    githubConnected: true,
    githubUsername: 'johndoe',
    
    // Google Integration
    googleConnected: false,
    
    // Security
    twoFactorEnabled: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSaveSettings = () => {
    console.log('Saving settings:', formData);
    // Save logic will be implemented later
  };

  const handleGitHubConnect = () => {
    console.log('Connecting GitHub...');
  };

  const handleGoogleConnect = () => {
    console.log('Connecting Google...');
  };

  const handleExportData = () => {
    console.log('Exporting user data...');
  };

  const handleDeleteAccount = () => {
    console.log('Deleting account...');
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'preferences', name: 'Preferences', icon: '⚙️' },
    { id: 'integrations', name: 'Integrations', icon: '🔗' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'billing', name: 'Billing', icon: '💳' }
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
            <Link href="/upload" className="hover:text-blue-400 transition-colors">
              Upload
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-400">Manage your account preferences and settings</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="lg:w-64 bg-gray-800 rounded-lg p-4">
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-gray-800 rounded-lg p-6">
              {/* Profile Settings */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-2xl">
                        JD
                      </div>
                      <div>
                        <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors mr-3">
                          Upload Photo
                        </button>
                        <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Preferences</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Theme
                      </label>
                      <select
                        name="theme"
                        value={formData.theme}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        name="language"
                        value={formData.language}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="notifications"
                          checked={formData.notifications}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-300">Enable notifications</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="autoSave"
                          checked={formData.autoSave}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-300">Auto-save projects</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations */}
              {activeTab === 'integrations' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Integrations</h2>
                  <div className="space-y-6">
                    {/* GitHub Integration */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                            🐙
                          </div>
                          <div>
                            <h3 className="font-semibold">GitHub</h3>
                            <p className="text-sm text-gray-400">
                              Connect your GitHub account to import repositories
                            </p>
                          </div>
                        </div>
                        {formData.githubConnected ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-green-400 text-sm">Connected as {formData.githubUsername}</span>
                            <button className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors">
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleGitHubConnect}
                            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Google Integration */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                            ☁️
                          </div>
                          <div>
                            <h3 className="font-semibold">Google Drive</h3>
                            <p className="text-sm text-gray-400">
                              Connect Google Drive to import projects
                            </p>
                          </div>
                        </div>
                        {formData.googleConnected ? (
                          <button className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors">
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={handleGoogleConnect}
                            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Security</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Two-Factor Authentication
                      </label>
                      <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                        <div>
                          <div className="font-semibold">2FA Status</div>
                          <div className="text-sm text-gray-400">
                            {formData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            formData.twoFactorEnabled
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          {formData.twoFactorEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Change Password</h3>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Current password"
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="password"
                          placeholder="New password"
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors">
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Notifications</h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-semibold">Email Notifications</div>
                        <div className="text-sm text-gray-400">Receive updates via email</div>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-500 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                        defaultChecked
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-semibold">Project Completion Alerts</div>
                        <div className="text-sm text-gray-400">Get notified when analysis completes</div>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-500 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                        defaultChecked
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-semibold">Security Alerts</div>
                        <div className="text-sm text-gray-400">Critical security findings</div>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-500 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                        defaultChecked
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-semibold">Product Updates</div>
                        <div className="text-sm text-gray-400">New features and improvements</div>
                      </div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-500 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Billing */}
              {activeTab === 'billing' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Billing & Plans</h2>
                  <div className="bg-gray-700 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Free Plan</h3>
                        <p className="text-gray-400">Current plan</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">$0/month</div>
                        <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors mt-2">
                          Upgrade Plan
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Includes: 5 projects per month, Basic analysis, Community support
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleExportData}
                      className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors text-left"
                    >
                      <div className="font-semibold">Export Data</div>
                      <div className="text-sm text-gray-400">Download all your projects and data</div>
                    </button>

                    <button
                      onClick={handleDeleteAccount}
                      className="w-full bg-red-500 hover:bg-red-600 px-4 py-3 rounded-lg transition-colors text-left"
                    >
                      <div className="font-semibold">Delete Account</div>
                      <div className="text-sm">Permanently delete your account and all data</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <button
                  onClick={handleSaveSettings}
                  className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;