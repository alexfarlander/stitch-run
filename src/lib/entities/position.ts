import { Node, Edge } from '@xyflow/react';

interface Position {
  x: number;
  y: number;
}

/**
 * Get position for entity at a node
 * Entities cluster at the bottom of their current node
 */
export function getEntityNodePosition(
  node: Node,
  entityIndex: number,
  totalEntitiesAtNode: number
): Position {
  const nodeCenter = {
    x: node.position.x + (node.width || 120) / 2,
    y: node.position.y + (node.height || 60)
  };

  // Spread entities horizontally below the node
  const spacing = 35;
  const totalWidth = (totalEntitiesAtNode - 1) * spacing;
  const startX = nodeCenter.x - totalWidth / 2;

  return {
    x: startX + entityIndex * spacing - 14, // -14 to center the 28px dot
    y: nodeCenter.y + 10
  };
}

/**
 * Get position for entity traveling on edge
 * Uses SVG path to find point at progress percentage
 */
export function getEntityEdgePosition(
  edge: Edge,
  sourceNode: Node,
  targetNode: Node,
  progress: number // 0.0 to 1.0
): Position {
  // Simple linear interpolation for now
  // TODO: Use actual SVG path for curved edges
  const sourcePos = {
    x: sourceNode.position.x + (sourceNode.width || 120) / 2,
    y: sourceNode.position.y + (sourceNode.height || 60)
  };

  const targetPos = {
    x: targetNode.position.x + (targetNode.width || 120) / 2,
    y: targetNode.position.y
  };

  return {
    x: sourcePos.x + (targetPos.x - sourcePos.x) * progress - 14,
    y: sourcePos.y + (targetPos.y - sourcePos.y) * progress - 14
  };
}

/**
 * Get position using actual SVG path element
 * More accurate for curved edges
 */
export function getEntityEdgePositionFromPath(
  pathElement: SVGPathElement,
  progress: number
): Position {
  const totalLength = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(totalLength * progress);

  return {
    x: point.x - 14,
    y: point.y - 14
  };
}
