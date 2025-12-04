/**
 * Auto-Layout Algorithm
 * 
 * Implements hierarchical layout using Longest Path Layering algorithm.
 * This ensures nodes are positioned without overlap and in a logical flow.
 * 
 * Key Features:
 * - Handles DAGs correctly by computing node level as max(parent_levels) + 1
 * - Waits for all parents to be visited before assigning level
 * - Ensures no two nodes have identical positions
 * - Uses horizontal and vertical spacing for readability
 * 
 * Requirements: 7.5, 7.6
 */

import { VisualNode, VisualEdge } from '@/types/canvas-schema';

// Layout configuration
const HORIZONTAL_SPACING = 300;  // Space between levels (left to right)
const VERTICAL_SPACING = 150;    // Space between nodes in same level (top to bottom)

/**
 * Auto-layout nodes to prevent overlap
 * Uses hierarchical layout algorithm with Longest Path Layering
 * 
 * @param nodes - Array of visual nodes (positions will be overwritten)
 * @param edges - Array of visual edges (used to compute hierarchy)
 * @returns Array of nodes with computed positions
 */
export function autoLayout(
  nodes: VisualNode[],
  edges: VisualEdge[]
): VisualNode[] {
  // Handle empty graph
  if (nodes.length === 0) {
    return [];
  }

  // Build adjacency map for traversal
  const adjacency = buildAdjacency(edges);
  
  // Compute hierarchical levels using Longest Path Layering
  const levels = computeLevels(nodes, adjacency);
  
  // Position nodes based on their levels
  const positioned = positionNodes(nodes, levels);
  
  return positioned;
}

/**
 * Build adjacency map from edges
 * Maps source node ID to array of target node IDs
 * 
 * @param edges - Array of visual edges
 * @returns Adjacency map { sourceId: [targetId1, targetId2, ...] }
 */
function buildAdjacency(edges: VisualEdge[]): Record<string, string[]> {
  const adjacency: Record<string, string[]> = {};
  
  for (const edge of edges) {
    if (!adjacency[edge.source]) {
      adjacency[edge.source] = [];
    }
    adjacency[edge.source].push(edge.target);
  }
  
  return adjacency;
}

/**
 * Compute topological levels using Kahn's Algorithm variant (in-degree counting)
 * 
 * This is safe against cycles - if a cycle exists, nodes in the cycle will never
 * reach in-degree 0 and won't be processed. The loop terminates naturally.
 * 
 * Algorithm:
 * 1. Calculate in-degree (number of incoming edges) for each node
 * 2. Start with nodes having in-degree 0 (entry nodes) at level 0
 * 3. Process each node: update children's levels and decrement their in-degrees
 * 4. When a child's in-degree reaches 0, all parents processed - add to queue
 * 5. Child level = max(parent_levels) + 1 (Longest Path Layering)
 * 
 * Performance: O(V+E) - much faster than the previous O(V²) approach
 * Safety: Cycles cause nodes to never reach in-degree 0, preventing infinite loops
 * 
 * @param nodes - Array of visual nodes
 * @param adjacency - Forward adjacency map (parent -> children)
 * @returns Map of node ID to level number
 */
function computeLevels(
  nodes: VisualNode[],
  adjacency: Record<string, string[]>
): Record<string, number> {
  const levels: Record<string, number> = {};
  const inDegree: Record<string, number> = {};
  
  // 1. Initialize in-degrees and default levels
  for (const node of nodes) {
    inDegree[node.id] = 0;
    levels[node.id] = 0; // Default level
  }
  
  // 2. Calculate in-degrees (number of incoming edges)
  for (const targets of Object.values(adjacency)) {
    for (const target of targets) {
      if (inDegree[target] !== undefined) {
        inDegree[target]++;
      }
    }
  }
  
  // 3. Queue starts with nodes having 0 incoming edges (Entry Nodes)
  const queue: string[] = nodes
    .filter(n => inDegree[n.id] === 0)
    .map(n => n.id);
  
  // 4. Process nodes in topological order
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    
    const children = adjacency[nodeId] || [];
    for (const childId of children) {
      // Child's level must be at least Parent + 1
      // Since we visit parents first, this accumulates the "Longest Path"
      levels[childId] = Math.max(levels[childId], levels[nodeId] + 1);
      
      // Decrement dependency count
      inDegree[childId]--;
      
      // If all parents processed, add to queue
      if (inDegree[childId] === 0) {
        queue.push(childId);
      }
    }
  }
  
  return levels;
}

/**
 * Position nodes based on their computed levels
 * Ensures no two nodes have identical positions
 * 
 * @param nodes - Array of visual nodes
 * @param levels - Map of node ID to level number
 * @returns Array of nodes with updated positions
 */
function positionNodes(
  nodes: VisualNode[],
  levels: Record<string, number>
): VisualNode[] {
  // Group nodes by level
  const nodesByLevel: Record<number, string[]> = {};
  
  for (const node of nodes) {
    const level = levels[node.id] ?? 0;  // Default to level 0 if not computed
    
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(node.id);
  }
  
  // Position each node
  const positioned = nodes.map(node => {
    const level = levels[node.id] ?? 0;
    const nodesInLevel = nodesByLevel[level];
    const indexInLevel = nodesInLevel.indexOf(node.id);
    
    return {
      ...node,
      position: {
        x: level * HORIZONTAL_SPACING,
        y: indexInLevel * VERTICAL_SPACING
      }
    };
  });
  
  return positioned;
}
