/**
 * Property-based tests for splitter/collector validation
 * 
 * Feature: ai-manager
 * Property 9: AI Manager includes splitter/collector pairs
 * Validates: Requirements 4.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateSplitterCollectorPairs, validateGraph } from '../validate-graph';
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
 * Generate a simple visual node
 */
function createNode(id: string, type: string, x: number, y: number): VisualNode {
  return {
    id,
    type,
    position: { x, y },
    data: { label: `${type} ${id}` },
  };
}

/**
 * Generate a visual edge between two nodes
 */
function createEdge(sourceId: string, targetId: string): VisualEdge {
  return {
    id: `e-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
  };
}

/**
 * Generate a valid splitter-collector graph
 * Pattern: Start -> Splitter -> Worker(s) -> Collector -> End
 * Ensures at least 2 workers for proper parallel fanout/fanin
 */
const validSplitterCollectorGraphArbitrary = fc.integer({ min: 2, max: 5 }).map(workerCount => {
  const nodes: VisualNode[] = [
    createNode('start', 'ux', 0, 0),
    createNode('splitter', 'splitter', 100, 0),
  ];

  // Add worker nodes (at least 2 for proper parallel pattern)
  for (let i = 0; i < workerCount; i++) {
    nodes.push(createNode(`worker-${i}`, 'worker', 200, i * 100));
  }

  nodes.push(createNode('collector', 'collector', 300, 0));
  nodes.push(createNode('end', 'ux', 400, 0));

  const edges: VisualEdge[] = [
    createEdge('start', 'splitter'),
  ];

  // Connect splitter to all workers
  for (let i = 0; i < workerCount; i++) {
    edges.push(createEdge('splitter', `worker-${i}`));
  }

  // Connect all workers to collector
  for (let i = 0; i < workerCount; i++) {
    edges.push(createEdge(`worker-${i}`, 'collector'));
  }

  edges.push(createEdge('collector', 'end'));

  return { nodes, edges };
});

/**
 * Generate a graph with a splitter but no collector
 */
const splitterWithoutCollectorArbitrary = fc.integer({ min: 1, max: 3 }).map(workerCount => {
  const nodes: VisualNode[] = [
    createNode('start', 'ux', 0, 0),
    createNode('splitter', 'splitter', 100, 0),
  ];

  // Add worker nodes
  for (let i = 0; i < workerCount; i++) {
    nodes.push(createNode(`worker-${i}`, 'worker', 200, i * 100));
  }

  const edges: VisualEdge[] = [
    createEdge('start', 'splitter'),
  ];

  // Connect splitter to all workers (but no collector)
  for (let i = 0; i < workerCount; i++) {
    edges.push(createEdge('splitter', `worker-${i}`));
  }

  return { nodes, edges };
});

/**
 * Generate a graph with a collector but no splitter
 */
const collectorWithoutSplitterArbitrary = fc.integer({ min: 1, max: 3 }).map(workerCount => {
  const nodes: VisualNode[] = [
    createNode('start', 'ux', 0, 0),
  ];

  // Add worker nodes
  for (let i = 0; i < workerCount; i++) {
    nodes.push(createNode(`worker-${i}`, 'worker', 100, i * 100));
  }

  nodes.push(createNode('collector', 'collector', 200, 0));
  nodes.push(createNode('end', 'ux', 300, 0));

  const edges: VisualEdge[] = [
    createEdge('start', 'worker-0'),
  ];

  // Connect workers to collector (but no splitter)
  for (let i = 0; i < workerCount; i++) {
    edges.push(createEdge(`worker-${i}`, 'collector'));
  }

  edges.push(createEdge('collector', 'end'));

  return { nodes, edges };
});

/**
 * Generate a graph with an isolated splitter (no downstream connections)
 */
const isolatedSplitterArbitrary = fc.constant({
  nodes: [
    createNode('start', 'ux', 0, 0),
    createNode('splitter', 'splitter', 100, 0),
    createNode('end', 'ux', 200, 0),
  ],
  edges: [
    createEdge('start', 'end'),
  ],
});

/**
 * Generate a graph with an isolated collector (no upstream connections)
 */
const isolatedCollectorArbitrary = fc.constant({
  nodes: [
    createNode('start', 'ux', 0, 0),
    createNode('collector', 'collector', 100, 0),
    createNode('end', 'ux', 200, 0),
  ],
  edges: [
    createEdge('start', 'end'),
  ],
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Splitter/Collector Validation - Property Tests', () => {
  
  /**
   * Feature: ai-manager, Property 9: AI Manager includes splitter/collector pairs
   * Validates: Requirements 4.3
   */
  describe('Property 9: Splitter/collector pair validation', () => {
    
    it('for any valid splitter-collector graph, validation should return no splitter/collector errors', () => {
      fc.assert(
        fc.property(validSplitterCollectorGraphArbitrary, (graph) => {
          const errors = validateSplitterCollectorPairs(graph);
          
          // A valid splitter-collector graph should have no errors
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with a splitter but no collector, validation should return errors', () => {
      fc.assert(
        fc.property(splitterWithoutCollectorArbitrary, (graph) => {
          const errors = validateSplitterCollectorPairs(graph);
          
          // Should have at least one error about the splitter
          expect(errors.length).toBeGreaterThan(0);
          
          // Check that there's an error about the splitter
          const splitterError = errors.find(e => 
            e.type === 'splitter_collector_mismatch' && 
            e.node === 'splitter'
          );
          expect(splitterError).toBeDefined();
          // Could be either "only connects to one" or "does not connect to any Collector"
          expect(
            splitterError?.message.includes('does not connect to any Collector') ||
            splitterError?.message.includes('only connects to one downstream node')
          ).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with a collector but no splitter, validation should return errors', () => {
      fc.assert(
        fc.property(collectorWithoutSplitterArbitrary, (graph) => {
          const errors = validateSplitterCollectorPairs(graph);
          
          // Should have at least one error about the collector
          expect(errors.length).toBeGreaterThan(0);
          
          // Check that there's an error about the collector
          const collectorError = errors.find(e => 
            e.type === 'splitter_collector_mismatch' && 
            e.node === 'collector'
          );
          expect(collectorError).toBeDefined();
          // Could be either "only has one upstream" or "no upstream Splitter"
          expect(
            collectorError?.message.includes('no upstream Splitter') ||
            collectorError?.message.includes('only has one upstream connection')
          ).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with an isolated splitter, validation should return an error', () => {
      fc.assert(
        fc.property(isolatedSplitterArbitrary, (graph) => {
          const errors = validateSplitterCollectorPairs(graph);
          
          // Should have at least one error about the isolated splitter
          expect(errors.length).toBeGreaterThan(0);
          
          const splitterError = errors.find(e => 
            e.type === 'splitter_collector_mismatch' && 
            e.node === 'splitter'
          );
          expect(splitterError).toBeDefined();
          expect(splitterError?.message).toContain('no downstream connections');
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with an isolated collector, validation should return an error', () => {
      fc.assert(
        fc.property(isolatedCollectorArbitrary, (graph) => {
          const errors = validateSplitterCollectorPairs(graph);
          
          // Should have at least one error about the isolated collector
          expect(errors.length).toBeGreaterThan(0);
          
          const collectorError = errors.find(e => 
            e.type === 'splitter_collector_mismatch' && 
            e.node === 'collector'
          );
          expect(collectorError).toBeDefined();
          expect(collectorError?.message).toContain('no upstream connections');
        }),
        { numRuns: 100 }
      );
    });

    it('for any splitter with only one downstream connection, validation should return an error', () => {
      const graph: VisualGraph = {
        nodes: [
          createNode('start', 'ux', 0, 0),
          createNode('splitter', 'splitter', 100, 0),
          createNode('worker', 'worker', 200, 0),
          createNode('collector', 'collector', 300, 0),
          createNode('end', 'ux', 400, 0),
        ],
        edges: [
          createEdge('start', 'splitter'),
          createEdge('splitter', 'worker'),  // Only one downstream
          createEdge('worker', 'collector'),
          createEdge('collector', 'end'),
        ],
      };

      const errors = validateSplitterCollectorPairs(graph);
      
      // Should have an error about single downstream connection
      const splitterError = errors.find(e => 
        e.type === 'splitter_collector_mismatch' && 
        e.node === 'splitter' &&
        e.message.includes('only connects to one downstream node')
      );
      expect(splitterError).toBeDefined();
    });

    it('for any collector with only one upstream connection, validation should return an error', () => {
      const graph: VisualGraph = {
        nodes: [
          createNode('start', 'ux', 0, 0),
          createNode('splitter', 'splitter', 100, 0),
          createNode('worker', 'worker', 200, 0),
          createNode('collector', 'collector', 300, 0),
          createNode('end', 'ux', 400, 0),
        ],
        edges: [
          createEdge('start', 'splitter'),
          createEdge('splitter', 'worker'),
          createEdge('worker', 'collector'),  // Only one upstream
          createEdge('collector', 'end'),
        ],
      };

      const errors = validateSplitterCollectorPairs(graph);
      
      // Should have an error about single upstream connection
      const collectorError = errors.find(e => 
        e.type === 'splitter_collector_mismatch' && 
        e.node === 'collector' &&
        e.message.includes('only has one upstream connection')
      );
      expect(collectorError).toBeDefined();
    });

    it('for any graph without splitters or collectors, validation should return no errors', () => {
      const simpleGraph: VisualGraph = {
        nodes: [
          createNode('start', 'ux', 0, 0),
          createNode('worker', 'worker', 100, 0),
          createNode('end', 'ux', 200, 0),
        ],
        edges: [
          createEdge('start', 'worker'),
          createEdge('worker', 'end'),
        ],
      };

      const errors = validateSplitterCollectorPairs(simpleGraph);
      
      // A graph without splitters or collectors should have no splitter/collector errors
      expect(errors).toHaveLength(0);
    });

    it('validation should be case-insensitive for node types', () => {
      const graph: VisualGraph = {
        nodes: [
          createNode('start', 'ux', 0, 0),
          { ...createNode('splitter', 'SPLITTER', 100, 0) },
          createNode('worker-0', 'worker', 200, 0),
          createNode('worker-1', 'worker', 200, 100),
          { ...createNode('collector', 'COLLECTOR', 300, 0) },
          createNode('end', 'ux', 400, 0),
        ],
        edges: [
          createEdge('start', 'splitter'),
          createEdge('splitter', 'worker-0'),
          createEdge('splitter', 'worker-1'),
          createEdge('worker-0', 'collector'),
          createEdge('worker-1', 'collector'),
          createEdge('collector', 'end'),
        ],
      };

      const errors = validateSplitterCollectorPairs(graph);
      
      // Should recognize uppercase node types and have no errors
      expect(errors).toHaveLength(0);
    });

    it('for any valid splitter-collector graph, validateGraph should not report splitter/collector errors', () => {
      fc.assert(
        fc.property(validSplitterCollectorGraphArbitrary, (graph) => {
          const errors = validateGraph(graph);
          
          // Filter for splitter/collector errors
          const splitterCollectorErrors = errors.filter(e => 
            e.type === 'splitter_collector_mismatch'
          );
          
          // A valid graph should have no splitter/collector errors
          expect(splitterCollectorErrors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('for any graph with splitter but no collector, validateGraph should report errors', () => {
      fc.assert(
        fc.property(splitterWithoutCollectorArbitrary, (graph) => {
          const errors = validateGraph(graph);
          
          // Filter for splitter/collector errors
          const splitterCollectorErrors = errors.filter(e => 
            e.type === 'splitter_collector_mismatch'
          );
          
          // Should have at least one splitter/collector error
          expect(splitterCollectorErrors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
