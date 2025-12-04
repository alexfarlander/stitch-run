/**
 * Canvas Management API Type Definitions
 * 
 * Defines request/response types for the Canvas Management REST API
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 9.1, 9.2, 9.3
 */

import { VisualGraph } from './canvas-schema';
import { NodeStatus } from './stitch';

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response format
 * Requirements: 9.1, 9.2, 9.3
 */
export interface ErrorResponse {
  error: string;
  details?: string[];
  code: string;
}

/**
 * Error codes used across the API
 */
export type ErrorCode = 
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR'
  | 'PARSE_ERROR'
  | 'LLM_ERROR';

// ============================================================================
// Canvas CRUD Types
// ============================================================================

/**
 * Canvas metadata for list responses
 * Requirements: 1.1
 */
export interface CanvasMetadata {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  node_count: number;
  edge_count: number;
}

/**
 * List all canvases response
 * Requirements: 1.1
 */
export interface ListCanvasesResponse {
  canvases: CanvasMetadata[];
}

/**
 * Create canvas request
 * Requirements: 1.2
 */
export interface CreateCanvasRequest {
  name: string;
  format: 'json' | 'mermaid';
  content: string | VisualGraph;
}

/**
 * Create canvas response
 * Requirements: 1.2
 */
export interface CreateCanvasResponse {
  id: string;
  canvas: VisualGraph;
}

/**
 * Get canvas response
 * Requirements: 1.3
 */
export interface GetCanvasResponse {
  id: string;
  name: string;
  canvas: VisualGraph;
  created_at: string;
  updated_at: string;
}

/**
 * Update canvas request
 * Requirements: 1.4
 */
export interface UpdateCanvasRequest {
  name?: string;
  canvas: VisualGraph;
}

/**
 * Update canvas response
 * Requirements: 1.4
 */
export interface UpdateCanvasResponse {
  id: string;
  canvas: VisualGraph;
  updated_at: string;
}

/**
 * Delete canvas response
 * Requirements: 1.5
 */
export interface DeleteCanvasResponse {
  success: boolean;
  id: string;
}

// ============================================================================
// Workflow Execution Types
// ============================================================================

/**
 * Run workflow request
 * Requirements: 2.1
 */
export interface RunWorkflowRequest {
  input: Record<string, any>;
  entityId?: string;  // Optional: entity to move through workflow
}

/**
 * Run workflow response
 * Requirements: 2.1, 2.3
 */
export interface RunWorkflowResponse {
  runId: string;
  versionId: string;  // Auto-created version snapshot
  status: 'pending' | 'running';
  statusUrl: string;  // HATEOAS: URL to poll for status updates
}

/**
 * Node state in status response
 * Requirements: 2.2
 */
export interface NodeStateResponse {
  status: NodeStatus;
  output?: any;
  error?: string;
}

/**
 * Get workflow status response
 * Requirements: 2.2
 */
export interface GetStatusResponse {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  nodes: Record<string, NodeStateResponse>;
  finalOutputs?: Record<string, any>;  // Outputs from terminal nodes
  statusUrl: string;  // HATEOAS: URL to poll for continued status updates
}
