/**
 * Hook for reconstructing historical node states from journey events
 * 
 * Provides time-travel debugging by reconstructing the state of all nodes
 * at any point in the workflow execution timeline.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useEffect, useState } from 'react';
import { NodeState, JourneyEvent } from '@/types/stitch';
import { createBrowserClient } from '@/lib/supabase/client';

interface UseTimelineNodeStatesResult {
  nodeStates: Record<string, NodeState>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for reconstructing node states at a specific point in time
 * 
 * When timestamp is null, returns the current real-time state.
 * When timestamp is provided, reconstructs historical state by processing
 * all journey events up to that timestamp.
 * 
 * @param runId - The workflow run ID
 * @param timestamp - ISO timestamp to reconstruct state for (null for real-time)
 * @returns Object containing reconstructed node states, loading state, and error
 * 
 * @example
 * ```tsx
 * const { nodeStates, loading } = useTimelineNodeStates(runId, selectedTimestamp);
 * ```
 */
export function useTimelineNodeStates(
  runId: string,
  timestamp: string | null
): UseTimelineNodeStatesResult {
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAndReconstructState() {
      try {
        setLoading(true);
        setError(null);

        if (!timestamp) {
          // Return to real-time: fetch current run state
          const response = await fetch(`/api/stitch/status/${runId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch current run state');
          }

          const run = await response.json();
          
          if (mounted) {
            setNodeStates(run.node_states || {});
            setLoading(false);
          }
          return;
        }

        // Reconstruct historical state from journey events
        const supabase = createBrowserClient();
        
        // Query all journey events up to the selected timestamp
        // Requirement 7.1: Query all journey events up to that timestamp
        const { data: events, error: queryError } = await supabase
          .from('stitch_journey_events')
          .select('*')
          .eq('canvas_id', runId) // Note: Using canvas_id to match run_id
          .lte('timestamp', timestamp)
          .order('timestamp', { ascending: true });

        if (queryError) {
          throw new Error(`Failed to query journey events: ${queryError.message}`);
        }

        // Reconstruct node states by processing events in order
        const reconstructed: Record<string, NodeState> = {};

        if (events) {
          for (const event of events as JourneyEvent[]) {
            const nodeId = event.node_id;
            if (!nodeId) continue;

            // Apply event type mappings to reconstruct state
            switch (event.event_type) {
              case 'node_arrival':
                // Requirement 7.2: Apply node_arrival events to set status to "running"
                reconstructed[nodeId] = {
                  status: 'running',
                };
                break;

              case 'node_complete':
                // Requirement 7.3: Apply node_complete events to set status to "completed"
                reconstructed[nodeId] = {
                  status: 'completed',
                  output: event.metadata?.output,
                };
                break;

              case 'node_failure':
                // Requirement 7.4: Apply node_failure events to set status to "failed"
                reconstructed[nodeId] = {
                  status: 'failed',
                  error: event.metadata?.error,
                };
                break;

              // Other event types (edge_start, edge_progress, manual_move) don't affect node state
              default:
                break;
            }
          }
        }

        if (mounted) {
          // Requirement 7.5: Return a complete node_states object for that timestamp
          setNodeStates(reconstructed);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    fetchAndReconstructState();

    return () => {
      mounted = false;
    };
  }, [runId, timestamp]);

  return { nodeStates, loading, error };
}
