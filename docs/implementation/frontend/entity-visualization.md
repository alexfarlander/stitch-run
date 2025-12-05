# Entity Visualization

## Overview

Entity visualization is a core feature of Stitch that brings the "Living Business Model Canvas" concept to life. Entities (leads, customers, churned users) are rendered as animated dots that travel across the canvas in real-time, providing visual feedback on customer journeys through workflows.

This document covers the components, hooks, and patterns used to implement entity tracking, positioning, and animation.

## Architecture

### Component Hierarchy

```
EntityOverlay (Container)
├── EntityDot (Visual Representation)
│   ├── Avatar/Initial
│   ├── Glow Effect
│   ├── Pulse Animation (when moving)
│   └── Name Label (on hover)
└── EntityDetailPanel (Side Panel)
    ├── Entity Information
    ├── Journey History
    └── Movement Controls
```

### Data Flow

```
Database (stitch_entities)
    ↓
useEntities Hook (fetch & subscribe)
    ↓
useEntityPositions Hook (calculate positions)
    ↓
EntityOverlay (render dots)
    ↓
EntityDot (animate & display)
```

## Core Components

### EntityOverlay

**Location:** `src/components/canvas/entities/EntityOverlay.tsx`

The `EntityOverlay` component is the container that manages all entity dots on a canvas. It handles:
- Fetching entities for the current canvas
- Calculating screen positions for each entity
- Rendering entity dots with proper positioning
- Managing entity selection state
- Displaying the entity detail panel

**Key Features:**
- **Optimized Rendering:** Uses `useEntityPositions` hook with per-entity memoization to avoid unnecessary recalculations
- **Pointer Events:** Positioned absolutely with `pointer-events-none` on container, but `pointer-events-auto` on individual dots
- **Selection State:** Tracks selected entity ID and highlights the corresponding dot
- **Real-time Updates:** Automatically updates when entities move via database subscriptions

**Props:**
```typescript
interface Props {
  canvasId: string;  // The canvas to display entities for
}
```

**Usage Example:**
```tsx
<ReactFlowProvider>
  <ReactFlow nodes={nodes} edges={edges}>
    <EntityOverlay canvasId={canvasId} />
  </ReactFlow>
</ReactFlowProvider>
```

**Implementation Details:**

1. **Entity Fetching:**
   ```typescript
   const { entities, isLoading } = useEntities(canvasId);
   ```
   Uses the `useEntities` hook to fetch and subscribe to entity updates.

2. **Position Calculation:**
   ```typescript
   const entityPositions = useEntityPositions(entities || []);
   ```
   Calculates screen positions for all entities using optimized memoization.

3. **Rendering:**
   ```typescript
   entitiesWithPositions.map(({ entity, screenPos }) => (
     <EntityDot
       entity={entity}
       position={screenPos}
       isSelected={entity.id === selectedEntityId}
       onClick={() => setSelectedEntityId(entity.id)}
     />
   ))
   ```

### EntityDot

**Location:** `src/components/canvas/entities/EntityDot.tsx`

The `EntityDot` component renders a single entity as an animated dot on the canvas. It provides:
- Visual representation with avatar or initial
- Color-coded glow based on entity type
- Smooth position animations using Framer Motion
- Pulse effect when entity is moving
- Hover label showing entity name
- Selection highlighting

**Props:**
```typescript
interface EntityDotProps {
  entity: StitchEntity;           // Entity data
  position: { x: number; y: number };  // Screen coordinates
  isSelected: boolean;            // Whether this entity is selected
  onClick: () => void;            // Click handler
}
```

**Visual Design:**

1. **Size:** 28px × 28px (7 in Tailwind units)
2. **Colors by Entity Type:**
   - Lead: `#06b6d4` (cyan)
   - Customer: `#10b981` (green)
   - Churned: `#ef4444` (red, 60% opacity)

3. **Glow Effect:**
   - Box shadow with entity type color
   - Stronger glow when selected (20px vs 12px)
   - Pulse animation when moving

