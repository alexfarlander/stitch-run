/**
 * MCP Node Uptime Monitoring API Endpoint
 * 
 * Receives uptime pings from external assets integrated via MCP.
 * This endpoint does NOT require authentication - it's designed for external assets to report health status.
 * 
 * POST /api/uptime/ping/[nodeId]
 * 
 * Request Headers:
 * - Content-Type: application/json
 * 
 * Request Body (optional):
 * - status?: 'healthy' | 'degraded' | 'down'
 * - metadata?: Record<string, unknown>
 * 
 * Response:
 * - 200 OK: Uptime ping recorded successfully
 * - 404 Not Found: Node ID does not exist
 * - 500 Internal Server Error: Database or processing error
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
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
    
    // Step 2: Parse request body (optional for uptime pings)
    let body: { status?: string; metadata?: Record<string, unknown> } = {};
    
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      // For uptime pings, we can accept empty body, so just log the error
      console.warn('Failed to parse uptime ping body, using empty body:', parseError);
    }
    
    // Step 3: Validate node exists by checking all canvases
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
      // Validates: Requirements 5.4
      return NextResponse.json(
        { 
          error: 'Not Found',
          message: `Node with ID '${nodeId}' does not exist`,
          statusCode: 404
        },
        { status: 404 }
      );
    }
    
    // Step 4: Update or insert uptime record
    const now = new Date().toISOString();
    
    const uptimeData = {
      node_id: nodeId,
      last_seen: now,
      status: body.status || null,
      metadata: body.metadata || null,
      updated_at: now
    };
    
    // Use upsert to update if exists, insert if not
    const { data: uptimeRecord, error: upsertError } = await supabase
      .from('stitch_node_uptime')
      .upsert(uptimeData, {
        onConflict: 'node_id'
      })
      .select()
      .single();
    
    if (upsertError) {
      console.error('Error storing uptime record:', upsertError);
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'Failed to store uptime record',
          details: upsertError.message,
          statusCode: 500
        },
        { status: 500 }
      );
    }
    
    // Step 5: Return success response
    // Validates: Requirements 5.1, 5.2, 5.3
    return NextResponse.json(
      {
        success: true,
        nodeId: nodeId,
        lastSeen: uptimeRecord.last_seen,
        status: uptimeRecord.status
      },
      { status: 200 }
    );
    
  } catch (_error) {
    console.error('MCP uptime API error:', error);
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
