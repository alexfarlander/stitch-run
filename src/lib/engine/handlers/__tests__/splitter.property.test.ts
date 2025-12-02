/**
 * Property-based tests for Splitter node handler
 * Uses fast-check for property-based testing
 * Tests: Properties 14, 15, 16
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  extractArray,
  createParallelPathStates,
} from '../splitter';

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid array path (simple or nested)
 */
const arrayPathArb = fc.oneof(
  fc.constantFrom('items', 'data', 'results', 'values'),
  fc.constantFrom('data.items', 'response.results', 'payload.data')
);

/**
 * Generate an input object with an array at a specific path
 */
const inputWithArrayArb = (arrayPath: string, array: any[]) => {
  const pathParts = arrayPath.split('.');
  
  if (pathParts.length === 1) {
    // Simple path
    return fc.constant({ [pathParts[0]]: array });
  } else {
    // Nested path
    let obj: any = { [pathParts[pathParts.length - 1]]: array };
    for (let i = pathParts.length - 2; i >= 0; i--) {
      obj = { [pathParts[i]]: obj };
    }
    return fc.constant(obj);
  }
};

/**
 * Generate downstream node IDs
 */
const downstreamNodeIdsArb = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('_')),
  { minLength: 1, maxLength: 5 }
).map(ids => Array.from(new Set(ids))); // Ensure unique IDs

// ============================================================================
// Property Tests
// ============================================================================

const testConfig = { numRuns: 100 };

describe('Splitter Handler Property Tests', () => {
  describe('Property 14: Splitter creates parallel paths', () => {
    it('**Feature: core-architecture, Property 14: Splitter creates parallel paths**', () => {
      fc.assert(
        fc.property(
          downstreamNodeIdsArb,
          fc.array(fc.anything(), { minLength: 1, maxLength: 10 }),
          (downstreamNodeIds, arrayElements) => {
            // Create parallel path states
            const parallelStates = createParallelPathStates(downstreamNodeIds, arrayElements);
            
            // For an array of length N and M downstream nodes, we should have N * M parallel paths
            const expectedPathCount = arrayElements.length * downstreamNodeIds.length;
            expect(Object.keys(parallelStates).length).toBe(expectedPathCount);
            
            // Each parallel path should exist
            for (let i = 0; i < arrayElements.length; i++) {
              for (const nodeId of downstreamNodeIds) {
                const augmentedNodeId = `${nodeId}_${i}`;
                expect(parallelStates[augmentedNodeId]).toBeDefined();
              }
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 15: Splitter array extraction', () => {
    it('**Feature: core-architecture, Property 15: Splitter array extraction**', () => {
      fc.assert(
        fc.property(
          arrayPathArb,
          fc.array(fc.anything(), { minLength: 0, maxLength: 10 }),
          (arrayPath, array) => {
            // Generate input with array at the specified path
            const input = fc.sample(inputWithArrayArb(arrayPath, array), 1)[0];
            
            // Extract the array
            const extracted = extractArray(input, arrayPath);
            
            // The extracted array should match the original array
            expect(extracted).toEqual(array);
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 16: Splitter path tracking with suffixes', () => {
    it('**Feature: core-architecture, Property 16: Splitter path tracking with suffixes**', () => {
      fc.assert(
        fc.property(
          downstreamNodeIdsArb,
          fc.array(fc.anything(), { minLength: 1, maxLength: 10 }),
          (downstreamNodeIds, arrayElements) => {
            // Create parallel path states
            const parallelStates = createParallelPathStates(downstreamNodeIds, arrayElements);
            
            // All keys should follow the pattern {nodeId}_{index}
            for (const key of Object.keys(parallelStates)) {
              // Key should contain an underscore
              expect(key).toMatch(/_\d+$/);
              
              // Extract the index from the key
              const match = key.match(/_(\d+)$/);
              expect(match).not.toBeNull();
              
              if (match) {
                const index = parseInt(match[1], 10);
                // Index should be within array bounds
                expect(index).toBeGreaterThanOrEqual(0);
                expect(index).toBeLessThan(arrayElements.length);
                
                // The base nodeId (without suffix) should be in downstreamNodeIds
                const baseNodeId = key.substring(0, key.lastIndexOf('_'));
                expect(downstreamNodeIds).toContain(baseNodeId);
                
                // The state should have the correct array element as output
                expect(parallelStates[key].output).toEqual(arrayElements[index]);
              }
            }
          }
        ),
        testConfig
      );
    });
  });
});
