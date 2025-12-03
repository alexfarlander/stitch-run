/**
 * Property-based tests for worker utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { buildCallbackUrl } from '../utils';

describe('Worker Utilities - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_BASE_URL: 'https://test.example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Feature: worker-integrations, Property 2: Callback URL format compliance
  it('Property 2: Callback URL format compliance - for any runId and nodeId, callback URL should match pattern', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        (runId, nodeId) => {
          const callbackUrl = buildCallbackUrl(runId, nodeId);
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
          const expectedPattern = `${baseUrl}/api/stitch/callback/${runId}/${nodeId}`;
          
          expect(callbackUrl).toBe(expectedPattern);
          expect(callbackUrl).toMatch(/^https?:\/\/.+\/api\/stitch\/callback\/.+\/.+$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
