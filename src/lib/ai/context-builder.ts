/**
 * AI Manager Context Builder
 * 
 * Builds structured context for LLM requests by:
 * - Loading worker definitions from registry
 * - Stripping UI properties from canvas to reduce token usage
 * - Formatting context as JSON for LLM consumption
 * 
 * Requirements: 5.6, 7.1
 */

import { VisualGraph, VisualNode, VisualEdge } from '@/types/canvas-schema';
import { WorkerDefinition } from '@/types/worker-definition';
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';

// ============================================================================
// Stripped Canvas Types (for LLM context)
// ============================================================================

/**
 * Stripped node without UI properties
 * Contains only execution-relevant data
 */
export interface StrippedNode {
  id: string;
  type: string;
  worker_type?: string;
  config?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  entityMovement?: unknown;
}

/**
 * Stripped edge without UI properties
 * Contains only data flow information
 */
export interface StrippedEdge {
  source: string;
  target: string;
  mapping?: Record<string, string>;
}

/**
 * Stripped canvas for LLM context
 * Minimal representation without UI properties
 */
export interface StrippedCanvas {
  nodes: StrippedNode[];
  edges: StrippedEdge[];
}

/**
 * AI Manager context structure
 * Complete context provided to LLM for workflow operations
 */
export interface AIManagerContext {
  workers: WorkerDefinition[];
  currentCanvas?: StrippedCanvas;
  request: string;
}

// ============================================================================
// Context Builder Functions
// ============================================================================

/**
 * Strip UI properties from a visual node
 * Removes position, style, width, height, parentNode, extent
 * 
 * Requirement 5.6: Strip UI-only properties to reduce token usage
 * 
 * @param node - Visual node with UI properties
 * @returns Stripped node with only execution data
 */
export function stripNodeUIProperties(node: VisualNode): StrippedNode {
  const stripped: StrippedNode = {
    id: node.id,
    type: node.type,
  };

  // Include worker_type if present
  if (node.data.worker_type) {
    stripped.worker_type = node.data.worker_type;
  }

  // Include config if present
  if (node.data.config) {
    stripped.config = node.data.config;
  }

  // Include inputs schema if present
  if (node.data.inputs) {
    stripped.inputs = node.data.inputs;
  }

  // Include outputs schema if present
  if (node.data.outputs) {
    stripped.outputs = node.data.outputs;
  }

  // Include entity movement if present
  if (node.data.entityMovement) {
    stripped.entityMovement = node.data.entityMovement;
  }

  return stripped;
}

/**
 * Strip UI properties from a visual edge
 * Removes sourceHandle, targetHandle, type, animated, style
 * 
 * Requirement 5.6: Strip UI-only properties to reduce token usage
 * 
 * @param edge - Visual edge with UI properties
 * @returns Stripped edge with only data flow information
 */
export function stripEdgeUIProperties(edge: VisualEdge): StrippedEdge {
  const stripped: StrippedEdge = {
    source: edge.source,
    target: edge.target,
  };

  // Include mapping if present
  if (edge.data?.mapping) {
    stripped.mapping = edge.data.mapping;
  }

  return stripped;
}

/**
 * Strip UI properties from entire canvas
 * Converts VisualGraph to StrippedCanvas by removing all UI properties
 * 
 * Requirement 5.6: Strip UI-only properties to reduce token usage
 * 
 * @param canvas - Visual graph with UI properties
 * @returns Stripped canvas with only execution data
 */
export function stripCanvasUIProperties(canvas: VisualGraph): StrippedCanvas {
  return {
    nodes: canvas.nodes.map(stripNodeUIProperties),
    edges: canvas.edges.map(stripEdgeUIProperties),
  };
}

/**
 * Load worker definitions from registry
 * Returns all available worker definitions for LLM context
 * 
 * Requirement 7.1: Load all available worker definitions
 * 
 * @returns Array of worker definitions
 */
export function loadWorkerDefinitions(): WorkerDefinition[] {
  return Object.values(WORKER_DEFINITIONS);
}

/**
 * Build AI Manager context
 * Creates complete context object for LLM requests
 * 
 * Requirements:
 * - 5.6: Strip UI properties from canvas
 * - 7.1: Load worker definitions from registry
 * 
 * @param request - Natural language request from user
 * @param currentCanvas - Optional current canvas for modification requests
 * @returns Complete AI Manager context
 */
export function buildAIManagerContext(
  request: string,
  currentCanvas?: VisualGraph
): AIManagerContext {
  const context: AIManagerContext = {
    workers: loadWorkerDefinitions(),
    request,
  };

  // Include stripped canvas if provided
  if (currentCanvas) {
    context.currentCanvas = stripCanvasUIProperties(currentCanvas);
  }

  return context;
}

/**
 * Format context as JSON string
 * Converts context object to formatted JSON for LLM consumption
 * 
 * @param context - AI Manager context
 * @param pretty - Whether to pretty-print JSON (default: true)
 * @returns JSON string representation of context
 */
export function formatContextAsJSON(
  context: AIManagerContext,
  pretty: boolean = true
): string {
  return JSON.stringify(context, null, pretty ? 2 : 0);
}
