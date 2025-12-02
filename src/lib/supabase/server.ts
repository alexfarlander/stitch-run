import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Creates a Supabase client with service role key for server-side operations.
 * This client bypasses Row Level Security (RLS) and should only be used in API routes.
 */
export function createServerClient() {
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
