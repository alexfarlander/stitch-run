/**
 * Unit tests for OEG compilation
 * 
 * Tests the compilation of visual graphs to optimized execution graphs
 */

import { describe, it, expect } from 'vitest';
import { compileToOEG } from '../compile-oeg';
import { VisualGraph } from '@/types/canvas-schema';

describe('OEG Compilation', () => {
  
  it('should compile a simple linear graph', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'start',
          type: 'ux',
          position: { x: 0, y: 0 },
          data: { label: 'Start' },
        },
        {
          id: 'process',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { 
            label: 'Process',
            worker_type: 'claude',
          },
        },
        {
          id: 'end',
          type: 'ux',
          position: { x: 400, y: 0 },
          data: { label: 'End' },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'start',
          target: 'process',
        },
        {
          id: 'e2',
          source: 'process',
          target: 'end',
        },
      ],
    };

    const result = compileToOEG(graph);

    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();

    const { executionGraph } = result;
    if (!executionGraph) return;

    // Check nodes are indexed
    expect(executionGraph.nodes).toHaveProperty('start');
    expect(executionGraph.nodes).toHaveProperty('process');
    expect(executionGraph.nodes).toHaveProperty('end');

    // Check UI properties are stripped
    expect(executionGraph.nodes.start).not.toHaveProperty('position');
    expect(executionGraph.nodes.start).not.toHaveProperty('style');

    // Check adjacency map
    expect(executionGraph.adjacency.start).toEqual(['process']);
    expect(executionGraph.adjacency.process).toEqual(['end']);
    expect(executionGraph.adjacency.end).toEqual([]);

    // Check entry and terminal nodes
    expect(executionGraph.entryNodes).toEqual(['start']);
    expect(executionGraph.terminalNodes).toEqual(['end']);
  });

  it('should compile a graph with multiple paths (splitter)', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'start',
          type: 'ux',
          position: { x: 0, y: 0 },
          data: { label: 'Start' },
        },
        {
          id: 'split',
          type: 'splitter',
          position: { x: 200, y: 0 },
          data: { label: 'Split' },
        },
        {
          id: 'path1',
          type: 'worker',
          position: { x: 400, y: -50 },
          data: { 
            label: 'Path 1',
            worker_type: 'claude',
          },
        },
        {
          id: 'path2',
          type: 'worker',
          position: { x: 400, y: 50 },
          data: { 
            label: 'Path 2',
            worker_type: 'minimax',
          },
        },
        {
          id: 'collector',
          type: 'collector',
          position: { x: 600, y: 0 },
          data: { label: 'Collector' },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'start',
          target: 'split',
        },
        {
          id: 'e2',
          source: 'split',
          target: 'path1',
        },
        {
          id: 'e3',
          source: 'split',
          target: 'path2',
        },
        {
          id: 'e4',
          source: 'path1',
          target: 'collector',
        },
        {
          id: 'e5',
          source: 'path2',
          target: 'collector',
        },
      ],
    };

    const result = compileToOEG(graph);

    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();

    const { executionGraph } = result;
    if (!executionGraph) return;

    // Check adjacency map for splitter
    expect(executionGraph.adjacency.split).toContain('path1');
    expect(executionGraph.adjacency.split).toContain('path2');
    expect(executionGraph.adjacency.split.length).toBe(2);

    // Check entry and terminal nodes
    expect(executionGraph.entryNodes).toEqual(['start']);
    expect(executionGraph.terminalNodes).toEqual(['collector']);
  });

  it('should index edge data by source->target', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'a',
          type: 'ux',
          position: { x: 0, y: 0 },
          data: { label: 'A' },
        },
        {
          id: 'b',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { 
            label: 'B',
            worker_type: 'claude',
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'b',
          data: {
            mapping: {
              prompt: 'output.text',
              topic: 'metadata.subject',
            },
          },
        },
      ],
    };

    const result = compileToOEG(graph);

    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();

    const { executionGraph } = result;
    if (!executionGraph) return;

    // Check edge data is indexed
    expect(executionGraph.edgeData).toHaveProperty('a->b');
    expect(executionGraph.edgeData['a->b']).toEqual({
      prompt: 'output.text',
      topic: 'metadata.subject',
    });
  });

  it('should reject graphs with cycles', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'a',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { 
            label: 'A',
            worker_type: 'claude',
          },
        },
        {
          id: 'b',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { 
            label: 'B',
            worker_type: 'claude',
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          target: 'b',
        },
        {
          id: 'e2',
          source: 'b',
          target: 'a',
        },
      ],
    };

    const result = compileToOEG(graph);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0].type).toBe('cycle');
  });

  it('should preserve node IDs exactly (no sanitization)', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'my-node-123',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { 
            label: 'My Node',
            worker_type: 'claude',
          },
        },
        {
          id: 'another_node_456',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { 
            label: 'Another Node',
            worker_type: 'minimax',
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'my-node-123',
          target: 'another_node_456',
        },
      ],
    };

    const result = compileToOEG(graph);

    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();

    const { executionGraph } = result;
    if (!executionGraph) return;

    // Node IDs should be preserved exactly
    expect(executionGraph.nodes).toHaveProperty('my-node-123');
    expect(executionGraph.nodes).toHaveProperty('another_node_456');
    expect(executionGraph.nodes['my-node-123'].id).toBe('my-node-123');
    expect(executionGraph.nodes['another_node_456'].id).toBe('another_node_456');
  });

  it('should handle special property names like __proto__', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: '__proto__',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { 
            label: 'Proto Node',
            worker_type: 'claude',
          },
        },
        {
          id: 'constructor',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { 
            label: 'Constructor Node',
            worker_type: 'minimax',
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: '__proto__',
          target: 'constructor',
        },
      ],
    };

    const result = compileToOEG(graph);

    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();

    const { executionGraph } = result;
    if (!executionGraph) return;

    // Should handle special property names correctly
    expect(executionGraph.nodes).toHaveProperty('__proto__');
    expect(executionGraph.nodes).toHaveProperty('constructor');
    expect(executionGraph.adjacency).toHaveProperty('__proto__');
    expect(executionGraph.adjacency['__proto__']).toEqual(['constructor']);
  });
});
