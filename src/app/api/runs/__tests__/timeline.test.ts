/**
 * Tests for Timeline API endpoint
 * 
 * Validates that the timeline endpoint correctly fetches and filters
 * journey events for a workflow run.
 * 
 * Requirements: 6.2, 6.3, 7.1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('Timeline API', () => {
  let testFlowId: string;
  let testRunId: string;
  let testEntityId: string;
  let testEventIds: string[] = [];

  beforeAll(async () => {
    // Create test flow
    const { data: flow } = await supabase
      .from('stitch_flows')
      .insert({
        name: 'Timeline Test Flow',
        graph: {
          nodes: [
            { id: 'node1', type: 'worker', data: {} },
            { id: 'node2', type: 'worker', data: {} },
          ],
          edges: [{ id: 'edge1', source: 'node1', target: 'node2' }],
        },
      })
      .select()
      .single();

    testFlowId = flow!.id;

    // Create test run
    const { data: run } = await supabase
      .from('stitch_runs')
      .insert({
        flow_id: testFlowId,
        node_states: {},
      })
      .select()
      .single();

    testRunId = run!.id;

    // Create test entity
    const { data: entity } = await supabase
      .from('stitch_entities')
      .insert({
        canvas_id: testFlowId,
        name: 'Test Entity',
        entity_type: 'lead',
        current_node_id: 'node1',
      })
      .select()
      .single();

    testEntityId = entity!.id;

    // Create test journey events with different timestamps
    const now = new Date();
    const events = [
      {
        entity_id: testEntityId,
        event_type: 'node_arrival',
        node_id: 'node1',
        timestamp: new Date(now.getTime() - 3000).toISOString(),
        metadata: {},
      },
      {
        entity_id: testEntityId,
        event_type: 'node_complete',
        node_id: 'node1',
        timestamp: new Date(now.getTime() - 2000).toISOString(),
        metadata: { output: { result: 'success' } },
      },
      {
        entity_id: testEntityId,
        event_type: 'edge_start',
        edge_id: 'edge1',
        timestamp: new Date(now.getTime() - 1000).toISOString(),
        metadata: {},
      },
      {
        entity_id: testEntityId,
        event_type: 'node_arrival',
        node_id: 'node2',
        timestamp: now.toISOString(),
        metadata: {},
      },
    ];

    const { data: createdEvents } = await supabase
      .from('stitch_journey_events')
      .insert(events)
      .select();

    testEventIds = createdEvents!.map(e => e.id);
  });

  afterAll(async () => {
    // Clean up test data
    if (testEventIds.length > 0) {
      await supabase
        .from('stitch_journey_events')
        .delete()
        .in('id', testEventIds);
    }
    if (testEntityId) {
      await supabase.from('stitch_entities').delete().eq('id', testEntityId);
    }
    if (testRunId) {
      await supabase.from('stitch_runs').delete().eq('id', testRunId);
    }
    if (testFlowId) {
      await supabase.from('stitch_flows').delete().eq('id', testFlowId);
    }
  });

  it('should fetch all journey events for a run', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/timeline`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    expect(data.events).toBeDefined();
    expect(data.events.length).toBe(4);
    expect(data.totalEvents).toBe(4);
    expect(data.startTime).toBeDefined();
    expect(data.endTime).toBeDefined();

    // Verify events are in chronological order
    for (let i = 1; i < data.events.length; i++) {
      const prevTime = new Date(data.events[i - 1].timestamp).getTime();
      const currTime = new Date(data.events[i].timestamp).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
  });

  it('should filter events by before timestamp', async () => {
    // Get the timestamp of the third event
    const { data: events } = await supabase
      .from('stitch_journey_events')
      .select('timestamp')
      .in('id', testEventIds)
      .order('timestamp', { ascending: true });

    const beforeTimestamp = events![2].timestamp;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/timeline?before=${beforeTimestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Should get first 3 events (before or equal to timestamp)
    expect(data.events.length).toBeLessThanOrEqual(3);
    
    // All events should be before or equal to the filter timestamp
    data.events.forEach((event: any) => {
      expect(new Date(event.timestamp).getTime()).toBeLessThanOrEqual(
        new Date(beforeTimestamp).getTime()
      );
    });
  });

  it('should filter events by after timestamp', async () => {
    // Get the timestamp of the second event
    const { data: events } = await supabase
      .from('stitch_journey_events')
      .select('timestamp')
      .in('id', testEventIds)
      .order('timestamp', { ascending: true });

    const afterTimestamp = events![1].timestamp;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/timeline?after=${afterTimestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Should get events after or equal to timestamp
    expect(data.events.length).toBeGreaterThan(0);
    
    // All events should be after or equal to the filter timestamp
    data.events.forEach((event: any) => {
      expect(new Date(event.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(afterTimestamp).getTime()
      );
    });
  });

  it('should return 404 for non-existent run', async () => {
    const fakeRunId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${fakeRunId}/timeline`
    );

    expect(response.status).toBe(404);
  });

  it('should return empty timeline for run with no entities', async () => {
    // Create a flow and run with no entities
    const { data: emptyFlow } = await supabase
      .from('stitch_flows')
      .insert({
        name: 'Empty Flow',
        graph: { nodes: [], edges: [] },
      })
      .select()
      .single();

    const { data: emptyRun } = await supabase
      .from('stitch_runs')
      .insert({
        flow_id: emptyFlow!.id,
        node_states: {},
      })
      .select()
      .single();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${emptyRun!.id}/timeline`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    expect(data.events).toEqual([]);
    expect(data.totalEvents).toBe(0);
    expect(data.startTime).toBeNull();
    expect(data.endTime).toBeNull();

    // Clean up
    await supabase.from('stitch_runs').delete().eq('id', emptyRun!.id);
    await supabase.from('stitch_flows').delete().eq('id', emptyFlow!.id);
  });
});
