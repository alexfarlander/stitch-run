/**
 * Demo Mode API Endpoint
 * Spawns demo entities and triggers workflows with staggered delays
 * 
 * Uses DemoManager for idempotent demo session management.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 13.1, 13.2, 13.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { DemoManager, type DemoEntityConfig } from '@/lib/demo/demo-manager';

interface StartDemoRequest {
  canvasId: string;
  entities?: DemoEntityConfig[];
  staggerDelay?: number; // milliseconds between entity spawns
}

interface StartDemoResponse {
  sessionId: string;
  status: 'running';
  entityIds: string[];
  runIds: string[];
}

/**
 * POST /api/demo/start
 * 
 * Starts a demo session using DemoManager for idempotent cleanup.
 * 
 * Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3, 13.1, 13.2, 13.3
 */
export async function POST(request: NextRequest) {
  try {
    const body: StartDemoRequest = await request.json();
    const { canvasId, entities, staggerDelay = 2000 } = body;

    // Validate required fields (Requirement 13.1)
    if (!canvasId) {
      return NextResponse.json(
        { error: 'canvasId is required' },
        { status: 400 }
      );
    }

    // Use DemoManager for idempotent demo session management
    // Requirements: 3.1, 3.2, 3.3
    const demoManager = new DemoManager();
    const session = await demoManager.startDemo({
      canvasId,
      entities,
      staggerDelay,
    });

    // Return demo session info (Requirement 13.3)
    const response: StartDemoResponse = {
      sessionId: session.sessionId,
      status: 'running',
      entityIds: session.entityIds,
      runIds: session.runIds,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Demo mode error:', error);
    
    // Handle specific error cases
    if (error instanceof Error && error.message === 'Canvas not found') {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to start demo mode',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
