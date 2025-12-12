/**
 * Tests for database verification checks
 * These tests verify the verification functions work correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkForeignKeys,
  checkNodeTypes,
  checkEdgeReferences,
  checkParentNodes,
  checkTopology,
  checkJourneyEdges,
} from '../checks';
import { createServerClient } from '../../supabase/server';
import { StitchFlow, StitchNode, StitchEdge } from '@/types/stitch';

describe('Database Verification Checks', () => {
  let testFlowId: string;

  beforeAll(async () => {
    // Create a test flow with valid data
    const supabase = createServerClient();
    
    const testGraph = {
      nodes: [
        {
          id: 'node-1',
          type: 'UX' as const,
          position: { x: 0, y: 0 },
          data: { label: 'Start' },
        },
        {
          id: 'node-2',
          type: 'Worker' as const,
          position: { x: 200, y: 0 },
          data: { label: 'Process', workerType: 'claude' },
        },
        {
          id: 'node-3',
          type: 'UX' as const,
          position: { x: 400, y: 0 },
          data: { label: 'End' },
        },
      ] as StitchNode[],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
        },
        {
          id: 'edge-2',
          source: 'node-2',
          target: 'node-3',
        },
      ] as StitchEdge[],
    };

    const { data, error } = await supabase
      .from('stitch_flows')
      .insert({
        name: 'Test Flow for Verification',
        graph: testGraph,
        canvas_type: 'workflow',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test flow: ${error.message}`);
    }

    testFlowId = data.id;
  });

  describe('checkForeignKeys', () => {
    it('should return no errors for valid flow', async () => {
      const errors = await checkForeignKeys(testFlowId);
      expect(errors).toHaveLength(0);
    });

    it('should return error for non-existent flow', async () => {
      const errors = await checkForeignKeys('00000000-0000-0000-0000-000000000000');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('foreign_key');
    });
  });

  describe('checkNodeTypes', () => {
    it('should return no errors for valid node types', async () => {
      const errors = await checkNodeTypes(testFlowId);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid node types', async () => {
      // Create a flow with invalid node type
      const supabase = createServerClient();
      
      const invalidGraph = {
        nodes: [
          {
            id: 'invalid-node',
            type: 'InvalidType' as unknown,
            position: { x: 0, y: 0 },
            data: { label: 'Invalid' },
          },
        ],
        edges: [],
      };

      const { data } = await supabase
        .from('stitch_flows')
        .insert({
          name: 'Invalid Node Type Flow',
          graph: invalidGraph,
          canvas_type: 'workflow',
        })
        .select()
        .single();

      if (data) {
        const errors = await checkNodeTypes(data.id);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].type).toBe('node_type');
        expect(errors[0].message).toContain('unregistered type');
      }
    });
  });

  describe('checkEdgeReferences', () => {
    it('should return no errors for valid edge references', async () => {
      const errors = await checkEdgeReferences(testFlowId);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid edge source', async () => {
      // Create a flow with invalid edge source
      const supabase = createServerClient();
      
      const invalidGraph = {
        nodes: [
          {
            id: 'node-1',
            type: 'UX' as const,
            position: { x: 0, y: 0 },
            data: { label: 'Node' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'non-existent-node',
            target: 'node-1',
          },
        ],
      };

      const { data } = await supabase
        .from('stitch_flows')
        .insert({
          name: 'Invalid Edge Source Flow',
          graph: invalidGraph,
          canvas_type: 'workflow',
        })
        .select()
        .single();

      if (data) {
        const errors = await checkEdgeReferences(data.id);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].type).toBe('edge_reference');
        expect(errors[0].message).toContain('invalid source');
      }
    });
  });

  describe('checkParentNodes', () => {
    it('should return no errors for valid parent references', async () => {
      const errors = await checkParentNodes(testFlowId);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid parent references', async () => {
      // Create a flow with invalid parent reference
      const supabase = createServerClient();
      
      const invalidGraph = {
        nodes: [
          {
            id: 'child-node',
            type: 'section-item' as const,
            position: { x: 0, y: 0 },
            data: { label: 'Child' },
            parentId: 'non-existent-parent',
          },
        ],
        edges: [],
      };

      const { data } = await supabase
        .from('stitch_flows')
        .insert({
          name: 'Invalid Parent Flow',
          graph: invalidGraph,
          canvas_type: 'workflow',
        })
        .select()
        .single();

      if (data) {
        const errors = await checkParentNodes(data.id);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].type).toBe('parent_node');
        expect(errors[0].message).toContain('parentId');
      }
    });
  });

  describe('checkTopology', () => {
    it('should return no errors for valid topology', async () => {
      const errors = await checkTopology(testFlowId);
      expect(errors).toHaveLength(0);
    });

    it('should detect Splitter with insufficient outgoing edges', async () => {
      // Create a flow with Splitter that has only 1 outgoing edge
      const supabase = createServerClient();
      
      const invalidGraph = {
        nodes: [
          {
            id: 'splitter',
            type: 'Splitter' as const,
            position: { x: 0, y: 0 },
            data: { label: 'Split' },
          },
          {
            id: 'target',
            type: 'UX' as const,
            position: { x: 200, y: 0 },
            data: { label: 'Target' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'splitter',
            target: 'target',
          },
        ],
      };

      const { data } = await supabase
        .from('stitch_flows')
        .insert({
          name: 'Invalid Splitter Flow',
          graph: invalidGraph,
          canvas_type: 'workflow',
        })
        .select()
        .single();

      if (data) {
        const errors = await checkTopology(data.id);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].type).toBe('topology');
        expect(errors[0].message).toContain('Splitter');
        expect(errors[0].message).toContain('more than one outgoing edge');
      }
    });

    it('should detect Collector with insufficient incoming edges', async () => {
      // Create a flow with Collector that has only 1 incoming edge
      const supabase = createServerClient();
      
      const invalidGraph = {
        nodes: [
          {
            id: 'source',
            type: 'UX' as const,
            position: { x: 0, y: 0 },
            data: { label: 'Source' },
          },
          {
            id: 'collector',
            type: 'Collector' as const,
            position: { x: 200, y: 0 },
            data: { label: 'Collect' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'source',
            target: 'collector',
          },
        ],
      };

      const { data } = await supabase
        .from('stitch_flows')
        .insert({
          name: 'Invalid Collector Flow',
          graph: invalidGraph,
          canvas_type: 'workflow',
        })
        .select()
        .single();

      if (data) {
        const errors = await checkTopology(data.id);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].type).toBe('topology');
        expect(errors[0].message).toContain('Collector');
        expect(errors[0].message).toContain('more than one incoming edge');
      }
    });
  });

  describe('checkJourneyEdges', () => {
    it('should return no errors when no entities exist', async () => {
      const errors = await checkJourneyEdges(testFlowId);
      expect(errors).toHaveLength(0);
    });

    it('should return no errors when journey events reference valid edges', async () => {
      const supabase = createServerClient();
      
      // Create an entity for the test flow
      const { data: entity } = await supabase
        .from('stitch_entities')
        .insert({
          name: 'Test Entity',
          canvas_id: testFlowId,
          current_node_id: 'node-1',
        })
        .select()
        .single();

      if (entity) {
        // Create a journey event with valid edge_id
        await supabase
          .from('stitch_journey_events')
          .insert({
            entity_id: entity.id,
            event_type: 'edge_start',
            edge_id: 'edge-1',
            node_id: 'node-1',
          });

        const errors = await checkJourneyEdges(testFlowId);
        expect(errors).toHaveLength(0);

        // Cleanup
        await supabase
          .from('stitch_entities')
          .delete()
          .eq('id', entity.id);
      }
    });

    it('should detect journey events with invalid edge references', async () => {
      const supabase = createServerClient();
      
      // Create an entity for the test flow
      const { data: entity } = await supabase
        .from('stitch_entities')
        .insert({
          name: 'Test Entity Invalid',
          canvas_id: testFlowId,
          current_node_id: 'node-1',
        })
        .select()
        .single();

      if (entity) {
        // Create a journey event with invalid edge_id
        await supabase
          .from('stitch_journey_events')
          .insert({
            entity_id: entity.id,
            event_type: 'edge_start',
            edge_id: 'non-existent-edge',
            node_id: 'node-1',
          });

        const errors = await checkJourneyEdges(testFlowId);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.type === 'journey_edge')).toBe(true);
        expect(errors.some(e => e.message.includes('non-existent edge'))).toBe(true);

        // Cleanup
        await supabase
          .from('stitch_entities')
          .delete()
          .eq('id', entity.id);
      }
    });

    it('should report which entities have invalid journey data', async () => {
      const supabase = createServerClient();
      
      // Create multiple entities with invalid journey data
      const { data: entity1 } = await supabase
        .from('stitch_entities')
        .insert({
          name: 'Entity One',
          canvas_id: testFlowId,
          current_node_id: 'node-1',
        })
        .select()
        .single();

      const { data: entity2 } = await supabase
        .from('stitch_entities')
        .insert({
          name: 'Entity Two',
          canvas_id: testFlowId,
          current_node_id: 'node-2',
        })
        .select()
        .single();

      if (entity1 && entity2) {
        // Create journey events with invalid edge_ids
        await supabase
          .from('stitch_journey_events')
          .insert([
            {
              entity_id: entity1.id,
              event_type: 'edge_start',
              edge_id: 'invalid-edge-1',
              node_id: 'node-1',
            },
            {
              entity_id: entity2.id,
              event_type: 'edge_start',
              edge_id: 'invalid-edge-2',
              node_id: 'node-2',
            },
          ]);

        const errors = await checkJourneyEdges(testFlowId);
        expect(errors.length).toBeGreaterThan(0);
        
        // Should have a summary error about entities with invalid data
        const summaryError = errors.find(e => 
          e.message.includes('entities have invalid journey data')
        );
        expect(summaryError).toBeDefined();
        expect(summaryError?.context?.entityCount).toBe(2);

        // Cleanup
        await supabase
          .from('stitch_entities')
          .delete()
          .in('id', [entity1.id, entity2.id]);
      }
    });

    it('should return error for non-existent flow', async () => {
      const errors = await checkJourneyEdges('00000000-0000-0000-0000-000000000000');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('journey_edge');
    });
  });

  describe('checkRealtimeConfig', () => {
    it('should check Realtime configuration for stitch_runs', async () => {
      const { checkRealtimeConfig } = await import('../checks');
      const errors = await checkRealtimeConfig();
      
      // This test may pass or fail depending on actual Realtime configuration
      // We're mainly testing that the function runs without throwing
      expect(Array.isArray(errors)).toBe(true);
      
      // If there are errors, they should be of type 'realtime'
      if (errors.length > 0) {
        expect(errors[0].type).toBe('realtime');
      }
    });
  });

  describe('checkRLSPolicies', () => {
    it('should check RLS policies for key tables', async () => {
      const { checkRLSPolicies } = await import('../checks');
      const errors = await checkRLSPolicies();
      
      // This test may pass or fail depending on actual RLS configuration
      // We're mainly testing that the function runs without throwing
      expect(Array.isArray(errors)).toBe(true);
      
      // If there are errors, they should be of type 'rls'
      if (errors.length > 0) {
        expect(errors[0].type).toBe('rls');
      }
    });
  });
});