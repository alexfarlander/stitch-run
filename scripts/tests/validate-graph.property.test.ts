/**
 * Property-based tests for graph validation
 * 
 * Feature: canvas-as-data
 * Tests validation functions including cycle detection, input validation,
 * worker type validation, and edge mapping validation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { detectCycles, validateGraph } from '../validate-graph';
import { VisualGraph, VisualNode, VisualEdge } from '@/types/canvas-schema';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate a valid node ID
 */
const nodeIdArbitrary = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

/**
 * Generate a simple visual node (without complex data)
 * Only generates worker and ux nodes to avoid splitter/collector pairing issues
 */
const simpleNodeArbitrary = fc.record({
  id: nodeIdArbitrary,
  type: fc.constantFrom('worker', 'ux'),
  position: fc.record({
    x: fc.integer({ min: 0, max: 1000 }),
    y: fc.integer({ min: 0, max: 1000 }),
  }),
  data: fc.record({
    label: fc.string({ minLength: 1, maxLength: 50 }),
  }),
});

/**
 * Generate a visual edge between two nodes
 */
function edgeArbitrary(sourceId: string, targetId: string): fc.Arbitrary<VisualEdge> {
  return fc.record({
    id: fc.constant(`e-${sourceId}-${targetId}`),
    source: fc.constant(sourceId),
    target: fc.constant(targetId),
  });
}

/**
 * Generate an acyclic graph (DAG)
 * Uses topological ordering to ensure no cycles
 */
const acyclicGraphArbitrary = fc.array(simpleNodeArbitrary, { minLength: 2, maxLength: 10 })
  .chain(nodes => {
    // Ensure unique node IDs
    const uniqueNodes = Array.from(
      new Map(nodes.map(n => [n.id, n])).values()
    );

    if (uniqueNodes.length < 2) {
      // Not enough unique nodes, return minimal graph
      return fc.constant({
        nodes: uniqueNodes,
        edges: [],
      });
    }

    // Generate edges that respect topological order (i -> j where i < j)
    // This guarantees no cycles
    const edgeArbitraries: fc.Arbitrary<VisualEdge>[] = [];
    
    for (let i = 0; i < uniqueNodes.length - 1; i++) {
      for (let j = i + 1; j < uniqueNodes.length; j++) {
        edgeArbitraries.push(
          edgeArbitrary(uniqueNodes[i].id, uniqueNodes[j].id)
        );
      }
    }

    if (edgeArbitraries.length === 0) {
      return fc.constant({
        nodes: uniqueNodes,
        edges: [],
      });
    }

    // Select a subset of possible edges
    return fc.subarray(edgeArbitraries).chain(selectedArbitraries => {
      if (selectedArbitraries.length === 0) {
        return fc.constant({
          nodes: uniqueNodes,
          edges: [],
        });
      }

      return fc.tuple(...selectedArbitraries).map(edges => ({
        nodes: uniqueNodes,
        edges,
      }));
    });
  });

/**
 * Generate a graph with a guaranteed cycle
 * Creates a simple cycle: A -> B -> C -> A
 */
const cyclicGraphArbitrary = fc.array(simpleNodeArbitrary, { minLength: 3, maxLength: 10 })
  .map(nodes => {
    // Ensure unique node IDs
    const uniqueNodes = Array.from(
      new Map(nodes.map(n => [n.id, n])).values()
    );

    if (uniqueNodes.length < 3) {
      // Need at least 3 nodes for a cycle, add more
      while (uniqueNodes.length < 3) {
        uniqueNodes.push({
          id: `node-${uniqueNodes.length}`,
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { label: `Node ${uniqueNodes.length}` },
        });
      }
    }

    // Create a cycle using first 3 nodes: 0 -> 1 -> 2 -> 0
    const edges: VisualEdge[] = [
      {
        id: `e-${uniqueNodes[0].id}-${uniqueNodes[1].id}`,
        source: uniqueNodes[0].id,
        target: uniqueNodes[1].id,
      },
      {
        id: `e-${uniqueNodes[1].id}-${uniqueNodes[2].id}`,
        source: uniqueNodes[1].id,
        target: uniqueNodes[2].id,
      },
      {
        id: `e-${uniqueNodes[2].id}-${uniqueNodes[0].id}`,
        source: uniqueNodes[2].id,
        target: uniqueNodes[0].id,
      },
    ];

    return {
      nodes: uniqueNodes,
      edges,
    };
  });

// ============================================================================
// Property Tests
// ============================================================================

describe('Graph Validation - Property Tests', () => {
  
  // Feature: canvas-as-data, Property 18: Cycle detection
  // Validates: Requirements 4.1
  describe('Property 18: Cycle detection', () => {
    
    it('for any acyclic graph (DAG), cycle detection should return no errors', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph) => {
          const errors = detectCycles(graph);
          
          // An acyclic graph should have no cycle errors
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with a cycle, cycle detection should return at least one error', () => {
      fc.assert(
        fc.property(cyclicGraphArbitrary, (graph) => {
          const errors = detectCycles(graph);
          
          // A cyclic graph should have at least one cycle error
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].type).toBe('cycle');
          expect(errors[0].message).toContain('cycle');
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with no edges, cycle detection should return no errors', () => {
      fc.assert(
        fc.property(
          fc.array(simpleNodeArbitrary, { minLength: 1, maxLength: 10 }),
          (nodes) => {
            // Ensure unique node IDs
            const uniqueNodes = Array.from(
              new Map(nodes.map(n => [n.id, n])).values()
            );

            const graph: VisualGraph = {
              nodes: uniqueNodes,
              edges: [],
            };

            const errors = detectCycles(graph);
            
            // A graph with no edges cannot have cycles
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any single-node graph, cycle detection should return no errors', () => {
      fc.assert(
        fc.property(simpleNodeArbitrary, (node) => {
          const graph: VisualGraph = {
            nodes: [node],
            edges: [],
          };

          const errors = detectCycles(graph);
          
          // A single node cannot form a cycle
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with a self-loop, cycle detection should return an error', () => {
      fc.assert(
        fc.property(simpleNodeArbitrary, (node) => {
          const graph: VisualGraph = {
            nodes: [node],
            edges: [{
              id: `e-${node.id}-${node.id}`,
              source: node.id,
              target: node.id,
            }],
          };

          const errors = detectCycles(graph);
          
          // A self-loop is a cycle
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].type).toBe('cycle');
        }),
        { numRuns: 100 }
      );
    });

    it('cycle detection should be deterministic (same graph produces same result)', () => {
      fc.assert(
        fc.property(
          fc.oneof(acyclicGraphArbitrary, cyclicGraphArbitrary),
          (graph) => {
            const errors1 = detectCycles(graph);
            const errors2 = detectCycles(graph);
            
            // Running detection twice should give same result
            expect(errors1.length).toBe(errors2.length);
            if (errors1.length > 0) {
              expect(errors1[0].type).toBe(errors2[0].type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration: validateGraph with cycles', () => {
    
    it('for any acyclic graph, validateGraph should not report cycle errors', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph) => {
          const errors = validateGraph(graph);
          
          // Filter for cycle errors
          const cycleErrors = errors.filter(e => e.type === 'cycle');
          
          // An acyclic graph should have no cycle errors
          expect(cycleErrors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('for any cyclic graph, validateGraph should report cycle errors', () => {
      fc.assert(
        fc.property(cyclicGraphArbitrary, (graph) => {
          const errors = validateGraph(graph);
          
          // Filter for cycle errors
          const cycleErrors = errors.filter(e => e.type === 'cycle');
          
          // A cyclic graph should have at least one cycle error
          expect(cycleErrors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
