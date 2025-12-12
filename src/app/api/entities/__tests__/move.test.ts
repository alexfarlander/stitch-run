/**
 * Entity Movement API Tests
 * 
 * Tests the POST /api/entities/[entityId]/move endpoint
 * 
 * Requirements:
 * - 5.2: Update entity position in database
 * - 5.4: Record journey event with type "manual_move"
 * - 14.1: Verify target node exists
 * - 14.2: Verify edge exists connecting nodes
 * - 14.3: Display error message on validation failure
 * - 14.4: Execute movement on validation success
 * - 14.5: Log validation errors
 */

// beforeEach import removed as unused
import { NextRequest } from 'next/server';
import { POST } from '../[entityId]/move/route';
import { getAdminClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

describe('Entity Movement API', () => {
  const supabase = getAdminClient();
  let testCanvasId: string;
  let testEntityId: string;
  let testNodeIds: { source: string; target: string };

  beforeEach(async () => {
    // Create a test canvas with nodes and edges
    testNodeIds = {
      source: 'node-source',
      target: 'node-target',
    };

    const canvasData = {
      nodes: [
        { id: testNodeIds.source, type: 'worker', position: { x: 0, y: 0 } },
        { id: testNodeIds.target, type: 'worker', position: { x: 100, y: 0 } },
      ],
      edges: [
        { id: 'edge-1', source: testNodeIds.source, target: testNodeIds.target },
      ],
    };

    const { data: canvas, error: canvasError } = await supabase
      .from('stitch_canvases')
      .insert({
        name: 'Test Canvas',
        canvas_type: 'workflow',
        canvas: canvasData,
      })
      .select()
      .single();

    if (canvasError || !canvas) {
      throw new Error('Failed to create test canvas');
    }

    testCanvasId = canvas.id;

    // Create a test entity at the source node
    const { data: entity, error: entityError } = await supabase
      .from('stitch_entities')
      .insert({
        canvas_id: testCanvasId,
        name: 'Test Entity',
        entity_type: 'lead',
        current_node_id: testNodeIds.source,
        journey: [],
        metadata: {},
      })
      .select()
      .single();

    if (entityError || !entity) {
      throw new Error('Failed to create test entity');
    }

    testEntityId = entity.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testEntityId) {
      await supabase.from('stitch_journey_events').delete().eq('entity_id', testEntityId);
      await supabase.from('stitch_entities').delete().eq('id', testEntityId);
    }
    if (testCanvasId) {
      await supabase.from('stitch_canvases').delete().eq('id', testCanvasId);
    }
  });

  describe('Requirement 14.1: Target Node Validation', () => {
    it('should reject movement to non-existent node', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: 'non-existent-node',
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Target node does not exist');
    });

    it('should accept movement to existing node', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entity).toBeDefined();
      expect(data.entity.current_node_id).toBe(testNodeIds.target);
    });
  });

  describe('Requirement 14.2: Edge Validation', () => {
    it('should reject movement when no edge connects nodes', async () => {
      // Add a disconnected node
      const disconnectedNodeId = 'node-disconnected';
      const { error: updateError } = await supabase
        .from('stitch_canvases')
        .update({
          canvas: {
            nodes: [
              { id: testNodeIds.source, type: 'worker', position: { x: 0, y: 0 } },
              { id: testNodeIds.target, type: 'worker', position: { x: 100, y: 0 } },
              { id: disconnectedNodeId, type: 'worker', position: { x: 200, y: 0 } },
            ],
            edges: [
              { id: 'edge-1', source: testNodeIds.source, target: testNodeIds.target },
            ],
          },
        })
        .eq('id', testCanvasId);

      if (updateError) {
        throw new Error('Failed to update canvas');
      }

      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: disconnectedNodeId,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No edge connects');
    });

    it('should accept movement when edge exists', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });

      expect(response.status).toBe(200);
    });

    it('should accept movement in either direction along edge', async () => {
      // First move to target
      const request1 = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      await POST(request1, { params: { entityId: testEntityId } });

      // Then move back to source (reverse direction)
      const request2 = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.source,
        }),
      });

      const response = await POST(request2, { params: { entityId: testEntityId } });

      expect(response.status).toBe(200);
    });
  });

  describe('Requirement 5.2: Entity Position Update', () => {
    it('should update entity current_node_id in database', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entity.current_node_id).toBe(testNodeIds.target);

      // Verify in database
      const { data: dbEntity } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('id', testEntityId)
        .single();

      expect(dbEntity?.current_node_id).toBe(testNodeIds.target);
    });

    it('should clear edge position fields', async () => {
      // First set entity on an edge
      await supabase
        .from('stitch_entities')
        .update({
          current_edge_id: 'edge-1',
          edge_progress: 0.5,
          destination_node_id: testNodeIds.target,
        })
        .eq('id', testEntityId);

      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(data.entity.current_edge_id).toBeNull();
      expect(data.entity.edge_progress).toBeNull();
      expect(data.entity.destination_node_id).toBeNull();
    });
  });

  describe('Requirement 5.4: Journey Event Recording', () => {
    it('should create journey event with manual_move type', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.journeyEvent).toBeDefined();
      expect(data.journeyEvent.event_type).toBe('manual_move');
      expect(data.journeyEvent.node_id).toBe(testNodeIds.target);
      expect(data.journeyEvent.entity_id).toBe(testEntityId);
    });

    it('should include source and target node metadata', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(data.journeyEvent.metadata).toBeDefined();
      expect(data.journeyEvent.metadata.source_node_id).toBe(testNodeIds.source);
      expect(data.journeyEvent.metadata.target_node_id).toBe(testNodeIds.target);
      expect(data.journeyEvent.metadata.movement_type).toBe('manual');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when targetNodeId is missing', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('targetNodeId is required');
    });

    it('should return 404 when entity does not exist', async () => {
      const fakeEntityId = uuidv4();
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: fakeEntityId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Entity not found');
    });

    it('should return 404 when canvas does not exist', async () => {
      // Update entity to reference non-existent canvas
      await supabase
        .from('stitch_entities')
        .update({ canvas_id: uuidv4() })
        .eq('id', testEntityId);

      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Canvas not found');
    });
  });

  describe('Return Value', () => {
    it('should return both updated entity and journey event', async () => {
      const request = new NextRequest('http://localhost/api/entities/test/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNodeId: testNodeIds.target,
        }),
      });

      const response = await POST(request, { params: { entityId: testEntityId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('entity');
      expect(data).toHaveProperty('journeyEvent');
      expect(data.entity.id).toBe(testEntityId);
      expect(data.journeyEvent.entity_id).toBe(testEntityId);
    });
  });
});
