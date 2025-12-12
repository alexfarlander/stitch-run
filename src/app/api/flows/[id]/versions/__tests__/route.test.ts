/**
 * Integration tests for flow versions API endpoints
 * Tests: Requirements 10.1, 10.4, 10.5
 */

// beforeEach import removed as unused
import { POST, GET } from '../route';
import { GET as GET_VERSION } from '../[vid]/route';
import { createFlow, deleteFlow } from '@/lib/db/flows';
import { VisualGraph } from '@/types/canvas-schema';
import { NextRequest } from 'next/server';

describe('Flow Versions API', () => {
  let testFlowId: string;
  let testVersionIds: string[] = [];

  beforeEach(async () => {
    // Create a test flow
    const flow = await createFlow('Test Flow for Versions', {
      nodes: [],
      edges: [],
    });
    testFlowId = flow.id;
  });

  afterEach(async () => {
    // Clean up flow (cascade deletes versions)
    if (testFlowId) {
      try {
        await deleteFlow(testFlowId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    testVersionIds = [];
  });

  describe('POST /api/flows/[id]/versions', () => {
    it('should create a new version with valid visual graph (Requirement 10.1)', async () => {
      // Create a valid visual graph
      const visualGraph: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: 'Test Worker',
              worker_type: 'claude',
              config: {},
              inputs: {
                prompt: {
                  type: 'string',
                  required: true,
                  description: 'Input prompt',
                  default: 'Default prompt' // Provide default to satisfy validation
                }
              },
              outputs: {
                result: {
                  type: 'string',
                  description: 'Output result'
                }
              }
            }
          }
        ],
        edges: []
      };

      // Create mock request
      const request = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visualGraph,
          commitMessage: 'Initial version'
        }),
      });

      // Call API endpoint
      const response = await POST(request, { params: { id: testFlowId } });
      const data = await response.json();

      // Track for cleanup
      if (data.versionId) testVersionIds.push(data.versionId);

      // Verify response
      expect(response.status).toBe(200);
      expect(data.versionId).toBeDefined();
      expect(data.executionGraph).toBeDefined();
      expect(data.executionGraph.nodes).toBeDefined();
      expect(data.executionGraph.adjacency).toBeDefined();
    });

    it('should reject invalid visual graph with validation errors (Requirement 10.1)', async () => {
      // Create an invalid visual graph (cycle)
      const visualGraph: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: 'Node 1',
              worker_type: 'claude',
              config: {}
            }
          },
          {
            id: 'node2',
            type: 'worker',
            position: { x: 100, y: 0 },
            data: {
              label: 'Node 2',
              worker_type: 'claude',
              config: {}
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'node1', target: 'node2' },
          { id: 'e2', source: 'node2', target: 'node1' } // Creates cycle
        ]
      };

      // Create mock request
      const request = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visualGraph }),
      });

      // Call API endpoint
      const response = await POST(request, { params: { id: testFlowId } });
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(400);
      expect(data.error).toContain('validation failed');
      expect(data.validationErrors).toBeDefined();
      expect(Array.isArray(data.validationErrors)).toBe(true);
    });

    it('should return 400 when visualGraph is missing', async () => {
      // Create mock request without visualGraph
      const request = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Call API endpoint
      const response = await POST(request, { params: { id: testFlowId } });
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(400);
      expect(data.error).toContain('visualGraph is required');
    });
  });

  describe('GET /api/flows/[id]/versions', () => {
    it('should list all versions for a flow (Requirement 10.5)', async () => {
      // Create two versions
      const visualGraph: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: 'Test Worker',
              worker_type: 'claude',
              config: {}
            }
          }
        ],
        edges: []
      };

      // Create first version
      const request1 = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualGraph, commitMessage: 'Version 1' }),
      });
      const response1 = await POST(request1, { params: { id: testFlowId } });
      const data1 = await response1.json();
      testVersionIds.push(data1.versionId);

      // Create second version
      const request2 = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualGraph, commitMessage: 'Version 2' }),
      });
      const response2 = await POST(request2, { params: { id: testFlowId } });
      const data2 = await response2.json();
      testVersionIds.push(data2.versionId);

      // List versions
      const listRequest = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
        method: 'GET',
      });
      const listResponse = await GET(listRequest, { params: { id: testFlowId } });
      const listData = await listResponse.json();

      // Verify response
      expect(listResponse.status).toBe(200);
      expect(listData.versions).toBeDefined();
      expect(Array.isArray(listData.versions)).toBe(true);
      expect(listData.versions.length).toBeGreaterThanOrEqual(2);
      
      // Verify metadata-only response (no heavy graph blobs)
      listData.versions.forEach((v: unknown) => {
        expect(v).toHaveProperty('id');
        expect(v).toHaveProperty('flow_id');
        expect(v).toHaveProperty('commit_message');
        expect(v).toHaveProperty('created_at');
        // Should NOT include heavy graph blobs
        expect(v).not.toHaveProperty('visual_graph');
        expect(v).not.toHaveProperty('execution_graph');
      });
      
      // Verify versions are ordered by created_at DESC (newest first)
      if (listData.versions.length >= 2) {
        const dates = listData.versions.map((v: unknown) => new Date(v.created_at).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it('should return empty array for flow with no versions', async () => {
      // Create a new flow without versions
      const emptyFlow = await createFlow('Empty Flow', { nodes: [], edges: [] });
      
      try {
        const request = new NextRequest(`http://localhost:3000/api/flows/${emptyFlow.id}/versions`, {
          method: 'GET',
        });
        const response = await GET(request, { params: { id: emptyFlow.id } });
        const data = await response.json();

        // Verify response
        expect(response.status).toBe(200);
        expect(data.versions).toBeDefined();
        expect(Array.isArray(data.versions)).toBe(true);
        expect(data.versions.length).toBe(0);
      } finally {
        await deleteFlow(emptyFlow.id);
      }
    });
  });

  describe('GET /api/flows/[id]/versions/[vid]', () => {
    it('should retrieve a specific version (Requirement 10.4)', async () => {
      // Create a version
      const visualGraph: VisualGraph = {
        nodes: [
          {
            id: 'node1',
            type: 'worker',
            position: { x: 0, y: 0 },
            data: {
              label: 'Test Worker',
              worker_type: 'claude',
              config: {}
            }
          }
        ],
        edges: []
      };

      const createRequest = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualGraph, commitMessage: 'Test version' }),
      });
      const createResponse = await POST(createRequest, { params: { id: testFlowId } });
      const createData = await createResponse.json();
      const versionId = createData.versionId;
      testVersionIds.push(versionId);

      // Retrieve the version
      const getRequest = new NextRequest(
        `http://localhost:3000/api/flows/${testFlowId}/versions/${versionId}`,
        { method: 'GET' }
      );
      const getResponse = await GET_VERSION(getRequest, {
        params: { id: testFlowId, vid: versionId }
      });
      const getData = await getResponse.json();

      // Verify response
      expect(getResponse.status).toBe(200);
      expect(getData.version).toBeDefined();
      expect(getData.version.id).toBe(versionId);
      expect(getData.version.flow_id).toBe(testFlowId);
      expect(getData.version.visual_graph).toBeDefined();
      expect(getData.version.execution_graph).toBeDefined();
      expect(getData.version.commit_message).toBe('Test version');
    });

    it('should return 404 for non-existent version', async () => {
      const fakeVersionId = '00000000-0000-0000-0000-000000000000';
      
      const request = new NextRequest(
        `http://localhost:3000/api/flows/${testFlowId}/versions/${fakeVersionId}`,
        { method: 'GET' }
      );
      const response = await GET_VERSION(request, {
        params: { id: testFlowId, vid: fakeVersionId }
      });
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return 404 when version belongs to different flow', async () => {
      // Create another flow
      const otherFlow = await createFlow('Other Flow', { nodes: [], edges: [] });
      
      try {
        // Create a version for the first flow
        const visualGraph: VisualGraph = {
          nodes: [
            {
              id: 'node1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                worker_type: 'claude',
                config: {}
              }
            }
          ],
          edges: []
        };

        const createRequest = new NextRequest(`http://localhost:3000/api/flows/${testFlowId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visualGraph }),
        });
        const createResponse = await POST(createRequest, { params: { id: testFlowId } });
        const createData = await createResponse.json();
        const versionId = createData.versionId;
        testVersionIds.push(versionId);

        // Try to retrieve the version using the other flow's ID
        const getRequest = new NextRequest(
          `http://localhost:3000/api/flows/${otherFlow.id}/versions/${versionId}`,
          { method: 'GET' }
        );
        const getResponse = await GET_VERSION(getRequest, {
          params: { id: otherFlow.id, vid: versionId }
        });
        const getData = await getResponse.json();

        // Verify response
        expect(getResponse.status).toBe(404);
        expect(getData.error).toContain('does not belong to this flow');
      } finally {
        await deleteFlow(otherFlow.id);
      }
    });
  });
});
