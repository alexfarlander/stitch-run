/**
 * Splitter Node Handler
 * Handles execution of Splitter nodes that fan out array elements into parallel paths
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5, 6.6
 */

import { NodeConfig, NodeState } from '@/types/stitch';
import { updateNodeState, updateNodeStates } from '@/lib/db/runs';
import { logParallelInstanceCreation, logExecutionError } from '../logger';

/**
 * Extracts an array from input using a configured path
 * Supports nested paths like "data.items" or "results"
 * Validates: Requirements 6.2
 * 
 * @param input - The input object
 * @param arrayPath - The path to the array (e.g., "items" or "data.results")
 * @returns The extracted array
 * @throws Error if path doesn't exist or value is not an array
 */
export function extractArray(input: unknown, arrayPath: string): unknown[] {
  if (!arrayPath) {
    throw new Error('Array path not configured');
  }

  // Split path by dots to support nested paths
  const pathParts = arrayPath.split('.');
  let current = input;

  // Navigate through the path
  for (const part of pathParts) {
    if (current === null || current === undefined) {
      throw new Error(`Array not found at configured path: ${arrayPath}`);
    }
    current = current[part];
  }

  // Validate that we got an array
  if (!Array.isArray(current)) {
    throw new Error('Value at path is not an array');
  }

  return current;
}

/**
 * Creates parallel path node states for each array element
 * Augments downstream nodeIds with index suffixes (nodeId_0, nodeId_1, etc.)
 * Validates: Requirements 6.1, 6.4, 6.5
 * 
 * @param downstreamNodeIds - Array of downstream node IDs
 * @param arrayElements - Array of elements to process in parallel
 * @returns Record mapping augmented nodeIds to their initial states
 */
export function createParallelPathStates(
  downstreamNodeIds: string[],
  arrayElements: unknown[]
): Record<string, NodeState> {
  const parallelStates: Record<string, NodeState> = {};

  // For each array element, create parallel paths for all downstream nodes
  for (let i = 0; i < arrayElements.length; i++) {
    for (const nodeId of downstreamNodeIds) {
      const augmentedNodeId = `${nodeId}_${i}`;
      parallelStates[augmentedNodeId] = {
        status: 'pending',
        output: arrayElements[i], // Store the array element as initial output
      };
    }
  }

  return parallelStates;
}

/**
 * Fires a Splitter node by creating parallel execution paths
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5, 6.6
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param config - The node configuration (must contain arrayPath)
 * @param input - The merged input from upstream nodes
 * @param downstreamNodeIds - Array of downstream node IDs to fan out to
 * @returns Promise that resolves when the splitter is processed
 */
export async function fireSplitterNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  input: unknown,
  downstreamNodeIds: string[]
): Promise<void> {
  try {
    // Extract array from input using configured path (Requirement 6.2)
    const arrayPath = config.arrayPath;
    if (!arrayPath) {
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: 'Splitter node missing arrayPath in configuration',
      });
      return;
    }

    const arrayElements = extractArray(input, arrayPath);

    // Handle empty array edge case (Requirement 6.6)
    if (arrayElements.length === 0) {
      // Mark splitter as completed with empty array
      await updateNodeState(runId, nodeId, {
        status: 'completed',
        output: [],
      });
      // Downstream collectors will handle the empty array case
      return;
    }

    // Create parallel path states (Requirements 6.1, 6.4, 6.5)
    const parallelStates = createParallelPathStates(downstreamNodeIds, arrayElements);

    // Log parallel instance creation
    const parallelInstanceIds = Object.keys(parallelStates);
    logParallelInstanceCreation(runId, nodeId, parallelInstanceIds);

    // Update all parallel path states and mark splitter as completed
    const updates: Record<string, NodeState> = {
      ...parallelStates,
      [nodeId]: {
        status: 'completed',
        output: arrayElements,
      },
    };

    await updateNodeStates(runId, updates);
  } catch (_error) {
    // Handle extraction errors (Requirement 10.5)
    let errorMessage = 'Failed to process splitter node';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    logExecutionError('Splitter node processing failed', error, {
      runId,
      nodeId,
      arrayPath: config.arrayPath,
      downstreamNodeIds,
    });

    await updateNodeState(runId, nodeId, {
      status: 'failed',
      error: errorMessage,
    });
  }
}
