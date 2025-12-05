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
import { getFlowAdmin } from '../db/flows';
import { getAdminClient } from '../supabase/client';
import { fireNode } from '../engine/edge-walker';
import { startJourney } from '../db/entities';
import { StitchEntity, TriggerMetadata } from '@/types/stitch';

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
  let webhookConfigId: string | undefined;
  
  try {
    // Step 1: Look up webhook configuration by endpoint_slug
    // Validates: Requirements 1.2
    const webhookConfig = await getWebhookConfigBySlugAdmin(endpointSlug);
    
    if (!webhookConfig) {
      throw new Error(`Webhook endpoint not found: ${endpointSlug}`);
    }
    
    webhookConfigId = webhookConfig.id;
    
    // Step 2: Create webhook event record (status: 'pending') BEFORE validation
    // This ensures we log all webhook attempts, even failed ones
    // Validates: Requirements 2.1
    const webhookEvent = await createWebhookEvent({
      webhook_config_id: webhookConfig.id,
      payload,
      entity_id: null,
      workflow_run_id: null,
      status: 'pending',
      error: null,
    });
    
    webhookEventId = webhookEvent.id;
    
    // Step 3: Check if webhook is active
    // Validates: Requirements 1.3
    if (!webhookConfig.is_active) {
      throw new Error(`Webhook endpoint is inactive: ${endpointSlug}`);
    }

    // Step 3.5: Enforce signature validation if required
    // In production or when explicitly required, reject webhooks without signatures
    const isProduction = process.env.NODE_ENV === 'production';
    const requireSignature = webhookConfig.require_signature || (isProduction && webhookConfig.secret);

    if (requireSignature && !signature) {
      throw new Error(`Webhook signature is required but not provided for endpoint: ${endpointSlug}`);
    }

    // Step 4: Validate signature and extract entity data using adapters
    // Construct Headers object for adapter processing
    // Map signature to appropriate header based on source
    // Validates: Requirements 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
    const headers = new Headers();
    if (signature) {
      // Map signature to correct header key based on source
      if (webhookConfig.source === 'stripe') {
        headers.set('Stripe-Signature', signature);
      } else if (webhookConfig.source === 'typeform') {
        headers.set('Typeform-Signature', signature);
      } else if (webhookConfig.source === 'calendly') {
        headers.set('Calendly-Webhook-Signature', signature);
      } else if (webhookConfig.source === 'n8n') {
        headers.set('x-webhook-secret', signature);
      } else {
        headers.set('X-Webhook-Signature', signature);
      }
    }
    
    // Process webhook using adapter system
    // This handles both signature verification and entity extraction
    const entityData = await processAdapterLogic(
      webhookConfig,
      rawBody,
      payload,
      headers
    );
    
    // Update status to 'processing'
    // Validates: Requirements 2.2
    await updateWebhookEvent(webhookEventId, {
      status: 'processing',
    });
    
    // Step 6: Create or update entity in stitch_entities
    // We'll check if an entity with the same email exists, and update it if so
    const _supabase = getAdminClient();
    
    let entity: StitchEntity;
    
    // Try to find existing entity by email (if email is provided)
    if (entityData.email) {
      const { data: existingEntity } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', webhookConfig.canvas_id)
        .eq('email', entityData.email)
        .single();
      
      if (existingEntity) {
        // Update existing entity
        const { data: updatedEntity, error: updateError } = await supabase
          .from('stitch_entities')
          .update({
            name: entityData.name,
            entity_type: entityData.entity_type,
            avatar_url: entityData.avatar_url,
            metadata: entityData.metadata,
          })
          .eq('id', existingEntity.id)
          .select()
          .single();
        
        if (updateError || !updatedEntity) {
          throw new Error(`Failed to update entity: ${updateError?.message}`);
        }
        
        entity = updatedEntity as StitchEntity;
      } else {
        // Create new entity
        const { data: newEntity, error: createError } = await supabase
          .from('stitch_entities')
          .insert({
            canvas_id: webhookConfig.canvas_id,
            name: entityData.name,
            email: entityData.email,
            entity_type: entityData.entity_type,
            avatar_url: entityData.avatar_url,
            metadata: entityData.metadata,
          })
          .select()
          .single();
        
        if (createError || !newEntity) {
          throw new Error(`Failed to create entity: ${createError?.message}`);
        }
        
        entity = newEntity as StitchEntity;
      }
    } else {
      // No email provided, always create new entity
      const { data: newEntity, error: createError } = await supabase
        .from('stitch_entities')
        .insert({
          canvas_id: webhookConfig.canvas_id,
          name: entityData.name,
          email: entityData.email,
          entity_type: entityData.entity_type,
          avatar_url: entityData.avatar_url,
          metadata: entityData.metadata,
        })
        .select()
        .single();
      
      if (createError || !newEntity) {
        throw new Error(`Failed to create entity: ${createError?.message}`);
      }
      
      entity = newEntity as StitchEntity;
    }
    
    // Step 7: Place entity on entry edge for visual journey
    // This creates the "travelling" effect before execution starts
    if (webhookConfig.entry_edge_id) {
      try {
        await startJourney(entity.id, webhookConfig.entry_edge_id);
      } catch (_e) {
        console.warn('Failed to start visual journey on entry edge:', e);
        // Continue processing; this is just visual
      }
    }
    
    // Step 8: Create workflow run with trigger metadata
    // Validates: Requirements 3.1, 3.2, 3.3
    const triggerMetadata: TriggerMetadata = {
      type: 'webhook',
      source: webhookConfig.source,
      event_id: webhookEventId,
      timestamp: new Date().toISOString(),
    };
    
    const workflowRun = await createRunAdmin(webhookConfig.workflow_id, {
      entity_id: entity.id,
      trigger: triggerMetadata,
    });
    
    // Step 9: Start execution at entry_edge_id using existing engine
    // Get the flow to find the target node of the entry edge
    const _flow = await getFlowAdmin(webhookConfig.workflow_id);
    
    if (!flow) {
      throw new Error(`Workflow not found: ${webhookConfig.workflow_id}`);
    }
    
    // Find the entry edge
    const entryEdge = flow.graph.edges.find(e => e.id === webhookConfig.entry_edge_id);
    
    if (!entryEdge) {
      throw new Error(`Entry edge not found: ${webhookConfig.entry_edge_id}`);
    }
    
    // Fire the target node of the entry edge
    // This starts the workflow execution
    await fireNode(entryEdge.target, flow, workflowRun);
    
    // Step 10: Update webhook event (status: 'completed', link entity_id and workflow_run_id)
    // Validates: Requirements 2.2, 2.3, 2.4
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
    
  } catch (_error) {
    // Handle errors and update webhook event status accordingly
    // Validates: Requirements 2.2
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
