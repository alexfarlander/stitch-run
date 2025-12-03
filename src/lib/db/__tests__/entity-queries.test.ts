/**
 * Integration tests for entity query functions
 * Tests getEntitiesAtNode, getEntitiesOnEdge, and getJourneyHistory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getAdminClient } from '../../supabase/client';
import {
  getEntitiesAtNode,
  getEntitiesOnEdge,
  getJourneyHistory,
  startJourney,
  arriveAtNode,
} from '../entities';

describe('Entity Query Functions', () => {
  const supabase = getAdminClient();
  let testCanvasId: string;
  let testEntityId: string;

  beforeEach(async () => {
    // Create a test canvas
    const { data: canvas } = await supabase
      .from('stitch_flows')
      .insert({
        name: 'Test Canvas',
        graph: { nodes: [], edges: [] },
        canvas_type: 'workflow',
      })
      .select()
      .single();

    testCanvasId = canvas!.id;

    // Create a test entity
    const { data: entity } = await supabase
      .from('stitch_entities')
      .insert({
        canvas_id: testCanvasId,
        name: 'Test Entity',
        entity_type: 'test',
        current_node_id: 'node-1',
        journey: [],
        metadata: {},
      })
      .select()
      .single();

    testEntityId = entity!.id;
  });

  describe('getEntitiesAtNode', () => {
    it('should return entities at a specific node', async () => {
      const entities = await getEntitiesAtNode(testCanvasId, 'node-1');
      
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe(testEntityId);
      expect(entities[0].current_node_id).toBe('node-1');
    });

    it('should return empty array for node with no entities', async () => {
      const entities = await getEntitiesAtNode(testCanvasId, 'node-999');
      
      expect(entities).toHaveLength(0);
    });

    it('should not return entities from other canvases', async () => {
      // Create another canvas with an entity at the same node
      const { data: otherCanvas } = await supabase
        .from('stitch_flows')
        .insert({
          name: 'Other Canvas',
          graph: { nodes: [], edges: [] },
          canvas_type: 'workflow',
        })
        .select()
        .single();

      await supabase
        .from('stitch_entities')
        .insert({
          canvas_id: otherCanvas!.id,
          name: 'Other Entity',
          entity_type: 'test',
          current_node_id: 'node-1',
          journey: [],
          metadata: {},
        });

      // Query should only return entities from testCanvasId
      const entities = await getEntitiesAtNode(testCanvasId, 'node-1');
      
      expect(entities).toHaveLength(1);
      expect(entities[0].canvas_id).toBe(testCanvasId);
    });
  });

  describe('getEntitiesOnEdge', () => {
    it('should return entities on a specific edge', async () => {
      // Move entity to an edge
      await startJourney(testEntityId, 'edge-1');

      const entities = await getEntitiesOnEdge(testCanvasId, 'edge-1');
      
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe(testEntityId);
      expect(entities[0].current_edge_id).toBe('edge-1');
      expect(entities[0].edge_progress).toBe(0.0);
    });

    it('should return empty array for edge with no entities', async () => {
      const entities = await getEntitiesOnEdge(testCanvasId, 'edge-999');
      
      expect(entities).toHaveLength(0);
    });

    it('should not return entities from other canvases', async () => {
      // Create another canvas with an entity on the same edge
      const { data: otherCanvas } = await supabase
        .from('stitch_flows')
        .insert({
          name: 'Other Canvas',
          graph: { nodes: [], edges: [] },
          canvas_type: 'workflow',
        })
        .select()
        .single();

      const { data: otherEntity } = await supabase
        .from('stitch_entities')
        .insert({
          canvas_id: otherCanvas!.id,
          name: 'Other Entity',
          entity_type: 'test',
          journey: [],
          metadata: {},
        })
        .select()
        .single();

      await startJourney(otherEntity!.id, 'edge-1');

      // Query should only return entities from testCanvasId
      const entities = await getEntitiesOnEdge(testCanvasId, 'edge-1');
      
      expect(entities).toHaveLength(0); // testEntity is not on edge-1 in this test
    });
  });

  describe('getJourneyHistory', () => {
    it('should return journey events in chronological order', async () => {
      // Create some journey events
      await startJourney(testEntityId, 'edge-1');
      await arriveAtNode(testEntityId, 'node-2');

      const history = await getJourneyHistory(testEntityId);
      
      expect(history.length).toBeGreaterThanOrEqual(2);
      
      // Verify chronological ordering
      for (let i = 1; i < history.length; i++) {
        const prevTime = new Date(history[i - 1].timestamp).getTime();
        const currTime = new Date(history[i].timestamp).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
      
      // Verify event types
      expect(history.some(e => e.event_type === 'edge_start')).toBe(true);
      expect(history.some(e => e.event_type === 'node_arrival')).toBe(true);
    });

    it('should return empty array for entity with no journey events', async () => {
      // Create a new entity with no movements
      const { data: newEntity } = await supabase
        .from('stitch_entities')
        .insert({
          canvas_id: testCanvasId,
          name: 'New Entity',
          entity_type: 'test',
          journey: [],
          metadata: {},
        })
        .select()
        .single();

      const history = await getJourneyHistory(newEntity!.id);
      
      expect(history).toHaveLength(0);
    });
  });
});
