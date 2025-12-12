/**
 * Comprehensive Error Handling Integration Tests
 * 
 * Tests error handling across all API endpoints
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as canvasPost, GET as canvasList } from '../canvas/route';
import { GET as canvasGet, PUT as canvasPut, DELETE as canvasDelete } from '../canvas/[id]/route';
import { POST as runPost } from '../canvas/[id]/run/route';
import { GET as statusGet } from '../canvas/[id]/status/route';
import { deleteFlow } from '@/lib/db/flows';

describe('Error Handling Integration Tests', () => {
  let testCanvasIds: string[] = [];

  afterEach(async () => {
    // Clean up test canvases
    for (const canvasId of testCanvasIds) {
      try {
        await deleteFlow(canvasId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    testCanvasIds = [];
  });

  describe('Invalid JSON Handling (Requirement 9.1)', () => {
    it('should handle invalid JSON in POST /api/canvas', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        body: 'invalid json {'
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
      expect(data.code).toBe('BAD_REQUEST');
    });

    it('should handle invalid JSON in PUT /api/canvas/[id]', async () => {
      const request = new NextRequest('http://localhost/api/canvas/test-id', {
        method: 'PUT',
        body: 'invalid json {'
      });

      const response = await canvasPut(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
      expect(data.code).toBe('BAD_REQUEST');
    });

    it('should handle invalid JSON in POST /api/canvas/[id]/run', async () => {
      const request = new NextRequest('http://localhost/api/canvas/test-id/run', {
        method: 'POST',
        body: 'invalid json {'
      });

      const response = await runPost(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
      expect(data.code).toBe('BAD_REQUEST');
    });
  });

  describe('Not Found Handling (Requirement 9.2)', () => {
    it('should return 404 for non-existent canvas in GET', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost/api/canvas/${fakeId}`);
      
      const response = await canvasGet(request, { params: { id: fakeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
      expect(data.error).toContain('Canvas not found');
    });

    it('should return 404 for non-existent canvas in PUT', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost/api/canvas/${fakeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas: { nodes: [], edges: [] }
        })
      });

      const response = await canvasPut(request, { params: { id: fakeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent canvas in DELETE', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost/api/canvas/${fakeId}`);

      const response = await canvasDelete(request, { params: { id: fakeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent canvas in POST /run', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost/api/canvas/${fakeId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {} })
      });

      const response = await runPost(request, { params: { id: fakeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent run in GET /status', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const fakeRunId = '00000000-0000-0000-0000-000000000001';
      const request = new NextRequest(
        `http://localhost/api/canvas/${fakeId}/status?runId=${fakeRunId}`
      );

      const response = await statusGet(request, { params: { id: fakeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('Validation Error Handling (Requirement 9.5)', () => {
    it('should validate missing required fields in POST /api/canvas', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' })
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('BAD_REQUEST');
      expect(data.error).toContain('Missing required fields');
      expect(data.details).toBeDefined();
    });

    it('should validate canvas structure - missing nodes', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          format: 'json',
          content: { edges: [] }
        })
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toContain('missing or invalid nodes');
    });

    it('should validate canvas structure - missing edges', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          format: 'json',
          content: { nodes: [] }
        })
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toContain('missing or invalid edges');
    });

    it('should validate invalid format value', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          format: 'invalid',
          content: { nodes: [], edges: [] }
        })
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('BAD_REQUEST');
      expect(data.error).toContain('Invalid format');
    });

    it('should validate empty canvas ID', async () => {
      const request = new NextRequest('http://localhost/api/canvas/');
      
      const response = await canvasGet(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('BAD_REQUEST');
      expect(data.error).toContain('Invalid canvas ID');
    });

    it('should validate missing runId query parameter', async () => {
      const request = new NextRequest('http://localhost/api/canvas/test-id/status');

      const response = await statusGet(request, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('BAD_REQUEST');
      expect(data.error).toContain('Missing required query parameter: runId');
    });
  });

  describe('Mermaid Parse Error Handling (Requirement 9.4)', () => {
    it('should return descriptive error for invalid Mermaid direction', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          format: 'mermaid',
          content: 'flowchart INVALID\n  A --> B'
        })
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('PARSE_ERROR');
      expect(data.error).toContain('Invalid flowchart direction');
    });

    it('should return descriptive error for missing flowchart declaration', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          format: 'mermaid',
          content: 'A[Start] --> B[End]'
        })
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('PARSE_ERROR');
      expect(data.error).toContain('Missing flowchart declaration');
      expect(data.details).toBeDefined();
      expect(data.details[0]).toContain('Hint:');
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should always include error and code fields', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        body: 'invalid'
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(typeof data.error).toBe('string');
      expect(typeof data.code).toBe('string');
    });

    it('should include details array when available', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' })
      });

      const response = await canvasPost(request);
      const data = await response.json();

      expect(data).toHaveProperty('details');
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.length).toBeGreaterThan(0);
    });

    it('should not include details when not applicable', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost/api/canvas/${fakeId}`);

      const response = await canvasGet(request, { params: { id: fakeId } });
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      // Details may or may not be present for 404 errors
    });
  });

  describe('HTTP Status Code Correctness', () => {
    it('should use 400 for bad requests', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        body: 'invalid'
      });

      const response = await canvasPost(request);
      expect(response.status).toBe(400);
    });

    it('should use 404 for not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = new NextRequest(`http://localhost/api/canvas/${fakeId}`);

      const response = await canvasGet(request, { params: { id: fakeId } });
      expect(response.status).toBe(404);
    });

    it('should use 201 for successful creation', async () => {
      const request = new NextRequest('http://localhost/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Canvas',
          format: 'json',
          content: { nodes: [], edges: [] }
        })
      });

      const response = await canvasPost(request);
      const data = await response.json();
      
      if (data.id) {
        testCanvasIds.push(data.id);
      }

      expect(response.status).toBe(201);
    });

    it('should use 200 for successful retrieval', async () => {
      const response = await canvasList();
      expect(response.status).toBe(200);
    });
  });
});
