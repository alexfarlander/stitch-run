/**
 * Test for system edge compilation in ExecutionGraph
 * Verifies that system edges are correctly handled during OEG compilation
 */

import { describe, it, expect } from 'vitest';
import { compileToOEG } from '../compile-oeg';
import { VisualGraph } from '@/types/canvas-schema';

describe('compile-system-edges', () => {
  it('should include system edges in outboundEdges but NOT in adjacency', () => {
    const visualGraph: VisualGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Node 1',
            worker_type: 'claude',
            config: {},
          },
        },
        {
          id: 'node2',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: {
            label: 'Node 2',
            worker_type: 'claude',
            config: {},
          },
        },
        {
          id: 'node3',
          type: 'worker',
          position: { x: 400, y: 0 },
          data: {
            label: 'Node 3',
            worker_type: 'claude',
            config: {},
          },
        },
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: 'journey', // Logical dependency
        },
        {
          id: 'edge2',
          source: 'node1',
          target: 'node3',
          type: 'system', // Background task, NOT a logical dependency
        },
      ],
    };

    const result = compileToOEG(visualGraph);

    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();

    const graph = result.executionGraph!;

    // Check outboundEdges contains BOTH edges
    expect(graph.outboundEdges['node1']).toHaveLength(2);
    expect(graph.outboundEdges['node1']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'edge1',
          target: 'node2',
          type: 'journey',
        }),
        expect.objectContaining({
          id: 'edge2',
          target: 'node3',
          type: 'system',
        }),
      ])
    );

    // Check adjacency contains ONLY the journey edge (logical dependency)
    expect(graph.adjacency['node1']).toHaveLength(1);
    expect(graph.adjacency['node1']).toEqual(['node2']);
    expect(graph.adjacency['node1']).not.toContain('node3');
  });

  it('should treat edges without type as journey edges', () => {
    const visualGraph: VisualGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Node 1',
            worker_type: 'claude',
            config: {},
          },
        },
        {
          id: 'node2',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: {
            label: 'Node 2',
            worker_type: 'claude',
            config: {},
          },
        },
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          // No type specified - should default to journey
        },
      ],
    };

    const result = compileToOEG(visualGraph);

    expect(result.success).toBe(true);
    const graph = result.executionGraph!;

    // Edge without type should be treated as journey
    expect(graph.outboundEdges['node1']).toHaveLength(1);
    expect(graph.outboundEdges['node1'][0].type).toBe('journey');

    // Should appear in adjacency (logical dependency)
    expect(graph.adjacency['node1']).toEqual(['node2']);
  });

  it('should handle multiple system edges from same node', () => {
    const visualGraph: VisualGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Node 1',
            worker_type: 'claude',
            config: {},
          },
        },
        {
          id: 'node2',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: {
            label: 'Node 2',
            worker_type: 'claude',
            config: {},
          },
        },
        {
          id: 'node3',
          type: 'worker',
          position: { x: 200, y: 100 },
          data: {
            label: 'Node 3',
            worker_type: 'claude',
            config: {},
          },
        },
        {
          id: 'node4',
          type: 'worker',
          position: { x: 200, y: 200 },
          data: {
            label: 'Node 4',
            worker_type: 'claude',
            config: {},
          },
        },
      ],
      edges: [
        {
          id: 'system1',
          source: 'node1',
          target: 'node2',
          type: 'system',
        },
        {
          id: 'system2',
          source: 'node1',
          target: 'node3',
          type: 'system',
        },
        {
          id: 'system3',
          source: 'node1',
          target: 'node4',
          type: 'system',
        },
      ],
    };

    const result = compileToOEG(visualGraph);

    expect(result.success).toBe(true);
    const graph = result.executionGraph!;

    // All 3 system edges should be in outboundEdges
    expect(graph.outboundEdges['node1']).toHaveLength(3);

    // None should be in adjacency (no logical dependencies)
    expect(graph.adjacency['node1']).toHaveLength(0);
  });

  it('should preserve edge data in outboundEdges', () => {
    const visualGraph: VisualGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Node 1',
            worker_type: 'claude',
            config: {},
          },
        },
        {
          id: 'node2',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: {
            label: 'Node 2',
            worker_type: 'claude',
            config: {},
          },
        },
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: 'system',
          data: {
            label: 'CRM Sync',
            mapping: {
              customer_name: 'output.name',
            },
          },
        },
      ],
    };

    const result = compileToOEG(visualGraph);

    expect(result.success).toBe(true);
    const graph = result.executionGraph!;

    // Edge data should be preserved in outboundEdges
    expect(graph.outboundEdges['node1'][0].data).toEqual({
      label: 'CRM Sync',
      mapping: {
        customer_name: 'output.name',
      },
    });
  });

  it('should compute correct entry nodes when system edges exist', () => {
    const visualGraph: VisualGraph = {
      nodes: [
        {
          id: 'entry',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: 'Entry', worker_type: 'claude', config: {} },
        },
        {
          id: 'main',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { label: 'Main', worker_type: 'claude', config: {} },
        },
        {
          id: 'system',
          type: 'worker',
          position: { x: 200, y: 100 },
          data: { label: 'System', worker_type: 'claude', config: {} },
        },
      ],
      edges: [
        {
          id: 'journey1',
          source: 'entry',
          target: 'main',
          type: 'journey',
        },
        {
          id: 'system1',
          source: 'entry',
          target: 'system',
          type: 'system',
        },
      ],
    };

    const result = compileToOEG(visualGraph);

    expect(result.success).toBe(true);
    const graph = result.executionGraph!;

    // Only 'entry' has no incoming edges
    expect(graph.entryNodes).toEqual(['entry']);

    // Both 'main' and 'system' have incoming edges (journey and system count equally for entry/terminal computation)
    expect(graph.entryNodes).not.toContain('main');
    expect(graph.entryNodes).not.toContain('system');
  });
});
