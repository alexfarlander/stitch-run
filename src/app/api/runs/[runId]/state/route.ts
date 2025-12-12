/**
 * Historical State API endpoint
 * 
 * GET /api/runs/[runId]/state?timestamp=<iso-string>
 * 
 * Reconstructs the complete state of a workflow run at a specific point in time
 * by processing journey events up to that timestamp.
 * 
 * Requirements: 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JourneyEvent, NodeState } from '@/types/stitch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface EntityPosition {
  nodeId: string | null;
  edgeId: string | null;
  progress: number | null;
}

interface HistoricalStateResponse {
  nodeStates: Record<string, NodeState>;
  entityPositions: Record<string, EntityPosition>;
  timestamp: string;
}

/**
 * Reconstruct node states from journey events
 * 
 * Processes events in chronological order and applies state transitions:
 * - node_arrival → status: 'running'
 * - node_complete → status: 'completed' (with output)
 * - node_failure → status: 'failed' (with error)
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */
function reconstructNodeStates(events: JourneyEvent[]): Record<string, NodeState> {
  const nodeStates: Record<string, NodeState> = {};

  for (const event of events) {
    const nodeId = event.node_id;
    if (!nodeId) continue;

    switch (event.event_type) {
      case 'node_arrival':
        // Requirement 7.2: Apply node_arrival events to set status to "running"
        nodeStates[nodeId] = {
          status: 'running',
        };
        break;

      case 'node_complete':
        // Requirement 7.3: Apply node_complete events to set status to "completed"
        nodeStates[nodeId] = {
          status: 'completed',
          output: event.metadata?.output,
        };
        break;

      case 'node_failure':
        // Requirement 7.4: Apply node_failure events to set status to "failed"
        nodeStates[nodeId] = {
          status: 'failed',
          error: typeof event.metadata?.error === 'string' ? event.metadata.error : undefined,
        };
        break;

      // Other event types don't affect node state
      default:
        break;
    }
  }

  // Requirement 7.5: Return a complete node_states object for that timestamp
  return nodeStates;
}

/**
 * Reconstruct entity positions from journey events
 * 
 * Tracks the last known position of each entity based on:
 * - node_arrival: entity is at a node
 * - edge_start: entity is on an edge
 * - edge_progress: entity is moving along an edge
 */
function reconstructEntityPositions(events: JourneyEvent[]): Record<string, EntityPosition> {
  const entityPositions: Record<string, EntityPosition> = {};

  for (const event of events) {
    const entityId = event.entity_id;

    switch (event.event_type) {
      case 'node_arrival':
        entityPositions[entityId] = {
          nodeId: event.node_id,
          edgeId: null,
          progress: null,
        };
        break;

      case 'edge_start':
        entityPositions[entityId] = {
          nodeId: null,
          edgeId: event.edge_id,
          progress: 0,
        };
        break;

      case 'edge_progress':
        entityPositions[entityId] = {
          nodeId: null,
          edgeId: event.edge_id,
          progress: event.progress,
        };
        break;

      case 'manual_move':
        // Manual moves put entity at target node
        entityPositions[entityId] = {
          nodeId: event.node_id,
          edgeId: null,
          progress: null,
        };
        break;

      default:
        break;
    }
  }

  return entityPositions;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const { searchParams } = new URL(request.url);
    
    const timestamp = searchParams.get('timestamp');

    if (!timestamp) {
      return NextResponse.json(
        { error: 'timestamp query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Get the run to find the flow_id (canvas_id)
    const { data: run, error: runError } = await supabase
      .from('stitch_runs')
      .select('flow_id')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Get all entities for this canvas
    const { data: entities, error: entitiesError } = await supabase
      .from('stitch_entities')
      .select('id')
      .eq('canvas_id', run.flow_id);

    if (entitiesError) {
      return NextResponse.json(
        { error: `Failed to fetch entities: ${entitiesError.message}` },
        { status: 500 }
      );
    }

    if (!entities || entities.length === 0) {
      // No entities means no state to reconstruct
      return NextResponse.json<HistoricalStateResponse>({
        nodeStates: {},
        entityPositions: {},
        timestamp,
      });
    }

    const entityIds = entities.map(e => e.id);

    // Requirement 7.1: Query all journey events up to that timestamp
    const { data: events, error: eventsError } = await supabase
      .from('stitch_journey_events')
      .select('*')
      .in('entity_id', entityIds)
      .lte('timestamp', timestamp)
      .order('timestamp', { ascending: true });

    if (eventsError) {
      return NextResponse.json(
        { error: `Failed to fetch journey events: ${eventsError.message}` },
        { status: 500 }
      );
    }

    // Reconstruct state from events
    const nodeStates = reconstructNodeStates((events || []) as JourneyEvent[]);
    const entityPositions = reconstructEntityPositions((events || []) as JourneyEvent[]);

    const response: HistoricalStateResponse = {
      nodeStates,
      entityPositions,
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Historical state API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
