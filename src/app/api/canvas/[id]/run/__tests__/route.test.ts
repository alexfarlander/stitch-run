/**
 * Tests for POST /api/canvas/[id]/run endpoint
 * Requirements: 2.1, 2.3
 */

// beforeEach import removed as unused
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createFlowWithVersion } from '@/lib/db/flows';
import { VisualGraph } from '@/types/canvas-schema';

describe('POST /api/canvas/[id]/run', () => {
  let testFlowId: string;

  beforeEach(async () => {
    // Create a simple test flow with a UX node
    const visualGraph: VisualGraph = {
      nodes: [
        {
          id: 'ux-1',
          type: 'UX',
          position: { x: 0, y: 0 },
          data: {
            label: 'Test UX Node',
            config: {
              prompt: 'Enter test input'
            }
          }
        }
      ],
      edges: []
    };

    const { flow } = await createFlowWithVersion(
      'Test Flow for Run',
      visualGraph,
      'workflow',
      undefined,
      'Initial test version'
    );

    testFlowId = flow.id;
  });

  it('should start workflow execution and return run ID (Requirement 2.1)', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/canvas/${testFlowId}/run`,
      {
        method: 'POST',
        body: JSON.stringify({
          input: { test: 'data' }
        })
      }
    );

    const response = await POST(request, { params: { id: testFlowId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('runId');
    expect(data).toHaveProperty('versionId');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('statusUrl');
    expect(data.status).toBe('running');
    expect(typeof data.runId).toBe('string');
    expect(typeof data.versionId).toBe('string');
  });

  it('should create version snapshot automatically (Requirement 2.3)', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/canvas/${testFlowId}/run`,
      {
        method: 'POST',
        body: JSON.stringify({
          input: { test: 'data' }
        })
      }
    );

    const response = await POST(request, { params: { id: testFlowId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Verify version was created
    const supabase = createServerClient();
    const { data: version, error } = await supabase
      .from('stitch_flow_versions')
      .select('*')
      .eq('id', data.versionId)
      .single();

    expect(error).toBeNull();
    expect(version).toBeTruthy();
    expect(version?.flow_id).toBe(testFlowId);
  });

  it('should return 404 for non-existent canvas', async () => {
    // Use a valid UUID format that doesn't exist
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    const request = new NextRequest(
      `http://localhost:3000/api/canvas/${nonExistentId}/run`,
      {
        method: 'POST',
        body: JSON.stringify({
          input: { test: 'data' }
        })
      }
    );

    const response = await POST(request, { params: { id: nonExistentId } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error');
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/canvas/${testFlowId}/run`,
      {
        method: 'POST',
        body: 'invalid json'
      }
    );

    const response = await POST(request, { params: { id: testFlowId } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should not create duplicate versions when running unchanged canvas', async () => {
    // Run the workflow once
    const request1 = new NextRequest(
      `http://localhost:3000/api/canvas/${testFlowId}/run`,
      {
        method: 'POST',
        body: JSON.stringify({
          input: { test: 'data' }
        })
      }
    );

    const response1 = await POST(request1, { params: { id: testFlowId } });
    const data1 = await response1.json();
    expect(response1.status).toBe(200);
    const firstVersionId = data1.versionId;

    // Run the same workflow again without changes
    const request2 = new NextRequest(
      `http://localhost:3000/api/canvas/${testFlowId}/run`,
      {
        method: 'POST',
        body: JSON.stringify({
          input: { test: 'data' }
        })
      }
    );

    const response2 = await POST(request2, { params: { id: testFlowId } });
    const data2 = await response2.json();
    expect(response2.status).toBe(200);
    const secondVersionId = data2.versionId;

    // Should reuse the same version since canvas hasn't changed
    expect(secondVersionId).toBe(firstVersionId);
  });

  it('should accept optional entityId parameter', async () => {
    // Create a test entity first
    const supabase = createServerClient();
    const { data: entity, error: entityError } = await supabase
      .from('stitch_entities')
      .insert({
        canvas_id: testFlowId,
        name: 'Test Entity',
        entity_type: 'customer',
        current_node_id: 'ux-1',
        journey: [],
        metadata: {}
      })
      .select()
      .single();

    expect(entityError).toBeNull();
    expect(entity).toBeTruthy();
    
    const testEntityId = entity!.id;

    const request = new NextRequest(
      `http://localhost:3000/api/canvas/${testFlowId}/run`,
      {
        method: 'POST',
        body: JSON.stringify({
          input: { test: 'data' },
          entityId: testEntityId
        })
      }
    );

    const response = await POST(request, { params: { id: testFlowId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('runId');
    
    // Verify run was created with entity_id
    const { data: run, error: runError } = await supabase
      .from('stitch_runs')
      .select('entity_id')
      .eq('id', data.runId)
      .single();

    expect(runError).toBeNull();
    expect(run?.entity_id).toBe(testEntityId);
  });
});