4. **Avatar Display:**
   - Shows `avatar_url` image if available
   - Falls back to first letter of name in uppercase
   - Circular with border matching entity type color

**Animation Behavior:**

1. **Position Animation:**
   ```typescript
   animate={{
     left: position.x,
     top: position.y,
   }}
   transition={{
     duration: isMoving ? 2 : 0.5,
     ease: isMoving ? 'linear' : 'easeInOut',
   }}
   ```
   - **Moving (on edge):** 2 seconds, linear easing
   - **Jumping (node to node):** 0.5 seconds, easeInOut

2. **Pulse Animation (when moving):**
   ```typescript
   animate={{
     scale: [1, 1.3, 1],
     opacity: [0.6, 0.3, 0.6],
   }}
   transition={{
     duration: 1.5,
     repeat: Infinity,
     ease: 'easeInOut',
   }}
   ```
   Creates a pulsing glow effect that repeats infinitely while entity travels.

**Interaction:**
- **Click:** Selects the entity and opens detail panel
- **Hover:** Shows name label below the dot
- **Scale:** Slightly larger when selected (1.15x) or hovered (1.1x)

## Position Calculation

### Overview

Entity position calculation is a critical performance optimization in Stitch. The system must:
1. Calculate canvas positions for entities (at nodes or on edges)
2. Handle parent node hierarchies (for nested workflows)
3. Transform canvas coordinates to screen coordinates
4. Recalculate only when necessary (not on every render)

### useEntityPosition Hook

**Location:** `src/hooks/useEntityPosition.ts`

Calculates position for a single entity with precise dependency tracking.

**Key Optimizations:**
1. **Separate Canvas and Screen Calculations:** Canvas position only recalculates when entity moves, screen position only recalculates when viewport changes
2. **Memoization:** Uses `useMemo` with precise dependencies
3. **Clustering:** Entities at the same node are spread horizontally

**Position Logic:**

1. **Entity at Node:**
   ```typescript
   if (entity.current_node_id) {
     const node = getNode(entity.current_node_id);
     const entitiesAtNode = entities.filter(e => 
       e.current_node_id === entity.current_node_id
     );
     const index = entitiesAtNode.findIndex(e => e.id === entity.id);
     
     return getEntityNodePosition(node, index, entitiesAtNode.length, nodes);
   }
   ```
   - Positions entity below the node
   - Spreads multiple entities horizontally (35px spacing)
   - Centers the cluster under the node

2. **Entity on Edge:**
   ```typescript
   if (entity.current_edge_id && entity.edge_progress !== undefined) {
     const edge = edges.find(e => e.id === entity.current_edge_id);
     const sourceNode = getNode(edge.source);
     const targetNode = getNode(edge.target);
     
     return getEntityEdgePosition(
       edge, sourceNode, targetNode, entity.edge_progress, nodes
     );
   }
   ```
   - Uses `edge_progress` (0.0 to 1.0) to interpolate position
   - Tries to use actual SVG path for curved edges
   - Falls back to linear interpolation if path unavailable

### useEntityPositions Hook

**Location:** `src/hooks/useEntityPosition.ts`

Optimized version for calculating positions of multiple entities at once.

**Benefits:**
- Single pass through all entities
- Shared node/edge lookups
- Returns `Map<string, Position>` for O(1) lookup
- Only recalculates changed entities

**Usage:**
```typescript
const entityPositions = useEntityPositions(entities);
const position = entityPositions.get(entityId);
```

### Position Calculation Functions

**Location:** `src/lib/entities/position.ts`

#### getEntityNodePosition

Calculates canvas position for entity at a node.

**Parameters:**
- `node`: The node entity is at
- `entityIndex`: Index of this entity in the cluster
- `totalEntitiesAtNode`: Total entities at this node
- `nodes`: All nodes (for parent position calculation)

**Algorithm:**
1. Calculate absolute node position by summing parent positions
2. Find node center: `x + width/2, y + height`
3. Spread entities horizontally: `spacing = 35px`
4. Center cluster: `startX = centerX - totalWidth/2`
5. Position entity: `x = startX + index * spacing - 14` (offset for 28px dot)

