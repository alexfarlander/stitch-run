/**
 * Execution Graph Type Definitions
 * 
 * Defines the optimized execution graph structure for runtime workflow execution.
 * This is a stripped-down version of the visual graph with O(1) lookup structures.
 * 
 * Key differences from VisualGraph:
 * - No UI properties (position, style, label, width, height)
 * - Nodes indexed by ID for O(1) lookup
 * - Adjacency map for instant edge traversal
 * - Edge data indexed by "source->target" for mapping lookup
 * - Pre-computed entry and terminal nodes
 * 
 * Related: canvas-schema.ts (visual representation with UI properties)
 */

import { InputSchema, OutputSchema, EntityMovementConfig, EdgeMapping } from './canvas-schema';

// ============================================================================
// Execution Node Types
// ============================================================================

/**
 * Execution node (stripped of UI properties)
 * Contains only the data needed for runtime execution
 * 
 * CRITICAL: ExecutionNode.id MUST exactly match VisualNode.id
 * - The Runner logs status updates against these IDs
 * - The frontend uses these IDs to highlight nodes during execution
 * - DO NOT rename, sanitize, or modify node IDs during compilation
 */
export interface ExecutionNode {
  id: string;                                    // MUST match VisualNode.id exactly
  type: string;                                  // worker, ux, splitter, collector, etc.
  worker_type?: string;                          // For worker nodes: claude, minimax, etc.
  config?: Record<string, unknown>;                  // Worker-specific configuration
  inputs?: Record<string, InputSchema>;          // Input schema for validation
  outputs?: Record<string, OutputSchema>;        // Output schema for validation
  entityMovement?: EntityMovementConfig;         // Entity movement rules
}

// ============================================================================
// Execution Graph Types
// ============================================================================

/**
 * Optimized execution graph for runtime
 * Stripped of UI properties, indexed for O(1) lookup
 * 
 * This structure is designed for efficient workflow execution:
 * - Nodes are indexed by ID for instant lookup
 * - Adjacency map provides O(1) edge traversal
 * - Edge data is indexed for quick mapping lookup
 * - Entry and terminal nodes are pre-computed
 */
export interface ExecutionGraph {
  /**
   * Nodes indexed by ID for O(1) lookup
   * Example: { "node1": { id: "node1", type: "worker", ... }, ... }
   */
  nodes: Record<string, ExecutionNode>;
  
  /**
   * Adjacency map for instant edge traversal
   * Maps source node ID to array of target node IDs
   * Example: { "nodeA": ["nodeB", "nodeC"], "nodeB": ["nodeD"] }
   * 
   * This enables O(1) lookup of downstream nodes during execution
   */
  adjacency: Record<string, string[]>;
  
  /**
   * Edge data indexed by "source->target" for mapping lookup
   * Example: { "nodeA->nodeB": { prompt: "output.text" }, ... }
   * 
   * This enables O(1) lookup of data mappings during edge traversal
   */
  edgeData: Record<string, EdgeMapping>;
  
  /**
   * Entry points (nodes with no incoming edges)
   * These are the starting nodes for workflow execution
   * Example: ["start", "input1"]
   */
  entryNodes: string[];
  
  /**
   * Terminal nodes (nodes with no outgoing edges)
   * These indicate workflow completion when all are finished
   * Example: ["end", "output1"]
   */
  terminalNodes: string[];
}

