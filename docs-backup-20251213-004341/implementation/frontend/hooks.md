# React Hooks

## Overview

Stitch provides a comprehensive set of React hooks for managing data fetching, real-time subscriptions, entity tracking, and canvas navigation. These hooks abstract complex patterns like Supabase subscriptions, entity animations, and navigation state management, providing clean APIs for component integration.

**Key Hooks:**
- **useFlow**: Fetch and subscribe to flow data
- **useEntities**: Track entities with real-time updates and animations
- **useRunStatus**: Subscribe to workflow execution status
- **useCanvasNavigation**: Manage drill-down navigation state
- **useRealtimeSubscription**: Centralized Supabase subscription management
- **useEntityMovement**: Animate entity travel along edges
- **useJourneyHistory**: Fetch entity journey event history

## Architecture

### Hook Dependency Graph

```
useRealtimeSubscription (Foundation)
    ↓
├── useFlow (Flow data)
├── useEntities (Entity tracking)
├── useRunStatus (Execution status)
└── useEntityMovement (Entity animations)

useCanvasNavigation (Independent)
    ↓
Canvas Components (CanvasRouter, BMCCanvas, WorkflowCanvas)

useJourneyHistory (Independent)
    ↓
Entity Detail Panels
```

### Database as Source of Truth

All hooks follow the **Database as Source of Truth** principle:

1. **Initial Fetch**: Load data from Supabase on mount
2. **Real-Time Sync**: Subscribe to database changes
3. **Automatic Updates**: Component re-renders on data changes
4. **Cleanup**: Unsubscribe on unmount


## useFlow

**Location:** `src/hooks/useFlow.ts`

Fetches flow data from the database and optionally subscribes to real-time updates. This is the primary hook for loading canvas data.

### Signature

```typescript
function useFlow(
  flowId: string | null, 
  realtime?: boolean
): UseFlowResult

interface UseFlowResult {
  flow: StitchFlow | null;
  loading: boolean;
  error: string | null;
}
```

### Parameters

- **flowId** (`string | null`): The flow ID to fetch. Pass `null` to skip fetching.
- **realtime** (`boolean`, optional): Enable real-time subscription. Default: `false`.

### Return Value

- **flow**: The flow data, or `null` if not loaded
- **loading**: `true` while fetching initial data
- **error**: Error message if fetch or subscription fails

### Usage

#### Basic Usage (No Real-Time)

```typescript
import { useFlow } from '@/hooks/useFlow';

function MyComponent({ flowId }: { flowId: string }) {
  const { flow, loading, error } = useFlow(flowId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!flow) return <div>Flow not found</div>;

  return <div>{flow.name}</div>;
}
```

#### With Real-Time Updates

```typescript
const { flow, loading, error } = useFlow(flowId, true);

// Flow automatically updates when database changes
useEffect(() => {
  if (flow) {
    console.log('Flow updated:', flow.name);
  }
}, [flow]);
```

#### Conditional Fetching

```typescript
// Only fetch when flowId is available
const { flow } = useFlow(selectedFlowId || null);
```

### Behavior

1. **Initial Fetch**: Queries `stitch_flows` table on mount
2. **Real-Time Subscription**: If enabled, subscribes to UPDATE events
3. **Automatic Cleanup**: Unsubscribes on unmount
4. **Null Handling**: Returns immediately if `flowId` is `null`

### Real-Time Updates

When `realtime` is enabled, the hook subscribes to flow updates:

```typescript
useRealtimeSubscription<{ new: StitchFlow; old: StitchFlow }>(
  {
    table: 'stitch_flows',
    filter: `id=eq.${flowId}`,
    event: 'UPDATE',
  },
  (payload) => {
    setFlow(payload.new as StitchFlow);
  },
  realtime && !!flowId
);
```

### Use Cases

- **Canvas Rendering**: Load flow data for canvas display
- **Version Updates**: Subscribe to version changes in edit mode
- **Graph Modifications**: Detect when flow graph is updated
- **Metadata Changes**: Track flow name, description changes

### Best Practices

1. **Disable Real-Time for Read-Only Views**: Only enable when needed
2. **Handle Null Flow ID**: Always check for `null` before rendering
3. **Show Loading States**: Display spinners during initial fetch
4. **Handle Errors Gracefully**: Show user-friendly error messages


## useEntities

**Location:** `src/hooks/useEntities.ts`

Tracks entities within a canvas with real-time updates and animation state. Automatically triggers entity travel animations when entities start moving along edges.

### Signature

```typescript
function useEntities(canvasId: string): UseEntitiesResult

interface UseEntitiesResult {
  entities: StitchEntity[];
  isLoading: boolean;
  error: Error | null;
  entityProgress: Map<string, number>;
}
```

### Parameters

- **canvasId** (`string`): The canvas ID to track entities for

### Return Value

