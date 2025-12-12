# Entity Tracking: Real-time Position & Journey Analytics

## Overview

The Entity Tracking System enables real-time visualization of individual entities (customers, leads) as they move through Stitch workflows. It provides granular position tracking, complete journey history, and visual feedback on the canvas.

## Key Capabilities

1. **Granular Position Tracking**: Track entities at nodes or along edges with normalized progress (0.0-1.0)
2. **Journey History**: Record every movement event with timestamps
3. **Real-time Visualization**: Render entity dots on canvas with live updates
4. **Edge Statistics**: Aggregate traffic and conversion metrics
5. **Programmatic Control**: API for starting journeys, moving entities, handling arrivals

## Position State Machine

Entities transition through three position states:

```
┌─────────────┐
│Unpositioned │
│ (no position)│
└──────┬──────┘
       │ arriveAtNode()
       ↓
┌─────────────┐
│  At Node    │
│current_node │
└──────┬──────┘
       │ startJourney()
       ↓
┌─────────────┐
│  On Edge    │
│current_edge │
│edge_progress│
└──────┬──────┘
       │ moveAlongEdge() (updates progress)
       │ arriveAtNode() (moves to next node)
       ↓
    (cycle continues)
```

### State Constraints

**Database enforces mutual exclusivity**:
```sql
CONSTRAINT check_position_exclusivity CHECK (
  (current_node_id IS NOT NULL AND current_edge_id IS NULL AND edge_progress IS NULL) OR
  (current_node_id IS NULL AND current_edge_id IS NOT NULL AND edge_progress IS NOT NULL) OR
  (current_node_id IS NULL AND current_edge_id IS NULL AND edge_progress IS NULL)
)
```

## Entity Movement API

### startJourney()

Begins an entity's journey on an edge.

```typescript
export async function startJourney(
  entityId: string,
  edgeId: string
): Promise<StitchEntity>
```

**Implementation**:
```typescript
// Uses atomic RPC function
const { data, error } = await supabase.rpc('start_journey', {
  p_entity_id: entityId,
  p_edge_id: edgeId
});

// RPC function:
// 1. Sets current_edge_id = edgeId
// 2. Sets edge_progress = 0.0
// 3. Clears current_node_id
// 4. Creates journey event (type: 'edge_start')
// 5. Returns updated entity
```

**Usage Example**:
```typescript
// When node completes, start entity journey on outbound edge
const entity = await startJourney(
  'entity-uuid',
  'edge-from-node-1-to-node-2'
);

console.log(entity.current_edge_id); // 'edge-from-node-1-to-node-2'
console.log(entity.edge_progress);   // 0.0
```

### moveAlongEdge()

Updates entity's progress along an edge.

```typescript
export async function moveAlongEdge(
  entityId: string,
  progress: number  // 0.0 to 1.0
): Promise<StitchEntity>
```

**Implementation**:
```typescript
// Validate progress range
if (progress < 0.0 || progress > 1.0) {
  throw new Error(`Progress must be between 0.0 and 1.0, got: ${progress}`);
}

// Validate entity is on an edge
const entity = await getEntity(entityId);
if (!entity.current_edge_id) {
  throw new Error('Entity is not on an edge');
}

// Update progress
const { data } = await supabase
  .from('stitch_entities')
  .update({ edge_progress: progress })
  .eq('id', entityId)
  .select()
  .single();
```

**Usage Example**:
```typescript
// Animate entity movement
for (let p = 0.0; p <= 1.0; p += 0.1) {
  await moveAlongEdge('entity-uuid', p);
  await sleep(100); // Smooth animation
}
```

### arriveAtNode()

Moves entity to a node (arrival).

```typescript
export async function arriveAtNode(
  entityId: string,
  nodeId: string
): Promise<StitchEntity>
```

**Implementation**:
```typescript
// Uses atomic RPC function
const { data, error } = await supabase.rpc('arrive_at_node', {
  p_entity_id: entityId,
  p_node_id: nodeId
});

// RPC function:
// 1. Sets current_node_id = nodeId
// 2. Clears current_edge_id and edge_progress
// 3. Creates journey event (type: 'node_arrival')
// 4. Returns updated entity
```

**Usage Example**:
```typescript
// When worker completes, move entity to next node
const entity = await arriveAtNode(
  'entity-uuid',
  'node-2'
);

console.log(entity.current_node_id); // 'node-2'
console.log(entity.current_edge_id); // null
```

### moveEntityToSection()

Moves entity to a target section (for worker entity movement).

```typescript
export async function moveEntityToSection(
  entityId: string,
  targetSectionId: string,
  completeAs: 'success' | 'failure' | 'neutral',
  metadata?: Record<string, any>,
  setEntityType?: 'customer' | 'churned' | 'lead'
): Promise<StitchEntity>
```

