/**
 * Typeform Webhook Adapter
 * 
 * Handles Typeform-specific webhook signature verification and entity extraction.
 * 
 * Signature format: Typeform-Signature: sha256=signature
 * Verification: HMAC-SHA256 with base64 encoding
 * 
 * Validates: Requirements 7.3, 7.6
 */

import { WebhookAdapter, ExtractedEntity } from './types';
import { WebhookConfig } from '@/types/stitch';
import crypto from 'crypto';

/**
 * Typeform webhook adapter
 * 
 * Implements Typeform's signature verification scheme and extracts
 * entity data from Typeform's form response payload structure.
 */
export const typeformAdapter: WebhookAdapter = {
  source: 'typeform',
  
  /**
   * Verifies Typeform webhook signature
   * 
   * Typeform signatures use the format: sha256=signature
   * The signature is computed as base64(HMAC-SHA256(rawBody, secret))
   * 
   * @see https://developer.typeform.com/webhooks/secure-your-webhooks/
   */
  verifySignature: (rawBody: string, headers: Headers, secret: string | null): boolean => {
    if (!secret) return true; // No secret configured, skip verification
    
    const sig = headers.get('Typeform-Signature');
    if (!sig) return false;
    
    // Remove 'sha256=' prefix if present
    const expected = sig.replace('sha256=', '');
    
    try {
      // Compute expected signature using base64 encoding
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const computed = hmac.digest('base64');
      
      // Direct comparison (Typeform uses base64, not hex)
      return expected === computed;
    } catch {
      return false;
    }
  },
  
  /**
   * Extracts entity data from Typeform webhook payload
   * 
   * Typeform events have the structure:
   * {
   *   event_type: "form_response",
   *   form_response: {
   *     form_id: "xxx",
   *     submitted_at: "2024-12-03T10:30:00Z",
   *     answers: [
   *       { type: "email", email: "user@example.com" },
   *       { type: "text", text: "John Doe", field: { ref: "name" } }
   *     ]
   *   }
   * }
   * 
   * This function intelligently searches the answers array for email and name fields.
   */
  extractEntity: (payload: any, config: WebhookConfig): ExtractedEntity => {
    const answers = payload.form_response?.answers || [];
    
    // Find email field (type === 'email')
    const emailAnswer = answers.find((a: unknown) => a.type === 'email');
    const email = emailAnswer?.email;
    
    // Find name field (type === 'text' and field ref/title contains 'name')
    const nameAnswer = answers.find((a: unknown) => 
      a.type === 'text' && (
        a.field?.ref?.toLowerCase().includes('name') ||
        a.field?.title?.toLowerCase().includes('name')
      )
    );
    const name = nameAnswer?.text || undefined;
    
    return {
      name,
      email,
      entity_type: 'lead', // Typeform responses typically represent leads
      metadata: {
        source: 'typeform',
        form_id: payload.form_response?.form_id,
        submitted_at: payload.form_response?.submitted_at
      }
    };
  },
  
  /**
   * Extracts event type from Typeform payload
   * 
   * Typeform events have an 'event_type' field at the root level
   * (typically 'form_response')
   */
  getEventType: (payload: unknown): string => {
    return payload.event_type || 'form_response';
  }
};
