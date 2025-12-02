/**
 * Collector Node Handler
 * Handles execution of Collector nodes that fan in parallel execution paths
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6
 */

import { NodeConfig, NodeState } from '@/types/stitch';
import { updateNodeState, getRun } from '@/lib/db/runs';

/**
 * Identifies all upstream parallel paths for a collector node
 * Uses regex pattern matching to find nodeIds with index suffixes
 * Validates: Requirements 7.1
 * 
 * @param nodeStates - The current node states from the run
 * @param upstreamNodeIds - Array of upstream node IDs (without suffixes)
 * @returns Array of augmented nodeIds that match the parallel path pattern
 */
export function identifyUpstreamPaths(
  nodeStates: Record<string, NodeState>,
  upstreamNodeIds: string[]
): string[] {
  const parallelPaths: string[] = [];
  
  // For each upstream node, find all parallel paths (nodeId_0, nodeId_1, etc.)
  for (const baseNodeId of upstreamNodeIds) {
    // Pattern: {baseNodeId}_{digit}
    const pattern = new RegExp(`^${escapeRegex(baseNodeId)}_\\d+$`);
    
    // Find all matching nodeIds in the current state
    for (const nodeId of Object.keys(nodeStates)) {
      if (pattern.test(nodeId)) {
        parallelPaths.push(nodeId);
      }
    }
  }
  
  return parallelPaths;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if all upstream parallel paths are completed
 * Validates: Requirements 7.2
 * 
 * @param nodeStates - The current node states from the run
 * @param parallelPaths - Array of parallel path nodeIds
 * @returns true if all paths are completed, false otherwise
 */
export function areAllPathsCompleted(
  nodeStates: Record<string, NodeState>,
  parallelPaths: string[]
): boolean {
  // If no parallel paths exist, cannot proceed
  if (parallelPaths.length === 0) {
    return false;
  }
  
  // Check if all parallel paths have 'completed' status
  return parallelPaths.every(nodeId => {
    const state = nodeStates[nodeId];
    return state && state.status === 'completed';
  });
}

/**
 * Checks if any upstream parallel path has failed
 * Validates: Requirements 7.6
 * 
 * @param nodeStates - The current node states from the run
 * @param parallelPaths - Array of parallel path nodeIds
 * @returns true if any path has failed, false otherwise
 */
export function hasAnyPathFailed(
  nodeStates: Record<string, NodeState>,
  parallelPaths: string[]
): boolean {
  return parallelPaths.some(nodeId => {
    const state = nodeStates[nodeId];
    return state && state.status === 'failed';
  });
}

/**
 * Merges outputs from parallel paths into an ordered array
 * Preserves order by sorting by index suffix
 * Validates: Requirements 7.3, 7.4
 * 
 * @param nodeStates - The current node states from the run
 * @param parallelPaths - Array of parallel path nodeIds
 * @returns Array of outputs in order
 */
export function mergeParallelOutputs(
  nodeStates: Record<string, NodeState>,
  parallelPaths: string[]
): any[] {
  // Sort parallel paths by their index suffix to preserve order
  const sortedPaths = [...parallelPaths].sort((a, b) => {
    const indexA = extractIndexFromNodeId(a);
    const indexB = extractIndexFromNodeId(b);
    return indexA - indexB;
  });
  
  // Extract outputs in order
  return sortedPaths.map(nodeId => {
    const state = nodeStates[nodeId];
    return state?.output;
  });
}

/**
 * Extracts the numeric index from a parallel path nodeId
 * Example: "worker-1_5" -> 5
 */
function extractIndexFromNodeId(nodeId: string): number {
  const match = nodeId.match(/_(\d+)$/);
  if (!match) {
    return 0;
  }
  return parseInt(match[1], 10);
}

/**
 * Fires a Collector node by merging parallel execution paths
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param config - The node configuration
 * @param upstreamNodeIds - Array of upstream node IDs (without suffixes)
 * @returns Promise that resolves when the collector is processed
 */
export async function fireCollectorNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  upstreamNodeIds: string[]
): Promise<void> {
  try {
    // Get current run state
    const run = await getRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    
    // Identify all upstream parallel paths (Requirement 7.1)
    const parallelPaths = identifyUpstreamPaths(run.node_states, upstreamNodeIds);
    
    // If no parallel paths found, this might be a regular (non-parallel) collector
    // In that case, treat upstream nodes as-is
    if (parallelPaths.length === 0) {
      // Check if upstream nodes exist and are completed
      const allCompleted = upstreamNodeIds.every(id => {
        const state = run.node_states[id];
        return state && state.status === 'completed';
      });
      
      if (!allCompleted) {
        // Not ready yet, remain pending
        return;
      }
      
      // Merge outputs from regular upstream nodes
      const outputs = upstreamNodeIds.map(id => run.node_states[id]?.output);
      
      await updateNodeState(runId, nodeId, {
        status: 'completed',
        output: outputs,
      });
      return;
    }
    
    // Check for failures (Requirement 7.6)
    if (hasAnyPathFailed(run.node_states, parallelPaths)) {
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: 'Upstream parallel path failed',
      });
      return;
    }
    
    // Wait until all paths are completed (Requirement 7.2)
    if (!areAllPathsCompleted(run.node_states, parallelPaths)) {
      // Not ready yet, remain pending
      return;
    }
    
    // Merge outputs preserving order (Requirements 7.3, 7.4)
    const mergedOutput = mergeParallelOutputs(run.node_states, parallelPaths);
    
    // Mark collector as completed
    await updateNodeState(runId, nodeId, {
      status: 'completed',
      output: mergedOutput,
    });
  } catch (error) {
    // Handle errors
    let errorMessage = 'Failed to process collector node';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    await updateNodeState(runId, nodeId, {
      status: 'failed',
      error: errorMessage,
    });
  }
}
