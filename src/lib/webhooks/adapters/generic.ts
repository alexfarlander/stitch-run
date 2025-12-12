/**
 * Generic Webhook Adapter
 * 
 * Provides fallback webhook processing for custom webhooks and unknown sources.
 * Uses generic HMAC-SHA256 signature validation and JSONPath-based entity mapping.
 * 
 * Validates: Requirements 7.7
 */

import { WebhookAdapter, ExtractedEntity } from './types';
import { validateSignature } from '../signature';
import { mapPayloadToEntity } from '../entity-mapper';
import { WebhookConfig } from '@/types/stitch';

/**
 * Generic webhook adapter for custom and unknown sources
 * 
 * This adapter serves as the fallback for any webhook source that doesn't
 * have a specific adapter implementation. It uses:
 * - Generic HMAC-SHA256 signature validation
 * - JSONPath-based entity mapping from webhook config
 */
export const genericAdapter: WebhookAdapter = {
  source: 'generic',
  
  /**
   * Verifies webhook signature using generic HMAC-SHA256 validation
   * 
   * Expects signature in X-Webhook-Signature header.
   * Uses the existing validateSignature utility.
   */
  verifySignature: (rawBody: string, headers: Headers, secret: string | null): boolean => {
    const signature = headers.get('X-Webhook-Signature');
    return validateSignature(rawBody, signature, secret);
  },
  
  /**
   * Extracts entity data using JSONPath mapping from webhook config
   * 
   * Uses the existing mapPayloadToEntity utility which applies
   * the entity_mapping configuration to extract fields from the payload.
   */
  extractEntity: (payload: any, config: WebhookConfig): ExtractedEntity => {
    const mapped = mapPayloadToEntity(payload, config.entity_mapping);
    return {
      name: mapped.name,
      email: mapped.email,
      entity_type: mapped.entity_type,
      avatar_url: mapped.avatar_url,
      metadata: mapped.metadata
    };
  },
  
  /**
   * Extracts event type from common payload fields
   * 
   * Checks for 'event', 'type', or 'event_type' fields in the payload.
   * Returns 'unknown_event' if no event type field is found.
   */
  getEventType: (payload: unknown): string => {
    const p = payload as any;
    return p?.event || p?.type || p?.event_type || 'unknown_event';
  }
};
