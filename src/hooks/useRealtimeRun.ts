/**
 * Hook for subscribing to real-time run updates
 * Fetches initial state and subscribes to Supabase changes
 */

import { useEffect, useState } from 'react';
import { StitchRun } from '@/types/stitch';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRealtimeRunResult {
  run: StitchRun | null;
  loading: boolean;
  error: string | null;
}

export function useRealtimeRun(runId: string): UseRealtimeRunResult {
  const [run, setRun] = useState<StitchRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial state
  useEffect(() => {
    let mounted = true;

    async function fetchInitialState() {
      try {
        const response = await fetch(`/api/stitch/status/${runId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch run status');
        }

        const _data = await response.json();
        
        if (mounted) {
          setRun(data);
          setLoading(false);
        }
      } catch (_err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    fetchInitialState();

    return () => {
      mounted = false;
    };
  }, [runId]);

  // Subscribe to real-time updates using centralized subscription
  const { error: subscriptionError } = useRealtimeSubscription<{
    new: StitchRun;
    old: StitchRun;
  }>(
    {
      table: 'stitch_runs',
      filter: `id=eq.${runId}`,
      event: 'UPDATE',
    },
    (payload) => {
      setRun(payload.new as StitchRun);
    },
    true
  );

  // Update error state if subscription fails
  useEffect(() => {
    if (subscriptionError && !error) {
      setError(subscriptionError);
    }
  }, [subscriptionError, error]);

  return { run, loading, error };
}
