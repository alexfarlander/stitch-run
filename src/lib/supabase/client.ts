import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Support both old and new naming conventions
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Stitch is stateless, no session persistence needed
  },
});

// ADMIN CLIENT: For the Backend Engine only (Bypasses RLS)
// The Engine needs full authority to update run states.
// SECURITY: This function MUST only be called server-side
export const getAdminClient = () => {
  // Prevent client-side usage - critical security check
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY ERROR: getAdminClient() cannot be called on client-side. ' +
      'This function exposes privileged database access and must only be used in server-side code.'
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    // In production, fail fast - no silent fallbacks
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: SUPABASE_SERVICE_ROLE_KEY is required in production. ' +
        'Set this environment variable to enable database operations.'
      );
    }

    // Development fallback with clear warning
    console.warn(
      '\x1b[33m%s\x1b[0m', // Yellow color
      '⚠️  WARNING: Missing SUPABASE_SERVICE_ROLE_KEY - Engine writes may fail. ' +
      'Set this environment variable for full functionality.'
    );
    return supabase;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};