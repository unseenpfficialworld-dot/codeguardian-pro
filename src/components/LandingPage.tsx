import React from 'react';
import Link from 'next/link';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
            <span className="text-xl font-bold">CodeGuardian Pro</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/auth" className="hover:text-blue-400 transition-colors">
              Login
            </Link>
            <Link 
              href="/upload" 
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-6">
            AI-Powered Code 
            <span className="text-blue-400"> Debugging</span> 
            Platform
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Upload your code projects and let our advanced AI find and fix errors automatically. 
            Support for GitHub, Google Drive, direct uploads, and more.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/upload"
              className="bg-blue-500 hover:bg-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Debugging Now
            </Link>
            <button className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-lg text-lg font-semibold transition-colors">
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="w-12 h-12 bg-blue-500 rounded-lg mb-4"></div>
            <h3 className="text-xl font-semibold mb-3">Multi-Source Upload</h3>
            <p className="text-gray-300">
              Upload from GitHub, Google Drive, direct files, or ZIP archives. 
              We support all your project sources.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="w-12 h-12 bg-green-500 rounded-lg mb-4"></div>
            <h3 className="text-xl font-semibold mb-3">AI-Powered Analysis</h3>
            <p className="text-gray-300">
              Advanced Gemini AI detects syntax errors, security vulnerabilities, 
              performance issues, and more.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="w-12 h-12 bg-purple-500 rounded-lg mb-4"></div>
            <h3 className="text-xl font-semibold mb-3">Automatic Fixes</h3>
            <p className="text-gray-300">
              Get intelligent code fixes and optimizations. 
              Download production-ready code instantly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {['Upload Project', 'AI Analysis', 'Review Results', 'Download Fixed Code'].map((step, index) => (
            <div key={step} className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">{index + 1}</span>
              </div>
              <h3 className="text-lg font-semibold">{step}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Debug Your Code?</h2>
        <p className="text-xl text-gray-300 mb-8">
          Join thousands of developers who trust CodeGuardian Pro
        </p>
        <Link 
          href="/upload"
          className="bg-blue-500 hover:bg-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-block"
        >
          Start Free Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-8">
        <div className="container mx-auto px-6 text-center text-gray-400">
          <p>&copy; 2024 CodeGuardian Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;