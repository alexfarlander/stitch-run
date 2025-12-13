/**
 * Property-based tests for legacy execution engine core
 * Uses fast-check for property-based testing
 * Tests: Properties 26, 27, 28, 29, 31
 *
 * @deprecated These tests verify the legacy O(E) engine functions.
 * Modern code should use ExecutionGraph-based functions from edge-walker.ts
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getOutboundEdges,
  getTargetNodes,
  areUpstreamDependenciesCompleted,
  mergeUpstreamOutputs,
  isTerminalNode,
} from '../../src/lib/engine/legacy';
import { StitchFlow, StitchEdge, StitchNode, StitchRun, NodeState } from '@/types/stitch';

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate valid node types
 */
const nodeTypeArb = fc.constantFrom('Worker', 'UX', 'Splitter', 'Collector');

/**
 * Generate valid node status
 */
const nodeStatusArb = fc.constantFrom('pending', 'running', 'completed', 'failed', 'waiting_for_user');

/**
 * Generate a valid node
 */
const nodeArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('_')), // Avoid underscores for simplicity
  type: nodeTypeArb,
  position: fc.record({ x: fc.integer(), y: fc.integer() }),
  data: fc.object(),
});

/**
 * Generate valid edges given a list of node IDs
 */
const edgeArb = (nodeIds: string[]) => {
  if (nodeIds.length < 2) {
    return fc.constant([]);
  }
  
  return fc.array(
    fc.record({
      id: fc.uuid(),
      source: fc.constantFrom(...nodeIds),
      target: fc.constantFrom(...nodeIds),
    }).filter(edge => edge.source !== edge.target), // Prevent self-loops
    { maxLength: nodeIds.length * 2 }
  );
};

/**
 * Generate a valid flow graph
 */
