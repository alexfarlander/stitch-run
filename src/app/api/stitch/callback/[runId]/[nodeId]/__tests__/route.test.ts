/**
 * Unit tests for callback API endpoint
 * Tests: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 10.3
 */

// beforeEach import removed as unused
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as runs from '@/lib/db/runs';
import * as flows from '@/lib/db/flows';
import * as edgeWalker from '@/lib/engine/edge-walker';
import { StitchRun, StitchFlow, WorkerCallback } from '@/types/stitch';

// Mock dependencies
vi.mock('@/lib/db/runs');
vi.mock('@/lib/db/flows');
vi.mock('@/lib/engine/edge-walker');

describe('Callback API Endpoint', () => {
  const mockRunId = '550e8400-e29b-41d4-a716-446655440000';
  const mockNodeId = 'worker-1';
  
  const mockRun: StitchRun = {
    id: mockRunId,
    flow_id: 'flow-123',
    entity_id: null,
    node_states: {
      'worker-1': {
        status: 'running',
      },
    },
    trigger: {
      type: 'manual',
      source: null,
      event_id: null,
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockFlow: StitchFlow = {
    id: 'flow-123',
    name: 'Test Flow',
    canvas_type: 'workflow',
    parent_id: null,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRequest(body: unknown): NextRequest {
    return {
      json: async () => body,
    } as NextRequest;
  }

  describe('Validation', () => {
    it('should reject invalid runId with 404 (Requirement 9.1)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(null);

      const request = createMockRequest({ status: 'completed', output: {} });
      const response = await POST(request, { params: Promise.resolve({ runId: 'invalid-run', nodeId: mockNodeId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Run not found: invalid-run');
    });

    it('should reject invalid nodeId with 404 (Requirement 9.1)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);

      const request = createMockRequest({ status: 'completed', output: {} });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: 'invalid-node' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Node not found in run: invalid-node');
    });

    it('should reject malformed JSON payload with 400 (Requirement 9.1)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);

      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as NextRequest;

      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in callback payload');
    });

    it('should reject payload with invalid status with 400 (Requirement 9.1)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);

      const request = createMockRequest({ status: 'invalid-status', output: {} });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid status value: "invalid-status". Must be "completed" or "failed"');
    });

    it('should reject payload with missing status with 400 (Requirement 9.1)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);

      const request = createMockRequest({ output: {} });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required field: status');
    });

    it('should reject payload with non-object output for completed status (Requirement 9.3)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);

      const request = createMockRequest({ status: 'completed', output: 'invalid-output' });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Output field must be an object when provided');
    });

    it('should reject payload with non-string error for failed status (Requirement 9.5)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);

      const request = createMockRequest({ status: 'failed', error: 123 });
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Error field must be a string when provided');
    });

    it('should accept payload that is not an object with 400', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);

      const request = createMockRequest('not-an-object');
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Callback payload must be an object');
    });
  });

  describe('Completed Callback', () => {
    it('should update state to completed and store output (Requirements 9.2, 9.3)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: { result: 'success' },
          },
        },
      });
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: { result: 'success' },
          },
        },
      });
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const callback: WorkerCallback = {
        status: 'completed',
        output: { result: 'success' },
      };

      const request = createMockRequest(callback);
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(runs.updateNodeState).toHaveBeenCalledWith(mockRunId, mockNodeId, {
        status: 'completed',
        output: { result: 'success' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should trigger edge-walking after completed callback (Requirement 9.4)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: { result: 'success' },
          },
        },
      });
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: { result: 'success' },
          },
        },
      });
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const callback: WorkerCallback = {
        status: 'completed',
        output: { result: 'success' },
      };

      const request = createMockRequest(callback);
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
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: {},
          },
        },
      });
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: {},
          },
        },
      });
      vi.mocked(edgeWalker.walkEdges).mockResolvedValue(undefined);

      const callback: WorkerCallback = {
        status: 'completed',
        output: {},
      };

      const request = createMockRequest(callback);
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Failed Callback', () => {
    it('should update state to failed and store error (Requirement 9.5)', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'failed',
            error: 'Worker error occurred',
          },
        },
      });

      const callback: WorkerCallback = {
        status: 'failed',
        error: 'Worker error occurred',
      };

      const request = createMockRequest(callback);
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(runs.updateNodeState).toHaveBeenCalledWith(mockRunId, mockNodeId, {
        status: 'failed',
        error: 'Worker error occurred',
      });

      expect(response.status).toBe(200);
    });

    it('should not trigger edge-walking after failed callback', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'failed',
            error: 'Worker error',
          },
        },
      });

      const callback: WorkerCallback = {
        status: 'failed',
        error: 'Worker error',
      };

      const request = createMockRequest(callback);
      await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(edgeWalker.walkEdges).not.toHaveBeenCalled();
    });

    it('should use default error message if error not provided', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'failed',
            error: 'Worker reported failure',
          },
        },
      });

      const callback: WorkerCallback = {
        status: 'failed',
      };

      const request = createMockRequest(callback);
      await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      expect(runs.updateNodeState).toHaveBeenCalledWith(mockRunId, mockNodeId, {
        status: 'failed',
        error: 'Worker reported failure',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing flow gracefully', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValue(mockRun);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: {},
          },
        },
      });
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(null);

      const callback: WorkerCallback = {
        status: 'completed',
        output: {},
      };

      const request = createMockRequest(callback);
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      // Should still return 200 even if flow not found
      expect(response.status).toBe(200);
      // Should not attempt edge-walking
      expect(edgeWalker.walkEdges).not.toHaveBeenCalled();
    });

    it('should handle missing updated run gracefully', async () => {
      vi.mocked(runs.getRunAdmin).mockResolvedValueOnce(mockRun).mockResolvedValueOnce(null);
      vi.mocked(runs.updateNodeState).mockResolvedValue({
        ...mockRun,
        node_states: {
          'worker-1': {
            status: 'completed',
            output: {},
          },
        },
      });
      vi.mocked(flows.getFlowAdmin).mockResolvedValue(mockFlow);

      const callback: WorkerCallback = {
        status: 'completed',
        output: {},
      };

      const request = createMockRequest(callback);
      const response = await POST(request, { params: Promise.resolve({ runId: mockRunId, nodeId: mockNodeId }) });

      // Should still return 200
      expect(response.status).toBe(200);
      // Should not attempt edge-walking
      expect(edgeWalker.walkEdges).not.toHaveBeenCalled();
    });
  });
});
