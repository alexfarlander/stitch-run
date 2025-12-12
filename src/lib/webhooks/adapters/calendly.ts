/**
 * Calendly Webhook Adapter
 * 
 * Handles Calendly-specific webhook signature verification and entity extraction.
 * 
 * Signature format: Calendly-Webhook-Signature: t=timestamp,v1=signature
 * Verification: HMAC-SHA256 with timing-safe comparison
 * 
 * Validates: Requirements 7.4, 7.6
 */

import { WebhookAdapter, ExtractedEntity } from './types';
import { WebhookConfig } from '@/types/stitch';
import crypto from 'crypto';
import { secureCompare, isTimestampFresh } from '../security';

/**
 * Calendly webhook adapter
 * 
 * Implements Calendly's signature verification scheme and extracts
 * entity data from Calendly's event payload structure.
 */
export const calendlyAdapter: WebhookAdapter = {
  source: 'calendly',
  
  /**
   * Verifies Calendly webhook signature
   * 
   * Calendly signatures use the format: t=timestamp,v1=signature
   * The signature is computed as HMAC-SHA256(timestamp.rawBody, secret)
   * 
   * @see https://developer.calendly.com/api-docs/ZG9jOjM2MzE2MDM4-webhook-signatures
   */
  verifySignature: (rawBody: string, headers: Headers, secret: string | null): boolean => {
    if (!secret) return true; // No secret configured, skip verification
    
    const sig = headers.get('Calendly-Webhook-Signature');
    if (!sig) return false;
    
    // Parse Calendly signature format: t=timestamp,v1=signature
    const parts = sig.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (!parts.t || !parts.v1) return false;

    // Check timestamp freshness for replay protection
    const timestamp = parseInt(parts.t, 10);
    if (isNaN(timestamp) || !isTimestampFresh(timestamp)) {
      return false;
    }

    // Reconstruct the signed payload: timestamp.rawBody
    const signedPayload = `${parts.t}.${rawBody}`;

    try {
      // Compute expected signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(signedPayload);
      const computed = hmac.digest('hex');

      // Timing-safe comparison (Calendly uses hex encoding)
      return secureCompare(computed, parts.v1);
    } catch {
      return false;
    }
  },
  
  /**
   * Extracts entity data from Calendly webhook payload
   * 
   * Calendly events have the structure:
   * {
   *   event: "invitee.created",
   *   payload: {
   *     invitee: {
   *       name: "John Doe",
   *       email: "john@example.com"
   *     },
   *     event: {
   *       start_time: "2024-12-03T10:30:00Z",
   *       location: {
   *         join_url: "https://..."
   *       }
   *     },
   *     event_type: {
   *       name: "30 Minute Meeting"
   *     }
   *   }
   * }
   */
  extractEntity: (payload: any, config: WebhookConfig): ExtractedEntity => {
    const invitee = payload.payload?.invitee || {};
    const event = payload.payload?.event || {};
    const eventType = payload.payload?.event_type || {};
    
    return {
      name: invitee.name || undefined,
      email: invitee.email,
      entity_type: 'lead', // Calendly invitees typically represent leads
      metadata: {
        source: 'calendly',
        event_type: payload.event,
        meeting_name: eventType.name,
        start_time: event.start_time,
        join_url: event.location?.join_url
      }
    };
  },
  
  /**
   * Extracts event type from Calendly payload
   * 
   * Calendly events have an 'event' field at the root level
   * (e.g., 'invitee.created', 'invitee.canceled')
   */
  getEventType: (payload: unknown): string => {
    const p = payload as any;
    return p?.event || 'unknown_calendly_event';
  }
};