**Implementation**:
```typescript
// Build update payload
const updatePayload: any = {
  current_node_id: targetSectionId,
  current_edge_id: null,
  edge_progress: null,
};

// Optional: Convert entity type (e.g., lead → customer)
if (setEntityType) {
  updatePayload.entity_type = setEntityType;
}

// Update entity
const { data } = await supabase
  .from('stitch_entities')
  .update(updatePayload)
  .eq('id', entityId)
  .select()
  .single();

// Create journey event
await createJourneyEvent(
  entityId,
  'node_arrival',
  targetSectionId,
  null,
  null,
  {
    ...metadata,
    completion_status: completeAs,
    movement_type: 'worker_entity_movement',
    entity_type_changed: setEntityType ? { to: setEntityType } : undefined,
  }
);
```

**Usage Example**:
```typescript
// Worker completes successfully, move entity to "Customers" section
await moveEntityToSection(
  'entity-uuid',
  'customers-section',
  'success',
  { worker: 'payment-processor' },
  'customer' // Convert from 'lead' to 'customer'
);
```

## Journey Events

### Event Types

```typescript
type JourneyEventType = 
  | 'edge_start'      // Entity begins traveling on edge
  | 'edge_progress'   // Entity moves along edge (milestone)
  | 'node_arrival'    // Entity arrives at node
  | 'node_complete'   // Entity completes processing at node
  | 'manual_move';    // Entity manually moved by operator
```

### Creating Journey Events

```typescript
export async function createJourneyEvent(
  entityId: string,
  eventType: JourneyEventType,
  nodeId?: string | null,
  edgeId?: string | null,
  progress?: number | null,
  metadata?: Record<string, any>
): Promise<JourneyEvent>
```

**Example**:
```typescript
// Record entity completing a node
await createJourneyEvent(
  'entity-uuid',
  'node_complete',
  'payment-node',
  null,
  null,
  {
    duration_ms: 1500,
    result: 'success',
    amount: 99.99
  }
);
```

### Querying Journey History

```typescript
export async function getJourneyHistory(
  entityId: string
): Promise<JourneyEvent[]>
```

**Example**:
```typescript
const history = await getJourneyHistory('entity-uuid');

// Returns chronologically ordered events:
// [
//   { event_type: 'edge_start', edge_id: 'edge-1', timestamp: '...' },
//   { event_type: 'node_arrival', node_id: 'node-1', timestamp: '...' },
//   { event_type: 'node_complete', node_id: 'node-1', timestamp: '...' },
//   { event_type: 'edge_start', edge_id: 'edge-2', timestamp: '...' },
//   ...
// ]
```

## Visual Rendering

### EntityDot Component

Renders a single entity as a colored dot on the canvas.

```typescript
interface EntityDotProps {
  entity: StitchEntity;
  position: { x: number; y: number };  // Screen coordinates
  color: string;                        // Based on entity_type
  size?: number;                        // Diameter in pixels
  onClick?: (entity: StitchEntity) => void;
}

export function EntityDot({ entity, position, color, size = 12 }: EntityDotProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        zIndex: 1000,
      }}
      title={entity.name}
    />
  );
}
```

### EntityOverlay Component

Renders all entities for a run as an overlay on the canvas.

```typescript
interface EntityOverlayProps {
  runId: string;
  flowId: string;
  entities: StitchEntity[];
  nodes: StitchNode[];
  edges: StitchEdge[];
}

export function EntityOverlay({ entities, nodes, edges }: EntityOverlayProps) {
  const { project } = useReactFlow(); // React Flow hook for coordinate transformation
  
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {entities.map(entity => {
        const position = calculateEntityPosition(entity, nodes, edges, project);
        const color = getEntityColor(entity.entity_type);
        
        return (
          <EntityDot
            key={entity.id}
            entity={entity}
            position={position}
            color={color}
          />
        );
      })}
    </div>
  );
}
```

### Coordinate Transformation

Entities must follow the actual Bezier curve path rendered by React Flow:

```typescript
function calculateEntityPosition(
  entity: StitchEntity,
  nodes: StitchNode[],
  edges: StitchEdge[],
  project: (pos: { x: number; y: number }) => { x: number; y: number }
): { x: number; y: number } {
  // Entity at node
  if (entity.current_node_id) {
    const node = nodes.find(n => n.id === entity.current_node_id);
    if (!node) return { x: 0, y: 0 };
    
    // Transform flow coordinates to screen coordinates
    return project(node.position);
  }
  
  // Entity on edge
  if (entity.current_edge_id && entity.edge_progress !== null) {
    // Access the SVG path element for the edge
    const pathElement = document.querySelector(
      `[data-id="${entity.current_edge_id}"] path`
    ) as SVGPathElement;
    
    if (!pathElement) return { x: 0, y: 0 };
    
    // Calculate position along the Bezier curve
    const totalLength = pathElement.getTotalLength();
    const point = pathElement.getPointAtLength(totalLength * entity.edge_progress);
    
    return { x: point.x, y: point.y };
  }
  
  return { x: 0, y: 0 };
}
```

**Critical**: Do NOT use linear interpolation between source and target nodes. React Flow edges are Bezier curves, and entities must travel along the actual rendered path using SVG path methods.

