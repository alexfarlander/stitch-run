/**
 * Mermaid Generator Tests
 * 
 * Tests the Mermaid flowchart generator functionality.
 * Verifies node conversion, edge conversion, and round-trip compatibility.
 */

import { describe, it, expect } from 'vitest';
import { canvasToMermaid } from '../mermaid-generator';
import { mermaidToCanvas } from '../mermaid-parser';
import { VisualGraph } from '@/types/canvas-schema';

describe('canvasToMermaid', () => {
  it('should generate valid Mermaid flowchart header', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: 'Start' }
        }
      ],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('flowchart LR');
  });
  
  it('should convert worker nodes to rounded brackets', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: 'Process Data' }
        }
      ],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('A(Process Data)');
  });
  
  it('should convert UX nodes to square brackets', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'ux',
          position: { x: 0, y: 0 },
          data: { label: 'User Input' }
        }
      ],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('A[User Input]');
  });
  
  it('should convert splitter nodes to curly braces', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'splitter',
          position: { x: 0, y: 0 },
          data: { label: 'Split Tasks' }
        }
      ],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('A{Split Tasks}');
  });
  
  it('should convert collector nodes to curly braces', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'collector',
          position: { x: 0, y: 0 },
          data: { label: 'Collect Results' }
        }
      ],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('A{Collect Results}');
  });
  
  it('should convert edges to arrow syntax', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: 'Start' }
        },
        {
          id: 'B',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { label: 'End' }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'A',
          target: 'B'
        }
      ]
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('A --> B');
  });
  
  it('should handle multiple edges from same source', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'splitter',
          position: { x: 0, y: 0 },
          data: { label: 'Split' }
        },
        {
          id: 'B',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { label: 'Branch 1' }
        },
        {
          id: 'C',
          type: 'worker',
          position: { x: 100, y: 100 },
          data: { label: 'Branch 2' }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'A',
          target: 'B'
        },
        {
          id: 'e2',
          source: 'A',
          target: 'C'
        }
      ]
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('A --> B');
    expect(mermaid).toContain('A --> C');
  });
  
  it('should sanitize labels with special characters', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: 'Process [Data] (Important)' }
        }
      ],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    // Should remove brackets and parentheses
    expect(mermaid).toContain('A(Process Data Important)');
  });
  
  it('should handle empty graph', () => {
    const graph: VisualGraph = {
      nodes: [],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('flowchart LR');
  });
  
  it('should preserve graph structure in round-trip', () => {
    // Start with Mermaid
    const originalMermaid = `
      flowchart LR
        A[User Input] --> B(Generate Script)
        B --> C(Generate Video)
        C --> D[Display Result]
    `;
    
    // Parse to graph
    const graph = mermaidToCanvas(originalMermaid);
    
    // Convert back to Mermaid
    const generatedMermaid = canvasToMermaid(graph);
    
    // Parse again
    const roundTripGraph = mermaidToCanvas(generatedMermaid);
    
    // Should have same number of nodes and edges
    expect(roundTripGraph.nodes.length).toBe(graph.nodes.length);
    expect(roundTripGraph.edges.length).toBe(graph.edges.length);
    
    // Should have same node IDs
    const originalIds = graph.nodes.map(n => n.id).sort();
    const roundTripIds = roundTripGraph.nodes.map(n => n.id).sort();
    expect(roundTripIds).toEqual(originalIds);
    
    // Should have same edges (source -> target pairs)
    const originalEdgePairs = graph.edges
      .map(e => `${e.source}->${e.target}`)
      .sort();
    const roundTripEdgePairs = roundTripGraph.edges
      .map(e => `${e.source}->${e.target}`)
      .sort();
    expect(roundTripEdgePairs).toEqual(originalEdgePairs);
  });
  
  it('should handle complex graph with multiple paths', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'ux',
          position: { x: 0, y: 0 },
          data: { label: 'Input' }
        },
        {
          id: 'B',
          type: 'splitter',
          position: { x: 100, y: 0 },
          data: { label: 'Split' }
        },
        {
          id: 'C',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { label: 'Process 1' }
        },
        {
          id: 'D',
          type: 'worker',
          position: { x: 200, y: 100 },
          data: { label: 'Process 2' }
        },
        {
          id: 'E',
          type: 'collector',
          position: { x: 300, y: 50 },
          data: { label: 'Merge' }
        }
      ],
      edges: [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'B', target: 'C' },
        { id: 'e3', source: 'B', target: 'D' },
        { id: 'e4', source: 'C', target: 'E' },
        { id: 'e5', source: 'D', target: 'E' }
      ]
    };
    
    const mermaid = canvasToMermaid(graph);
    
    // Should contain all nodes
    expect(mermaid).toContain('A[Input]');
    expect(mermaid).toContain('B{Split}');
    expect(mermaid).toContain('C(Process 1)');
    expect(mermaid).toContain('D(Process 2)');
    expect(mermaid).toContain('E{Merge}');
    
    // Should contain all edges
    expect(mermaid).toContain('A --> B');
    expect(mermaid).toContain('B --> C');
    expect(mermaid).toContain('B --> D');
    expect(mermaid).toContain('C --> E');
    expect(mermaid).toContain('D --> E');
  });
  
  it('should use node ID as label if label is missing', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: '' }  // Empty label
        }
      ],
      edges: []
    };
    
    const mermaid = canvasToMermaid(graph);
    
    expect(mermaid).toContain('A(A)');
  });
  
  it('should organize output with comments', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'A',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: 'Start' }
        },
        {
          id: 'B',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { label: 'End' }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'A',
          target: 'B'
        }
      ]
    };
    
    const mermaid = canvasToMermaid(graph);
    
    // Should have section comments
    expect(mermaid).toContain('%% Nodes');
    expect(mermaid).toContain('%% Connections');
  });
});
