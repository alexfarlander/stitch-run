/**
 * Demo Start API Endpoint
 * 
 * Executes the Clockwork Canvas demo script by firing a sequence of webhook
 * events with timed delays. This simulates real-world business events flowing
 * through the canvas.
 * 
 * Features:
 * - Self-reset: Automatically resets entities before starting
 * - Continuous loop: Demo runs in circles until stopped
 * - Node activation: Broadcasts events for visual feedback
 * 
 * Requirements: 6.1, 6.4
 */

import { NextResponse } from 'next/server';
import { 
  CLOCKWORK_DEMO_SCRIPT, 
  getDemoScriptDuration, 
  getDemoScriptEventCount 
} from '@/lib/demo/demo-script';
import {
  startDemoSession,
  stopDemoSession,
  isDemoRunning,
  isSessionValid,
  registerTimeout,
  incrementLoopCount,
  getLoopCount,
} from '@/lib/demo/demo-state';

/**
 * Execute a single demo loop
 */
async function executeDemoLoop(baseUrl: string, sessionId: string, loopOffset: number = 0): Promise<void> {
  // Validate session before starting
  if (!isSessionValid(sessionId)) {
    console.log(`[Demo] Session ${sessionId} is no longer valid, stopping`);
    return;
  }
  
  const loopNum = incrementLoopCount();
  console.log(`[Demo Loop ${loopNum}] Starting (session: ${sessionId.slice(-6)})`);
  
  for (const event of CLOCKWORK_DEMO_SCRIPT) {
    // Check if session is still valid
    if (!isSessionValid(sessionId)) {
      console.log(`[Demo Loop ${loopNum}] Session invalidated, stopping`);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      // Check session validity before firing
      if (!isSessionValid(sessionId)) return;
      
      try {
        console.log(`[Demo Loop ${loopNum}] ${event.description}`);
        
        // Broadcast demo event for Events Log
        try {
          const { broadcastToCanvasAsync } = await import('@/lib/supabase/broadcast');
          // Get the BMC canvas ID (we need to fetch it)
          const { getAdminClient } = await import('@/lib/supabase/client');
          const supabase = getAdminClient();
          const { data: bmcCanvas } = await supabase
            .from('stitch_flows')
            .select('id')
            .eq('canvas_type', 'bmc')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (bmcCanvas) {
            broadcastToCanvasAsync(bmcCanvas.id, 'demo_event', {
              description: event.description,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (broadcastErr) {
          // Ignore broadcast errors
        }
        
        const response = await fetch(`${baseUrl}${event.endpoint}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Clockwork-Demo-Orchestrator/1.0',
          },
          body: JSON.stringify(event.payload),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Demo Event Failed] ${event.description}:`, errorText);
        }
      } catch (error) {
        console.error(`[Demo Event Error] ${event.description}:`, error);
      }
    }, loopOffset + event.delay);
    
    registerTimeout(timeoutId);
  }
  
  // Schedule next loop after this one completes (with reset)
  const loopDuration = getDemoScriptDuration();
  const nextLoopTimeout = setTimeout(async () => {
    if (!isSessionValid(sessionId)) return;
    
    console.log(`[Demo] Resetting for next loop...`);
    
    // Reset entities before next loop
    try {
      await fetch(`${baseUrl}/api/demo/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[Demo] Reset failed:', error);
    }
    
    // Small delay after reset before starting next loop
    const startNextLoop = setTimeout(() => {
      if (isSessionValid(sessionId)) {
        executeDemoLoop(baseUrl, sessionId, 0);
      }
    }, 2000);
    registerTimeout(startNextLoop);
    
  }, loopOffset + loopDuration);
  
  registerTimeout(nextLoopTimeout);
}

/**
 * POST /api/demo/start
 * 
 * Starts the demo orchestrator with continuous looping.
 * Automatically resets entities before starting.
 * 
 * Requirement 6.1: Execute scripted sequence of webhook calls with timed delays
 * Requirement 6.4: Use same webhook endpoints as production
 * 
 * @returns Success response with event count and duration
 */
export async function POST() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BASE_URL not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Base URL not set' },
        { status: 500 }
      );
    }
    
    // If already running, return current status
    if (isDemoRunning()) {
      return NextResponse.json({
        success: true,
        message: 'Demo already running',
        isRunning: true,
        loopCount: getLoopCount(),
      });
    }
    
    console.log('Starting Clockwork Canvas demo (continuous mode)...');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Events per loop: ${getDemoScriptEventCount()}`);
    console.log(`Loop duration: ${getDemoScriptDuration()}ms`);
    
    // Step 1: Reset entities to initial positions
    console.log('[Demo] Resetting entities before start...');
    try {
      const resetResponse = await fetch(`${baseUrl}/api/demo/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!resetResponse.ok) {
        console.warn('[Demo] Reset returned non-OK status, continuing anyway');
      }
    } catch (error) {
      console.warn('[Demo] Reset failed, continuing anyway:', error);
    }
    
    // Step 2: Start demo session and get session ID
    const sessionId = startDemoSession();
    console.log(`[Demo] Started session: ${sessionId}`);
    
    // Step 3: Begin first loop (with small delay after reset)
    const startTimeout = setTimeout(() => {
      executeDemoLoop(baseUrl, sessionId, 0);
    }, 1000);
    registerTimeout(startTimeout);
    
    return NextResponse.json({
      success: true,
      message: 'Demo started (continuous mode)',
      isRunning: true,
      eventsPerLoop: getDemoScriptEventCount(),
      loopDuration: getDemoScriptDuration(),
      script: CLOCKWORK_DEMO_SCRIPT.map(e => ({
        delay: e.delay,
        description: e.description,
      })),
    });
    
  } catch (error) {
    console.error('Failed to start demo:', error);
    stopDemoSession();
    return NextResponse.json(
      { 
        error: 'Failed to start demo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
