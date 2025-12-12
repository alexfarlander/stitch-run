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
import { isValidWorkerType, getAvailableWorkerTypes } from '@/lib/workers/registry';

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid node types
 */
export const NodeType = {
  WORKER: 'Worker',
  UX: 'UX',
  SPLITTER: 'Splitter',
  COLLECTOR: 'Collector',
  SECTION: 'section',
} as const;

export type NodeTypeValue = typeof NodeType[keyof typeof NodeType];

/**
 * Valid values for entity movement completeAs field
 */
export const VALID_COMPLETE_AS_VALUES = ['success', 'failure', 'neutral'] as const;
export type CompleteAsValue = typeof VALID_COMPLETE_AS_VALUES[number];

function isValidCompleteAsValue(value: string): value is CompleteAsValue {
  return (VALID_COMPLETE_AS_VALUES as readonly string[]).includes(value);
}

/**
 * Valid entity types
 */
export const VALID_ENTITY_TYPES = ['customer', 'churned', 'lead'] as const;
export type EntityType = typeof VALID_ENTITY_TYPES[number];

function isValidEntityType(value: string): value is EntityType {
  return (VALID_ENTITY_TYPES as readonly string[]).includes(value);
}

// ============================================================================
// Validation Error Types
// ============================================================================

/**
 * Validation error structure
 * Provides detailed information about what went wrong during validation
 */
export interface ValidationError {
  type: 'cycle' | 'missing_input' | 'invalid_worker' | 'invalid_mapping' | 'splitter_collector_mismatch' | 'invalid_entity_movement';
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

  // 5. Check splitter/collector pairs (Requirement 4.3)
  const splitterCollectorErrors = validateSplitterCollectorPairs(graph);
  errors.push(...splitterCollectorErrors);

  // 6. Check entity movement configuration (Requirements 10.4, 10.5)
  const entityMovementErrors = validateEntityMovement(graph);
  errors.push(...entityMovementErrors);

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
    if (node.type === NodeType.WORKER && node.data.worker_type) {
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

// ============================================================================
// Splitter/Collector Validation (Requirement 4.3)
// ============================================================================

/**
 * Validate splitter/collector pairs
 * Ensures that splitter nodes connect to collector nodes properly
 * 
 * This validation is designed to catch common mistakes in parallel workflow patterns:
 * - Splitters that don't fan out to multiple paths
 * - Collectors that don't fan in from multiple paths
 * - Splitters without corresponding collectors
 * - Collectors without corresponding splitters
 * 
 * @param graph - The visual graph to check
 * @returns Array of splitter/collector errors (empty if valid)
 */
export function validateSplitterCollectorPairs(graph: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build adjacency list for traversal
  const adjacency = buildAdjacencyList(graph);
  
  // Build reverse adjacency list (for finding upstream nodes)
  const reverseAdjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    reverseAdjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const sources = reverseAdjacency.get(edge.target) || [];
    sources.push(edge.source);
    reverseAdjacency.set(edge.target, sources);
  }

  // Find all splitter and collector nodes
  const splitters = graph.nodes.filter(n =>
    n.type === NodeType.SPLITTER
  );
  const collectors = graph.nodes.filter(n =>
    n.type === NodeType.COLLECTOR
  );

  // Only validate if there are both splitters and collectors in the graph
  // This allows for graphs that don't use parallel patterns at all
  if (splitters.length === 0 && collectors.length === 0) {
    return errors;
  }

  // Validate each splitter
  for (const splitter of splitters) {
    const downstreamNodes = adjacency.get(splitter.id) || [];
    
    // Check that splitter has at least 2 downstream nodes (for parallel fanout)
    if (downstreamNodes.length === 0) {
      errors.push({
        type: 'splitter_collector_mismatch',
        node: splitter.id,
        message: `Splitter node "${splitter.id}" has no downstream connections. Splitters must connect to at least one node.`,
      });
      continue;
    }

    if (downstreamNodes.length === 1) {
      errors.push({
        type: 'splitter_collector_mismatch',
        node: splitter.id,
        message: `Splitter node "${splitter.id}" only connects to one downstream node. Splitters should fan out to multiple parallel paths.`,
      });
    }

    // Find collectors reachable from this splitter
    const reachableCollectors = findReachableCollectors(
      splitter.id,
      adjacency,
      collectors.map(c => c.id)
    );

    // Check that splitter connects to at least one collector
    if (reachableCollectors.length === 0) {
      errors.push({
        type: 'splitter_collector_mismatch',
        node: splitter.id,
        message: `Splitter node "${splitter.id}" does not connect to any Collector node. Splitters must eventually connect to a Collector to merge parallel paths.`,
      });
    }
  }

  // Validate each collector
  for (const collector of collectors) {
    const upstreamNodes = reverseAdjacency.get(collector.id) || [];
    
    // Check that collector has at least 2 upstream nodes (for parallel fanin)
    if (upstreamNodes.length === 0) {
      errors.push({
        type: 'splitter_collector_mismatch',
        node: collector.id,
        message: `Collector node "${collector.id}" has no upstream connections. Collectors must have at least one upstream node.`,
      });
      continue;
    }

    if (upstreamNodes.length === 1) {
      errors.push({
        type: 'splitter_collector_mismatch',
        node: collector.id,
        message: `Collector node "${collector.id}" only has one upstream connection. Collectors should fan in from multiple parallel paths.`,
      });
    }

    // Find splitters that can reach this collector
    const reachableSplitters = findUpstreamSplitters(
      collector.id,
      reverseAdjacency,
      splitters.map(s => s.id)
    );

    // Check that collector has at least one upstream splitter
    if (reachableSplitters.length === 0) {
      errors.push({
        type: 'splitter_collector_mismatch',
        node: collector.id,
        message: `Collector node "${collector.id}" has no upstream Splitter node. Collectors should be paired with Splitters to merge parallel paths.`,
      });
    }
  }

  return errors;
}

/**
 * Find all collector nodes reachable from a splitter node
 * Uses BFS to traverse the graph
 * 
 * @param splitterId - The splitter node ID
 * @param adjacency - Adjacency list of the graph
 * @param collectorIds - Set of collector node IDs
 * @returns Array of reachable collector IDs
 */
function findReachableCollectors(
  splitterId: string,
  adjacency: Map<string, string[]>,
  collectorIds: string[]
): string[] {
  const reachable: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [splitterId];
  const collectorSet = new Set(collectorIds);

  // Use index-based iteration for O(1) dequeue instead of O(N) shift()
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex++];
    
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    // Check if this is a collector
    if (collectorSet.has(current) && current !== splitterId) {
      reachable.push(current);
      // Don't traverse beyond collectors
      continue;
    }

