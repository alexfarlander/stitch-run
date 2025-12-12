/**
 * Unit tests for UX node handler
 * Tests: Requirements 8.1, 8.2
 */

// beforeEach import removed as unused
import { fireUXNode } from '../ux';
import { NodeConfig } from '@/types/stitch';
import * as runs from '@/lib/db/runs';

// Mock the database module
vi.mock('@/lib/db/runs');

describe('UX Node Handler', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
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

  describe('fireUXNode', () => {
    it('should mark UX node as waiting_for_user when fired (Requirement 8.1)', async () => {
      const runId = 'run-123';
      const nodeId = 'ux-1';
      const config: NodeConfig = { 
        prompt: 'Please provide your input',
        label: 'User Input Gate',
      };
      const input = { data: 'upstream data' };
      
      await fireUXNode(runId, nodeId, config, input);
      
      // Verify node state was updated to 'waiting_for_user'
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'waiting_for_user',
        output: input,
      });
    });

    it('should store input as output for later access', async () => {
      const runId = 'run-456';
      const nodeId = 'ux-gate-1';
      const config: NodeConfig = { prompt: 'Enter value' };
      const input = { 
        previousResult: 'some data',
        context: { user: 'test-user' },
      };
      
      await fireUXNode(runId, nodeId, config, input);
      
      // Verify input is stored in output field
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'waiting_for_user',
        output: input,
      });
    });

    it('should handle empty input', async () => {
      const runId = 'run-789';
      const nodeId = 'ux-2';
      const config: NodeConfig = {};
      const input = {};
      
      await fireUXNode(runId, nodeId, config, input);
      
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'waiting_for_user',
        output: {},
      });
    });

    it('should handle null input', async () => {
      const runId = 'run-abc';
      const nodeId = 'ux-3';
      const config: NodeConfig = { prompt: 'Start here' };
      const input = null;
      
      await fireUXNode(runId, nodeId, config, input);
      
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'waiting_for_user',
        output: null,
      });
    });

    it('should propagate database errors', async () => {
      const runId = 'run-error';
      const nodeId = 'ux-error';
      const config: NodeConfig = {};
      const input = { data: 'test' };
      
      // Mock updateNodeState to throw an error
      vi.mocked(runs.updateNodeState).mockRejectedValue(
        new Error('Database connection failed')
      );
      
      await expect(fireUXNode(runId, nodeId, config, input)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('UX node prevents downstream execution (Requirement 8.2)', () => {
    it('should only update state to waiting_for_user without triggering edge-walking', async () => {
      const runId = 'run-123';
      const nodeId = 'ux-1';
      const config: NodeConfig = { prompt: 'Wait for user' };
      const input = { data: 'test' };
      
      await fireUXNode(runId, nodeId, config, input);
      
      // Verify only updateNodeState was called (no edge-walking logic)
      expect(runs.updateNodeState).toHaveBeenCalledTimes(1);
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'waiting_for_user',
        output: input,
      });
      
      // The function should complete without triggering any downstream execution
      // Edge-walking will only occur when the UX complete endpoint is called
    });
  });
});
