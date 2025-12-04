/**
 * Graph Validation Utilities
 * 
 * Provides validation functions for visual graphs including:
 * - Cycle detection using DFS
 * - Required input validation
 * - Worker type validation
 * - Edge mapping validation
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */

import { VisualGraph, VisualNode } from '@/types/canvas-schema';
import { workerRegistry, isValidWorkerType, getAvailableWorkerTypes } from '@/lib/workers/registry';

// ============================================================================
// Validation Error Types
// ============================================================================

/**
 * Validation error structure
 * Provides detailed information about what went wrong during validation
 */
export interface ValidationError {
  type: 'cycle' | 'missing_input' | 'invalid_worker' | 'invalid_mapping';
  node?: string;
  edge?: string;
  field?: string;
  message: string;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a visual graph
 * Returns array of validation errors (empty if valid)
 * 
 * @param graph - The visual graph to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateGraph(graph: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Check for cycles (Requirement 4.1)
  const cycleErrors = detectCycles(graph);
  errors.push(...cycleErrors);

  // 2. Check required inputs (Requirement 4.2)
  const inputErrors = validateRequiredInputs(graph);
  errors.push(...inputErrors);

  // 3. Check worker types (Requirement 4.3)
  const workerErrors = validateWorkerTypes(graph);
  errors.push(...workerErrors);

  // 4. Check edge mappings (Requirement 4.5)
  const mappingErrors = validateEdgeMappings(graph);
  errors.push(...mappingErrors);

  return errors;
}

// ============================================================================
// Cycle Detection (Requirement 4.1)
// ============================================================================

/**
 * Detect cycles in the graph using DFS
 * A cycle would cause infinite loops during execution
 * 
 * Algorithm: Use DFS with three states:
 * - WHITE (0): Not visited
 * - GRAY (1): Currently being explored (in recursion stack)
 * - BLACK (2): Fully explored
 * 
 * If we encounter a GRAY node during DFS, we have a cycle
 * 
 * @param graph - The visual graph to check
 * @returns Array of cycle errors (empty if no cycles)
 */
export function detectCycles(graph: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build adjacency list
  const adjacency = buildAdjacencyList(graph);

  // Track node states: 0 = white (unvisited), 1 = gray (in progress), 2 = black (done)
  const state = new Map<string, number>();
  const path: string[] = []; // Track current path for error reporting

  // Initialize all nodes as white
  for (const node of graph.nodes) {
    state.set(node.id, 0);
  }

  // DFS helper function
  function dfs(nodeId: string): boolean {
    state.set(nodeId, 1); // Mark as gray (in progress)
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighborId of neighbors) {
      const neighborState = state.get(neighborId) || 0;

      if (neighborState === 1) {
        // Found a back edge (cycle)
        const cycleStart = path.indexOf(neighborId);
        const cycle = path.slice(cycleStart).concat(neighborId);
        errors.push({
          type: 'cycle',
          message: `Graph contains a cycle: ${cycle.join(' -> ')}. This would cause infinite loops during execution.`,
        });
        return true;
      }

      if (neighborState === 0) {
        // Unvisited node, explore it
        if (dfs(neighborId)) {
          return true; // Cycle found in subtree
        }
      }
    }

    path.pop();
    state.set(nodeId, 2); // Mark as black (done)
    return false;
  }

  // Run DFS from each unvisited node
  for (const node of graph.nodes) {
    if (state.get(node.id) === 0) {
      if (dfs(node.id)) {
        // Stop after finding first cycle
        break;
      }
    }
  }

  return errors;
}

// ============================================================================
// Required Input Validation (Requirement 4.2)
// ============================================================================

/**
 * Validate that all required inputs have connections or default values
 * 
 * STRICT VALIDATION: Required inputs MUST have either:
 * 1. An explicit edge mapping (edge.data.mapping[inputName])
 * 2. A default value (inputDef.default)
 * 
 * We do NOT allow implicit satisfaction through unmapped edges because:
 * - Runtime will crash if the upstream node doesn't provide the expected data
 * - Better to catch this at validation time than at runtime
 * 
 * Example of what we REJECT:
 * - Node A outputs { text: "hello" }
 * - Node B requires { prompt: string, duration: number }
 * - Edge A->B exists but has no explicit mapping
 * - Result: INVALID - we don't know if A provides prompt or duration
 * 
 * @param graph - The visual graph to check
 * @returns Array of missing input errors (empty if all inputs satisfied)
 */
