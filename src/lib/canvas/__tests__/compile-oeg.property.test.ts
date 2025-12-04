/**
 * Property-based tests for OEG compilation
 * 
 * Feature: canvas-as-data
 * Tests the compilation of visual graphs to optimized execution graphs
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { compileToOEG } from '../compile-oeg';
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
const acyclicGraphArbitrary: fc.Arbitrary<VisualGraph> = fc.array(simpleNodeArbitrary, { minLength: 2, maxLength: 10 })
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

// ============================================================================
// Property Tests
// ============================================================================

describe('OEG Compilation - Property Tests', () => {
  
  /**
   * Feature: canvas-as-data, Property 12: Adjacency map creation
   * Validates: Requirements 3.1
   * 
   * For any valid visual graph, compilation should create an adjacency map
   * indexed by source node ID
   */
  describe('Property 12: Adjacency map creation', () => {
    
    it('for any acyclic graph, compilation should create an adjacency map with all nodes', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph: VisualGraph) => {
          const result = compileToOEG(graph);
          
          // Compilation should succeed for acyclic graphs
          expect(result.success).toBe(true);
          expect(result.executionGraph).toBeDefined();
          
          if (!result.executionGraph) return;
          
          const { adjacency } = result.executionGraph;
          
          // Every node should have an entry in the adjacency map
          for (const node of graph.nodes) {
            expect(adjacency).toHaveProperty(node.id);
            expect(Array.isArray(adjacency[node.id])).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph, the adjacency map should correctly represent all edges', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph: VisualGraph) => {
          const result = compileToOEG(graph);
          
          if (!result.success || !result.executionGraph) return;
          
          const { adjacency } = result.executionGraph;
          
          // For each edge in the visual graph
          for (const edge of graph.edges) {
            // The adjacency map should contain the target in the source's list
            expect(adjacency[edge.source]).toContain(edge.target);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph, nodes with no outgoing edges should have empty adjacency lists', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph: VisualGraph) => {
          const result = compileToOEG(graph);
          
          if (!result.success || !result.executionGraph) return;
          
          const { adjacency } = result.executionGraph;
          
          // Find nodes with no outgoing edges
          const nodesWithOutgoing = new Set(graph.edges.map(e => e.source));
          
          for (const node of graph.nodes) {
            if (!nodesWithOutgoing.has(node.id)) {
              // This node has no outgoing edges
              expect(adjacency[node.id]).toEqual([]);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph, the adjacency map should enable O(1) lookup of downstream nodes', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph: VisualGraph) => {
          const result = compileToOEG(graph);
          
          if (!result.success || !result.executionGraph) return;
          
          const { adjacency } = result.executionGraph;
          
          // For any node in the graph
          for (const node of graph.nodes) {
            // We should be able to get its downstream nodes in O(1)
            const downstream = adjacency[node.id];
            
            // Verify this matches the edges in the visual graph
            const expectedDownstream = graph.edges
              .filter(e => e.source === node.id)
              .map(e => e.target);
            
            expect(downstream.sort()).toEqual(expectedDownstream.sort());
          }
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with multiple edges from same source, adjacency should contain all targets', () => {
      fc.assert(
        fc.property(
          fc.array(simpleNodeArbitrary, { minLength: 3, maxLength: 5 }),
          (nodes) => {
            // Ensure unique node IDs
            const uniqueNodes = Array.from(
              new Map(nodes.map(n => [n.id, n])).values()
            );

            if (uniqueNodes.length < 3) return;

            // Create a graph where first node connects to all others
            const sourceNode = uniqueNodes[0];
            const targetNodes = uniqueNodes.slice(1);
            
            const edges: VisualEdge[] = targetNodes.map(target => ({
              id: `e-${sourceNode.id}-${target.id}`,
              source: sourceNode.id,
              target: target.id,
            }));

            const graph: VisualGraph = {
              nodes: uniqueNodes,
              edges,
            };

            const result = compileToOEG(graph);
            
            if (!result.success || !result.executionGraph) return;
            
            const { adjacency } = result.executionGraph;
            
            // The source node should have all targets in its adjacency list
            expect(adjacency[sourceNode.id].length).toBe(targetNodes.length);
            
            for (const target of targetNodes) {
              expect(adjacency[sourceNode.id]).toContain(target.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any graph, adjacency map size should equal number of nodes', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph: VisualGraph) => {
          const result = compileToOEG(graph);
          
          if (!result.success || !result.executionGraph) return;
          
          const { adjacency } = result.executionGraph;
          
          // The adjacency map should have an entry for every node
          expect(Object.keys(adjacency).length).toBe(graph.nodes.length);
        }),
        { numRuns: 100 }
      );
    });

    it('adjacency map creation should be deterministic (same graph produces same adjacency)', () => {
      fc.assert(
        fc.property(acyclicGraphArbitrary, (graph: VisualGraph) => {
          const result1 = compileToOEG(graph);
          const result2 = compileToOEG(graph);
          
          if (!result1.success || !result2.success) return;
          if (!result1.executionGraph || !result2.executionGraph) return;
          
          const adj1 = result1.executionGraph.adjacency;
          const adj2 = result2.executionGraph.adjacency;
          
          // Both compilations should produce identical adjacency maps
          expect(Object.keys(adj1).sort()).toEqual(Object.keys(adj2).sort());
          
          for (const nodeId of Object.keys(adj1)) {
            expect(adj1[nodeId].sort()).toEqual(adj2[nodeId].sort());
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
