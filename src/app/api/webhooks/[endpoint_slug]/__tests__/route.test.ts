/**
 * Integration tests for webhook API endpoint
 * Tests: Requirements 1.2, 1.5
 */

// beforeEach import removed as unused
import { POST } from '../route';
import { createWebhookConfig, deleteWebhookConfig } from '@/lib/db/webhook-configs';
import { createFlow, deleteFlow } from '@/lib/db/flows';
import { deleteRun } from '@/lib/db/runs';
import { getAdminClient } from '@/lib/supabase/client';
import { StitchNode, StitchEdge, EntityMapping } from '@/types/stitch';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

describe('Webhook API Endpoint', () => {
  let testFlowId: string;
  let testCanvasId: string;
  let testWebhookConfigId: string;
  let testRunIds: string[] = [];
  let testEntityIds: string[] = [];

  beforeEach(async () => {
    // Create a test canvas (BMC)
    const canvas = await createFlow('Test BMC Canvas', {
      nodes: [],
      edges: [],
    });
    testCanvasId = canvas.id;

    // Create a test workflow with nodes and edges
    const nodes: StitchNode[] = [
      { id: 'start', type: 'Worker', position: { x: 0, y: 0 }, data: { workerType: 'test' } },
      { id: 'end', type: 'Worker', position: { x: 100, y: 0 }, data: { workerType: 'test' } },
    ];

    const edges: StitchEdge[] = [
      { id: 'edge-1', source: 'start', target: 'end' },
    ];

    const workflow = await createFlow('Test Workflow', { nodes, edges });
    testFlowId = workflow.id;
  });

  afterEach(async () => {
    // Clean up entities
    const _supabase = getAdminClient();
    for (const entityId of testEntityIds) {
      try {
        await supabase.from('stitch_entities').delete().eq('id', entityId);
      } catch (_e) {
        // Ignore cleanup errors
      }
    }
    testEntityIds = [];

    // Clean up runs
    for (const runId of testRunIds) {
      try {
        await deleteRun(runId);
      } catch (_e) {
        // Ignore cleanup errors
      }
    }
    testRunIds = [];

    // Clean up webhook config
    if (testWebhookConfigId) {
      try {
        await deleteWebhookConfig(testWebhookConfigId);
      } catch (_e) {
        // Ignore cleanup errors
      }
    }

    // Clean up flows
    if (testFlowId) {
      try {
        await deleteFlow(testFlowId);
      } catch (_e) {
        // Ignore cleanup errors
      }
    }
    if (testCanvasId) {
      try {
        await deleteFlow(testCanvasId);
      } catch (_e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Successful webhook request', () => {
    it('should accept and process valid webhook request (Requirement 1.2)', async () => {
      // Create webhook configuration
      const entityMapping: EntityMapping = {
        name: '$.customer.name',
        email: '$.customer.email',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test API Webhook',
        source: 'stripe',
        endpoint_slug: 'test-api-success',
        secret: null,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      // Create mock request
      const payload = {
        customer: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/webhooks/test-api-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Call API endpoint
      const response = await POST(request, { params: { endpoint_slug: 'test-api-success' } });
      const _data = await response.json();

      // Track for cleanup
      if (data.entityId) testEntityIds.push(data.entityId);
      if (data.workflowRunId) testRunIds.push(data.workflowRunId);

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.webhookEventId).toBeDefined();
      expect(data.entityId).toBeDefined();
      expect(data.workflowRunId).toBeDefined();
    });
  });

  describe('Invalid signature rejection', () => {
    it('should reject webhook with invalid signature (Requirement 1.5)', async () => {
      // Create webhook configuration with secret
      const secret = 'test-secret-key';
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test API Webhook Signature',
        source: 'stripe',
        endpoint_slug: 'test-api-signature',
        secret: secret,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      // Create mock request with invalid signature
      const payload = { name: 'Bob' };

      const request = new NextRequest('http://localhost:3000/api/webhooks/test-api-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'invalid-signature',
        },
        body: JSON.stringify(payload),
      });

      // Call API endpoint
      const response = await POST(request, { params: { endpoint_slug: 'test-api-signature' } });
      const _data = await response.json();

      // Verify response
      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid webhook signature');
    });

    it('should accept webhook with valid signature (Requirement 1.5)', async () => {
      // Create webhook configuration with secret
      const secret = 'test-secret-key';
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test API Webhook Valid Sig',
        source: 'custom', // Use custom source for generic signature validation
        endpoint_slug: 'test-api-valid-sig',
        secret: secret,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      // Create mock request with valid signature
      const payload = { name: 'Charlie' };
      const rawBody = JSON.stringify(payload);

      // Compute valid signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const validSignature = hmac.digest('hex');

      const request = new NextRequest('http://localhost:3000/api/webhooks/test-api-valid-sig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': validSignature,
        },
        body: rawBody,
      });

      // Call API endpoint
      const response = await POST(request, { params: { endpoint_slug: 'test-api-valid-sig' } });
      const _data = await response.json();

      // Track for cleanup
      if (data.entityId) testEntityIds.push(data.entityId);
      if (data.workflowRunId) testRunIds.push(data.workflowRunId);

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Unknown endpoint slug', () => {
    it('should return 404 for unknown endpoint slug (Requirement 1.2)', async () => {
      // Create mock request for non-existent endpoint
      const payload = { name: 'Diana' };

      const request = new NextRequest('http://localhost:3000/api/webhooks/non-existent-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Call API endpoint
      const response = await POST(request, { params: { endpoint_slug: 'non-existent-endpoint' } });
      const _data = await response.json();

      // Verify response
      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('Inactive webhook rejection', () => {
    it('should return 404 for inactive webhook (Requirement 1.2)', async () => {
      // Create inactive webhook configuration
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test API Webhook Inactive',
        source: 'custom',
        endpoint_slug: 'test-api-inactive',
        secret: null,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: false, // Inactive
      });
      testWebhookConfigId = webhookConfig.id;

      // Create mock request
      const payload = { name: 'Eve' };

      const request = new NextRequest('http://localhost:3000/api/webhooks/test-api-inactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Call API endpoint
      const response = await POST(request, { params: { endpoint_slug: 'test-api-inactive' } });
      const _data = await response.json();

      // Verify response
      expect(response.status).toBe(404);
      expect(data.error).toContain('inactive');
    });
  });

  describe('Invalid JSON payload', () => {
    it('should return 400 for invalid JSON', async () => {
      // Create webhook configuration
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test API Webhook Invalid JSON',
        source: 'custom',
        endpoint_slug: 'test-api-invalid-json',
        secret: null,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      // Create mock request with invalid JSON
      const request = new NextRequest('http://localhost:3000/api/webhooks/test-api-invalid-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json {',
      });

      // Call API endpoint
      const response = await POST(request, { params: { endpoint_slug: 'test-api-invalid-json' } });
      const _data = await response.json();

      // Verify response
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON payload');
    });
  });
});
