# Living Canvas Design Document

## Overview

The Living Canvas feature creates frontend visualizations for the existing backend entity tracking system. The backend already handles entity movement, journey tracking, and workflow execution. This feature focuses on making these backend capabilities visible through real-time animations and status indicators on the Business Model Canvas.

**Key Principle**: Entities travel only on the Business Model Canvas (BMC), not inside workflow nodes. Workers are backend information flows. The BMC is the top spine (UX layer) where entities are visible.

The system uses an "attachment" model where entities are always anchored to specific nodes (via `current_node_id`) or traveling on edges (via `current_edge_id` + `edge_progress`). All movements are animated, tracked, and recorded for analytics.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Visualization Layer               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Run Status   │  │ Entity Dots  │  │ Edge Travel  │     │
│  │ Indicators   │  │ Rendering    │  │ Animation    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Demo Mode    │  │ Cinematic    │  │ Journey      │     │
│  │ Controller   │  │ Speed        │  │ History UI   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Real-Time Sync Layer                       │
│              (Supabase Subscriptions)                        │
│         - stitch_entities (position changes)                 │
│         - stitch_run_nodes (status changes)                  │
│         - stitch_journey_events (movement events)            │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                 Existing Backend (Already Built)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Entity       │  │ Journey      │  │ Workflow     │     │
│  │ Movement     │  │ Tracking     │  │ Execution    │     │
│  │ (entities.ts)│  │ (travel.ts)  │  │ (engine/)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│    stitch_entities, stitch_journey_events, stitch_runs      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Backend Workflow Execution** → Updates `stitch_run_nodes` status
2. **Backend Entity Movement** → Updates `stitch_entities` position (node or edge)
3. **Database Change** → Triggers Supabase real-time event
4. **Frontend Subscription** → Receives event
5. **Frontend Animation** → Animates entity dot to new position
6. **Journey Events** → Already recorded by backend, displayed in UI


## Frontend Components

**Backend Capabilities (Already Built):**
- ✅ Entity movement: `src/lib/db/entities.ts` (startJourney, arriveAtNode, moveEntityToSection)
- ✅ Journey tracking: `src/lib/entities/travel.ts` (animateEntityTravel)
- ✅ **Board Game Position Logic**: `src/lib/entities/position.ts`
  - `getEntityNodePosition` - Entities "dock" at nodes (clustered below)
  - `getEntityEdgePosition` - Entities travel along edge paths (linear interpolation)
  - Entities are ALWAYS attached to nodes or edges, never free-floating
- ✅ Workflow execution: `src/lib/engine/` (edge-walker, handlers)

**What We Need to Build (Frontend Visualization):**

### 1. Real-Time Entity Renderer

Subscribes to `stitch_entities` and renders animated entity dots on the BMC.

```typescript
// Component: src/components/canvas/entities/EntityRenderer.tsx
function EntityRenderer({ canvasId }: { canvasId: string }) {
  const { entities } = useRealtimeEntities(canvasId);
  const { nodes, edges } = useReactFlow();
  const { getEffectiveDuration } = useCinematicSettings();
  
  return entities.map(entity => (
    <AnimatedEntityDot
      key={entity.id}
      entity={entity}
      nodes={nodes}
      edges={edges}
      duration={getEffectiveDuration(2000)}
    />
  ));
}

// Hook: src/hooks/useRealtimeEntities.ts
function useRealtimeEntities(canvasId: string) {
  const [entities, setEntities] = useState<StitchEntity[]>([]);
  
  useEffect(() => {
    // Initial fetch
    fetchEntities(canvasId).then(setEntities);
    
    // Subscribe to changes
    const subscription = supabase
      .channel(`entities:${canvasId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stitch_entities',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        // Update entities array with new/updated entity
        setEntities(prev => updateEntityInArray(prev, payload.new));
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [canvasId]);
  
  return { entities };
}
```

### 2. Run Status Overlay

Subscribes to `stitch_runs` and shows node status indicators on the BMC.

```typescript
// Component: src/components/canvas/RunStatusOverlay.tsx
function RunStatusOverlay({ runId }: { runId?: string }) {
  const nodeStatuses = useRunStatus(runId);
  
  return (
    <>
      {Object.entries(nodeStatuses).map(([nodeId, status]) => (
        <NodeStatusIndicator
          key={nodeId}
          nodeId={nodeId}
          status={status.status}
          error={status.error}
        />
      ))}
    </>
  );
}