#### getEntityEdgePosition

Calculates canvas position for entity traveling on edge.

**Parameters:**
- `edge`: The edge entity is traveling on
- `sourceNode`: Source node of edge
- `targetNode`: Target node of edge
- `progress`: Travel progress (0.0 to 1.0)
- `nodes`: All nodes (for parent position calculation)

**Algorithm:**
1. Try to get actual SVG path element
2. If path exists: Use `getPointAtLength(progress * totalLength)`
3. If path unavailable: Linear interpolation between source and target centers
4. Offset by -14 to center the 28px dot

**SVG Path Interpolation:**
```typescript
const pathElement = document.querySelector(`[data-id="${edgeId}"] path.react-flow__edge-path`);
const totalLength = pathElement.getTotalLength();
const point = pathElement.getPointAtLength(totalLength * progress);
return { x: point.x - 14, y: point.y - 14 };
```

**Linear Fallback:**
```typescript
const sourcePos = { x: sourceX + width/2, y: sourceY + height };
const targetPos = { x: targetX + width/2, y: targetY };
return {
  x: sourcePos.x + (targetPos.x - sourcePos.x) * progress - 14,
  y: sourcePos.y + (targetPos.y - sourcePos.y) * progress - 14
};
```

### Parent Node Handling

**Critical:** React Flow positions child nodes relative to their parent when using `extent: 'parent'`. To get absolute canvas coordinates, we must recursively sum all ancestor positions:

```typescript
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
```

This ensures entities are positioned correctly even in deeply nested workflows.

## Journey Animations

### Animation States

Entities have three animation states:

1. **At Node (Idle):**
   - Static position below node
   - Clustered with other entities
   - Gentle hover effect
   - No pulse animation

2. **Traveling on Edge:**
   - Smooth linear movement along edge path
   - 2-second duration
   - Pulse glow effect
   - `current_edge_id` set, `edge_progress` updating

3. **Jumping Between Nodes:**
   - Quick transition (0.5 seconds)
   - EaseInOut easing
   - No pulse effect
   - Used for manual moves or instant transitions

### Animation Triggers

**Database-Driven:** All animations are triggered by database updates, following the "Database as Source of Truth" principle.

1. **Start Travel:**
   ```typescript
   // Workflow completes, entity starts traveling
   await supabase
     .from('stitch_entities')
     .update({
       current_node_id: null,
       current_edge_id: edgeId,
       edge_progress: 0,
       destination_node_id: targetNodeId,
     })
     .eq('id', entityId);
   ```

2. **Update Progress:**
   ```typescript
   // Progress updates during travel (optional, for long journeys)
   await supabase
     .from('stitch_entities')
     .update({ edge_progress: 0.5 })
     .eq('id', entityId);
   ```

3. **Arrive at Node:**
   ```typescript
   // Entity reaches destination
   await supabase
     .from('stitch_entities')
     .update({
       current_node_id: targetNodeId,
       current_edge_id: null,
       edge_progress: null,
       destination_node_id: null,
     })
     .eq('id', entityId);
   ```

### Real-time Subscriptions

**Location:** `src/hooks/useEntities.ts`

The `useEntities` hook subscribes to entity updates:

```typescript
const subscription = supabase
  .channel(`entities:${canvasId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'stitch_entities',
      filter: `canvas_id=eq.${canvasId}`,
    },
    (payload) => {
      // Update local state
      // Triggers re-render with new positions
    }
  )
  .subscribe();
