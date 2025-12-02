/**
 * Unit tests for retry API endpoint
 * Tests: Requirements 10.2, 10.3, 10.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as runs from '@/lib/db/runs';
import * as flows from '@/lib/db/flows';
import * as engine from '@/lib/engine';
import { fireNode } from '@/lib/engine/edge-walker';
import { StitchRun, StitchFlow } from '@/types/stitch';

// Mock dependencies
vi.mock('@/lib/db/runs');
vi.mock('@/lib/db/flows');
vi.mock('@/lib/engine');
vi.mock('@/lib/engine/edge-walker');

describe('Retry API Endpoint', () => {
  const mockRunId = '550e8400-e29b-41d4-a716-446655440000';
  const mockNodeId = 'worker-1';
  
  const mockRunWithFailedNode: StitchRun = {
    id: mockRunId,
    flow_id: 'flow-123',
    node_states: {
      'start-node': {
        status: 'completed',
        output: { data: 'initial' },
      },
      'worker-1': {
        status: 'failed',
        error: 'Worker timeout',
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockRunWithPendingNode: StitchRun = {
    id: mockRunId,
    flow_id: 'flow-123',
    node_states: {
      'start-node': {
        status: 'completed',
        output: { data: 'initial' },
      },
      'worker-1': {
        status: 'pending',
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockFlow: StitchFlow = {
    id: 'flow-123',
    name: 'Test Flow',
    graph: {
      nodes: [
        {
          id: 'start-node',
          type: 'Worker',
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: 'worker-1',
          type: 'Worker',
          position: { x: 100, y: 0 },
          data: { webhookUrl: 'https://example.com' },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'start-node',
          target: 'worker-1',
        },
      ],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRequest(): NextRequest {
    return {
      json: async () => ({}),
    } as NextRequest;
  }

  describe('Validation', () => {
    it('should reject invalid runId with 404 (Requirement 10.5)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request, { params: Promise.resolve({ runId: 'invalid-run', nodeId: mockNodeId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Run not found');
    });

    it('should reject invalid nodeId with 404 (Requirement 10.5)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRunWithFailedNode);

      const request = createMockRequest();
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: 'invalid-node' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Node not found in run');
    });

    it('should reject non-failed node with 400 (Requirement 10.5)', async () => {
      const runWithRunningNode: StitchRun = {
        ...mockRunWithFailedNode,
        node_states: {
          'worker-1': {
            status: 'running',
          },
        },
      };
      vi.mocked(runs.getRunAdmin).mockResolvedValue(runWithRunningNode);

      const request = createMockRequest();
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Node is not in failed state');
    });
  });

  describe('Retry Logic', () => {
    it('should reset failed node to pending (Requirement 10.2)', async () => {
      vi.mocked(runs.getRunAdmin)
        .mockResolvedValueOnce(mockRunWithFailedNode)
        .mockResolvedValueOnce(mockRunWithPendingNode);
      vi.mocked(runs.updateNodeState).mockResolvedValue(mockRunWithPendingNode);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(engine.areUpstreamDependenciesCompleted).mockReturnValue(true);
      vi.mocked(fireNode).mockResolvedValue(undefined);

      const request = createMockRequest();
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(runs.updateNodeState).toHaveBeenCalledWith(mockRunId, mockNodeId, {
        status: 'pending',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should re-evaluate dependencies and fire if satisfied (Requirement 10.3)', async () => {
      vi.mocked(runs.getRunAdmin)
        .mockResolvedValueOnce(mockRunWithFailedNode)
        .mockResolvedValueOnce(mockRunWithPendingNode);
      vi.mocked(runs.updateNodeState).mockResolvedValue(mockRunWithPendingNode);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(engine.areUpstreamDependenciesCompleted).mockReturnValue(true);
      vi.mocked(fireNode).mockResolvedValue(undefined);

      const request = createMockRequest();
      await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      // Should check if dependencies are satisfied
      expect(engine.areUpstreamDependenciesCompleted).toHaveBeenCalledWith(
        mockNodeId,
        mockFlow,
        mockRunWithPendingNode
      );

      // Should fire the node directly (not via walkEdges)
      expect(fireNode).toHaveBeenCalledWith(
        mockNodeId,
        mockFlow,
        mockRunWithPendingNode
      );
    });

    it('should not fire node if dependencies are not satisfied', async () => {
      const runWithPendingUpstream: StitchRun = {
        ...mockRunWithFailedNode,
        node_states: {
          'start-node': {
            status: 'pending',
          },
          'worker-1': {
            status: 'failed',
            error: 'Worker timeout',
          },
        },
      };

      const runAfterReset: StitchRun = {
        ...runWithPendingUpstream,
        node_states: {
          'start-node': {
            status: 'pending',
          },
          'worker-1': {
            status: 'pending',
          },
        },
      };

      vi.mocked(runs.getRunAdmin)
        .mockResolvedValueOnce(runWithPendingUpstream)
        .mockResolvedValueOnce(runAfterReset);
      vi.mocked(runs.updateNodeState).mockResolvedValue(runAfterReset);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(engine.areUpstreamDependenciesCompleted).mockReturnValue(false);

      const request = createMockRequest();
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      // Should check dependencies
      expect(engine.areUpstreamDependenciesCompleted).toHaveBeenCalled();

      // Should NOT fire the node
      expect(fireNode).not.toHaveBeenCalled();

      expect(response.status).toBe(200);
    });

    it('should handle node with no upstream dependencies (root node)', async () => {
      const flowWithNoUpstream: StitchFlow = {
        ...mockFlow,
        graph: {
          nodes: [
            {
              id: 'worker-1',
              type: 'Worker',
              position: { x: 0, y: 0 },
              data: { webhookUrl: 'https://example.com' },
            },
          ],
          edges: [],
        },
      };

      const rootNodeFailedRun: StitchRun = {
        id: mockRunId,
        flow_id: 'flow-123',
        node_states: {
          'worker-1': {
            status: 'failed',
            error: 'Worker timeout',
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const rootNodePendingRun: StitchRun = {
        id: mockRunId,
        flow_id: 'flow-123',
        node_states: {
          'worker-1': {
            status: 'pending',
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(runs.getRunAdmin)
        .mockResolvedValueOnce(rootNodeFailedRun)
        .mockResolvedValueOnce(rootNodePendingRun);
      vi.mocked(runs.updateNodeState).mockResolvedValue(rootNodePendingRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(flowWithNoUpstream);
      vi.mocked(engine.areUpstreamDependenciesCompleted).mockReturnValue(true);
      vi.mocked(fireNode).mockResolvedValue(undefined);

      const request = createMockRequest();
      await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      // Should fire the root node directly
      expect(fireNode).toHaveBeenCalledWith(
        mockNodeId,
        flowWithNoUpstream,
        rootNodePendingRun
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing flow gracefully', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRunWithFailedNode);
      vi.mocked(runs.updateNodeState).mockResolvedValue(mockRunWithPendingNode);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Flow not found');
    });

    it('should return 500 on internal server error', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRunWithFailedNode);
      vi.mocked(runs.updateNodeState).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
