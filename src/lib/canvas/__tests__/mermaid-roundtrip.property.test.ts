/**
 * Property-based tests for Mermaid round-trip conversion
 * Tests: Property 4
 * 
 * **Feature: ai-manager, Property 4: Mermaid round-trip preserves structure**
 * **Validates: Requirements 3.1, 3.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { mermaidToCanvas } from '../mermaid-parser';
import { canvasToMermaid } from '../mermaid-generator';
import { VisualGraph, VisualEdge } from '@/types/canvas-schema';

// ============================================================================
// Test Configuration
// ============================================================================

const testConfig = { numRuns: 100 };

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid node ID (alphanumeric only)
 */
const nodeIdArb = fc.stringMatching(/^[A-Z][A-Z0-9]{0,9}$/);

/**
 * Generate a valid node type
 */
const nodeTypeArb = fc.constantFrom('worker', 'ux', 'splitter', 'collector');

/**
 * Generate a valid worker type
 */
const workerTypeArb = fc.option(
  fc.constantFrom('claude', 'minimax', 'elevenlabs', 'shotstack'),
  { nil: undefined }
);

/**
 * Generate a valid node label (no special characters that break Mermaid)
 * For splitter/collector nodes, include keywords to ensure round-trip works
 */
const nodeLabelArb = fc.string({ minLength: 1, maxLength: 50 }).map(s =>
  s.replace(/[\[\]\(\)\{\}]/g, '').trim() || 'Node'
);

/**
 * Generate a node label appropriate for the node type
 * This ensures round-trip works correctly for splitter/collector nodes
 */
function nodeLabelForType(type: string): fc.Arbitrary<string> {
  switch (type) {
    case 'splitter':
      return fc.constantFrom('Split', 'Branch', 'Fork', 'Parallel Split');
    case 'collector':
      return fc.constantFrom('Collect', 'Merge', 'Join', 'Combine', 'Wait');
    case 'ux':
      return fc.constantFrom('User Input', 'Form', 'Button', 'Interface');
    case 'worker':
    default:
      return nodeLabelArb;
  }
}

/**
 * Generate a visual node with appropriate label for its type
 */
const visualNodeArb = nodeTypeArb.chain(type =>
  fc.record({
    id: nodeIdArb,
    type: fc.constant(type),
    position: fc.record({
      x: fc.integer({ min: 0, max: 1000 }),
      y: fc.integer({ min: 0, max: 1000 })
    }),
    data: fc.record({
      label: nodeLabelForType(type),
      worker_type: workerTypeArb,
      config: fc.constant({})
    })
  })
);

/**
 * Generate a visual edge that references existing nodes
 */
function visualEdgeArb(nodeIds: string[]): fc.Arbitrary<VisualEdge> {
  if (nodeIds.length < 2) {
    // Need at least 2 nodes for an edge
    return fc.constant({
      id: 'e-dummy',
      source: nodeIds[0] || 'A',
      target: nodeIds[0] || 'A'
    });
  }
  
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    source: fc.constantFrom(...nodeIds),
    target: fc.constantFrom(...nodeIds)
  }).filter(edge => edge.source !== edge.target); // No self-loops
}

/**
 * Generate a valid visual graph
 * Ensures edges only reference existing nodes
 */
const visualGraphArb: fc.Arbitrary<VisualGraph> = fc
  .array(visualNodeArb, { minLength: 2, maxLength: 10 })
  .chain(nodes => {
    // Ensure unique node IDs
    const uniqueNodes = Array.from(
      new Map(nodes.map(n => [n.id, n])).values()
    );
    
    const nodeIds = uniqueNodes.map(n => n.id);
    
    // Generate edges that reference these nodes
    return fc
      .array(visualEdgeArb(nodeIds), { maxLength: Math.min(15, nodeIds.length * 2) })
      .map(edges => ({
        nodes: uniqueNodes,
        edges
      }));
  });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize a graph for comparison
 * Removes position information and sorts nodes/edges for consistent comparison
 */
function normalizeGraph(graph: VisualGraph): {
  nodeIds: string[];
  nodeTypes: Record<string, string>;
  nodeLabels: Record<string, string>;
  edgePairs: string[];
} {
  return {
    nodeIds: graph.nodes.map(n => n.id).sort(),
    nodeTypes: Object.fromEntries(
      graph.nodes.map(n => [n.id, n.type])
    ),
    nodeLabels: Object.fromEntries(
      graph.nodes.map(n => [n.id, n.data.label])
    ),
    edgePairs: graph.edges
      .map(e => `${e.source}->${e.target}`)
      .sort()
  };
}

