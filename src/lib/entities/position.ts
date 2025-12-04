import { Node, Edge } from '@xyflow/react';

interface Position {
  x: number;
  y: number;
}

interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Get position for entity at a node
 * Entities cluster at the bottom of their current node
 * 
 * IMPORTANT: This returns canvas coordinates (not screen coordinates).
 * The caller must apply viewport transform and handle parent node positions.
 */
export function getEntityNodePosition(
  node: Node,
  entityIndex: number,
  totalEntitiesAtNode: number,
  nodes: Node[]
): Position {
  // Calculate absolute position by recursively summing parent positions
  let absoluteX = node.position.x;
  let absoluteY = node.position.y;

  let currentNode = node;
  while (currentNode.parentId) {
    const parent = nodes.find(n => n.id === currentNode.parentId);
    if (!parent) break;
    absoluteX += parent.position.x;
    absoluteY += parent.position.y;
    currentNode = parent;
  }

  const nodeCenter = {
    x: absoluteX + (node.width || 120) / 2,
    y: absoluteY + (node.height || 60)
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
 * Uses linear interpolation between source and target nodes
 * 
 * IMPORTANT: This returns canvas coordinates (not screen coordinates).
 * The caller must apply viewport transform. This function handles parent node positions.
 */
export function getEntityEdgePosition(
  edge: Edge,
  sourceNode: Node,
  targetNode: Node,
  progress: number, // 0.0 to 1.0
  nodes: Node[]
): Position {
  // Calculate absolute positions for source and target by recursively summing parent positions
  let sourceAbsoluteX = sourceNode.position.x;
  let sourceAbsoluteY = sourceNode.position.y;
  let currentNode = sourceNode;
  while (currentNode.parentId) {
    const parent = nodes.find(n => n.id === currentNode.parentId);
    if (!parent) break;
    sourceAbsoluteX += parent.position.x;
    sourceAbsoluteY += parent.position.y;
    currentNode = parent;
  }

  let targetAbsoluteX = targetNode.position.x;
  let targetAbsoluteY = targetNode.position.y;
  currentNode = targetNode;
  while (currentNode.parentId) {
    const parent = nodes.find(n => n.id === currentNode.parentId);
    if (!parent) break;
    targetAbsoluteX += parent.position.x;
    targetAbsoluteY += parent.position.y;
    currentNode = parent;
  }

  const sourcePos = {
    x: sourceAbsoluteX + (sourceNode.width || 120) / 2,
    y: sourceAbsoluteY + (sourceNode.height || 60)
  };

  const targetPos = {
    x: targetAbsoluteX + (targetNode.width || 120) / 2,
    y: targetAbsoluteY
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

/**
 * Calculate screen position for a node, handling parent node hierarchies
 * 
 * CRITICAL: This function recursively sums parent positions for nodes with parentId property.
 * React Flow positions are relative to parent when using extent: 'parent'.
 * We must calculate the absolute position by summing all ancestor positions,
 * then apply the viewport transform.
 * 
 * Formula: screenX = (absoluteNodeX * zoom) + viewportX
 * where absoluteNodeX = sum of node.position.x and all ancestor parent node positions
 * 
 * @param nodeId - ID of the node to calculate position for
 * @param nodes - Array of all nodes in the canvas
 * @param viewport - Current viewport transform (x, y, zoom)
 * @returns Screen coordinates { x, y }
 */
export function calculateScreenPosition(
  nodeId: string,
  nodes: Node[],
  viewport: ViewportTransform
): Position {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    return { x: 0, y: 0 };
  }

  // Recursively calculate absolute position by summing parent positions
  let absoluteX = node.position.x;
  let absoluteY = node.position.y;

  let currentNode = node;
  while (currentNode.parentId) {
    const parent = nodes.find(n => n.id === currentNode.parentId);
    if (!parent) {
      // Parent reference exists but parent not found - break to avoid infinite loop
      break;
    }
    absoluteX += parent.position.x;
    absoluteY += parent.position.y;
    currentNode = parent;
  }

  // Apply viewport transform to convert to screen coordinates
  return {
    x: absoluteX * viewport.zoom + viewport.x,
    y: absoluteY * viewport.zoom + viewport.y
  };
}
