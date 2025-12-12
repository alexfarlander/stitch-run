/**
 * Worker Integration Tests
 * Tests the integration between fireWorkerNode and the Worker Registry
 * Validates: Requirements 1.1, 1.2, 6.1
 */

// beforeEach import removed as unused
import { fireWorkerNode } from '../worker';
import { workerRegistry } from '@/lib/workers';
import { IWorker } from '@/lib/workers/base';
import { NodeConfig } from '@/types/stitch';
import * as runsDb from '@/lib/db/runs';

// Mock the database
vi.mock('@/lib/db/runs', () => ({
  updateNodeState: vi.fn(),
}));

// Mock fetch for webhook tests
global.fetch = vi.fn();

describe('Worker Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use integrated worker when workerType is set and registered', async () => {
    // Create a mock worker
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    class MockWorker implements IWorker {
      execute = mockExecute;
    }

    // Register the mock worker
    workerRegistry.register('test-worker', MockWorker);

    const config: NodeConfig = {
      workerType: 'test-worker',
      someConfig: 'value',
    };

    const input = { data: 'test' };

    await fireWorkerNode('run-123', 'node-456', config, input);

    // Verify node was marked as running
    expect(runsDb.updateNodeState).toHaveBeenCalledWith('run-123', 'node-456', {
      status: 'running',
    });

    // Verify worker.execute was called with correct parameters
    expect(mockExecute).toHaveBeenCalledWith('run-123', 'node-456', config, input);

    // Verify fetch was NOT called (no webhook)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fall back to webhook when workerType is not set', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    global.fetch = mockFetch;

    const config: NodeConfig = {
      webhookUrl: 'https://example.com/webhook',
    };

    const input = { data: 'test' };

    await fireWorkerNode('run-123', 'node-456', config, input);

    // Verify node was marked as running
    expect(runsDb.updateNodeState).toHaveBeenCalledWith('run-123', 'node-456', {
      status: 'running',
    });

    // Verify fetch was called with webhook URL
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('should fall back to webhook when workerType is not registered', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    global.fetch = mockFetch;

    const config: NodeConfig = {
      workerType: 'unregistered-worker',
      webhookUrl: 'https://example.com/webhook',
    };

    const input = { data: 'test' };

    await fireWorkerNode('run-123', 'node-456', config, input);

    // Verify node was marked as running
    expect(runsDb.updateNodeState).toHaveBeenCalledWith('run-123', 'node-456', {
      status: 'running',
    });

    // Verify fetch was called with webhook URL (fallback)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should handle worker execution errors gracefully', async () => {
    // Create a mock worker that throws an error
    class FailingWorker implements IWorker {
      async execute() {
        throw new Error('Worker execution failed');
      }
    }

    // Register the failing worker
    workerRegistry.register('failing-worker', FailingWorker);

    const config: NodeConfig = {
      workerType: 'failing-worker',
    };

    const input = { data: 'test' };

    await fireWorkerNode('run-123', 'node-456', config, input);

    // Verify node was marked as running first
    expect(runsDb.updateNodeState).toHaveBeenCalledWith('run-123', 'node-456', {
      status: 'running',
    });

    // Verify node was marked as failed with error message
    expect(runsDb.updateNodeState).toHaveBeenCalledWith('run-123', 'node-456', {
      status: 'failed',
      error: 'Worker execution failed',
    });
  });

  it('should verify all workers are registered in the registry', () => {
    // Verify that all expected workers are registered
    expect(workerRegistry.hasWorker('claude')).toBe(true);
    expect(workerRegistry.hasWorker('minimax')).toBe(true);
    expect(workerRegistry.hasWorker('elevenlabs')).toBe(true);
    expect(workerRegistry.hasWorker('shotstack')).toBe(true);
  });

  it('should attempt to instantiate workers from registry', () => {
    // Workers require environment variables, so they may throw during instantiation
    // The important thing is that they're registered and the registry can attempt to create them
    
    // Try to get Claude worker - will succeed if API key is set, throw otherwise
    try {
      const claudeWorker = workerRegistry.getWorker('claude');
      expect(claudeWorker).toBeDefined();
      expect(typeof claudeWorker.execute).toBe('function');
    } catch (error) {
      // If it throws, it should be about missing API key
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('ANTHROPIC_API_KEY');
    }

    // Try to get MiniMax worker
    try {
      const minimaxWorker = workerRegistry.getWorker('minimax');
      expect(minimaxWorker).toBeDefined();
      expect(typeof minimaxWorker.execute).toBe('function');
    } catch (error) {
      // If it throws, it should be about missing credentials
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/MINIMAX/);
    }

    // Try to get ElevenLabs worker
    try {
      const elevenlabsWorker = workerRegistry.getWorker('elevenlabs');
      expect(elevenlabsWorker).toBeDefined();
      expect(typeof elevenlabsWorker.execute).toBe('function');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('ELEVENLABS_API_KEY');
    }

    // Try to get Shotstack worker
    try {
      const shotstackWorker = workerRegistry.getWorker('shotstack');
      expect(shotstackWorker).toBeDefined();
      expect(typeof shotstackWorker.execute).toBe('function');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('SHOTSTACK_API_KEY');
    }
  });
});
