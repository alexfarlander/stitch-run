/**
 * Environment configuration validation
 * Validates all required environment variables at startup
 */

export interface StitchConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  baseUrl: string;
}

/**
 * Validates and returns the application configuration
 * Throws an error if any required environment variable is missing
 */
export function getConfig(): StitchConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both old and new anon key naming
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const missingVars: string[] = [];

  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!baseUrl) missingVars.push('NEXT_PUBLIC_BASE_URL');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  return {
    supabase: {
      url: supabaseUrl!,
      anonKey: supabaseAnonKey!,
      serviceRoleKey: supabaseServiceRoleKey!,
    },
    baseUrl: baseUrl!,
  };
}

/**
 * Validates configuration without throwing
 * Returns validation result with error details
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  try {
    getConfig();
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof Error) {
      return { valid: false, errors: [error.message] };
    }
    return { valid: false, errors: ['Unknown configuration error'] };
  }
}