- **entities**: Array of entities in the canvas
- **isLoading**: `true` while fetching initial data
- **error**: Error object if fetch or subscription fails
- **entityProgress**: Map of entity IDs to animation progress (0-1)

### Usage

#### Basic Entity Tracking

```typescript
import { useEntities } from '@/hooks/useEntities';

function EntityList({ canvasId }: { canvasId: string }) {
  const { entities, isLoading, error } = useEntities(canvasId);

  if (isLoading) return <div>Loading entities...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {entities.map((entity) => (
        <li key={entity.id}>{entity.name}</li>
      ))}
    </ul>
  );
}
```

#### With Animation Progress

```typescript
function EntityOverlay({ canvasId }: { canvasId: string }) {
  const { entities, entityProgress } = useEntities(canvasId);

  return (
    <>
      {entities.map((entity) => {
        const progress = entityProgress.get(entity.id) || 0;
        
        return (
          <EntityDot
            key={entity.id}
            entity={entity}
            animationProgress={progress}
          />
        );
      })}
    </>
  );
}
```

### Behavior

1. **Initial Fetch**: Queries `stitch_entities` table filtered by `canvas_id`
2. **Real-Time Subscription**: Subscribes to INSERT, UPDATE, DELETE events
3. **Animation Trigger**: Detects when entity starts traveling and triggers animation
4. **Progress Tracking**: Maintains local animation progress state
5. **Automatic Cleanup**: Cleans up subscriptions and animations on unmount

### Real-Time Event Handling

The hook handles three types of database events:

#### INSERT Event

```typescript
if (payload.eventType === 'INSERT') {
  setEntities((prev) => [...prev, payload.new as StitchEntity]);
}
```

#### UPDATE Event

```typescript
if (payload.eventType === 'UPDATE') {
  const updated = payload.new as StitchEntity;
  const old = payload.old as StitchEntity;

  // Update entity in array
  setEntities((prev) => 
    prev.map((e) => (e.id === updated.id ? updated : e))
  );

  // Detect travel start
  if (updated.current_edge_id && !old.current_edge_id) {
    animateEntityTravel({
      entityId: updated.id,
      edgeId: updated.current_edge_id,
      destinationNodeId: updated.destination_node_id!,
      duration: 2,
      onProgress: (progress) => {
        setEntityProgress((prev) => 
          new Map(prev).set(updated.id, progress)
        );
      },
      onComplete: () => {
        setEntityProgress((prev) => {
          const next = new Map(prev);
          next.delete(updated.id);
          return next;
        });
      }
    });
  }
}
```

#### DELETE Event

```typescript
if (payload.eventType === 'DELETE') {
  setEntities((prev) => 
    prev.filter((e) => e.id !== payload.old.id)
  );
}
```

### Animation Integration

The hook automatically triggers animations when entities start traveling:

**Detection Logic:**
- Entity has `current_edge_id` (new state)
- Entity did NOT have `current_edge_id` (old state)
- This indicates the entity just started traveling

**Animation Flow:**
1. Entity completes node → Database updates `current_edge_id`
2. Hook detects change → Triggers `animateEntityTravel()`
3. Animation runs for 2 seconds → Progress updates via callback
4. Animation completes → Progress removed from map
5. Entity arrives at node → Database updates `current_node_id`

### Use Cases

- **Entity Visualization**: Display entities on canvas
- **Journey Tracking**: Monitor entity movement
- **Animation Coordination**: Sync animations with database state
- **Entity Counting**: Show number of entities in sections

### Best Practices

1. **Use with EntityOverlay**: Pair with EntityOverlay component for rendering
2. **Handle Empty States**: Check for empty entity arrays
3. **Monitor Progress Map**: Use for smooth animations
4. **Clean Up Animations**: Hook handles cleanup automatically


## useRunStatus

**Location:** `src/hooks/useRunStatus.ts`

Subscribes to real-time workflow execution status updates. Provides node states that automatically update when the execution engine modifies node status in the database.

### Signature

```typescript
function useRunStatus(runId?: string): UseRunStatusResult

interface UseRunStatusResult {
  nodeStates: Record<string, NodeState> | null;
  loading: boolean;
  error: string | null;
}

interface NodeState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_for_user';
  output?: any;
  error?: string;
  started_at?: string;
  completed_at?: string;
}
```

### Parameters

- **runId** (`string`, optional): The run ID to track. Pass `undefined` to skip subscription.

### Return Value

- **nodeStates**: Map of node IDs to their execution state, or `null` if not loaded
- **loading**: `true` while fetching initial data
- **error**: Error message if fetch or subscription fails

### Usage

#### Basic Status Tracking

