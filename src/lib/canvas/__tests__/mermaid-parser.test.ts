/**
 * Mermaid Parser Tests
 * 
 * Tests the Mermaid flowchart parser functionality.
 * Verifies node extraction, edge extraction, type inference, and config application.
 * Requirements: 3.5, 9.4
 */

import { describe, it, expect } from 'vitest';
import { mermaidToCanvas, MermaidParseError } from '../mermaid-parser';

describe('mermaidToCanvas', () => {
  it('should parse simple Mermaid flowchart', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> B[Process]
        B --> C[End]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    // Should have 3 nodes
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map(n => n.id).sort()).toEqual(['A', 'B', 'C']);
    
    // Should have 2 edges
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].source).toBe('A');
    expect(result.edges[0].target).toBe('B');
    expect(result.edges[1].source).toBe('B');
    expect(result.edges[1].target).toBe('C');
  });
  
  it('should extract node labels correctly', () => {
    const mermaid = `
      flowchart LR
        A[User Input] --> B[Generate Script]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    const nodeB = result.nodes.find(n => n.id === 'B');
    
    expect(nodeA?.data.label).toBe('User Input');
    expect(nodeB?.data.label).toBe('Generate Script');
  });
  
  it('should infer UX node type from label', () => {
    const mermaid = `
      flowchart LR
        A[User Input Form] --> B[Process]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    expect(nodeA?.type).toBe('ux');
  });
  
  it('should infer worker node type as default', () => {
    const mermaid = `
      flowchart LR
        A(Process Data) --> B(Convert)
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    const nodeB = result.nodes.find(n => n.id === 'B');
    
    expect(nodeA?.type).toBe('worker');
    expect(nodeB?.type).toBe('worker');
  });
  
  it('should infer splitter node type from label', () => {
    const mermaid = `
      flowchart LR
        A{Split Tasks} --> B(Task 1)
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    expect(nodeA?.type).toBe('splitter');
  });
  
  it('should infer collector node type from label', () => {
    const mermaid = `
      flowchart LR
        A(Task 1) --> B{Collect Results}
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeB = result.nodes.find(n => n.id === 'B');
    expect(nodeB?.type).toBe('collector');
  });
  
  it('should infer Claude worker type from label', () => {
    const mermaid = `
      flowchart LR
        A[Claude Generate Script] --> B[Next]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    expect(nodeA?.data.worker_type).toBe('claude');
  });
  
  it('should infer Minimax worker type from label', () => {
    const mermaid = `
      flowchart LR
        A[Generate Video] --> B[Next]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    expect(nodeA?.data.worker_type).toBe('minimax');
  });
  
  it('should infer ElevenLabs worker type from label', () => {
    const mermaid = `
      flowchart LR
        A[Generate Voice Audio] --> B[Next]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    expect(nodeA?.data.worker_type).toBe('elevenlabs');
  });
  
  it('should infer Shotstack worker type from label', () => {
    const mermaid = `
      flowchart LR
        A[Assemble Video] --> B[Next]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    expect(nodeA?.data.worker_type).toBe('shotstack');
  });
  
  it('should apply nodeConfigs when provided', () => {
    const mermaid = `
      flowchart LR
        A[Process] --> B[Next]
    `;
    
    const nodeConfigs = {
      A: {
        workerType: 'claude',
        config: { model: 'claude-3-sonnet-20240229', temperature: 0.7 }
      }
    };
    
    const result = mermaidToCanvas(mermaid, nodeConfigs);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    expect(nodeA?.type).toBe('worker');
    expect(nodeA?.data.worker_type).toBe('claude');
    expect(nodeA?.data.config).toEqual({ model: 'claude-3-sonnet-20240229', temperature: 0.7 });
  });
  
  it('should apply edgeMappings when provided', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> B[Process]
    `;
    
    const edgeMappings = {
      'A->B': {
        prompt: 'output.text',
        context: 'input.data'
      }
    };
    
    const result = mermaidToCanvas(mermaid, undefined, edgeMappings);
    
    const edge = result.edges.find(e => e.source === 'A' && e.target === 'B');
    expect(edge?.data?.mapping).toEqual({
      prompt: 'output.text',
      context: 'input.data'
    });
  });
  
  it('should auto-layout nodes with positions', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> B[Process]
        B --> C[End]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    // All nodes should have positions
    for (const node of result.nodes) {
      expect(node.position).toBeDefined();
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
    }
    
    // No two nodes should have identical positions
    const positions = result.nodes.map(n => `${n.position.x},${n.position.y}`);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(result.nodes.length);
  });
  
  it('should handle chained edges (A --> B --> C)', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> B[Middle] --> C[End]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    
    const edge1 = result.edges.find(e => e.source === 'A' && e.target === 'B');
    const edge2 = result.edges.find(e => e.source === 'B' && e.target === 'C');
    
    expect(edge1).toBeDefined();
    expect(edge2).toBeDefined();
  });
  
  it('should handle different node bracket styles', () => {
    const mermaid = `
      flowchart LR
        A[Rectangle] --> B(Rounded)
        B --> C{Diamond}
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    expect(result.nodes).toHaveLength(3);
    
    const nodeA = result.nodes.find(n => n.id === 'A');
    const nodeB = result.nodes.find(n => n.id === 'B');
    const nodeC = result.nodes.find(n => n.id === 'C');
    
    expect(nodeA?.data.label).toBe('Rectangle');
    expect(nodeB?.data.label).toBe('Rounded');
    expect(nodeC?.data.label).toBe('Diamond');
  });
  
  it('should handle multiple edges from same node', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> B[Branch 1]
        A --> C[Branch 2]
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    
    const edgeToB = result.edges.find(e => e.source === 'A' && e.target === 'B');
    const edgeToC = result.edges.find(e => e.source === 'A' && e.target === 'C');
    
    expect(edgeToB).toBeDefined();
    expect(edgeToC).toBeDefined();
  });
  
  it('should skip comments in Mermaid syntax', () => {
    const mermaid = `
      flowchart LR
        %% This is a comment
        A[Start] --> B[End]
        %% Another comment
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });
  
  it('should handle empty or whitespace-only lines', () => {
    const mermaid = `
      flowchart LR
      
        A[Start] --> B[End]
        
    `;
    
    const result = mermaidToCanvas(mermaid);
    
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });
});