export function validateRequiredInputs(graph: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build a map of which inputs have EXPLICIT mappings
  const connectedInputs = new Map<string, Set<string>>();

  for (const edge of graph.edges) {
    if (!connectedInputs.has(edge.target)) {
      connectedInputs.set(edge.target, new Set());
    }

    // ONLY count inputs that have explicit mappings
    // Edges without mappings are considered "implicit" and unsafe for required inputs
    if (edge.data?.mapping) {
      for (const targetInput of Object.keys(edge.data.mapping)) {
        connectedInputs.get(edge.target)!.add(targetInput);
      }
    }
    // NOTE: We intentionally do NOT add implicit connections here
    // An edge without explicit mapping cannot satisfy required inputs
  }

  // Check each node's required inputs
  for (const node of graph.nodes) {
    if (!node.data.inputs) continue;

    const nodeConnectedInputs = connectedInputs.get(node.id) || new Set();

    for (const [inputName, inputDef] of Object.entries(node.data.inputs)) {
      if (inputDef.required) {
        const hasExplicitMapping = nodeConnectedInputs.has(inputName);
        const hasDefault = inputDef.default !== undefined;

        if (!hasExplicitMapping && !hasDefault) {
          errors.push({
            type: 'missing_input',
            node: node.id,
            field: inputName,
            message: `Required input "${inputName}" on node "${node.id}" has no explicit mapping or default value. Add an edge with data.mapping or provide a default.`,
          });
        }
      }
    }
  }

  return errors;
}

// ============================================================================
// Worker Type Validation (Requirement 4.3)
// ============================================================================

/**
 * Validate that all worker nodes reference valid worker types
 * 
 * @param graph - The visual graph to check
 * @returns Array of invalid worker errors (empty if all workers valid)
 */
export function validateWorkerTypes(graph: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of graph.nodes) {
    if (node.type === 'worker' && node.data.worker_type) {
      if (!isValidWorkerType(node.data.worker_type)) {
        errors.push({
          type: 'invalid_worker',
          node: node.id,
          message: `Unknown worker type: "${node.data.worker_type}" on node "${node.id}". Valid types: ${getAvailableWorkerTypes().join(', ')}`,
        });
      }
    }
  }

  return errors;
}

// ============================================================================
// Edge Mapping Validation (Requirement 4.5)
// ============================================================================

/**
 * Validate edge mappings reference valid fields
 * 
 * @param graph - The visual graph to check
 * @returns Array of invalid mapping errors (empty if all mappings valid)
 */
export function validateEdgeMappings(graph: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build node lookup
  const nodeMap = new Map<string, VisualNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  for (const edge of graph.edges) {
    if (!edge.data?.mapping) continue;

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      errors.push({
        type: 'invalid_mapping',
        edge: edge.id,
        message: `Edge "${edge.id}" references non-existent nodes`,
      });
      continue;
    }

    // Validate each mapping entry
    for (const [targetInput, sourcePath] of Object.entries(edge.data.mapping)) {
      // Check target input exists
      if (targetNode.data.inputs && !targetNode.data.inputs[targetInput]) {
        errors.push({
          type: 'invalid_mapping',
          edge: edge.id,
          field: targetInput,
          message: `Edge "${edge.id}" maps to non-existent input "${targetInput}" on target node "${targetNode.id}"`,
        });
      }

      // Validate source path format (basic check)
      // Source path can be:
      // - A simple output key: "result"
      // - A nested path: "output.text"
      // - A static value: "5" or "true"
      // We do basic validation here - runtime will handle complex JSONPath
      if (typeof sourcePath !== 'string' || sourcePath.trim() === '') {
        errors.push({
          type: 'invalid_mapping',
          edge: edge.id,
          field: targetInput,
          message: `Edge "${edge.id}" has invalid source path for input "${targetInput}": must be a non-empty string`,
        });
      }
    }
  }

  return errors;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build adjacency list from graph edges
 * 
 * @param graph - The visual graph
 * @returns Map of node ID to array of target node IDs
 */
function buildAdjacencyList(graph: VisualGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  // Initialize all nodes
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  // Add edges
  for (const edge of graph.edges) {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }

  return adjacency;
}


