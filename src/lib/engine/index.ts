/**
 * Execution Engine Core
 * Implements edge-walking execution model for Stitch orchestration
 * Validates: Requirements 9.1, 9.2, 9.3, 9.5
 */

import { StitchFlow, StitchEdge, StitchRun, NodeState } from '@/types/stitch';

/**
 * Identifies all outbound edges from a completed node
 * Handles parallel node instances by stripping suffixes (_0, _1, etc.)
 * Validates: Requirements 9.1
 * 
 * @param nodeId - The ID of the source node (may include parallel suffix like "worker_0")
 * @param flow - The flow graph containing edges
 * @returns Array of edges where the node is the source
 */
export function getOutboundEdges(nodeId: string, flow: StitchFlow): StitchEdge[] {
  // Strip parallel suffix (_0, _1, etc.) to match the static graph ID
  // Example: "worker_0" becomes "worker"
  const staticNodeId = nodeId.replace(/_\d+$/, '');
  
  return flow.graph.edges.filter(edge => edge.source === staticNodeId);
}

/**
 * Identifies all target nodes from outbound edges
 * Validates: Requirements 9.2
 * 
 * @param edges - Array of edges to extract targets from
 * @returns Array of unique target node IDs
 */
export function getTargetNodes(edges: StitchEdge[]): string[] {
  const targets = edges.map(edge => edge.target);
  // Return unique targets
  return Array.from(new Set(targets));
}

/**
 * Checks if all upstream dependencies of a node are completed
 * Handles parallel node instances by checking all parallel paths
 * Validates: Requirements 9.3
 * 
 * @param nodeId - The ID of the target node to check
 * @param flow - The flow graph containing edges
 * @param run - The run containing node states
 * @returns true if all upstream nodes are completed, false otherwise
 */
export function areUpstreamDependenciesCompleted(
  nodeId: string,
  flow: StitchFlow,
  run: StitchRun
): boolean {
  // Find all edges where this node is the target
  const inboundEdges = flow.graph.edges.filter(edge => edge.target === nodeId);
  
  // If no inbound edges, node has no dependencies (can fire immediately)
  if (inboundEdges.length === 0) {
    return true;
  }
  
  // Check if all source nodes are completed
  for (const edge of inboundEdges) {
    const sourceNodeId = edge.source;
    
    // Check if there are parallel instances of this source node
    const parallelInstances = Object.keys(run.node_states).filter(
      key => key.startsWith(`${sourceNodeId}_`) && /_\d+$/.test(key)
    );
    
    if (parallelInstances.length > 0) {
      // If parallel instances exist, ALL of them must be in a terminal state (completed or failed)
      for (const parallelId of parallelInstances) {
        const state = run.node_states[parallelId];
        if (!state || (state.status !== 'completed' && state.status !== 'failed')) {
          return false; // At least one parallel instance still running or pending
        }
      }
    } else {
      // No parallel instances, check the static node
      const sourceState = run.node_states[sourceNodeId];
      
      // If source node doesn't exist or isn't completed, dependencies not satisfied
      if (!sourceState || sourceState.status !== 'completed') {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Merges outputs from all upstream nodes into a single input object
 * Validates: Requirements 9.5
 * 
 * @param nodeId - The ID of the target node
 * @param flow - The flow graph containing edges
 * @param run - The run containing node states with outputs
 * @returns Merged input object combining all upstream outputs
 */
export function mergeUpstreamOutputs(
  nodeId: string,
  flow: StitchFlow,
  run: StitchRun
): any {
  // Find all edges where this node is the target
  const inboundEdges = flow.graph.edges.filter(edge => edge.target === nodeId);
  
  // If no inbound edges, return empty object
  if (inboundEdges.length === 0) {
    return {};
  }
  
  // Merge all upstream outputs
  const mergedInput: Record<string, unknown> = {};
  
  for (const edge of inboundEdges) {
    const sourceState = run.node_states[edge.source];
    
    // Only merge if source has output
    if (sourceState && sourceState.output !== undefined) {
      // If output is an object, merge its properties
      if (typeof sourceState.output === 'object' && sourceState.output !== null && !Array.isArray(sourceState.output)) {
        Object.assign(mergedInput, sourceState.output as Record<string, unknown>);
      } else {
        // For non-object outputs, use the source node ID as the key
        mergedInput[edge.source] = sourceState.output;
      }
    }
  }
  
  return mergedInput;
}

/**
 * Checks if a node is a terminal node (has no outbound edges)
 * Handles parallel node instances by stripping suffixes (_0, _1, etc.)
 * Validates: Requirements 9.7
 * 
 * @param nodeId - The ID of the node to check (may include parallel suffix like "worker_0")
 * @param flow - The flow graph containing edges
 * @returns true if node has no outbound edges, false otherwise
 */
export function isTerminalNode(nodeId: string, flow: StitchFlow): boolean {
  // Strip parallel suffix (_0, _1, etc.) to match the static graph ID
  const staticNodeId = nodeId.replace(/_\d+$/, '');
  
  return !flow.graph.edges.some(edge => edge.source === staticNodeId);
}
