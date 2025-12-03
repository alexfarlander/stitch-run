/**
 * Hook for fetching and subscribing to flow data
 * Fetches initial flow and optionally subscribes to real-time updates
 */

import { useEffect, useState } from 'react';
import { StitchFlow } from '@/types/stitch';
import { supabase } from '@/lib/supabase/client';

interface UseFlowResult {
  flow: StitchFlow | null;
  loading: boolean;
  error: string | null;
}

export function useFlow(flowId: string | null, realtime = false): UseFlowResult {
  const [flow, setFlow] = useState<StitchFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!flowId) {
      setFlow(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    // Fetch initial flow
    async function fetchFlow() {
      try {
        const { data, error: fetchError } = await supabase
          .from('stitch_flows')
          .select('*')
          .eq('id', flowId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (mounted) {
          setFlow(data as StitchFlow);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch flow');
          setLoading(false);
        }
      }
    }

    fetchFlow();

    // Subscribe to real-time updates if enabled
    if (realtime) {
      const channel = supabase
        .channel(`flow:${flowId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'stitch_flows',
            filter: `id=eq.${flowId}`,
          },
          (payload) => {
            if (mounted) {
              setFlow(payload.new as StitchFlow);
            }
          }
        )
        .subscribe();

      return () => {
        mounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      mounted = false;
    };
  }, [flowId, realtime]);

  return { flow, loading, error };
}
