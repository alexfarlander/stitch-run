# Edge Traversal Animation Usage Guide

## Overview

The edge traversal animation system displays a glowing cyan pulse along edges when entities move between nodes. This provides visual feedback for data flow through the workflow.

## How to Use

### Basic Usage

To trigger the edge traversal animation, set `isTraversing: true` in the edge's data:

```typescript
const edges = [
  {
    id: 'edge-1',
    source: 'node-a',
    target: 'node-b',
    type: 'journey',
    data: {
      isTraversing: true,  // Triggers the pulse animation
      intensity: 0.8,
      label: 'Customer Journey'
    }
  }
];
```

### Integration with useEdgeTraversal Hook (Task 11)

Once Task 11 is complete, the hook will automatically manage the `isTraversing` state:

```typescript
function WorkflowCanvas({ canvasId }: { canvasId: string }) {
  const { nodes, edges: baseEdges } = useReactFlow();
  const traversingEdges = useEdgeTraversal(canvasId);
  
  // Add isTraversing to edge data
  const edges = useMemo(() => {
    return baseEdges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isTraversing: traversingEdges.get(edge.id) || false
      }
    }));
  }, [baseEdges, traversingEdges]);
  
  return <ReactFlow nodes={nodes} edges={edges} />;
}
```

## Animation Behavior

- **Duration**: 500ms (as specified in Requirements 1.3)
- **Effect**: Cyan gradient pulse with glow
- **Colors**: #06b6d4 (cyan-500) and #22d3ee (cyan-400)
- **Performance**: GPU-accelerated CSS animation

## Visual Characteristics

When `isTraversing` is true:
1. A second path element is rendered on top of the base edge
2. The path uses a linear gradient from transparent → cyan → transparent
3. A drop-shadow filter creates the glow effect
4. The stroke-dashoffset animates from 24 to 0 over 500ms
5. Opacity fades from 1 to 0.6 for a smooth finish

## Example: Manual Trigger

For testing or manual control:

```typescript
const [edges, setEdges] = useState([...]);

// Trigger animation on edge-1
const triggerAnimation = (edgeId: string) => {
  setEdges(edges => edges.map(edge => 
    edge.id === edgeId 
      ? { ...edge, data: { ...edge.data, isTraversing: true } }
      : edge
  ));
  
  // Clear after animation completes
  setTimeout(() => {
    setEdges(edges => edges.map(edge => 
      edge.id === edgeId 
        ? { ...edge, data: { ...edge.data, isTraversing: false } }
        : edge
    ));
  }, 500);
};
```

## Multiple Concurrent Traversals

The system supports multiple entities traversing the same edge simultaneously (Requirement 1.4). Each traversal should have its own animation cycle:

```typescript
// The useEdgeTraversal hook (Task 11) will handle this automatically
// by tracking multiple traversal IDs per edge
```

## Compatibility

- Works with all existing edge data properties
- Does not interfere with the base flow animation
- Compatible with edge hover tooltips and stats display
- No breaking changes to existing functionality

## Next Steps

To complete the full edge traversal visualization:
1. ✅ Task 10: Add animation system (COMPLETE)
2. ⏳ Task 11: Create useEdgeTraversal hook
3. ⏳ Task 12: Wire into canvases
4. ⏳ Task 13: Synchronize with entity animations
