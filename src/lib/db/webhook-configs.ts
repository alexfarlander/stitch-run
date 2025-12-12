/**
 * Database operations for stitch_webhook_configs table
 * Handles CRUD operations for webhook endpoint configurations
 */

import { createServerClient } from '../supabase/server';
import { getAdminClient } from '../supabase/client';
import { WebhookConfig } from '@/types/stitch';

/**
 * Create a new webhook configuration
 * Validates: Requirements 1.1, 1.2
 * 
 * @param config - Webhook configuration data
 * @returns Created webhook configuration
 * @throws Error if creation fails or endpoint_slug is not unique
 */
export async function createWebhookConfig(
  config: Omit<WebhookConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<WebhookConfig> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_webhook_configs')
    .insert({
      canvas_id: config.canvas_id,
      name: config.name,
      source: config.source,
      endpoint_slug: config.endpoint_slug,
      secret: config.secret,
      workflow_id: config.workflow_id,
      entry_edge_id: config.entry_edge_id,
      entity_mapping: config.entity_mapping,
      is_active: config.is_active,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create webhook config: ${error.message}`);
  }

  return data as WebhookConfig;
}

/**
 * Get a webhook configuration by endpoint slug
 * Validates: Requirements 1.2, 1.4
 * 
 * @param endpointSlug - Unique endpoint identifier
 * @returns Webhook configuration or null if not found
 */
export async function getWebhookConfigBySlug(
  endpointSlug: string
): Promise<WebhookConfig | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_webhook_configs')
    .select('*')
    .eq('endpoint_slug', endpointSlug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get webhook config: ${error.message}`);
  }

  return data as WebhookConfig;
}

/**
 * Get a webhook configuration by endpoint slug using admin client
 * Use this in webhook endpoints where there are no cookies/session
 * Validates: Requirements 1.2, 1.4
 * 
 * @param endpointSlug - Unique endpoint identifier
 * @returns Webhook configuration or null if not found
 */
export async function getWebhookConfigBySlugAdmin(
  endpointSlug: string
): Promise<WebhookConfig | null> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_webhook_configs')
    .select('*')
    .eq('endpoint_slug', endpointSlug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get webhook config: ${error.message}`);
  }

  return data as WebhookConfig;
}

/**
 * Get all webhook configurations for a canvas
 * Validates: Requirements 1.3, 1.4
 * 
 * @param canvasId - Canvas ID to filter by
 * @returns Array of webhook configurations
 */
export async function getWebhookConfigsByCanvas(
  canvasId: string
): Promise<WebhookConfig[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_webhook_configs')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get webhook configs: ${error.message}`);
  }

  return (data || []) as WebhookConfig[];
}

/**
 * Update a webhook configuration
 * Validates: Requirements 1.4
 * 
 * @param id - Webhook configuration ID
 * @param updates - Fields to update
 * @returns Updated webhook configuration
 * @throws Error if update fails or webhook not found
 */
export async function updateWebhookConfig(
  id: string,
  updates: Partial<Omit<WebhookConfig, 'id' | 'created_at' | 'updated_at'>>
): Promise<WebhookConfig> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_webhook_configs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update webhook config: ${error.message}`);
  }

  return data as WebhookConfig;
}

/**
 * Delete a webhook configuration
 * Validates: Requirements 1.3
 * 
 * @param id - Webhook configuration ID
 * @throws Error if deletion fails
 */
export async function deleteWebhookConfig(id: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('stitch_webhook_configs')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete webhook config: ${error.message}`);
  }
}
