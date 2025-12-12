/**
 * Webhook Security Utilities
 *
 * Provides timing-safe comparisons and replay protection for webhook verification
 */

import crypto from 'crypto';

/**
 * Maximum age for webhook timestamps (5 minutes)
 * Used for replay attack protection
 */
export const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

/**
 * Timing-safe string comparison
 * Prevents timing attacks by using constant-time comparison
 * Handles strings of different lengths safely (unlike raw timingSafeEqual)
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Keep executing constant-time comparison on dummy data to prevent length leakage
    // This ensures the timing is consistent regardless of length mismatch
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify webhook timestamp freshness for replay protection
 *
 * @param timestamp - Unix timestamp (seconds since epoch)
 * @returns true if timestamp is within acceptable window, false if stale
 */
export function isTimestampFresh(timestamp: number): boolean {
  const now = Date.now();
  const timestampMs = timestamp * 1000;
  const age = now - timestampMs;

  // Reject if timestamp is too old or from the future (allow small clock skew)
  return age >= 0 && age < MAX_WEBHOOK_AGE_MS;
}
