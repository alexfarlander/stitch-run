/**
 * Webhook Processing Orchestration
 * 
 * Coordinates the complete webhook processing flow:
 * 1. Look up webhook configuration
 * 2. Validate signature
 * 3. Log webhook event
 * 4. Map payload to entity data
 * 5. Create/update entity
 * 6. Place entity on entry edge (visual journey)
 * 7. Create workflow run
 * 8. Start execution
 * 9. Update webhook event with results
 * 
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */

import { getWebhookConfigBySlugAdmin } from '../db/webhook-configs';
import { createWebhookEvent, updateWebhookEvent } from '../db/webhook-events';
import { processAdapterLogic } from './adapters';
import { createRunAdmin } from '../db/runs';
import { getAdminClient } from '../supabase/client';
import { getVersionAdmin } from '../canvas/version-manager';
import { fireNodeWithGraph } from '../engine/edge-walker';
import { fireUXNode } from '../engine/handlers/ux';
import { startJourney } from '../db/entities';
import { StitchEntity, TriggerMetadata, WebhookConfig } from '@/types/stitch';

/**
 * Result of webhook processing
 */
export interface WebhookProcessingResult {
  success: boolean;
  webhookEventId: string;
  entityId?: string;
  workflowRunId?: string;
  error?: string;
}

/**
 * Entity data extracted from webhook payload
 * Use ExtractedEntity from adapters which has the correct optional fields
 */
import { ExtractedEntity } from './adapters';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate webhook configuration
 * Fetches config, checks if it exists and is active
 *
 * @param endpointSlug - The webhook endpoint slug
 * @returns The webhook configuration
 * @throws Error if webhook not found or inactive
 */
export async function validateWebhookConfig(endpointSlug: string): Promise<WebhookConfig> {
  const webhookConfig = await getWebhookConfigBySlugAdmin(endpointSlug);

  if (!webhookConfig) {
    throw new Error(`Webhook endpoint not found: ${endpointSlug}`);
  }

  if (!webhookConfig.is_active) {
    throw new Error(`Webhook endpoint is inactive: ${endpointSlug}`);
  }

  return webhookConfig;
}

/**
 * Extract entity data from webhook payload
 * Handles signature validation and adapter processing
 *
 * @param config - Webhook configuration
 * @param rawBody - Raw request body for signature validation
 * @param payload - Parsed JSON payload
 * @param signature - Webhook signature header
 * @returns Extracted entity data
 * @throws Error if signature validation fails
 */
export async function extractEntityData(
  config: WebhookConfig,
  rawBody: string,
  payload: Record<string, unknown>,
  signature: string | null | undefined
): Promise<ExtractedEntity> {
  // Enforce signature validation if required
  const isProduction = process.env.NODE_ENV === 'production';
  const hasSecret = Boolean(config.secret && config.secret.trim() !== '');
  const requireSignature = hasSecret && (config.require_signature || isProduction);

  if (requireSignature && !signature) {
    throw new Error(`Webhook signature is required but not provided for endpoint: ${config.endpoint_slug}`);
  }

  // Construct Headers object for adapter processing
  // Map signature to appropriate header based on source
  const headers = new Headers();
  if (signature) {
    // Map signature to correct header key based on source
    if (config.source === 'stripe') {
      headers.set('Stripe-Signature', signature);
    } else if (config.source === 'typeform') {
      headers.set('Typeform-Signature', signature);
    } else if (config.source === 'calendly') {
      headers.set('Calendly-Webhook-Signature', signature);
    } else if (config.source === 'n8n') {
      headers.set('x-webhook-secret', signature);
    } else {
      headers.set('X-Webhook-Signature', signature);
    }
  }

  // Process webhook using adapter system
  // This handles both signature verification and entity extraction
  return await processAdapterLogic(config, rawBody, payload, headers);
}

/**
 * Upsert webhook entity (create or update)
 * Finds existing entity by email or creates new one
 *
 * @param config - Webhook configuration
 * @param entityData - Entity data extracted from payload
 * @returns The created or updated entity
 * @throws Error if database operation fails
 */
export async function upsertWebhookEntity(
  config: WebhookConfig,
  entityData: ExtractedEntity
): Promise<StitchEntity> {
  const supabase = getAdminClient();

  // Try to find existing entity by email (if email is provided)
  if (entityData.email) {
    const { data: existingEntity } = await supabase
      .from('stitch_entities')
      .select('*')
      .eq('canvas_id', config.canvas_id)
      .eq('email', entityData.email)
      .single();

    if (existingEntity) {
      // Update existing entity
      const { data: updatedEntity, error: updateError } = await supabase
        .from('stitch_entities')
        .update({
          name: entityData.name || existingEntity.name,
          entity_type: entityData.entity_type || existingEntity.entity_type,
          avatar_url: entityData.avatar_url || existingEntity.avatar_url,
          metadata: entityData.metadata,
        })
        .eq('id', existingEntity.id)
        .select()
        .single();

      if (updateError || !updatedEntity) {
        throw new Error(`Failed to update entity: ${updateError?.message}`);
      }

      return updatedEntity as StitchEntity;
    }
  }

  // Create new entity (either no email or no existing match)
  const { data: newEntity, error: createError } = await supabase
    .from('stitch_entities')
    .insert({
      canvas_id: config.canvas_id,
      name: entityData.name || 'Unknown',
      email: entityData.email || null,
      entity_type: entityData.entity_type || 'lead',
      avatar_url: entityData.avatar_url || null,
      metadata: entityData.metadata,
    })
    .select()
    .single();

  if (createError || !newEntity) {
    throw new Error(`Failed to create entity: ${createError?.message}`);
  }

  return newEntity as StitchEntity;
}

