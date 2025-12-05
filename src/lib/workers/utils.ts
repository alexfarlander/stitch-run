/**
 * Worker utilities
 * Helper functions for callback URL construction, callback triggering, and logging
 */

import { getConfig } from '@/lib/config';
import { WorkerCallback } from '@/types/stitch';

/**
 * Constructs a callback URL for a worker
 * CRITICAL: Always uses NEXT_PUBLIC_BASE_URL from environment
 * @param runId - The run identifier
 * @param nodeId - The node identifier
 * @returns Fully qualified callback URL
 */
export function buildCallbackUrl(runId: string, nodeId: string): string {
  const _config = getConfig();
  
  // Validate that baseUrl is set (getConfig already validates, but double-check)
  if (!config.baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set. Cannot generate callback URL.');
  }
  
  const callbackUrl = `${config.baseUrl}/api/stitch/callback/${runId}/${nodeId}`;
  
  // Log the generated callback URL for debugging
  logWorker('info', 'Generated callback URL', {
    runId,
    nodeId,
    callbackUrl,
    baseUrl: config.baseUrl,
  });
  
  return callbackUrl;
}

/**
 * Triggers a callback to the Stitch engine
 * @param runId - The run identifier
 * @param nodeId - The node identifier
 * @param callback - The callback payload
 */
export async function triggerCallback(
  runId: string,
  nodeId: string,
  callback: WorkerCallback
): Promise<void> {
  const callbackUrl = buildCallbackUrl(runId, nodeId);
  
  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callback),
    });

    if (!response.ok) {
      throw new Error(`Callback failed with status ${response.status}`);
    }
  } catch (_error) {
    console.error('Failed to trigger callback:', {
      runId,
      nodeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Sanitizes sensitive data from objects for logging
 * Removes API keys, tokens, and other sensitive fields
 * @param data - The data to sanitize
 * @returns Sanitized copy of the data
 */
export function sanitizeForLogging(data: unknown): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }

  const sensitiveKeys = [
    'apiKey',
    'api_key',
    'apikey',
    'token',
    'authorization',
    'auth',
    'password',
    'secret',
    'key',
    'credential',
    'credentials',
  ];

  const sanitized: unknown = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logs worker execution with structured format
 * @param level - Log level (info, error, warn)
 * @param message - Log message
 * @param context - Additional context to log
 */
export function logWorker(
  level: 'info' | 'error' | 'warn',
  message: string,
  context: Record<string, unknown>
): void {
  const sanitizedContext = sanitizeForLogging(context);
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    component: 'worker',
    ...sanitizedContext,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    default:
      console.log(JSON.stringify(logData));
  }
}

/**
 * Categorizes errors for better debugging and monitoring
 * @param error - The error to categorize
 * @returns Error category
 */
export function categorizeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'unknown';
  }

  const message = error.message.toLowerCase();

  // API-related errors
  if (message.includes('api') || message.includes('request failed')) {
    return 'api_error';
  }

  // Authentication/Authorization errors
  if (message.includes('unauthorized') || message.includes('forbidden') || 
      message.includes('api key') || message.includes('authentication')) {
    return 'auth_error';
  }

  // Network errors
  if (message.includes('network') || message.includes('timeout') || 
      message.includes('connection') || message.includes('fetch')) {
    return 'network_error';
  }

  // Validation errors
  if (message.includes('invalid') || message.includes('missing') || 
      message.includes('required') || message.includes('validation')) {
    return 'validation_error';
  }

  // Configuration errors
  if (message.includes('environment') || message.includes('config') || 
      message.includes('not set')) {
    return 'config_error';
  }

  // Parsing errors
  if (message.includes('parse') || message.includes('json') || 
      message.includes('syntax')) {
    return 'parse_error';
  }

  // Storage errors
  if (message.includes('storage') || message.includes('upload') || 
      message.includes('download')) {
    return 'storage_error';
  }

  return 'general_error';
}

/**
 * Extracts detailed error context for logging
 * @param error - The error to extract context from
 * @returns Error context object
 */
export function extractErrorContext(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      errorType: typeof error,
      errorValue: String(error),
    };
  }

  const context: Record<string, unknown> = {
    errorName: error.name,
    errorMessage: error.message,
    errorCategory: categorizeError(error),
  };

  // Include stack trace if available
  if (error.stack) {
    context.stack = error.stack;
  }

  // Include cause if available (Error.cause is a newer feature)
  if ('cause' in error && error.cause) {
    context.cause = extractErrorContext(error.cause);
  }

  return context;
}
