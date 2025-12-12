import crypto from 'crypto';

/**
 * Validates a webhook signature using HMAC-SHA256.
 * 
 * STRICT MODE: Only accepts raw string payloads. 
 * Passing a parsed JSON object is forbidden because JSON.stringify() 
 * cannot guarantee key order, which breaks HMAC verification.
 * 
 * @param rawBody - The raw request body as a string
 * @param signature - The signature from X-Webhook-Signature header
 * @param secret - The webhook secret for HMAC computation
 * @returns boolean indicating whether the signature is valid
 */
export function validateSignature(
  rawBody: string,
  signature: string | undefined | null,
  secret: string | undefined | null
): boolean {
  // If no secret is configured, signature validation is not required
  if (!secret) {
    return true;
  }

  // If secret is configured but no signature provided, validation fails
  if (!signature) {
    return false;
  }

  try {
    // Compute HMAC-SHA256 signature using the exact raw body
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const computedSignature = hmac.digest('hex');

    // timingSafeEqual throws if byte lengths differ
    if (signature.length !== computedSignature.length) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}
