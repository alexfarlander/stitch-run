/**
 * Retry API Endpoint
 * Manually retries failed nodes
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRunAdmin, updateNodeState } from '@/lib/db/runs';
import { getVersion } from '@/lib/canvas/version-manager';
import type { ExecutionGraph } from '@/types/execution-graph';

/**
 * Helper function to get upstream node IDs from ExecutionGraph
 */
function getUpstreamNodeIds(nodeId: string, executionGraph: ExecutionGraph): string[] {
  const upstreamIds: string[] = [];
  
  // Check adjacency map to find nodes that point to this node
  for (const [sourceId, targetIds] of Object.entries(executionGraph.adjacency)) {
    if ((targetIds as string[]).includes(nodeId)) {
      upstreamIds.push(sourceId);
    }
  }
  
  return upstreamIds;
}

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

    // Load execution graph from run's flow_version_id
    if (!run.flow_version_id) {
      return NextResponse.json(
        { error: 'Run has no flow_version_id' },
        { status: 400 }
      );
    }
    
    const version = await getVersion(run.flow_version_id);
    if (!version) {
      return NextResponse.json(
        { error: 'Flow version not found' },
        { status: 404 }
      );
    }

    const executionGraph = version.execution_graph;
    const typedExecutionGraph = executionGraph as ExecutionGraph;

    // Get updated run state after reset
    const updatedRun = await getRunAdmin(runId);
    if (!updatedRun) {
      return NextResponse.json(
        { error: 'Failed to get updated run state' },
        { status: 500 }
      );
    }

    // Re-evaluate upstream dependencies and fire node if satisfied (Requirement 10.3)
    // Check dependencies using execution graph
    const upstreamNodeIds = getUpstreamNodeIds(nodeId, typedExecutionGraph);
    const allUpstreamCompleted = upstreamNodeIds.every(upstreamId => {
      const upstreamState = updatedRun.node_states[upstreamId];
      return upstreamState && upstreamState.status === 'completed';
    });

    if (allUpstreamCompleted) {
      // Fire this specific node directly using execution graph
      const { fireNodeWithGraph } = await import('@/lib/engine/edge-walker');
      await fireNodeWithGraph(nodeId, typedExecutionGraph, updatedRun);
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
