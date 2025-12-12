/**
 * Unit tests for AI Manager Context Builder
 * 
 * Tests the context builder functions that:
 * - Strip UI properties from canvas nodes and edges
 * - Load worker definitions from registry
 * - Build structured context for LLM requests
 * 
 * Requirements: 5.6, 7.1
 */

import { describe, it, expect } from 'vitest';
import {
  stripNodeUIProperties,
  stripEdgeUIProperties,
  stripCanvasUIProperties,
  loadWorkerDefinitions,
  buildAIManagerContext,
  formatContextAsJSON,
} from '../context-builder';
import { VisualNode, VisualEdge, VisualGraph } from '@/types/canvas-schema';

describe('Context Builder', () => {
  describe('stripNodeUIProperties', () => {
    it('should strip position from node', () => {
      const node: VisualNode = {
        id: 'node1',
        type: 'worker',
        position: { x: 100, y: 200 },
        data: {
          label: 'Test Node',
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped).not.toHaveProperty('position');
      expect(stripped.id).toBe('node1');
      expect(stripped.type).toBe('worker');
    });

    it('should strip style from node', () => {
      const node: VisualNode = {
        id: 'node1',
        type: 'worker',
        position: { x: 0, y: 0 },
        style: { backgroundColor: 'red', border: '1px solid black' },
        data: {
          label: 'Test Node',
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped).not.toHaveProperty('style');
    });

    it('should strip width and height from node', () => {
      const node: VisualNode = {
        id: 'section1',
        type: 'section',
        position: { x: 0, y: 0 },
        width: 400,
        height: 300,
        data: {
          label: 'Section',
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped).not.toHaveProperty('width');
      expect(stripped).not.toHaveProperty('height');
    });

    it('should strip parentNode and extent from node', () => {
      const node: VisualNode = {
        id: 'item1',
        type: 'item',
        position: { x: 10, y: 10 },
        parentNode: 'section1',
        extent: 'parent',
        data: {
          label: 'Item',
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped).not.toHaveProperty('parentNode');
      expect(stripped).not.toHaveProperty('extent');
    });

    it('should preserve worker_type', () => {
      const node: VisualNode = {
        id: 'worker1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: {
          label: 'Claude Worker',
          worker_type: 'claude',
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped.worker_type).toBe('claude');
    });

    it('should preserve config', () => {
      const node: VisualNode = {
        id: 'worker1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: {
          label: 'Worker',
          worker_type: 'claude',
          config: {
            model: 'claude-sonnet-4-20250514',
            maxTokens: 4096,
          },
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped.config).toEqual({
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
      });
    });

    it('should preserve inputs schema', () => {
      const node: VisualNode = {
        id: 'worker1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: {
          label: 'Worker',
          inputs: {
            prompt: { type: 'string', required: true },
          },
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped.inputs).toEqual({
        prompt: { type: 'string', required: true },
      });
    });

    it('should preserve outputs schema', () => {
      const node: VisualNode = {
        id: 'worker1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: {
          label: 'Worker',
          outputs: {
            result: { type: 'string' },
          },
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped.outputs).toEqual({
        result: { type: 'string' },
      });
    });

    it('should preserve entityMovement', () => {
      const node: VisualNode = {
        id: 'worker1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: {
          label: 'Worker',
          entityMovement: {
            onSuccess: {
              targetSectionId: 'section2',
              completeAs: 'success',
            },
          },
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped.entityMovement).toEqual({
        onSuccess: {
          targetSectionId: 'section2',
          completeAs: 'success',
        },
      });
    });

    it('should not include label in stripped node', () => {
      const node: VisualNode = {
        id: 'node1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: {
          label: 'This is a UI label',
        },
      };

      const stripped = stripNodeUIProperties(node);

      expect(stripped).not.toHaveProperty('label');
    });
  });

  describe('stripEdgeUIProperties', () => {
    it('should strip sourceHandle and targetHandle from edge', () => {
      const edge: VisualEdge = {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        sourceHandle: 'output1',
        targetHandle: 'input1',
      };

      const stripped = stripEdgeUIProperties(edge);

      expect(stripped).not.toHaveProperty('sourceHandle');
      expect(stripped).not.toHaveProperty('targetHandle');
      expect(stripped.source).toBe('node1');
      expect(stripped.target).toBe('node2');
    });

    it('should strip type and animated from edge', () => {
      const edge: VisualEdge = {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        type: 'journey',
        animated: true,
      };

      const stripped = stripEdgeUIProperties(edge);

      expect(stripped).not.toHaveProperty('type');
      expect(stripped).not.toHaveProperty('animated');
    });

    it('should strip style from edge', () => {
      const edge: VisualEdge = {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        style: { stroke: 'blue', strokeWidth: 2 },
      };

      const stripped = stripEdgeUIProperties(edge);

      expect(stripped).not.toHaveProperty('style');
    });

    it('should preserve mapping', () => {
      const edge: VisualEdge = {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        data: {
          mapping: {
            prompt: 'output.text',
            context: 'result.data',
          },
        },
      };

      const stripped = stripEdgeUIProperties(edge);

      expect(stripped.mapping).toEqual({
        prompt: 'output.text',
        context: 'result.data',
      });
    });

    it('should handle edge without mapping', () => {
      const edge: VisualEdge = {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
      };

      const stripped = stripEdgeUIProperties(edge);

      expect(stripped).not.toHaveProperty('mapping');
      expect(stripped.source).toBe('node1');
      expect(stripped.target).toBe('node2');
    });
  });

  describe('stripCanvasUIProperties', () => {
    it('should strip UI properties from all nodes and edges', () => {
      const canvas: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 100, y: 100 },
            style: { backgroundColor: 'red' },
            data: {
              label: 'Worker 1',
              worker_type: 'claude',
            },
          },
          {
            id: 'node2',
            type: 'worker',
            position: { x: 300, y: 100 },
            width: 200,
            height: 150,
            data: {
              label: 'Worker 2',
              worker_type: 'minimax',
            },
          },
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            animated: true,
            data: {
              mapping: {
                visual_prompt: 'output.scenes[0].visual_prompt',
              },
            },
          },
        ],
      };

      const stripped = stripCanvasUIProperties(canvas);

      // Check nodes are stripped
      expect(stripped.nodes).toHaveLength(2);
      expect(stripped.nodes[0]).not.toHaveProperty('position');
      expect(stripped.nodes[0]).not.toHaveProperty('style');
      expect(stripped.nodes[0].worker_type).toBe('claude');
      expect(stripped.nodes[1]).not.toHaveProperty('width');
      expect(stripped.nodes[1]).not.toHaveProperty('height');
      expect(stripped.nodes[1].worker_type).toBe('minimax');

      // Check edges are stripped
      expect(stripped.edges).toHaveLength(1);
      expect(stripped.edges[0]).not.toHaveProperty('animated');
      expect(stripped.edges[0].mapping).toEqual({
        visual_prompt: 'output.scenes[0].visual_prompt',
      });
    });

    it('should handle empty canvas', () => {
      const canvas: VisualGraph = {
        nodes: [],
        edges: [],
      };

      const stripped = stripCanvasUIProperties(canvas);

      expect(stripped.nodes).toHaveLength(0);
      expect(stripped.edges).toHaveLength(0);
    });
  });

  describe('loadWorkerDefinitions', () => {
    it('should load all worker definitions from registry', () => {
      const workers = loadWorkerDefinitions();

      expect(workers).toBeInstanceOf(Array);
      expect(workers.length).toBeGreaterThan(0);

      // Check that we have expected workers
      const workerIds = workers.map((w) => w.id);
      expect(workerIds).toContain('claude');
      expect(workerIds).toContain('minimax');
      expect(workerIds).toContain('elevenlabs');
      expect(workerIds).toContain('shotstack');
    });

    it('should return worker definitions with required fields', () => {
      const workers = loadWorkerDefinitions();

      workers.forEach((worker) => {
        expect(worker).toHaveProperty('id');
        expect(worker).toHaveProperty('name');
        expect(worker).toHaveProperty('type');
        expect(worker).toHaveProperty('description');
        expect(worker).toHaveProperty('input');
        expect(worker).toHaveProperty('output');
      });
    });

    it('should return worker definitions with input schemas', () => {
      const workers = loadWorkerDefinitions();
      const claude = workers.find((w) => w.id === 'claude');

      expect(claude).toBeDefined();
      expect(claude!.input).toHaveProperty('prompt');
      expect(claude!.input.prompt).toHaveProperty('type');
      expect(claude!.input.prompt).toHaveProperty('required');
      expect(claude!.input.prompt).toHaveProperty('description');
    });

    it('should return worker definitions with output schemas', () => {
      const workers = loadWorkerDefinitions();
      const claude = workers.find((w) => w.id === 'claude');

      expect(claude).toBeDefined();
      expect(claude!.output).toHaveProperty('scenes');
      expect(claude!.output.scenes).toHaveProperty('type');
      expect(claude!.output.scenes).toHaveProperty('description');
    });
  });

  describe('buildAIManagerContext', () => {
    it('should build context with workers and request', () => {
      const context = buildAIManagerContext('Create a video workflow');

      expect(context).toHaveProperty('workers');
      expect(context).toHaveProperty('request');
      expect(context.request).toBe('Create a video workflow');
      expect(context.workers.length).toBeGreaterThan(0);
    });

    it('should build context without canvas', () => {
      const context = buildAIManagerContext('Create a new workflow');

      expect(context).not.toHaveProperty('currentCanvas');
    });

    it('should build context with stripped canvas', () => {
      const canvas: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 0, y: 0 },
            style: { backgroundColor: 'blue' },
            data: {
              label: 'Worker',
              worker_type: 'claude',
            },
          },
        ],
        edges: [],
      };

      const context = buildAIManagerContext('Modify this workflow', canvas);

      expect(context).toHaveProperty('currentCanvas');
      expect(context.currentCanvas).toBeDefined();
      expect(context.currentCanvas!.nodes).toHaveLength(1);
      expect(context.currentCanvas!.nodes[0]).not.toHaveProperty('position');
      expect(context.currentCanvas!.nodes[0]).not.toHaveProperty('style');
      expect(context.currentCanvas!.nodes[0].worker_type).toBe('claude');
    });

    it('should include all required context fields', () => {
      const context = buildAIManagerContext('Test request');

      expect(context).toHaveProperty('workers');
      expect(context).toHaveProperty('request');
      expect(Array.isArray(context.workers)).toBe(true);
      expect(typeof context.request).toBe('string');
    });
  });

  describe('formatContextAsJSON', () => {
    it('should format context as pretty JSON by default', () => {
      const context = buildAIManagerContext('Test request');
      const json = formatContextAsJSON(context);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should format context as compact JSON when pretty is false', () => {
      const context = buildAIManagerContext('Test request');
      const json = formatContextAsJSON(context, false);

      expect(json).not.toContain('\n  ');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should produce valid JSON', () => {
      const canvas: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: 'Worker',
              worker_type: 'claude',
              config: { model: 'claude-sonnet-4-20250514' },
            },
          },
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            data: {
              mapping: { prompt: 'output.text' },
            },
          },
        ],
      };

      const context = buildAIManagerContext('Test', canvas);
      const json = formatContextAsJSON(context);

      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('workers');
      expect(parsed).toHaveProperty('request');
      expect(parsed).toHaveProperty('currentCanvas');
    });
  });

  describe('Integration: Full context building flow', () => {
    it('should build complete context for workflow creation', () => {
      const request = 'Create a video generation workflow with Claude and Minimax';
      const context = buildAIManagerContext(request);

      expect(context.request).toBe(request);
      expect(context.workers.length).toBeGreaterThan(0);
      expect(context.workers.some((w) => w.id === 'claude')).toBe(true);
      expect(context.workers.some((w) => w.id === 'minimax')).toBe(true);
      expect(context.currentCanvas).toBeUndefined();
    });

    it('should build complete context for workflow modification', () => {
      const canvas: VisualGraph = {
        nodes: [
          {
            id: 'claude1',
            type: 'worker',
            position: { x: 100, y: 100 },
            style: { backgroundColor: 'blue' },
            width: 200,
            height: 150,
            data: {
              label: 'Claude Script Generator',
              worker_type: 'claude',
              config: { model: 'claude-sonnet-4-20250514' },
              entityMovement: {
                onSuccess: {
                  targetSectionId: 'section2',
                  completeAs: 'success',
                },
              },
            },
          },
          {
            id: 'minimax1',
            type: 'worker',
            position: { x: 400, y: 100 },
            parentNode: 'section1',
            data: {
              label: 'Minimax Video Generator',
              worker_type: 'minimax',
            },
          },
        ],
        edges: [
          {
            id: 'edge1',
            source: 'claude1',
            target: 'minimax1',
            animated: true,
            type: 'default',
            data: {
              mapping: {
                visual_prompt: 'output.scenes[0].visual_prompt',
              },
            },
          },
        ],
      };

      const request = 'Add ElevenLabs voice generation after Claude';
      const context = buildAIManagerContext(request, canvas);

      // Verify request
      expect(context.request).toBe(request);

      // Verify workers loaded
      expect(context.workers.length).toBeGreaterThan(0);

      // Verify canvas is stripped
      expect(context.currentCanvas).toBeDefined();
      expect(context.currentCanvas!.nodes).toHaveLength(2);

      // Verify first node is stripped
      const node1 = context.currentCanvas!.nodes[0];
      expect(node1.id).toBe('claude1');
      expect(node1.type).toBe('worker');
      expect(node1.worker_type).toBe('claude');
      expect(node1).not.toHaveProperty('position');
      expect(node1).not.toHaveProperty('style');
      expect(node1).not.toHaveProperty('width');
      expect(node1).not.toHaveProperty('height');
      expect(node1.config).toEqual({ model: 'claude-sonnet-4-20250514' });
      expect(node1.entityMovement).toBeDefined();

      // Verify second node is stripped
      const node2 = context.currentCanvas!.nodes[1];
      expect(node2.id).toBe('minimax1');
      expect(node2).not.toHaveProperty('position');
      expect(node2).not.toHaveProperty('parentNode');

      // Verify edge is stripped
      const edge1 = context.currentCanvas!.edges[0];
      expect(edge1.source).toBe('claude1');
      expect(edge1.target).toBe('minimax1');
      expect(edge1).not.toHaveProperty('animated');
      expect(edge1).not.toHaveProperty('type');
      expect(edge1.mapping).toEqual({
        visual_prompt: 'output.scenes[0].visual_prompt',
      });
    });

    it('should produce JSON that can be sent to LLM', () => {
      const canvas: VisualGraph = {
        nodes: [
          {
            id: 'worker1',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: 'Worker',
              worker_type: 'claude',
            },
          },
        ],
        edges: [],
      };

      const context = buildAIManagerContext('Test request', canvas);
      const json = formatContextAsJSON(context);

      // Verify it's valid JSON
      const parsed = JSON.parse(json);

      // Verify structure
      expect(parsed.workers).toBeInstanceOf(Array);
      expect(parsed.request).toBe('Test request');
      expect(parsed.currentCanvas).toBeDefined();
      expect(parsed.currentCanvas.nodes).toBeInstanceOf(Array);
      expect(parsed.currentCanvas.edges).toBeInstanceOf(Array);

      // Verify no UI properties leaked through
      const jsonStr = JSON.stringify(parsed);
      expect(jsonStr).not.toContain('position');
      expect(jsonStr).not.toContain('style');
      expect(jsonStr).not.toContain('width');
      expect(jsonStr).not.toContain('height');
      expect(jsonStr).not.toContain('parentNode');
      expect(jsonStr).not.toContain('extent');
      expect(jsonStr).not.toContain('animated');
      expect(jsonStr).not.toContain('sourceHandle');
      expect(jsonStr).not.toContain('targetHandle');
    });
  });
});
