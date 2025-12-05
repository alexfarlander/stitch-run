import { Node } from '@xyflow/react';

/**
 * Z-index constants for canvas layers
 * These define the stacking order of different node types
 * 
 * Stacking order (bottom to top):
 * 1. Section backgrounds (containers)
 * 2. Items (nodes inside sections)
 * 3. Financial sections
 * 4. Edges (connections between nodes) - ABOVE nodes
 * 5. Entities (traveling dots) - ABOVE edges
 */
export const Z_INDEX_LAYERS = {
  SECTION_BACKGROUND: -1,      // Sections render behind everything
  ITEMS: 1,                    // Items render above sections
  FINANCIAL_SECTIONS: 5,       // Financial sections above items
  EDGES: 50,                   // Edges render ABOVE all nodes
  EDGES_HIGHLIGHTED: 60,       // Highlighted edges above normal edges
  ENTITY_OVERLAY: 100,         // Entities render on top of everything
} as const;

/**
 * Sort nodes by zIndex for correct DOM stacking order
 * 
 * CRITICAL: React Flow renders nodes in array order, which determines DOM order.
 * DOM order affects z-index stacking context. We must sort nodes by zIndex
 * before passing to React Flow to ensure correct visual layering.
 * 
 * Sorting order:
 * 1. Section nodes (zIndex: -1) - render first (background)
 * 2. Financial section nodes (zIndex: 5) - render second
 * 3. Item nodes (zIndex: 1+) - render last (foreground)
 * 
 * @param nodes - Array of React Flow nodes
 * @returns Sorted array of nodes (does not mutate original)
 */
export function sortNodesForRendering(nodes: Node[]): Node[] {
  return [...nodes].sort((a, b) => {
    const zIndexA = typeof a.style?.zIndex === 'number' ? a.style.zIndex : 0;
    const zIndexB = typeof b.style?.zIndex === 'number' ? b.style.zIndex : 0;
    return zIndexA - zIndexB;
  });
}
