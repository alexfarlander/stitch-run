/**
 * Unit tests demonstrating the Collector race condition fix
 * Validates: Requirements 1.7, 9.4
 */

// beforeEach import removed as unused
import { fireCollectorNode } from '../collector';
import { createRun, getRun, updateNodeState } from '@/lib/db/runs';
import { createFlow } from '@/lib/db/flows';
import { StitchNode, StitchEdge } from '@/types/stitch';
import { createClient } from '@supabase/supabase-js';

const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Collector Race Condition Fix', () => {
  let flowId: string;
  let runId: string;

  beforeEach(async () => {
    // Create a test flow with 3 upstream nodes feeding into a collector
    const nodes: StitchNode[] = [
      { id: 'upstream1', type: 'Worker', position: { x: 0, y: 0 }, data: {} },
      { id: 'upstream2', type: 'Worker', position: { x: 0, y: 100 }, data: {} },
      { id: 'upstream3', type: 'Worker', position: { x: 0, y: 200 }, data: {} },
      { id: 'collector', type: 'Collector', position: { x: 200, y: 100 }, data: {} },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'upstream1', target: 'collector' },
      { id: 'e2', source: 'upstream2', target: 'collector' },
      { id: 'e3', source: 'upstream3', target: 'collector' },
    ];

    const _flow = await createFlow('Collector Race Test', { nodes, edges });

    flowId = flow.id;

    // Create a run
    const run = await createRun(flowId);
    runId = run.id;
  });

  afterEach(async () => {
    // Cleanup
    if (runId) {
      await supabase.from('stitch_runs').delete().eq('id', runId);
    }
    if (flowId) {
      await supabase.from('stitch_flows').delete().eq('id', flowId);
    }
  });

  it('should NOT fire collector when only 1 of 3 upstream nodes complete', async () => {
    // Complete first upstream node
    await updateNodeState(runId, 'upstream1', {
      status: 'completed',
      output: 'output1',
    });

    // Fire collector (simulating edge-walking)
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    // Verify collector is still pending
    const run = await getRun(runId);
    expect(run?.node_states['collector'].status).toBe('pending');
    expect(run?.node_states['collector'].upstream_completed_count).toBe(1);
    expect(run?.node_states['collector'].expected_upstream_count).toBe(3);
  });

  it('should NOT fire collector when only 2 of 3 upstream nodes complete', async () => {
    // Complete first two upstream nodes
    await updateNodeState(runId, 'upstream1', {
      status: 'completed',
      output: 'output1',
    });
    await updateNodeState(runId, 'upstream2', {
      status: 'completed',
      output: 'output2',
    });

    // Fire collector (simulating edge-walking)
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    // Verify collector is still pending
    const run = await getRun(runId);
    expect(run?.node_states['collector'].status).toBe('pending');
    expect(run?.node_states['collector'].upstream_completed_count).toBe(2);
    expect(run?.node_states['collector'].expected_upstream_count).toBe(3);
  });

  it('SHOULD fire collector when all 3 upstream nodes complete', async () => {
    // Complete all three upstream nodes
    await updateNodeState(runId, 'upstream1', {
      status: 'completed',
      output: 'output1',
    });
    await updateNodeState(runId, 'upstream2', {
      status: 'completed',
      output: 'output2',
    });
    await updateNodeState(runId, 'upstream3', {
      status: 'completed',
      output: 'output3',
    });

    // Fire collector (simulating edge-walking)
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    // Verify collector completed
    const run = await getRun(runId);
    expect(run?.node_states['collector'].status).toBe('completed');
    expect(run?.node_states['collector'].upstream_completed_count).toBe(3);
    expect(run?.node_states['collector'].expected_upstream_count).toBe(3);
    expect(run?.node_states['collector'].output).toEqual(['output1', 'output2', 'output3']);
  });

  it('should handle race condition: multiple calls before all complete', async () => {
    // Simulate race condition: collector is called multiple times as upstream nodes complete

    // First upstream completes, collector is called
    await updateNodeState(runId, 'upstream1', {
      status: 'completed',
      output: 'output1',
    });
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    let run = await getRun(runId);
    expect(run?.node_states['collector'].status).toBe('pending');
    expect(run?.node_states['collector'].upstream_completed_count).toBe(1);

    // Second upstream completes, collector is called again
    await updateNodeState(runId, 'upstream2', {
      status: 'completed',
      output: 'output2',
    });
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    run = await getRun(runId);
    expect(run?.node_states['collector'].status).toBe('pending');
    expect(run?.node_states['collector'].upstream_completed_count).toBe(2);

    // Third upstream completes, collector is called again
    await updateNodeState(runId, 'upstream3', {
      status: 'completed',
      output: 'output3',
    });
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    // NOW collector should complete
    run = await getRun(runId);
    expect(run?.node_states['collector'].status).toBe('completed');
    expect(run?.node_states['collector'].upstream_completed_count).toBe(3);
    expect(run?.node_states['collector'].output).toEqual(['output1', 'output2', 'output3']);
  });

  it('should preserve upstream outputs across multiple calls', async () => {
    // First call with one upstream complete
    await updateNodeState(runId, 'upstream1', {
      status: 'completed',
      output: 'output1',
    });
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    let run = await getRun(runId);
    expect(run?.node_states['collector'].upstream_outputs).toEqual({
      upstream1: 'output1',
    });

    // Second call with two upstream complete
    await updateNodeState(runId, 'upstream2', {
      status: 'completed',
      output: 'output2',
    });
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    run = await getRun(runId);
    expect(run?.node_states['collector'].upstream_outputs).toEqual({
      upstream1: 'output1',
      upstream2: 'output2',
    });

    // Third call with all upstream complete
    await updateNodeState(runId, 'upstream3', {
      status: 'completed',
      output: 'output3',
    });
    await fireCollectorNode(runId, 'collector', {}, ['upstream1', 'upstream2', 'upstream3']);

    run = await getRun(runId);
    expect(run?.node_states['collector'].upstream_outputs).toEqual({
      upstream1: 'output1',
      upstream2: 'output2',
      upstream3: 'output3',
    });
  });
});
