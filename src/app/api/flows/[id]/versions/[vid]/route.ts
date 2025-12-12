/**
 * Specific Flow Version API
 * 
 * GET /api/flows/[id]/versions/[vid] - Retrieve a specific version
 * 
 * Requirement: 10.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVersion } from '@/lib/canvas/version-manager';

/**
 * GET /api/flows/[id]/versions/[vid]
 * Retrieve a specific version by ID
 * 
 * Response:
 * {
 *   version: FlowVersion
 * }
 * 
 * Requirement: 10.4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    const { id: flowId, vid: versionId } = await params;
    
    // Get version
    const version = await getVersion(versionId);
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }
    
    // Verify version belongs to the specified flow
    if (version.flow_id !== flowId) {
      return NextResponse.json(
        { error: 'Version does not belong to this flow' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ version });
    
  } catch (error: unknown) {
    console.error('Error retrieving version:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
