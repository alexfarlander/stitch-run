/**
 * Property-based tests for version manager
 * 
 * Feature: canvas-as-data
 * Tests version creation, retrieval, and auto-versioning
 */

// beforeEach import removed as unused
import * as fc from 'fast-check';
import { 
  createVersion, 
  getVersion, 
  listVersions, 
  autoVersionOnRun,
  ValidationFailureError 
} from '../version-manager';
import { VisualGraph, VisualNode, VisualEdge } from '@/types/canvas-schema';
import { createServerClient } from '../../supabase/server';

// ============================================================================
// Test Setup
// ============================================================================

// Track created flows for cleanup
const createdFlowIds: string[] = [];

beforeEach(async () => {
  // Clean up any leftover test data
  const _supabase = createServerClient();
  
  // Delete test flows (cascade will delete versions and runs)
  if (createdFlowIds.length > 0) {
    await supabase
      .from('stitch_flows')
      .delete()
      .in('id', createdFlowIds);
    
    createdFlowIds.length = 0;
  }
});

afterEach(async () => {
  // Clean up test data
  const _supabase = createServerClient();
  
  if (createdFlowIds.length > 0) {
    await supabase
      .from('stitch_flows')
      .delete()
      .in('id', createdFlowIds);
    
    createdFlowIds.length = 0;
  }
});

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
 */
