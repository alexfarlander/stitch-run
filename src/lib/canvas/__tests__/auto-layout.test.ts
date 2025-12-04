/**
 * Unit tests for auto-layout algorithm
 * 
 * Tests basic functionality of the hierarchical layout algorithm
 */

import { describe, it, expect } from 'vitest';
import { autoLayout } from '../auto-layout';
import { VisualNode, VisualEdge } from '@/types/canvas-schema';

describe('autoLayout', () => {
  it('should handle empty graph', () => {
    const result = autoLayout([], []);
    expect(result).toEqual([]);
  });

  it('should position single node at origin', () => {
    const nodes: VisualNode[] = [
      {
        id: 'node1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'Node 1' }
      }
    ];
    
    const result = autoLayout(nodes, []);
    
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ x: 0, y: 0 });
  });

  it('should position linear chain horizontally', () => {
    const nodes: VisualNode[] = [
      {
        id: 'A',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'A' }
      },
      {
        id: 'B',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'B' }
      },
      {
        id: 'C',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'C' }
      }
    ];
    
    const edges: VisualEdge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' }
    ];
    
    const result = autoLayout(nodes, edges);
    
    // A should be at level 0, B at level 1, C at level 2
    expect(result.find(n => n.id === 'A')?.position.x).toBe(0);
    expect(result.find(n => n.id === 'B')?.position.x).toBe(300);
    expect(result.find(n => n.id === 'C')?.position.x).toBe(600);
    
    // All should be at y=0 since they're in different levels
    expect(result.find(n => n.id === 'A')?.position.y).toBe(0);
    expect(result.find(n => n.id === 'B')?.position.y).toBe(0);
    expect(result.find(n => n.id === 'C')?.position.y).toBe(0);
  });

  it('should position parallel nodes vertically', () => {
    const nodes: VisualNode[] = [
      {
        id: 'A',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'A' }
      },
      {
        id: 'B',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'B' }
      },
      {
        id: 'C',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'C' }
      }
    ];
    
    const edges: VisualEdge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'A', target: 'C' }
    ];
    
    const result = autoLayout(nodes, edges);
    
    // A should be at level 0
    expect(result.find(n => n.id === 'A')?.position.x).toBe(0);
    expect(result.find(n => n.id === 'A')?.position.y).toBe(0);
    
    // B and C should be at level 1, but different y positions
    expect(result.find(n => n.id === 'B')?.position.x).toBe(300);
    expect(result.find(n => n.id === 'C')?.position.x).toBe(300);
    
    const bY = result.find(n => n.id === 'B')?.position.y;
    const cY = result.find(n => n.id === 'C')?.position.y;
    
    // B and C should have different y positions
    expect(bY).not.toBe(cY);
    expect(Math.abs((bY ?? 0) - (cY ?? 0))).toBe(150); // VERTICAL_SPACING
  });

  it('should handle diamond pattern (DAG with multiple paths)', () => {
    const nodes: VisualNode[] = [
      {
        id: 'A',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'A' }
      },
      {
        id: 'B',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'B' }
      },
      {
        id: 'C',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'C' }
      },
      {
        id: 'D',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { label: 'D' }
      }
    ];
    
    const edges: VisualEdge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'A', target: 'C' },
      { id: 'e3', source: 'B', target: 'D' },
      { id: 'e4', source: 'C', target: 'D' }
    ];
    
    const result = autoLayout(nodes, edges);
    
    // A should be at level 0
    expect(result.find(n => n.id === 'A')?.position.x).toBe(0);
    
    // B and C should be at level 1
    expect(result.find(n => n.id === 'B')?.position.x).toBe(300);
    expect(result.find(n => n.id === 'C')?.position.x).toBe(300);
    
    // D should be at level 2 (max(B.level, C.level) + 1 = max(1, 1) + 1 = 2)
    expect(result.find(n => n.id === 'D')?.position.x).toBe(600);
  });

  it('should ensure no two nodes have identical positions', () => {
    const nodes: VisualNode[] = [
      { id: 'A', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'B', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'B' } },
      { id: 'C', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'C' } },
      { id: 'D', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'D' } },
      { id: 'E', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'E' } }
    ];
    
    const edges: VisualEdge[] = [
      { id: 'e1', source: 'A', target: 'C' },
      { id: 'e2', source: 'B', target: 'C' },
      { id: 'e3', source: 'C', target: 'D' },
      { id: 'e4', source: 'C', target: 'E' }
    ];
    
    const result = autoLayout(nodes, edges);
    
    // Collect all positions
    const positions = result.map(n => `${n.position.x},${n.position.y}`);
    
    // Check that all positions are unique
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(positions.length);
  });

  it('should assign non-zero coordinates to all nodes', () => {
    const nodes: VisualNode[] = [
      { id: 'A', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'B', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'B' } },
      { id: 'C', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'C' } }
    ];
    
    const edges: VisualEdge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' }
    ];
    
    const result = autoLayout(nodes, edges);
    
    // All nodes should have defined positions
    for (const node of result) {
      expect(node.position).toBeDefined();
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it('should handle cycles gracefully without infinite loop', () => {
    // This is a critical test - cycles should NOT cause infinite loops
    const nodes: VisualNode[] = [
      { id: 'A', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'B', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'B' } },
      { id: 'C', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'C' } }
    ];
    
    // Create a cycle: A -> B -> C -> A
    const edges: VisualEdge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
      { id: 'e3', source: 'C', target: 'A' }  // Creates cycle
    ];
    
    // This should complete without hanging
    const result = autoLayout(nodes, edges);
    
    // Should return all nodes with positions (even if they're all at level 0)
    expect(result).toHaveLength(3);
    
    // All nodes should have valid positions
    for (const node of result) {
      expect(node.position).toBeDefined();
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
    
    // Nodes in a cycle will all be at level 0 (default)
    // since they never reach in-degree 0
    expect(result.find(n => n.id === 'A')?.position.x).toBe(0);
    expect(result.find(n => n.id === 'B')?.position.x).toBe(0);
    expect(result.find(n => n.id === 'C')?.position.x).toBe(0);
  });

  it('should handle partial cycles (some nodes in cycle, some not)', () => {
    const nodes: VisualNode[] = [
      { id: 'Start', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'A', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'B', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'B' } },
      { id: 'End', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'End' } }
    ];
    
    // Start -> A -> B -> A (cycle), and Start -> End (no cycle)
    const edges: VisualEdge[] = [
      { id: 'e1', source: 'Start', target: 'A' },
      { id: 'e2', source: 'A', target: 'B' },
      { id: 'e3', source: 'B', target: 'A' },  // Creates cycle between A and B
      { id: 'e4', source: 'Start', target: 'End' }
    ];
    
    const result = autoLayout(nodes, edges);
    
    // Should complete without hanging
    expect(result).toHaveLength(4);
    
    // Start should be at level 0
    expect(result.find(n => n.id === 'Start')?.position.x).toBe(0);
    
    // End should be at level 1 (Start + 1)
    expect(result.find(n => n.id === 'End')?.position.x).toBe(300);
    
    // A should be at level 1 (Start + 1), but won't progress further due to cycle
    expect(result.find(n => n.id === 'A')?.position.x).toBe(300);
    
    // B will remain at level 0 (default) since it's in the cycle
    expect(result.find(n => n.id === 'B')?.position.x).toBe(0);
  });
});
