/**
 * Worker Validation Integration Test
 * 
 * Tests that the validation system correctly uses the worker registry
 * to validate worker types in visual graphs.
 */

import { describe, it, expect } from 'vitest';
import { validateGraph } from '../validate-graph';
import { VisualGraph } from '@/types/canvas-schema';

describe('Worker Validation Integration', () => {
  it('should accept valid worker types from registry', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Claude',
            worker_type: 'claude',
            config: {},
            inputs: {},
            outputs: {}
          }
        },
        {
          id: 'node2',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: {
            label: 'MiniMax',
            worker_type: 'minimax',
            config: {},
            inputs: {},
            outputs: {}
          }
        }
      ],
      edges: []
    };

    const errors = validateGraph(graph);
    const workerErrors = errors.filter(e => e.type === 'invalid_worker');
    expect(workerErrors).toHaveLength(0);
  });

  it('should reject invalid worker types', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Invalid Worker',
            worker_type: 'invalid-worker-type',
            config: {},
            inputs: {},
            outputs: {}
          }
        }
      ],
      edges: []
    };

    const errors = validateGraph(graph);
    const workerErrors = errors.filter(e => e.type === 'invalid_worker');
    expect(workerErrors.length).toBeGreaterThan(0);
    expect(workerErrors[0].message).toContain('invalid-worker-type');
    expect(workerErrors[0].message).toContain('Valid types:');
  });

  it('should list available worker types in error message', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Invalid Worker',
            worker_type: 'nonexistent',
            config: {},
            inputs: {},
            outputs: {}
          }
        }
      ],
      edges: []
    };

    const errors = validateGraph(graph);
    const workerErrors = errors.filter(e => e.type === 'invalid_worker');
    expect(workerErrors.length).toBeGreaterThan(0);
    
    const errorMessage = workerErrors[0].message;
    expect(errorMessage).toContain('claude');
    expect(errorMessage).toContain('minimax');
    expect(errorMessage).toContain('elevenlabs');
    expect(errorMessage).toContain('shotstack');
  });

  it('should accept all worker types defined in registry', () => {
    const workerTypes = ['claude', 'minimax', 'elevenlabs', 'shotstack'];
    
    for (const workerType of workerTypes) {
      const graph: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: workerType,
              worker_type: workerType,
              config: {},
              inputs: {},
              outputs: {}
            }
          }
        ],
        edges: []
      };

      const errors = validateGraph(graph);
      const workerErrors = errors.filter(e => e.type === 'invalid_worker');
      expect(workerErrors).toHaveLength(0);
    }
  });
});
