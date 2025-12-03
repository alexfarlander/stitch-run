/**
 * Webhook Adapter Type Definitions
 * 
 * Defines the common interface for webhook adapters that handle
 * source-specific signature verification and entity extraction.
 * 
 * Validates: Requirements 7.1
 */

import { WebhookConfig } from '@/types/stitch';

/**
 * Entity data extracted from a webhook payload
 */
export interface ExtractedEntity {
  name?: string;
  email?: string;
  entity_type?: string;
  avatar_url?: string;
  metadata: Record<string, any>;
}

/**
 * Common interface for all webhook adapters
 * 
 * Each adapter implements source-specific logic for:
 * - Signature verification using the provider's format
 * - Entity data extraction from the provider's payload structure
 * - Event type identification
 */
export interface WebhookAdapter {
  /** The source identifier this adapter handles (e.g., 'stripe', 'typeform') */
  source: string;
  
  /**
   * Verifies the webhook signature using source-specific logic.
   * 
   * @param rawBody - Raw request body as string (for HMAC computation)
   * @param headers - Request headers containing signature
   * @param secret - Configured secret for verification (null if not configured)
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(
    rawBody: string,
    headers: Headers,
    secret: string | null
  ): Promise<boolean> | boolean;
  
  /**
   * Extracts entity data from the source-specific payload structure.
   * 
   * @param payload - Parsed webhook payload
   * @param config - Webhook configuration (for fallback mapping)
   * @returns Extracted entity data
   */
  extractEntity(
    payload: any,
    config: WebhookConfig
  ): ExtractedEntity;
  
  /**
   * Identifies the event type from the payload.
   * 
   * @param payload - Parsed webhook payload
   * @returns Event type string (e.g., 'checkout.session.completed')
   */
  getEventType(payload: any): string;
}