```

When an entity's position changes in the database:
1. Subscription fires with new entity data
2. `useEntities` updates local state
3. `useEntityPositions` recalculates affected positions
4. `EntityDot` animates to new position via Framer Motion

### Journey Edge Visualization

**Location:** `src/components/canvas/edges/JourneyEdge.tsx`

Journey edges provide visual feedback for entity travel paths:

**Features:**
- **Glow Effect:** Cyan glow with intensity based on usage
- **Animated Dashes:** Moving dashes show direction of flow
- **Hover Stats:** Shows total traveled count and conversion rate
- **Color Coding:** Matches entity type colors

**Animation:**
```css
@keyframes flowAnimation {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}
.journey-edge-animated {
  animation: flowAnimation 1s linear infinite;
}
```

**Data Structure:**
```typescript
interface JourneyEdgeData {
  intensity?: number;  // 0.0 to 1.0, affects glow strength
  label?: string;      // Edge label
  stats?: {
    totalTraveled?: number;     // Count of entities that traveled this edge
    conversionRate?: number;    // Percentage that converted
  };
}
```

## Entity Types and Visual Coding

### Entity Type Definitions

**Location:** `src/types/entity.ts`

```typescript
export type EntityType = 'lead' | 'customer' | 'churned';

export interface StitchEntity {
  id: string;
  canvas_id: string;
  
  // Identity
  name: string;
  email?: string;
  avatar_url?: string;
  entity_type: EntityType;
  
  // Position
  current_node_id?: string;
  current_edge_id?: string;
  edge_progress?: number;        // 0.0 to 1.0
  destination_node_id?: string;
  
