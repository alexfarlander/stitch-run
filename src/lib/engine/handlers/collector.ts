/**
 * Collector Node Handler
 * Handles execution of Collector nodes that fan in parallel execution paths
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6
 */

import { NodeConfig, NodeState } from '@/types/stitch';
import { updateNodeState, updateNodeStates, getRun } from '@/lib/db/runs';
import { logCollectorWaiting, logCollectorFiring, logExecutionError } from '../logger';

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
 * Collector node state structure for tracking upstream completion
 */
interface CollectorNodeState extends NodeState {
  upstream_completed_count?: number;
  expected_upstream_count?: number;
  upstream_outputs?: Record<string, any>;
}

/**
 * Fires a Collector node by merging parallel execution paths
 * Uses state tracking to prevent race conditions
 * Validates: Requirements 1.7, 7.1, 7.2, 7.3, 7.4, 7.6, 9.4
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
    
    // Determine which upstream nodes to track
    // If parallel paths exist, track those; otherwise track regular upstream nodes
    const upstreamToTrack = parallelPaths.length > 0 ? parallelPaths : upstreamNodeIds;
    
    // Get or initialize collector state
    const collectorState = run.node_states[nodeId] as CollectorNodeState || {
      status: 'pending',
      upstream_completed_count: 0,
      expected_upstream_count: upstreamToTrack.length,
      upstream_outputs: {},
    };
    
    // Initialize state if this is the first time we're seeing this collector
    if (collectorState.expected_upstream_count === undefined) {
      collectorState.expected_upstream_count = upstreamToTrack.length;
      collectorState.upstream_completed_count = 0;
      collectorState.upstream_outputs = {};
    }
    
    // Count how many upstream nodes are completed
    let completedCount = 0;
    const upstreamOutputs: Record<string, any> = { ...collectorState.upstream_outputs };
    
    for (const upstreamId of upstreamToTrack) {
      const upstreamState = run.node_states[upstreamId];
      
      // Check for failures (Requirement 7.6)
      if (upstreamState?.status === 'failed') {
        await updateNodeState(runId, nodeId, {
          status: 'failed',
          error: `Upstream node ${upstreamId} failed`,
        });
        return;
      }
      
      // Track completed upstream nodes
      if (upstreamState?.status === 'completed') {
        completedCount++;
        // Store output if we haven't already
        if (!(upstreamId in upstreamOutputs)) {
          upstreamOutputs[upstreamId] = upstreamState.output;
        }
      }
    }
    
    // Update the collector state with current progress
    // Use updateNodeStates to preserve all fields including tracking fields
    await updateNodeStates(runId, {
      [nodeId]: {
        status: 'pending',
        upstream_completed_count: completedCount,
        expected_upstream_count: collectorState.expected_upstream_count,
        upstream_outputs: upstreamOutputs,
      } as CollectorNodeState,
    });
    
    // Wait until all paths are completed (Requirement 7.2, 9.4)
    if (completedCount < collectorState.expected_upstream_count) {
      // Not ready yet, remain pending - log waiting state
      logCollectorWaiting(
        runId,
        nodeId,
        completedCount,
        collectorState.expected_upstream_count
      );
      return;
    }
    
    // All upstream paths completed! Merge outputs
    let mergedOutput: any;
    
    if (parallelPaths.length > 0) {
      // Merge parallel outputs preserving order (Requirements 7.3, 7.4)
      mergedOutput = mergeParallelOutputs(run.node_states, parallelPaths);
    } else {
      // Merge regular upstream outputs as array
      mergedOutput = upstreamNodeIds.map(id => upstreamOutputs[id]);
    }
    
    // Log collector firing
    logCollectorFiring(runId, nodeId, mergedOutput);
    
    // Mark collector as completed
    // Use updateNodeStates to preserve all fields including tracking fields
    await updateNodeStates(runId, {
      [nodeId]: {
        status: 'completed',
        output: mergedOutput,
        upstream_completed_count: completedCount,
        expected_upstream_count: collectorState.expected_upstream_count,
        upstream_outputs: upstreamOutputs,
      } as CollectorNodeState,
    });
  } catch (error) {
    // Handle errors (Requirement 10.5)
    let errorMessage = 'Failed to process collector node';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    logExecutionError('Collector node processing failed', error, {
      runId,
      nodeId,
      upstreamNodeIds,
    });
    
    await updateNodeState(runId, nodeId, {
      status: 'failed',
      error: errorMessage,
    });
  }
}
