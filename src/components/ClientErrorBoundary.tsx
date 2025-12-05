'use client';

import { useEffect } from 'react';
import { GlobalErrorBoundary } from './ErrorBoundary';
import { initErrorTracking, trackError } from '@/lib/error-tracking';

/**
 * Client-side Error Boundary Wrapper
 *
 * This component is used in the root layout to wrap all client-side code
 * with error boundary protection. It's a separate file to keep the boundary
 * logic in a client component while allowing the root layout to be a server component.
 */
export function ClientErrorBoundary({ children }: { children: React.ReactNode }) {
  // Initialize error tracking on mount
  useEffect(() => {
    initErrorTracking();
  }, []);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Send to error tracking service
    trackError(error, {
      tags: {
        source: 'error_boundary',
        component: 'global',
      },
      level: 'error',
      componentStack: errorInfo.componentStack,
    });
  };

  return (
    <GlobalErrorBoundary onError={handleError}>
      {children}
    </GlobalErrorBoundary>
  );
}