```typescript
import { useRunStatus } from '@/hooks/useRunStatus';

function WorkflowStatus({ runId }: { runId: string }) {
  const { nodeStates, loading, error } = useRunStatus(runId);

  if (loading) return <div>Loading status...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!nodeStates) return <div>No status available</div>;

  return (
    <div>
      {Object.entries(nodeStates).map(([nodeId, state]) => (
        <div key={nodeId}>
          {nodeId}: {state.status}
        </div>
      ))}
    </div>
  );
}
```

#### With Canvas Integration

```typescript
function WorkflowCanvas({ flowId, runId }: Props) {
  const { flow } = useFlow(flowId);
  const { nodeStates } = useRunStatus(runId);

  // Inject node states into node data
  const nodes = flow.graph.nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      node_states: nodeStates,  // Available in node components
    },
  }));

  return <ReactFlow nodes={nodes} />;
}
```

#### Conditional Subscription

```typescript
// Only subscribe when runId is available
const { nodeStates } = useRunStatus(selectedRunId);

// nodeStates will be null if no runId provided
```

### Behavior

1. **Initial Fetch**: Queries `stitch_runs` table for `node_states` column
2. **Real-Time Subscription**: Subscribes to UPDATE events on the run
3. **Automatic Updates**: Updates `nodeStates` when database changes
4. **Null Handling**: Returns `null` if no `runId` provided
5. **Error Handling**: Handles "run not found" gracefully

### Real-Time Updates

The hook subscribes to run updates and extracts node states:

```typescript
useRealtimeSubscription<{ new: StitchRun; old: StitchRun }>(
  {
    table: 'stitch_runs',
    filter: `id=eq.${runId}`,
    event: 'UPDATE',
  },
  (payload) => {
    const updatedRun = payload.new as StitchRun;
    setNodeStates(updatedRun.node_states);
  },
  !!runId
);
```

### Node State Structure

Each node state contains execution information:

```typescript
{
  "node-1": {
    status: "completed",
    output: { result: "Success" },
    started_at: "2024-01-15T10:30:00Z",
    completed_at: "2024-01-15T10:30:05Z"
  },
  "node-2": {
    status: "running",
    started_at: "2024-01-15T10:30:05Z"
  },
  "node-3": {
    status: "pending"
  }
}
```

### Status Values

- **pending**: Node has not started execution
- **running**: Node is currently executing
- **completed**: Node finished successfully
- **failed**: Node execution failed
- **waiting_for_user**: Node is waiting for user input (UX nodes)

### Use Cases

- **Visual Status Indicators**: Show node execution state on canvas
- **Progress Tracking**: Monitor workflow execution progress
- **Error Detection**: Identify failed nodes
- **User Interaction**: Detect when user input is needed
- **Completion Detection**: Know when workflow finishes

### Integration with Node Components

Node components receive status via `data.node_states`:

```typescript
function WorkerNode({ id, data }: NodeProps) {
  const status = data.node_states?.[id]?.status || 'pending';
  const output = data.node_states?.[id]?.output;

  return (
    <div className={getStatusClass(status)}>
      <StatusIcon status={status} />
      {status === 'completed' && output && (
        <div>Output: {JSON.stringify(output)}</div>
      )}
    </div>
  );
}
```

### Best Practices

1. **Always Check for Null**: Handle case where `nodeStates` is `null`
2. **Provide Default Status**: Use `'pending'` as fallback
3. **Show Loading States**: Display spinner during initial fetch
4. **Handle Errors**: Show user-friendly error messages
5. **Optimize Re-Renders**: Memoize node data transformations


## useCanvasNavigation

**Location:** `src/hooks/useCanvasNavigation.ts`

Manages drill-down navigation state for the canvas system. Provides navigation actions and breadcrumb state with automatic re-rendering when navigation changes.

### Signature

```typescript
function useCanvasNavigation(): UseCanvasNavigationReturn

interface UseCanvasNavigationReturn {
  currentCanvasId: string | null;
  currentCanvas: CanvasStackItem | null;
  breadcrumbs: CanvasStackItem[];
  canGoBack: boolean;
  drillInto: (id: string, name: string, type: CanvasType) => void;
  goBack: () => void;
  navigateTo: (index: number) => void;
  clear: () => void;
  hydrateFromDatabase: (canvasId: string) => Promise<void>;
}

interface CanvasStackItem {
  id: string;
  name: string;
  type: CanvasType;
}

type CanvasType = 'bmc' | 'workflow' | 'detail';
```

### Parameters

None. The hook manages global navigation state.

### Return Value

- **currentCanvasId**: ID of the current canvas, or `null`
- **currentCanvas**: Full canvas stack item, or `null`
- **breadcrumbs**: Array of canvas items in navigation path
- **canGoBack**: `true` if navigation history exists
- **drillInto**: Function to navigate to a child canvas
- **goBack**: Function to navigate to parent canvas
- **navigateTo**: Function to jump to a specific breadcrumb
- **clear**: Function to reset navigation state
- **hydrateFromDatabase**: Function to load navigation path from database

