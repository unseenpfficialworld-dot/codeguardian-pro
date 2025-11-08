// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

// Google AdSense initialization
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// Initialize Google AdSense
if (typeof window !== 'undefined') {
  window.adsbygoogle = window.adsbygoogle || [];
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
    
    // Log error to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: true
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but something went wrong. Please try refreshing the page.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-200"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-200"
              >
                Go to Homepage
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Service Worker Registration for PWA features
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered: ', registration);
    } catch (error) {
      console.error('Service Worker registration failed: ', error);
    }
  }
};

// Performance Monitoring
const reportWebVitals = (onPerfEntry?: any) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// Theme initialization before React renders
const initializeTheme = () => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Set CSS variables for theme
    const root = document.documentElement;
    if (savedTheme === 'dark') {
      root.style.setProperty('--color-background', '#0f172a');
      root.style.setProperty('--color-surface', '#1e293b');
      root.style.setProperty('--color-text', '#f8fafc');
      root.style.setProperty('--color-text-muted', '#94a3b8');
      root.style.setProperty('--color-border', '#334155');
    } else {
      root.style.setProperty('--color-background', '#ffffff');
      root.style.setProperty('--color-surface', '#f8fafc');
      root.style.setProperty('--color-text', '#0f172a');
      root.style.setProperty('--color-text-muted', '#64748b');
      root.style.setProperty('--color-border', '#e2e8f0');
    }
  }
};

// Main application render function
const renderApp = () => {
  // Initialize theme before rendering
  initializeTheme();
  
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found. Make sure you have a div with id="root" in your index.html');
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Register service worker for PWA capabilities
  if (typeof window !== 'undefined') {
    window.addEventListener('load', registerServiceWorker);
  }

  // Report web vitals for performance monitoring
  if (process.env.NODE_ENV === 'development') {
    reportWebVitals(console.log);
  }
};

// Start the application
try {
  renderApp();
} catch (error) {
  console.error('Failed to render application:', error);
  
  // Fallback error display
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background: linear-gradient(135deg, #dc2626, #991b1b); display: flex; align-items: center; justify-content: center; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="background: white; border-radius: 12px; padding: 32px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 16px;">
            Application Failed to Load
          </h1>
          <p style="color: #6b7280; margin-bottom: 24px;">
            We encountered a critical error while loading the application. Please check your browser console for details.
          </p>
          <button 
            onclick="window.location.reload()" 
            style="background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; margin-bottom: 12px;"
          >
            Try Again
          </button>
          <button 
            onclick="window.location.href = '/'" 
            style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%;"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    `;
  }
}

// Export for testing purposes
export { ErrorBoundary, reportWebVitals, initializeTheme };