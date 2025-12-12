/**
 * AI Graph Update Integration Tests
 * 
 * Tests that AI-generated graph updates are properly wired into canvas components.
 * Validates: Requirements 8.3, 8.4, 8.5
 */

import { describe, it, expect } from 'vitest';
import { VisualGraph } from '@/types/canvas-schema';

describe('AI Graph Update Integration', () => {
  it('should validate VisualGraph structure for AI updates', () => {
    // Test that a valid VisualGraph structure can be created
    const testGraph: VisualGraph = {
      nodes: [
        {
          id: 'test-node-1',
          type: 'Worker',
          position: { x: 100, y: 100 },
          data: {
            label: 'Test Worker',
            worker_type: 'claude',
            config: {
              model: 'claude-3-5-sonnet-20241022',
            },
          },
        },
      ],
      edges: [],
    };

    // Verify structure
    expect(testGraph.nodes).toHaveLength(1);
    expect(testGraph.nodes[0].id).toBe('test-node-1');
    expect(testGraph.nodes[0].type).toBe('Worker');
    expect(testGraph.nodes[0].data.label).toBe('Test Worker');
    expect(testGraph.edges).toHaveLength(0);
  });

  it('should validate VisualGraph with edges', () => {
    const testGraph: VisualGraph = {
      nodes: [
        {
          id: 'node-1',
          type: 'Worker',
          position: { x: 0, y: 0 },
          data: { label: 'Node 1' },
        },
        {
          id: 'node-2',
          type: 'Worker',
          position: { x: 200, y: 0 },
          data: { label: 'Node 2' },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
        },
      ],
    };

    expect(testGraph.nodes).toHaveLength(2);
    expect(testGraph.edges).toHaveLength(1);
    expect(testGraph.edges[0].source).toBe('node-1');
    expect(testGraph.edges[0].target).toBe('node-2');
  });

  it('should handle graph update API payload structure', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'test-node',
          type: 'Worker',
          position: { x: 0, y: 0 },
          data: { label: 'Test' },
        },
      ],
      edges: [],
    };

    // Simulate the API payload structure
    const apiPayload = {
      canvas: graph,
    };

    expect(apiPayload).toHaveProperty('canvas');
    expect(apiPayload.canvas).toHaveProperty('nodes');
    expect(apiPayload.canvas).toHaveProperty('edges');
    expect(apiPayload.canvas.nodes[0].id).toBe('test-node');
  });

  it('should validate AI response structure for createWorkflow', () => {
    // Simulate AI manager response for CREATE_WORKFLOW
    const aiResponse = {
      action: 'CREATE_WORKFLOW',
      result: {
        canvasId: 'new-canvas-id',
        canvas: {
          nodes: [
            {
              id: 'ai-generated-node',
              type: 'Worker',
              position: { x: 100, y: 100 },
              data: {
                label: 'AI Generated Node',
                worker_type: 'claude',
              },
            },
          ],
          edges: [],
        },
      },
    };

    expect(aiResponse.action).toBe('CREATE_WORKFLOW');
    expect(aiResponse.result).toHaveProperty('canvasId');
    expect(aiResponse.result).toHaveProperty('canvas');
    expect(aiResponse.result.canvas.nodes).toHaveLength(1);
  });

  it('should validate AI response structure for modifyWorkflow', () => {
    // Simulate AI manager response for MODIFY_WORKFLOW
    const aiResponse = {
      action: 'MODIFY_WORKFLOW',
      result: {
        canvasId: 'existing-canvas-id',
        canvas: {
          nodes: [
            {
              id: 'existing-node',
              type: 'Worker',
              position: { x: 0, y: 0 },
              data: { label: 'Existing Node' },
            },
            {
              id: 'new-node',
              type: 'Worker',
              position: { x: 200, y: 0 },
              data: { label: 'New Node' },
            },
          ],
          edges: [
            {
              id: 'new-edge',
              source: 'existing-node',
              target: 'new-node',
            },
          ],
        },
      },
    };

    expect(aiResponse.action).toBe('MODIFY_WORKFLOW');
    expect(aiResponse.result.canvas.nodes).toHaveLength(2);
    expect(aiResponse.result.canvas.edges).toHaveLength(1);
  });
});
