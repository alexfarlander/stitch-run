/**
 * Unit tests for run database operations
 * Tests: Requirements 2.4, 2.6, 11.2
 */

// beforeEach import removed as unused
import { createRun, getRun, updateNodeState, updateNodeStates, deleteRun } from '../runs';
import { createFlowWithVersion, deleteFlow } from '../flows';
import { StitchNode, NodeState } from '@/types/stitch';
import { VisualGraph, VisualNode, VisualEdge } from '@/types/canvas-schema';

describe('Run Database Operations', () => {
  let testFlowId: string;
  let testRunId: string;

  beforeEach(async () => {
    // Create a test flow with multiple nodes using the new versioning system
    const nodes: VisualNode[] = [
      { 
        id: 'node-1', 
        type: 'worker', 
        position: { x: 0, y: 0 }, 
        data: { 
          label: 'Worker 1',
          worker_type: 'claude',
          inputs: {},
          outputs: { result: { type: 'string', description: 'Result' } }
        } 
      },
      { 
        id: 'node-2', 
        type: 'ux', 
        position: { x: 100, y: 0 }, 
        data: { 
          label: 'UX Node',
          inputs: {},
          outputs: { data: { type: 'object', description: 'User data' } }
        } 
      },
      { 
        id: 'node-3', 
        type: 'collector', 
        position: { x: 200, y: 0 }, 
        data: { 
          label: 'Collector',
          inputs: {},
          outputs: { combined: { type: 'array', description: 'Combined results' } }
        } 
      },
    ];

    const edges: VisualEdge[] = [];

    const visualGraph: VisualGraph = { nodes, edges };

    const { flow } = await createFlowWithVersion('Test Flow for Runs', visualGraph);
    testFlowId = flow.id;
  });

  afterEach(async () => {
    // Clean up
    if (testRunId) {
      try {
        await deleteRun(testRunId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (testFlowId) {
      try {
        await deleteFlow(testFlowId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('createRun', () => {
    it('should initialize all nodes to pending status (Requirement 2.6)', async () => {
      const run = await createRun(testFlowId);
      testRunId = run.id;

      expect(run.id).toBeDefined();
      expect(run.flow_id).toBe(testFlowId);
      expect(run.node_states).toBeDefined();

      // All nodes should be initialized to 'pending'
      expect(run.node_states['node-1']).toEqual({ status: 'pending' });
      expect(run.node_states['node-2']).toEqual({ status: 'pending' });
      expect(run.node_states['node-3']).toEqual({ status: 'pending' });

      // Verify all nodes are present
      expect(Object.keys(run.node_states)).toHaveLength(3);
    });

    it('should create run with default manual trigger when no trigger provided', async () => {
      const run = await createRun(testFlowId);
      testRunId = run.id;

      expect(run.trigger).toBeDefined();
      expect(run.trigger.type).toBe('manual');
      expect(run.trigger.source).toBeNull();
      expect(run.trigger.event_id).toBeNull();
      expect(run.trigger.timestamp).toBeDefined();
    });

    it('should create run with null entity_id when provided (Requirement 3.3)', async () => {
      const run = await createRun(testFlowId, { entity_id: null });
      testRunId = run.id;

      expect(run.entity_id).toBeNull();
    });

    it('should create run with webhook trigger metadata (Requirement 3.1, 3.2)', async () => {
      const webhookEventId = '87654321-4321-4321-4321-210987654321';
      const timestamp = new Date().toISOString();
      
      const run = await createRun(testFlowId, {
        trigger: {
          type: 'webhook',
          source: 'stripe',
          event_id: webhookEventId,
          timestamp: timestamp,
        },
      });
      testRunId = run.id;

      expect(run.trigger).toBeDefined();
      expect(run.trigger.type).toBe('webhook');
      expect(run.trigger.source).toBe('stripe');
      expect(run.trigger.event_id).toBe(webhookEventId);
      expect(run.trigger.timestamp).toBe(timestamp);
    });

    it('should create run with both entity_id and trigger metadata', async () => {
      const webhookEventId = '87654321-4321-4321-4321-210987654321';
      
      const run = await createRun(testFlowId, {
        entity_id: null,
        trigger: {
          type: 'webhook',
          source: 'hubspot',
          event_id: webhookEventId,
          timestamp: new Date().toISOString(),
        },
      });
      testRunId = run.id;

      expect(run.entity_id).toBeNull();
      expect(run.trigger.type).toBe('webhook');
      expect(run.trigger.source).toBe('hubspot');
      expect(run.trigger.event_id).toBe(webhookEventId);
    });

    it('should throw error for non-existent flow', async () => {
      await expect(
        createRun('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Flow not found');
    });
  });

  describe('getRun', () => {
    it('should retrieve an existing run', async () => {
      const created = await createRun(testFlowId);
      testRunId = created.id;

      const retrieved = await getRun(testRunId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(testRunId);
      expect(retrieved?.flow_id).toBe(testFlowId);
    });

    it('should return null for non-existent run', async () => {
      const result = await getRun('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('updateNodeState', () => {
    it('should update a single node state and persist to database (Requirement 11.2)', async () => {
      const run = await createRun(testFlowId);
      testRunId = run.id;

      const newState: NodeState = {
        status: 'completed',
        output: { result: 'success' },
      };

      const updated = await updateNodeState(testRunId, 'node-1', newState);

      // Verify the update
      expect(updated.node_states['node-1']).toEqual(newState);
      
      // Other nodes should remain unchanged
      expect(updated.node_states['node-2']).toEqual({ status: 'pending' });
      expect(updated.node_states['node-3']).toEqual({ status: 'pending' });

      // Verify persistence by fetching again
      const retrieved = await getRun(testRunId);
      expect(retrieved?.node_states['node-1']).toEqual(newState);
    });

    it('should handle node state with error', async () => {
      const run = await createRun(testFlowId);
      testRunId = run.id;

      const failedState: NodeState = {
        status: 'failed',
        error: 'Worker webhook unreachable',
      };

      const updated = await updateNodeState(testRunId, 'node-1', failedState);

      expect(updated.node_states['node-1']).toEqual(failedState);
    });

    it('should validate node state structure (Requirement 2.4)', async () => {
      const run = await createRun(testFlowId);
      testRunId = run.id;

      // Test all valid status values
      const statuses: NodeState['status'][] = [
        'pending',
        'running',
        'completed',
        'failed',
        'waiting_for_user',
      ];

      for (const status of statuses) {
        const state: NodeState = { status };
        const updated = await updateNodeState(testRunId, 'node-1', state);
        expect(updated.node_states['node-1'].status).toBe(status);
      }
    });

    it('should throw error for non-existent run', async () => {
      await expect(
        updateNodeState('00000000-0000-0000-0000-000000000000', 'node-1', { status: 'completed' })
      ).rejects.toThrow('Run not found');
    });
  });

  describe('updateNodeStates', () => {
    it('should update multiple node states atomically', async () => {
      const run = await createRun(testFlowId);
      testRunId = run.id;

      const updates: Record<string, NodeState> = {
        'node-1': { status: 'completed', output: { data: 'A' } },
        'node-2': { status: 'running' },
      };

      const updated = await updateNodeStates(testRunId, updates);

      expect(updated.node_states['node-1']).toEqual(updates['node-1']);
      expect(updated.node_states['node-2']).toEqual(updates['node-2']);
      expect(updated.node_states['node-3']).toEqual({ status: 'pending' });
    });

    it('should handle parallel path node states (splitter scenario)', async () => {
      const run = await createRun(testFlowId);
      testRunId = run.id;

      // Simulate splitter creating parallel paths
      const parallelUpdates: Record<string, NodeState> = {
        'node-2_0': { status: 'completed', output: 'Result A' },
        'node-2_1': { status: 'completed', output: 'Result B' },
        'node-2_2': { status: 'running' },
      };

      const updated = await updateNodeStates(testRunId, parallelUpdates);

      expect(updated.node_states['node-2_0']).toEqual(parallelUpdates['node-2_0']);
      expect(updated.node_states['node-2_1']).toEqual(parallelUpdates['node-2_1']);
      expect(updated.node_states['node-2_2']).toEqual(parallelUpdates['node-2_2']);
    });
  });

  describe('deleteRun', () => {
    it('should delete a run', async () => {
      const run = await createRun(testFlowId);
      const runId = run.id;

      await deleteRun(runId);

      const retrieved = await getRun(runId);
      expect(retrieved).toBeNull();
    });
  });
});
