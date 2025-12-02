/**
 * Hook for subscribing to real-time run updates
 * Fetches initial state and subscribes to Supabase changes
 */

import { useEffect, useState } from 'react';
import { StitchRun } from '@/types/stitch';
import { supabase } from '@/lib/supabase/client';

interface UseRealtimeRunResult {
  run: StitchRun | null;
  loading: boolean;
  error: string | null;
}

export function useRealtimeRun(runId: string): UseRealtimeRunResult {
  const [run, setRun] = useState<StitchRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Fetch initial state
    async function fetchInitialState() {
      try {
        const response = await fetch(`/api/stitch/status/${runId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch run status');
        }

        const data = await response.json();
        
        if (mounted) {
          setRun(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    fetchInitialState();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`run:${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stitch_runs',
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          if (mounted) {
            setRun(payload.new as StitchRun);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [runId]);

  return { run, loading, error };
}
