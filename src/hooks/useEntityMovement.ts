import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { StitchEntity } from '@/types/stitch';
import { useReactFlow } from '@xyflow/react';

interface Position { 
  x: number; 
  y: number; 
}

interface UseEntityMovementProps {
  canvasId: string;
  // Callback to update the visual position of the dot (frame-by-frame)
  onEntityPositionUpdate: (entityId: string, position: Position) => void;
}

export function useEntityMovement({ 
  canvasId, 
  onEntityPositionUpdate 
}: UseEntityMovementProps) {
  const { getNode, getEdge } = useReactFlow();

  // Track active animations to prevent memory leaks or conflicts
  const activeAnimations = useRef<Map<string, { stop: () => void }>>(new Map());

  useEffect(() => {
    const subscription = supabase
      .channel(`entities:${canvasId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stitch_entities',
          filter: `canvas_id=eq.${canvasId}`
        },
        (payload: any) => {
          const entity = payload.new as StitchEntity;
          const oldEntity = payload.old as StitchEntity;

          // Case 1: Started traveling (Node -> Edge)
          if (entity.current_edge_id && !oldEntity.current_edge_id) {
            handleStartTravel(entity);
          }

          // Case 2: Arrived at node (Edge -> Node)
          if (entity.current_node_id && !oldEntity.current_node_id) {
            handleArrival(entity);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      activeAnimations.current.forEach(anim => anim.stop());
    };
  }, [canvasId]);

  const handleStartTravel = (entity: StitchEntity) => {
    if (!entity.current_edge_id) return;

    // Helper: Find the actual SVG path in the DOM to animate along
    // React Flow edges usually have data-id or class names we can target
    const edgeElement = document.querySelector(
      `[data-id="${entity.current_edge_id}"] path`
    ) as SVGPathElement;

    if (!edgeElement) {
      console.warn('Could not find edge element for animation:', entity.current_edge_id);
      return;
    }

    const totalLength = edgeElement.getTotalLength();

    const controls = animate(0, 1, {
      duration: 2, // 2 seconds travel time
      ease: "easeInOut",
      onUpdate: (progress) => {
        const point = edgeElement.getPointAtLength(progress * totalLength);
        // Offset by -14 to center a 28px dot
        onEntityPositionUpdate(entity.id, { x: point.x - 14, y: point.y - 14 });
      },
      onComplete: () => {
        // Animation done, waiting for DB update to snap to node
        activeAnimations.current.delete(entity.id);
      }
    });

    activeAnimations.current.set(entity.id, controls);
  };

  const handleArrival = (entity: StitchEntity) => {
    if (!entity.current_node_id) return;

    // Stop travel animation if running
    if (activeAnimations.current.has(entity.id)) {
      activeAnimations.current.get(entity.id)?.stop();
      activeAnimations.current.delete(entity.id);
    }

    const node = getNode(entity.current_node_id);
    if (node) {
      // Center on node (assuming standard node size, adjust if dynamic)
      const w = node.width || 150;
      const h = node.height || 80;
      const x = node.position.x + w / 2 - 14;
      const y = node.position.y + h / 2 - 14;

      onEntityPositionUpdate(entity.id, { x, y });
    }
  };
}
