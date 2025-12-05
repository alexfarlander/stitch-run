'use client';

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { EntityDot } from './EntityDot';
import { EntityCluster } from './EntityCluster';
import { EntityDetailPanel } from '@/components/panels/EntityDetailPanel';
import { StitchEntity } from '@/types/entity';
import { useEntities } from '@/hooks/useEntities';
import { useEntityPositions } from '@/hooks/useEntityPosition';
import { toast } from 'sonner';

interface Props {
  canvasId: string;
}

/**
 * EntityOverlay Component
 * 
 * Renders entities on the canvas with clustering logic:
 * - Groups with >5 entities: Display as EntityCluster badge
 * - Groups with ≤5 entities: Display as individual EntityDots
 * 
 * Requirements:
 * - 4.1: Cluster when more than 5 entities at same node
 * - 4.4: Show individual dots when 5 or fewer entities
 * - 4.5: Handle real-time updates to cluster counts
 */
export function EntityOverlay({ canvasId }: Props) {
  // Destructure entityProgress to use for smooth animations
  const { entities, isLoading, entityProgress } = useEntities(canvasId);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
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
      setDraggingEntityId(null);
    } catch (error) {
      console.error('Error moving entity:', error);
      toast.error('Failed to move entity');
      setDraggingEntityId(null);
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

  // Group entities by current_node_id
  // Requirement 4.1, 4.4: Group entities to determine clustering
  const entitiesByNode = useMemo(() => {
    if (!animatedEntities) return new Map<string, StitchEntity[]>();

    const grouped = new Map<string, StitchEntity[]>();
    animatedEntities.forEach((entity) => {
      const nodeId = entity.current_node_id;
      if (!nodeId) return;

      if (!grouped.has(nodeId)) {
        grouped.set(nodeId, []);
      }
      grouped.get(nodeId)!.push(entity);
    });

    return grouped;
  }, [animatedEntities]);
  // Get the selected entity object
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId || !entities) return null;
    return entities.find((e) => e.id === selectedEntityId) || null;
  }, [selectedEntityId, entities]);

  // Handler to close the panel
  const handleClosePanel = useCallback(() => {
    setSelectedEntityId(undefined);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((entityId: string) => {
    setDraggingEntityId(entityId);
  }, []);

  // Handle drag end (cleanup)
  const handleDragEnd = useCallback((entityId: string, targetNodeId: string | null) => {
    setDraggingEntityId(null);
  }, []);

  // Handler for EntityDetailPanel (existing functionality)
  const handleMoveEntity = useCallback((entityId: string, targetNodeId: string) => {
    handleDragEnd(entityId, targetNodeId);
  }, [handleDragEnd]);

  if (isLoading || !entities) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Render clusters for nodes with >5 entities */}
        {Array.from(entitiesByNode.entries())
          .filter(([, nodeEntities]) => nodeEntities.length > 5)
          .map(([nodeId, nodeEntities]) => {
            const firstEntity = nodeEntities[0];
            const position = entityPositions.get(firstEntity.id);
            if (!position) return null;

            return (
              <div key={`cluster-${nodeId}`} className="pointer-events-auto">
                <EntityCluster
                  count={nodeEntities.length}
                  position={position}
                  nodeId={nodeId}
                  entities={nodeEntities}
                  onClick={() => {
                    // Optional: Could select first entity or show cluster details
                  }}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </div>
            );
          })}

        {/* Render all individual entities (at nodes or traveling) in a single loop for consistent keys */}
        {animatedEntities.map(entity => {
          // Skip entities in clusters (nodes with >5 entities)
          if (entity.current_node_id) {
            const nodeEntities = entitiesByNode.get(entity.current_node_id);
            if (nodeEntities && nodeEntities.length > 5) {
              return null; // Rendered as cluster above
            }
          }

          const entityPos = entityPositions.get(entity.id);
          if (!entityPos) return null;

          const isMoving = !!entity.current_edge_id;

          return (
            <div key={entity.id} className="pointer-events-auto">
              <EntityDot
                entity={entity}
                position={entityPos}
                isSelected={entity.id === selectedEntityId}
                onClick={() => setSelectedEntityId(entity.id)}
                // Traveling entities cannot be dragged
                onDragStart={isMoving ? undefined : handleDragStart}
                onDragEnd={isMoving ? undefined : handleDragEnd}
              />
            </div>
          );
        })}
      </div>

      {/* Entity Detail Panel */}
      <EntityDetailPanel
        entity={selectedEntity}
        onClose={handleClosePanel}
        onMoveEntity={handleMoveEntity}
      />
    </>
  );
}
