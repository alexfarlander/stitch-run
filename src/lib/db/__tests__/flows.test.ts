/**
 * Unit tests for flow database operations
 * Tests: Requirements 1.3, 1.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFlow, getFlow, updateFlow, deleteFlow } from '../flows';
import { StitchNode, StitchEdge } from '@/types/stitch';

describe('Flow Database Operations', () => {
  let testFlowId: string;

  // Clean up after tests
  const cleanup = async () => {
    if (testFlowId) {
      try {
        await deleteFlow(testFlowId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  };

  describe('createFlow', () => {
    it('should create a flow with valid graph structure', async () => {
      const nodes: StitchNode[] = [
        {
          id: 'node-1',
          type: 'Worker',
          position: { x: 100, y: 100 },
          data: { webhookUrl: 'https://example.com/webhook' },
        },
        {
          id: 'node-2',
          type: 'UX',
          position: { x: 300, y: 100 },
          data: { prompt: 'Enter input' },
        },
      ];

      const edges: StitchEdge[] = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
        },
      ];

      const flow = await createFlow('Test Flow', { nodes, edges });
      testFlowId = flow.id;

      // Validate flow structure (Requirements 1.3, 1.4)
      expect(flow.id).toBeDefined();
      expect(flow.name).toBe('Test Flow');
      expect(flow.graph.nodes).toHaveLength(2);
      expect(flow.graph.edges).toHaveLength(1);
      
      // Validate node structure
      expect(flow.graph.nodes[0]).toMatchObject({
        id: 'node-1',
        type: 'Worker',
        position: { x: 100, y: 100 },
        data: { webhookUrl: 'https://example.com/webhook' },
      });

      // Validate edge structure
      expect(flow.graph.edges[0]).toMatchObject({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      });

      expect(flow.created_at).toBeDefined();
      expect(flow.updated_at).toBeDefined();

      await cleanup();
    });

    it('should create a flow with all node types', async () => {
      const nodes: StitchNode[] = [
        { id: 'worker', type: 'Worker', position: { x: 0, y: 0 }, data: {} },
        { id: 'ux', type: 'UX', position: { x: 100, y: 0 }, data: {} },
        { id: 'splitter', type: 'Splitter', position: { x: 200, y: 0 }, data: {} },
        { id: 'collector', type: 'Collector', position: { x: 300, y: 0 }, data: {} },
      ];

      const flow = await createFlow('All Node Types', { nodes, edges: [] });
      testFlowId = flow.id;

      expect(flow.graph.nodes).toHaveLength(4);
      expect(flow.graph.nodes.map(n => n.type)).toEqual(['Worker', 'UX', 'Splitter', 'Collector']);

      await cleanup();
    });
  });

  describe('getFlow', () => {
    it('should retrieve an existing flow', async () => {
      const created = await createFlow('Get Test', { nodes: [], edges: [] });
      testFlowId = created.id;

      const retrieved = await getFlow(testFlowId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(testFlowId);
      expect(retrieved?.name).toBe('Get Test');

      await cleanup();
    });

    it('should return null for non-existent flow', async () => {
      const result = await getFlow('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('updateFlow', () => {
    it('should update flow name', async () => {
      const created = await createFlow('Original Name', { nodes: [], edges: [] });
      testFlowId = created.id;

      const updated = await updateFlow(testFlowId, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe(testFlowId);

      await cleanup();
    });

    it('should update flow graph', async () => {
      const created = await createFlow('Graph Update', { nodes: [], edges: [] });
      testFlowId = created.id;

      const newNodes: StitchNode[] = [
        { id: 'new-node', type: 'Worker', position: { x: 0, y: 0 }, data: {} },
      ];

      const updated = await updateFlow(testFlowId, { graph: { nodes: newNodes, edges: [] } });

      expect(updated.graph.nodes).toHaveLength(1);
      expect(updated.graph.nodes[0].id).toBe('new-node');

      await cleanup();
    });
  });

  describe('deleteFlow', () => {
    it('should delete a flow', async () => {
      const created = await createFlow('To Delete', { nodes: [], edges: [] });
      const flowId = created.id;

      await deleteFlow(flowId);

      const retrieved = await getFlow(flowId);
      expect(retrieved).toBeNull();
    });
  });
});