describe('mermaidToCanvas - Error Handling', () => {
  it('should throw error for empty input', () => {
    expect(() => mermaidToCanvas('')).toThrow('Invalid Mermaid input');
  });
  
  it('should throw error for missing flowchart declaration', () => {
    const mermaid = `
      A[Start] --> B[End]
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Missing flowchart declaration');
  });
  
  it('should throw error for invalid flowchart direction', () => {
    const mermaid = `
      flowchart INVALID
      A[Start] --> B[End]
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Invalid flowchart direction');
  });
  
  it('should throw error for empty diagram', () => {
    const mermaid = `
      flowchart LR
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('No nodes found in diagram');
  });
  
  it('should throw error for unclosed bracket', () => {
    const mermaid = `
      flowchart LR
        A[Start --> B[End]
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Unclosed bracket');
  });
  
  it('should throw error for unclosed parenthesis', () => {
    const mermaid = `
      flowchart LR
        A(Start --> B(End)
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Unclosed parenthesis');
  });
  
  it('should throw error for unclosed brace', () => {
    const mermaid = `
      flowchart LR
        A{Start --> B{End}
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Unclosed brace');
  });
  
  it('should throw error for invalid node ID with spaces', () => {
    const mermaid = `
      flowchart LR
        My Node --> B[End]
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Invalid node ID with spaces');
  });
  
  it('should throw error for invalid edge syntax', () => {
    const mermaid = `
      flowchart LR
        A[Start] -->
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Invalid target node syntax');
  });
  
  it('should throw error for empty node segment in edge', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> --> B[End]
    `;
    
    expect(() => mermaidToCanvas(mermaid)).toThrow('Invalid target node syntax');
  });
  
  it('should include line numbers in error messages', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> B[Middle]
        B --> Invalid Node
    `;
    
    try {
      mermaidToCanvas(mermaid);
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.lineNumber).toBe(3);
      expect(error.line).toContain('Invalid Node');
    }
  });
  
  it('should provide helpful hints in error messages', () => {
    const mermaid = `
      flowchart WRONG
      A[Start] --> B[End]
    `;
    
    try {
      mermaidToCanvas(mermaid);
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.hint).toContain('LR');
      expect(error.hint).toContain('TD');
    }
  });
  
  it('should provide detailed error message', () => {
    const mermaid = `
      flowchart LR
        A[Start] --> B[
    `;
    
    try {
      mermaidToCanvas(mermaid);
      expect.fail('Should have thrown error');
    } catch (error: any) {
      const detailed = error.getDetailedMessage();
      expect(detailed).toContain('line');
      expect(detailed).toContain('Hint:');
    }
  });
});
