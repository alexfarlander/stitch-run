/**
 * Unit tests for UX complete API endpoint
 * Tests: Requirements 8.3, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as runs from '@/lib/db/runs';
import * as flows from '@/lib/db/flows';
import * as edgeWalker from '@/lib/engine/edge-walker';
import { StitchRun, StitchFlow } from '@/types/stitch';

// Mock dependencies
vi.mock('@/lib/db/runs');
vi.mock('@/lib/db/flows');
vi.mock('@/lib/engine/edge-walker');

describe('UX Complete API Endpoint', () => {
  const mockRunId = '550e8400-e29b-41d4-a716-446655440000';
  const mockNodeId = 'ux-1';
  
  const mockRun: StitchRun = {
    id: mockRunId,
    flow_id: 'flow-123',
    node_states: {
      'ux-1': {
        status: 'waiting_for_user',
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
          id: 'ux-1',
          type: 'UX',
          position: { x: 0, y: 0 },
          data: { prompt: 'Enter your input' },
        },
        {
          id: 'worker-1',
          type: 'Worker',
          position: { x: 100, y: 0 },
          data: { webhookUrl: 'https://example.com' },
        },
      ],
      edges: [],
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

  function createMockRequest(body: any): NextRequest {
    return {
      json: async () => body,
    } as NextRequest;
  }

  describe('Validation', () => {
    it('should reject invalid runId with 404 (Requirement 8.3)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(null);

      const request = createMockRequest({ input: { data: 'test' } });
      const response = await POST(request, { params: Promise.resolve({ runId: 'invalid-run', nodeId: mockNodeId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Run not found');
    });

    it('should reject invalid nodeId with 404 (Requirement 8.3)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);

      const request = createMockRequest({ input: { data: 'test' } });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: 'invalid-node' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Node not found in run');
    });

    it('should reject non-UX node with 400 (Requirement 8.3)', async () => {
      const runWithWorker: StitchRun = {
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'waiting_for_user',
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue(runWithWorker);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);

      const request = createMockRequest({ input: { data: 'test' } });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: 'worker-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Node is not a UX node');
    });

    it('should reject non-waiting node with 400 (Requirement 8.3)', async () => {
      const runWithCompletedUX: StitchRun = {
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: { data: 'previous' },
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue(runWithCompletedUX);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);

      const request = createMockRequest({ input: { data: 'test' } });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Node is not waiting for user input');
    });

    it('should reject malformed payload with 400', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);

      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as NextRequest;

      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request payload');
    });

    it('should reject when flow not found with 404', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(null);

      const request = createMockRequest({ input: { data: 'test' } });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Flow not found');
    });

    it('should reject when node not found in flow with 404', async () => {
      const flowWithoutNode: StitchFlow = {
        ...mockFlow,
        graph: {
          nodes: [],
          edges: [],
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(flowWithoutNode);

      const request = createMockRequest({ input: { data: 'test' } });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Node not found in flow');
    });
  });

  describe('Completion', () => {
    it('should update state to completed with provided input as output (Requirement 8.4)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: { userInput: 'test data' },
          },
        },
      });
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: { userInput: 'test data' },
          },
        },
      });
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const userInput = { userInput: 'test data' };
      const request = createMockRequest({ input: userInput });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(runs.updateNodeState).toHaveBeenCalledWith(mockRunId, mockNodeId, {
        status: 'completed',
        output: userInput,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should trigger edge-walking after state update (Requirement 8.5)', async () => {
      const updatedRun: StitchRun = {
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: { userInput: 'test data' },
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce(updatedRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.updateNodeState).mockResolvedValue(updatedRun);
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const userInput = { userInput: 'test data' };
      const request = createMockRequest({ input: userInput });
      await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(edgeWalker.walkEdges).toHaveBeenCalledWith(
        mockNodeId,
        mockFlow,
        expect.objectContaining({
          id: mockRunId,
          flow_id: 'flow-123',
        })
      );
    });

    it('should return 200 on successful processing', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: {},
          },
        },
      });
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: {},
          },
        },
      });
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const request = createMockRequest({ input: {} });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(200);
    });

    it('should handle various input types', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: 'simple string',
          },
        },
      });
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: 'simple string',
          },
        },
      });
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const request = createMockRequest({ input: 'simple string' });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(runs.updateNodeState).toHaveBeenCalledWith(mockRunId, mockNodeId, {
        status: 'completed',
        output: 'simple string',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing updated run gracefully', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce(null);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: {},
          },
        },
      });

      const request = createMockRequest({ input: {} });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      // Should still return 200
      expect(response.status).toBe(200);
      // Should not attempt edge-walking
      expect(edgeWalker.walkEdges).not.toHaveBeenCalled();
    });

    it('should handle empty input', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: undefined,
          },
        },
      });
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce({
        ...mockRun,
        node_states: {
          'ux-1': {
            status: 'completed',
            output: undefined,
          },
        },
      });
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const request = createMockRequest({ input: undefined });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(runs.updateNodeState).toHaveBeenCalledWith(mockRunId, mockNodeId, {
        status: 'completed',
        output: undefined,
      });

      expect(response.status).toBe(200);
    });
  });
});
