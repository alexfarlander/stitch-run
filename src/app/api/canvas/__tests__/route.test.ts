/**
 * Integration tests for Canvas Management API - Base Route
 * Tests: Requirements 1.1, 1.2, 9.1, 9.3
 */

// beforeEach import removed as unused
import { GET, POST } from '../route';
import { deleteFlow } from '@/lib/db/flows';
import { NextRequest } from 'next/server';
import { VisualGraph } from '@/types/canvas-schema';

describe('Canvas Management API - Base Route', () => {
  let testCanvasIds: string[] = [];

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

  describe('GET /api/canvas', () => {
    it('should list all canvases (Requirement 1.1)', async () => {
      const response = await GET();
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('canvases');
      expect(Array.isArray(data.canvases)).toBe(true);
    });

    it('should return canvas metadata with correct fields (Requirement 1.1)', async () => {
      // Create a test canvas first
      const visualGraph: VisualGraph = {
        nodes: [
          {
            id: 'node-1',
            type: 'Worker',
            position: { x: 0, y: 0 },
            data: { label: 'Test Node' }
          }
        ],
        edges: []
      };

      const createRequest = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas for List',
          format: 'json',
          content: visualGraph
        })
      });

      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      testCanvasIds.push(createData.id);

      // Now list canvases
      const response = await GET();
      const _data = await response.json();

      expect(response.status).toBe(200);
      const canvas = data.canvases.find((c: unknown) => c.id === createData.id);
      expect(canvas).toBeDefined();
      expect(canvas).toHaveProperty('id');
      expect(canvas).toHaveProperty('name');
      expect(canvas).toHaveProperty('created_at');
      expect(canvas).toHaveProperty('updated_at');
      expect(canvas).toHaveProperty('node_count');
      expect(canvas).toHaveProperty('edge_count');
      expect(canvas.node_count).toBe(1);
      expect(canvas.edge_count).toBe(0);
    });
  });

  describe('POST /api/canvas', () => {
    it('should create canvas from JSON format (Requirement 1.2)', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas',
          format: 'json',
          content: visualGraph
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      testCanvasIds.push(data.id);

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('canvas');
      expect(data.canvas.nodes).toHaveLength(1);
      expect(data.canvas.nodes[0].id).toBe('node-1');
    });

    it('should reject invalid JSON in request body (Requirement 9.1)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('BAD_REQUEST');
    });

    it('should reject missing required fields (Requirement 9.1)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas'
          // Missing format and content
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('BAD_REQUEST');
      expect(data.details).toBeDefined();
    });

    it('should reject invalid format value (Requirement 9.1)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas',
          format: 'invalid',
          content: { nodes: [], edges: [] }
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('BAD_REQUEST');
    });

    it('should reject canvas without nodes array (Requirement 9.1)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas',
          format: 'json',
          content: { edges: [] } // Missing nodes
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should reject canvas without edges array (Requirement 9.1)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas',
          format: 'json',
          content: { nodes: [] } // Missing edges
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should create canvas from Mermaid format (Requirement 1.2, 3.1)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Mermaid Canvas',
          format: 'mermaid',
          content: 'flowchart LR\n  A[Start] --> B[End]'
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('canvas');
      expect(data.canvas.nodes).toHaveLength(2);
      expect(data.canvas.edges).toHaveLength(1);
    });

    it('should return error for invalid Mermaid syntax (Requirement 3.5, 9.4)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas',
          format: 'mermaid',
          content: 'flowchart INVALID\n  A --> B'
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('PARSE_ERROR');
      expect(data.error).toContain('Invalid flowchart direction');
    });

    it('should return descriptive error for missing flowchart declaration (Requirement 3.5, 9.4)', async () => {
      const request = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas',
          format: 'mermaid',
          content: 'A[Start] --> B[End]'
        })
      });

      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('PARSE_ERROR');
      expect(data.error).toContain('Missing flowchart declaration');
      expect(data.details).toBeDefined();
      expect(data.details[0]).toContain('Hint:');
    });
  });
});
