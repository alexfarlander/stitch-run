/**
 * Unit tests for Splitter node handler
 * Tests: Requirements 6.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireSplitterNode, extractArray } from '../splitter';
import { NodeConfig } from '@/types/stitch';
import * as runs from '@/lib/db/runs';

// Mock the database module
vi.mock('@/lib/db/runs');

describe('Splitter Node Handler', () => {
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
    
    // Mock updateNodeStates to resolve successfully
    vi.mocked(runs.updateNodeStates).mockResolvedValue({
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

  describe('extractArray', () => {
    it('should extract array from simple path', () => {
      const input = { items: [1, 2, 3] };
      const result = extractArray(input, 'items');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should extract array from nested path', () => {
      const input = { data: { results: ['a', 'b', 'c'] } };
      const result = extractArray(input, 'data.results');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should throw error if path does not exist', () => {
      const input = { items: [1, 2, 3] };
      expect(() => extractArray(input, 'nonexistent')).toThrow('Value at path is not an array');
    });

    it('should throw error if value is not an array', () => {
      const input = { items: 'not an array' };
      expect(() => extractArray(input, 'items')).toThrow('Value at path is not an array');
    });

    it('should throw error if arrayPath is empty', () => {
      const input = { items: [1, 2, 3] };
      expect(() => extractArray(input, '')).toThrow('Array path not configured');
    });
  });

  describe('fireSplitterNode - empty array edge case', () => {
    it('should mark splitter as completed and fire collectors when array is empty (Requirement 6.6)', async () => {
      const runId = 'run-123';
      const nodeId = 'splitter-1';
      const nodeConfig: NodeConfig = { arrayPath: 'items' };
      const input = { items: [] }; // Empty array
      const downstreamNodeIds = ['worker-1', 'worker-2'];
      
      await fireSplitterNode(runId, nodeId, nodeConfig, input, downstreamNodeIds);
      
      // Should mark splitter as completed with empty array
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'completed',
        output: [],
      });
      
      // Should NOT create parallel path states (no calls to updateNodeStates)
      expect(runs.updateNodeStates).not.toHaveBeenCalled();
    });

    it('should handle empty array at nested path', async () => {
      const runId = 'run-123';
      const nodeId = 'splitter-1';
      const nodeConfig: NodeConfig = { arrayPath: 'data.results' };
      const input = { data: { results: [] } }; // Empty array at nested path
      const downstreamNodeIds = ['worker-1'];
      
      await fireSplitterNode(runId, nodeId, nodeConfig, input, downstreamNodeIds);
      
      // Should mark splitter as completed with empty array
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'completed',
        output: [],
      });
    });
  });

  describe('fireSplitterNode - normal operation', () => {
    it('should create parallel paths for non-empty array', async () => {
      const runId = 'run-123';
      const nodeId = 'splitter-1';
      const nodeConfig: NodeConfig = { arrayPath: 'items' };
      const input = { items: ['A', 'B', 'C'] };
      const downstreamNodeIds = ['worker-1'];
      
      await fireSplitterNode(runId, nodeId, nodeConfig, input, downstreamNodeIds);
      
      // Should create parallel path states
      expect(runs.updateNodeStates).toHaveBeenCalledWith(runId, {
        'worker-1_0': { status: 'pending', output: 'A' },
        'worker-1_1': { status: 'pending', output: 'B' },
        'worker-1_2': { status: 'pending', output: 'C' },
        [nodeId]: { status: 'completed', output: ['A', 'B', 'C'] },
      });
    });

    it('should create parallel paths for multiple downstream nodes', async () => {
      const runId = 'run-123';
      const nodeId = 'splitter-1';
      const nodeConfig: NodeConfig = { arrayPath: 'items' };
      const input = { items: [1, 2] };
      const downstreamNodeIds = ['worker-1', 'worker-2'];
      
      await fireSplitterNode(runId, nodeId, nodeConfig, input, downstreamNodeIds);
      
      // Should create parallel paths for both downstream nodes
      expect(runs.updateNodeStates).toHaveBeenCalledWith(runId, {
        'worker-1_0': { status: 'pending', output: 1 },
        'worker-1_1': { status: 'pending', output: 2 },
        'worker-2_0': { status: 'pending', output: 1 },
        'worker-2_1': { status: 'pending', output: 2 },
        [nodeId]: { status: 'completed', output: [1, 2] },
      });
    });

    it('should handle missing arrayPath configuration', async () => {
      const runId = 'run-123';
      const nodeId = 'splitter-1';
      const nodeConfig: NodeConfig = {}; // No arrayPath
      const input = { items: [1, 2, 3] };
      const downstreamNodeIds = ['worker-1'];
      
      await fireSplitterNode(runId, nodeId, nodeConfig, input, downstreamNodeIds);
      
      // Should mark node as failed
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: 'Splitter node missing arrayPath in configuration',
      });
    });

    it('should handle array extraction errors', async () => {
      const runId = 'run-123';
      const nodeId = 'splitter-1';
      const nodeConfig: NodeConfig = { arrayPath: 'nonexistent' };
      const input = { items: [1, 2, 3] };
      const downstreamNodeIds = ['worker-1'];
      
      await fireSplitterNode(runId, nodeId, nodeConfig, input, downstreamNodeIds);
      
      // Should mark node as failed with extraction error
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: 'Value at path is not an array',
      });
    });

    it('should handle non-array values at path', async () => {
      const runId = 'run-123';
      const nodeId = 'splitter-1';
      const nodeConfig: NodeConfig = { arrayPath: 'items' };
      const input = { items: 'not an array' };
      const downstreamNodeIds = ['worker-1'];
      
      await fireSplitterNode(runId, nodeId, nodeConfig, input, downstreamNodeIds);
      
      // Should mark node as failed
      expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, {
        status: 'failed',
        error: 'Value at path is not an array',
      });
    });
  });
});
