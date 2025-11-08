import React from 'react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Features', href: '/features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'API', href: '/api' },
      { name: 'Documentation', href: '/docs' },
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Security', href: '/security' },
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Status', href: '/status' },
      { name: 'Community', href: '/community' },
      { name: 'Report Bug', href: '/report-bug' },
    ],
  };

  const socialLinks = [
    { name: 'GitHub', icon: '🐙', href: 'https://github.com' },
    { name: 'Twitter', icon: '🐦', href: 'https://twitter.com' },
    { name: 'LinkedIn', icon: '💼', href: 'https://linkedin.com' },
    { name: 'Discord', icon: '💬', href: 'https://discord.com' },
  ];

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-xl font-bold text-white">CodeGuardian Pro</span>
            </Link>
            <p className="text-gray-400 mb-4 max-w-md">
              AI-powered code debugging platform that helps developers find and fix errors automatically. 
              Upload your projects and get production-ready code in minutes.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={social.name}
                >
                  <span className="text-lg">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">Stay Updated</h3>
              <p className="text-gray-400 text-sm">
                Get the latest features and updates delivered to your inbox.
              </p>
            </div>
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
              />
              <button className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg text-white font-semibold transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © {currentYear} CodeGuardian Pro. All rights reserved.
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <span className="text-gray-400">Made with ❤️ for developers</span>
              
              {/* Language Selector */}
              <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ad Slot for Footer */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <div className="text-center text-gray-500 text-sm">
            {/* Ad placeholder - will be replaced with actual AdSense code */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400">Advertisement</div>
              <div className="text-xs text-gray-500 mt-1">
                Your ad could be here
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;