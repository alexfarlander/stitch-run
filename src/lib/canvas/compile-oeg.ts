/**
 * OEG (Optimized Execution Graph) Compiler
 * 
 * Compiles visual graphs to optimized execution graphs for runtime.
 * Validates, optimizes, and strips UI properties.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.4
 */

import { VisualGraph, VisualNode } from '@/types/canvas-schema';
import { ExecutionGraph, ExecutionNode } from '@/types/execution-graph';
import type { EdgeMapping } from '@/types/canvas-schema';
import { validateGraph, ValidationError } from './validate-graph';

// ============================================================================
// Compilation Result Types
// ============================================================================

/**
 * Result of compilation attempt
 * Either succeeds with an execution graph or fails with validation errors
 */
export interface CompileResult {
  success: boolean;
  executionGraph?: ExecutionGraph;
  errors?: ValidationError[];
}

// ============================================================================
// Main Compilation Function
// ============================================================================

/**
 * Compile visual graph to optimized execution graph
 * Validates, optimizes, and strips UI properties
 * 
 * Process:
 * 1. VALIDATION - Check for cycles, missing inputs, invalid workers, invalid mappings
 * 2. OPTIMIZATION - Build adjacency map for O(1) edge lookup
 * 3. STRIPPING - Remove UI properties (position, style, label, width, height)
 * 4. INDEXING - Index nodes by ID and edge data by "source->target"
 * 5. COMPUTATION - Compute entry and terminal nodes
 * 
 * CRITICAL: Node IDs are preserved exactly during compilation
 * - The Runner logs status updates against these IDs
 * - The frontend uses these IDs to highlight nodes during execution
 * - DO NOT rename, sanitize, or modify node IDs
 * 
 * @param visualGraph - The visual graph to compile
 * @returns CompileResult with either execution graph or validation errors
 */
export function compileToOEG(visualGraph: VisualGraph): CompileResult {
  // 1. VALIDATION
  const errors = validateGraph(visualGraph);
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  // 2. OPTIMIZATION - Build adjacency map and outbound edges (Requirement 3.1)
  // Use Object.create(null) to avoid prototype pollution issues with special keys like __proto__
  const adjacency: Record<string, string[]> = Object.create(null);
  const edgeData: Record<string, EdgeMapping> = Object.create(null);
  const outboundEdges: Record<string, import('@/types/execution-graph').CompactEdge[]> = Object.create(null);
  const inboundEdges: Record<string, string[]> = Object.create(null);

  // Initialize adjacency, outboundEdges, and inboundEdges for all nodes
  for (const node of visualGraph.nodes) {
    adjacency[node.id] = [];
    outboundEdges[node.id] = [];
    inboundEdges[node.id] = [];
  }

  // Build adjacency map, edge data index, and outbound edges list
  for (const edge of visualGraph.edges) {
    const edgeType = edge.type || 'journey';

    // 1. ALWAYS add to outboundEdges (for system edges and visual animation)
    if (!outboundEdges[edge.source]) {
      outboundEdges[edge.source] = [];
    }
    outboundEdges[edge.source].push({
      id: edge.id,
      target: edge.target,
      type: edgeType,
      data: edge.data
    });

    // 2. Add to adjacency ONLY if NOT a system edge
    // System edges are background tasks that don't create logical dependencies
    if (edgeType !== 'system') {
      if (!adjacency[edge.source]) {
        adjacency[edge.source] = [];
      }
      adjacency[edge.source].push(edge.target);

      // Also populate inboundEdges (reverse adjacency map)
      // This enables O(1) upstream node lookup
      if (!inboundEdges[edge.target]) {
        inboundEdges[edge.target] = [];
      }
      inboundEdges[edge.target].push(edge.source);
    }

    // 3. Index edge data by "source->target" (Requirement 3.6)
    if (edge.data?.mapping) {
      edgeData[`${edge.source}->${edge.target}`] = edge.data.mapping as EdgeMapping;
    }
  }
  
  // 3. STRIPPING - Remove UI properties (Requirement 3.2)
  // CRITICAL: ExecutionNode.id MUST exactly match VisualNode.id
  // The Runner logs status updates against these IDs
  // The frontend uses these IDs to highlight nodes during execution
  // DO NOT rename, sanitize, or modify node IDs during compilation
  // Use Object.create(null) to avoid prototype pollution issues with special keys like __proto__
  const nodes: Record<string, ExecutionNode> = Object.create(null);
  
  for (const node of visualGraph.nodes) {
    nodes[node.id] = stripUIProperties(node);
  }
  
  // 4. COMPUTE entry and terminal nodes (Requirements 3.4, 3.5)
  const hasIncoming = new Set<string>();
  const hasOutgoing = new Set<string>();
  
  for (const edge of visualGraph.edges) {
    hasIncoming.add(edge.target);
    hasOutgoing.add(edge.source);
  }
  
  const entryNodes = Object.keys(nodes).filter(id => !hasIncoming.has(id));
  const terminalNodes = Object.keys(nodes).filter(id => !hasOutgoing.has(id));
  
  // 5. RETURN execution graph
  return {
    success: true,
    executionGraph: {
      nodes,
      adjacency,
      edgeData,
      outboundEdges,
      inboundEdges,
      entryNodes,
      terminalNodes
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strip UI properties from visual node to create execution node
 * Removes: position, style, label, width, height, parentNode, extent
 * Preserves: id, type, worker_type, config, inputs, outputs, entityMovement
 * 
 * CRITICAL: Node ID is preserved exactly - no renaming or sanitization
 * 
 * @param visualNode - The visual node to strip
 * @returns ExecutionNode with only runtime-necessary properties
 */
function stripUIProperties(visualNode: VisualNode): ExecutionNode {
  return {
    id: visualNode.id,  // MUST match VisualNode.id exactly
    type: visualNode.type,
    worker_type: visualNode.data.worker_type,
    config: visualNode.data.config,
    inputs: visualNode.data.inputs,
    outputs: visualNode.data.outputs,
    entityMovement: visualNode.data.entityMovement
  };
}
