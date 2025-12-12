/**
 * Callback API Endpoint
 * Receives completion callbacks from external workers
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 10.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkerCallback } from '@/types/stitch';
import { getRunAdmin, updateNodeState } from '@/lib/db/runs';
import { getFlowAdmin } from '@/lib/db/flows';
import { walkEdges } from '@/lib/engine/edge-walker';
import { logCallbackReceived, logExecutionError } from '@/lib/engine/logger';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates callback payload structure
 * Requirements: 9.1, 9.2, 9.5
 */
function validateCallbackPayload(payload: unknown): {
  valid: boolean;
  error?: string;
  callback?: WorkerCallback;
} {
  // Check if payload is an object
  if (!isPlainObject(payload)) {
    return { valid: false, error: 'Callback payload must be an object' };
  }

  const status = payload['status'];
  const output = payload['output'];
  const error = payload['error'];

  // Validate status field (required)
  if (!status) {
    return { valid: false, error: 'Missing required field: status' };
  }

  if (status !== 'completed' && status !== 'failed') {
    return { 
      valid: false, 
      error: `Invalid status value: "${String(status)}". Must be "completed" or "failed"` 
    };
  }

  // Validate output field for completed status (Requirement 9.3)
  if (status === 'completed') {
    if (output !== undefined && output !== null && typeof output !== 'object') {
      return { 
        valid: false, 
        error: 'Output field must be an object when provided' 
      };
    }
  }

  // Validate error field for failed status (Requirement 9.5)
  if (status === 'failed') {
    if (error !== undefined && typeof error !== 'string') {
      return { 
        valid: false, 
        error: 'Error field must be a string when provided' 
      };
    }
  }

  const errorString = typeof error === 'string' ? error : undefined;

  return {
    valid: true,
    callback: {
      status,
      output,
      error: errorString,
    },
  };
}

/**
 * POST /api/stitch/callback/:runId/:nodeId
 * Receives completion callbacks from external workers
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.3
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string; nodeId: string }> }
) {
  const startTime = Date.now();
  let runId: string | undefined;
  let nodeId: string | undefined;

  try {
    const resolvedParams = await params;
    runId = resolvedParams.runId;
    nodeId = resolvedParams.nodeId;

    // Validate that runId and nodeId exist (Requirement 9.1)
    if (!runId || !nodeId) {
      logExecutionError('Callback missing parameters', new Error('Missing runId or nodeId'), {
        runId,
        nodeId,
      });
      return NextResponse.json(
        { error: 'Missing required parameters: runId and nodeId' },
        { status: 400 }
      );
    }

    // Use admin client since webhooks have no cookies/auth
    const run = await getRunAdmin(runId);
    if (!run) {
      logExecutionError('Run not found', new Error(`Run not found: ${runId}`), {
        runId,
        nodeId,
      });
      return NextResponse.json(
        { error: `Run not found: ${runId}` },
        { status: 404 }
      );
    }

    // Check if node exists in the run (Requirement 9.1)
    if (!run.node_states[nodeId]) {
      logExecutionError('Node not found in run', new Error(`Node not found: ${nodeId}`), {
        runId,
        nodeId,
        availableNodes: Object.keys(run.node_states),
      });
      return NextResponse.json(
        { error: `Node not found in run: ${nodeId}` },
        { status: 404 }
      );
    }

    // Parse callback payload
    let rawCallback: unknown;
    try {
      rawCallback = await request.json();
    } catch (parseError) {
      logExecutionError('Failed to parse callback JSON', parseError, {
        runId,
        nodeId,
      });
      return NextResponse.json(
        { error: 'Invalid JSON in callback payload' },
        { status: 400 }
      );
    }

    // Validate callback structure (Requirements 9.1, 9.2, 9.3, 9.5)
    const validation = validateCallbackPayload(rawCallback);
    if (!validation.valid) {
      logExecutionError('Invalid callback payload structure', new Error(validation.error), {
        runId,
        nodeId,
        receivedPayload: rawCallback,
      });
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const callback = validation.callback!;

    // Log callback receipt (Requirement 10.3)
    logCallbackReceived(
      runId,
      nodeId,
      callback.status,
      callback.output,
      callback.error
    );

    // Update node state based on callback status
    if (callback.status === 'completed') {
      // Merge callback output with any stored input from the node state
      // This implements the "pass-through" pattern for async workers
      const currentNodeState = run.node_states[nodeId];
      const storedInput = currentNodeState?.output;
      
      // Merge: stored input + new callback output
      // This ensures data flows through the pipeline (e.g., voice_text survives for downstream nodes)
      const mergedOutput =
        isPlainObject(storedInput) && isPlainObject(callback.output)
          ? { ...storedInput, ...callback.output }
          : { input: storedInput, output: callback.output };

      // Update to completed with merged output (Requirement 9.2, 9.3)
      await updateNodeState(runId, nodeId, {
        status: 'completed',
        output: mergedOutput,
      });
    } else {
      // Update to failed with error (Requirement 9.5)
      const errorMessage = callback.error || 'Worker reported failure';
      
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: errorMessage,
      });
    }

    // Apply entity movement if configured
    const flow = await getFlowAdmin(run.flow_id);
    if (flow) {
      const node = flow.graph.nodes.find(n => n.id === nodeId);
      if (node && node.type === 'Worker') {
        const { applyEntityMovement } = await import('@/lib/engine/handlers/worker');
        await applyEntityMovement(runId, nodeId, node.data, callback.status);
      }
    }

    // Trigger edge-walking if node completed successfully (Requirement 9.4)
    if (callback.status === 'completed') {
      // Get updated run state after the update (use admin client)
      const updatedRun = await getRunAdmin(runId);
      if (updatedRun) {
        // Walk edges from the completed node (execution graph loaded inside walkEdges)
        await walkEdges(nodeId, updatedRun);
      } else {
        logExecutionError('Failed to get updated run for edge-walking', new Error('Run not found after update'), {
          runId,
          nodeId,
        });
      }
    }

    // Return success response
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    // Enhanced error logging (Requirement 10.5)
    logExecutionError('Callback processing error', error, {
      runId,
      nodeId,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing callback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
