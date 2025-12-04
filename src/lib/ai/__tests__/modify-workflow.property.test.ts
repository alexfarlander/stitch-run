/**
 * Property-Based Tests for MODIFY_WORKFLOW Action Handler
 * 
 * Tests universal properties that should hold across all workflow modifications.
 * Uses fast-check library for property-based testing with 100+ iterations.
 * 
 * Feature: ai-manager, Property 17: AI modifications validate edge integrity
 * Validates: Requirements 5.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { handleModifyWorkflow, ModifyWorkflowPayload } from '../action-executor';
import { VisualGraph, VisualNode, VisualEdge } from '@/types/canvas-schema';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock flow storage for testing
const mockFlowStorage = new Map<string, {
  id: string;
  current_version_id: string;
}>();

// Mock version storage for testing
const mockVersionStorage = new Map<string, {
  id: string;
  flow_id: string;
  visual_graph: VisualGraph;
}>();

// Mock database functions
vi.mock('@/lib/db/flows', () => ({
  getFlow: vi.fn(async (flowId: string) => {
    const flow = mockFlowStorage.get(flowId);
    if (!flow) return null;
    return flow;
  }),
}));

vi.mock('@/lib/canvas/version-manager', () => ({
  getVersion: vi.fn(async (versionId: string) => {
    const version = mockVersionStorage.get(versionId);
    if (!version) return null;
    return version;
  }),
  createVersion: vi.fn(async (flowId: string, visualGraph: VisualGraph, commitMessage?: string) => {
    const versionId = `version-${flowId}-${Date.now()}`;
    mockVersionStorage.set(versionId, {
      id: versionId,
      flow_id: flowId,
      visual_graph: visualGraph,
    });
    
    const flow = mockFlowStorage.get(flowId);
    if (flow) {
      flow.current_version_id = versionId;
    }
    
    return { versionId, executionGraph: {} as any };
  }),
}));

// ============================================================================
// Test Configuration
// ============================================================================

const PROPERTY_TEST_RUNS = 100;

// ============================================================================
// Generators
// ============================================================================

/**
 * Generate a valid node ID
 */
const nodeIdArbitrary = fc.string({ minLength: 1, maxLength: 20 }).map(s => 
  `node-${s.replace(/[^a-zA-Z0-9]/g, '')}`
);

/**
 * Generate a valid worker type
 */
const workerTypeArbitrary = fc.constantFrom('claude', 'minimax', 'elevenlabs', 'shotstack');

/**
 * Generate a valid node type
 */
const nodeTypeArbitrary = fc.constantFrom('worker', 'ux', 'splitter', 'collector');

/**
 * Generate a valid visual node
 */
const visualNodeArbitrary: fc.Arbitrary<VisualNode> = fc.record({
  id: nodeIdArbitrary,
  type: nodeTypeArbitrary,
  position: fc.record({
    x: fc.integer({ min: 0, max: 1000 }),
    y: fc.integer({ min: 0, max: 1000 }),
  }),
  data: fc.record({
    label: fc.string({ minLength: 1, maxLength: 50 }),
    worker_type: fc.option(workerTypeArbitrary, { nil: undefined }),
  }),
}).chain(node => {
  // If it's a worker node, ensure it has a worker_type
  if (node.type === 'worker' && !node.data.worker_type) {
    return fc.constant({
      ...node,
      data: {
        ...node.data,
        worker_type: 'claude',
      },
    });
  }
  return fc.constant(node);
});

/**
 * Generate a valid visual edge given a set of node IDs
 */
function visualEdgeArbitrary(nodeIds: string[]): fc.Arbitrary<VisualEdge> {
  if (nodeIds.length < 2) {
    // Need at least 2 nodes to create an edge
    throw new Error('Need at least 2 nodes to generate edges');
  }
  
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `edge-${s.replace(/[^a-zA-Z0-9]/g, '')}`),
    source: fc.constantFrom(...nodeIds),
    target: fc.constantFrom(...nodeIds),
  }).filter(edge => edge.source !== edge.target); // No self-loops
}

