/**
 * Property-based tests for entity position tracking
 * Uses fast-check for property-based testing
 * Tests: Properties 1, 2
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Test Setup
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const _supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const testConfig = { numRuns: 100 };

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid UUID
 */
const uuidArb = fc.uuid();

/**
 * Generate a valid node ID (non-empty, non-whitespace)
 */
const nodeIdArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

/**
 * Generate a valid edge ID (non-empty, non-whitespace)
 */
const edgeIdArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

/**
 * Generate a valid edge progress value (0.0 to 1.0)
 */
const edgeProgressArb = fc.float({ min: 0, max: 1, noNaN: true });

/**
 * Generate an entity at a node (node position only)
 */
const entityAtNodeArb = fc.record({
  current_node_id: nodeIdArb,
  current_edge_id: fc.constant(null),
  edge_progress: fc.constant(null),
});

/**
 * Generate an entity on an edge (edge position only)
 */
const entityOnEdgeArb = fc.record({
  current_node_id: fc.constant(null),
  current_edge_id: edgeIdArb,
  edge_progress: edgeProgressArb,
});

/**
 * Generate an unpositioned entity (no position)
 */
const entityUnpositionedArb = fc.record({
  current_node_id: fc.constant(null),
  current_edge_id: fc.constant(null),
  edge_progress: fc.constant(null),
});

/**
 * Generate a valid entity position (one of three valid states)
 */
const validEntityPositionArb = fc.oneof(
  entityAtNodeArb,
  entityOnEdgeArb,
  entityUnpositionedArb
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test canvas for entity testing
 */
async function createTestCanvas(): Promise<string> {
  const { data, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: `Test Canvas ${Date.now()}`,
      graph: { nodes: [], edges: [] },
      canvas_type: 'workflow',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Create a test entity with specified position
 */
async function createTestEntity(
  canvasId: string,
  position: {
    current_node_id: string | null;
    current_edge_id: string | null;
    edge_progress: number | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('stitch_entities')
    .insert({
      canvas_id: canvasId,
      name: `Test Entity ${Date.now()}`,
      entity_type: 'test',
      ...position,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating entity:', error, 'Position:', position);
    throw error;
  }
  return data.id;
}

/**
 * Clean up test entity
 */
async function cleanupEntity(entityId: string): Promise<void> {
  await supabase.from('stitch_entities').delete().eq('id', entityId);
}

/**
 * Clean up test canvas
 */
async function cleanupCanvas(canvasId: string): Promise<void> {
  await supabase.from('stitch_flows').delete().eq('id', canvasId);
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Entity Position Tracking Property Tests', () => {
  describe('Property 1: Position mutual exclusivity', () => {
    it('**Feature: entity-tracking-system, Property 1: Position mutual exclusivity**', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEntityPositionArb,
          async (position) => {
            let canvasId: string | null = null;
            let entityId: string | null = null;

            try {
              // Create test canvas
              canvasId = await createTestCanvas();

              // Create entity with the generated position
              entityId = await createTestEntity(canvasId, position);

              // Fetch the entity back from database
              const { data: entity, error } = await supabase
                .from('stitch_entities')
                .select('current_node_id, current_edge_id, edge_progress')
                .eq('id', entityId)
                .single();

              if (error) {
                console.error('Error fetching entity:', error);
                throw error;
              }

              // Verify mutual exclusivity constraint
              const atNode = entity.current_node_id !== null;
              const onEdge = entity.current_edge_id !== null && entity.edge_progress !== null;
              const unpositioned = 
                entity.current_node_id === null && 
                entity.current_edge_id === null && 
                entity.edge_progress === null;

              // Exactly one of these should be true
              const validStates = [atNode, onEdge, unpositioned];
              const trueCount = validStates.filter(Boolean).length;

              expect(trueCount).toBe(1);

              // Additional checks for each state
              if (atNode) {
                expect(entity.current_edge_id).toBeNull();
                expect(entity.edge_progress).toBeNull();
              }

              if (onEdge) {
                expect(entity.current_node_id).toBeNull();
                expect(entity.edge_progress).not.toBeNull();
              }

              if (unpositioned) {
                expect(entity.current_node_id).toBeNull();
                expect(entity.current_edge_id).toBeNull();
                expect(entity.edge_progress).toBeNull();
              }
            } finally {
              // Cleanup
              if (entityId) await cleanupEntity(entityId);
              if (canvasId) await cleanupCanvas(canvasId);
            }
          }
        ),
        testConfig
      );
    }, 60000); // 60 second timeout for cloud database
  });

  describe('Property 2: Edge progress bounds', () => {
    it('**Feature: entity-tracking-system, Property 2: Edge progress bounds**', async () => {
      await fc.assert(
        fc.asyncProperty(
          edgeIdArb,
          edgeProgressArb,
          async (edgeId, progress) => {
            let canvasId: string | null = null;
            let entityId: string | null = null;

            try {
              // Create test canvas
              canvasId = await createTestCanvas();

              // Create entity on edge with progress
              entityId = await createTestEntity(canvasId, {
                current_node_id: null,
                current_edge_id: edgeId,
                edge_progress: progress,
              });

              // Fetch the entity back from database
              const { data: entity, error } = await supabase
                .from('stitch_entities')
                .select('edge_progress')
                .eq('id', entityId)
                .single();

              if (error) throw error;

              // Verify progress is within bounds
              expect(entity.edge_progress).not.toBeNull();
              expect(entity.edge_progress).toBeGreaterThanOrEqual(0.0);
              expect(entity.edge_progress).toBeLessThanOrEqual(1.0);
            } finally {
              // Cleanup
              if (entityId) await cleanupEntity(entityId);
              if (canvasId) await cleanupCanvas(canvasId);
            }
          }
        ),
        testConfig
      );
    }, 60000); // 60 second timeout for cloud database
  });
});
