/**
 * Worker utilities
 * Helper functions for callback URL construction, callback triggering, and logging
 */

import { getConfig } from '@/lib/config';
import { WorkerCallback } from '@/types/stitch';

/**
 * Constructs a callback URL for a worker
 * @param runId - The run identifier
 * @param nodeId - The node identifier
 * @returns Fully qualified callback URL
 */
export function buildCallbackUrl(runId: string, nodeId: string): string {
  const config = getConfig();
  return `${config.baseUrl}/api/stitch/callback/${runId}/${nodeId}`;
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
  } catch (error) {
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
export function sanitizeForLogging(data: any): any {
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

  const sanitized: any = {};
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
  context: Record<string, any>
): void {
  const sanitizedContext = sanitizeForLogging(context);
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
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
