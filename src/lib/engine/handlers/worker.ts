/**
 * Worker Node Handler
 * Handles execution of Worker nodes that delegate work to external services
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5, 9.6, 12.1, 12.2
 */

import { WorkerPayload, NodeConfig, StitchRun } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { updateNodeState } from '@/lib/db/runs';
import { workerRegistry } from '@/lib/workers';
import { logWorkerCall, logExecutionError, logNodeExecution } from '../logger';

/**
 * Constructs the callback URL for a worker
 * CRITICAL: Always uses NEXT_PUBLIC_BASE_URL from environment
 * Validates: Requirements 4.3, 12.1, 12.2
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @returns The full callback URL
 */
export function constructCallbackUrl(runId: string, nodeId: string): string {
  const _config = getConfig();
  
  // Validate that baseUrl is set (getConfig already validates, but double-check)
  if (!config.baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set. Cannot generate callback URL.');
  }
  
  const callbackUrl = `${config.baseUrl}/api/stitch/callback/${runId}/${nodeId}`;
  
  return callbackUrl;
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
  input: unknown
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
  const workerConfig = config as unknown;
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
  } catch (_error) {
    logExecutionError('Failed to apply entity movement', error, {
      runId,
      nodeId,
      entityId: run.entity_id,
      targetSectionId: movementAction.targetSectionId,
    });
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
  input: unknown
): Promise<void> {
  // Log node execution start (Requirement 10.1)
  logNodeExecution(runId, nodeId, 'Worker', input);

  // Mark node as 'running' before firing (Requirement 9.6)
  await updateNodeState(runId, nodeId, {
    status: 'running',
  });

  // Check if this is an integrated worker (Requirements 1.1, 1.2)
  if (config.workerType && workerRegistry.hasWorker(config.workerType)) {
    try {
      const worker = workerRegistry.getWorker(config.workerType);
      
      // Build payload for logging
      const payload = buildWorkerPayload(runId, nodeId, config, input);
      
      // Log worker call (Requirement 10.2)
      logWorkerCall(
        runId,
        nodeId,
        config.workerType,
        `integrated:${config.workerType}`,
        payload
      );
      
      await worker.execute(runId, nodeId, config, input);
      // Integrated worker handles its own callbacks and state updates
      return;
    } catch (_error) {
      // Handle worker execution errors (Requirement 10.5)
      let errorMessage = 'Integrated worker execution failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      logExecutionError('Integrated worker execution failed', error, {
        runId,
        nodeId,
        workerType: config.workerType,
      });
      
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
      const errorMsg = 'Invalid webhook URL';
      logExecutionError(errorMsg, new Error(errorMsg), {
        runId,
        nodeId,
        webhookUrl: config.webhookUrl,
      });
      
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: errorMsg,
      });
      return;
    }

    // Log worker call (Requirement 10.2)
    logWorkerCall(
      runId,
      nodeId,
      'webhook',
      url.toString(),
      payload
    );

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
      const errorMsg = `Worker webhook returned ${response.status}: ${response.statusText}`;
      logExecutionError(errorMsg, new Error(errorMsg), {
        runId,
        nodeId,
        webhookUrl: url.toString(),
        statusCode: response.status,
      });
      
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: errorMsg,
      });
      return;
    }

    // Worker webhook fired successfully
    // Node remains in 'running' state until callback is received
  } catch (_error) {
    // Handle network errors, timeouts, unreachable URLs (Requirement 4.5, 10.5)
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

    logExecutionError(errorMessage, error, {
      runId,
      nodeId,
      webhookUrl: config.webhookUrl,
    });

    await updateNodeState(runId, nodeId, {
      status: 'failed',
      error: errorMessage,
    });
  }
}
