# Entity Position Calculation Fix

## Problem

Entity dots were not appearing at the correct positions on the canvas because the position calculation didn't account for React Flow's parent node positioning system. When nodes use `extent: 'parent'`, their positions are relative to their parent node, not absolute canvas coordinates.

## Root Cause

The original `calculateScreenPosition` function was applying the viewport transform directly to a node's position without considering that nodes with a `parentNode` property have positions relative to their parent. This caused entity dots to appear in the wrong location, especially for items inside sections.

### Example of the Issue

```typescript
// Given this node hierarchy:
const nodes = [
  { id: 'section', position: { x: 100, y: 200 } },
  { id: 'item', position: { x: 50, y: 60 }, parentNode: 'section' }
];

// WRONG: Using item position directly
screenX = (50 * zoom) + viewportX  // Incorrect!

// CORRECT: Sum parent positions first
absoluteX = 100 + 50  // section.x + item.x
screenX = (150 * zoom) + viewportX  // Correct!
```

## Solution

The fix implements recursive parent position summation before applying the viewport transform:

### Algorithm

1. **Find the target node** by ID
2. **Recursively sum parent positions**:
   - Start with the node's own position
   - Walk up the parent chain using `parentNode` references
   - Add each parent's position to the running total
   - Stop when no parent exists or parent is not found
3. **Apply viewport transform** to the absolute position:
   - `screenX = (absoluteX * zoom) + viewportX`
   - `screenY = (absoluteY * zoom) + viewportY`

### Implementation

```typescript
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
  while (currentNode.parentNode) {
    const parent = nodes.find(n => n.id === currentNode.parentNode);
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
```

## Edge Cases Handled

### 1. Nodes Without Parents
Nodes without a `parentNode` property work correctly - the while loop never executes, and we just use the node's own position.

### 2. Missing Parent References
If a node has a `parentNode` property but the parent doesn't exist in the nodes array, we break out of the loop to avoid infinite loops and use whatever positions we've accumulated.

### 3. Deep Nesting
The algorithm handles arbitrary nesting depth (grandparent → parent → child → ...) by recursively walking up the entire chain.

### 4. Non-Existent Nodes
If the requested node ID doesn't exist, we return origin `{ x: 0, y: 0 }` as a safe fallback.

## Testing

### Property-Based Tests

The fix includes comprehensive property-based tests using fast-check that verify the coordinate transformation formula across 100+ random inputs:

1. **Simple nodes without parents** - Verifies basic viewport transform
2. **Nodes with one parent** - Verifies parent position is summed
3. **Deeply nested hierarchies** - Verifies 3+ level nesting works
4. **Non-existent nodes** - Verifies fallback to origin
5. **Missing parent references** - Verifies graceful handling

All tests validate the formula:
```
screenX = (sum of all ancestor positions.x) * zoom + viewportX
screenY = (sum of all ancestor positions.y) * zoom + viewportY
```

### Manual Tests

The `position-manual-test.ts` file provides concrete examples demonstrating:
- Simple node: `{ x: 100, y: 200 }` → `{ x: 100, y: 200 }`
- With parent: `parent(50, 100) + child(30, 40)` → `{ x: 80, y: 140 }`
- Deep nesting: `grandparent(10, 20) + parent(30, 40) + child(50, 60)` → `{ x: 90, y: 120 }`
- With viewport: Same as above with `zoom: 2, pan: (100, 50)` → `{ x: 280, y: 290 }`

## Related Functions

The same parent position summation logic is also implemented in:

- `getEntityNodePosition()` - Calculates entity clustering positions at nodes
- `getEntityEdgePosition()` - Calculates entity positions traveling along edges

Both functions handle parent node hierarchies before calculating their specific positioning logic.

## Validation

This fix validates **Property 20** from the design document:

> *For any* entity position and viewport transform, the calculated screen coordinates should correctly apply the transform formula after recursively summing all parent node positions: screenX = (absoluteNodeX * zoom) + viewportX, where absoluteNodeX is the sum of the node's position.x and all ancestor parent node positions
> 
> **Validates: Requirements 7.3**

## Impact

With this fix:
- ✅ Entity dots appear at the correct visual positions on the canvas
- ✅ Entity positions update correctly when panning and zooming
- ✅ Items inside sections show entities at the right location
- ✅ Deeply nested node hierarchies work correctly
- ✅ The system handles edge cases gracefully without crashes