import { useMemo } from 'react';
import { Node, Edge, useReactFlow, useViewport } from '@xyflow/react';
import { StitchEntity } from '@/types/entity';
import { getEntityNodePosition, getEntityEdgePosition } from '@/lib/entities/position';

interface Position {
  x: number;
  y: number;
}

/**
 * Hook to calculate and memoize entity position with precise dependencies
 * 
 * This hook optimizes performance by:
 * 1. Only recalculating when entity position data changes (node_id, edge_id, progress)
 * 2. Only recalculating screen coordinates when viewport changes
 * 3. Separating canvas position calculation from viewport transformation
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function useEntityPosition(
  entity: StitchEntity,
  entities: StitchEntity[]
): Position | null {
  const { getNodes, getEdges, getNode } = useReactFlow();
  const viewport = useViewport();

  // Memoize canvas position - only recalculates when entity position data changes
  const canvasPosition = useMemo(() => {
    const nodes = getNodes();
    const edges = getEdges();

    if (entity.current_node_id) {
      // Entity is at a node
      const node = getNode(entity.current_node_id);
      if (!node) return null;

      // Count entities at this node for positioning
      const entitiesAtNode = entities.filter((e) => e.current_node_id === entity.current_node_id);
      const index = entitiesAtNode.findIndex((e) => e.id === entity.id);

      return getEntityNodePosition(node, index, entitiesAtNode.length, nodes);
    }

    if (entity.current_edge_id && entity.edge_progress !== undefined) {
      // Entity is traveling on edge
      const edge = edges.find((e) => e.id === entity.current_edge_id);
      
      if (edge) {
        const sourceNode = getNode(edge.source);
        const targetNode = getNode(edge.target);
        
        if (sourceNode && targetNode) {
          return getEntityEdgePosition(edge, sourceNode, targetNode, entity.edge_progress, nodes);
        }
        // If we have the edge but missing nodes, log warning and return null
        console.warn(`[EntityPosition] Edge ${edge.id} found but missing nodes: source=${edge.source} (${!!sourceNode}), target=${edge.target} (${!!targetNode})`);
      } else {
        // Edge not found - log available edges for debugging
        console.warn(`[EntityPosition] Edge not found: "${entity.current_edge_id}". Available edge IDs:`, edges.slice(0, 10).map(e => e.id));
      }
    }

    return null;
  }, [
    // Only recalculate when entity position changes
    entity.id,
    entity.current_node_id,
    entity.current_edge_id,
    entity.edge_progress,
    // Include entities array to recalculate clustering when entities at same node change
    entities,
    getNodes,
    getEdges,
    getNode,
  ]);

  // Memoize screen position - only recalculates when canvas position or viewport changes
  const screenPosition = useMemo(() => {
    if (!canvasPosition) return null;

    return {
      x: canvasPosition.x * viewport.zoom + viewport.x,
      y: canvasPosition.y * viewport.zoom + viewport.y,
    };
  }, [
    canvasPosition,
    viewport.zoom,
    viewport.x,
    viewport.y,
  ]);

  return screenPosition;
}

/**
 * Hook to calculate positions for multiple entities with caching
 * 
 * This hook provides an additional optimization layer by caching positions
 * for entities that haven't changed, avoiding unnecessary recalculations.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function useEntityPositions(entities: StitchEntity[]): Map<string, Position> {
  const { getNodes, getEdges, getNode } = useReactFlow();
  const viewport = useViewport();

  // Memoize positions map - only recalculates changed entities
  const positions = useMemo(() => {
    const positionsMap = new Map<string, Position>();
    const nodes = getNodes();
    const edges = getEdges();

    for (const entity of entities) {
      let canvasPos: Position | null = null;

      if (entity.current_node_id) {
        // Entity is at a node
        const node = getNode(entity.current_node_id);
        if (!node) continue;

        // Count entities at this node for positioning
        const entitiesAtNode = entities.filter((e) => e.current_node_id === entity.current_node_id);
        const index = entitiesAtNode.findIndex((e) => e.id === entity.id);

        canvasPos = getEntityNodePosition(node, index, entitiesAtNode.length, nodes);
      } else if (entity.current_edge_id && entity.edge_progress !== undefined) {
        // Entity is traveling on edge
        const edge = edges.find((e) => e.id === entity.current_edge_id);
        
        if (edge) {
          const sourceNode = getNode(edge.source);
          const targetNode = getNode(edge.target);
          
          if (sourceNode && targetNode) {
            canvasPos = getEntityEdgePosition(edge, sourceNode, targetNode, entity.edge_progress, nodes);
          } else {
            // If we have the edge but missing nodes, log warning
            console.warn(`[EntityPositions] Edge ${edge.id} found but missing nodes: source=${edge.source} (${!!sourceNode}), target=${edge.target} (${!!targetNode})`);
          }
        } else {
          // Edge not found - log available edges for debugging
          console.warn(`[EntityPositions] Edge not found: "${entity.current_edge_id}" for entity "${entity.name}". Available edge IDs:`, edges.slice(0, 10).map(e => e.id));
        }
      }

      if (canvasPos) {
        // Transform to screen coordinates
        const screenPos = {
          x: canvasPos.x * viewport.zoom + viewport.x,
          y: canvasPos.y * viewport.zoom + viewport.y,
        };
        positionsMap.set(entity.id, screenPos);
      }
    }

    return positionsMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Serialize entity position data for dependency tracking
    // eslint-disable-next-line react-hooks/exhaustive-deps
    entities.map(e => `${e.id}:${e.current_node_id}:${e.current_edge_id}:${e.edge_progress}`).join(','),
    viewport.zoom,
    viewport.x,
    viewport.y,
    getNodes,
    getEdges,
    getNode,
  ]);

  return positions;
}