  // Journey
  journey: JourneyEvent[];
  metadata: EntityMetadata;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
```

### Visual Coding System

| Entity Type | Color | Hex | Opacity | Meaning |
|------------|-------|-----|---------|---------|
| Lead | Cyan | `#06b6d4` | 100% | Potential customer, not yet converted |
| Customer | Green | `#10b981` | 100% | Converted, active customer |
| Churned | Red | `#ef4444` | 60% | Former customer, no longer active |

**Color Application:**
- Border color of entity dot
- Glow/shadow color
- Pulse animation color (when moving)

**Opacity Rules:**
- Active entities (lead, customer): 100% opacity
- Churned entities: 60% opacity (visually de-emphasized)

### Journey Events

**Location:** `src/types/journey-event.ts`

Journey events track entity movement history:

```typescript
export type DatabaseJourneyEvent = {
  source: 'database';
  id: string;
  entity_id: string;
  event_type: 'node_arrival' | 'edge_start' | 'edge_progress' | 'node_complete' | 'manual_move';
  node_id: string | null;
  edge_id: string | null;
  progress: number | null;
  timestamp: string;
  metadata: Record<string, any>;
};
```

**Event Types:**
- `node_arrival`: Entity arrived at a node
- `edge_start`: Entity started traveling on an edge
- `edge_progress`: Progress update during travel (optional)
- `node_complete`: Node workflow completed for entity
- `manual_move`: Entity manually moved by user

## Performance Optimizations

### 1. Memoization Strategy

**Problem:** Recalculating positions for all entities on every render is expensive.

**Solution:** Multi-level memoization:
- Canvas positions: Only recalculate when entity moves
- Screen positions: Only recalculate when viewport changes
- Per-entity: Only recalculate affected entities

```typescript
// Canvas position - depends on entity position data
const canvasPosition = useMemo(() => {
  // Calculate position
}, [entity.current_node_id, entity.current_edge_id, entity.edge_progress]);

// Screen position - depends on canvas position and viewport
const screenPosition = useMemo(() => {
  return {
    x: canvasPosition.x * viewport.zoom + viewport.x,
    y: canvasPosition.y * viewport.zoom + viewport.y,
  };
}, [canvasPosition, viewport.zoom, viewport.x, viewport.y]);
```

### 2. Batch Position Calculation

**Problem:** Calculating positions one-by-one causes redundant node/edge lookups.

**Solution:** `useEntityPositions` hook calculates all positions in a single pass:

```typescript
const positions = useMemo(() => {
  const positionsMap = new Map<string, Position>();
  const nodes = getNodes();
  const edges = getEdges();
  
  for (const entity of entities) {
    // Calculate position using shared nodes/edges
    const pos = calculatePosition(entity, nodes, edges);
    positionsMap.set(entity.id, pos);
  }
  
  return positionsMap;
}, [entities, viewport]);
```

### 3. Pointer Events Optimization

**Problem:** Overlay covers entire canvas, blocking interactions.

**Solution:** Layered pointer events:
```tsx
<div className="absolute inset-0 pointer-events-none">
  {entities.map(entity => (
    <div className="pointer-events-auto">
      <EntityDot ... />
    </div>
  ))}
</div>
```

Container has `pointer-events-none`, individual dots have `pointer-events-auto`.

### 4. SVG Path Caching

**Problem:** Querying DOM for SVG paths on every position calculation is slow.

**Solution:** Cache path elements and use `getTotalLength()` / `getPointAtLength()`:

```typescript
const pathElement = getEdgePathElement(edgeId);
if (pathElement) {
  const totalLength = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(totalLength * progress);
  return { x: point.x - 14, y: point.y - 14 };
}
```

### 5. Dependency Serialization

**Problem:** `useMemo` dependencies on arrays/objects cause unnecessary recalculations.

**Solution:** Serialize entity position data into string for stable comparison:

```typescript
const positions = useMemo(() => {
  // Calculate positions
}, [
  entities.map(e => 
    `${e.id}:${e.current_node_id}:${e.current_edge_id}:${e.edge_progress}`
  ).join(','),
  viewport.zoom,
  viewport.x,
  viewport.y,
]);
```

## Integration Patterns

### Adding Entity Visualization to a Canvas

1. **Wrap canvas in ReactFlowProvider:**
   ```tsx
   <ReactFlowProvider>
     <ReactFlow nodes={nodes} edges={edges}>
       <EntityOverlay canvasId={canvasId} />
     </ReactFlow>
   </ReactFlowProvider>
   ```

2. **Ensure canvas has entity support:**
   - Canvas must have `id` field
   - Entities must have `canvas_id` matching canvas
   - Database subscriptions must be enabled

3. **Configure edge types (optional):**
   ```tsx
   const edgeTypes = {
     journey: JourneyEdge,
   };
   
   <ReactFlow edgeTypes={edgeTypes} ... />
   ```

### Creating Entities

Entities are typically created by:
1. **Webhook Integration:** External events create entities
2. **Manual Creation:** User adds entity via UI
3. **Workflow Triggers:** Workflow creates entities programmatically

**Example:**
```typescript
const { data: entity } = await supabase
  .from('stitch_entities')
  .insert({
    canvas_id: canvasId,
    name: 'Monica',
    email: 'monica@example.com',
    entity_type: 'lead',
    current_node_id: startNodeId,
    journey: [{
      type: 'entered_node',
      node_id: startNodeId,
      timestamp: new Date().toISOString(),
    }],
    metadata: {
      source: 'linkedin',
      campaign: 'summer-2024',
    },
  })
  .select()
  .single();
```

### Moving Entities

**Location:** `src/lib/entities/travel.ts`

Use the travel functions to move entities:

```typescript
// Start entity traveling on an edge
await startEntityTravel(entityId, edgeId, destinationNodeId);

// Entity arrives at destination (called automatically after animation)
await arriveAtNode(entityId, nodeId);
```

**Manual Movement:**
```typescript
// Jump entity directly to a node (no animation)
await supabase
  .from('stitch_entities')
  .update({
    current_node_id: targetNodeId,
    current_edge_id: null,
    edge_progress: null,
  })
  .eq('id', entityId);
```

## Common Patterns

### Pattern 1: Entity Clustering at Nodes

When multiple entities are at the same node, they cluster horizontally below the node:

```
        [Node]
    ●   ●   ●   ●   ●
   E1  E2  E3  E4  E5
```

**Spacing:** 35px between entity centers
**Centering:** Cluster is centered under node

### Pattern 2: Edge Travel Animation

Entity travels from source node to target node over 2 seconds:

```
[Source] ----●----> [Target]
         (moving)
```

**Progress:** `edge_progress` field (0.0 to 1.0)
**Path:** Follows actual SVG path (curved edges supported)
**Visual:** Pulse glow effect during travel

### Pattern 3: Entity Type Transitions

Entities can transition between types (e.g., lead → customer):

```typescript
// Convert lead to customer
await supabase
  .from('stitch_entities')
  .update({
    entity_type: 'customer',
    journey: [
      ...entity.journey,
      {
        type: 'converted',
        timestamp: new Date().toISOString(),
        note: 'Completed purchase',
      },
    ],
  })
  .eq('id', entityId);
```

Color and opacity automatically update based on new type.

### Pattern 4: Journey History Display

Display entity journey in detail panel:

```tsx
{entity.journey.map((event, i) => (
  <div key={i} className="journey-event">
    <span className="timestamp">{formatTime(event.timestamp)}</span>
    <span className="event-type">{event.type}</span>
    {event.node_id && <span className="node">Node: {event.node_id}</span>}
  </div>
))}
```

## Troubleshooting

### Entities Not Appearing

**Check:**
1. Canvas ID matches entity `canvas_id`
2. Entity has `current_node_id` or `current_edge_id` set
3. Node/edge exists in canvas
4. `useEntities` hook is fetching data (check loading state)
5. Position calculation returns valid coordinates

**Debug:**
```typescript
console.log('Entities:', entities);
console.log('Positions:', entityPositions);
console.log('Nodes:', getNodes());
```

### Entities Not Animating

**Check:**
1. Framer Motion is installed and imported
2. Entity position is changing in database
3. Real-time subscription is active
4. `edge_progress` is updating for edge travel
5. Browser supports CSS animations

**Debug:**
```typescript
// Log entity updates
useEffect(() => {
  console.log('Entity updated:', entity);
}, [entity.current_node_id, entity.current_edge_id, entity.edge_progress]);
```

### Position Calculation Errors

**Check:**
1. Parent node positions are being summed correctly
2. Node width/height are defined
3. SVG path element exists for edge travel
4. Viewport transform is applied correctly

**Debug:**
```typescript
const canvasPos = getEntityNodePosition(node, index, total, nodes);
console.log('Canvas position:', canvasPos);

const screenPos = {
  x: canvasPos.x * viewport.zoom + viewport.x,
  y: canvasPos.y * viewport.zoom + viewport.y,
};
console.log('Screen position:', screenPos);
```

### Performance Issues

**Check:**
1. Number of entities (>100 may need virtualization)
2. Memoization dependencies are correct
3. Position calculations aren't running on every render
4. Real-time subscriptions aren't creating memory leaks

**Optimize:**
- Use `useEntityPositions` instead of individual `useEntityPosition`
- Limit journey event history length
- Debounce viewport changes
- Consider virtualization for large entity counts

## Related Documentation

- [Architecture Overview](../architecture/overview.md) - System architecture
- [Execution Model](../architecture/execution-model.md) - Edge-walking execution
- [Database Layer](../backend/database-layer.md) - Entity storage
- [Webhook System](../backend/webhook-system.md) - Entity creation from webhooks
- [Entity Movement Diagram](../diagrams/entity-movement.mmd) - Visual flow diagram

## Future Enhancements

### Planned Features

1. **Entity Trails:** Show path history as fading trail
2. **Batch Movement:** Move multiple entities simultaneously
3. **Entity Grouping:** Group related entities visually
4. **Custom Animations:** Per-entity-type animation styles
5. **Entity Filters:** Show/hide entities by type or metadata
6. **Performance Mode:** Simplified rendering for 100+ entities
7. **Entity Interactions:** Drag-and-drop entity movement
8. **Journey Replay:** Replay entity journey from history

### Known Limitations

1. **Scale:** Performance degrades with >100 entities
2. **Nested Workflows:** Deep nesting (>3 levels) may have position calculation issues
3. **Edge Cases:** Some curved edge paths may not interpolate perfectly
4. **Mobile:** Touch interactions need improvement
5. **Accessibility:** Screen reader support for entity visualization is limited
