/**
 * Stripe Webhook Adapter
 * 
 * Handles Stripe-specific webhook signature verification and entity extraction.
 * 
 * Signature format: Stripe-Signature: t=timestamp,v1=signature
 * Verification: HMAC-SHA256 with timing-safe comparison
 * 
 * Validates: Requirements 7.2, 7.6
 */

import { WebhookAdapter, ExtractedEntity } from './types';
import { WebhookConfig } from '@/types/stitch';
import crypto from 'crypto';

/**
 * Stripe webhook adapter
 * 
 * Implements Stripe's signature verification scheme and extracts
 * entity data from Stripe's event payload structure.
 */
export const stripeAdapter: WebhookAdapter = {
  source: 'stripe',
  
  /**
   * Verifies Stripe webhook signature
   * 
   * Stripe signatures use the format: t=timestamp,v1=signature
   * The signature is computed as HMAC-SHA256(timestamp.rawBody, secret)
   * 
   * @see https://stripe.com/docs/webhooks/signatures
   */
  verifySignature: (rawBody: string, headers: Headers, secret: string | null): boolean => {
    if (!secret) return true; // No secret configured, skip verification
    
    const sig = headers.get('Stripe-Signature');
    if (!sig) return false;
    
    // Parse Stripe signature format: t=timestamp,v1=signature
    const parts = sig.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (!parts.t || !parts.v1) return false;
    
    // Reconstruct the signed payload: timestamp.rawBody
    const signedPayload = `${parts.t}.${rawBody}`;
    
    try {
      // Compute expected signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(signedPayload);
      const computed = hmac.digest('hex');
      
      // Timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(parts.v1),
        Buffer.from(computed)
      );
    } catch {
      return false;
    }
  },
  
  /**
   * Extracts entity data from Stripe webhook payload
   * 
   * Stripe events have the structure:
   * {
   *   type: "checkout.session.completed",
   *   data: {
   *     object: {
   *       customer_details: { email, name },
   *       customer: "cus_xxx",
   *       payment_status: "paid",
   *       amount_total: 5000,
   *       currency: "usd"
   *     }
   *   }
   * }
   */
  extractEntity: (payload: any, config: WebhookConfig): ExtractedEntity => {
    const object = payload.data?.object || {};
    
    // Extract email from various possible locations
    const email = object.customer_details?.email 
      || object.email 
      || object.customer_email;
    
    // Extract name from various possible locations
    // Return undefined if not found so fallback can be used
    const name = object.customer_details?.name 
      || object.name 
      || undefined;
    
    // Extract payment amount if present
    const amount = object.amount_total ? object.amount_total / 100 : undefined;
    const currency = object.currency?.toUpperCase();
    
    return {
      name,
      email,
      entity_type: 'customer', // Stripe webhooks typically represent customers
      metadata: {
        source: 'stripe',
        stripe_customer_id: object.customer,
        payment_status: object.payment_status,
        amount: amount ? `${amount} ${currency}` : undefined,
        event_id: payload.id
      }
    };
  },
  
  /**
   * Extracts event type from Stripe payload
   * 
   * Stripe events have a 'type' field at the root level
   * (e.g., 'checkout.session.completed', 'customer.subscription.created')
   */
  getEventType: (payload: any): string => {
    return payload.type || 'unknown_stripe_event';
  }
};
