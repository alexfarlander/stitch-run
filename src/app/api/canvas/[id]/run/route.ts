/**
 * Canvas Management API - Run Workflow Route
 * 
 * Handles workflow execution for a canvas
 * POST: Start workflow execution
 * Requirements: 2.1, 2.3
 * 
 * Note: Full implementation in task 10
 */

import { NextRequest, NextResponse } from 'next/server';
import { RunWorkflowRequest, RunWorkflowResponse } from '@/types/canvas-api';
import {
  handleAPIError,
  validateRequestBody,
  validateCanvasId,
  APIError
} from '@/lib/api/error-handler';

/**
 * POST /api/canvas/[id]/run
 * Start workflow execution
 * Requirements: 2.1, 2.3
 * 
 * Process:
 * 1. Load canvas by ID
 * 2. Create version snapshot automatically
 * 3. Compile canvas to execution graph (done in version creation)
 * 4. Create run record in stitch_runs table
 * 5. Start workflow execution
 * 6. Return run ID, version ID, status, and statusUrl
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    validateCanvasId(id);

    // Parse and validate request body
    const body = await request.json().catch(() => {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Invalid JSON in request body'
      );
    });

    validateRequestBody(body);

    const { input, entityId } = body as RunWorkflowRequest;

    // 1. Load canvas by ID
    const { getFlow } = await import('@/lib/db/flows');
    const flow = await getFlow(id, true);
    
    if (!flow) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Canvas not found: ${id}`
      );
    }

    // 2. Create version snapshot automatically (Requirement 2.3)
    // Use autoVersionOnRun which only creates a new version if the canvas has changed
    const { autoVersionOnRun } = await import('@/lib/canvas/version-manager');
    const { getVersion } = await import('@/lib/canvas/version-manager');
    
    // Get current version to extract visual graph
    let visualGraph;
    if (flow.current_version_id) {
      const currentVersion = await getVersion(flow.current_version_id);
      if (currentVersion) {
        visualGraph = currentVersion.visual_graph;
      }
    }
    
    // If no current version exists, we need to handle this case
    if (!visualGraph) {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Canvas has no visual graph data. Please update the canvas first.'
      );
    }
    
    // Auto-version: only creates new version if canvas has changed since last version
    // This prevents duplicate versions when running the same canvas multiple times
    const versionId = await autoVersionOnRun(id, visualGraph);

    // 4. Start workflow execution (creates run record and fires entry nodes)
    const { startRun } = await import('@/lib/engine/edge-walker');
    const run = await startRun(id, {
      entityId: entityId || null,
      input: input || {},
      flow_version_id: versionId,
      trigger: {
        type: 'manual',
        source: 'api',
        event_id: null,
        timestamp: new Date().toISOString(),
      }
    });

    // 6. Return run ID, version ID, status, and statusUrl (Requirement 2.1)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const statusUrl = `${baseUrl}/api/canvas/${id}/status?runId=${run.id}`;

    const response: RunWorkflowResponse = {
      runId: run.id,
      versionId: versionId,
      status: 'running',
      statusUrl: statusUrl
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleAPIError(error);
  }
}
