/**
 * Demo Stop API Endpoint
 * 
 * Stops the continuous demo loop and clears all scheduled events.
 */

import { NextResponse } from 'next/server';
import {
  stopDemoSession,
  isDemoRunning,
  getDemoSessionInfo,
} from '@/lib/demo/demo-state';

/**
 * POST /api/demo/stop
 * 
 * Stops the demo orchestrator.
 * 
 * @returns Success response with session info
 */
export async function POST() {
  try {
    const wasRunning = isDemoRunning();
    const sessionInfo = getDemoSessionInfo();
    
    // Stop the demo
    stopDemoSession();
    
    console.log('[Demo] Stopped', {
      wasRunning,
      loopsCompleted: sessionInfo.loopCount,
      runningFor: sessionInfo.runningFor,
    });
    
    return NextResponse.json({
      success: true,
      message: wasRunning ? 'Demo stopped' : 'Demo was not running',
      wasRunning,
      loopsCompleted: sessionInfo.loopCount,
      runningForMs: sessionInfo.runningFor,
    });
    
  } catch (error) {
    console.error('Failed to stop demo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to stop demo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/demo/stop
 * 
 * Get current demo status.
 */
export async function GET() {
  const sessionInfo = getDemoSessionInfo();
  
  return NextResponse.json({
    isRunning: sessionInfo.isRunning,
    loopCount: sessionInfo.loopCount,
    startedAt: sessionInfo.startedAt,
    runningForMs: sessionInfo.runningFor,
  });
}
