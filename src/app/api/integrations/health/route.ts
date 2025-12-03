import { NextResponse } from 'next/server';

/**
 * Health Check API Endpoint
 * 
 * Checks the connectivity status of all configured integrations by verifying
 * the presence of required API keys in environment variables.
 * 
 * @returns JSON response with status information for all integrations
 */

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing: string;
  message?: string;
}

interface HealthCheckResponse {
  integrations: IntegrationStatus[];
  timestamp: string;
}

/**
 * Checks if an environment variable exists and is non-empty
 * @param key - The environment variable name
 * @returns 'connected' if exists and non-empty, 'disconnected' if missing/empty, 'error' on exception
 */
function checkEnvVar(key: string): 'connected' | 'disconnected' | 'error' {
  try {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return 'connected';
    }
    return 'disconnected';
  } catch (error) {
    return 'error';
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();

  // Define all integrations to check
  const integrationsToCheck = [
    { name: 'Claude API', key: 'ANTHROPIC_API_KEY' },
    { name: 'Supabase URL', key: 'NEXT_PUBLIC_SUPABASE_URL' },
    { name: 'Supabase Anon Key', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
    { name: 'Shotstack', key: 'SHOTSTACK_API_KEY' },
    { name: 'ElevenLabs', key: 'ELEVENLABS_API_KEY' },
    { name: 'MiniMax', key: 'MINIMAX_API_KEY' },
  ];

  const integrations: IntegrationStatus[] = integrationsToCheck.map(({ name, key }) => {
    const status = checkEnvVar(key);
    return {
      name,
      status,
      lastPing: timestamp,
      message: status === 'error' ? 'Error checking environment variable' : undefined,
    };
  });

  const response: HealthCheckResponse = {
    integrations,
    timestamp,
  };

  return NextResponse.json(response);
}
