/**
 * MCP Node Webhook API Endpoint
 * 
 * Receives webhook events from external assets integrated via MCP.
 * This endpoint does NOT require authentication - it's designed for external assets to send events.
 * 
 * POST /api/webhooks/node/[nodeId]
 * 
 * Request Headers:
 * - Content-Type: application/json
 * 
 * Request Body:
 * - Any valid JSON payload (structure defined by external asset)
 * 
 * Response:
 * - 200 OK: Event accepted and stored successfully
 * - 400 Bad Request: Invalid JSON or missing required fields
 * - 404 Not Found: Node ID does not exist
 * - 500 Internal Server Error: Database or processing error
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { RateLimiters, getClientIdentifier, applyRateLimitHeaders } from '@/lib/api/rate-limiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    // Step 0: Rate limiting - prevent abuse
    const { nodeId: nodeIdParam } = await params;
    const clientIp = getClientIdentifier(request);
    const identifier = `${nodeIdParam}:${clientIp}`; // Rate limit per node + IP

    const rateLimitResult = await RateLimiters.webhook.check(identifier);
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          statusCode: 429
        },
        { status: 429 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Step 1: Extract nodeId from params
    const { nodeId } = await params;
    
    if (!nodeId) {
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Node ID is required',
          statusCode: 400
        },
        { status: 400 }
      );
    }
    
    // Step 2: Parse request body
    let payload: Record<string, unknown>;
    
    try {
      payload = await request.json();
    } catch (parseError) {
      // Validates: Requirements 4.4
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Invalid JSON payload',
          details: parseError instanceof Error ? parseError.message : 'Failed to parse JSON',
          statusCode: 400
        },
        { status: 400 }
      );
    }
    
    // Step 3: Validate that payload is not empty
    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
      // Validates: Requirements 4.4
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Payload cannot be empty',
          statusCode: 400
        },
        { status: 400 }
      );
    }
    
    // Step 4: Validate node exists by checking all canvases
    // We need to search through all flows to find if this node exists
    const { data: flows, error: flowsError } = await supabase
      .from('stitch_flows')
      .select('id, graph');
    
    if (flowsError) {
      console.error('Error fetching flows:', flowsError);
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'Failed to validate node existence',
          statusCode: 500
        },
        { status: 500 }
      );
    }
    
    // Search for the node in all flow graphs
    let nodeExists = false;
    if (flows) {
      for (const flow of flows) {
        const graph = flow.graph as { nodes?: Array<{ id: string }> };
        if (graph.nodes?.some(node => node.id === nodeId)) {
          nodeExists = true;
          break;
        }
      }
    }
    
    if (!nodeExists) {
      // Validates: Requirements 4.2, 4.5
      return NextResponse.json(
        { 
          error: 'Not Found',
          message: `Node with ID '${nodeId}' does not exist`,
          statusCode: 404
        },
        { status: 404 }
      );
    }
    
    // Step 5: Store the webhook event in the database
    const { data: event, error: insertError } = await supabase
      .from('stitch_mcp_webhook_events')
      .insert({
        node_id: nodeId,
        payload: payload,
        received_at: new Date().toISOString(),
        processed: false
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error storing webhook event:', insertError);
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'Failed to store webhook event',
          details: insertError.message,
          statusCode: 500
        },
        { status: 500 }
      );
    }
    
    // Step 6: Return success response
    // Validates: Requirements 4.1, 4.3
    return NextResponse.json(
      {
        success: true,
        eventId: event.id,
        nodeId: nodeId,
        receivedAt: event.received_at
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('MCP webhook API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      },
      { status: 500 }
    );
  }
}
