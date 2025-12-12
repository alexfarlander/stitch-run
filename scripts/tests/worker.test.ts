/**
 * Unit tests for Worker node handler
 * Tests: Requirements 4.1, 4.2, 4.3, 4.5, 9.6
 */

// beforeEach import removed as unused
import { constructCallbackUrl, buildWorkerPayload, fireWorkerNode } from '../worker';
import { NodeConfig } from '@/types/stitch';
import * as config from '@/lib/config';
import * as runs from '@/lib/db/runs';

// Mock the config module
vi.mock('@/lib/config');
vi.mock('@/lib/db/runs');

describe('Worker Node Handler', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock getConfig to return a test base URL
    vi.mocked(config.getConfig).mockReturnValue({
      supabase: {
        url: 'http://localhost:54321',
        anonKey: 'test-anon-key',
        serviceRoleKey: 'test-service-role-key',
      },
      baseUrl: 'https://test.stitch.run',
    });
    
    // Mock updateNodeState to resolve successfully
    vi.mocked(runs.updateNodeState).mockResolvedValue({
      id: 'test-run-id',
      flow_id: 'test-flow-id',
      node_states: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructCallbackUrl', () => {
    it('should construct callback URL with correct pattern using BASE_URL (Requirement 4.3)', () => {
      const runId = '550e8400-e29b-41d4-a716-446655440000';
      const nodeId = 'worker-1';
      
      const callbackUrl = constructCallbackUrl(runId, nodeId);
      
      expect(callbackUrl).toBe('https://test.stitch.run/api/stitch/callback/550e8400-e29b-41d4-a716-446655440000/worker-1');
    });

    it('should use environment variable for base URL', () => {
      const runId = 'run-123';
      const nodeId = 'node-456';
      
      const callbackUrl = constructCallbackUrl(runId, nodeId);
      
      expect(callbackUrl).toContain('https://test.stitch.run');
      expect(config.getConfig).toHaveBeenCalled();
    });
  });

  describe('buildWorkerPayload', () => {
    it('should build payload with all required fields (Requirement 4.2)', () => {
      const runId = '550e8400-e29b-41d4-a716-446655440000';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = {
        webhookUrl: 'https://worker.example.com/webhook',
        model: 'claude-3',
        temperature: 0.7,
      };
      const input = { prompt: 'Hello world' };
      
      const payload = buildWorkerPayload(runId, nodeId, nodeConfig, input);
      
      expect(payload).toEqual({
        runId: '550e8400-e29b-41d4-a716-446655440000',
        nodeId: 'worker-1',
        config: nodeConfig,
        input: { prompt: 'Hello world' },
        callbackUrl: 'https://test.stitch.run/api/stitch/callback/550e8400-e29b-41d4-a716-446655440000/worker-1',
      });
    });

    it('should include config and input in payload', () => {
      const runId = 'run-123';
      const nodeId = 'node-456';
      const nodeConfig: NodeConfig = { webhookUrl: 'https://example.com', customField: 'value' };
      const input = { data: 'test' };
      
      const payload = buildWorkerPayload(runId, nodeId, nodeConfig, input);
      
      expect(payload.config).toEqual(nodeConfig);
      expect(payload.input).toEqual(input);
    });
  });

  describe('fireWorkerNode', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock global fetch
      fetchMock = vi.fn();
      global.fetch = fetchMock as unknown;
    });

    it('should mark node as running before firing webhook (Requirement 9.6)', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = { webhookUrl: 'https://worker.example.com/webhook' };
      const input = { data: 'test' };
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      // Check that updateNodeState was called with 'running' status first
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'running',
      });
    });

    it('should fire webhook with correct payload structure (Requirement 4.1)', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = { 
        webhookUrl: 'https://worker.example.com/webhook',
        customConfig: 'value',
      };
      const input = { prompt: 'test' };
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      expect(fetchMock).toHaveBeenCalledWith(
        'https://worker.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.any(String),
        })
      );
      
      // Verify payload structure
      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      expect(body).toEqual({
        runId: 'run-123',
        nodeId: 'worker-1',
        config: nodeConfig,
        input: { prompt: 'test' },
        callbackUrl: 'https://test.stitch.run/api/stitch/callback/run-123/worker-1',
      });
    });

    it('should handle unreachable webhook URL by marking as failed (Requirement 4.5)', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = { webhookUrl: 'https://unreachable.example.com/webhook' };
      const input = { data: 'test' };
      
      fetchMock.mockRejectedValue(new Error('fetch failed'));
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      // Should mark node as failed
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: expect.stringContaining('unreachable'),
      });
    });

    it('should handle invalid webhook URL by marking as failed (Requirement 4.5)', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = { webhookUrl: 'not-a-valid-url' };
      const input = { data: 'test' };
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      // Should mark node as failed with invalid URL error
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: 'Invalid webhook URL',
      });
      
      // Should not attempt to fetch
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle missing webhook URL by marking as failed', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = {}; // No webhookUrl
      const input = { data: 'test' };
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      // Should mark node as failed
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: 'Worker node missing webhookUrl in configuration',
      });
      
      // Should not attempt to fetch
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle webhook timeout by marking as failed', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = { webhookUrl: 'https://slow.example.com/webhook' };
      const input = { data: 'test' };
      
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      fetchMock.mockRejectedValue(timeoutError);
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      // Should mark node as failed with timeout error
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: 'Worker webhook timeout exceeded',
      });
    });

    it('should handle non-200 response by marking as failed', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = { webhookUrl: 'https://worker.example.com/webhook' };
      const input = { data: 'test' };
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      // Should mark node as failed
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: 'Worker webhook returned 500: Internal Server Error',
      });
    });

    it('should leave node in running state after successful webhook fire', async () => {
      const runId = 'run-123';
      const nodeId = 'worker-1';
      const nodeConfig: NodeConfig = { webhookUrl: 'https://worker.example.com/webhook' };
      const input = { data: 'test' };
      
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      
      await fireWorkerNode(runId, nodeId, nodeConfig, input);
      
      // Should only call updateNodeState once (to set 'running')
      // Node remains in 'running' state until callback is received
      expect(runs.updateNodeState).toHaveBeenCalledTimes(1);
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'running',
      });
    });
  });
});