### Usage

#### Basic Navigation

```typescript
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';

function CanvasView() {
  const { 
    currentCanvasId, 
    breadcrumbs, 
    canGoBack, 
    drillInto, 
    goBack 
  } = useCanvasNavigation();

  return (
    <div>
      {/* Breadcrumbs */}
      <nav>
        {breadcrumbs.map((item, index) => (
          <span key={item.id}>
            {item.name}
            {index < breadcrumbs.length - 1 && ' > '}
          </span>
        ))}
      </nav>

      {/* Back button */}
      {canGoBack && (
        <button onClick={goBack}>← Back</button>
      )}

      {/* Canvas content */}
      <Canvas canvasId={currentCanvasId} />
    </div>
  );
}
```

#### Drill-Down Navigation

```typescript
function SectionNode({ data }: NodeProps) {
  const { drillInto } = useCanvasNavigation();

  const handleDoubleClick = () => {
    if (data.child_canvas_id) {
      drillInto(
        data.child_canvas_id,  // Canvas ID
        data.label,            // Display name
        'workflow'             // Canvas type
      );
    }
  };

  return (
    <div onDoubleClick={handleDoubleClick}>
      {data.label}
    </div>
  );
}
```

#### Breadcrumb Navigation

```typescript
function Breadcrumbs() {
  const { breadcrumbs, navigateTo } = useCanvasNavigation();

  return (
    <nav>
      {breadcrumbs.map((item, index) => (
        <button 
          key={item.id}
          onClick={() => navigateTo(index)}
        >
          {item.name}
        </button>
      ))}
    </nav>
  );
}
```

#### Hydration from Database

```typescript
function CanvasRouter({ initialFlowId }: Props) {
  const { hydrateFromDatabase } = useCanvasNavigation();

  useEffect(() => {
    // Load navigation path from database on mount
    hydrateFromDatabase(initialFlowId);
  }, [initialFlowId, hydrateFromDatabase]);

  return <CanvasView />;
}
```

### Behavior

1. **Subscription**: Automatically subscribes to navigation changes
2. **Re-Rendering**: Triggers component re-render when navigation changes
3. **Stack Management**: Maintains navigation stack internally
4. **Cleanup**: Unsubscribes on unmount

### Navigation Actions

#### drillInto(id, name, type)

Navigate to a child canvas:

```typescript
drillInto('workflow-123', 'Marketing Workflow', 'workflow');
```

**Effect:**
- Pushes new canvas onto navigation stack
- Updates `currentCanvasId` and `currentCanvas`
- Adds item to `breadcrumbs`
- Triggers re-render

#### goBack()

Navigate to parent canvas:

```typescript
goBack();
```

**Effect:**
- Pops current canvas from stack
- Updates to previous canvas
- Removes last breadcrumb
- Triggers re-render

#### navigateTo(index)

Jump to a specific breadcrumb:

```typescript
navigateTo(0);  // Jump to root canvas
```

**Effect:**
- Removes all canvases after the target index
- Updates to target canvas
- Truncates breadcrumbs
- Triggers re-render

#### clear()

Reset navigation state:

```typescript
clear();
```

**Effect:**
- Clears navigation stack
- Sets `currentCanvasId` to `null`
- Empties breadcrumbs
- Triggers re-render

#### hydrateFromDatabase(canvasId)

Load navigation path from database:

```typescript
await hydrateFromDatabase('workflow-123');
```

**Effect:**
- Queries database for canvas and parent canvases
- Builds navigation stack from root to target
- Updates all navigation state
- Triggers re-render

### Navigation Stack

The hook maintains a stack of canvas items:

```typescript
// Example stack after drilling down
[
  { id: 'bmc-1', name: 'Business Model', type: 'bmc' },
  { id: 'section-1', name: 'Marketing', type: 'workflow' },
  { id: 'item-1', name: 'Email Campaign', type: 'detail' }
]
```

**Stack Operations:**
- `drillInto()` → Push
- `goBack()` → Pop
- `navigateTo(index)` → Slice to index + 1
- `clear()` → Empty array

### Use Cases

- **Canvas Routing**: Navigate between BMC, sections, and workflows
- **Breadcrumb Display**: Show navigation path
- **Back Navigation**: Return to parent canvas
- **Deep Linking**: Hydrate navigation from URL or database
- **Navigation History**: Track user's navigation path

### Best Practices

1. **Hydrate on Mount**: Always call `hydrateFromDatabase()` on initial load
2. **Check canGoBack**: Disable back button when at root
3. **Memoize Callbacks**: Wrap navigation handlers in `useCallback`
4. **Handle Null State**: Check for `null` before rendering
5. **Use with CanvasRouter**: Pair with CanvasRouter component


## useRealtimeSubscription

