/**
 * UX Node Handler
 * Handles execution of UX nodes that pause execution for human input
 * Validates: Requirements 8.1, 8.2
 */

import { NodeConfig } from '@/types/stitch';
import { updateNodeState } from '@/lib/db/runs';

/**
 * Fires a UX node by marking it as 'waiting_for_user'
 * This pauses execution until human input is provided via the complete endpoint
 * Validates: Requirements 8.1, 8.2
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param config - The node configuration
 * @param input - The merged input from upstream nodes
 * @returns Promise that resolves when the node state is updated
 */
export async function fireUXNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  input: unknown
): Promise<void> {
  // Mark node as 'waiting_for_user' (Requirement 8.1)
  // This prevents downstream execution (Requirement 8.2)
  await updateNodeState(runId, nodeId, {
    status: 'waiting_for_user',
    output: input, // Store input so it's available when user completes
  });
}
