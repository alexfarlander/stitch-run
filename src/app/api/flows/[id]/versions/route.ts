/**
 * Flow Versions API
 * 
 * POST /api/flows/[id]/versions - Create a new version
 * GET /api/flows/[id]/versions - List all versions for a flow
 * 
 * Requirements: 10.1, 10.4, 10.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createVersion, listVersions, ValidationFailureError } from '@/lib/canvas/version-manager';
import { VisualGraph } from '@/types/canvas-schema';

/**
 * POST /api/flows/[id]/versions
 * Create a new version of a flow
 * 
 * Request body:
 * {
 *   visualGraph: VisualGraph,
 *   commitMessage?: string
 * }
 * 
 * Response:
 * {
 *   versionId: string,
 *   executionGraph: ExecutionGraph
 * }
 * 
 * Requirement: 10.1
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flowId } = await params;
    const body = await request.json();
    
    // Validate request body
    if (!body.visualGraph) {
      return NextResponse.json(
        { error: 'visualGraph is required' },
        { status: 400 }
      );
    }
    
    const visualGraph = body.visualGraph as VisualGraph;
    const commitMessage = body.commitMessage as string | undefined;
    
    // Create version (validates and compiles)
    const result = await createVersion(flowId, visualGraph, commitMessage);
    
    return NextResponse.json({
      versionId: result.versionId,
      executionGraph: result.executionGraph
    });
    
  } catch (error: unknown) {
    console.error('Error creating version:', error);

    // Handle validation errors
    if (error instanceof ValidationFailureError) {
      return NextResponse.json(
        {
          error: 'Graph validation failed',
          validationErrors: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle other errors
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/flows/[id]/versions
 * List all versions for a flow (metadata only, no graph blobs)
 * 
 * Response:
 * {
 *   versions: FlowVersionMetadata[]
 * }
 * 
 * Note: Returns lightweight metadata only to avoid bandwidth issues.
 * Use GET /api/flows/[id]/versions/[vid] to fetch full version data.
 * 
 * Requirement: 10.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flowId } = await params;
    
    // List versions (metadata only, ordered by created_at DESC)
    const versions = await listVersions(flowId);
    
    return NextResponse.json({ versions });
    
  } catch (error: unknown) {
    console.error('Error listing versions:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
