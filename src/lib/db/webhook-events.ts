/**
 * Database operations for stitch_webhook_events table
 * Handles CRUD operations for webhook event audit logs
 */

import { createServerClient } from '../supabase/server';
import { getAdminClient } from '../supabase/client';
import { WebhookEvent } from '@/types/stitch';

/**
 * Create a new webhook event
 * Validates: Requirements 2.1
 * 
 * @param event - Webhook event data
 * @returns Created webhook event
 * @throws Error if creation fails
 */
export async function createWebhookEvent(
  event: Omit<WebhookEvent, 'id' | 'received_at' | 'processed_at'>
): Promise<WebhookEvent> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_webhook_events')
    .insert({
      webhook_config_id: event.webhook_config_id,
      payload: event.payload,
      entity_id: event.entity_id,
      workflow_run_id: event.workflow_run_id,
      status: event.status,
      error: event.error,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create webhook event: ${error.message}`);
  }

  return data as WebhookEvent;
}

/**
 * Update a webhook event
 * Validates: Requirements 2.2, 2.3, 2.4
 * 
 * @param id - Webhook event ID
 * @param updates - Fields to update
 * @returns Updated webhook event
 * @throws Error if update fails or event not found
 */
export async function updateWebhookEvent(
  id: string,
  updates: Partial<Omit<WebhookEvent, 'id' | 'webhook_config_id' | 'received_at' | 'payload'>>
): Promise<WebhookEvent> {
  const supabase = getAdminClient();

  const updateData: Record<string, any> = { ...updates };
  
  // Set processed_at timestamp if status is being updated to completed or failed
  if (updates.status === 'completed' || updates.status === 'failed') {
    updateData.processed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('stitch_webhook_events')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update webhook event: ${error.message}`);
  }

  return data as WebhookEvent;
}

/**
 * Get all webhook events for a specific webhook configuration
 * Validates: Requirements 2.5
 * 
 * @param webhookConfigId - Webhook configuration ID to filter by
 * @returns Array of webhook events ordered by received_at (newest first)
 */
export async function getWebhookEventsByConfig(
  webhookConfigId: string
): Promise<WebhookEvent[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_webhook_events')
    .select('*')
    .eq('webhook_config_id', webhookConfigId)
    .order('received_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get webhook events: ${error.message}`);
  }

  return (data || []) as WebhookEvent[];
}

/**
 * Get a webhook event by ID
 * 
 * @param id - Webhook event ID
 * @returns Webhook event or null if not found
 */
export async function getWebhookEventById(
  id: string
): Promise<WebhookEvent | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_webhook_events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get webhook event: ${error.message}`);
  }

  return data as WebhookEvent;
}

/**
 * Get a webhook event by ID using admin client
 * Use this in webhook endpoints where there are no cookies/session
 * 
 * @param id - Webhook event ID
 * @returns Webhook event or null if not found
 */
export async function getWebhookEventByIdAdmin(
  id: string
): Promise<WebhookEvent | null> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_webhook_events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get webhook event: ${error.message}`);
  }

  return data as WebhookEvent;
}