**Location:** `src/hooks/useRealtimeSubscription.ts`

Centralized real-time subscription hook that manages Supabase channel lifecycle with reference counting. This is the foundation hook used by other hooks for database subscriptions.

### Signature

```typescript
function useRealtimeSubscription<T = any>(
  config: SubscriptionConfig,
  callback: SubscriptionCallback<T>,
  enabled?: boolean
): SubscriptionResult

interface SubscriptionConfig {
  table: string;
  filter: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface SubscriptionCallback<T> {
  (payload: T): void;
}

interface SubscriptionResult {
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
}
```

### Parameters

- **config**: Subscription configuration
  - **table**: Database table name (e.g., `'stitch_runs'`)
  - **filter**: PostgreSQL filter (e.g., `'id=eq.123'`)
  - **event**: Event type to listen for (default: `'*'`)
- **callback**: Function called when updates are received
- **enabled**: Whether subscription is active (default: `true`)

### Return Value

- **status**: Connection status (`'connecting'`, `'connected'`, `'error'`)
- **error**: Error message if subscription fails

### Usage

#### Basic Subscription

```typescript
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

function MyComponent({ runId }: { runId: string }) {
  const { status, error } = useRealtimeSubscription(
    {
      table: 'stitch_runs',
      filter: `id=eq.${runId}`,
      event: 'UPDATE',
    },
    (payload) => {
      console.log('Run updated:', payload.new);
    }
  );

  if (status === 'connecting') return <div>Connecting...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>Connected</div>;
}
```

#### Conditional Subscription

```typescript
const { status } = useRealtimeSubscription(
  {
    table: 'stitch_entities',
    filter: `canvas_id=eq.${canvasId}`,
    event: '*',
  },
  handleEntityUpdate,
  !!canvasId  // Only subscribe when canvasId exists
);
```

#### Multiple Event Types

```typescript
// Listen to all events
useRealtimeSubscription(
  {
    table: 'stitch_entities',
    filter: `canvas_id=eq.${canvasId}`,
    event: '*',  // INSERT, UPDATE, DELETE
  },
  (payload) => {
    if (payload.eventType === 'INSERT') {
      // Handle insert
    } else if (payload.eventType === 'UPDATE') {
      // Handle update
    } else if (payload.eventType === 'DELETE') {
      // Handle delete
    }
  }
);
```

### Behavior

1. **Reference Counting**: Multiple components can subscribe to the same channel
2. **Channel Reuse**: Existing channels are reused instead of creating duplicates
3. **Automatic Cleanup**: Channels are closed when last subscriber unmounts
4. **Callback Management**: Each subscriber's callback is tracked independently
5. **Mount Safety**: Callbacks only fire if component is still mounted

### Reference Counting

The hook uses a global registry to manage subscriptions:

```typescript
// Global subscription registry
const subscriptionRegistry = new Map<string, SubscriptionEntry>();

interface SubscriptionEntry {
  channel: RealtimeChannel;
  refCount: number;
  callbacks: Set<Function>;
}
```

**How it works:**

1. **First Subscriber**: Creates new channel and subscribes
2. **Additional Subscribers**: Increment `refCount`, add callback
3. **Unsubscribe**: Decrement `refCount`, remove callback
4. **Last Unsubscribe**: Close channel, remove from registry

**Benefits:**
- Prevents duplicate subscriptions
- Reduces network overhead
- Improves performance
- Simplifies cleanup

### Subscription Key

Subscriptions are keyed by table, filter, and event:

```typescript
const key = `${table}:${filter}:${event}`;
// Example: "stitch_runs:id=eq.123:UPDATE"
```

Components with the same key share a channel.

### Payload Structure

The callback receives different payloads based on event type:

#### UPDATE Event

```typescript
{
  eventType: 'UPDATE',
  new: { /* updated record */ },
  old: { /* previous record */ }
}
```

#### INSERT Event

```typescript
{
  eventType: 'INSERT',
  new: { /* new record */ }
}
```

#### DELETE Event

```typescript
{
  eventType: 'DELETE',
  old: { /* deleted record */ }
}
```

### Use Cases

- **Foundation for Other Hooks**: Used by `useFlow`, `useEntities`, `useRunStatus`
- **Custom Subscriptions**: Create custom real-time features
- **Database Sync**: Keep UI in sync with database
- **Multi-Component Sync**: Share subscriptions across components

### Debugging Utilities

The hook exports debugging functions:

#### getActiveSubscriptionCount()

```typescript
import { getActiveSubscriptionCount } from '@/hooks/useRealtimeSubscription';

const count = getActiveSubscriptionCount();
console.log(`Active subscriptions: ${count}`);
```

#### getSubscriptionDetails(table, filter, event)

