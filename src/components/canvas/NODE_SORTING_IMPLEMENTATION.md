# Node Sorting for Z-Index Implementation

## Overview

This document describes the implementation of node sorting for correct z-index stacking order in the BMC Canvas.

## Problem

React Flow renders nodes in the order they appear in the nodes array, which determines the DOM order. DOM order affects z-index stacking context. Without proper sorting, nodes with higher z-index values might still render behind nodes with lower z-index values if they appear earlier in the DOM.

## Solution

### 1. Z-Index Layer Constants

Created `Z_INDEX_LAYERS` constant in `src/components/canvas/utils.ts`:

```typescript
export const Z_INDEX_LAYERS = {
  SECTION_BACKGROUND: -1,      // Sections render behind everything
  EDGES: 0,                    // Edges render above sections
  ITEMS: 1,                    // Items render above edges
  FINANCIAL_SECTIONS: 5,       // Financial sections above background
  ENTITY_OVERLAY: 100,         // Entities render on top
} as const;
```

### 2. Sorting Function

Created `sortNodesForRendering()` function that:
- Takes an array of React Flow nodes
- Sorts them by z-index in ascending order
- Returns a new sorted array (does not mutate original)
- Handles nodes without explicit z-index (defaults to 0)

```typescript
export function sortNodesForRendering(nodes: Node[]): Node[] {
  return [...nodes].sort((a, b) => {
    const zIndexA = typeof a.style?.zIndex === 'number' ? a.style.zIndex : 0;
    const zIndexB = typeof b.style?.zIndex === 'number' ? b.style.zIndex : 0;
    return zIndexA - zIndexB;
  });
}
```

### 3. Integration with BMCCanvas

Updated `BMCCanvas.tsx` to:
1. Import the sorting function and constants
2. Use `Z_INDEX_LAYERS` constants for z-index assignment
3. Apply sorting before passing nodes to React Flow

The sorting ensures:
- Section nodes (z-index: -1) render first → background
- Item nodes (z-index: 1) render second → foreground
- Financial sections (z-index: 5) render third → above items
- Entity overlay (z-index: 100) renders last → on top

## Testing

### Unit Tests

Created comprehensive unit tests in `src/components/canvas/__tests__/utils.test.ts`:
- ✅ Sorts nodes by z-index in ascending order
- ✅ Does not mutate original array
- ✅ Handles nodes without explicit z-index
- ✅ Maintains stable sort for same z-index
- ✅ Handles empty arrays and single nodes
- ✅ Correctly orders sections, items, and financial sections

### Integration Tests

Updated `src/components/canvas/__tests__/BMCCanvas.test.tsx`:
- ✅ Verifies z-index constants have correct values
- ✅ Ensures sections render behind items
- ✅ Ensures edges are between sections and items
- ✅ Verifies complete z-index layer ordering

### Verification Script

Created `scripts/verify-node-sorting.ts`:
- ✅ Verifies nodes are sorted by z-index
- ✅ Checks section nodes render first
- ✅ Checks item nodes render after sections
- ✅ Validates financial section z-index

## Requirements Validated

This implementation validates the following requirements:

- **Requirement 6.3**: Section nodes have z-index -1 to position them behind items
- **Requirement 6.4**: Item nodes have z-index 1 or higher to make them interactive
- **Requirement 6.5**: Edges are visible between node layers (z-index 0)

## Files Modified

1. **Created**: `src/components/canvas/utils.ts`
   - Z-index layer constants
   - Node sorting function

2. **Modified**: `src/components/canvas/BMCCanvas.tsx`
   - Import sorting utilities
   - Use constants for z-index assignment
   - Apply sorting before passing to React Flow

3. **Created**: `src/components/canvas/__tests__/utils.test.ts`
   - Unit tests for sorting function

4. **Modified**: `src/components/canvas/__tests__/BMCCanvas.test.tsx`
   - Integration tests for z-index layers

5. **Created**: `scripts/verify-node-sorting.ts`
   - Verification script for DOM stacking order

## Usage

The sorting is automatically applied in the BMCCanvas component. No manual intervention required.

```typescript
// In BMCCanvas.tsx
const nodes = useMemo(() => {
  const transformedNodes = flow.graph.nodes.map(/* transform */);
  return sortNodesForRendering(transformedNodes); // ← Automatic sorting
}, [flow.graph.nodes]);
```

## Visual Result

With proper sorting:
1. **Sections** appear as background containers
2. **Items** appear as interactive elements on top of sections
3. **Financial sections** appear as overlays
4. **Edges** are visible between all layers
5. **Entity dots** appear on top of everything

This ensures the canvas renders correctly with proper visual hierarchy.
