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
      // Update to completed with output (Requirement 5.3)
      await updateNodeState(runId, nodeId, {
        status: 'completed',
        output: callback.output,
      });
    } else {
      // Update to failed with error (Requirement 5.4)
      await updateNodeState(runId, nodeId, {
        status: 'failed',
        error: callback.error || 'Worker reported failure',
      });
    }

    // Trigger edge-walking if node completed successfully (Requirement 5.5)
    if (callback.status === 'completed') {
      // Get the flow to perform edge-walking (use admin client)
      const flow = await getFlowAdmin(run.flow_id);
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
