/**
 * Unit tests for webhook processing orchestration
 * Tests: Requirements 2.2
 */

// beforeEach import removed as unused
import { processWebhook } from '../processor';
import { createWebhookConfig, deleteWebhookConfig } from '../../db/webhook-configs';
import { getWebhookEventById } from '../../db/webhook-events';
import { createFlow, deleteFlow } from '../../db/flows';
import { getRun, deleteRun } from '../../db/runs';
import { getAdminClient } from '../../supabase/client';
import { StitchNode, StitchEdge, EntityMapping } from '@/types/stitch';
import crypto from 'crypto';

describe('Webhook Processing Orchestration', () => {
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

  describe('Successful webhook processing flow', () => {
    it('should process webhook end-to-end successfully (Requirement 2.2)', async () => {
      // Create webhook configuration
      const entityMapping: EntityMapping = {
        name: '$.customer.name',
        email: '$.customer.email',
        entity_type: 'customer',
        metadata: {
          plan: '$.subscription.plan',
        },
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test Webhook',
        source: 'stripe',
        endpoint_slug: 'test-webhook-success',
        secret: null, // No signature validation for this test
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      // Prepare webhook payload
      const payload = {
        customer: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
        },
        subscription: {
          plan: 'pro',
        },
      };

      const rawBody = JSON.stringify(payload);

      // Process webhook
      const result = await processWebhook(
        'test-webhook-success',
        rawBody,
        payload,
        null
      );

      // Track for cleanup
      if (result.entityId) testEntityIds.push(result.entityId);
      if (result.workflowRunId) testRunIds.push(result.workflowRunId);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.webhookEventId).toBeDefined();
      expect(result.entityId).toBeDefined();
      expect(result.workflowRunId).toBeDefined();
      expect(result.error).toBeUndefined();

      // Verify webhook event was created and completed
      const webhookEvent = await getWebhookEventById(result.webhookEventId);
      expect(webhookEvent).not.toBeNull();
      expect(webhookEvent?.status).toBe('completed');
      expect(webhookEvent?.entity_id).toBe(result.entityId);
      expect(webhookEvent?.workflow_run_id).toBe(result.workflowRunId);
      expect(webhookEvent?.error).toBeNull();

      // Verify entity was created
      const _supabase = getAdminClient();
      const { data: entity } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('id', result.entityId!)
        .single();

      expect(entity).not.toBeNull();
      expect(entity?.name).toBe('Alice Johnson');
      expect(entity?.email).toBe('alice@example.com');
      expect(entity?.entity_type).toBe('customer');
      expect(entity?.metadata).toMatchObject({ plan: 'pro' }); // Use toMatchObject to allow additional fields from adapter

      // Verify workflow run was created with trigger metadata
      const run = await getRun(result.workflowRunId!);
      expect(run).not.toBeNull();
      expect(run?.entity_id).toBe(result.entityId);
      expect(run?.trigger.type).toBe('webhook');
      expect(run?.trigger.source).toBe('stripe');
      expect(run?.trigger.event_id).toBe(result.webhookEventId);
    });

    it('should update existing entity when email matches', async () => {
      // Create webhook configuration
      const entityMapping: EntityMapping = {
        name: '$.name',
        email: '$.email',
        entity_type: 'lead',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test Webhook Update',
        source: 'hubspot',
        endpoint_slug: 'test-webhook-update',
        secret: null,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      // Create initial entity
      const _supabase = getAdminClient();
      const { data: initialEntity } = await supabase
        .from('stitch_entities')
        .insert({
          canvas_id: testCanvasId,
          name: 'Bob Smith',
          email: 'bob@example.com',
          entity_type: 'lead',
          metadata: {},
        })
        .select()
        .single();

      testEntityIds.push(initialEntity!.id);

      // Process webhook with same email but different name
      const payload = {
        name: 'Robert Smith',
        email: 'bob@example.com',
      };

      const result = await processWebhook(
        'test-webhook-update',
        JSON.stringify(payload),
        payload,
        null
      );

      if (result.workflowRunId) testRunIds.push(result.workflowRunId);

      // Verify entity was updated, not created
      expect(result.success).toBe(true);
      expect(result.entityId).toBe(initialEntity!.id);

      // Verify entity name was updated
      const { data: updatedEntity } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('id', result.entityId!)
        .single();

      expect(updatedEntity?.name).toBe('Robert Smith');
      expect(updatedEntity?.email).toBe('bob@example.com');
    });
  });

  describe('Signature validation failure', () => {
    it('should reject webhook with invalid signature (Requirement 2.2)', async () => {
      // Create webhook configuration with secret
      const secret = 'my-secret-key';
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test Webhook Signature',
        source: 'custom', // Use custom source for generic signature validation
        endpoint_slug: 'test-webhook-signature',
        secret: secret,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      const payload = { name: 'Charlie' };
      const rawBody = JSON.stringify(payload);

      // Provide invalid signature
      const invalidSignature = 'invalid-signature';

      // Process webhook
      const result = await processWebhook(
        'test-webhook-signature',
        rawBody,
        payload,
        invalidSignature
      );

      // Verify failure
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');

      // Verify webhook event was created and marked as failed
      const webhookEvent = await getWebhookEventById(result.webhookEventId);
      expect(webhookEvent).not.toBeNull();
      expect(webhookEvent?.status).toBe('failed');
      expect(webhookEvent?.error).toContain('Invalid webhook signature');
    });

    it('should accept webhook with valid signature', async () => {
      // Create webhook configuration with secret
      const secret = 'my-secret-key';
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test Webhook Valid Signature',
        source: 'custom', // Use custom source for generic signature validation
        endpoint_slug: 'test-webhook-valid-sig',
        secret: secret,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      const payload = { name: 'Diana' };
      const rawBody = JSON.stringify(payload);

      // Compute valid signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const validSignature = hmac.digest('hex');

      // Process webhook
      const result = await processWebhook(
        'test-webhook-valid-sig',
        rawBody,
        payload,
        validSignature
      );

      if (result.entityId) testEntityIds.push(result.entityId);
      if (result.workflowRunId) testRunIds.push(result.workflowRunId);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Inactive webhook rejection', () => {
    it('should reject webhook when is_active is false (Requirement 2.2)', async () => {
      // Create inactive webhook configuration
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test Webhook Inactive',
        source: 'custom',
        endpoint_slug: 'test-webhook-inactive',
        secret: null,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: false, // Inactive
      });
      testWebhookConfigId = webhookConfig.id;

      const payload = { name: 'Eve' };
      const rawBody = JSON.stringify(payload);

      // Process webhook
      const result = await processWebhook(
        'test-webhook-inactive',
        rawBody,
        payload,
        null
      );

      // Verify failure
      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');

      // Verify webhook event was created and marked as failed
      const webhookEvent = await getWebhookEventById(result.webhookEventId);
      expect(webhookEvent).not.toBeNull();
      expect(webhookEvent?.status).toBe('failed');
    });
  });

  describe('Entity mapping error handling', () => {
    it('should handle entity mapping errors gracefully (Requirement 2.2)', async () => {
      // Create webhook configuration with mapping that will fail
      const entityMapping: EntityMapping = {
        name: '$.customer.name', // This path doesn't exist in payload
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test Webhook Mapping Error',
        source: 'custom',
        endpoint_slug: 'test-webhook-mapping-error',
        secret: null,
        workflow_id: testFlowId,
        entry_edge_id: 'edge-1',
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      // Payload missing the expected structure
      const payload = { user: { name: 'Frank' } };
      const rawBody = JSON.stringify(payload);

      // Process webhook
      const result = await processWebhook(
        'test-webhook-mapping-error',
        rawBody,
        payload,
        null
      );

      // Verify failure
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Verify webhook event was created and marked as failed
      const webhookEvent = await getWebhookEventById(result.webhookEventId);
      expect(webhookEvent).not.toBeNull();
      expect(webhookEvent?.status).toBe('failed');
      expect(webhookEvent?.error).toBeDefined();
    });
  });

  describe('Workflow execution error handling', () => {
    it('should handle workflow execution errors gracefully (Requirement 2.2)', async () => {
      // Create webhook configuration with invalid entry_edge_id
      const entityMapping: EntityMapping = {
        name: '$.name',
        entity_type: 'customer',
      };

      const webhookConfig = await createWebhookConfig({
        canvas_id: testCanvasId,
        name: 'Test Webhook Execution Error',
        source: 'custom',
        endpoint_slug: 'test-webhook-exec-error',
        secret: null,
        workflow_id: testFlowId,
        entry_edge_id: 'non-existent-edge', // Invalid edge
        entity_mapping: entityMapping,
        is_active: true,
      });
      testWebhookConfigId = webhookConfig.id;

      const payload = { name: 'Grace' };
      const rawBody = JSON.stringify(payload);

      // Process webhook
      const result = await processWebhook(
        'test-webhook-exec-error',
        rawBody,
        payload,
        null
      );

      if (result.entityId) testEntityIds.push(result.entityId);

      // Verify failure
      expect(result.success).toBe(false);
      expect(result.error).toContain('Entry edge not found');

      // Verify webhook event was created and marked as failed
      const webhookEvent = await getWebhookEventById(result.webhookEventId);
      expect(webhookEvent).not.toBeNull();
      expect(webhookEvent?.status).toBe('failed');
      expect(webhookEvent?.error).toContain('Entry edge not found');
    });
  });
});
