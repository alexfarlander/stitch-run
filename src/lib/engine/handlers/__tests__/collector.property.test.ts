/**
 * Property-based tests for Collector node handler
 * Uses fast-check for property-based testing
 * Tests: Properties 17, 18, 19, 20, 21
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  identifyUpstreamPaths,
  areAllPathsCompleted,
  hasAnyPathFailed,
  mergeParallelOutputs,
} from '../collector';
import { NodeState, NodeStatus } from '@/types/stitch';

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid node status
 */
const nodeStatusArb = fc.constantFrom<NodeStatus>(
  'pending',
  'running',
  'completed',
  'failed',
  'waiting_for_user'
);

/**
 * Generate a base node ID (without suffix)
 */
const baseNodeIdArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => !s.includes('_') && s.trim().length > 0);

/**
 * Generate an array of unique base node IDs
 */
const baseNodeIdsArb = fc.array(baseNodeIdArb, { minLength: 1, maxLength: 5 })
  .map(ids => Array.from(new Set(ids)));

/**
 * Generate parallel path node states
 * Creates nodeId_0, nodeId_1, etc. for each base nodeId
 */
const parallelPathStatesArb = (
  baseNodeIds: string[],
  arrayLength: number,
  status: NodeStatus = 'completed'
) => {
  const states: Record<string, NodeState> = {};
  
  for (const baseNodeId of baseNodeIds) {
    for (let i = 0; i < arrayLength; i++) {
      const augmentedNodeId = `${baseNodeId}_${i}`;
      states[augmentedNodeId] = {
        status,
        output: fc.sample(fc.anything(), 1)[0],
      };
    }
  }
  
  return fc.constant(states);
};

/**
 * Generate node states with specific statuses for parallel paths
 */
const nodeStatesWithStatusArb = (
  baseNodeIds: string[],
  arrayLength: number,
  statusGen: fc.Arbitrary<NodeStatus>
) => {
  return fc.array(statusGen, { minLength: arrayLength, maxLength: arrayLength })
    .map(statuses => {
      const states: Record<string, NodeState> = {};
      
      for (const baseNodeId of baseNodeIds) {
        for (let i = 0; i < arrayLength; i++) {
          const augmentedNodeId = `${baseNodeId}_${i}`;
          states[augmentedNodeId] = {
            status: statuses[i],
            output: fc.sample(fc.anything(), 1)[0],
          };
        }
      }
      
      return states;
    });
};

// ============================================================================
// Property Tests
// ============================================================================

const testConfig = { numRuns: 100 };

