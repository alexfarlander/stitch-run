/**
 * API endpoint for running flows with auto-versioning
 * 
 * POST /api/flows/[id]/run
 * 
 * This endpoint handles workflow execution with automatic versioning support.
 * It implements the "Run" button behavior where unsaved changes are automatically
 * versioned before execution begins.
 * 
 * Workflow:
 * 1. Validate flow exists
 * 2. If visualGraph provided: auto-version (create new version if changes detected)
 * 3. If no visualGraph: use current version (must exist)
 * 4. Create run record with flow_version_id
 * 5. Start execution using execution graph from version
 * 6. Return run ID and version ID
 * 
 * Requirements:
 * - 5.1: Auto-version on run when visual graph provided
 * - 5.2: Create run with flow_version_id and start execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoVersionOnRun } from '@/lib/canvas/version-manager';
import { startRun } from '@/lib/engine/edge-walker';
import { VisualGraph } from '@/types/canvas-schema';
import { getFlow } from '@/lib/db/flows';

/**
 * POST /api/flows/[id]/run
 * 
 * Run a flow with optional auto-versioning
 * 
 * Request body:
 * - visualGraph?: VisualGraph - Optional current visual graph from UI
 * - entityId?: string - Optional entity to attach to run
 * - input?: any - Optional initial input data
 * 
 * Response:
 * - runId: string - The created run ID
 * - versionId: string - The version ID used for execution
 * - status: string - Initial run status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flowId = params.id;

    // Validate flow exists
    const _flow = await getFlow(flowId);
    if (!flow) {
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { visualGraph, entityId, input } = body as {
      visualGraph?: VisualGraph;
      entityId?: string;
      input?: unknown;
    };

    let versionId: string;

    // Auto-version if visual graph provided (Requirement 5.1)
    if (visualGraph) {
      try {
        versionId = await autoVersionOnRun(flowId, visualGraph);
      } catch (_error) {
        console.error('Auto-versioning failed:', error);
        return NextResponse.json(
          { 
            error: 'Failed to create version',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }
    } else {
      // No graph provided, use current version
      if (!flow.current_version_id) {
        return NextResponse.json(
          { error: 'Flow has no current version. Please save the flow first.' },
          { status: 400 }
        );
      }
      versionId = flow.current_version_id;
    }

    // Start execution using execution graph from version (Requirement 5.2)
    const run = await startRun(flowId, {
      entityId: entityId || null,
      input: input || {},
      flow_version_id: versionId,
    });

    // Return run ID and status
    return NextResponse.json({
      runId: run.id,
      versionId: versionId,
      status: 'started',
    });

  } catch (_error) {
    console.error('Error running flow:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