const flowArb = fc.array(nodeArb, { minLength: 1, maxLength: 10 })
  .chain(nodes => {
    const nodeIds = nodes.map(n => n.id);
    return edgeArb(nodeIds).map(edges => ({
      id: fc.sample(fc.uuid(), 1)[0],
      name: fc.sample(fc.string(), 1)[0],
      graph: { nodes, edges },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  });

/**
 * Generate node states for a flow
 */
const nodeStatesArb = (nodeIds: string[]) => {
  return fc.record(
    Object.fromEntries(
      nodeIds.map(id => [
        id,
        fc.record({
          status: nodeStatusArb,
          output: fc.option(fc.anything(), { nil: undefined }),
          error: fc.option(fc.string(), { nil: undefined }),
        }),
      ])
    )
  );
};

/**
 * Generate a run for a given flow
 */
const runArb = (flow: StitchFlow) => {
  const nodeIds = flow.graph.nodes.map(n => n.id);
  return nodeStatesArb(nodeIds).map(nodeStates => ({
    id: fc.sample(fc.uuid(), 1)[0],
    flow_id: flow.id,
    node_states: nodeStates,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
};

// ============================================================================
// Property Tests
// ============================================================================

const testConfig = { numRuns: 100 };

describe('Execution Engine Property Tests', () => {
  describe('Property 26: Edge-walking identifies outbound edges', () => {
    it('**Feature: core-architecture, Property 26: Edge-walking identifies outbound edges**', () => {
      fc.assert(
        fc.property(flowArb, (flow) => {
          // For any node in the flow
          for (const node of flow.graph.nodes) {
            const outboundEdges = getOutboundEdges(node.id, flow);
            
            // All returned edges must have this node as source
            for (const edge of outboundEdges) {
              expect(edge.source).toBe(node.id);
            }
            
            // All edges with this node as source must be returned
            const expectedEdges = flow.graph.edges.filter(e => e.source === node.id);
            expect(outboundEdges.length).toBe(expectedEdges.length);
            
            // Check that all expected edges are present
            for (const expectedEdge of expectedEdges) {
              expect(outboundEdges).toContainEqual(expectedEdge);
            }
          }
        }),
        testConfig
      );
    });
  });

  describe('Property 27: Dependency checking before firing', () => {
    it('**Feature: core-architecture, Property 27: Dependency checking before firing**', () => {
      fc.assert(
        fc.property(flowArb.chain(flow => runArb(flow).map(run => ({ flow, run }))), ({ flow, run }) => {
          // For any node in the flow
          for (const node of flow.graph.nodes) {
            const canFire = areUpstreamDependenciesCompleted(node.id, flow, run);
            
            // Find all upstream nodes
            const upstreamEdges = flow.graph.edges.filter(e => e.target === node.id);
            
            if (upstreamEdges.length === 0) {
              // No dependencies means it can always fire
              expect(canFire).toBe(true);
            } else {
              // Check if all upstream nodes are completed
              const allCompleted = upstreamEdges.every(edge => {
                const sourceState = run.node_states[edge.source];
                return sourceState && sourceState.status === 'completed';
              });
              
              expect(canFire).toBe(allCompleted);
            }
          }
        }),
        testConfig
      );
    });
  });

  describe('Property 28: Node fires when dependencies satisfied', () => {
    it('**Feature: core-architecture, Property 28: Node fires when dependencies satisfied**', () => {
      fc.assert(
        fc.property(flowArb, (flow) => {
          // Create a run where all nodes are completed
          const allCompletedStates: Record<string, NodeState> = {};
          for (const node of flow.graph.nodes) {
            allCompletedStates[node.id] = {
              status: 'completed',
              output: { data: 'test' },
            };
          }
          
          const run: StitchRun = {
            id: fc.sample(fc.uuid(), 1)[0],
            flow_id: flow.id,
            node_states: allCompletedStates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // For any node, if all upstream dependencies are completed, it should be able to fire
          for (const node of flow.graph.nodes) {
            const canFire = areUpstreamDependenciesCompleted(node.id, flow, run);
            expect(canFire).toBe(true);
          }
        }),
        testConfig
      );
    });
  });

  describe('Property 29: Input merging from upstream nodes', () => {
    it('**Feature: core-architecture, Property 29: Input merging from upstream nodes**', () => {
      fc.assert(
        fc.property(flowArb, (flow) => {
          // Create a run with completed upstream nodes
          const nodeStates: Record<string, NodeState> = {};
          for (const node of flow.graph.nodes) {
            nodeStates[node.id] = {
              status: 'completed',
              output: { [`output_${node.id}`]: `value_${node.id}` },
            };
          }
          
          const run: StitchRun = {
            id: fc.sample(fc.uuid(), 1)[0],
            flow_id: flow.id,
            node_states: nodeStates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // For any node in the flow
          for (const node of flow.graph.nodes) {
            const mergedInput = mergeUpstreamOutputs(node.id, flow, run);
            
            // Find all upstream nodes
            const upstreamEdges = flow.graph.edges.filter(e => e.target === node.id);
            
            if (upstreamEdges.length === 0) {
              // No upstream nodes means empty input
              expect(mergedInput).toEqual({});
            } else {
              // All upstream outputs should be present in merged input
              for (const edge of upstreamEdges) {
                const sourceState = run.node_states[edge.source];
                if (sourceState && sourceState.output) {
                  const outputKey = `output_${edge.source}`;
                  expect(mergedInput[outputKey]).toBe(`value_${edge.source}`);
                }
              }
            }
          }
        }),
        testConfig
      );
    });
  });

  describe('Property 31: Terminal node stops edge-walking', () => {
    it('**Feature: core-architecture, Property 31: Terminal node stops edge-walking**', () => {
      fc.assert(
        fc.property(flowArb, (flow) => {
          // For any node in the flow
          for (const node of flow.graph.nodes) {
            const isTerminal = isTerminalNode(node.id, flow);
            
            // A node is terminal if it has no outbound edges
            const hasOutboundEdges = flow.graph.edges.some(e => e.source === node.id);
            
            expect(isTerminal).toBe(!hasOutboundEdges);
          }
        }),
        testConfig
      );
    });
  });
});