### Entity Colors

```typescript
function getEntityColor(entityType: string): string {
  const colorMap: Record<string, string> = {
    'lead': '#3b82f6',      // Blue
    'customer': '#10b981',  // Green
    'churned': '#ef4444',   // Red
    'trial': '#f59e0b',     // Orange
    'vip': '#8b5cf6',       // Purple
  };
  
  return colorMap[entityType] || '#6b7280'; // Gray default
}
```

## Real-time Updates

### Supabase Realtime Subscription

```typescript
export function useEntityTracking(canvasId: string) {
  const [entities, setEntities] = useState<StitchEntity[]>([]);
  
  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to entity changes
    const channel = supabase
      .channel('entity-tracking')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stitch_entities',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEntities(prev => [...prev, payload.new as StitchEntity]);
          } else if (payload.eventType === 'UPDATE') {
            setEntities(prev =>
              prev.map(e => e.id === payload.new.id ? payload.new as StitchEntity : e)
            );
          } else if (payload.eventType === 'DELETE') {
            setEntities(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canvasId]);
  
  return entities;
}
```

## Edge Statistics

### Calculating Traffic and Conversion

```typescript
export async function getEdgeStatistics(
  edgeId: string
): Promise<JourneyEdgeData> {
  const supabase = getAdminClient();
  
  // Count entities currently on edge
  const { count: currentCount } = await supabase
    .from('stitch_entities')
    .select('*', { count: 'exact', head: true })
    .eq('current_edge_id', edgeId);
  
  // Count total entities that have traversed edge
  const { count: totalCount } = await supabase
    .from('stitch_journey_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'edge_start')
    .eq('edge_id', edgeId);
  
  // Calculate conversion rate
  // (entities that completed downstream node / entities that started edge)
  const { data: completions } = await supabase
    .from('stitch_journey_events')
    .select('entity_id')
    .eq('event_type', 'node_complete')
    .eq('node_id', targetNodeId); // Derived from edge
  
  const conversionRate = totalCount > 0
    ? (completions?.length || 0) / totalCount
    : null;
  
  return {
    edge_id: edgeId,
    current_entity_count: currentCount || 0,
    total_entity_count: totalCount || 0,
    conversion_rate: conversionRate,
    average_duration_ms: null, // TODO: Calculate from timestamps
  };
}
```

### Displaying Edge Stats

```typescript
interface EdgeStatsDisplayProps {
  edgeId: string;
  stats: JourneyEdgeData;
  position: { x: number; y: number };
}

export function EdgeStatsDisplay({ stats, position }: EdgeStatsDisplayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        background: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div>Current: {stats.current_entity_count}</div>
      <div>Total: {stats.total_entity_count}</div>
      {stats.conversion_rate !== null && (
        <div>Conversion: {(stats.conversion_rate * 100).toFixed(1)}%</div>
      )}
    </div>
  );
}
```

## Integration with Workflow Execution

### Entity Movement on Node Completion

```typescript
// In edge-walker.ts
export async function walkEdges(
  completedNodeId: string,
  flow: StitchFlow,
  run: StitchRun
): Promise<void> {
  // Handle entity movement if run has an entity
  if (run.entity_id) {
    const { handleNodeCompletion } = await import('./entity-movement');
    const nodeState = run.node_states[completedNodeId];
    
    await handleNodeCompletion(
      run,
      completedNodeId,
      nodeState?.output,
      true // success
    );
  }
  
  // Continue with normal edge-walking...
}
```

### Worker Node Entity Movement

```typescript
// Worker node data can specify entity movement
interface WorkerNodeData {
  webhookUrl: string;
  entityMovement?: {
    onSuccess?: {
      targetSectionId: string;
      completeAs: 'success' | 'failure' | 'neutral';
      setEntityType?: 'customer' | 'churned' | 'lead';
    };
    onFailure?: {
      targetSectionId: string;
      completeAs: 'success' | 'failure' | 'neutral';
    };
  };
}

// When worker completes
if (status === 'completed' && node.data.entityMovement?.onSuccess) {
  await moveEntityToSection(
    run.entity_id,
    node.data.entityMovement.onSuccess.targetSectionId,
    node.data.entityMovement.onSuccess.completeAs,
    { worker: node.id },
    node.data.entityMovement.onSuccess.setEntityType
  );
}
```

## Key Implementation Files

- `src/lib/db/entities.ts` - Entity database operations
- `src/lib/entities/position.ts` - Position calculation utilities
- `src/lib/entities/travel.ts` - Entity movement logic
- `src/stitch/engine/entity-movement.ts` - Workflow integration
- `src/components/canvas/entities/EntityDot.tsx` - Visual component
- `src/components/canvas/entities/EntityOverlay.tsx` - Canvas overlay
- `src/hooks/useCanvasEntities.ts` - React hook for entity tracking
- `src/lib/db/__tests__/entity-position.property.test.ts` - Property tests
