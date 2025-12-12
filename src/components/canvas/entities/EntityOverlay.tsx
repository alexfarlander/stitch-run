'use client';

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { EntityDot } from './EntityDot';
import { useEntities } from '@/hooks/useEntities';
import { useEntityPositions } from '@/hooks/useEntityPosition';
import { toast } from 'sonner';

interface Props {
  canvasId: string;
  selectedEntityId?: string;
  onEntitySelect?: (entityId: string | undefined) => void;
}

/**
 * EntityOverlay Component
 * 
 * Renders traveling entities (on edges) as animated dots.
 * Entity count badges are now rendered inside node components directly.
 * 
 * Also handles entity drop events for drag-and-drop movement.
 */
export function EntityOverlay({ 
  canvasId, 
  selectedEntityId: externalSelectedId,
  onEntitySelect 
}: Props) {
  // Destructure entityProgress to use for smooth animations
  const { entities, isLoading, entityProgress } = useEntities(canvasId);
  // Use internal state if no external control provided
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>();
  const selectedEntityId = externalSelectedId ?? internalSelectedId;
  const setSelectedEntityId = onEntitySelect ?? setInternalSelectedId;
  const { getNodes, getEdges } = useReactFlow();

  // Merge database entities with local animation progress
  const animatedEntities = useMemo(() => {
    if (!entities) return [];

    return entities.map(entity => {
      // If we have a local animation progress, override the database value
      const progress = entityProgress.get(entity.id);
      if (progress !== undefined) {
        return {
          ...entity,
          edge_progress: progress,
          // Ensure we have an edge ID if we have progress
          current_edge_id: entity.current_edge_id
        };
      }
      return entity;
    });
  }, [entities, entityProgress]);

  // Use optimized position calculation hook with per-entity memoization
  // This separates viewport transformation from position calculation
  // and only recalculates positions for entities that have changed
  // Pass the ANIMATED entities here, not the raw database ones
  const entityPositions = useEntityPositions(animatedEntities);

  // Handle drop on node
  const handleNodeDrop = useCallback(async (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { entityId, sourceNodeId } = data;

      if (!entityId) {
        return;
      }

      const entity = entities?.find(e => e.id === entityId);
      if (!entity) {
        toast.error('Entity not found');
        return;
      }

      // Requirement 14.1: Verify target node exists
      const nodes = getNodes();
      const targetNode = nodes.find(n => n.id === targetNodeId);
      if (!targetNode) {
        toast.error('Invalid drop target: Node does not exist');
        return;
      }

      // Requirement 14.2: Verify edge exists connecting source and target
      if (sourceNodeId && sourceNodeId !== targetNodeId) {
        const edges = getEdges();
        const connectingEdge = edges.find(
          e => (e.source === sourceNodeId && e.target === targetNodeId) ||
            (e.source === targetNodeId && e.target === sourceNodeId)
        );

        if (!connectingEdge) {
          toast.error('Invalid drop: No edge connects these nodes');
          return;
        }
      }

      // Requirement 5.2, 5.4: Move entity and record journey event
      const response = await fetch(`/api/entities/${entityId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetNodeId })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to move entity');
        return;
      }

      toast.success('Entity moved successfully');
    } catch (error) {
      console.error('Error moving entity:', error);
      toast.error('Failed to move entity');
    }
  }, [entities, getNodes, getEdges]);

  // Listen for entity drop events from nodes
  useEffect(() => {
    const handleEntityDrop = (event: any) => {
      const { targetNodeId, event: dragEvent } = event.detail;
      handleNodeDrop(dragEvent, targetNodeId);
    };

    window.addEventListener('entity-drop', handleEntityDrop as EventListener);
    return () => {
      window.removeEventListener('entity-drop', handleEntityDrop as EventListener);
    };
  }, [handleNodeDrop]);



  if (isLoading || !entities) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 100 }}>
      {/* Render traveling entities (on edges) only - badges are now rendered inside nodes */}
      {animatedEntities
        .filter(entity => entity.current_edge_id) // Only entities traveling on edges
        .map(entity => {
          const entityPos = entityPositions.get(entity.id);
          if (!entityPos) return null;

          // Use a key that changes when entity starts traveling on a NEW edge
          const entityKey = `${entity.id}-edge-${entity.current_edge_id}`;

          return (
            <div key={entityKey} className="pointer-events-auto">
              <EntityDot
                entity={entity}
                position={entityPos}
                isSelected={entity.id === selectedEntityId}
                onClick={() => setSelectedEntityId(entity.id)}
                onDragStart={undefined}
                onDragEnd={undefined}
              />
            </div>
          );
        })}
    </div>
  );
}
