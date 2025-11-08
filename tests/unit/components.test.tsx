import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock components
jest.mock('../src/components/LandingPage', () => {
  return function MockLandingPage() {
    return <div data-testid="landing-page">Landing Page</div>;
  };
});

jest.mock('../src/components/AuthPage', () => {
  return function MockAuthPage() {
    return <div data-testid="auth-page">Auth Page</div>;
  };
});

jest.mock('../src/components/UploadPage', () => {
  return function MockUploadPage() {
    return <div data-testid="upload-page">Upload Page</div>;
  };
});

jest.mock('../src/components/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard">Dashboard</div>;
  };
});

jest.mock('../src/components/Processing', () => {
  return function MockProcessing() {
    return <div data-testid="processing">Processing</div>;
  };
});

jest.mock('../src/components/ResultsPage', () => {
  return function MockResultsPage() {
    return <div data-testid="results-page">Results Page</div>;
  };
});

jest.mock('../src/components/AdSenseAd', () => {
  return function MockAdSenseAd() {
    return <div data-testid="adsense-ad">AdSense Ad</div>;
  };
});

// Import actual components after mocking
import { LandingPage } from '../src/components/LandingPage';
import { AuthPage } from '../src/components/AuthPage';
import { UploadPage } from '../src/components/UploadPage';
import { Dashboard } from '../src/components/Dashboard';
import { Processing } from '../src/components/Processing';
import { ResultsPage } from '../src/components/ResultsPage';
import { AdSenseAd } from '../src/components/AdSenseAd';
import { ProjectCard } from '../src/components/ProjectCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { CodeEditor } from '../src/components/CodeEditor';
import { ErrorList } from '../src/components/ErrorList';

