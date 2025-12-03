/**
 * Webhook Adapter Registry
 * 
 * Central registry for all webhook adapters. Provides functions to:
 * - Select the appropriate adapter based on webhook source
 * - Process webhooks using adapter-specific logic
 * - Fall back to generic adapter when needed
 * 
 * Validates: Requirements 7.1, 7.6, 7.7
 */

import { WebhookAdapter, ExtractedEntity } from './types';
import { genericAdapter } from './generic';
import { stripeAdapter } from './stripe';
import { typeformAdapter } from './typeform';
import { calendlyAdapter } from './calendly';
import { n8nAdapter } from './n8n';
import { WebhookConfig } from '@/types/stitch';

/**
 * Registry of available webhook adapters
 * 
 * Maps source identifiers to their corresponding adapter implementations.
 * Sources without specific adapters fall back to the generic adapter.
 */
const adapters: Record<string, WebhookAdapter> = {
  'stripe': stripeAdapter,
  'typeform': typeformAdapter,
  'calendly': calendlyAdapter,
  'n8n': n8nAdapter,
  'linkedin': genericAdapter, // LinkedIn ads usually come via Zapier (generic)
  'custom': genericAdapter,
  'manual': genericAdapter
};

/**
 * Gets the appropriate adapter for a given source
 * 
 * @param source - The webhook source identifier (e.g., 'stripe', 'typeform')
 * @returns The adapter for the source, or generic adapter if not found
 * 
 * Validates: Requirements 7.1, 7.7
 */
export function getAdapter(source: string): WebhookAdapter {
  return adapters[source] || genericAdapter;
}

/**
 * Main entry point for webhook processing logic
 * 
 * Delegates to specific adapters based on source, with fallback to generic mapping.
 * 
 * Processing flow:
 * 1. Select adapter based on webhook config source
 * 2. Verify signature using adapter-specific logic
 * 3. Extract entity data using adapter-specific logic
 * 4. Fall back to generic JSONPath mapping if adapter extraction is incomplete
 * 
 * @param config - Webhook configuration
 * @param rawBody - Raw request body as string (for signature verification)
 * @param payload - Parsed JSON payload
 * @param headers - Request headers
 * @returns Extracted entity data
 * @throws Error if signature verification fails
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */
export async function processAdapterLogic(
  config: WebhookConfig,
  rawBody: string,
  payload: any,
  headers: Headers
): Promise<ExtractedEntity> {
  // Step 1: Select adapter based on source
  // Validates: Requirements 7.1
  const adapter = getAdapter(config.source);
  
  // Step 2: Verify signature using adapter-specific logic
  // Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.8
  const isValid = await adapter.verifySignature(rawBody, headers, config.secret || null);
  if (!isValid) {
    throw new Error(`Invalid webhook signature`);
  }
  
  // Step 3: Extract entity data using adapter-specific logic
  // Validates: Requirements 7.6
  const entityData = adapter.extractEntity(payload, config);
  
  // Step 4: Fallback to generic mapping if adapter didn't find complete data
  // This ensures we always try to extract data even if the adapter's
  // source-specific extraction fails or returns incomplete data
  // Validates: Requirements 7.7
  if (!entityData.name || !entityData.email || !entityData.entity_type) {
    const genericData = genericAdapter.extractEntity(payload, config);
    return {
      ...entityData,
      name: entityData.name || genericData.name,
      email: entityData.email || genericData.email,
      entity_type: entityData.entity_type || genericData.entity_type,
      // Merge metadata, with adapter-specific metadata taking precedence
      metadata: { ...genericData.metadata, ...entityData.metadata }
    };
  }
  
  return entityData;
}

// Export all adapters for testing
export {
  genericAdapter,
  stripeAdapter,
  typeformAdapter,
  calendlyAdapter,
  n8nAdapter
};

// Export types
export type { WebhookAdapter, ExtractedEntity } from './types';
