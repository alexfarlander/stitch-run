'use client';

import { useCallback, useState, useMemo } from 'react';
import { EntityDot } from './EntityDot';
import { EntityDetailPanel } from '@/components/panels/EntityDetailPanel';
import { StitchEntity } from '@/types/entity';
import { useEntities } from '@/hooks/useEntities';
import { useEntityPositions } from '@/hooks/useEntityPosition';

interface Props {
  canvasId: string;
}

export function EntityOverlay({ canvasId }: Props) {
  const { entities, isLoading } = useEntities(canvasId);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  
  // Use optimized position calculation hook with per-entity memoization
  // This separates viewport transformation from position calculation
  // and only recalculates positions for entities that have changed
  const entityPositions = useEntityPositions(entities || []);

  // Build array of entities with their positions for rendering
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

  // Placeholder for move entity handler (not implemented in this task)
  const handleMoveEntity = useCallback((entityId: string, targetNodeId: string) => {
    console.log('Move entity:', entityId, 'to', targetNodeId);
    // TODO: Implement entity movement in future task
  }, []);

  if (isLoading || !entities) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {entitiesWithPositions.map(({ entity, screenPos }) => (
          <div key={entity.id} className="pointer-events-auto">
            <EntityDot
              entity={entity}
              position={screenPos}
              isSelected={entity.id === selectedEntityId}
              onClick={() => setSelectedEntityId(entity.id)}
            />
          </div>
        ))}
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