```typescript
import { getSubscriptionDetails } from '@/hooks/useRealtimeSubscription';

const details = getSubscriptionDetails('stitch_runs', 'id=eq.123', 'UPDATE');
console.log(`Ref count: ${details?.refCount}`);
console.log(`Callbacks: ${details?.callbackCount}`);
```

### Best Practices

1. **Use Stable Config**: Memoize config object to prevent re-subscriptions
2. **Enable Conditionally**: Use `enabled` parameter for conditional subscriptions
3. **Handle All Events**: Check `eventType` when using `event: '*'`
4. **Avoid Inline Callbacks**: Use stable callback references
5. **Monitor Status**: Check `status` for connection issues

### Common Patterns

#### Pattern 1: Conditional Subscription

```typescript
useRealtimeSubscription(
  config,
  callback,
  !!resourceId  // Only subscribe when resource exists
);
```

#### Pattern 2: State Update Callback

```typescript
useRealtimeSubscription(
  config,
  (payload) => {
    setState(payload.new);
  }
);
```

#### Pattern 3: Multiple Subscribers

```typescript
// Component A
useRealtimeSubscription(config, callbackA);

// Component B (shares channel with A)
useRealtimeSubscription(config, callbackB);
```


## Supporting Hooks

### useEntityMovement

**Location:** `src/hooks/useEntityMovement.ts`

Animates entity travel along edges using Framer Motion. Subscribes to entity updates and triggers smooth animations when entities start traveling.

#### Signature

```typescript
function useEntityMovement(props: UseEntityMovementProps): void

interface UseEntityMovementProps {
  canvasId: string;
  onEntityPositionUpdate: (entityId: string, position: Position) => void;
}

interface Position { 
  x: number; 
  y: number; 
}
```

#### Usage

```typescript
import { useEntityMovement } from '@/hooks/useEntityMovement';

function EntityOverlay({ canvasId }: { canvasId: string }) {
  const [entityPositions, setEntityPositions] = useState<Map<string, Position>>(new Map());

  useEntityMovement({
    canvasId,
    onEntityPositionUpdate: (entityId, position) => {
      setEntityPositions((prev) => new Map(prev).set(entityId, position));
    },
  });

  return (
    <>
      {Array.from(entityPositions.entries()).map(([id, pos]) => (
        <EntityDot key={id} position={pos} />
      ))}
    </>
  );
}
```

#### Behavior

1. **Subscribes to Entity Updates**: Listens for entity changes in the canvas
2. **Detects Travel Start**: Identifies when `current_edge_id` is set
3. **Finds SVG Path**: Locates the edge element in the DOM
4. **Animates Along Path**: Uses `getPointAtLength()` for smooth animation
5. **Updates Position**: Calls callback with frame-by-frame positions
6. **Handles Arrival**: Snaps entity to node when `current_node_id` is set

#### Animation Details

- **Duration**: 2 seconds per edge
- **Easing**: `easeInOut` for smooth acceleration/deceleration
- **Frame Rate**: 60fps via Framer Motion
- **Path Following**: Uses SVG `getTotalLength()` and `getPointAtLength()`

### useJourneyHistory

**Location:** `src/hooks/useJourneyHistory.ts`

Fetches journey event history for an entity. Used to display entity movement timeline and historical data.

#### Signature

```typescript
function useJourneyHistory(entityId: string | null): UseJourneyHistoryResult

interface UseJourneyHistoryResult {
  events: DatabaseJourneyEvent[];
  loading: boolean;
  error: string | null;
}
```

#### Usage

```typescript
import { useJourneyHistory } from '@/hooks/useJourneyHistory';

function EntityTimeline({ entityId }: { entityId: string }) {
  const { events, loading, error } = useJourneyHistory(entityId);

  if (loading) return <div>Loading history...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {events.map((event) => (
        <li key={event.id}>
          {event.timestamp}: {event.event_type}
        </li>
      ))}
    </ul>
  );
}
```

#### Behavior

1. **Fetches on Mount**: Queries `stitch_journey_events` table
2. **Filters by Entity**: Only fetches events for specified entity
3. **Orders by Time**: Returns events in chronological order
4. **Normalizes Data**: Converts raw database records to typed events
5. **Handles Null**: Returns empty array if `entityId` is `null`

#### Event Types

Journey events track entity movement:

- **node_arrival**: Entity arrived at a node
- **edge_travel_start**: Entity started traveling along an edge
- **section_entry**: Entity entered a BMC section
- **section_exit**: Entity left a BMC section
- **workflow_start**: Entity started a workflow
- **workflow_complete**: Entity completed a workflow

### useRealtimeRun

**Location:** `src/hooks/useRealtimeRun.ts`

Convenience hook that combines `useFlow` and `useRunStatus` for run tracking. Provides both flow data and execution status.

#### Signature

```typescript
function useRealtimeRun(runId: string): UseRealtimeRunResult

interface UseRealtimeRunResult {
  run: StitchRun | null;
  loading: boolean;
  error: string | null;
}
```