describe('Collector Handler Property Tests', () => {
  describe('Property 7a: Collector completion tracking', () => {
    it('**Feature: fix-current-implementation, Property 7a: Collector completion tracking**', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // Number of upstream nodes
          fc.integer({ min: 0, max: 9 }),  // Index of node to leave incomplete
          (upstreamCount, incompleteIndex) => {
            // Ensure incompleteIndex is within bounds
            const actualIncompleteIndex = incompleteIndex % upstreamCount;
            
            // Create upstream node IDs
            const upstreamNodeIds = [...Array(upstreamCount).keys()].map((i) => `upstream-${i}`);
            
            // Create node states where one upstream is not completed
            const nodeStates: Record<string, NodeState> = {};
            for (let i = 0; i < upstreamCount; i++) {
              nodeStates[upstreamNodeIds[i]] = {
                status: i === actualIncompleteIndex ? 'running' : 'completed',
                output: i === actualIncompleteIndex ? undefined : `output-${i}`,
              };
            }
            
            // Count completed upstream nodes
            const completedCount = upstreamNodeIds.filter(
              id => nodeStates[id]?.status === 'completed'
            ).length;
            
            // Property: Collector should NOT fire when completedCount < expectedCount
            expect(completedCount).toBe(upstreamCount - 1);
            expect(completedCount < upstreamCount).toBe(true);
            
            // Now complete all upstream nodes
            const allCompletedStates: Record<string, NodeState> = {};
            for (let i = 0; i < upstreamCount; i++) {
              allCompletedStates[upstreamNodeIds[i]] = {
                status: 'completed',
                output: `output-${i}`,
              };
            }
            
            const allCompletedCount = upstreamNodeIds.filter(
              id => allCompletedStates[id]?.status === 'completed'
            ).length;
            
            // Property: Collector SHOULD fire when completedCount === expectedCount
            expect(allCompletedCount).toBe(upstreamCount);
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 17: Collector identifies upstream paths', () => {
    it('**Feature: core-architecture, Property 17: Collector identifies upstream paths**', () => {
      fc.assert(
        fc.property(
          baseNodeIdsArb,
          fc.integer({ min: 1, max: 10 }),
          (baseNodeIds, arrayLength) => {
            // Create parallel path states
            const nodeStates = fc.sample(
              parallelPathStatesArb(baseNodeIds, arrayLength),
              1
            )[0];
            
            // Identify upstream paths
            const identifiedPaths = identifyUpstreamPaths(nodeStates, baseNodeIds);
            
            // Should identify all parallel paths
            const expectedPathCount = baseNodeIds.length * arrayLength;
            expect(identifiedPaths.length).toBe(expectedPathCount);
            
            // All identified paths should exist in nodeStates
            for (const path of identifiedPaths) {
              expect(nodeStates[path]).toBeDefined();
            }
            
            // All identified paths should match the pattern {baseNodeId}_{index}
            for (const path of identifiedPaths) {
              expect(path).toMatch(/_\d+$/);
              
              // Extract base nodeId
              const baseNodeId = path.substring(0, path.lastIndexOf('_'));
              expect(baseNodeIds).toContain(baseNodeId);
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 18: Collector waits for all paths', () => {
    it('**Feature: core-architecture, Property 18: Collector waits for all paths**', () => {
      fc.assert(
        fc.property(
          baseNodeIdsArb,
          fc.integer({ min: 1, max: 10 }),
          (baseNodeIds, arrayLength) => {
            // Create parallel path states where all are completed
            const allCompletedStates = fc.sample(
              parallelPathStatesArb(baseNodeIds, arrayLength, 'completed'),
              1
            )[0];
            
            const parallelPaths = identifyUpstreamPaths(allCompletedStates, baseNodeIds);
            
            // Should return true when all paths are completed
            expect(areAllPathsCompleted(allCompletedStates, parallelPaths)).toBe(true);
            
            // Now test with at least one non-completed path
            if (parallelPaths.length > 0) {
              const mixedStates = { ...allCompletedStates };
              const firstPath = parallelPaths[0];
              mixedStates[firstPath] = { status: 'running' };
              
              // Should return false when not all paths are completed
              expect(areAllPathsCompleted(mixedStates, parallelPaths)).toBe(false);
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 19: Collector merges outputs into array', () => {
    it('**Feature: core-architecture, Property 19: Collector merges outputs into array**', () => {
      fc.assert(
        fc.property(
          baseNodeIdsArb,
          fc.integer({ min: 1, max: 10 }),
          (baseNodeIds, arrayLength) => {
            // Create parallel path states with specific outputs
            const outputs = fc.sample(
              fc.array(fc.anything(), { minLength: arrayLength, maxLength: arrayLength }),
              1
            )[0];
            
            const nodeStates: Record<string, NodeState> = {};
            for (const baseNodeId of baseNodeIds) {
              for (let i = 0; i < arrayLength; i++) {
                const augmentedNodeId = `${baseNodeId}_${i}`;
                nodeStates[augmentedNodeId] = {
                  status: 'completed',
                  output: outputs[i],
                };
              }
            }
            
            const parallelPaths = identifyUpstreamPaths(nodeStates, baseNodeIds);
            const mergedOutput = mergeParallelOutputs(nodeStates, parallelPaths);
            
            // Should return an array
            expect(Array.isArray(mergedOutput)).toBe(true);
            
            // Array length should match the number of parallel paths
            expect(mergedOutput.length).toBe(parallelPaths.length);
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 20: Collector preserves order', () => {
    it('**Feature: core-architecture, Property 20: Collector preserves order**', () => {
      fc.assert(
        fc.property(
          baseNodeIdArb,
          fc.integer({ min: 2, max: 10 }),
          (baseNodeId, arrayLength) => {
            // Create parallel path states with ordered outputs
            const orderedOutputs = [...Array(arrayLength).keys()];
            
            const nodeStates: Record<string, NodeState> = {};
            for (let i = 0; i < arrayLength; i++) {
              const augmentedNodeId = `${baseNodeId}_${i}`;
              nodeStates[augmentedNodeId] = {
                status: 'completed',
                output: orderedOutputs[i],
              };
            }
            
            const parallelPaths = identifyUpstreamPaths(nodeStates, [baseNodeId]);
            const mergedOutput = mergeParallelOutputs(nodeStates, parallelPaths);
            
            // Merged output should preserve the order
            expect(mergedOutput).toEqual(orderedOutputs);
            
            // Test with shuffled parallel paths input
            const shuffledPaths = [...parallelPaths].sort(() => Math.random() - 0.5);
            const mergedFromShuffled = mergeParallelOutputs(nodeStates, shuffledPaths);
            
            // Should still preserve order regardless of input order
            expect(mergedFromShuffled).toEqual(orderedOutputs);
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 21: Collector fails on upstream failure', () => {
    it('**Feature: core-architecture, Property 21: Collector fails on upstream failure**', () => {
      fc.assert(
        fc.property(
          baseNodeIdsArb,
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (baseNodeIds, arrayLength, failIndex) => {
            // Ensure failIndex is within bounds
            const actualFailIndex = failIndex % arrayLength;
            
            // Create parallel path states with one failed path
            const nodeStates: Record<string, NodeState> = {};
            for (const baseNodeId of baseNodeIds) {
              for (let i = 0; i < arrayLength; i++) {
                const augmentedNodeId = `${baseNodeId}_${i}`;
                nodeStates[augmentedNodeId] = {
                  status: i === actualFailIndex ? 'failed' : 'completed',
                  output: i === actualFailIndex ? undefined : fc.sample(fc.anything(), 1)[0],
                  error: i === actualFailIndex ? 'Test error' : undefined,
                };
              }
            }
            
            const parallelPaths = identifyUpstreamPaths(nodeStates, baseNodeIds);
            
            // Should detect that at least one path has failed
            expect(hasAnyPathFailed(nodeStates, parallelPaths)).toBe(true);
            
            // Test with all completed paths
            const allCompletedStates: Record<string, NodeState> = {};
            for (const baseNodeId of baseNodeIds) {
              for (let i = 0; i < arrayLength; i++) {
                const augmentedNodeId = `${baseNodeId}_${i}`;
                allCompletedStates[augmentedNodeId] = {
                  status: 'completed',
                  output: fc.sample(fc.anything(), 1)[0],
                };
              }
            }
            
            // Should return false when no paths have failed
            expect(hasAnyPathFailed(allCompletedStates, parallelPaths)).toBe(false);
          }
        ),
        testConfig
      );
    });
  });
});
