/**
 * Hook for fetching and subscribing to flow data
 * Fetches initial flow and optionally subscribes to real-time updates
 */

import { useEffect, useState } from 'react';
import { StitchFlow } from '@/types/stitch';
import { supabase } from '@/lib/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseFlowResult {
  flow: StitchFlow | null;
  loading: boolean;
  error: string | null;
}

export function useFlow(flowId: string | null, realtime = false): UseFlowResult {
  const [flow, setFlow] = useState<StitchFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial flow
  useEffect(() => {
    if (!flowId) {
      setFlow(null);
      setLoading(false);
      return;
    }

    let mounted = true;

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
      } catch (_err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch flow');
          setLoading(false);
        }
      }
    }

    fetchFlow();

    return () => {
      mounted = false;
    };
  }, [flowId]);

  // Subscribe to real-time updates using centralized subscription
  const { error: subscriptionError } = useRealtimeSubscription<{
    new: StitchFlow;
    old: StitchFlow;
  }>(
    {
      table: 'stitch_flows',
      filter: `id=eq.${flowId}`,
      event: 'UPDATE',
    },
    (payload) => {
      setFlow(payload.new as StitchFlow);
    },
    realtime && !!flowId // Only subscribe if realtime is enabled and flowId exists
  );

  // Update error state if subscription fails
  useEffect(() => {
    if (subscriptionError && !error) {
      setError(subscriptionError);
    }
  }, [subscriptionError, error]);

  return { flow, loading, error };
}