    // Add downstream nodes to queue
    const downstream = adjacency.get(current) || [];
    for (const nodeId of downstream) {
      if (!visited.has(nodeId)) {
        queue.push(nodeId);
      }
    }
  }

  return reachable;
}

/**
 * Find all splitter nodes that can reach a collector node
 * Uses BFS to traverse the graph backwards
 * 
 * @param collectorId - The collector node ID
 * @param reverseAdjacency - Reverse adjacency list of the graph
 * @param splitterIds - Set of splitter node IDs
 * @returns Array of upstream splitter IDs
 */
function findUpstreamSplitters(
  collectorId: string,
  reverseAdjacency: Map<string, string[]>,
  splitterIds: string[]
): string[] {
  const upstream: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [collectorId];
  const splitterSet = new Set(splitterIds);

  // Use index-based iteration for O(1) dequeue instead of O(N) shift()
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex++];
    
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    // Check if this is a splitter
    if (splitterSet.has(current) && current !== collectorId) {
      upstream.push(current);
      // Don't traverse beyond splitters
      continue;
    }

    // Add upstream nodes to queue
    const upstreamNodes = reverseAdjacency.get(current) || [];
    for (const nodeId of upstreamNodes) {
      if (!visited.has(nodeId)) {
        queue.push(nodeId);
      }
    }
  }

  return upstream;
}

// ============================================================================
// Entity Movement Validation (Requirements 10.4, 10.5)
// ============================================================================

/**
 * Validate entity movement configuration on worker nodes
 * 
 * Entity movement determines how entities (customers/leads) move through
 * the canvas when workflows complete. This validation ensures:
 * - targetSectionId references an existing node
 * - completeAs has a valid value (success, failure, neutral)
 * - setEntityType (if present) has a valid entity type (customer, lead, churned)
 * 
 * @param graph - The visual graph to check
 * @returns Array of entity movement errors (empty if valid)
 */
