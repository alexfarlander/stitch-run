import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { StitchEntity } from '@/types/entity';
import { animateEntityTravel } from '@/lib/entities/travel';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseEntitiesResult {
  entities: StitchEntity[];
  isLoading: boolean;
  error: Error | null;
  // Local progress state for smooth animations
  entityProgress: Map<string, number>;
}

export function useEntities(canvasId: string): UseEntitiesResult {
  const [entities, setEntities] = useState<StitchEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [entityProgress, setEntityProgress] = useState<Map<string, number>>(new Map());

  // Initial fetch
  useEffect(() => {
    async function fetchEntities() {
      const { data, error } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', canvasId);

      if (error) {
        setError(error);
      } else {
        setEntities(data || []);
      }
      setIsLoading(false);
    }

    fetchEntities();
  }, [canvasId]);

  // Real-time subscription using centralized subscription
  useRealtimeSubscription<{
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: StitchEntity;
    old: StitchEntity;
  }>(
    {
      table: 'stitch_entities',
      filter: `canvas_id=eq.${canvasId}`,
      event: '*',
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setEntities((prev) => [...prev, payload.new as StitchEntity]);
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as StitchEntity;
        const old = payload.old as StitchEntity;

        setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));

        // Detect if entity started traveling
        if (updated.current_edge_id && !old.current_edge_id) {
          // Start local animation
          animateEntityTravel({
            entityId: updated.id,
            edgeId: updated.current_edge_id,
            destinationNodeId: updated.destination_node_id!,
            duration: 2,
            onProgress: (progress) => {
              setEntityProgress((prev) => new Map(prev).set(updated.id, progress));
            },
            onComplete: () => {
              setEntityProgress((prev) => {
                const next = new Map(prev);
                next.delete(updated.id);
                return next;
              });
            }
          });
        }
      } else if (payload.eventType === 'DELETE') {
        setEntities((prev) => prev.filter((e) => e.id !== payload.old.id));
      }
    },
    true
  );

  return { entities, isLoading, error, entityProgress };
}
