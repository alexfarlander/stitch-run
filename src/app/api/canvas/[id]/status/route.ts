/**
 * Canvas Management API - Workflow Status Route
 * 
 * Handles workflow status queries
 * GET: Get workflow execution status
 * Requirements: 2.2
 * 
 * Note: Full implementation in task 11
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetStatusResponse } from '@/types/canvas-api';
import { NodeStatus } from '@/types/stitch';
import {
  handleAPIError,
  validateCanvasId,
  APIError
} from '@/lib/api/error-handler';

/**
 * GET /api/canvas/[id]/status
 * Get workflow execution status
 * Requirements: 2.2
 * 
 * Process:
 * 1. Query run status from stitch_runs table
 * 2. Extract node states from run record
 * 3. Aggregate node outputs for completed nodes
 * 4. Determine overall status based on node states
 * 5. Extract final outputs from terminal nodes
 * 6. Return status with statusUrl for polling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    validateCanvasId(id);

    // Get runId from query params
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Missing required query parameter: runId'
      );
    }

    // 1. Query run status from stitch_runs table
    const { getRun } = await import('@/lib/db/runs');
    const run = await getRun(runId);

    if (!run) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Run not found: ${runId}`
      );
    }

    // Verify the run belongs to this canvas
    if (run.flow_id !== id) {
      throw new APIError(
        'BAD_REQUEST',
        400,
        `Run ${runId} does not belong to canvas ${id}`
      );
    }

    // 2. Extract node states from run record
    const nodeStates = run.node_states;

    // 3. Aggregate node outputs for completed nodes
    const nodes: Record<string, { status: NodeStatus; output?: unknown; error?: string }> = {};
    
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      nodes[nodeId] = {
        status: state.status,
        ...(state.output !== undefined && { output: state.output }),
        ...(state.error !== undefined && { error: state.error })
      };
    }

    // 4. Determine overall status based on node states
    let overallStatus: 'pending' | 'running' | 'completed' | 'failed' = 'pending';
    
    const statuses = Object.values(nodeStates).map(s => s.status);
    const hasRunning = statuses.some(s => s === 'running');
    const hasFailed = statuses.some(s => s === 'failed');
    const allCompleted = statuses.every(s => s === 'completed');
    const hasWaitingForUser = statuses.some(s => s === 'waiting_for_user');

    if (hasFailed) {
      overallStatus = 'failed';
    } else if (allCompleted) {
      overallStatus = 'completed';
    } else if (hasRunning || hasWaitingForUser) {
      overallStatus = 'running';
    }

    // 5. Extract final outputs from terminal nodes
    let finalOutputs: Record<string, unknown> | undefined;

    if (overallStatus === 'completed') {
      // Load the execution graph to identify terminal nodes
      const { getVersion } = await import('@/lib/canvas/version-manager');
      
      if (run.flow_version_id) {
        const version = await getVersion(run.flow_version_id);
        
        if (version && version.execution_graph) {
          const terminalNodes = version.execution_graph.terminalNodes || [];
          
          // Extract outputs from terminal nodes
          finalOutputs = {};
          for (const terminalNodeId of terminalNodes) {
            const nodeState = nodeStates[terminalNodeId];
            if (nodeState && nodeState.status === 'completed' && nodeState.output !== undefined) {
              finalOutputs[terminalNodeId] = nodeState.output;
            }
          }
          
          // Only include finalOutputs if there are any
          if (Object.keys(finalOutputs).length === 0) {
            finalOutputs = undefined;
          }
        }
      }
    }

    // 6. Return status with statusUrl for polling
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const statusUrl = `${baseUrl}/api/canvas/${id}/status?runId=${runId}`;

    const response: GetStatusResponse = {
      runId: runId,
      status: overallStatus,
      nodes: nodes,
      ...(finalOutputs !== undefined && { finalOutputs }),
      statusUrl: statusUrl
    };

    return NextResponse.json(response, { status: 200 });

  } catch (_error) {
    return handleAPIError(error);
  }
}