const acyclicGraphArbitrary: fc.Arbitrary<VisualGraph> = fc.array(simpleNodeArbitrary, { minLength: 2, maxLength: 8 })
  .chain(nodes => {
    // Ensure unique node IDs
    const uniqueNodes = Array.from(
      new Map(nodes.map(n => [n.id, n])).values()
    );

    if (uniqueNodes.length < 2) {
      return fc.constant({
        nodes: uniqueNodes,
        edges: [],
      });
    }

    // Generate edges that respect topological order (i -> j where i < j)
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
// Helper Functions
// ============================================================================

/**
 * Create a test flow in the database
 */
async function createTestFlow(name: string): Promise<string> {
  const _supabase = createServerClient();
  
  // Provide a minimal graph to satisfy the NOT NULL constraint
  // This is a temporary workaround until the migration makes graph nullable
  const minimalGraph = {
    nodes: [],
    edges: []
  };
  
  const { data, error } = await supabase
    .from('stitch_flows')
    .insert({
      name,
      graph: minimalGraph,
      canvas_type: 'workflow',
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create test flow: ${error.message}`);
  }
  
  createdFlowIds.push(data.id);
  return data.id;
}

/**
 * Modify a graph slightly to create a different version
 */
function modifyGraph(graph: VisualGraph): VisualGraph {
  // Add a new node to make it different
  const newNode: VisualNode = {
    id: `modified-${Date.now()}`,
    type: 'worker',
    position: { x: 500, y: 500 },
    data: {
      label: 'Modified Node',
    },
  };

  return {
    nodes: [...graph.nodes, newNode],
    edges: graph.edges,
  };
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Version Manager - Property Tests', () => {
  
  /**
   * Feature: canvas-as-data, Property 23: Auto-versioning on unsaved changes
   * Validates: Requirements 5.1
   * 
   * For any canvas with unsaved changes, clicking "Run" should automatically 
   * create a new version before execution
   */
  describe('Property 23: Auto-versioning on unsaved changes', () => {
    
    it('for any valid graph, autoVersionOnRun should create a version when none exists', async () => {
      await fc.assert(
        fc.asyncProperty(acyclicGraphArbitrary, async (graph: VisualGraph) => {
          // Create a test flow
          const flowId = await createTestFlow(`test-flow-${Date.now()}`);
          
          // Call autoVersionOnRun (no version exists yet)
          const _versionId = await autoVersionOnRun(flowId, graph);
          
          // Should return a version ID
          expect(versionId).toBeDefined();
          expect(typeof versionId).toBe('string');
          
          // Version should exist in database
          const version = await getVersion(versionId);
          expect(version).not.toBeNull();
          expect(version?.flow_id).toBe(flowId);
          
          // Flow should now have current_version_id set
          const _supabase = createServerClient();
          const { data: flow } = await supabase
            .from('stitch_flows')
            .select('current_version_id')
            .eq('id', flowId)
            .single();
          
          expect(flow?.current_version_id).toBe(versionId);
        }),
        { numRuns: 20 } // Reduced runs for database tests
      );
    }, 30000); // 30 second timeout

    it('for any graph, autoVersionOnRun should NOT create a new version when graph is unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(acyclicGraphArbitrary, async (graph: VisualGraph) => {
          // Create a test flow
          const flowId = await createTestFlow(`test-flow-${Date.now()}`);
          
          // Create initial version
          const { versionId: initialVersionId } = await createVersion(
            flowId,
            graph,
            'Initial version'
          );
          
          // Call autoVersionOnRun with same graph
          const _versionId = await autoVersionOnRun(flowId, graph);
          
          // Should return the same version ID (no new version created)
          expect(versionId).toBe(initialVersionId);
          
          // Should still only have one version
          const versions = await listVersions(flowId);
          expect(versions.length).toBe(1);
        }),
        { numRuns: 20 }
      );
    }, 30000);

    it('for any graph, autoVersionOnRun should create a new version when graph has changed', async () => {
      await fc.assert(
        fc.asyncProperty(acyclicGraphArbitrary, async (graph: VisualGraph) => {
          // Create a test flow
          const flowId = await createTestFlow(`test-flow-${Date.now()}`);
          
          // Create initial version
          const { versionId: initialVersionId } = await createVersion(
            flowId,
            graph,
            'Initial version'
          );
          
          // Modify the graph
          const modifiedGraph = modifyGraph(graph);
          
          // Call autoVersionOnRun with modified graph
          const _versionId = await autoVersionOnRun(flowId, modifiedGraph);
          
          // Should return a different version ID (new version created)
          expect(versionId).not.toBe(initialVersionId);
          
          // Should now have two versions
          const versions = await listVersions(flowId);
          expect(versions.length).toBe(2);
          
          // New version should be the current version
          const _supabase = createServerClient();
          const { data: flow } = await supabase
            .from('stitch_flows')
            .select('current_version_id')
            .eq('id', flowId)
            .single();
          
          expect(flow?.current_version_id).toBe(versionId);
        }),
        { numRuns: 20 }
      );
    }, 30000);

    it('for any graph, autoVersionOnRun should preserve the original version when creating a new one', async () => {
      await fc.assert(
        fc.asyncProperty(acyclicGraphArbitrary, async (graph: VisualGraph) => {
          // Create a test flow
          const flowId = await createTestFlow(`test-flow-${Date.now()}`);
          
          // Create initial version
          const { versionId: initialVersionId } = await createVersion(
            flowId,
            graph,
            'Initial version'
          );
          
          // Get the initial version
          const initialVersion = await getVersion(initialVersionId);
          expect(initialVersion).not.toBeNull();
          
          // Modify the graph
          const modifiedGraph = modifyGraph(graph);
          
          // Call autoVersionOnRun with modified graph
          await autoVersionOnRun(flowId, modifiedGraph);
          
          // Original version should still exist and be unchanged
          const originalVersion = await getVersion(initialVersionId);
          expect(originalVersion).not.toBeNull();
          expect(originalVersion?.visual_graph).toEqual(initialVersion?.visual_graph);
          expect(originalVersion?.execution_graph).toEqual(initialVersion?.execution_graph);
        }),
        { numRuns: 20 }
      );
    }, 30000);

    it('for any graph, autoVersionOnRun should set appropriate commit message', async () => {
      await fc.assert(
        fc.asyncProperty(acyclicGraphArbitrary, async (graph: VisualGraph) => {
          // Create a test flow
          const flowId = await createTestFlow(`test-flow-${Date.now()}`);
          
          // Call autoVersionOnRun (no version exists)
          const _versionId = await autoVersionOnRun(flowId, graph);
          
          // Check commit message
          const version = await getVersion(versionId);
          expect(version?.commit_message).toContain('auto-created on run');
        }),
        { numRuns: 20 }
      );
    }, 30000);

    it('for any graph, multiple autoVersionOnRun calls with same graph should be idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(acyclicGraphArbitrary, async (graph: VisualGraph) => {
          // Create a test flow
          const flowId = await createTestFlow(`test-flow-${Date.now()}`);
          
          // Call autoVersionOnRun multiple times with same graph
          const versionId1 = await autoVersionOnRun(flowId, graph);
          const versionId2 = await autoVersionOnRun(flowId, graph);
          const versionId3 = await autoVersionOnRun(flowId, graph);
          
          // All should return the same version ID
          expect(versionId1).toBe(versionId2);
          expect(versionId2).toBe(versionId3);
          
          // Should only have one version
          const versions = await listVersions(flowId);
          expect(versions.length).toBe(1);
        }),
        { numRuns: 20 }
      );
    }, 30000);

    it('for any graph, autoVersionOnRun should handle rapid successive changes', async () => {
      await fc.assert(
        fc.asyncProperty(acyclicGraphArbitrary, async (graph: VisualGraph) => {
          // Create a test flow
          const flowId = await createTestFlow(`test-flow-${Date.now()}`);
          
          // Create multiple versions rapidly
          const versionId1 = await autoVersionOnRun(flowId, graph);
          
          const modifiedGraph1 = modifyGraph(graph);
          const versionId2 = await autoVersionOnRun(flowId, modifiedGraph1);
          
          const modifiedGraph2 = modifyGraph(modifiedGraph1);
          const versionId3 = await autoVersionOnRun(flowId, modifiedGraph2);
          
          // All version IDs should be different
          expect(versionId1).not.toBe(versionId2);
          expect(versionId2).not.toBe(versionId3);
          expect(versionId1).not.toBe(versionId3);
          
          // Should have three versions
          const versions = await listVersions(flowId);
          expect(versions.length).toBe(3);
          
          // Latest version should be current
          const _supabase = createServerClient();
          const { data: flow } = await supabase
            .from('stitch_flows')
            .select('current_version_id')
            .eq('id', flowId)
            .single();
          
          expect(flow?.current_version_id).toBe(versionId3);
        }),
        { numRuns: 15 }
      );
    }, 30000);
  });
});
