/**
 * Callback API Endpoint
 * Receives completion callbacks from external workers
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkerCallback } from '@/types/stitch';
import { getRunAdmin, updateNodeState } from '@/lib/db/runs';
import { getFlowAdmin } from '@/lib/db/flows';
import { walkEdges } from '@/lib/engine/edge-walker';

/**
 * POST /api/stitch/callback/:runId/:nodeId
 * Receives completion callbacks from external workers
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string; nodeId: string }> }
) {
  try {
    const { runId, nodeId } = await params;

    // Validate that runId and nodeId exist (Requirement 5.6)
    // Use admin client since webhooks have no cookies/auth
    const run = await getRunAdmin(runId);
    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Check if node exists in the run
    if (!run.node_states[nodeId]) {
      return NextResponse.json(
        { error: 'Node not found in run' },
        { status: 404 }
      );
    }

    // Parse and validate callback payload (Requirement 5.2)
    let callback: WorkerCallback;
    try {
      callback = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid callback payload' },
        { status: 400 }
      );
    }

    // Validate callback structure
    if (!callback.status || !['completed', 'failed'].includes(callback.status)) {
      return NextResponse.json(
        { error: 'Invalid callback payload' },
        { status: 400 }
      );
    }

    // Update node state based on callback status
    if (callback.status === 'completed') {
      // Merge callback output with any stored input from the node state
      // This implements the "pass-through" pattern for async workers
      const currentNodeState = run.node_states[nodeId];
      const storedInput = currentNodeState?.output || {};
      
      // Merge: stored input + new callback output
      // This ensures data flows through the pipeline (e.g., voice_text survives for downstream nodes)
      const mergedOutput = {
        ...storedInput,
        ...callback.output,
      };

      // Update to completed with merged output (Requirement 5.3)
      await updateNodeState(runId, nodeId, {
        status: 'completed',
        output: mergedOutput,
      });
    } else {
      // Update to failed with error (Requirement 5.4)
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: callback.error || 'Worker reported failure',
      });
    }

    // Apply entity movement if configured (Requirements 5.1, 5.2, 5.3, 5.4, 5.5)
    const flow = await getFlowAdmin(run.flow_id);
    if (flow) {
      const node = flow.graph.nodes.find(n => n.id === nodeId);
      if (node && node.type === 'Worker') {
        const { applyEntityMovement } = await import('@/lib/engine/handlers/worker');
        await applyEntityMovement(runId, nodeId, node.data, callback.status);
      }
    }

    // Trigger edge-walking if node completed successfully (Requirement 5.5)
    if (callback.status === 'completed') {
      // Get the flow to perform edge-walking (use admin client)
      if (flow) {
        // Get updated run state after the update (use admin client)
        const updatedRun = await getRunAdmin(runId);
        if (updatedRun) {
          // Walk edges from the completed node
          await walkEdges(nodeId, flow, updatedRun);
        }
      }
    }

    // Return success response (Requirement 5.8)
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Callback processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
