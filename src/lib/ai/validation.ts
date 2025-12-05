/**
 * AI Graph Validation Utilities
 * 
 * Validates AI-generated graph updates to ensure they use valid worker types
 * and connect to existing nodes before applying changes to the canvas.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

import { isValidWorkerType, getAvailableWorkerTypes } from '@/lib/workers/registry';
import type { Node, Edge } from '@xyflow/react';

/**
 * Type guard to check if an object is a valid Node
 */
export function isValidNode(obj: any): obj is Node {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.position === 'object' &&
    typeof obj.position.x === 'number' &&
    typeof obj.position.y === 'number'
  );
}

/**
 * Type guard to check if an object is a valid Edge
 */
export function isValidEdge(obj: any): obj is Edge {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.target === 'string'
  );
}

export interface ValidationError {
  field: string;
  message: string;
  details?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates that all nodes use valid worker types from the registry
 * 
 * Property 31: AI worker type validation
 * For any node created by the AI, the worker type SHALL exist in the WORKER_DEFINITIONS registry.
 * 
 * @param nodes - Array of nodes to validate
 * @returns Validation result with any errors found
 * 
 * @example
 * ```typescript
 * const nodes = [{ id: '1', data: { workerType: 'webhook' }, position: { x: 0, y: 0 } }];
 * const result = validateWorkerTypes(nodes);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateWorkerTypes(nodes: Node[]): ValidationResult {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    // Accept both workerType (camelCase) and worker_type (snake_case)
    const workerType = node.data?.workerType || node.data?.worker_type || node.data?.type;
    
    if (!workerType) {
      errors.push({
        field: `node.${node.id}.workerType`,
        message: `Node "${node.id}" is missing a worker type`,
        details: { nodeId: node.id }
      });
      continue;
    }

    if (!isValidWorkerType(workerType)) {
      errors.push({
        field: `node.${node.id}.workerType`,
        message: `Invalid worker type "${workerType}" for node "${node.id}". Valid types are: ${getValidWorkerTypesList()}`,
        details: { nodeId: node.id, workerType }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that all edges connect to existing nodes
 * 
 * Property 32: AI edge validation
 * For any edge created by the AI, both the source and target nodes SHALL exist in the canvas.
 * 
 * @param edges - Array of edges to validate
 * @param existingNodes - Array of existing nodes on the canvas
 * @param newNodes - Array of new nodes being added (optional)
 * @returns Validation result with any errors found
 * 
 * @example
 * ```typescript
 * const edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
 * const existingNodes = [{ id: 'n1', position: { x: 0, y: 0 } }];
 * const newNodes = [{ id: 'n2', position: { x: 100, y: 0 } }];
 * const result = validateEdgeConnections(edges, existingNodes, newNodes);
 * ```
 */
export function validateEdgeConnections(
  edges: Edge[],
  existingNodes: Node[],
  newNodes: Node[] = []
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Create a set of all valid node IDs (existing + new)
  const allNodeIds = new Set([
    ...existingNodes.map(n => n.id),
    ...newNodes.map(n => n.id)
  ]);

  for (const edge of edges) {
    if (!edge.source) {
      errors.push({
        field: `edge.${edge.id}.source`,
        message: `Edge "${edge.id}" is missing a source node`,
        details: { edgeId: edge.id }
      });
    } else if (!allNodeIds.has(edge.source)) {
      errors.push({
        field: `edge.${edge.id}.source`,
        message: `Edge "${edge.id}" references non-existent source node "${edge.source}"`,
        details: { edgeId: edge.id, sourceId: edge.source }
      });
    }

    if (!edge.target) {
      errors.push({
        field: `edge.${edge.id}.target`,
        message: `Edge "${edge.id}" is missing a target node`,
        details: { edgeId: edge.id }
      });
    } else if (!allNodeIds.has(edge.target)) {
      errors.push({
        field: `edge.${edge.id}.target`,
        message: `Edge "${edge.id}" references non-existent target node "${edge.target}"`,
        details: { edgeId: edge.id, targetId: edge.target }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a complete graph update from the AI
 * 
 * Validates worker types, edge connections, and execution paths.
 * 
 * @param graph - The graph update from the AI
 * @param existingNodes - Current nodes on the canvas
 * @returns Validation result with all errors found
 */
export function validateGraphUpdate(
  graph: { nodes: Node[]; edges: Edge[] },
  existingNodes: Node[]
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate worker types for new nodes
  const workerTypeValidation = validateWorkerTypes(graph.nodes);
  errors.push(...workerTypeValidation.errors);

  // Validate edge connections
  const edgeValidation = validateEdgeConnections(
    graph.edges,
    existingNodes,
    graph.nodes
  );
  errors.push(...edgeValidation.errors);

  // Validate execution path (cycles and orphans)
  const pathValidation = validateExecutionPath(graph.nodes, graph.edges);
  errors.push(...pathValidation.errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formats validation errors into a user-friendly message
 * 
 * @param errors - Array of validation errors
 * @returns Formatted error message for display in chat
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  const errorMessages = errors.map(err => `• ${err.message}`).join('\n');
  
  return `I found some issues with the workflow:\n\n${errorMessages}\n\nPlease try again with valid worker types and node connections.`;
}

/**
 * Validates execution path for cycles and orphaned nodes
 * 
 * Checks for:
 * - Cycles in the graph (which would cause infinite loops)
 * - Orphaned nodes (nodes with no incoming or outgoing edges)
 * 
 * @param nodes - Array of nodes to validate
 * @param edges - Array of edges to validate
 * @returns Validation result with any errors found
 */
export function validateExecutionPath(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const errors: ValidationError[] = [];

  // Build adjacency list for cycle detection
  const adjacencyList = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  // Initialize all nodes
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  });

  // Build graph structure
  edges.forEach(edge => {
    const sourceSet = adjacencyList.get(edge.source);
    if (sourceSet) {
      sourceSet.add(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
  });

  // Detect cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check for cycles
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push({
          field: 'graph.cycles',
          message: 'The workflow contains cycles which would cause infinite loops. Please ensure the workflow has a clear start and end.',
          details: { nodeId: node.id }
        });
        break; // Only report once
      }
    }
  }

  // Check for orphaned nodes (nodes with no connections)
  // Allow nodes with only incoming or only outgoing edges (start/end nodes)
  nodes.forEach(node => {
    const hasIncoming = (inDegree.get(node.id) || 0) > 0;
    const hasOutgoing = (outDegree.get(node.id) || 0) > 0;
    
    if (!hasIncoming && !hasOutgoing && nodes.length > 1) {
      errors.push({
        field: `node.${node.id}.connections`,
        message: `Node "${node.id}" is orphaned (has no connections). Please connect it to the workflow.`,
        details: { nodeId: node.id }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to get a comma-separated list of valid worker types
 */
function getValidWorkerTypesList(): string {
  return getAvailableWorkerTypes().join(', ');
}
