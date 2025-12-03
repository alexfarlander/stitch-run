/**
 * Property-based tests for health check API endpoint
 * Uses fast-check for property-based testing
 * Tests: Property 3 (Health check API key validation), Property 9 (Health check completeness)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { GET } from '../route';

// ============================================================================
// Test Configuration
// ============================================================================

const testConfig = { numRuns: 100 };

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid non-empty API key string
 */
const validApiKeyArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

/**
 * Generate an empty or whitespace-only string
 */
const emptyApiKeyArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t'),
  fc.constant('\n')
);

/**
 * Generate environment variable state (present with value, empty, or missing)
 */
const envVarStateArb = fc.oneof(
  fc.record({ type: fc.constant('valid' as const), value: validApiKeyArb }),
  fc.record({ type: fc.constant('empty' as const), value: emptyApiKeyArb }),
  fc.constant({ type: 'missing' as const })
);

/**
 * Generate a complete environment configuration for all integrations
 */
const envConfigArb = fc.record({
  ANTHROPIC_API_KEY: envVarStateArb,
  NEXT_PUBLIC_SUPABASE_URL: envVarStateArb,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: envVarStateArb,
  SHOTSTACK_API_KEY: envVarStateArb,
  ELEVENLABS_API_KEY: envVarStateArb,
  MINIMAX_API_KEY: envVarStateArb,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Set up environment variables based on generated configuration
 */
function setupEnv(config: Record<string, { type: string; value?: string }>) {
  const originalEnv = { ...process.env };
  
  // Clear all integration-related env vars
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SHOTSTACK_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.MINIMAX_API_KEY;
  
  // Set up env vars based on config
  Object.entries(config).forEach(([key, state]) => {
    if (state.type === 'valid' || state.type === 'empty') {
      process.env[key] = state.value;
    }
    // If type is 'missing', we don't set it (already deleted above)
  });
  
  return originalEnv;
}

/**
 * Restore original environment variables
 */
function restoreEnv(originalEnv: NodeJS.ProcessEnv) {
  process.env = originalEnv;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Health Check API Property Tests', () => {
  describe('Property 3: Health check API key validation', () => {
    it('**Feature: production-side-items, Property 3: Health check API key validation**', async () => {
      await fc.assert(
        fc.asyncProperty(
          envConfigArb,
          async (envConfig) => {
            // Setup environment
            const originalEnv = setupEnv(envConfig);
            
            try {
              // Call the health check endpoint
              const response = await GET();
              const data = await response.json();
              
              // Verify response structure
              expect(data).toHaveProperty('integrations');
              expect(data).toHaveProperty('timestamp');
              expect(Array.isArray(data.integrations)).toBe(true);
              
              // Check each integration's status matches the env var state
              const integrationMap: Record<string, string> = {
                'Claude API': 'ANTHROPIC_API_KEY',
                'Supabase URL': 'NEXT_PUBLIC_SUPABASE_URL',
                'Supabase Anon Key': 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'Shotstack': 'SHOTSTACK_API_KEY',
                'ElevenLabs': 'ELEVENLABS_API_KEY',
                'MiniMax': 'MINIMAX_API_KEY',
              };
              
              data.integrations.forEach((integration: any) => {
                const envKey = integrationMap[integration.name];
                const envState = envConfig[envKey as keyof typeof envConfig];
                
                if (envState.type === 'valid') {
                  // Valid non-empty key should result in "connected"
                  expect(integration.status).toBe('connected');
                } else if (envState.type === 'empty' || envState.type === 'missing') {
                  // Empty or missing key should result in "disconnected"
                  expect(integration.status).toBe('disconnected');
                }
                
                // Status should never be undefined
                expect(['connected', 'disconnected', 'error']).toContain(integration.status);
              });
            } finally {
              // Restore environment
              restoreEnv(originalEnv);
            }
          }
        ),
        testConfig
      );
    });

    it('should return "connected" for valid non-empty API keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          validApiKeyArb,
          async (apiKey) => {
            const originalEnv = { ...process.env };
            process.env.ANTHROPIC_API_KEY = apiKey;
            
            try {
              const response = await GET();
              const data = await response.json();
              
              const claudeIntegration = data.integrations.find(
                (i: any) => i.name === 'Claude API'
              );
              
              expect(claudeIntegration.status).toBe('connected');
            } finally {
              process.env = originalEnv;
            }
          }
        ),
        testConfig
      );
    });

    it('should return "disconnected" for empty or missing API keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(emptyApiKeyArb, fc.constant(undefined)),
          async (apiKey) => {
            const originalEnv = { ...process.env };
            
            if (apiKey === undefined) {
              delete process.env.ANTHROPIC_API_KEY;
            } else {
              process.env.ANTHROPIC_API_KEY = apiKey;
            }
            
            try {
              const response = await GET();
              const data = await response.json();
              
              const claudeIntegration = data.integrations.find(
                (i: any) => i.name === 'Claude API'
              );
              
              expect(claudeIntegration.status).toBe('disconnected');
            } finally {
              process.env = originalEnv;
            }
          }
        ),
        testConfig
      );
    });
  });

  describe('Property 9: Health check completeness', () => {
    it('**Feature: production-side-items, Property 9: Health check completeness**', async () => {
      await fc.assert(
        fc.asyncProperty(
          envConfigArb,
          async (envConfig) => {
            // Setup environment
            const originalEnv = setupEnv(envConfig);
            
            try {
              // Call the health check endpoint
              const response = await GET();
              const data = await response.json();
              
              // Define all expected integrations
              const expectedIntegrations = [
                'Claude API',
                'Supabase URL',
                'Supabase Anon Key',
                'Shotstack',
                'ElevenLabs',
                'MiniMax',
              ];
              
              // Verify all integrations are present
              expect(data.integrations).toHaveLength(expectedIntegrations.length);
              
              // Verify each expected integration is in the response
              expectedIntegrations.forEach(expectedName => {
                const integration = data.integrations.find(
                  (i: any) => i.name === expectedName
                );
                expect(integration).toBeDefined();
                expect(integration).toHaveProperty('name', expectedName);
                expect(integration).toHaveProperty('status');
                expect(integration).toHaveProperty('lastPing');
              });
              
              // Verify no duplicate integrations
              const names = data.integrations.map((i: any) => i.name);
              const uniqueNames = new Set(names);
              expect(uniqueNames.size).toBe(names.length);
              
            } finally {
              // Restore environment
              restoreEnv(originalEnv);
            }
          }
        ),
        testConfig
      );
    });

    it('should always return exactly 6 integrations', async () => {
      await fc.assert(
        fc.asyncProperty(
          envConfigArb,
          async (envConfig) => {
            const originalEnv = setupEnv(envConfig);
            
            try {
              const response = await GET();
              const data = await response.json();
              
              // Should always return exactly 6 integrations
              expect(data.integrations).toHaveLength(6);
            } finally {
              restoreEnv(originalEnv);
            }
          }
        ),
        testConfig
      );
    });

    it('should never omit any configured integration', async () => {
      await fc.assert(
        fc.asyncProperty(
          envConfigArb,
          async (envConfig) => {
            const originalEnv = setupEnv(envConfig);
            
            try {
              const response = await GET();
              const data = await response.json();
              
              // Check that all integration names are present
              const integrationNames = data.integrations.map((i: any) => i.name);
              
              expect(integrationNames).toContain('Claude API');
              expect(integrationNames).toContain('Supabase URL');
              expect(integrationNames).toContain('Supabase Anon Key');
              expect(integrationNames).toContain('Shotstack');
              expect(integrationNames).toContain('ElevenLabs');
              expect(integrationNames).toContain('MiniMax');
            } finally {
              restoreEnv(originalEnv);
            }
          }
        ),
        testConfig
      );
    });
  });
});
