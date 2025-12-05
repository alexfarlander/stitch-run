# useEdgeTraversal Hook

## Overview

The `useEdgeTraversal` hook provides real-time tracking of edge traversal animations in the Living Canvas. It subscribes to journey events and manages the `isTraversing` state for each edge, enabling visual feedback when entities move along edges.

## Features

- ✅ Real-time subscription to `stitch_journey_events` table
- ✅ Automatic state management for edge traversal animations
- ✅ Support for multiple concurrent traversals on the same edge
- ✅ Automatic cleanup after 500ms animation duration
- ✅ Proper cleanup on component unmount

## Usage

### Basic Usage

```typescript
import { useEdgeTraversal } from '@/hooks/useEdgeTraversal';

function WorkflowCanvas({ canvasId }: { canvasId: string }) {
  const traversingEdges = useEdgeTraversal(canvasId);
  
  // Use the traversing state in your edges
  const edges = useMemo(() => 
    baseEdges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isTraversing: traversingEdges.get(edge.id) || false
      }
    })),
    [baseEdges, traversingEdges]
  );
  
  return <ReactFlow edges={edges} />;
}
```

### With BMC Canvas

```typescript
import { useEdgeTraversal } from '@/hooks/useEdgeTraversal';

function BMCCanvas({ canvasId }: { canvasId: string }) {
  const traversingEdges = useEdgeTraversal(canvasId);
  
  const edges = useMemo(() => 
    baseEdges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isTraversing: traversingEdges.get(edge.id) || false
      }
    })),
    [baseEdges, traversingEdges]
  );
  
  return <ReactFlow edges={edges} />;
}
```

## API

### Parameters

- `canvasId: string | undefined` - The canvas ID to track edge traversals for. If undefined, the hook will not subscribe.

### Returns

- `Map<string, boolean>` - A Map where:
  - **Key**: Edge ID (string)
  - **Value**: `true` if the edge is currently being traversed, `false` or `undefined` otherwise

## How It Works

1. **Subscription**: The hook subscribes to the `stitch_journey_events` table filtered by the provided `canvasId`.

2. **Event Processing**: When an `edge_start` event is received:
   - The edge is marked as traversing (`isTraversing = true`)
   - A unique traversal ID is generated for this specific traversal
   - A timeout is set to clear the traversing state after 500ms

3. **Multiple Traversals**: If multiple entities traverse the same edge:
   - Each traversal gets its own unique ID and timeout
   - The edge remains in the traversing state until ALL traversals complete
   - This prevents visual glitches when multiple entities move simultaneously

4. **Cleanup**: When the component unmounts or the canvas ID changes:
   - All timeouts are cleared
   - The subscription is unsubscribed
   - State is reset

## Animation Duration

The hook uses a **500ms** animation duration to match the entity movement animation. This ensures that edge pulses and entity movements are synchronized.

## Requirements Satisfied

- **Requirement 1.4**: Multiple entities can traverse the same edge without visual interference
- **Requirement 1.5**: Edges display default state when not being traversed

## Properties Validated

- **Property 1**: Edge traversal animation trigger
- **Property 2**: Edge traversal animation duration (500ms)
- **Property 3**: Multiple traversal independence
- **Property 4**: Edge default state

## Performance Considerations

- Uses `useRef` to track internal state without causing re-renders
- Properly cleans up timeouts to prevent memory leaks
- Efficient Map-based state management
- Minimal re-renders (only when traversing state changes)

## Integration with JourneyEdge Component

The `JourneyEdge` component (Task 10) is already set up to receive the `isTraversing` prop:

```typescript
interface JourneyEdgeData {
  // ... other fields
  isTraversing?: boolean;
}

function JourneyEdge({ data }: EdgeProps<JourneyEdgeData>) {
  // Renders pulse animation when isTraversing is true
}
```

## Next Steps

After implementing this hook, complete:
- **Task 12**: Wire `useEdgeTraversal` into BMCCanvas and WorkflowCanvas
- **Task 13**: Synchronize edge and entity animations

## Example: Complete Integration

```typescript
import { useMemo } from 'react';
import { useEdgeTraversal } from '@/hooks/useEdgeTraversal';
import { ReactFlow } from '@xyflow/react';

function WorkflowCanvas({ canvasId }: { canvasId: string }) {
  const { nodes, edges: baseEdges } = useReactFlow();
  const traversingEdges = useEdgeTraversal(canvasId);
  
  // Enhance edges with traversing state
  const edges = useMemo(() => 
    baseEdges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isTraversing: traversingEdges.get(edge.id) || false
      }
    })),
    [baseEdges, traversingEdges]
  );
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      edgeTypes={{ journey: JourneyEdge }}
    />
  );
}
```

## Troubleshooting

### Edge not pulsing

1. Verify that `edge_start` events are being created in the database
2. Check that the `canvas_id` filter matches your canvas
3. Ensure the `JourneyEdge` component is receiving the `isTraversing` prop
4. Verify the edge ID in the event matches the edge ID in your graph

### Multiple traversals not working

1. Check that each journey event has a unique `id` field
2. Verify that timeouts are not being cleared prematurely
3. Ensure the component is not unmounting during traversal

### Memory leaks

1. Verify that the cleanup function is running on unmount
2. Check that all timeouts are being cleared
3. Ensure the subscription is being unsubscribed

## Related Files

- `src/components/canvas/edges/JourneyEdge.tsx` - Edge component with animation
- `src/types/journey-event.ts` - Journey event type definitions
- `src/hooks/useRealtimeSubscription.ts` - Base real-time subscription hook
- `src/lib/supabase/client.ts` - Supabase client configuration
