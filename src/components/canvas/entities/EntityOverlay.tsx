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
  const { entities, isLoading } = useEntities(canvasId);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
  const { getNodes, getEdges } = useReactFlow();
  
  // Use optimized position calculation hook with per-entity memoization
  // This separates viewport transformation from position calculation
  // and only recalculates positions for entities that have changed
  const entityPositions = useEntityPositions(entities || []);

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
    if (!entities) return new Map<string, StitchEntity[]>();
    
    const grouped = new Map<string, StitchEntity[]>();
    entities.forEach((entity) => {
      const nodeId = entity.current_node_id;
      if (!nodeId) return;
      
      if (!grouped.has(nodeId)) {
        grouped.set(nodeId, []);
      }
      grouped.get(nodeId)!.push(entity);
    });
    
    return grouped;
  }, [entities]);

  // Build array of entities with their positions for rendering individual dots
  const entitiesWithPositions = useMemo(() => {
    if (!entities) return [];
    
    return entities
      .map((entity) => {
        const screenPos = entityPositions.get(entity.id);
        if (!screenPos) return null;
        return { entity, screenPos };
      })
      .filter((item): item is { entity: StitchEntity; screenPos: { x: number; y: number } } => item !== null);
  }, [entities, entityPositions]);

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
        {/* Render clusters and individual entities */}
        {Array.from(entitiesByNode.entries()).map(([nodeId, nodeEntities]) => {
          // Get position for the first entity in the group (they're all at the same node)
          const firstEntity = nodeEntities[0];
          const position = entityPositions.get(firstEntity.id);
          
          if (!position) return null;

          // Requirement 4.1: Cluster if more than 5 entities
          if (nodeEntities.length > 5) {
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
          }

          // Requirement 4.4: Show individual dots when 5 or fewer entities
          return nodeEntities.map((entity) => {
            const entityPos = entityPositions.get(entity.id);
            if (!entityPos) return null;

            return (
              <div key={entity.id} className="pointer-events-auto">
                <EntityDot
                  entity={entity}
                  position={entityPos}
                  isSelected={entity.id === selectedEntityId}
                  onClick={() => setSelectedEntityId(entity.id)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </div>
            );
          });
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
