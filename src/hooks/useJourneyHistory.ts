'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { DatabaseJourneyEvent, normalizeJourneyEvent } from '@/types/journey-event';

interface UseJourneyHistoryResult {
  events: DatabaseJourneyEvent[];
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
  const [events, setEvents] = useState<DatabaseJourneyEvent[]>([]);
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
          // Normalize raw database events to typed events
          const typedEvents = (data || []).map(raw => 
            normalizeJourneyEvent(raw) as DatabaseJourneyEvent
          );
          setEvents(typedEvents);
        }
      } catch (_err) {
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