export function validateEntityMovement(graph: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build node ID set for quick lookup
  const nodeIds = new Set(graph.nodes.map(n => n.id));

  // Check each node for entity movement configuration
  for (const node of graph.nodes) {
    // Only worker nodes can have entity movement
    if (node.type !== NodeType.WORKER) {
      continue;
    }

    const entityMovement = node.data.entityMovement;
    if (!entityMovement) {
      continue; // Entity movement is optional
    }

    // Validate entityMovement is an object
    if (typeof entityMovement !== 'object' || entityMovement === null) {
      errors.push({
        type: 'invalid_entity_movement',
        node: node.id,
        message: `Worker node "${node.id}" has invalid "entityMovement" property (must be object)`,
      });
      continue;
    }

    // Validate onSuccess if present
    if (entityMovement.onSuccess) {
      const onSuccessErrors = validateEntityMovementAction(
        node.id,
        'onSuccess',
        entityMovement.onSuccess,
        nodeIds
      );
      errors.push(...onSuccessErrors);
    }

    // Validate onFailure if present
    if (entityMovement.onFailure) {
      const onFailureErrors = validateEntityMovementAction(
        node.id,
        'onFailure',
        entityMovement.onFailure,
        nodeIds
      );
      errors.push(...onFailureErrors);
    }
  }

  return errors;
}

/**
 * Validate a single entity movement action (onSuccess or onFailure)
 * 
 * @param nodeId - The node ID being validated
 * @param actionType - The action type ('onSuccess' or 'onFailure')
 * @param action - The action configuration
 * @param nodeIds - Set of all node IDs in the graph
 * @returns Array of validation errors
 */
function validateEntityMovementAction(
  nodeId: string,
  actionType: string,
  action: any,
  nodeIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate action is an object
  if (typeof action !== 'object' || action === null) {
    errors.push({
      type: 'invalid_entity_movement',
      node: nodeId,
      field: actionType,
      message: `Worker node "${nodeId}" has invalid entityMovement.${actionType} (must be object)`,
    });
    return errors;
  }

  // Requirement 10.4: Validate targetSectionId references existing node
  if (!action.targetSectionId || typeof action.targetSectionId !== 'string') {
    errors.push({
      type: 'invalid_entity_movement',
      node: nodeId,
      field: `${actionType}.targetSectionId`,
      message: `Worker node "${nodeId}" entityMovement.${actionType} missing required "targetSectionId"`,
    });
  } else if (!nodeIds.has(action.targetSectionId)) {
    errors.push({
      type: 'invalid_entity_movement',
      node: nodeId,
      field: `${actionType}.targetSectionId`,
      message: `Worker node "${nodeId}" entityMovement.${actionType}.targetSectionId references non-existent node: "${action.targetSectionId}"`,
    });
  }

  // Requirement 10.5: Validate completeAs has valid value
  if (!action.completeAs || typeof action.completeAs !== 'string') {
    errors.push({
      type: 'invalid_entity_movement',
      node: nodeId,
      field: `${actionType}.completeAs`,
      message: `Worker node "${nodeId}" entityMovement.${actionType} missing required "completeAs"`,
    });
  } else if (!isValidCompleteAsValue(action.completeAs)) {
    errors.push({
      type: 'invalid_entity_movement',
      node: nodeId,
      field: `${actionType}.completeAs`,
      message: `Worker node "${nodeId}" entityMovement.${actionType}.completeAs has invalid value: "${action.completeAs}" (must be one of: ${VALID_COMPLETE_AS_VALUES.join(', ')})`,
    });
  }

  // Requirement 10.5: Validate setEntityType if present
  if (action.setEntityType !== undefined) {
    if (typeof action.setEntityType !== 'string') {
      errors.push({
        type: 'invalid_entity_movement',
        node: nodeId,
        field: `${actionType}.setEntityType`,
        message: `Worker node "${nodeId}" entityMovement.${actionType}.setEntityType must be a string`,
      });
    } else if (!isValidEntityType(action.setEntityType)) {
      errors.push({
        type: 'invalid_entity_movement',
        node: nodeId,
        field: `${actionType}.setEntityType`,
        message: `Worker node "${nodeId}" entityMovement.${actionType}.setEntityType has invalid value: "${action.setEntityType}" (must be one of: ${VALID_ENTITY_TYPES.join(', ')})`,
      });
    }
  }

  return errors;
}


