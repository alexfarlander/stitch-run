/**
 * Worker Node Handler
 * Handles execution of Worker nodes that delegate work to external services
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5, 9.6, 12.1, 12.2
 */

import { WorkerPayload, NodeConfig, StitchRun } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { updateNodeState } from '@/lib/db/runs';

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
 * Fires a worker node by sending HTTP POST to the webhook URL
 * Validates: Requirements 4.1, 4.5, 9.6
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param config - The node configuration
 * @param input - The merged input from upstream nodes
 * @returns Promise that resolves when the webhook is fired
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
