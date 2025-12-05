/**
 * Hook for subscribing to real-time run status updates
 * Subscribes to stitch_runs table changes and provides node status information
 * Requirements: 1.1, 1.2, 1.3, 1.4, 11.1, 11.2, 11.4
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { StitchRun, NodeState } from '@/types/stitch';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRunStatusResult {
  nodeStates: Record<string, NodeState> | null;
  loading: boolean;
  error: string | null;
}

/**
 * Subscribe to real-time updates for a specific run
 * Returns node states that update automatically when the database changes
 * 
 * @param runId - The run ID to subscribe to (optional)
 * @returns Object containing nodeStates, loading state, and error
 */
export function useRunStatus(runId?: string): UseRunStatusResult {
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!runId) {
      setNodeStates(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchRun = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('stitch_runs')
          .select('node_states')
          .eq('id', runId)
          .single();

        if (!mounted) return;

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // Run not found
            setError(`Run not found: ${runId}`);
            setNodeStates(null);
          } else {
            setError(`Failed to fetch run: ${fetchError.message}`);
          }
          setLoading(false);
          return;
        }

        setNodeStates((data as StitchRun).node_states);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchRun();

    return () => {
      mounted = false;
    };
  }, [runId]);

  // Subscribe to real-time changes using centralized subscription
  const { status: subscriptionStatus, error: subscriptionError } = useRealtimeSubscription<{
    new: StitchRun;
    old: StitchRun;
  }>(
    {
      table: 'stitch_runs',
      filter: `id=eq.${runId}`,
      event: 'UPDATE',
    },
    (payload) => {
      const updatedRun = payload.new as StitchRun;
      setNodeStates(updatedRun.node_states);
    },
    !!runId // Only subscribe if runId exists
  );

  // Update error state if subscription fails
  useEffect(() => {
    if (subscriptionError && !error) {
      setError(subscriptionError);
    }
  }, [subscriptionError, error]);

  return { nodeStates, loading, error };
}