#### Usage

```typescript
import { useRealtimeRun } from '@/hooks/useRealtimeRun';

function RunViewer({ runId }: { runId: string }) {
  const { run, loading, error } = useRealtimeRun(runId);

  if (loading) return <div>Loading run...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!run) return <div>Run not found</div>;

  return (
    <div>
      <h1>Run: {run.id}</h1>
      <div>Status: {run.status}</div>
      <div>Started: {run.started_at}</div>
    </div>
  );
}
```


## Hook Composition Patterns

### Pattern 1: Canvas with Status

Combine flow and status hooks for canvas rendering with execution tracking:

```typescript
function WorkflowCanvas({ flowId, runId }: Props) {
  const { flow, loading: flowLoading } = useFlow(flowId);
  const { nodeStates, loading: statusLoading } = useRunStatus(runId);

  const loading = flowLoading || statusLoading;

  if (loading) return <Spinner />;
  if (!flow) return <NotFound />;

  // Inject status into nodes
  const nodes = flow.graph.nodes.map((node) => ({
    ...node,
    data: { ...node.data, node_states: nodeStates },
  }));

  return <ReactFlow nodes={nodes} />;
}
```

### Pattern 2: Entity Visualization

Combine entity tracking and movement for complete entity visualization:

```typescript
function EntityOverlay({ canvasId }: { canvasId: string }) {
  const { entities, entityProgress } = useEntities(canvasId);
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEntityMovement({
    canvasId,
    onEntityPositionUpdate: (id, pos) => {
      setPositions((prev) => new Map(prev).set(id, pos));
    },
  });

  return (
    <>
      {entities.map((entity) => (
        <EntityDot
          key={entity.id}
          entity={entity}
          position={positions.get(entity.id)}
          progress={entityProgress.get(entity.id)}
        />
      ))}
    </>
  );
}
```

### Pattern 3: Navigation with Data

Combine navigation and data fetching for routed canvas views:

```typescript
function CanvasRouter({ initialFlowId }: Props) {
  const { currentCanvasId, hydrateFromDatabase } = useCanvasNavigation();
  const { flow, loading } = useFlow(currentCanvasId);

  useEffect(() => {
    hydrateFromDatabase(initialFlowId);
  }, [initialFlowId, hydrateFromDatabase]);

  if (loading) return <Spinner />;
  if (!flow) return <NotFound />;

  return <Canvas flow={flow} />;
}
```

### Pattern 4: Entity Detail Panel

Combine entity data and journey history for detail views:

```typescript
function EntityDetailPanel({ entityId }: { entityId: string }) {
  const { entities } = useEntities(canvasId);
  const { events, loading } = useJourneyHistory(entityId);

  const entity = entities.find((e) => e.id === entityId);

  if (!entity) return <NotFound />;
  if (loading) return <Spinner />;

  return (
    <div>
      <h2>{entity.name}</h2>
      <Timeline events={events} />
    </div>
  );
}
```

## Performance Optimization

### Memoization

Memoize callbacks to prevent unnecessary re-subscriptions:

```typescript
const handleUpdate = useCallback((payload) => {
  setState(payload.new);
}, []);

useRealtimeSubscription(config, handleUpdate);
```

### Conditional Subscriptions

Only subscribe when data is needed:

```typescript
const { flow } = useFlow(flowId, isVisible);  // Only subscribe when visible
```

### Cleanup

Hooks automatically clean up subscriptions, but you can optimize further:

```typescript
useEffect(() => {
  if (!isActive) return;

  const { status } = useRealtimeSubscription(config, callback);

  return () => {
    // Cleanup handled automatically
  };
}, [isActive]);
```

### Debouncing

Debounce rapid updates to prevent excessive re-renders:

```typescript
const [debouncedState, setDebouncedState] = useState(null);

useRealtimeSubscription(config, (payload) => {
  // Debounce updates
  clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => {
    setDebouncedState(payload.new);
  }, 100);
});
```

## Error Handling

### Graceful Degradation

Handle errors without breaking the UI:

```typescript
const { flow, error } = useFlow(flowId);

if (error) {
  return (
    <Alert variant="error">
      Failed to load flow: {error}
      <button onClick={retry}>Retry</button>
    </Alert>
  );
}
```

### Retry Logic

Implement retry for failed subscriptions:

```typescript
const [retryCount, setRetryCount] = useState(0);

const { status, error } = useRealtimeSubscription(config, callback);

useEffect(() => {
  if (status === 'error' && retryCount < 3) {
    setTimeout(() => {
      setRetryCount((c) => c + 1);
    }, 1000 * Math.pow(2, retryCount));
  }
}, [status, retryCount]);
```

### Fallback States

Provide fallback data when subscriptions fail:

