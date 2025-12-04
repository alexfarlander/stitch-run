import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Node } from '@xyflow/react';
import { calculateScreenPosition } from '../position';

/**
 * Property-based tests for entity position calculation
 * Feature: fix-current-implementation, Property 20: Coordinate transformation
 */

describe('Entity Position Calculation - Property Tests', () => {
  /**
   * Feature: fix-current-implementation, Property 20: Coordinate transformation
   * Validates: Requirements 7.3
   * 
   * For any entity position and viewport transform, the calculated screen coordinates 
   * should correctly apply the transform formula after recursively summing all parent 
   * node positions: screenX = (absoluteNodeX * zoom) + viewportX, where absoluteNodeX 
   * is the sum of the node's position.x and all ancestor parent node positions
   */
  it('should correctly transform coordinates with viewport for nodes without parents', () => {
    fc.assert(
      fc.property(
        // Generate random node position
        fc.record({
          x: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          y: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true })
        }),
        // Generate random viewport transform
        fc.record({
          x: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          y: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true })
        }),
        (nodePos, viewport) => {
          // Create a simple node without parent
          const nodes: Node[] = [{
            id: 'test-node',
            type: 'default',
            position: nodePos,
            data: {}
          }];

          const result = calculateScreenPosition('test-node', nodes, viewport);

          // Verify the transformation formula
          const expectedX = nodePos.x * viewport.zoom + viewport.x;
          const expectedY = nodePos.y * viewport.zoom + viewport.y;

          // Allow small floating point error
          const tolerance = 0.01;
          return (
            Math.abs(result.x - expectedX) < tolerance &&
            Math.abs(result.y - expectedY) < tolerance
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should recursively sum parent positions before applying viewport transform', () => {
    fc.assert(
      fc.property(
        // Generate random positions for parent and child
        fc.record({
          parentX: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          parentY: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          childX: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          childY: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true })
        }),
        // Generate random viewport
        fc.record({
          x: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          y: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true })
        }),
        (positions, viewport) => {
          // Create parent and child nodes
          const nodes: Node[] = [
            {
              id: 'parent',
              type: 'section',
              position: { x: positions.parentX, y: positions.parentY },
              data: {}
            },
            {
              id: 'child',
              type: 'item',
              position: { x: positions.childX, y: positions.childY },
              parentId: 'parent',
              data: {}
            }
          ];

          const result = calculateScreenPosition('child', nodes, viewport);

          // Calculate expected absolute position (sum of parent and child)
          const absoluteX = positions.parentX + positions.childX;
          const absoluteY = positions.parentY + positions.childY;

          // Apply viewport transform
          const expectedX = absoluteX * viewport.zoom + viewport.x;
          const expectedY = absoluteY * viewport.zoom + viewport.y;

          // Allow small floating point error
          const tolerance = 0.01;
          return (
            Math.abs(result.x - expectedX) < tolerance &&
            Math.abs(result.y - expectedY) < tolerance
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle deeply nested parent hierarchies', () => {
    fc.assert(
      fc.property(
        // Generate random positions for 3-level hierarchy
        fc.record({
          grandparentX: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          grandparentY: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          parentX: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          parentY: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          childX: fc.float({ min: Math.fround(-200), max: Math.fround(200), noNaN: true }),
          childY: fc.float({ min: Math.fround(-200), max: Math.fround(200), noNaN: true })
        }),
        // Generate random viewport
        fc.record({
          x: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          y: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true })
        }),
        (positions, viewport) => {
          // Create 3-level hierarchy
          const nodes: Node[] = [
            {
              id: 'grandparent',
              type: 'section',
              position: { x: positions.grandparentX, y: positions.grandparentY },
              data: {}
            },
            {
              id: 'parent',
              type: 'section',
              position: { x: positions.parentX, y: positions.parentY },
              parentId: 'grandparent',
              data: {}
            },
            {
              id: 'child',
              type: 'item',
              position: { x: positions.childX, y: positions.childY },
              parentId: 'parent',
              data: {}
            }
          ];

          const result = calculateScreenPosition('child', nodes, viewport);

          // Calculate expected absolute position (sum all ancestors)
          const absoluteX = positions.grandparentX + positions.parentX + positions.childX;
          const absoluteY = positions.grandparentY + positions.parentY + positions.childY;

          // Apply viewport transform
          const expectedX = absoluteX * viewport.zoom + viewport.x;
          const expectedY = absoluteY * viewport.zoom + viewport.y;

          // Allow small floating point error
          const tolerance = 0.01;
          return (
            Math.abs(result.x - expectedX) < tolerance &&
            Math.abs(result.y - expectedY) < tolerance
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return origin for non-existent nodes', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          y: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true })
        }),
        (viewport) => {
          const nodes: Node[] = [];
          const result = calculateScreenPosition('non-existent', nodes, viewport);
          
          return result.x === 0 && result.y === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle nodes with missing parent references gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          y: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true })
        }),
        fc.record({
          x: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          y: fc.float({ min: Math.fround(-500), max: Math.fround(500), noNaN: true }),
          zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true })
        }),
        (nodePos, viewport) => {
          // Create node with parentId reference but parent doesn't exist
          const nodes: Node[] = [{
            id: 'orphan',
            type: 'item',
            position: nodePos,
            parentId: 'missing-parent',
            data: {}
          }];

          const result = calculateScreenPosition('orphan', nodes, viewport);

          // Should treat as if no parent (just use node's own position)
          const expectedX = nodePos.x * viewport.zoom + viewport.x;
          const expectedY = nodePos.y * viewport.zoom + viewport.y;

          const tolerance = 0.01;
          return (
            Math.abs(result.x - expectedX) < tolerance &&
            Math.abs(result.y - expectedY) < tolerance
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
