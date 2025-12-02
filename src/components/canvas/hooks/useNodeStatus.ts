/**
 * Hook for aggregating node status across parallel instances
 * Handles the M-Shape logic where a single static node can have multiple dynamic instances
 */

import { NodeStatus, StitchRun } from '@/types/stitch';

interface NodeStatusResult {
  status: NodeStatus;
  label: string;
}

/**
 * Aggregates status for a node that may have parallel instances
 * 
 * Rules:
 * - If ANY instance is 'failed' -> Status: 'failed'
 * - If ANY instance is 'running' -> Status: 'running'
 * - If ALL instances are 'completed' -> Status: 'completed'
 * - If partial completion -> Status: 'running' with count
 * - If no instances exist -> Status: 'pending'
 * 
 * @param nodeId - Static node ID from the graph
 * @param node_states - Dynamic node states from the run (may include nodeId_0, nodeId_1, etc.)
 */
export function useNodeStatus(
  nodeId: string,
  node_states: StitchRun['node_states'] | undefined
): NodeStatusResult {
  if (!node_states) {
    return { status: 'pending', label: 'Pending' };
  }

  // Find all instances of this node (static ID or with parallel suffix)
  const instanceKeys = Object.keys(node_states).filter(
    key => key === nodeId || key.startsWith(`${nodeId}_`)
  );

  // No instances found
  if (instanceKeys.length === 0) {
    return { status: 'pending', label: 'Pending' };
  }

  // Single instance (most common case)
  if (instanceKeys.length === 1) {
    const state = node_states[instanceKeys[0]];
    return {
      status: state.status,
      label: formatStatusLabel(state.status),
    };
  }

  // Multiple instances (parallel execution)
  const statuses = instanceKeys.map(key => node_states[key].status);
  
  // Check for failures first
  if (statuses.some(s => s === 'failed')) {
    const failedCount = statuses.filter(s => s === 'failed').length;
    return {
      status: 'failed',
      label: `Failed (${failedCount}/${statuses.length})`,
    };
  }

  // Check for running
  if (statuses.some(s => s === 'running')) {
    const completedCount = statuses.filter(s => s === 'completed').length;
    return {
      status: 'running',
      label: `Running (${completedCount}/${statuses.length})`,
    };
  }

  // Check for waiting_for_user
  if (statuses.some(s => s === 'waiting_for_user')) {
    return {
      status: 'waiting_for_user',
      label: 'Input Needed',
    };
  }

  // All completed
  if (statuses.every(s => s === 'completed')) {
    return {
      status: 'completed',
      label: `Completed (${statuses.length})`,
    };
  }

  // Default to pending
  return { status: 'pending', label: 'Pending' };
}

function formatStatusLabel(status: NodeStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'waiting_for_user':
      return 'Input Needed';
    default:
      return 'Unknown';
  }
}