```typescript
const { flow, error } = useFlow(flowId, true);

const displayFlow = error ? cachedFlow : flow;
```

## Testing

### Mocking Hooks

Mock hooks in tests:

```typescript
jest.mock('@/hooks/useFlow', () => ({
  useFlow: jest.fn(() => ({
    flow: mockFlow,
    loading: false,
    error: null,
  })),
}));
```

### Testing Real-Time Updates

Test subscription callbacks:

```typescript
it('updates state on database change', async () => {
  const { result } = renderHook(() => useRunStatus('run-123'));

  // Simulate database update
  act(() => {
    mockSupabase.emit('UPDATE', { new: updatedRun });
  });

  await waitFor(() => {
    expect(result.current.nodeStates).toEqual(updatedRun.node_states);
  });
});
```

### Testing Navigation

Test navigation actions:

```typescript
it('navigates to child canvas', () => {
  const { result } = renderHook(() => useCanvasNavigation());

  act(() => {
    result.current.drillInto('child-1', 'Child Canvas', 'workflow');
  });

  expect(result.current.currentCanvasId).toBe('child-1');
  expect(result.current.breadcrumbs).toHaveLength(2);
});
```

## Best Practices

### 1. Use Appropriate Hooks

Choose the right hook for your use case:

- **useFlow**: Load canvas data
- **useEntities**: Track entities
- **useRunStatus**: Monitor execution
- **useCanvasNavigation**: Handle navigation
- **useRealtimeSubscription**: Custom subscriptions

### 2. Handle Loading States

Always show loading indicators:

```typescript
if (loading) return <Spinner />;
```

### 3. Handle Errors

Display user-friendly error messages:

```typescript
if (error) return <ErrorAlert message={error} />;
```

### 4. Check for Null

Verify data exists before rendering:

```typescript
if (!flow) return <NotFound />;
```

### 5. Optimize Re-Renders

Memoize callbacks and data transformations:

```typescript
const nodes = useMemo(() => 
  transformNodes(flow.graph.nodes), 
  [flow.graph.nodes]
);
```

### 6. Clean Up Properly

Hooks handle cleanup automatically, but be mindful of:
- Clearing timers
- Canceling animations
- Removing event listeners

### 7. Use TypeScript

Leverage TypeScript for type safety:

```typescript
const { flow } = useFlow(flowId);
// flow is typed as StitchFlow | null
```

## Common Pitfalls

### Pitfall 1: Inline Callbacks

❌ **Don't:**
```typescript
useRealtimeSubscription(config, (payload) => {
  setState(payload.new);  // Creates new function on every render
});
```

✅ **Do:**
```typescript
const handleUpdate = useCallback((payload) => {
  setState(payload.new);
}, []);

useRealtimeSubscription(config, handleUpdate);
```

### Pitfall 2: Missing Dependencies

❌ **Don't:**
```typescript
useEffect(() => {
  fetchData(flowId);
}, []);  // Missing flowId dependency
```

✅ **Do:**
```typescript
useEffect(() => {
  fetchData(flowId);
}, [flowId]);
```

### Pitfall 3: Not Handling Null

❌ **Don't:**
```typescript
return <div>{flow.name}</div>;  // Crashes if flow is null
```

✅ **Do:**
```typescript
if (!flow) return <NotFound />;
return <div>{flow.name}</div>;
```

### Pitfall 4: Duplicate Subscriptions

❌ **Don't:**
```typescript
// Multiple subscriptions to same data
useRealtimeSubscription(config1, callback1);
useRealtimeSubscription(config1, callback2);  // Same config
```

✅ **Do:**
```typescript
// Use single subscription with combined callback
useRealtimeSubscription(config, (payload) => {
  callback1(payload);
  callback2(payload);
});
```

## Related Documentation

- [Canvas Components](./canvas-components.md) - Canvas rendering components
- [Entity Visualization](./entity-visualization.md) - Entity tracking and animation
- [Real-Time Features](./real-time.md) - Supabase subscription patterns
- [Architecture Overview](../architecture/overview.md) - System architecture
- [Database Layer](../backend/database-layer.md) - Database operations

## Requirements Validation

This documentation satisfies **Requirement 3.4**:

> WHEN examining hooks THEN the system SHALL document useFlow, useEntities, useRunStatus, and useCanvasNavigation

**Coverage:**
- ✅ useFlow: Data fetching and real-time updates
- ✅ useEntities: Entity tracking with animations
- ✅ useRunStatus: Execution status subscriptions
- ✅ useCanvasNavigation: Navigation state management
- ✅ useRealtimeSubscription: Foundation subscription hook
- ✅ Supporting hooks: useEntityMovement, useJourneyHistory, useRealtimeRun
- ✅ Patterns: Composition, optimization, error handling
- ✅ Best practices: Usage guidelines and common pitfalls

