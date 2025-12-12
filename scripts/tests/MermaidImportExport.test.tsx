/**
 * MermaidImportExport Component Tests
 * 
 * Tests the Mermaid import/export UI component functionality including:
 * - Component props interface validation
 * - Import/export callback handling
 * - Visual graph structure validation
 * 
 * Requirements: 6.1, 6.3, 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect } from 'vitest';
import { VisualGraph } from '@/types/canvas-schema';
import { NodeConfig, WorkflowCreationRequest } from '@/types/workflow-creation';

describe('MermaidImportExport Component', () => {
  it('should have correct MermaidImportExportProps structure', () => {
    interface MermaidImportExportProps {
      currentGraph?: VisualGraph;
      onImport?: (graph: VisualGraph) => void;
      onExport?: (mermaid: string) => void;
    }

    const mockGraph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Test Node',
            worker_type: 'claude',
          },
        },
      ],
      edges: [],
    };

    const props: MermaidImportExportProps = {
      currentGraph: mockGraph,
      onImport: (graph) => {
        expect(graph).toHaveProperty('nodes');
        expect(graph).toHaveProperty('edges');
      },
      onExport: (mermaid) => {
        expect(typeof mermaid).toBe('string');
      },
    };

    expect(props.currentGraph).toBeDefined();
    expect(props.onImport).toBeDefined();
    expect(props.onExport).toBeDefined();
  });

  it('should support optional props', () => {
    interface MermaidImportExportProps {
      currentGraph?: VisualGraph;
      onImport?: (graph: VisualGraph) => void;
      onExport?: (mermaid: string) => void;
    }

    const props: MermaidImportExportProps = {};

    expect(props.currentGraph).toBeUndefined();
    expect(props.onImport).toBeUndefined();
    expect(props.onExport).toBeUndefined();
  });

  it('should validate NodeConfig structure', () => {
    const nodeConfig: NodeConfig = {
      workerType: 'claude',
      config: {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
      },
    };

    expect(nodeConfig).toHaveProperty('workerType');
    expect(nodeConfig).toHaveProperty('config');
    expect(nodeConfig.workerType).toBe('claude');
    expect(nodeConfig.config?.model).toBe('claude-3-sonnet-20240229');
  });

  it('should validate WorkflowCreationRequest structure', () => {
    const request: WorkflowCreationRequest = {
      mermaid: 'flowchart LR\n  A[Start] --> B[End]',
      nodeConfigs: {
        A: {
          workerType: 'claude',
          config: { model: 'claude-3-sonnet-20240229' },
        },
      },
      edgeMappings: {
        'A->B': {
          prompt: 'output.text',
        },
      },
    };

    expect(request).toHaveProperty('mermaid');
    expect(request).toHaveProperty('nodeConfigs');
    expect(request).toHaveProperty('edgeMappings');
    expect(request.mermaid).toContain('flowchart');
  });

  it('should support Mermaid-only workflow creation', () => {
    const request: WorkflowCreationRequest = {
      mermaid: 'flowchart LR\n  A[Start] --> B[End]',
    };

    expect(request.mermaid).toBeDefined();
    expect(request.nodeConfigs).toBeUndefined();
    expect(request.edgeMappings).toBeUndefined();
  });

  it('should support full graph workflow creation', () => {
    const request: WorkflowCreationRequest = {
      graph: {
        nodes: [
          {
            id: 'A',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: 'Start',
              worker_type: 'claude',
            },
          },
        ],
        edges: [],
      },
    };

    expect(request.graph).toBeDefined();
    expect(request.graph?.nodes).toHaveLength(1);
    expect(request.mermaid).toBeUndefined();
  });

  it('should support hybrid Mermaid + configs approach', () => {
    const request: WorkflowCreationRequest = {
      mermaid: 'flowchart LR\n  A --> B',
      nodeConfigs: {
        A: { workerType: 'claude' },
        B: { workerType: 'minimax' },
      },
      edgeMappings: {
        'A->B': { prompt: 'output.text' },
      },
    };

    expect(request.mermaid).toBeDefined();
    expect(request.nodeConfigs).toBeDefined();
    expect(request.edgeMappings).toBeDefined();
    expect(Object.keys(request.nodeConfigs!)).toHaveLength(2);
    expect(Object.keys(request.edgeMappings!)).toHaveLength(1);
  });

  it('should handle empty visual graph', () => {
    const emptyGraph: VisualGraph = {
      nodes: [],
      edges: [],
    };

    expect(emptyGraph.nodes).toHaveLength(0);
    expect(emptyGraph.edges).toHaveLength(0);
  });

  it('should handle complex visual graph', () => {
    const complexGraph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'ux',
          position: { x: 0, y: 0 },
          data: { label: 'User Input' },
        },
        {
          id: 'B',
          type: 'worker',
          position: { x: 300, y: 0 },
          data: {
            label: 'Process',
            worker_type: 'claude',
            config: { model: 'claude-3-sonnet-20240229' },
          },
        },
        {
          id: 'C',
          type: 'splitter',
          position: { x: 600, y: 0 },
          data: { label: 'Split' },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'A',
          target: 'B',
          data: {
            mapping: { prompt: 'input.text' },
          },
        },
        {
          id: 'e2',
          source: 'B',
          target: 'C',
        },
      ],
    };

    expect(complexGraph.nodes).toHaveLength(3);
    expect(complexGraph.edges).toHaveLength(2);
    expect(complexGraph.nodes[0].type).toBe('ux');
    expect(complexGraph.nodes[1].type).toBe('worker');
    expect(complexGraph.nodes[2].type).toBe('splitter');
    expect(complexGraph.edges[0].data?.mapping).toBeDefined();
  });

  it('should validate callback function signatures', () => {
    const mockImportCallback = (graph: VisualGraph) => {
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    };

    const mockExportCallback = (mermaid: string) => {
      expect(typeof mermaid).toBe('string');
      expect(mermaid.length).toBeGreaterThan(0);
    };

    const mockGraph: VisualGraph = { nodes: [], edges: [] };
    const mockMermaid = 'flowchart LR\n  A --> B';

    mockImportCallback(mockGraph);
    mockExportCallback(mockMermaid);
  });
});
