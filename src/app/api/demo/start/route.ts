/**
 * Demo Start API Endpoint
 * 
 * Executes the Clockwork Canvas demo script by firing a sequence of webhook
 * events with timed delays. This simulates real-world business events flowing
 * through the canvas.
 * 
 * The demo uses setTimeout to schedule webhook calls, allowing the server to
 * return immediately while events fire in the background.
 * 
 * Requirements: 6.1, 6.4
 */

import { NextResponse } from 'next/server';
import { 
  CLOCKWORK_DEMO_SCRIPT, 
  getDemoScriptDuration, 
  getDemoScriptEventCount 
} from '@/lib/demo/demo-script';

/**
 * POST /api/demo/start
 * 
 * Starts the demo orchestrator by executing the scripted sequence of webhook calls.
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
    
    console.log('Starting Clockwork Canvas demo...');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Events: ${getDemoScriptEventCount()}`);
    console.log(`Duration: ${getDemoScriptDuration()}ms`);
    
    // Schedule all demo events (Requirement 6.1)
    for (const event of CLOCKWORK_DEMO_SCRIPT) {
      setTimeout(async () => {
        try {
          console.log(`[Demo Event] ${event.description}`);
          console.log(`  -> ${event.endpoint}`);
          console.log(`  -> Payload:`, event.payload);
          
          // Requirement 6.4: Use same webhook endpoints as production
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
          } else {
            const result = await response.json();
            console.log(`[Demo Event Success] ${event.description}:`, result);
          }
        } catch (error) {
          console.error(`[Demo Event Error] ${event.description}:`, error);
          // Continue with other events even if one fails
        }
      }, event.delay);
    }
    
    // Return immediately while events fire in background
    return NextResponse.json({
      success: true,
      message: 'Demo started successfully',
      events: getDemoScriptEventCount(),
      duration: getDemoScriptDuration(),
      script: CLOCKWORK_DEMO_SCRIPT.map(e => ({
        delay: e.delay,
        description: e.description,
      })),
    });
    
  } catch (error) {
    console.error('Failed to start demo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start demo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
