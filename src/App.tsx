// App.tsx - CodeGuardian Pro Main Application Component

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import Footer from './Footer';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import UploadPage from './UploadPage';
import Dashboard from './Dashboard';
import Processing from './Processing';
import ResultsPage from './ResultsPage';
import HistoryPage from './HistoryPage';
import SettingsPage from './SettingsPage';
import { uploadService } from './uploadService';
import { geminiService } from './geminiService';
import { getLocalStorage, setLocalStorage } from './helpers';

interface AppState {
  currentUser: any | null;
  currentProject: any | null;
  isLoading: boolean;
  theme: 'dark' | 'light';
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

const App: React.FC = () => {
  const router = useRouter();
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentProject: null,
    isLoading: false,
    theme: 'dark',
    notifications: []
  });

  // Initialize app on component mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Handle route changes
  useEffect(() => {
    const handleRouteChange = () => {
      // Clear notifications when changing routes
      setState(prev => ({ ...prev, notifications: [] }));
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  const initializeApp = async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Load user preferences from localStorage
      const savedTheme = getLocalStorage<'dark' | 'light'>('theme', 'dark');
      const savedUser = getLocalStorage('currentUser', null);

      // Initialize services
      const appInit = await geminiService.healthCheck();
      
      if (!appInit.healthy) {
        addNotification({
          type: 'warning',
          title: 'Service Warning',
          message: 'Some AI features may be limited'
        });
      }

      setState(prev => ({
        ...prev,
        theme: savedTheme,
        currentUser: savedUser,
        isLoading: false
      }));

      // Clean up old projects
      uploadService.cleanupOldProjects();

    } catch (error) {
      console.error('App initialization error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      addNotification({
        type: 'error',
        title: 'Initialization Error',
        message: 'Failed to initialize application'
      });
    }
  };

  // Authentication handlers
  const handleLogin = (userData: any) => {
    setState(prev => ({ 
      ...prev, 
      currentUser: userData 
    }));
    setLocalStorage('currentUser', userData);
    addNotification({
      type: 'success',
      title: 'Login Successful',
      message: `Welcome back, ${userData.name || 'User'}!`
    });
    router.push('/dashboard');
  };

  const handleLogout = () => {
    setState(prev => ({ 
      ...prev, 
      currentUser: null 
    }));
    setLocalStorage('currentUser', null);
    addNotification({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been successfully logged out'
    });
    router.push('/');
  };

  // Project management handlers
  const handleProjectCreate = (project: any) => {
    setState(prev => ({ 
      ...prev, 
      currentProject: project 
    }));
    addNotification({
      type: 'success',
      title: 'Project Created',
      message: `Project "${project.name}" has been created successfully`
    });
  };

  const handleProjectUpdate = (project: any) => {
    setState(prev => ({ 
      ...prev, 
      currentProject: project 
    }));
  };

  const handleProjectDelete = (projectId: string) => {
    if (state.currentProject?.id === projectId) {
      setState(prev => ({ ...prev, currentProject: null }));
    }
    addNotification({
      type: 'info',
      title: 'Project Deleted',
      message: 'Project has been deleted successfully'
    });
  };

  // Theme handlers
  const toggleTheme = () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    setState(prev => ({ ...prev, theme: newTheme }));
    setLocalStorage('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Notification handlers
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications].slice(0, 5) // Keep only last 5
    }));

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  };

  const removeNotification = (notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(notif => notif.id !== notificationId)
    }));
  };

  // Loading state handlers
  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  // Render current page based on route
  const renderCurrentPage = () => {
    const { pathname } = router;

    switch (pathname) {
      case '/':
        return <LandingPage />;

      case '/auth':
        return <AuthPage onLogin={handleLogin} />;

      case '/upload':
        return (
          <UploadPage 
            onProjectCreate={handleProjectCreate}
            setLoading={setLoading}
          />
        );

      case '/dashboard':
        return (
          <Dashboard 
            currentUser={state.currentUser}
            onProjectSelect={handleProjectUpdate}
            onProjectDelete={handleProjectDelete}
            setLoading={setLoading}
          />
        );

      case '/processing':
        return (
          <Processing 
            project={state.currentProject}
            setLoading={setLoading}
          />
        );

      case '/results':
        return (
          <ResultsPage 
            project={state.currentProject}
            setLoading={setLoading}
          />
        );

      case '/history':
        return (
          <HistoryPage 
            currentUser={state.currentUser}
            setLoading={setLoading}
          />
        );

      case '/settings':
        return (
          <SettingsPage 
            currentUser={state.currentUser}
            currentTheme={state.theme}
            onThemeChange={toggleTheme}
            onLogout={handleLogout}
            setLoading={setLoading}
          />
        );

      default:
        return <LandingPage />;
    }
  };

  // Notification component
  const NotificationToast: React.FC<{ notification: Notification }> = ({ notification }) => (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-gray-800 border-l-4 rounded-lg shadow-lg transform transition-transform duration-300 ${
      notification.type === 'success' ? 'border-green-500' :
      notification.type === 'error' ? 'border-red-500' :
      notification.type === 'warning' ? 'border-yellow-500' :
      'border-blue-500'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`text-sm font-semibold ${
              notification.type === 'success' ? 'text-green-400' :
              notification.type === 'error' ? 'text-red-400' :
              notification.type === 'warning' ? 'text-yellow-400' :
              'text-blue-400'
            }`}>
              {notification.title}
            </div>
            <div className="mt-1 text-sm text-gray-300">
              {notification.message}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {notification.timestamp.toLocaleTimeString()}
            </div>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-4 text-gray-400 hover:text-gray-300 transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );

  // Global loading spinner
  const GlobalLoadingSpinner = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white font-semibold">Loading...</div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      state.theme === 'dark' 
        ? 'bg-gray-900 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Set theme attribute for CSS variables */}
      <div data-theme={state.theme}>
        
        {/* Navigation */}
        <Navbar 
          currentUser={state.currentUser}
          currentTheme={state.theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <main className="min-h-screen">
          {renderCurrentPage()}
        </main>

        {/* Footer */}
        <Footer />

        {/* Global Loading Spinner */}
        {state.isLoading && <GlobalLoadingSpinner />}

        {/* Notifications */}
        <div className="fixed top-4 right-4 z-40 space-y-2">
          {state.notifications.map(notification => (
            <NotificationToast 
              key={notification.id} 
              notification={notification} 
            />
          ))}
        </div>

        {/* AdSense Global Script */}
        <script 
          async 
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        [data-theme="dark"] {
          --color-background: #0f172a;
          --color-surface: #1e293b;
          --color-text: #f8fafc;
          --color-text-muted: #94a3b8;
          --color-border: #334155;
        }

        [data-theme="light"] {
          --color-background: #ffffff;
          --color-surface: #f8fafc;
          --color-text: #0f172a;
          --color-text-muted: #64748b;
          --color-border: #e2e8f0;
        }

        body {
          background-color: var(--color-background);
          color: var(--color-text);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Focus styles for accessibility */
        button:focus-visible,
        a:focus-visible,
        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Selection styles */
        ::selection {
          background-color: rgb(59 130 246 / 0.3);
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
};
export default App;