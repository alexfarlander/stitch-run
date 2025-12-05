/**
 * Worker Definition Type Definitions
 * 
 * Defines the standard format for worker definitions including input/output schemas
 * and configuration options. All workers in the system must conform to this structure.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { InputSchema, OutputSchema } from './canvas-schema';

// ============================================================================
// Worker Definition Types
// ============================================================================

/**
 * Worker definition format
 * Defines inputs, outputs, and configuration for a worker type
 * 
 * Requirements:
 * - 8.1: Worker SHALL include id, name, type, input schema, and output schema
 * - 8.2: Worker input SHALL specify type, required flag, and description
 * - 8.3: Worker output SHALL specify type and description
 * - 8.4: Worker with configuration SHALL include config object with settings
 */
export interface WorkerDefinition {
  /** Unique identifier for the worker type (e.g., 'claude', 'minimax') */
  id: string;
  
  /** Human-readable name for the worker */
  name: string;
  
  /** Execution type: sync for immediate response, async for callback-based */
  type: 'sync' | 'async';
  
  /** Description of what the worker does */
  description: string;
  
  /** Input schema defining what the worker needs */
  input: Record<string, InputSchema>;
  
  /** Output schema defining what the worker produces */
  output: Record<string, OutputSchema>;
  
  /** Optional configuration options for the worker */
  config?: WorkerConfig;
}

/**
 * Worker configuration options
 * Contains worker-specific settings like endpoints, models, etc.
 */
export interface WorkerConfig {
  /** API endpoint URL (for external services) */
  endpoint?: string;
  
  /** Model identifier (e.g., 'claude-3-sonnet-20240229') */
  model?: string;
  
  /** Allow additional custom configuration fields */
  [key: string]: unknown;
}

