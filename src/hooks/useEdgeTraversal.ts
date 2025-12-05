/**
 * Hook for tracking edge traversal animations in real-time
 * 
 * Subscribes to journey events and manages edge traversal state for animations.
 * Handles multiple concurrent traversals on the same edge.
 * 
 * Requirements: 1.4, 1.5
 * Properties: 1, 2, 3, 4
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { DatabaseJourneyEvent, isDatabaseEvent, normalizeJourneyEvent } from '@/types/journey-event';
import { ENTITY_TRAVEL_DURATION_MS } from '@/lib/canvas/animation-config';

/**
 * Tracks active traversals for an edge
 */
interface EdgeTraversalState {
  traversalIds: Set<string>;
  timeouts: Map<string, NodeJS.Timeout>;
}

/**
 * Hook for tracking edge traversal animations
 * 
 * Subscribes to stitch_journey_events table for edge_start events and manages
 * the isTraversing state for each edge. Automatically clears traversing state
 * after the animation duration to match entity movement (2000ms by default).
 * 
 * Requirements: 17.1, 17.2 - Synchronized with entity movement animations
 * 
 * @param canvasId - The canvas ID to track edge traversals for
 * @returns Map of edge IDs to their traversing state (true if currently animating)
 * 
 * @example
 * ```tsx
 * function WorkflowCanvas({ canvasId }: { canvasId: string }) {
 *   const traversingEdges = useEdgeTraversal(canvasId);
 *   
 *   const edges = useMemo(() => 
 *     baseEdges.map(edge => ({
 *       ...edge,
 *       data: {
 *         ...edge.data,
 *         isTraversing: traversingEdges.get(edge.id) || false
 *       }
 *     })),
 *     [baseEdges, traversingEdges]
 *   );
 * }
 * ```
 */
export function useEdgeTraversal(canvasId: string | undefined): Map<string, boolean> {
  const [traversingEdges, setTraversingEdges] = useState<Map<string, boolean>>(new Map());
  
  // Track active traversals per edge to handle concurrent traversals
  const edgeStatesRef = useRef<Map<string, EdgeTraversalState>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!canvasId) {
      return;
    }

    mountedRef.current = true;

    // Subscribe to journey events for this canvas
    const channel = supabase
      .channel(`edge-traversal:${canvasId}`)
      .on(
        'postgres_changes' as unknown,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stitch_journey_events',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload: unknown) => {
          if (!mountedRef.current) return;

          // Validate payload structure
          if (!payload?.new) {
            console.warn('Invalid journey event payload: missing new data');
            return;
          }

          // Normalize the event to typed format
          const event = normalizeJourneyEvent(payload.new);
          
          // Only process database events with edge_start type
          if (!isDatabaseEvent(event) || event.event_type !== 'edge_start') {
            return;
          }

          const edgeId = event.edge_id;
          if (!edgeId || typeof edgeId !== 'string') {
            console.warn('Invalid journey event: missing or invalid edge_id');
            return;
          }

          // Generate unique traversal ID for this specific traversal
          const traversalId = `${event.id}-${Date.now()}`;

          // Get or create edge state
          let edgeState = edgeStatesRef.current.get(edgeId);
          if (!edgeState) {
            edgeState = {
              traversalIds: new Set(),
              timeouts: new Map(),
            };
            edgeStatesRef.current.set(edgeId, edgeState);
          }

          // Add this traversal
          edgeState.traversalIds.add(traversalId);

          // Update traversing state (edge is traversing if it has unknown active traversals)
          setTraversingEdges(prev => {
            const next = new Map(prev);
            next.set(edgeId, true);
            return next;
          });

          // Set timeout to clear this specific traversal after animation duration
          const timeout = setTimeout(() => {
            if (!mountedRef.current) return;

            const currentEdgeState = edgeStatesRef.current.get(edgeId);
            if (!currentEdgeState) return;

            // Remove this traversal
            currentEdgeState.traversalIds.delete(traversalId);
            currentEdgeState.timeouts.delete(traversalId);

            // If no more active traversals, mark edge as not traversing
            if (currentEdgeState.traversalIds.size === 0) {
              setTraversingEdges(prev => {
                const next = new Map(prev);
                next.delete(edgeId);
                return next;
              });

              // Clean up edge state
              edgeStatesRef.current.delete(edgeId);
            }
          }, ENTITY_TRAVEL_DURATION_MS);

          // Store timeout for cleanup
          edgeState.timeouts.set(traversalId, timeout);
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      mountedRef.current = false;

      // Clear all timeouts
      edgeStatesRef.current.forEach(edgeState => {
        edgeState.timeouts.forEach(timeout => clearTimeout(timeout));
      });
      edgeStatesRef.current.clear();

      // Unsubscribe from channel
      channel.unsubscribe();
    };
  }, [canvasId]);

  return traversingEdges;
}
