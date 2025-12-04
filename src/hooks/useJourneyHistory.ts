'use client';

import { useState, useEffect } from 'react';
import { JourneyEvent } from '@/types/stitch';
import { supabase } from '@/lib/supabase/client';

interface UseJourneyHistoryResult {
  events: JourneyEvent[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch journey history for an entity
 * Fetches journey events directly from the database using client-side Supabase
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */
export function useJourneyHistory(entityId: string | null): UseJourneyHistoryResult {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;

    async function fetchHistory() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('stitch_journey_events')
          .select('*')
          .eq('entity_id', entityId)
          .order('timestamp', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        if (mounted) {
          setEvents((data || []) as JourneyEvent[]);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch journey history');
          setEvents([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, [entityId]);

  return { events, loading, error };
}
