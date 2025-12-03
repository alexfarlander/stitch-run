'use client';

import { useCallback, useState } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { EntityDot } from './EntityDot';
import { StitchEntity } from '@/types/entity';
import { getEntityNodePosition, getEntityEdgePosition } from '@/lib/entities/position';
import { useEntities } from '@/hooks/useEntities';

interface Props {
  canvasId: string;
}

export function EntityOverlay({ canvasId }: Props) {
  const { entities, isLoading } = useEntities(canvasId);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const { getNodes, getEdges, getNode } = useReactFlow();
  const viewport = useViewport();

  const calculatePosition = useCallback(
    (entity: StitchEntity) => {
      const nodes = getNodes();
      const edges = getEdges();

      if (entity.current_node_id) {
        // Entity is at a node
        const node = getNode(entity.current_node_id);
        if (!node) return null;

        // Count entities at this node for positioning
        const entitiesAtNode = entities.filter((e) => e.current_node_id === entity.current_node_id);
        const index = entitiesAtNode.findIndex((e) => e.id === entity.id);

        return getEntityNodePosition(node, index, entitiesAtNode.length);
      }

      if (entity.current_edge_id && entity.edge_progress !== undefined) {
        // Entity is traveling on edge
        const edge = edges.find((e) => e.id === entity.current_edge_id);
        if (!edge) return null;

        const sourceNode = getNode(edge.source);
        const targetNode = getNode(edge.target);
        if (!sourceNode || !targetNode) return null;

        return getEntityEdgePosition(edge, sourceNode, targetNode, entity.edge_progress);
      }

      return null;
    },
    [getNodes, getEdges, getNode, entities]
  );

  // Transform canvas coordinates to screen coordinates
  const toScreenCoords = (pos: { x: number; y: number }) => ({
    x: pos.x * viewport.zoom + viewport.x,
    y: pos.y * viewport.zoom + viewport.y,
  });

  if (isLoading || !entities) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {entities.map((entity) => {
        const canvasPos = calculatePosition(entity);
        if (!canvasPos) return null;

        const screenPos = toScreenCoords(canvasPos);

        return (
          <div key={entity.id} className="pointer-events-auto">
            <EntityDot
              entity={entity}
              position={screenPos}
              isSelected={entity.id === selectedEntityId}
              onClick={() => setSelectedEntityId(entity.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