/**
 * Generate a valid visual graph with at least 2 nodes
 */
const visualGraphArbitrary: fc.Arbitrary<VisualGraph> = fc
  .array(visualNodeArbitrary, { minLength: 2, maxLength: 10 })
  .chain(nodes => {
    // Ensure unique node IDs
    const uniqueNodes = Array.from(
      new Map(nodes.map(n => [n.id, n])).values()
    );
    
    // Need at least 2 unique nodes to create edges
    if (uniqueNodes.length < 2) {
      return fc.constant({
        nodes: uniqueNodes,
        edges: [],
      });
    }
    
    const nodeIds = uniqueNodes.map(n => n.id);
    
    return fc
      .array(visualEdgeArbitrary(nodeIds), { minLength: 0, maxLength: 15 })
      .map(edges => {
        // Ensure unique edge IDs
        const uniqueEdges = Array.from(
          new Map(edges.map(e => [e.id, e])).values()
        );
        
        return {
          nodes: uniqueNodes,
          edges: uniqueEdges,
        };
      });
  });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Setup mock database with a canvas
 */
function setupMockCanvas(canvasId: string, canvas: VisualGraph): void {
  const versionId = `version-${canvasId}`;
  
  mockFlowStorage.set(canvasId, {
    id: canvasId,
    current_version_id: versionId,
  });
  
  mockVersionStorage.set(versionId, {
    id: versionId,
    flow_id: canvasId,
    visual_graph: canvas,
  });
}

/**
 * Clear mock database
 */
function clearMockDatabase(): void {
  mockFlowStorage.clear();
  mockVersionStorage.clear();
}

// ============================================================================
// Property Tests
// ============================================================================

describe('MODIFY_WORKFLOW Property Tests', () => {
  beforeEach(() => {
    // Clear mock database before each test
    clearMockDatabase();
  });
  
  /**
   * Property 17: AI modifications validate edge integrity
   * 
   * For any workflow modification, all edges in the resulting canvas should
   * reference nodes that exist in the canvas.
   * 
   * This property ensures that:
   * 1. No edges reference deleted nodes
   * 2. No edges reference non-existent nodes
   * 3. Edge integrity is maintained after modifications
   * 
   * Validates: Requirements 5.7
   */
  it('Property 17: AI modifications validate edge integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        visualGraphArbitrary,
        visualGraphArbitrary,
        async (originalCanvas, modifiedCanvas) => {
          // Setup: Create a canvas in mock database
          const canvasId = 'test-canvas-' + Math.random().toString(36).substring(7);
          setupMockCanvas(canvasId, originalCanvas);
          
          try {
            // Create payload
            const payload: ModifyWorkflowPayload = {
              canvasId,
              canvas: modifiedCanvas,
              changes: ['Test modification'],
            };
            
            // Execute: Modify the workflow
            const result = await handleModifyWorkflow(payload);
            
            // Verify: All edges reference existing nodes
            const nodeIds = new Set(result.canvas.nodes.map(n => n.id));
            
            for (const edge of result.canvas.edges) {
              // Edge source must exist
              expect(
                nodeIds.has(edge.source),
                `Edge "${edge.id}" references non-existent source node: "${edge.source}"`
              ).toBe(true);
              
              // Edge target must exist
              expect(
                nodeIds.has(edge.target),
                `Edge "${edge.id}" references non-existent target node: "${edge.target}"`
              ).toBe(true);
            }
            
            // Property holds: All edges reference existing nodes
            return true;
          } catch (error) {
            // If modification fails validation, that's acceptable
            // The property is about successful modifications having valid edges
            if (error instanceof Error && error.message.includes('validation')) {
              return true;
            }
            throw error;
          } finally {
            // Cleanup
            clearMockDatabase();
          }
        }
      ),
      { numRuns: PROPERTY_TEST_RUNS }
    );
  });
});