/**
 * Execute webhook workflow run
 * Creates run and starts execution from entry point
 *
 * @param config - Webhook configuration
 * @param entityId - Entity ID to associate with run
 * @param eventId - Webhook event ID for trigger metadata
 * @returns The created workflow run
 * @throws Error if execution fails
 */
export async function executeWebhookRun(
  config: WebhookConfig,
  entityId: string,
  eventId: string
): Promise<{ id: string; flow_version_id: string | null }> {
  // Create workflow run with trigger metadata
  const triggerMetadata: TriggerMetadata = {
    type: 'webhook',
    source: config.source,
    event_id: eventId,
    timestamp: new Date().toISOString(),
  };

  const workflowRun = await createRunAdmin(config.workflow_id, {
    entity_id: entityId,
    trigger: triggerMetadata,
  });

  // Start execution using versioned graphs
  if (!workflowRun.flow_version_id) {
    throw new Error(`Run has no flow_version_id: ${workflowRun.id}`);
  }

  const version = await getVersionAdmin(workflowRun.flow_version_id);
  if (!version) {
    throw new Error(`Flow version not found: ${workflowRun.flow_version_id}`);
  }

  const executionGraph = version.execution_graph;

  // If an explicit entry edge is configured, fire its target node
  // Otherwise, fall back to firing executionGraph entry nodes
  if (config.entry_edge_id) {
    const entryEdge = version.visual_graph.edges.find(e => e.id === config.entry_edge_id);

    if (!entryEdge) {
      throw new Error(`Entry edge not found in version graph: ${config.entry_edge_id}`);
    }

    // Fire the target node of the entry edge
    await fireNodeWithGraph(entryEdge.target, executionGraph, workflowRun);
  } else {
    // Fallback: fire all entry nodes
    for (const nodeId of executionGraph.entryNodes) {
      const node = executionGraph.nodes[nodeId];
      if (!node) continue;

      if (node.type === 'UX') {
        await fireUXNode(workflowRun.id, nodeId, node.config || {}, {});
      } else {
        await fireNodeWithGraph(nodeId, executionGraph, workflowRun);
      }
    }
  }

  return workflowRun;
}

/**
 * Process an incoming webhook request
 *
 * This is the main orchestration function that coordinates all webhook processing steps.
 * It follows the edge-walking execution model and ensures all state is persisted to the database.
 *
 * @param endpointSlug - The unique endpoint identifier from the URL
 * @param rawBody - The raw request body as a string (for signature validation)
 * @param payload - The parsed JSON payload
 * @param signature - The X-Webhook-Signature header value (optional)
 * @returns Processing result with IDs and status
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */
export async function processWebhook(
  endpointSlug: string,
  rawBody: string,
  payload: Record<string, unknown>,
  signature?: string | null
): Promise<WebhookProcessingResult> {
  let webhookEventId: string | undefined;

  try {
    // Step 1: Validate webhook configuration
    const config = await validateWebhookConfig(endpointSlug);

    // Step 2: Create webhook event record (status: 'pending') BEFORE validation
    // This ensures we log all webhook attempts, even failed ones
    const webhookEvent = await createWebhookEvent({
      webhook_config_id: config.id,
      payload,
      entity_id: null,
      workflow_run_id: null,
      status: 'pending',
      error: null,
    });

    webhookEventId = webhookEvent.id;

    // Step 3: Extract and validate entity data
    const entityData = await extractEntityData(config, rawBody, payload, signature);

    // Update status to 'processing'
    await updateWebhookEvent(webhookEventId, {
      status: 'processing',
    });

    // Step 4: Upsert entity (create or update)
    const entity = await upsertWebhookEntity(config, entityData);

    // Step 5: Place entity on entry edge for visual journey (optional)
    if (config.entry_edge_id) {
      try {
        await startJourney(entity.id, config.entry_edge_id);
      } catch (e) {
        console.warn('Failed to start visual journey on entry edge:', e);
        // Continue processing; this is just visual
      }
    }

    // Step 6: Execute workflow run
    const workflowRun = await executeWebhookRun(config, entity.id, webhookEventId);

    // Step 7: Update webhook event (status: 'completed')
    await updateWebhookEvent(webhookEventId, {
      status: 'completed',
      entity_id: entity.id,
      workflow_run_id: workflowRun.id,
    });

    return {
      success: true,
      webhookEventId,
      entityId: entity.id,
      workflowRunId: workflowRun.id,
    };

  } catch (error) {
    // Handle errors and update webhook event status accordingly
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (webhookEventId) {
      try {
        await updateWebhookEvent(webhookEventId, {
          status: 'failed',
          error: errorMessage,
        });
      } catch (updateError) {
        console.error('Failed to update webhook event with error:', updateError);
      }
    }

    return {
      success: false,
      webhookEventId: webhookEventId || '',
      error: errorMessage,
    };
  }
}
