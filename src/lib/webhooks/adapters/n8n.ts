/**
 * n8n Webhook Adapter
 * 
 * Handles n8n-specific webhook token verification and entity extraction.
 * 
 * Verification: Simple token comparison (x-webhook-secret or x-auth-token header)
 * Entity extraction: Uses generic JSONPath mapping (n8n payloads are dynamic)
 * 
 * Validates: Requirements 7.5, 7.6
 */

import { WebhookAdapter, ExtractedEntity } from './types';
import { mapPayloadToEntity } from '../entity-mapper';
import { WebhookConfig } from '@/types/stitch';

/**
 * n8n webhook adapter
 * 
 * Implements n8n's simple token-based authentication and uses generic
 * JSONPath mapping for entity extraction (since n8n payloads are dynamic).
 */
export const n8nAdapter: WebhookAdapter = {
  source: 'n8n',
  
  /**
   * Verifies n8n webhook token
   * 
   * n8n uses simple token-based authentication via headers.
   * Users configure "Header Auth" or custom headers in n8n to send:
   * - x-webhook-secret: The configured secret token
   * - x-auth-token: Alternative header name
   * 
   * This is a simple string comparison, not HMAC-based.
   */
  verifySignature: (rawBody: string, headers: Headers, secret: string | null): boolean => {
    // If no secret configured in Stitch, assume it's open
    if (!secret) return true;
    
    // Check for n8n-specific headers
    const incomingSecret = headers.get('x-webhook-secret') || headers.get('x-auth-token');
    
    // Simple string comparison
    return incomingSecret === secret;
  },
  
  /**
   * Extracts entity data from n8n webhook payload
   * 
   * n8n payloads are dynamic and depend on the workflow configuration.
   * n8n sometimes wraps data in a 'body' or 'data' key depending on node settings.
   * 
   * We rely on the generic JSONPath mapping from the webhook config,
   * but try the root payload first.
   */
  extractEntity: (payload: any, config: WebhookConfig): ExtractedEntity => {
    // Use generic JSONPath mapper
    const mapped = mapPayloadToEntity(payload, config.entity_mapping);
    
    return {
      name: mapped.name,
      email: mapped.email,
      entity_type: mapped.entity_type,
      avatar_url: mapped.avatar_url,
      metadata: {
        ...mapped.metadata,
        source: 'n8n',
        execution_id: payload.executionId // n8n often sends this if configured
      }
    };
  },
  
  /**
   * Extracts event type from n8n payload
   * 
   * n8n payloads may have 'event', 'type', or custom fields.
   * Falls back to 'n8n_workflow_trigger' if not found.
   */
  getEventType: (payload: any): string => {
    return payload.event || payload.type || 'n8n_workflow_trigger';
  }
};
