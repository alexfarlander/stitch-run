/**
 * Property-based tests for BMC seed script
 * Uses fast-check for property-based testing
 * Tests: Properties 7, 8, 11
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { generateBMCGraph, seedDefaultBMC } from '../default-bmc';
import { createServerClient } from '../../supabase/server';
import type { SectionNode } from '../../../types/stitch';

// ============================================================================
// Test Configuration
// ============================================================================

const testConfig = { numRuns: 100 };

// Expected BMC section names
const EXPECTED_SECTION_NAMES = [
  'Data',
  'People',
  'Integrations',
  'Code',
  'Offers',
  'Sales',
  'Marketing',
  'Products',
  'Support',
  'Recommendations',
  'Costs',
  'Revenue',
];

// Expected positions for each section
const EXPECTED_POSITIONS: Record<string, { x: number; y: number }> = {
  'Data': { x: 100, y: 100 },
  'People': { x: 100, y: 300 },
  'Integrations': { x: 100, y: 500 },
  'Code': { x: 100, y: 700 },
  'Offers': { x: 400, y: 100 },
  'Sales': { x: 400, y: 300 },
  'Marketing': { x: 400, y: 500 },
  'Products': { x: 400, y: 700 },
  'Support': { x: 400, y: 900 },
  'Recommendations': { x: 400, y: 1100 },
  'Costs': { x: 700, y: 100 },
  'Revenue': { x: 700, y: 300 },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates that a graph has valid React Flow structure
 */
function isValidReactFlowStructure(graph: { nodes: any[]; edges: any[] }): boolean {
  // Must have nodes and edges arrays
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return false;
  }
  
  // Each node must have required properties
  for (const node of graph.nodes) {
    if (!node.id || !node.type || !node.position || !node.data) {
      return false;
    }
    
    // Position must have x and y coordinates
    if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      return false;
    }
  }
  
  // Each edge must have required properties
  for (const edge of graph.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      return false;
    }
    
    // Source and target must reference existing nodes
    const sourceExists = graph.nodes.some(n => n.id === edge.source);
    const targetExists = graph.nodes.some(n => n.id === edge.target);
    
    if (!sourceExists || !targetExists) {
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('BMC Seed Script Property Tests', () => {
  describe('Property 7: BMC graph structure validity', () => {
    it('**Feature: bmc-database-update, Property 7: BMC graph structure validity**', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No random input needed - testing deterministic function
          () => {
            // Generate BMC graph
            const graph = generateBMCGraph();
            
            // Should contain exactly 12 nodes
            expect(graph.nodes.length).toBe(12);
            
            // All nodes should have type 'section'
            for (const node of graph.nodes) {
              expect(node.type).toBe('section');
            }
            
            // Should have valid React Flow structure
            expect(isValidReactFlowStructure(graph)).toBe(true);
            
            // Each node should have required data properties
            for (const node of graph.nodes as SectionNode[]) {
              expect(node.data.label).toBeDefined();
              expect(typeof node.data.label).toBe('string');
              expect(node.data.category).toBeDefined();
              expect(['Production', 'Customer', 'Financial']).toContain(node.data.category);
            }
            
            // All node IDs should be unique
            const nodeIds = graph.nodes.map(n => n.id);
            const uniqueIds = new Set(nodeIds);
            expect(uniqueIds.size).toBe(nodeIds.length);
            
            // All edge IDs should be unique
            const edgeIds = graph.edges.map(e => e.id);
            const uniqueEdgeIds = new Set(edgeIds);
            expect(uniqueEdgeIds.size).toBe(edgeIds.length);
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 8: BMC section names completeness', () => {
    it('**Feature: bmc-database-update, Property 8: BMC section names completeness**', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No random input needed - testing deterministic function
          () => {
            // Generate BMC graph
            const graph = generateBMCGraph();
            
            // Extract all node labels
            const nodeLabels = (graph.nodes as SectionNode[]).map(n => n.data.label);
            
            // Should have exactly 12 labels
            expect(nodeLabels.length).toBe(12);
            
            // Labels should match expected section names exactly
            const labelSet = new Set(nodeLabels);
            const expectedSet = new Set(EXPECTED_SECTION_NAMES);
            
            expect(labelSet.size).toBe(expectedSet.size);
            
            // Every expected section should be present
            for (const expectedName of EXPECTED_SECTION_NAMES) {
              expect(labelSet.has(expectedName)).toBe(true);
            }
            
            // No extra sections should be present
            for (const label of nodeLabels) {
              expect(expectedSet.has(label)).toBe(true);
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 11: Seed script idempotence', () => {
    let createdBMCIds: string[] = [];
    
    beforeEach(async () => {
      // Clean up any existing BMCs before each test
      const supabase = createServerClient();
      await supabase
        .from('stitch_flows')
        .delete()
        .eq('canvas_type', 'bmc')
        .eq('name', 'Default Business Model Canvas');
      
      createdBMCIds = [];
    });
    
    afterEach(async () => {
      // Clean up created BMCs after each test
      if (createdBMCIds.length > 0) {
        const supabase = createServerClient();
        await supabase
          .from('stitch_flows')
          .delete()
          .in('id', createdBMCIds);
      }
    });
    
    it('**Feature: bmc-database-update, Property 11: Seed script idempotence**', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of times to run seed script
          async (runCount) => {
            const returnedIds: string[] = [];
            
            // Run seed script multiple times
            for (let i = 0; i < runCount; i++) {
              const bmcId = await seedDefaultBMC();
              returnedIds.push(bmcId);
              
              // Track for cleanup
              if (!createdBMCIds.includes(bmcId)) {
                createdBMCIds.push(bmcId);
              }
            }
            
            // All returned IDs should be the same (idempotence)
            const uniqueIds = new Set(returnedIds);
            expect(uniqueIds.size).toBe(1);
            
            // Verify only one BMC exists in database
            const supabase = createServerClient();
            const { data: bmcs, error } = await supabase
              .from('stitch_flows')
              .select('id')
              .eq('canvas_type', 'bmc')
              .eq('name', 'Default Business Model Canvas');
            
            expect(error).toBeNull();
            expect(bmcs).toBeDefined();
            expect(bmcs!.length).toBe(1);
            
            // The BMC ID should match the returned IDs
            expect(bmcs![0].id).toBe(returnedIds[0]);
          }
        ),
        { ...testConfig, numRuns: 10 } // Reduce runs for async database tests
      );
    });
  });
});