/**
 * Check if two graphs have equivalent structure
 */
function graphsAreStructurallyEquivalent(g1: VisualGraph, g2: VisualGraph): boolean {
  const n1 = normalizeGraph(g1);
  const n2 = normalizeGraph(g2);
  
  // Check node IDs match
  if (JSON.stringify(n1.nodeIds) !== JSON.stringify(n2.nodeIds)) {
    return false;
  }
  
  // Check node types match
  if (JSON.stringify(n1.nodeTypes) !== JSON.stringify(n2.nodeTypes)) {
    return false;
  }
  
  // Check node labels match
  if (JSON.stringify(n1.nodeLabels) !== JSON.stringify(n2.nodeLabels)) {
    return false;
  }
  
  // Check edges match
  if (JSON.stringify(n1.edgePairs) !== JSON.stringify(n2.edgePairs)) {
    return false;
  }
  
  return true;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Mermaid Round-Trip Property Tests', () => {
  describe('Property 4: Mermaid round-trip preserves structure', () => {
    it('**Feature: ai-manager, Property 4: Mermaid round-trip preserves structure**', () => {
      fc.assert(
        fc.property(visualGraphArb, (originalGraph) => {
          // Step 1: Convert graph to Mermaid
          const mermaid = canvasToMermaid(originalGraph);
          
          // Step 2: Parse Mermaid back to graph
          const roundTripGraph = mermaidToCanvas(mermaid);
          
          // Step 3: Verify structural equivalence
          // The graphs should have the same structure (nodes, edges, connections)
          // even though positions may differ due to auto-layout
          
          expect(roundTripGraph.nodes.length).toBe(originalGraph.nodes.length);
          expect(roundTripGraph.edges.length).toBe(originalGraph.edges.length);
          
          // Verify structural equivalence
          const equivalent = graphsAreStructurallyEquivalent(originalGraph, roundTripGraph);
          
          if (!equivalent) {
            console.log('Original graph:', normalizeGraph(originalGraph));
            console.log('Round-trip graph:', normalizeGraph(roundTripGraph));
            console.log('Generated Mermaid:', mermaid);
          }
          
          expect(equivalent).toBe(true);
        }),
        testConfig
      );
    });
  });
  
  describe('Property 4 (Edge Case): Empty graphs round-trip correctly', () => {
    it('should handle empty graphs', () => {
      const emptyGraph: VisualGraph = {
        nodes: [],
        edges: []
      };
      
      const mermaid = canvasToMermaid(emptyGraph);
      
      // Empty graphs should throw an error when parsing back
      // This is correct behavior - empty graphs are not valid
      expect(() => mermaidToCanvas(mermaid)).toThrow('No nodes found in diagram');
    });
  });
  
  describe('Property 4 (Edge Case): Single node graphs round-trip correctly', () => {
    it('should handle single node graphs', () => {
      const singleNodeGraph: VisualGraph = {
        nodes: [
          {
            id: 'A',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: { label: 'Single Node' }
          }
        ],
        edges: []
      };
      
      const mermaid = canvasToMermaid(singleNodeGraph);
      const roundTripGraph = mermaidToCanvas(mermaid);
      
      expect(roundTripGraph.nodes).toHaveLength(1);
      expect(roundTripGraph.nodes[0].id).toBe('A');
      expect(roundTripGraph.nodes[0].data.label).toBe('Single Node');
      expect(roundTripGraph.edges).toHaveLength(0);
    });
  });
  
  describe('Property 4 (Edge Case): Complex graphs with multiple paths', () => {
    it('should handle graphs with parallel paths', () => {
      const complexGraph: VisualGraph = {
        nodes: [
          {
            id: 'A',
            type: 'ux',
            position: { x: 0, y: 0 },
            data: { label: 'Start' }
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
            data: { label: 'Path 1', worker_type: 'claude' }
          },
          {
            id: 'D',
            type: 'worker',
            position: { x: 200, y: 100 },
            data: { label: 'Path 2', worker_type: 'minimax' }
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
      
      const mermaid = canvasToMermaid(complexGraph);
      const roundTripGraph = mermaidToCanvas(mermaid);
      
      expect(graphsAreStructurallyEquivalent(complexGraph, roundTripGraph)).toBe(true);
    });
  });
});
