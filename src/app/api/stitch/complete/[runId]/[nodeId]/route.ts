/**
 * UX Complete API Endpoint
 * Receives human input for UX gate nodes
 * Validates: Requirements 8.3, 8.4, 8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRunAdmin, updateNodeState } from '@/lib/db/runs';
import { getFlowAdmin } from '@/lib/db/flows';
import { walkEdges } from '@/lib/engine/edge-walker';

/**
 * POST /api/stitch/complete/:runId/:nodeId
 * Receives human input for UX gate nodes
 * 
 * Validates: Requirements 8.3, 8.4, 8.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string; nodeId: string }> }
) {
  try {
    const { runId, nodeId } = await params;

    // Validate that runId and nodeId exist (Requirement 8.3)
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

    // Get the flow to check node type
    const flow = await getFlowAdmin(run.flow_id);
    if (!flow) {
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      );
    }

    // Find the node in the flow graph
    const node = flow.graph.nodes.find(n => n.id === nodeId);
    if (!node) {
      return NextResponse.json(
        { error: 'Node not found in flow' },
        { status: 404 }
      );
    }

    // Validate node is UX type (Requirement 8.3)
    if (node.type !== 'UX') {
      return NextResponse.json(
        { error: 'Node is not a UX node' },
        { status: 400 }
      );
    }

    // Validate node is in 'waiting_for_user' status (Requirement 8.3)
    if (nodeState.status !== 'waiting_for_user') {
      return NextResponse.json(
        { error: 'Node is not waiting for user input' },
        { status: 400 }
      );
    }

    // Parse input from request body
    let input: any;
    try {
      const body = await request.json();
      input = body.input;
    } catch {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    // Update node state to 'completed' with provided input as output (Requirement 8.4)
    await updateNodeState(runId, nodeId, {
      status: 'completed',
      output: input,
    });

    // Trigger edge-walking after state update (Requirement 8.5)
    const updatedRun = await getRunAdmin(runId);
    if (updatedRun) {
      await walkEdges(nodeId, flow, updatedRun);
    }

    // Return success response
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('UX complete processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
