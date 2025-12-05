/**
 * Timeline API endpoint for fetching journey events
 * 
 * GET /api/runs/[runId]/timeline
 * 
 * Returns all journey events for a workflow run, ordered chronologically.
 * Supports optional timestamp filtering for efficient queries.
 * 
 * Requirements: 6.2, 6.3, 7.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JourneyEvent } from '@/types/stitch';

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

interface TimelineResponse {
  events: JourneyEvent[];
  startTime: string | null;
  endTime: string | null;
  totalEvents: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const { runId } = params;
    const { searchParams } = new URL(request.url);
    
    // Optional timestamp filters for efficient querying
    const beforeTimestamp = searchParams.get('before');
    const afterTimestamp = searchParams.get('after');
    
    const supabase = getAdminClient();

    // First, get the run to find the flow_id (canvas_id)
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
      // No entities means no journey events
      return NextResponse.json<TimelineResponse>({
        events: [],
        startTime: null,
        endTime: null,
        totalEvents: 0,
      });
    }

    const entityIds = entities.map(e => e.id);

    // Build query for journey events
    let query = supabase
      .from('stitch_journey_events')
      .select('*')
      .in('entity_id', entityIds)
      .order('timestamp', { ascending: true });

    // Apply timestamp filters if provided
    // Requirement 7.1: Implement efficient event querying with timestamp filters
    if (beforeTimestamp) {
      query = query.lte('timestamp', beforeTimestamp);
    }
    if (afterTimestamp) {
      query = query.gte('timestamp', afterTimestamp);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      return NextResponse.json(
        { error: `Failed to fetch journey events: ${eventsError.message}` },
        { status: 500 }
      );
    }

    // Calculate timeline bounds
    const startTime = events && events.length > 0 ? events[0].timestamp : null;
    const endTime = events && events.length > 0 ? events[events.length - 1].timestamp : null;

    const response: TimelineResponse = {
      events: (events || []) as JourneyEvent[],
      startTime,
      endTime,
      totalEvents: events?.length || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Timeline API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