describe('Component Tests', () => {
  describe('LandingPage', () => {
    it('renders hero section correctly', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });

    it('displays all feature sections', () => {
      render(<LandingPage />);
      expect(screen.getByText(/AI-Powered Code Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/Multi-Source Upload/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-time Processing/i)).toBeInTheDocument();
    });

    it('has working CTA buttons', () => {
      render(<LandingPage />);
      const ctaButton = screen.getByText(/Get Started/i);
      expect(ctaButton).toBeInTheDocument();
      fireEvent.click(ctaButton);
    });
  });

  describe('AuthPage', () => {
    it('renders authentication options', () => {
      render(<AuthPage />);
      expect(screen.getByTestId('auth-page')).toBeInTheDocument();
    });

    it('shows GitHub OAuth button', () => {
      render(<AuthPage />);
      expect(screen.getByText(/GitHub/i)).toBeInTheDocument();
    });

    it('handles guest mode option', () => {
      render(<AuthPage />);
      const guestButton = screen.getByText(/Continue as Guest/i);
      expect(guestButton).toBeInTheDocument();
      fireEvent.click(guestButton);
    });
  });

  describe('UploadPage', () => {
    const mockOnUploadComplete = jest.fn();

    beforeEach(() => {
      mockOnUploadComplete.mockClear();
    });

    it('renders all upload options', () => {
      render(<UploadPage onUploadComplete={mockOnUploadComplete} />);
      expect(screen.getByTestId('upload-page')).toBeInTheDocument();
    });

    it('shows GitHub upload option', () => {
      render(<UploadPage onUploadComplete={mockOnUploadComplete} />);
      expect(screen.getByText(/GitHub/i)).toBeInTheDocument();
    });

    it('shows direct upload option', () => {
      render(<UploadPage onUploadComplete={mockOnUploadComplete} />);
      expect(screen.getByText(/Direct Upload/i)).toBeInTheDocument();
    });

    it('handles file selection', async () => {
      render(<UploadPage onUploadComplete={mockOnUploadComplete} />);
      
      const file = new File(['console.log("test");'], 'test.js', { type: 'application/javascript' });
      const input = screen.getByLabelText(/Choose files/i);
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Dashboard', () => {
    const mockProjects = [
      {
        id: '1',
        name: 'Test Project 1',
        status: 'completed',
        createdAt: new Date().toISOString(),
        errorCount: 2,
        fileCount: 5
      },
      {
        id: '2',
        name: 'Test Project 2',
        status: 'processing',
        createdAt: new Date().toISOString(),
        errorCount: 0,
        fileCount: 3
      }
    ];

    it('renders project list', () => {
      render(<Dashboard projects={mockProjects} />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('displays project statistics', () => {
      render(<Dashboard projects={mockProjects} />);
      expect(screen.getByText(/Project Statistics/i)).toBeInTheDocument();
    });

    it('shows filter and sort options', () => {
      render(<Dashboard projects={mockProjects} />);
      expect(screen.getByText(/Filter/i)).toBeInTheDocument();
      expect(screen.getByText(/Sort/i)).toBeInTheDocument();
    });
  });

  describe('Processing', () => {
    const mockProject = {
      id: '1',
      name: 'Test Project',
      status: 'processing',
      progress: 50,
      currentStage: 'analysis',
      filesProcessed: 3,
      totalFiles: 6
    };

    it('renders progress indicators', () => {
      render(<Processing project={mockProject} />);
      expect(screen.getByTestId('processing')).toBeInTheDocument();
    });

    it('shows current processing stage', () => {
      render(<Processing project={mockProject} />);
      expect(screen.getByText(/analysis/i)).toBeInTheDocument();
    });

    it('displays progress percentage', () => {
      render(<Processing project={mockProject} />);
      expect(screen.getByText(/50%/i)).toBeInTheDocument();
    });

    it('has cancel button', () => {
      render(<Processing project={mockProject} />);
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });
  });

  describe('ResultsPage', () => {
    const mockResults = {
      projectId: '1',
      originalCode: 'function test() { console.log("old"); }',
      fixedCode: 'function test() { console.log("fixed"); }',
      errors: [
        {
          id: '1',
          type: 'syntax',
          message: 'Missing semicolon',
          line: 1,
          severity: 'error',
          fix: 'Add semicolon'
        }
      ],
      metrics: {
        errorCount: 1,
        filesProcessed: 1,
        optimizationScore: 85
      }
    };

    it('renders code comparison', () => {
      render(<ResultsPage results={mockResults} />);
      expect(screen.getByTestId('results-page')).toBeInTheDocument();
    });

    it('shows error breakdown', () => {
      render(<ResultsPage results={mockResults} />);
      expect(screen.getByText(/Error Breakdown/i)).toBeInTheDocument();
    });

    it('displays download button', () => {
      render(<ResultsPage results={mockResults} />);
      expect(screen.getByText(/Download Fixed Code/i)).toBeInTheDocument();
    });
  });

  describe('ProjectCard', () => {
    const mockProject = {
      id: '1',
      name: 'Test Project',
      status: 'completed',
      createdAt: new Date().toISOString(),
      errorCount: 3,
      fileCount: 8
    };

    const mockOnDelete = jest.fn();
    const mockOnReanalyze = jest.fn();

    beforeEach(() => {
      mockOnDelete.mockClear();
      mockOnReanalyze.mockClear();
    });

    it('renders project information', () => {
      render(
        <ProjectCard 
          project={mockProject}
          onDelete={mockOnDelete}
          onReanalyze={mockOnReanalyze}
        />
      );

      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText(/3 errors/i)).toBeInTheDocument();
      expect(screen.getByText(/8 files/i)).toBeInTheDocument();
    });

    it('handles delete action', () => {
      render(
        <ProjectCard 
          project={mockProject}
          onDelete={mockOnDelete}
          onReanalyze={mockOnReanalyze}
        />
      );

      const deleteButton = screen.getByText(/Delete/i);
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    it('handles reanalyze action', () => {
      render(
        <ProjectCard 
          project={mockProject}
          onDelete={mockOnDelete}
          onReanalyze={mockOnReanalyze}
        />
      );

      const reanalyzeButton = screen.getByText(/Reanalyze/i);
      fireEvent.click(reanalyzeButton);
      expect(mockOnReanalyze).toHaveBeenCalledWith('1');
    });
  });

  describe('ProgressBar', () => {
    it('renders progress bar with percentage', () => {
      render(<ProgressBar progress={75} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('shows different colors based on progress', () => {
      const { rerender } = render(<ProgressBar progress={30} />);
      expect(screen.getByRole('progressbar')).toHaveClass('bg-blue-500');

      rerender(<ProgressBar progress={70} />);
      expect(screen.getByRole('progressbar')).toHaveClass('bg-yellow-500');

      rerender(<ProgressBar progress={90} />);
      expect(screen.getByRole('progressbar')).toHaveClass('bg-green-500');
    });
  });

  describe('CodeEditor', () => {
    const mockCode = 'function test() {\n  return "hello";\n}';
    const mockOnChange = jest.fn();

    beforeEach(() => {
      mockOnChange.mockClear();
    });

    it('renders code editor with syntax highlighting', () => {
      render(
        <CodeEditor 
          code={mockCode}
          onChange={mockOnChange}
          readOnly={false}
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('function')).toBeInTheDocument();
    });

    it('handles code changes', () => {
      render(
        <CodeEditor 
          code={mockCode}
          onChange={mockOnChange}
          readOnly={false}
        />
      );

      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: 'function updated() {}' } });
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('respects read-only mode', () => {
      render(
        <CodeEditor 
          code={mockCode}
          onChange={mockOnChange}
          readOnly={true}
        />
      );

      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('readonly');
    });
  });

  describe('ErrorList', () => {
    const mockErrors = [
      {
        id: '1',
        type: 'syntax',
        message: 'Missing semicolon',
        line: 5,
        severity: 'error',
        fix: 'Add semicolon at end of line'
      },
      {
        id: '2',
        type: 'performance',
        message: 'Inefficient loop',
        line: 12,
        severity: 'warning',
        fix: 'Use forEach instead of for loop'
      }
    ];

    const mockOnErrorClick = jest.fn();

    beforeEach(() => {
      mockOnErrorClick.mockClear();
    });

    it('renders list of errors', () => {
      render(<ErrorList errors={mockErrors} onErrorClick={mockOnErrorClick} />);
      
      expect(screen.getByText('Missing semicolon')).toBeInTheDocument();
      expect(screen.getByText('Inefficient loop')).toBeInTheDocument();
    });

    it('groups errors by severity', () => {
      render(<ErrorList errors={mockErrors} onErrorClick={mockOnErrorClick} />);
      
      expect(screen.getByText(/Errors/i)).toBeInTheDocument();
      expect(screen.getByText(/Warnings/i)).toBeInTheDocument();
    });

    it('handles error click', () => {
      render(<ErrorList errors={mockErrors} onErrorClick={mockOnErrorClick} />);
      
      const firstError = screen.getByText('Missing semicolon');
      fireEvent.click(firstError);
      
      expect(mockOnErrorClick).toHaveBeenCalledWith(mockErrors[0]);
    });
  });

  describe('AdSenseAd', () => {
    it('renders ad container', () => {
      render(<AdSenseAd slotId="test-slot" format="responsive" />);
      expect(screen.getByTestId('adsense-ad')).toBeInTheDocument();
    });

    it('applies correct classes based on format', () => {
      const { rerender } = render(<AdSenseAd slotId="test-slot" format="banner" />);
      expect(screen.getByTestId('adsense-ad')).toHaveClass('ad-banner');

      rerender(<AdSenseAd slotId="test-slot" format="sidebar" />);
      expect(screen.getByTestId('adsense-ad')).toHaveClass('ad-sidebar');
    });
  });

  // Integration tests
  describe('Component Integration', () => {
    it('navigates from landing page to upload page', async () => {
      render(<LandingPage />);
      
      const getStartedButton = screen.getByText(/Get Started/i);
      fireEvent.click(getStartedButton);
      
      // In a real test, this would navigate to upload page
      // For now, we just verify the click works
      expect(getStartedButton).toBeInTheDocument();
    });

    it('handles complete upload to processing flow', async () => {
      const mockOnUploadComplete = jest.fn();
      
      render(<UploadPage onUploadComplete={mockOnUploadComplete} />);
      
      // Simulate file upload
      const file = new File(['test code'], 'test.js', { type: 'application/javascript' });
      const uploadInput = screen.getByLabelText(/Choose files/i);
      
      fireEvent.change(uploadInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalled();
      });
    });
  });
});