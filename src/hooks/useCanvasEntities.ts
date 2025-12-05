import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { StitchEntity } from '@/types/entity';

/**
 * Custom hook for fetching entities from a canvas
 * 
 * Implements proper cleanup to prevent memory leaks and follows
 * the "Database as Source of Truth" principle from Stitch Principles.
 * 
 * @param canvasId - The canvas ID to fetch entities for
 * @param enabled - Whether to fetch entities (default: true)
 * @returns Object containing entities, loading state, and error
 */
export function useCanvasEntities(canvasId: string | undefined, enabled: boolean = true) {
  const [entities, setEntities] = useState<StitchEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !canvasId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntities([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    const fetchEntities = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', canvasId);

      if (!cancelled) {
        if (fetchError) {
          console.error('Error fetching entities:', fetchError);
          setError(fetchError.message);
          setEntities([]);
        } else {
          setEntities(data || []);
        }
        setLoading(false);
      }
    };

    fetchEntities();

    return () => {
      cancelled = true;
    };
  }, [canvasId, enabled]);

  return { entities, loading, error };
}
