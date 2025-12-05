/**
 * AI Assistant Constants
 * 
 * Centralized constants for AI actions and configuration
 */

/**
 * AI action types
 */
export const AI_ACTIONS = {
  CREATE_WORKFLOW: 'create_workflow',
  MODIFY_WORKFLOW: 'modify_workflow',
  ANALYZE: 'analyze',
} as const;

export type AIAction = typeof AI_ACTIONS[keyof typeof AI_ACTIONS];

/**
 * Retry configuration for AI requests
 */
export const AI_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;
