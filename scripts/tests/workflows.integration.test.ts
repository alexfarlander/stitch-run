/**
 * Integration Tests for Complete Workflows
 * Tests end-to-end execution of various workflow patterns
 * Validates: Requirement 11.3
 */

// beforeEach import removed as unused
import { createFlow, deleteFlow } from '@/lib/db/flows';
import { createRun, getRun, deleteRun, getRunAdmin } from '@/lib/db/runs';
import { walkEdges } from '@/lib/engine/edge-walker';
import { StitchFlow, StitchRun, StitchNode, StitchEdge } from '@/types/stitch';
import { getAdminClient } from '@/lib/supabase/client';

describe('Integration Tests: Complete Workflows', () => {
  let createdFlowIds: string[] = [];
  let createdRunIds: string[] = [];

  // Cleanup after each test
  beforeEach(async () => {
    createdFlowIds = [];
    createdRunIds = [];
  });

  afterEach(async () => {
    // Clean up runs first (foreign key constraint)
    for (const runId of createdRunIds) {
      try {
        await deleteRun(runId);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    // Clean up flows
    for (const flowId of createdFlowIds) {
      try {
        await deleteFlow(flowId);
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });

  /**
   * Test 1: Simple Linear Flow (A → B → C)
   * Tests basic edge-walking through a sequence of nodes
   */
  it('should execute a simple linear flow (A → B → C)', async () => {
    // Create flow: Start → Worker1 → Worker2
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'worker1',
        type: 'Worker',
        position: { x: 200, y: 0 },
        data: { label: 'Worker 1' },
      },
      {
        id: 'worker2',
        type: 'Worker',
        position: { x: 400, y: 0 },
        data: { label: 'Worker 2' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'worker1' },
      { id: 'e2', source: 'worker1', target: 'worker2' },
    ];

    const flow = await createFlow('Linear Flow Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Verify initial state: all nodes pending
    expect(run.node_states['start'].status).toBe('pending');
    expect(run.node_states['worker1'].status).toBe('pending');
    expect(run.node_states['worker2'].status).toBe('pending');

    // Simulate start node completion
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...run.node_states,
          start: { status: 'completed', output: { data: 'initial' } },
        },
      })
      .eq('id', run.id);

    // Trigger edge-walking from start
    const updatedRun1 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun1!);

    // Verify worker1 should now be in a state (pending or running depending on handler)
    const afterWalk1 = await getRunAdmin(run.id);
    expect(afterWalk1).not.toBeNull();
    // Worker1 should have been processed (either running or failed due to no webhook)
    expect(['running', 'failed']).toContain(afterWalk1!.node_states['worker1'].status);
    // Worker2 should still be pending (upstream not completed)
    expect(afterWalk1!.node_states['worker2'].status).toBe('pending');

    // Simulate worker1 completion
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterWalk1!.node_states,
          worker1: { status: 'completed', output: { result: 'step1' } },
        },
      })
      .eq('id', run.id);

    // Trigger edge-walking from worker1
    const updatedRun2 = await getRunAdmin(run.id);
    await walkEdges('worker1', flow, updatedRun2!);

    // Verify worker2 should now be processed
    const afterWalk2 = await getRunAdmin(run.id);
    expect(afterWalk2).not.toBeNull();
    expect(['running', 'failed']).toContain(afterWalk2!.node_states['worker2'].status);
  });

  /**
   * Test 2: Parallel Flow with Splitter/Collector
   * Tests fan-out and fan-in execution pattern
   */
  it('should execute a parallel flow with Splitter/Collector', async () => {
    // Create flow: Start → Splitter → Worker → Collector → End
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'splitter',
        type: 'Splitter',
        position: { x: 200, y: 0 },
        data: { label: 'Splitter', arrayPath: 'items' },
      },
      {
        id: 'worker',
        type: 'Worker',
        position: { x: 400, y: 0 },
        data: { label: 'Worker' },
      },
      {
        id: 'collector',
        type: 'Collector',
        position: { x: 600, y: 0 },
        data: { label: 'Collector' },
      },
      {
        id: 'end',
        type: 'Worker',
        position: { x: 800, y: 0 },
        data: { label: 'End' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'splitter' },
      { id: 'e2', source: 'splitter', target: 'worker' },
      { id: 'e3', source: 'worker', target: 'collector' },
      { id: 'e4', source: 'collector', target: 'end' },
    ];

    const flow = await createFlow('Parallel Flow Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Simulate start node completion with array output
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...run.node_states,
          start: { 
            status: 'completed', 
            output: { items: ['A', 'B', 'C'] } 
          },
        },
      })
      .eq('id', run.id);

    // Trigger edge-walking from start
    const updatedRun1 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun1!);

    // Verify splitter created parallel paths
    const afterSplit = await getRunAdmin(run.id);
    expect(afterSplit).not.toBeNull();
    expect(afterSplit!.node_states['splitter'].status).toBe('completed');
    
    // Check parallel worker instances were created
    expect(afterSplit!.node_states['worker_0']).toBeDefined();
    expect(afterSplit!.node_states['worker_1']).toBeDefined();
    expect(afterSplit!.node_states['worker_2']).toBeDefined();
    
    // Verify each parallel instance has correct output (array element)
    expect(afterSplit!.node_states['worker_0'].output).toBe('A');
    expect(afterSplit!.node_states['worker_1'].output).toBe('B');
    expect(afterSplit!.node_states['worker_2'].output).toBe('C');

    // Trigger edge-walking from splitter to fire parallel workers
    await walkEdges('splitter', flow, afterSplit!);

    // Verify parallel workers were fired
    const afterWorkerFire = await getRunAdmin(run.id);
    expect(['running', 'failed']).toContain(afterWorkerFire!.node_states['worker_0'].status);
    expect(['running', 'failed']).toContain(afterWorkerFire!.node_states['worker_1'].status);
    expect(['running', 'failed']).toContain(afterWorkerFire!.node_states['worker_2'].status);

    // Simulate parallel workers completing
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterWorkerFire!.node_states,
          worker_0: { status: 'completed', output: 'Result A' },
          worker_1: { status: 'completed', output: 'Result B' },
          worker_2: { status: 'completed', output: 'Result C' },
        },
      })
      .eq('id', run.id);

    // Trigger edge-walking from each parallel worker instance
    // The collector will check dependencies each time, but won't fire until all are complete
    const updatedRun2 = await getRunAdmin(run.id);
    await walkEdges('worker_0', flow, updatedRun2!);
    
    // After first worker completes, collector fires and checks - should be completed!
    // (All three workers were already marked as completed in the database)
    const afterCollect = await getRunAdmin(run.id);
    expect(afterCollect).not.toBeNull();
    expect(afterCollect!.node_states['collector'].status).toBe('completed');
    expect(afterCollect!.node_states['collector'].output).toEqual([
      'Result A',
      'Result B',
      'Result C',
    ]);

    // Trigger edge-walking from collector
    await walkEdges('collector', flow, afterCollect!);

    // Verify end node was fired
    const afterEnd = await getRunAdmin(run.id);
    expect(['running', 'failed']).toContain(afterEnd!.node_states['end'].status);
  });

  /**
   * Test 3: Human-in-the-Loop Flow with UX Gate
   * Tests execution pause and resume with UX nodes
   */
  it('should execute a human-in-the-loop flow with UX gate', async () => {
    // Create flow: Start → UX Gate → Worker
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'ux-gate',
        type: 'UX',
        position: { x: 200, y: 0 },
        data: { label: 'UX Gate', prompt: 'Please provide input' },
      },
      {
        id: 'worker',
        type: 'Worker',
        position: { x: 400, y: 0 },
        data: { label: 'Worker' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'ux-gate' },
      { id: 'e2', source: 'ux-gate', target: 'worker' },
    ];

    const flow = await createFlow('UX Flow Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Simulate start node completion
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...run.node_states,
          start: { status: 'completed', output: { data: 'initial' } },
        },
      })
      .eq('id', run.id);

    // Trigger edge-walking from start
    const updatedRun1 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun1!);

    // Verify UX gate is waiting for user
    const afterUX = await getRunAdmin(run.id);
    expect(afterUX).not.toBeNull();
    expect(afterUX!.node_states['ux-gate'].status).toBe('waiting_for_user');
    // Worker should still be pending (UX gate blocks)
    expect(afterUX!.node_states['worker'].status).toBe('pending');

    // Simulate user providing input
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterUX!.node_states,
          'ux-gate': { 
            status: 'completed', 
            output: { userInput: 'User provided data' } 
          },
        },
      })
      .eq('id', run.id);

    // Trigger edge-walking from UX gate
    const updatedRun2 = await getRunAdmin(run.id);
    await walkEdges('ux-gate', flow, updatedRun2!);

    // Verify worker was fired after UX completion
    const afterWorker = await getRunAdmin(run.id);
    expect(afterWorker).not.toBeNull();
    expect(['running', 'failed']).toContain(afterWorker!.node_states['worker'].status);
  });

  /**
   * Test 4: Mixed Flow with All Node Types
   * Tests complex workflow with Worker, UX, Splitter, and Collector
   * Simplified to test Splitter → Worker → Collector with UX gate before splitter
   */
  it('should execute a mixed flow with all node types', async () => {
    // Create flow: Start → UX → Splitter → Worker → Collector
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'ux',
        type: 'UX',
        position: { x: 200, y: 0 },
        data: { label: 'UX Review', prompt: 'Review before processing' },
      },
      {
        id: 'splitter',
        type: 'Splitter',
        position: { x: 400, y: 0 },
        data: { label: 'Splitter', arrayPath: 'tasks' },
      },
      {
        id: 'worker',
        type: 'Worker',
        position: { x: 600, y: 0 },
        data: { label: 'Worker' },
      },
      {
        id: 'collector',
        type: 'Collector',
        position: { x: 800, y: 0 },
        data: { label: 'Collector' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'ux' },
      { id: 'e2', source: 'ux', target: 'splitter' },
      { id: 'e3', source: 'splitter', target: 'worker' },
      { id: 'e4', source: 'worker', target: 'collector' },
    ];

    const flow = await createFlow('Mixed Flow Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Simulate start completion
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...run.node_states,
          start: { status: 'completed', output: { data: 'initial' } },
        },
      })
      .eq('id', run.id);

    // Walk from start - should fire UX node
    const updatedRun1 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun1!);

    // Verify UX node is waiting
    const afterUX = await getRunAdmin(run.id);
    expect(afterUX!.node_states['ux'].status).toBe('waiting_for_user');

    // Simulate user providing input with array
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterUX!.node_states,
          ux: { 
            status: 'completed', 
            output: { tasks: ['Task1', 'Task2'] } 
          },
        },
      })
      .eq('id', run.id);

    // Walk from UX - should fire splitter
    const updatedRun2 = await getRunAdmin(run.id);
    await walkEdges('ux', flow, updatedRun2!);

    // Verify splitter created parallel worker instances
    const afterSplit = await getRunAdmin(run.id);
    expect(afterSplit!.node_states['splitter'].status).toBe('completed');
    expect(afterSplit!.node_states['worker_0']).toBeDefined();
    expect(afterSplit!.node_states['worker_1']).toBeDefined();

    // Walk from splitter - should fire parallel workers
    await walkEdges('splitter', flow, afterSplit!);

    // Verify parallel workers were fired
    const afterWorkerFire = await getRunAdmin(run.id);
    expect(['running', 'failed']).toContain(afterWorkerFire!.node_states['worker_0'].status);
    expect(['running', 'failed']).toContain(afterWorkerFire!.node_states['worker_1'].status);

    // Simulate workers completing
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterWorkerFire!.node_states,
          worker_0: { status: 'completed', output: 'Result1' },
          worker_1: { status: 'completed', output: 'Result2' },
        },
      })
      .eq('id', run.id);

    // Walk from parallel worker instances
    // Both workers are already completed, so collector will fire immediately
    const updatedRun3 = await getRunAdmin(run.id);
    await walkEdges('worker_0', flow, updatedRun3!);

    // Verify collector merged results
    const afterCollect = await getRunAdmin(run.id);
    expect(afterCollect!.node_states['collector'].status).toBe('completed');
    expect(afterCollect!.node_states['collector'].output).toEqual(['Result1', 'Result2']);
  });

  /**
   * Test 5: Error Recovery with Worker Failure and Retry
   * Tests failure handling and manual retry functionality
   */
  it('should handle worker failure and allow retry', async () => {
    // Create flow: Start → Worker1 → Worker2
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'worker1',
        type: 'Worker',
        position: { x: 200, y: 0 },
        data: { label: 'Worker 1', webhookUrl: 'https://invalid-url-that-will-fail.test' },
      },
      {
        id: 'worker2',
        type: 'Worker',
        position: { x: 400, y: 0 },
        data: { label: 'Worker 2' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'worker1' },
      { id: 'e2', source: 'worker1', target: 'worker2' },
    ];

    const flow = await createFlow('Error Recovery Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Simulate start completion
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...run.node_states,
          start: { status: 'completed', output: { data: 'initial' } },
        },
      })
      .eq('id', run.id);

    // Walk from start - this will fire worker1 which should fail
    const updatedRun1 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun1!);

    // Verify worker1 failed (due to unreachable webhook)
    const afterFail = await getRunAdmin(run.id);
    expect(afterFail).not.toBeNull();
    expect(afterFail!.node_states['worker1'].status).toBe('failed');
    expect(afterFail!.node_states['worker1'].error).toBeDefined();
    // Worker2 should still be pending (upstream failed)
    expect(afterFail!.node_states['worker2'].status).toBe('pending');

    // Simulate retry: reset worker1 to pending
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterFail!.node_states,
          worker1: { status: 'pending' },
        },
      })
      .eq('id', run.id);

    // Verify worker1 is now pending
    const afterRetry = await getRunAdmin(run.id);
    expect(afterRetry!.node_states['worker1'].status).toBe('pending');

    // Re-evaluate dependencies and fire worker1 again
    const updatedRun2 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun2!);

    // Verify worker1 was fired again (will fail again, but demonstrates retry mechanism)
    const afterRetryFire = await getRunAdmin(run.id);
    expect(afterRetryFire!.node_states['worker1'].status).toBe('failed');

    // Now simulate successful completion after retry
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterRetryFire!.node_states,
          worker1: { status: 'completed', output: { result: 'success after retry' } },
        },
      })
      .eq('id', run.id);

    // Walk from worker1
    const updatedRun3 = await getRunAdmin(run.id);
    await walkEdges('worker1', flow, updatedRun3!);

    // Verify worker2 was fired after successful retry
    const afterSuccess = await getRunAdmin(run.id);
    expect(['running', 'failed']).toContain(afterSuccess!.node_states['worker2'].status);
  });

  /**
   * Test 6: System Recovery After Simulated Restart
   * Tests that execution can resume from database state
   */
  it('should recover and resume execution after simulated restart', async () => {
    // Create flow: Start → Worker1 → Worker2 → Worker3
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'worker1',
        type: 'Worker',
        position: { x: 200, y: 0 },
        data: { label: 'Worker 1' },
      },
      {
        id: 'worker2',
        type: 'Worker',
        position: { x: 400, y: 0 },
        data: { label: 'Worker 2' },
      },
      {
        id: 'worker3',
        type: 'Worker',
        position: { x: 600, y: 0 },
        data: { label: 'Worker 3' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'worker1' },
      { id: 'e2', source: 'worker1', target: 'worker2' },
      { id: 'e3', source: 'worker2', target: 'worker3' },
    ];

    const flow = await createFlow('Recovery Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Simulate partial execution: start and worker1 completed, worker2 running
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          start: { status: 'completed', output: { data: 'initial' } },
          worker1: { status: 'completed', output: { result: 'step1' } },
          worker2: { status: 'running' },
          worker3: { status: 'pending' },
        },
      })
      .eq('id', run.id);

    // Simulate "restart" by reading state from database
    const recoveredRun = await getRunAdmin(run.id);
    expect(recoveredRun).not.toBeNull();

    // Verify state was persisted correctly
    expect(recoveredRun!.node_states['start'].status).toBe('completed');
    expect(recoveredRun!.node_states['worker1'].status).toBe('completed');
    expect(recoveredRun!.node_states['worker2'].status).toBe('running');
    expect(recoveredRun!.node_states['worker3'].status).toBe('pending');

    // Simulate worker2 completing (as if callback was received after restart)
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...recoveredRun!.node_states,
          worker2: { status: 'completed', output: { result: 'step2' } },
        },
      })
      .eq('id', run.id);

    // Resume execution by walking from worker2
    const updatedRun = await getRunAdmin(run.id);
    await walkEdges('worker2', flow, updatedRun!);

    // Verify worker3 was fired after recovery
    const afterRecovery = await getRunAdmin(run.id);
    expect(afterRecovery).not.toBeNull();
    expect(['running', 'failed']).toContain(afterRecovery!.node_states['worker3'].status);

    // Verify all previous state is still intact
    expect(afterRecovery!.node_states['start'].status).toBe('completed');
    expect(afterRecovery!.node_states['worker1'].status).toBe('completed');
    expect(afterRecovery!.node_states['worker2'].status).toBe('completed');
  });

  /**
   * Test 7: Empty Array Handling in Splitter
   * Tests edge case where splitter receives empty array
   */
  it('should handle empty array in splitter correctly', async () => {
    // Create flow: Start → Splitter → Worker → Collector → End
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'splitter',
        type: 'Splitter',
        position: { x: 200, y: 0 },
        data: { label: 'Splitter', arrayPath: 'items' },
      },
      {
        id: 'worker',
        type: 'Worker',
        position: { x: 400, y: 0 },
        data: { label: 'Worker' },
      },
      {
        id: 'collector',
        type: 'Collector',
        position: { x: 600, y: 0 },
        data: { label: 'Collector' },
      },
      {
        id: 'end',
        type: 'Worker',
        position: { x: 800, y: 0 },
        data: { label: 'End' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'splitter' },
      { id: 'e2', source: 'splitter', target: 'worker' },
      { id: 'e3', source: 'worker', target: 'collector' },
      { id: 'e4', source: 'collector', target: 'end' },
    ];

    const flow = await createFlow('Empty Array Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Simulate start with empty array
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...run.node_states,
          start: { status: 'completed', output: { items: [] } },
        },
      })
      .eq('id', run.id);

    // Walk from start
    const updatedRun1 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun1!);

    // Verify splitter completed with empty array
    const afterSplit = await getRunAdmin(run.id);
    expect(afterSplit!.node_states['splitter'].status).toBe('completed');
    expect(afterSplit!.node_states['splitter'].output).toEqual([]);

    // Verify no parallel worker instances were created
    expect(afterSplit!.node_states['worker_0']).toBeUndefined();

    // Walk from splitter
    await walkEdges('splitter', flow, afterSplit!);

    // Collector should handle empty case
    const afterCollectorCheck = await getRunAdmin(run.id);
    // Collector might be pending or completed depending on implementation
    // The key is that no parallel paths exist
    expect(Object.keys(afterCollectorCheck!.node_states).filter(k => k.startsWith('worker_'))).toHaveLength(0);
  });

  /**
   * Test 8: Collector Failure Propagation
   * Tests that collector fails when upstream parallel path fails
   */
  it('should propagate failure from parallel path to collector', async () => {
    // Create flow: Start → Splitter → Worker → Collector
    const nodes: StitchNode[] = [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'splitter',
        type: 'Splitter',
        position: { x: 200, y: 0 },
        data: { label: 'Splitter', arrayPath: 'items' },
      },
      {
        id: 'worker',
        type: 'Worker',
        position: { x: 400, y: 0 },
        data: { label: 'Worker' },
      },
      {
        id: 'collector',
        type: 'Collector',
        position: { x: 600, y: 0 },
        data: { label: 'Collector' },
      },
    ];

    const edges: StitchEdge[] = [
      { id: 'e1', source: 'start', target: 'splitter' },
      { id: 'e2', source: 'splitter', target: 'worker' },
      { id: 'e3', source: 'worker', target: 'collector' },
    ];

    const flow = await createFlow('Failure Propagation Test', { nodes, edges });
    createdFlowIds.push(flow.id);

    const run = await createRun(flow.id);
    createdRunIds.push(run.id);

    // Simulate start with array
    const supabase = getAdminClient();
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...run.node_states,
          start: { status: 'completed', output: { items: ['A', 'B', 'C'] } },
        },
      })
      .eq('id', run.id);

    // Walk from start
    const updatedRun1 = await getRunAdmin(run.id);
    await walkEdges('start', flow, updatedRun1!);

    // Get state after split
    const afterSplit = await getRunAdmin(run.id);

    // Walk from splitter
    await walkEdges('splitter', flow, afterSplit!);

    // Simulate one worker succeeding, one failing, one still running
    const afterWorkerFire = await getRunAdmin(run.id);
    await supabase
      .from('stitch_runs')
      .update({
        node_states: {
          ...afterWorkerFire!.node_states,
          worker_0: { status: 'completed', output: 'Result A' },
          worker_1: { status: 'failed', error: 'Worker failed' },
          worker_2: { status: 'completed', output: 'Result C' },
        },
      })
      .eq('id', run.id);

    // Walk from parallel worker instances - collector will check all parallel paths
    // All three workers are already in terminal states (completed, failed, completed)
    // So when we walk from worker_0, the collector will fire and detect the failure
    const updatedRun2 = await getRunAdmin(run.id);
    await walkEdges('worker_0', flow, updatedRun2!);
    
    // Collector should have detected the failure and marked itself as failed
    const afterCollect = await getRunAdmin(run.id);
    expect(afterCollect!.node_states['collector'].status).toBe('failed');
    expect(afterCollect!.node_states['collector'].error).toContain('failed');
  });
});
