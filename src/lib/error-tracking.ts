/**
 * Error Tracking Module
 *
 * Provides centralized error tracking and reporting functionality.
 * Currently logs errors to console with structured data.
 *
 * To integrate with Sentry:
 * 1. Install @sentry/nextjs
 * 2. Run `npx @sentry/wizard@latest -i nextjs`
 * 3. Set NEXT_PUBLIC_SENTRY_DSN environment variable
 * 4. Uncomment Sentry integration code below
 *
 * Environment Variables:
 * - NEXT_PUBLIC_SENTRY_DSN: Sentry project DSN (optional)
 * - NEXT_PUBLIC_ENVIRONMENT: Environment name (development, staging, production)
 */

export interface ErrorContext {
  [key: string]: unknown;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  tags?: Record<string, string>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

/**
 * Initialize error tracking
 * Call this once at application startup
 */
export function initErrorTracking() {
  // Check if Sentry is configured
  const sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (sentryDSN) {
    console.info('Error tracking initialized with Sentry');
    // TODO: Initialize Sentry here when package is installed
    // Sentry.init({
    //   dsn: sentryDSN,
    //   environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    //   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    //   beforeSend(event) {
    //     // Filter out non-production errors in development
    //     if (process.env.NODE_ENV !== 'production') {
    //       console.log('Sentry event:', event);
    //     }
    //     return event;
    //   },
    // });
  } else {
    console.info('Error tracking: Console logging only (Sentry not configured)');
  }

  // Set up global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      trackError(event.error, {
        tags: { type: 'unhandled_error' },
        level: 'error',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      trackError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        tags: { type: 'unhandled_rejection' },
        level: 'error',
      });
    });
  }
}

/**
 * Track an error with optional context
 *
 * @param error - The error to track
 * @param context - Additional context about the error
 */
export function trackError(error: Error, context?: ErrorContext): void {
  const timestamp = new Date().toISOString();
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

  // Structure the error data
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp,
    environment,
    ...context,
  };

  // Log to console with formatting
  if (process.env.NODE_ENV !== 'production') {
    console.error('🔴 Error Tracked:', {
      message: error.message,
      ...context,
    });
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  // Send to Sentry if configured
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     extra: context,
  //     level: context?.level || 'error',
  //     tags: context?.tags,
  //   });
  // }

  // In production, you might also want to send to your own logging endpoint
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to custom logging endpoint
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // }).catch(console.error);
  }
}

/**
 * Track a message (non-error event)
 *
 * @param message - The message to track
 * @param context - Additional context
 */
export function trackMessage(message: string, context?: ErrorContext): void {
  const timestamp = new Date().toISOString();
  const level = context?.level || 'info';

  // Log to console
  if (process.env.NODE_ENV !== 'production') {
    const emoji = level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} ${message}`, context || '');
  }

  // Send to Sentry if configured
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureMessage(message, {
  //     level: level as unknown,
  //     extra: context,
  //     tags: context?.tags,
  //   });
  // }
}

/**
 * Set user context for error tracking
 * Call this after user authentication
 *
 * @param user - User information
 */
export function setUserContext(user: { id: string; email?: string; username?: string }): void {
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.setUser(user);
  // }

  if (process.env.NODE_ENV !== 'production') {
    console.log('User context set:', user);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.setUser(null);
  // }

  if (process.env.NODE_ENV !== 'production') {
    console.log('User context cleared');
  }
}

/**
 * Track custom event
 *
 * @param eventName - Name of the event
 * @param properties - Event properties
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 Event: ${eventName}`, properties || '');
  }

  // Send to analytics service
  // if (typeof window !== 'undefined' && window.analytics) {
  //   window.analytics.track(eventName, properties);
  // }
}

/**
 * Wrap an async function with error tracking
 * Automatically catches and reports errors
 *
 * @param fn - The async function to wrap
 * @param context - Error context
 * @returns Wrapped function
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (_error) {
      trackError(error instanceof Error ? error : new Error(String(error)), context);
      throw error; // Re-throw after tracking
    }
  }) as T;
}

// Type augmentation for Sentry global (for TypeScript)
declare global {
  interface Window {
    Sentry?: unknown;
    analytics?: unknown;
  }
}
