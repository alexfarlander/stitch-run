/**
 * Integration tests for Canvas Management API - Individual Canvas Route
 * Tests: Requirements 1.3, 1.4, 1.5, 9.2
 */

// beforeEach import removed as unused
import { GET, PUT, DELETE } from '../route';
import { createFlowWithVersion, deleteFlow } from '@/lib/db/flows';
import { NextRequest } from 'next/server';
import { VisualGraph } from '@/types/canvas-schema';

describe('Canvas Management API - Individual Canvas Route', () => {
  let testCanvasId: string;
  let testCanvasIds: string[] = [];

  beforeEach(async () => {
    // Create a test canvas
    const visualGraph: VisualGraph = {
      nodes: [
        {
          id: 'node-1',
          type: 'Worker',
          position: { x: 0, y: 0 },
          data: { label: 'Test Node', worker_type: 'claude' }
        }
      ],
      edges: []
    };

    const { flow } = await createFlowWithVersion(
      'Test Canvas',
      visualGraph,
      'workflow',
      undefined,
      'Initial test version'
    );
    testCanvasId = flow.id;
    testCanvasIds.push(flow.id);
  });

  afterEach(async () => {
    // Clean up test canvases
    for (const canvasId of testCanvasIds) {
      try {
        await deleteFlow(canvasId);
      } catch (_e) {
        // Ignore cleanup errors
      }
    }
    testCanvasIds = [];
  });

  describe('GET /api/canvas/[id]', () => {
    it('should retrieve canvas by ID (Requirement 1.3)', async () => {
      const request = new NextRequest(`http://localhost:3000/api/canvas/${testCanvasId}`);
      const response = await GET(request, { params: { id: testCanvasId } });
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('canvas');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');
      expect(data.id).toBe(testCanvasId);
      expect(data.name).toBe('Test Canvas');
      expect(data.canvas.nodes).toHaveLength(1);
    });

    it('should return 404 for non-existent canvas (Requirement 9.2)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost:3000/api/canvas/${fakeId}`);
      const response = await GET(request, { params: { id: fakeId } });
      const _data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid canvas ID (Requirement 9.2)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas/invalid-id');
      const response = await GET(request, { params: { id: '' } });
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('BAD_REQUEST');
    });
  });

  describe('PUT /api/canvas/[id]', () => {
    it('should update canvas name (Requirement 1.4)', async () => {
      const request = new NextRequest(`http://localhost:3000/api/canvas/${testCanvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Canvas Name',
          canvas: {
            nodes: [
              {
                id: 'node-1',
                type: 'Worker',
                position: { x: 0, y: 0 },
                data: { label: 'Test Node' }
              }
            ],
            edges: []
          }
        })
      });

      const response = await PUT(request, { params: { id: testCanvasId } });
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('canvas');
      expect(data).toHaveProperty('updated_at');
      expect(data.id).toBe(testCanvasId);
    });

    it('should update canvas structure (Requirement 1.4)', async () => {
      const updatedGraph: VisualGraph = {
        nodes: [
          {
            id: 'node-1',
            type: 'Worker',
            position: { x: 0, y: 0 },
            data: { label: 'Updated Node' }
          },
          {
            id: 'node-2',
            type: 'Worker',
            position: { x: 100, y: 0 },
            data: { label: 'New Node' }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2'
          }
        ]
      };

      const request = new NextRequest(`http://localhost:3000/api/canvas/${testCanvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas: updatedGraph
        })
      });

      const response = await PUT(request, { params: { id: testCanvasId } });
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canvas.nodes).toHaveLength(2);
      expect(data.canvas.edges).toHaveLength(1);
    });

    it('should return 404 for non-existent canvas (Requirement 9.2)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost:3000/api/canvas/${fakeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Name',
          canvas: { nodes: [], edges: [] }
        })
      });

      const response = await PUT(request, { params: { id: fakeId } });
      const _data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should reject invalid JSON (Requirement 9.1)', async () => {
      const request = new NextRequest(`http://localhost:3000/api/canvas/${testCanvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      const response = await PUT(request, { params: { id: testCanvasId } });
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('BAD_REQUEST');
    });

    it('should reject canvas without nodes array (Requirement 9.1)', async () => {
      const request = new NextRequest(`http://localhost:3000/api/canvas/${testCanvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas: { edges: [] } // Missing nodes
        })
      });

      const response = await PUT(request, { params: { id: testCanvasId } });
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/canvas/[id]', () => {
    it('should delete canvas by ID (Requirement 1.5)', async () => {
      const request = new NextRequest(`http://localhost:3000/api/canvas/${testCanvasId}`);
      const response = await DELETE(request, { params: { id: testCanvasId } });
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('id');
      expect(data.success).toBe(true);
      expect(data.id).toBe(testCanvasId);

      // Remove from cleanup list since it's already deleted
      testCanvasIds = testCanvasIds.filter(id => id !== testCanvasId);

      // Verify canvas is deleted
      const getRequest = new NextRequest(`http://localhost:3000/api/canvas/${testCanvasId}`);
      const getResponse = await GET(getRequest, { params: { id: testCanvasId } });
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent canvas (Requirement 9.2)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost:3000/api/canvas/${fakeId}`);
      const response = await DELETE(request, { params: { id: fakeId } });
      const _data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('NOT_FOUND');
    });
  });
});
