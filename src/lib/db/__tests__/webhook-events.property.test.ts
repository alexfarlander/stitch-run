/**
 * Property-based tests for webhook events
 * Uses fast-check for property-based testing
 * Tests: Properties 4, 5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import {
  createWebhookEvent,
  updateWebhookEvent,
  getWebhookEventById,
} from '../webhook-events';

// ============================================================================
// Test Setup
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const testConfig = { numRuns: 100 };

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid UUID
 */
const uuidArb = fc.uuid();

/**
 * Generate a random JSON payload
 */
const jsonPayloadArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.double(),
    fc.array(fc.string()),
    fc.dictionary(fc.string(), fc.string())
  )
);

/**
 * Generate a webhook event status
 */
const webhookStatusArb = fc.constantFrom(
  'pending',
  'processing',
  'completed',
  'failed'
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test canvas for webhook testing
 */
async function createTestCanvas(): Promise<string> {
  const { data, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: `Test Canvas ${Date.now()}`,
      graph: { nodes: [], edges: [] },
      canvas_type: 'bmc',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Create a test webhook config
 */
async function createTestWebhookConfig(canvasId: string): Promise<string> {
  const { data, error } = await supabase
    .from('stitch_webhook_configs')
    .insert({
      canvas_id: canvasId,
      name: `Test Webhook ${Date.now()}`,
      source: 'test',
      endpoint_slug: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      workflow_id: canvasId,
      entry_edge_id: 'test-edge',
      entity_mapping: { name: '$.name', entity_type: 'test' },
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Clean up test webhook event
 */
async function cleanupWebhookEvent(eventId: string): Promise<void> {
  await supabase.from('stitch_webhook_events').delete().eq('id', eventId);
}

/**
 * Clean up test webhook config
 */
async function cleanupWebhookConfig(configId: string): Promise<void> {
  await supabase.from('stitch_webhook_configs').delete().eq('id', configId);
}

/**
 * Clean up test canvas
 */
async function cleanupCanvas(canvasId: string): Promise<void> {
  await supabase.from('stitch_flows').delete().eq('id', canvasId);
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Webhook Events Property Tests', () => {
  describe('Property 4: Webhook event payload preservation', () => {
    it('**Feature: webhook-system, Property 4: Webhook event payload preservation**', async () => {
      await fc.assert(
        fc.asyncProperty(
          jsonPayloadArb,
          async (payload) => {
            let canvasId: string | null = null;
            let configId: string | null = null;
            let eventId: string | null = null;

            try {
              // Create test canvas and webhook config
              canvasId = await createTestCanvas();
              configId = await createTestWebhookConfig(canvasId);

              // Create webhook event with the generated payload
              const event = await createWebhookEvent({
                webhook_config_id: configId,
                payload: payload,
                entity_id: null,
                workflow_run_id: null,
                status: 'pending',
                error: null,
              });

              eventId = event.id;

              // Fetch the event back from database
              const fetchedEvent = await getWebhookEventById(eventId);

              // Verify payload is preserved exactly
              expect(fetchedEvent).not.toBeNull();
              
              // Use deep equality check which doesn't depend on key order
              expect(fetchedEvent!.payload).toEqual(payload);
            } finally {
              // Cleanup
              if (eventId) await cleanupWebhookEvent(eventId);
              if (configId) await cleanupWebhookConfig(configId);
              if (canvasId) await cleanupCanvas(canvasId);
            }
          }
        ),
        testConfig
      );
    }, 120000); // 120 second timeout for cloud database with many iterations
  });

  describe('Property 5: Webhook event status tracking', () => {
    it('**Feature: webhook-system, Property 5: Webhook event status tracking**', async () => {
      await fc.assert(
        fc.asyncProperty(
          webhookStatusArb,
          fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
          async (finalStatus, errorMessage) => {
            let canvasId: string | null = null;
            let configId: string | null = null;
            let eventId: string | null = null;

            try {
              // Create test canvas and webhook config
              canvasId = await createTestCanvas();
              configId = await createTestWebhookConfig(canvasId);

              // Create webhook event with pending status
              const event = await createWebhookEvent({
                webhook_config_id: configId,
                payload: { test: 'data' },
                entity_id: null,
                workflow_run_id: null,
                status: 'pending',
                error: null,
              });

              eventId = event.id;

              // Update the event to the final status
              const updates: unknown = { status: finalStatus };
              
              // Add error message only if status is 'failed'
              if (finalStatus === 'failed' && errorMessage) {
                updates.error = errorMessage;
              }

              const updatedEvent = await updateWebhookEvent(eventId, updates);

              // Verify status is updated correctly
              expect(updatedEvent.status).toBe(finalStatus);

              // Verify error message is set when status is failed
              if (finalStatus === 'failed' && errorMessage) {
                expect(updatedEvent.error).toBe(errorMessage);
              }

              // Verify processed_at is set when status is completed or failed
              if (finalStatus === 'completed' || finalStatus === 'failed') {
                expect(updatedEvent.processed_at).not.toBeNull();
                expect(new Date(updatedEvent.processed_at!).getTime()).toBeGreaterThan(0);
              }

              // Fetch the event again to verify persistence
              const fetchedEvent = await getWebhookEventById(eventId);
              expect(fetchedEvent).not.toBeNull();
              expect(fetchedEvent!.status).toBe(finalStatus);
              
              if (finalStatus === 'failed' && errorMessage) {
                expect(fetchedEvent!.error).toBe(errorMessage);
              }
            } finally {
              // Cleanup
              if (eventId) await cleanupWebhookEvent(eventId);
              if (configId) await cleanupWebhookConfig(configId);
              if (canvasId) await cleanupCanvas(canvasId);
            }
          }
        ),
        testConfig
      );
    }, 120000); // 120 second timeout for cloud database with many iterations
  });
});
