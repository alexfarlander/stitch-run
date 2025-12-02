/**
 * Retry API Endpoint
 * Manually retries failed nodes
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRunAdmin, updateNodeState } from '@/lib/db/runs';
import { getFlowAdmin } from '@/lib/db/flows';
import { areUpstreamDependenciesCompleted } from '@/lib/engine';
import { fireNode } from '@/lib/engine/edge-walker';

/**
 * POST /api/stitch/retry/:runId/:nodeId
 * Manually retries a failed node
 * 
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string; nodeId: string }> }
) {
  try {
    const { runId, nodeId } = await params;

    // Validate that runId and nodeId exist (Requirement 10.1)
    const run = await getRunAdmin(runId);
    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Check if node exists in the run
    const nodeState = run.node_states[nodeId];
    if (!nodeState) {
      return NextResponse.json(
        { error: 'Node not found in run' },
        { status: 404 }
      );
    }

    // Validate node status is 'failed' (Requirement 10.2, 10.5)
    if (nodeState.status !== 'failed') {
      return NextResponse.json(
        { error: 'Node is not in failed state' },
        { status: 400 }
      );
    }

    // Reset node state to 'pending' (Requirement 10.2)
    await updateNodeState(runId, nodeId, {
      status: 'pending',
    });

    // Get the flow to re-evaluate dependencies
    const flow = await getFlowAdmin(run.flow_id);
    if (!flow) {
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      );
    }

    // Get updated run state after reset
    const updatedRun = await getRunAdmin(runId);
    if (!updatedRun) {
      return NextResponse.json(
        { error: 'Failed to get updated run state' },
        { status: 500 }
      );
    }

    // Re-evaluate upstream dependencies and fire node if satisfied (Requirement 10.3)
    if (areUpstreamDependenciesCompleted(nodeId, flow, updatedRun)) {
      // Fire this specific node directly
      // Do not use walkEdges, which would fire downstream nodes or risk re-firing siblings
      await fireNode(nodeId, flow, updatedRun);
    }

    // Return success response
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Retry processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
