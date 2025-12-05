/**
 * Unit tests for environment configuration validation
 * Tests: Requirement 12.3
 */

// beforeEach import removed as unused
import { getConfig, validateConfig } from '../config';

describe('Environment Configuration Validation', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment after each test
    process.env = { ...originalEnv };
  });

  describe('getConfig', () => {
    it('should throw error when NEXT_PUBLIC_BASE_URL is not set (Requirement 12.3)', () => {
      // Remove BASE_URL from environment
      delete process.env.NEXT_PUBLIC_BASE_URL;
      
      // Set other required variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      expect(() => getConfig()).toThrow('Missing required environment variables: NEXT_PUBLIC_BASE_URL');
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      process.env.NEXT_PUBLIC_BASE_URL = 'https://test.stitch.run';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      expect(() => getConfig()).toThrow('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL');
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is not set', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
      
      process.env.NEXT_PUBLIC_BASE_URL = 'https://test.stitch.run';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      expect(() => getConfig()).toThrow('Missing required environment variables');
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is not set', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      process.env.NEXT_PUBLIC_BASE_URL = 'https://test.stitch.run';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      expect(() => getConfig()).toThrow('Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should throw error listing all missing variables when multiple are missing', () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      expect(() => getConfig()).toThrow('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_BASE_URL');
    });

    it('should return valid config when all environment variables are set', () => {
      // Clear worker API keys to test only required variables
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.MINIMAX_API_KEY;
      delete process.env.MINIMAX_GROUP_ID;
      delete process.env.ELEVENLABS_API_KEY;
      delete process.env.SHOTSTACK_API_KEY;

      process.env.NEXT_PUBLIC_BASE_URL = 'https://test.stitch.run';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      const _config = getConfig();

      expect(config).toEqual({
        supabase: {
          url: 'http://localhost:54321',
          anonKey: 'test-anon-key',
          serviceRoleKey: 'test-service-role-key',
        },
        baseUrl: 'https://test.stitch.run',
        workers: {
          anthropicApiKey: undefined,
          minimaxApiKey: undefined,
          minimaxGroupId: undefined,
          elevenlabsApiKey: undefined,
          shotstackApiKey: undefined,
        },
      });
    });
  });

  describe('validateConfig', () => {
    it('should return valid: false when BASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      const result = validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('NEXT_PUBLIC_BASE_URL');
    });

    it('should return valid: true when all variables are set', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://test.stitch.run';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      const result = validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
