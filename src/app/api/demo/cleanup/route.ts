/**
 * Demo Cleanup API Endpoint
 * 
 * Provides cleanup endpoint for demo sessions.
 * 
 * Requirement 3.4: Implement cleanup endpoint for demo sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { DemoManager } from '@/lib/demo/demo-manager';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface CleanupDemoRequest {
  sessionId?: string;
  canvasId?: string;
}

interface CleanupDemoResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}

/**
 * POST /api/demo/cleanup
 * 
 * Cleans up demo entities by session ID or canvas ID.
 * 
 * Requirement 3.4: Provide cleanup endpoint for demo sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body: CleanupDemoRequest = await request.json();
    const { sessionId, canvasId } = body;

    // Validate that at least one parameter is provided
    if (!sessionId && !canvasId) {
      return NextResponse.json(
        { error: 'Either sessionId or canvasId is required' },
        { status: 400 }
      );
    }

    const demoManager = new DemoManager();
    let deletedCount = 0;

    if (sessionId) {
      // Clean up specific session
      deletedCount = await demoManager.cleanupSession(sessionId);
    } else if (canvasId) {
      // Clean up all demo entities for canvas
      // This uses the private method through a new demo start (which cleans up first)
      // For direct cleanup, we'll query and delete
      const entities = await demoManager.queryEntities(canvasId, false);
      const demoEntities = entities.filter(
        (e: unknown) => {
          if (!isPlainObject(e)) return false;
          const metadata = e['metadata'];
          if (!isPlainObject(metadata)) return false;
          return metadata['source'] === 'demo';
        }
      );
      
      // Delete each demo entity's session
      const sessionIds = new Set(
        demoEntities
          .map((e: unknown) => {
            if (!isPlainObject(e)) return undefined;
            const metadata = e['metadata'];
            if (!isPlainObject(metadata)) return undefined;
            const sessionIdValue = metadata['session_id'];
            return typeof sessionIdValue === 'string' ? sessionIdValue : undefined;
          })
          .filter(Boolean)
      );
      
      for (const sid of sessionIds) {
        deletedCount += await demoManager.cleanupSession(sid as string);
      }
    }

    const response: CleanupDemoResponse = {
      success: true,
      deletedCount,
      message: `Successfully cleaned up ${deletedCount} demo entities`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Demo cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clean up demo entities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
