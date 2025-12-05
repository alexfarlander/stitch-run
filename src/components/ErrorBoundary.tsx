'use client';

import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary for Section Components
 * 
 * Provides graceful degradation when sections fail to render.
 * Allows users to retry without losing the entire canvas.
 */
export class SectionErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SectionErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 border border-red-500/30 rounded-lg p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm font-medium text-red-400 mb-2">
            Section Failed to Load
          </p>
          <p className="text-xs text-slate-500 mb-4 max-w-[200px] truncate">
            {this.state.error?.message}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Global Error Boundary
 *
 * Wraps the entire application to catch unhandled errors.
 * Provides a user-friendly error page and integrates with error tracking.
 */
export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('GlobalErrorBoundary caught error:', error, errorInfo);

    // Store error info in state for display
    this.setState({ errorInfo });

    // Call custom error handler if provided (for error tracking)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-slate-400 mb-6">
              We encountered an unexpected error. Our team has been notified.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="mb-6 text-left">
                <p className="text-xs font-mono text-red-400 mb-2">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="text-xs font-mono text-slate-500">
                    <summary className="cursor-pointer hover:text-slate-400 mb-2">
                      Component Stack
                    </summary>
                    <pre className="overflow-auto max-h-40 bg-slate-950 p-2 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={this.handleReload}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={this.handleGoHome}
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-600 mt-8">
            Error ID: {this.state.error?.message ? btoa(this.state.error.message).slice(0, 8) : 'unknown'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