// Hook: src/hooks/useRunStatus.ts
function useRunStatus(runId?: string) {
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeState>>({});
  
  useEffect(() => {
    if (!runId) return;
    
    // Initial fetch
    fetchRun(runId).then(run => setNodeStatuses(run.node_states));
    
    // Subscribe to changes
    const subscription = supabase
      .channel(`run:${runId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stitch_runs',
        filter: `id=eq.${runId}`
      }, (payload) => {
        setNodeStatuses(payload.new.node_states);
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [runId]);
  
  return nodeStatuses;
}
```

### 3. Journey History Panel

Displays journey events from `stitch_journey_events`.

```typescript
// Component: src/components/canvas/JourneyHistoryPanel.tsx
function JourneyHistoryPanel({ entityId, onClose }: Props) {
  const { events, loading } = useJourneyHistory(entityId);
  
  return (
    <Panel>
      <h2>Journey History: {entityId}</h2>
      {events.map(event => (
        <JourneyEventCard
          key={event.id}
          event={event}
          dwellTime={calculateDwellTime(event, events)}
        />
      ))}
    </Panel>
  );
}

// Hook: src/hooks/useJourneyHistory.ts
function useJourneyHistory(entityId: string) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  
  useEffect(() => {
    // Fetch from backend (uses existing getJourneyHistory function)
    getJourneyHistory(entityId).then(setEvents);
  }, [entityId]);
  
  return { events, loading: false };
}
```

### 4. Cinematic Mode Controls

UI controls for animation speed.

```typescript
// Component: src/components/canvas/CinematicControls.tsx
function CinematicControls() {
  const { settings, setSettings } = useCinematicSettings();
  
  return (
    <div className="cinematic-controls">
      <label>
        Speed: {settings.speed}x
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={settings.speed}
          onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
        />
      </label>
      <button onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}>
        {settings.enabled ? 'Disable' : 'Enable'} Animations
      </button>
    </div>
  );
}

// Context: src/contexts/CinematicContext.tsx
const CinematicContext = createContext<CinematicSettings>();
```

### 5. Demo Mode Button

Triggers automated demo.

```typescript
// Component: src/components/canvas/DemoModeButton.tsx
function DemoModeButton({ canvasId }: { canvasId: string }) {
  const [running, setRunning] = useState(false);
  
  const startDemo = async () => {
    setRunning(true);
    await fetch('/api/demo/start', {
      method: 'POST',
      body: JSON.stringify({
        canvasId,
        entities: [
          { name: 'Monica', startNodeId: 'marketing-section' },
          { name: 'Ross', startNodeId: 'sales-section' },
          { name: 'Rachel', startNodeId: 'marketing-section' }
        ],
        staggerDelay: 2000
      })
    });
  };
  
  return (
    <button onClick={startDemo} disabled={running}>
      {running ? 'Demo Running...' : 'Start Demo'}
    </button>
  );
}

// API Route: src/app/api/demo/start/route.ts (NEW)
// Uses existing backend functions to spawn entities and trigger workflows
```


## Data Models

### Existing Database Schema (Already Built & Realtime-Enabled)

**All tables below are already configured for Supabase realtime subscriptions:**

```sql
-- stitch_entities (migration 004_entity_position_tracking.sql)
-- Realtime: ✅ Enabled
-- Columns: id, name, avatar_url, entity_type, canvas_id,
--          current_node_id, current_edge_id, edge_progress, journey
-- Purpose: Tracks where entities are (at nodes or on edges)

-- stitch_journey_events (migration 005_journey_events_table.sql)
-- Realtime: ✅ Enabled
-- Columns: id, entity_id, event_type, node_id, edge_id, 
--          progress, timestamp, metadata
-- Purpose: Records all entity movements for analytics

-- stitch_runs (migration 20241202000001_create_stitch_tables.sql)
-- Realtime: ✅ Enabled
-- Columns: id, flow_id, node_states (JSONB), created_at, updated_at
-- node_states structure: { [nodeId]: { status, output, error } }
-- Purpose: Tracks workflow execution status
```

### New Database Schema

**NO NEW TABLES NEEDED!** All backend capabilities already exist. This feature is purely frontend visualization.

### TypeScript Types (Frontend)

```typescript
// Existing types from backend (src/types/entity.ts, src/types/stitch.ts)
import { StitchEntity, JourneyEvent } from '@/types/stitch';

// New frontend-specific types
interface EntityDisplayState {
  entity: StitchEntity;
  position: { x: number; y: number };
  isAnimating: boolean;
  animationProgress: number;
}

interface RunNodeDisplayState {
  nodeId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  showPulse: boolean;
  showGlow: boolean;
}

interface CinematicSettings {
  enabled: boolean;
  speed: number; // 0.1x to 5x
  entityTravelDuration: number; // milliseconds
  showTrails: boolean;
  showParticles: boolean;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Node status persistence

*For any* node execution, when the status changes to "running", "completed", or "failed", the database SHALL contain a record with that status and appropriate timestamps.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Real-time status broadcast

*For any* node status change, all active Supabase subscriptions for that run SHALL receive the status update event within the subscription delivery window.
**Validates: Requirements 1.4**

### Property 3: Entity attachment invariant

*For any* entity that is not currently transitioning, the entity SHALL have a valid `current_node_id` that references an existing node in the canvas.
**Validates: Requirements 4.1, 4.4**

### Property 4: Entity clustering layout

*For any* set of entities at the same node, the Canvas SHALL position them with non-zero offsets such that no two entity dots occupy the exact same pixel coordinates.
**Validates: Requirements 4.3**

### Property 5: Entity movement atomicity

*For any* entity movement from node A to node B, the database update of `current_node_id` SHALL complete before the animation begins, ensuring the entity is never in an invalid state.
**Validates: Requirements 4.5**

### Property 6: Edge path validation

*For any* entity movement from node A to node B, if no edge exists connecting A to B in the graph, the System SHALL reject the movement and log an error without modifying the entity's position.
**Validates: Requirements 5.1, 5.4**

### Property 7: Animation duration consistency

*For any* entity travel animation, the animation duration SHALL match the value specified in the cinematic mode settings at the time the animation starts.
**Validates: Requirements 5.5, 14.1**

### Property 8: Journey event completeness

*For any* entity movement, the System SHALL create exactly two journey events: one "entry" event when arriving at the target node and one "exit" event when leaving the source node.
**Validates: Requirements 10.1, 10.2**

### Property 9: Dwell time calculation

*For any* pair of entry and exit journey events for the same entity and node, the calculated dwell time SHALL equal the difference between the exit timestamp and entry timestamp.
**Validates: Requirements 10.3**

### Property 10: Output data persistence

*For any* node that completes execution, the System SHALL store the node's output data in the database before marking the node as "completed".
**Validates: Requirements 3.1**

### Property 11: Subscription cleanup

*For any* canvas component that unmounts, all Supabase real-time subscriptions created by that component SHALL be unsubscribed and cleaned up.
**Validates: Requirements 11.4**

### Property 12: Navigation state preservation

*For any* navigation between BMC view and workflow view, all entity positions and node statuses SHALL remain unchanged in the database.
**Validates: Requirements 12.4**

### Property 13: Worker failure entity freeze

*For any* worker node that fails, the entities associated with that execution SHALL remain at their current node position without movement.
**Validates: Requirements 7.5**

### Property 14: Animation speed bounds

*For any* animation speed setting, the System SHALL accept values in the range [0.1, 5.0] and reject values outside this range.
**Validates: Requirements 14.3**

### Property 15: Demo entity spawn

*For any* demo mode activation with N configured entities, the System SHALL create exactly N entities at their specified start positions.
**Validates: Requirements 6.2**


## Error Handling

### Node Execution Errors

- **Failed Node Status**: When a node fails, update status to "failed" and store error message
- **Entity Freeze**: Do not move entities when their associated node fails
- **Error Display**: Show red indicator and error tooltip on failed nodes
- **Retry Support**: Allow users to retry failed nodes without restarting entire workflow

### Entity Movement Errors

- **Invalid Edge**: Prevent movement when no edge exists between source and target nodes
- **Missing Node**: Validate that target node exists before attempting movement
- **Database Errors**: Roll back entity position changes if database update fails
- **Animation Errors**: If animation fails, still update entity position in database

### Real-Time Subscription Errors

- **Connection Loss**: Implement exponential backoff for reconnection attempts
- **Subscription Failure**: Log errors and attempt to resubscribe
- **Message Parsing**: Handle malformed subscription messages gracefully
- **Cleanup Errors**: Ensure subscriptions are cleaned up even if errors occur during unmount

### Demo Mode Errors

- **Invalid Configuration**: Validate demo config before starting session
- **Entity Spawn Failure**: Continue demo even if some entities fail to spawn
- **Workflow Execution Failure**: Mark demo as partially completed if some workflows fail
- **Reset Failure**: Provide manual reset option if automatic reset fails

## Testing Strategy

### Unit Testing

The system will use **Vitest** for unit testing with the following focus areas:

1. **Node Status Manager**
   - Test status transitions (idle → running → completed/failed)
   - Test error message storage
   - Test timestamp recording

2. **Entity Movement Manager**
   - Test entity position updates
   - Test edge validation
   - Test clustering logic for multiple entities

3. **Journey Tracker**
   - Test entry/exit event creation
   - Test dwell time calculations
   - Test journey history queries with filters

4. **Animation Controller**
   - Test animation duration calculations
   - Test speed setting validation
   - Test cinematic mode configuration

5. **Demo Mode Manager**
   - Test demo session creation
   - Test entity spawning
   - Test workflow triggering with delays

### Property-Based Testing

The system will use **fast-check** for property-based testing. Each property-based test will run a minimum of 100 iterations to ensure comprehensive coverage.

Each property-based test MUST be tagged with a comment explicitly referencing the correctness property from this design document using the format: **Feature: living-canvas, Property {number}: {property_text}**

Property-based tests will focus on:

1. **Invariant Properties**
   - Entity attachment invariant (Property 3)
   - Navigation state preservation (Property 12)

2. **Round-Trip Properties**
   - Journey event entry/exit pairs (Property 8)
   - Dwell time calculation (Property 9)

3. **Metamorphic Properties**
   - Entity clustering maintains non-overlap (Property 4)
   - Animation duration matches settings (Property 7)

4. **Error Condition Properties**
   - Edge path validation rejects invalid movements (Property 6)
   - Animation speed bounds enforcement (Property 14)

### Integration Testing

1. **End-to-End Workflow Execution**
   - Test complete workflow with entity movement
   - Verify all status updates and journey events
   - Confirm real-time updates reach UI

2. **BMC Navigation**
   - Test drilling down from BMC to workflow
   - Test breadcrumb navigation back to BMC
   - Verify entity positions persist across views

3. **Demo Mode**
   - Test full demo session from start to completion
   - Verify all entities spawn and move correctly
   - Confirm metrics are calculated accurately

4. **Real-Time Subscriptions**
   - Test subscription creation and cleanup
   - Test handling of rapid status changes
   - Test reconnection after connection loss


## Prerequisites

### BMC Seed Data Verification

Before implementing visualization, we must ensure the BMC seed data works properly:

1. **Verify BMC Structure**: Check that `scripts/seed-bmc.ts` creates proper 12-section BMC
2. **Verify Node Types**: Ensure all section nodes have correct `type: 'section'`
3. **Verify Edges**: Confirm edges connect sections properly for entity travel
4. **Test Entity Spawn**: Verify entities can be created at section nodes
5. **Test Entity Movement**: Confirm entities can travel between sections via edges

**Files to Check:**
- `stitch-run/scripts/seed-bmc.ts` - BMC creation script
- `stitch-run/src/lib/seeds/default-bmc.ts` - BMC structure definition

## Implementation Details

### Real-Time Subscription Pattern

```typescript
// Hook for subscribing to node status changes
function useNodeStatus(runId: string) {
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeStatus>>(new Map());
  
  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to run node changes
    const subscription = supabase
      .channel(`run:${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stitch_run_nodes',
          filter: `run_id=eq.${runId}`
        },
        (payload) => {
          const node = payload.new as NodeStatus;
          setNodeStatuses(prev => new Map(prev).set(node.nodeId, node));
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [runId]);
  
  return nodeStatuses;
}
```

### Entity Movement Pattern

```typescript
// Move entity with animation
async function moveEntityWithAnimation(
  entityId: string,
  targetNodeId: string,
  canvasId: string
) {
  // 1. Get current position
  const entity = await getEntity(entityId);
  const sourceNodeId = entity.currentNodeId;
  
  // 2. Validate edge exists
  const edge = await findEdge(sourceNodeId, targetNodeId, canvasId);
  if (!edge) {
    throw new Error(`No edge from ${sourceNodeId} to ${targetNodeId}`);
  }
  
  // 3. Record exit from source
  await recordJourneyEvent(entityId, sourceNodeId, 'exit');
  
  // 4. Update database FIRST (atomic)
  await updateEntityPosition(entityId, targetNodeId);
  
  // 5. Record entry to target
  await recordJourneyEvent(entityId, targetNodeId, 'entry');
  
  // 6. Animate (UI only, database already updated)
  const duration = getCinematicSettings().entityTravelDuration;
  await animateEntityAlongEdge(entityId, edge.path, duration);
}
```

### Node Status Update Pattern

```typescript
// Update node status with proper error handling
async function updateNodeStatus(
  runId: string,
  nodeId: string,
  status: NodeStatus['status'],
  error?: string
) {
  const timestamp = new Date();
  
  const update: Partial<NodeStatus> = {
    status,
    ...(status === 'running' && { startedAt: timestamp }),
    ...(status === 'completed' && { completedAt: timestamp }),
    ...(status === 'failed' && { completedAt: timestamp, error })
  };
  
  await supabase
    .from('stitch_run_nodes')
    .update(update)
    .eq('run_id', runId)
    .eq('node_id', nodeId);
  
  // Real-time broadcast happens automatically via Supabase
}
```

### Demo Mode Pattern

```typescript
// Run demo with staggered entity spawns
async function runDemo(canvasId: string, config: DemoConfig) {
  // 1. Create demo session
  const session = await createDemoSession(canvasId, config);
  
  // 2. Reset canvas to initial state
  await resetCanvas(canvasId);
  
  // 3. Spawn entities with delays
  const entities: string[] = [];
  for (const entityConfig of config.entities || []) {
    const entity = await spawnDemoEntity(
      canvasId,
      entityConfig.name,
      entityConfig.startNodeId,
      entityConfig.avatarUrl
    );
    entities.push(entity.id);
    
    // Stagger spawns
    await delay(config.staggerDelay || 2000);
  }
  
  // 4. Trigger workflows for each entity
  for (const entityId of entities) {
    const entity = await getEntity(entityId);
    await triggerWorkflowForEntity(entity, config);
    
    // Stagger workflow starts
    await delay(config.staggerDelay || 2000);
  }
  
  // 5. Update session status
  await updateDemoSession(session.id, { status: 'running' });
  
  return session;
}
```

### Cinematic Mode Pattern

```typescript
// Cinematic mode configuration
const cinematicSettings: CinematicConfig = {
  enabled: true,
  speed: 1.0, // 1x normal speed
  entityTravelDuration: 2000, // 2 seconds per edge
  nodeCompletionDelay: 1000, // 1 second between nodes
  edgeAnimationIntensity: 0.8
};

// Apply speed multiplier
function getEffectiveDuration(baseDuration: number): number {
  const settings = getCinematicSettings();
  if (!settings.enabled) return 0; // Instant
  return baseDuration / settings.speed;
}

// Use in animations
const duration = getEffectiveDuration(cinematicSettings.entityTravelDuration);
await animateEntity(entityId, edgePath, duration);
```

### Entity Clustering Pattern

```typescript
// Calculate positions for multiple entities at same node
function calculateEntityPositions(
  nodePosition: { x: number; y: number },
  entityCount: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const offsetDistance = 10; // pixels
  
  for (let i = 0; i < entityCount; i++) {
    // Arrange in a circle around the node
    const angle = (i / entityCount) * 2 * Math.PI;
    positions.push({
      x: nodePosition.x + Math.cos(angle) * offsetDistance,
      y: nodePosition.y + Math.sin(angle) * offsetDistance
    });
  }
  
  return positions;
}
```

## API Endpoints

### Demo Mode API

```typescript
// POST /api/demo/start
interface StartDemoRequest {
  canvasId: string;
  config?: DemoConfig;
}

interface StartDemoResponse {
  sessionId: string;
  status: 'initializing' | 'running';
  entities: string[];
}

// GET /api/demo/:sessionId
interface GetDemoStatusResponse {
  sessionId: string;
  status: 'initializing' | 'running' | 'completed' | 'failed';
  progress: {
    totalEntities: number;
    completedJourneys: number;
    activeWorkflows: number;
  };
  metrics?: DemoMetrics;
}

// POST /api/demo/:sessionId/stop
interface StopDemoResponse {
  sessionId: string;
  status: 'stopped';
  finalMetrics: DemoMetrics;
}
```

### Cinematic Mode API

```typescript
// PUT /api/canvas/:canvasId/cinematic
interface UpdateCinematicRequest {
  enabled: boolean;
  speed?: number; // 0.1 to 5.0
  entityTravelDuration?: number;
  nodeCompletionDelay?: number;
}

interface UpdateCinematicResponse {
  settings: CinematicConfig;
}
```

## Performance Considerations

### Animation Performance

- Use CSS transforms for entity movement (GPU-accelerated)
- Limit particle count on edges to maintain 60fps
- Use `requestAnimationFrame` for smooth animations
- Debounce rapid status updates to prevent UI thrashing

### Database Performance

- Index `current_node_id` on entities table for fast lookups
- Index `timestamp` on journey_events for efficient queries
- Use database triggers for automatic journey event creation
- Batch entity position updates when possible

### Real-Time Performance

- Use single subscription per canvas instead of per-node
- Filter events client-side to reduce network traffic
- Implement exponential backoff for reconnection
- Clean up subscriptions aggressively to prevent memory leaks

### Scalability

- Support up to 100 entities per canvas without performance degradation
- Handle up to 1000 journey events per entity efficiently
- Support multiple concurrent demo sessions
- Cache cinematic settings to avoid repeated database queries

