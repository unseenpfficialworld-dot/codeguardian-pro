import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Navbar = () => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', current: router.pathname === '/dashboard' },
    { name: 'Upload', href: '/upload', current: router.pathname === '/upload' },
    { name: 'History', href: '/history', current: router.pathname === '/history' },
    { name: 'Settings', href: '/settings', current: router.pathname === '/settings' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CG</span>
            </div>
            <span className="text-xl font-bold text-white">CodeGuardian Pro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Side - User Menu & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                JD
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">John Doe</div>
                <div className="text-xs text-gray-400">Free Plan</div>
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-2">
              <Link
                href="/auth"
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 p-2 rounded-lg"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <div className={`h-0.5 w-6 bg-current transition-transform ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`h-0.5 w-6 bg-current transition-opacity ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`h-0.5 w-6 bg-current transition-transform ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-700 pt-4">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                    item.current
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile User Info */}
              <div className="px-3 py-2 border-t border-gray-700 mt-4 pt-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    JD
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">John Doe</div>
                    <div className="text-xs text-gray-400">Free Plan</div>
                  </div>
                </div>
                <Link
                  href="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors text-center"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;