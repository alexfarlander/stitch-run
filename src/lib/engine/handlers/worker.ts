/**
 * Worker Node Handler
 * Handles execution of Worker nodes that delegate work to external services
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5, 9.6, 12.1, 12.2
 */

import { WorkerPayload, NodeConfig, StitchRun } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { updateNodeState } from '@/lib/db/runs';
import { workerRegistry } from '@/lib/workers';

/**
 * Constructs the callback URL for a worker
 * Validates: Requirements 4.3, 12.1, 12.2
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @returns The full callback URL
 */
export function constructCallbackUrl(runId: string, nodeId: string): string {
  const config = getConfig();
  return `${config.baseUrl}/api/stitch/callback/${runId}/${nodeId}`;
}

/**
 * Builds the worker payload to send to external workers
 * Validates: Requirements 4.2
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param config - The node configuration
 * @param input - The merged input from upstream nodes
 * @returns The worker payload
 */
export function buildWorkerPayload(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  input: any
): WorkerPayload {
  const callbackUrl = constructCallbackUrl(runId, nodeId);
  
  return {
    runId,
    nodeId,
    config,
    input,
    callbackUrl,
  };
}

/**
 * Apply entity movement based on worker node outcome
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param config - The node configuration (may include entityMovement)
 * @param status - The final status of the worker node ('completed' or 'failed')
 * @returns Promise that resolves when entity movement is applied
 */
export async function applyEntityMovement(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  status: 'completed' | 'failed'
): Promise<void> {
  // Import here to avoid circular dependencies
  const { getRunAdmin } = await import('@/lib/db/runs');
  const { moveEntityToSection } = await import('@/lib/db/entities');

  // Check if entityMovement is configured
  const workerConfig = config as any;
  if (!workerConfig.entityMovement) {
    return; // No entity movement configured
  }

  // Get the run to find the entity_id
  const run = await getRunAdmin(runId);
  if (!run || !run.entity_id) {
    return; // No entity associated with this run
  }

  // Determine which movement action to apply
  let movementAction;
  if (status === 'completed' && workerConfig.entityMovement.onSuccess) {
    movementAction = workerConfig.entityMovement.onSuccess;
  } else if (status === 'failed' && workerConfig.entityMovement.onFailure) {
    movementAction = workerConfig.entityMovement.onFailure;
  }

  if (!movementAction) {
    return; // No movement action configured for this outcome
  }

  // Apply the entity movement
  try {
    await moveEntityToSection(
      run.entity_id,
      movementAction.targetSectionId,
      movementAction.completeAs,
      {
        run_id: runId,
        node_id: nodeId,
        worker_status: status,
      },
      movementAction.setEntityType  // Pass entity type conversion if specified
    );
  } catch (error) {
    console.error('Failed to apply entity movement:', error);
    // Don't throw - entity movement failure shouldn't break the workflow
  }
}

/**
 * Fires a worker node by either using an integrated worker or sending HTTP POST to webhook URL
 * Validates: Requirements 1.1, 1.2, 4.1, 4.5, 9.6
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param config - The node configuration
 * @param input - The merged input from upstream nodes
 * @returns Promise that resolves when the worker is fired
 */
export async function fireWorkerNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  input: any
): Promise<void> {
  // Mark node as 'running' before firing (Requirement 9.6)
  await updateNodeState(runId, nodeId, {
    status: 'running',
  });

  // Check if this is an integrated worker (Requirements 1.1, 1.2)
  if (config.workerType && workerRegistry.hasWorker(config.workerType)) {
    try {
      const worker = workerRegistry.getWorker(config.workerType);
      await worker.execute(runId, nodeId, config, input);
      // Integrated worker handles its own callbacks and state updates
      return;
    } catch (error) {
      // Handle worker execution errors
      let errorMessage = 'Integrated worker execution failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: errorMessage,
      });
      return;
    }
  }

  // Fall back to webhook-based worker for backward compatibility
  // Validate webhook URL exists
  if (!config.webhookUrl) {
    await updateNodeState(runId, nodeId, {
      status: 'failed',
      error: 'Worker node missing webhookUrl in configuration',
    });
    return;
  }

  // Build the payload
  const payload = buildWorkerPayload(runId, nodeId, config, input);

  try {
    // Validate URL format
    let url: URL;
    try {
      url = new URL(config.webhookUrl);
    } catch {
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: 'Invalid webhook URL',
      });
      return;
    }

    // Send HTTP POST to worker webhook (Requirement 4.1)
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Check if the request was successful
    if (!response.ok) {
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: `Worker webhook returned ${response.status}: ${response.statusText}`,
      });
      return;
    }

    // Worker webhook fired successfully
    // Node remains in 'running' state until callback is received
  } catch (error) {
    // Handle network errors, timeouts, unreachable URLs (Requirement 4.5)
    let errorMessage = 'Worker webhook unreachable';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        errorMessage = 'Worker webhook timeout exceeded';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Worker webhook unreachable';
      } else {
        errorMessage = error.message;
      }
    }

    await updateNodeState(runId, nodeId, {
      status: 'failed',
      error: errorMessage,
    });
  }
}
