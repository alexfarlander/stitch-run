/**
 * Tests for Historical State API endpoint
 * 
 * Validates that the state reconstruction endpoint correctly processes
 * journey events to rebuild node states and entity positions at any
 * point in time.
 * 
 * Requirements: 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5
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

describe('Historical State API', () => {
  let testFlowId: string;
  let testRunId: string;
  let testEntityId: string;
  let testEventIds: string[] = [];
  let eventTimestamps: string[] = [];

  beforeAll(async () => {
    // Create test flow
    const { data: flow } = await supabase
      .from('stitch_flows')
      .insert({
        name: 'State Test Flow',
        graph: {
          nodes: [
            { id: 'node1', type: 'worker', data: {} },
            { id: 'node2', type: 'worker', data: {} },
            { id: 'node3', type: 'worker', data: {} },
          ],
          edges: [
            { id: 'edge1', source: 'node1', target: 'node2' },
            { id: 'edge2', source: 'node2', target: 'node3' },
          ],
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

    // Create journey events that tell a story
    const now = new Date();
    const events = [
      {
        entity_id: testEntityId,
        event_type: 'node_arrival',
        node_id: 'node1',
        timestamp: new Date(now.getTime() - 5000).toISOString(),
        metadata: {},
      },
      {
        entity_id: testEntityId,
        event_type: 'node_complete',
        node_id: 'node1',
        timestamp: new Date(now.getTime() - 4000).toISOString(),
        metadata: { output: { result: 'node1 output' } },
      },
      {
        entity_id: testEntityId,
        event_type: 'edge_start',
        edge_id: 'edge1',
        timestamp: new Date(now.getTime() - 3000).toISOString(),
        metadata: {},
      },
      {
        entity_id: testEntityId,
        event_type: 'node_arrival',
        node_id: 'node2',
        timestamp: new Date(now.getTime() - 2000).toISOString(),
        metadata: {},
      },
      {
        entity_id: testEntityId,
        event_type: 'node_failure',
        node_id: 'node2',
        timestamp: new Date(now.getTime() - 1000).toISOString(),
        metadata: { error: 'node2 failed' },
      },
    ];

    const { data: createdEvents } = await supabase
      .from('stitch_journey_events')
      .insert(events)
      .select();

    testEventIds = createdEvents!.map(e => e.id);
    eventTimestamps = events.map(e => e.timestamp);
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

  it('should require timestamp parameter', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/state`
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('timestamp');
  });

  it('should reconstruct state after node_arrival event', async () => {
    // Query state right after first node_arrival
    const timestamp = eventTimestamps[0];

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/state?timestamp=${timestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Requirement 7.2: node_arrival should set status to "running"
    expect(data.nodeStates.node1).toBeDefined();
    expect(data.nodeStates.node1.status).toBe('running');

    // Entity should be at node1
    expect(data.entityPositions[testEntityId]).toBeDefined();
    expect(data.entityPositions[testEntityId].nodeId).toBe('node1');
    expect(data.entityPositions[testEntityId].edgeId).toBeNull();
  });

  it('should reconstruct state after node_complete event', async () => {
    // Query state right after node_complete
    const timestamp = eventTimestamps[1];

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/state?timestamp=${timestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Requirement 7.3: node_complete should set status to "completed"
    expect(data.nodeStates.node1).toBeDefined();
    expect(data.nodeStates.node1.status).toBe('completed');
    expect(data.nodeStates.node1.output).toEqual({ result: 'node1 output' });
  });

  it('should reconstruct state during edge traversal', async () => {
    // Query state during edge traversal
    const timestamp = eventTimestamps[2];

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/state?timestamp=${timestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Node1 should still be completed
    expect(data.nodeStates.node1.status).toBe('completed');

    // Entity should be on edge1
    expect(data.entityPositions[testEntityId].nodeId).toBeNull();
    expect(data.entityPositions[testEntityId].edgeId).toBe('edge1');
    expect(data.entityPositions[testEntityId].progress).toBe(0);
  });

  it('should reconstruct state after node_failure event', async () => {
    // Query state right after node_failure
    const timestamp = eventTimestamps[4];

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/state?timestamp=${timestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Requirement 7.4: node_failure should set status to "failed"
    expect(data.nodeStates.node2).toBeDefined();
    expect(data.nodeStates.node2.status).toBe('failed');
    expect(data.nodeStates.node2.error).toBe('node2 failed');

    // Node1 should still be completed
    expect(data.nodeStates.node1.status).toBe('completed');

    // Entity should be at node2
    expect(data.entityPositions[testEntityId].nodeId).toBe('node2');
  });

  it('should return complete node_states object', async () => {
    // Requirement 7.5: Return a complete node_states object for that timestamp
    const timestamp = eventTimestamps[4];

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/state?timestamp=${timestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Should have reconstructed states for all nodes that had events
    expect(data.nodeStates).toBeDefined();
    expect(typeof data.nodeStates).toBe('object');
    expect(data.nodeStates.node1).toBeDefined();
    expect(data.nodeStates.node2).toBeDefined();

    // Should have entity positions
    expect(data.entityPositions).toBeDefined();
    expect(typeof data.entityPositions).toBe('object');

    // Should include the timestamp
    expect(data.timestamp).toBe(timestamp);
  });

  it('should return 404 for non-existent run', async () => {
    const fakeRunId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${fakeRunId}/state?timestamp=${new Date().toISOString()}`
    );

    expect(response.status).toBe(404);
  });

  it('should return empty state for run with no entities', async () => {
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
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${emptyRun!.id}/state?timestamp=${new Date().toISOString()}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    expect(data.nodeStates).toEqual({});
    expect(data.entityPositions).toEqual({});

    // Clean up
    await supabase.from('stitch_runs').delete().eq('id', emptyRun!.id);
    await supabase.from('stitch_flows').delete().eq('id', emptyFlow!.id);
  });

  it('should handle events in chronological order', async () => {
    // Query at a timestamp between node_arrival and node_complete
    const betweenTimestamp = new Date(
      (new Date(eventTimestamps[0]).getTime() + new Date(eventTimestamps[1]).getTime()) / 2
    ).toISOString();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/runs/${testRunId}/state?timestamp=${betweenTimestamp}`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Should only have processed the first event (node_arrival)
    expect(data.nodeStates.node1.status).toBe('running');
    // Should not have the output from node_complete yet
    expect(data.nodeStates.node1.output).toBeUndefined();
  });
});
