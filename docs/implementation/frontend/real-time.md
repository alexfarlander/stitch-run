# Real-Time Features

## Overview

Stitch implements comprehensive real-time synchronization using Supabase's real-time capabilities. The system follows the **Database as Source of Truth** principle, where all state changes are persisted to the database and propagated to connected clients via WebSocket subscriptions.

**Key Real-Time Features:**
- **Workflow Execution Status**: Live updates as nodes complete
- **Entity Movement**: Real-time entity tracking and animations
- **Canvas Updates**: Instant propagation of graph modifications
- **Multi-User Sync**: Automatic synchronization across multiple clients

**Architecture Principles:**
1. **Database as Source of Truth**: All state lives in Supabase
2. **Subscription-Based**: Components subscribe to database changes
3. **Reference Counting**: Efficient channel management prevents duplicates
4. **Automatic Cleanup**: Subscriptions cleaned up on unmount
5. **Optimistic Updates**: Local state updates before database confirmation

## Architecture

### Real-Time Data Flow

```
Database Change (Supabase)
    ↓
WebSocket Event
    ↓
useRealtimeSubscription (Channel Manager)
    ↓
Hook Callback (useFlow, useEntities, useRunStatus)
    ↓
React State Update
    ↓
Component Re-Render
```

### Subscription Layers

```
┌─────────────────────────────────────────┐
│  Components (Canvas, EntityOverlay)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Domain Hooks (useFlow, useEntities)    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  useRealtimeSubscription (Foundation)   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Supabase Client (WebSocket)            │
└─────────────────────────────────────────┘
```

### Database Tables with Real-Time

| Table | Subscribed By | Update Frequency | Purpose |
|-------|---------------|------------------|---------|
| `stitch_runs` | `useRunStatus` | High (during execution) | Node status updates |
| `stitch_entities` | `useEntities` | Medium | Entity movement tracking |
| `stitch_flows` | `useFlow` | Low | Canvas graph modifications |
| `stitch_flow_versions` | `useFlow` | Low | Version changes |
| `stitch_journey_events` | `useJourneyHistory` | Medium | Entity journey tracking |

## Supabase Real-Time Integration

### Client Configuration

**Location:** `src/lib/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false, // Stitch is stateless
    },
  }
);
```

**Key Configuration:**
- **persistSession: false**: No session persistence needed
- **Anon Key**: Public key for client-side access
- **Auto-Reconnect**: Supabase handles reconnection automatically

### Subscription Mechanism

Supabase uses PostgreSQL's `LISTEN/NOTIFY` for real-time updates:

1. **Database Change**: Row inserted/updated/deleted
2. **PostgreSQL Trigger**: Fires `NOTIFY` event
3. **Supabase Realtime**: Broadcasts to WebSocket clients
4. **Client Receives**: Event delivered to subscribed channels
5. **Callback Invoked**: React hook updates state

### Channel Structure

Channels are identified by table, filter, and event type:

```typescript
const channel = supabase
  .channel('stitch_runs:id=eq.123:UPDATE')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'stitch_runs',
      filter: 'id=eq.123',
    },
    (payload) => {
      // Handle update
    }
  )
  .subscribe();
```

**Channel Key Format:**
```
{table}:{filter}:{event}
```

**Examples:**
- `stitch_runs:id=eq.abc123:UPDATE`
- `stitch_entities:canvas_id=eq.xyz789:*`
- `stitch_flows:id=eq.flow-1:UPDATE`

## Centralized Subscription Management

### useRealtimeSubscription Hook

**Location:** `src/hooks/useRealtimeSubscription.ts`

The foundation hook that manages all Supabase subscriptions with reference counting.

#### Key Features

1. **Reference Counting**: Multiple components can share a single channel
2. **Automatic Cleanup**: Channels closed when last subscriber unmounts
3. **Callback Management**: Each subscriber's callback tracked independently
4. **Mount Safety**: Callbacks only fire if component is mounted
5. **Error Handling**: Connection errors propagated to subscribers

#### Global Registry

```typescript
interface SubscriptionEntry {
  channel: RealtimeChannel;
  refCount: number;
  callbacks: Set<Function>;
}

const subscriptionRegistry = new Map<string, SubscriptionEntry>();
```

**How It Works:**

1. **First Subscriber**:
   - Creates new channel
   - Subscribes to Supabase
   - Adds to registry with `refCount = 1`

2. **Additional Subscribers**:
   - Finds existing channel
   - Increments `refCount`
   - Adds callback to set

3. **Unsubscribe**:
   - Decrements `refCount`
   - Removes callback from set
   - If `refCount === 0`, closes channel and removes from registry

#### Usage Pattern

```typescript
const { status, error } = useRealtimeSubscription(
  {
    table: 'stitch_runs',
    filter: `id=eq.${runId}`,
    event: 'UPDATE',
  },
  (payload) => {
    // Handle update
    setRun(payload.new);
  },
  enabled // Optional: conditional subscription
);
```

#### Benefits

- **Performance**: Prevents duplicate subscriptions
- **Memory Efficiency**: Shared channels reduce overhead
- **Simplicity**: Components don't manage channels directly
- **Reliability**: Automatic cleanup prevents memory leaks

## State Management Patterns

### Pattern 1: Initial Fetch + Real-Time Sync

The standard pattern for all hooks:

```typescript
function useFlow(flowId: string) {
  const [flow, setFlow] = useState<StitchFlow | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Initial fetch
  useEffect(() => {
    async function fetchFlow() {
      const { data } = await supabase
        .from('stitch_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      
      setFlow(data);
      setLoading(false);
    }
    fetchFlow();
  }, [flowId]);

  // 2. Real-time subscription
  useRealtimeSubscription(
    {
      table: 'stitch_flows',
      filter: `id=eq.${flowId}`,
      event: 'UPDATE',
    },
    (payload) => {
      setFlow(payload.new); // Update on change
    }
  );

  return { flow, loading };
}
```

**Flow:**
1. Component mounts → Fetch initial data
2. Display loading state
3. Subscribe to updates
4. Receive updates → Update state → Re-render
5. Component unmounts → Unsubscribe

### Pattern 2: Optimistic Updates

For user-initiated changes, update local state immediately:

```typescript
async function updateFlow(flowId: string, updates: Partial<StitchFlow>) {
  // 1. Optimistic update
  setFlow((prev) => ({ ...prev, ...updates }));

  // 2. Database update
  const { error } = await supabase
    .from('stitch_flows')
    .update(updates)
    .eq('id', flowId);

  // 3. Revert on error
  if (error) {
    setFlow(originalFlow); // Rollback
    showError(error.message);
  }

  // 4. Real-time subscription will confirm the change
}
```

**Benefits:**
- Instant UI feedback
- Perceived performance improvement
- Automatic correction if update fails

### Pattern 3: Derived State

Compute derived state from real-time data:

```typescript
function useRunProgress(runId: string) {
  const { nodeStates } = useRunStatus(runId);

  // Derive progress from node states
  const progress = useMemo(() => {
    if (!nodeStates) return 0;
    
    const total = Object.keys(nodeStates).length;
    const completed = Object.values(nodeStates)
      .filter((s) => s.status === 'completed').length;
    
    return (completed / total) * 100;
  }, [nodeStates]);

  return progress;
}
```

**Benefits:**
- Automatic recalculation on updates
- Memoized for performance
- Clean separation of concerns

### Pattern 4: Multi-Table Sync

Combine multiple subscriptions for complex features:

```typescript
function useWorkflowExecution(flowId: string, runId: string) {
  const { flow } = useFlow(flowId);
  const { nodeStates } = useRunStatus(runId);
  const { entities } = useEntities(flowId);

  // All three update independently via real-time
  return { flow, nodeStates, entities };
}
```

**Benefits:**
- Independent update cycles
- Shared channel management
- Automatic synchronization

## Update Propagation

### Workflow Execution Updates

**Scenario:** Worker completes → Node status updates

```
1. Worker Callback
   POST /api/stitch/callback/{runId}/{nodeId}
   { status: "completed", output: {...} }
   
2. Database Update
   updateNodeState(runId, nodeId, state)
   → UPDATE stitch_runs SET node_states = ...
   
3. PostgreSQL Trigger
   → NOTIFY stitch_runs_changes
   
4. Supabase Realtime
   → Broadcast to subscribed clients
   
5. useRunStatus Hook
   → Receives payload
   → setNodeStates(payload.new.node_states)
   
6. Component Re-Render
   → Node visual updates to "completed"
```

**Latency:** Typically 50-200ms from database update to UI update

### Entity Movement Updates

**Scenario:** Entity starts traveling along edge

```
1. Workflow Completion
   Node completes → moveEntityToEdge(entityId, edgeId)
   
2. Database Update
   UPDATE stitch_entities SET 
     current_edge_id = 'edge-1',
     edge_progress = 0.0,
     destination_node_id = 'node-2'
   
3. Real-Time Event
   → useEntities receives UPDATE event
   
4. Animation Trigger
   if (updated.current_edge_id && !old.current_edge_id) {
     animateEntityTravel({...})
   }
   
5. Local Animation
   → Framer Motion animates progress 0 → 1
   → onProgress callback updates local state
   
6. Animation Complete
   → arriveAtNode(entityId, nodeId)
   → Database update triggers another real-time event
```

**Animation:** 2-second smooth animation with local state, synced to database

### Canvas Graph Updates

**Scenario:** User modifies workflow graph

```
1. User Action
   User drags node, adds edge, etc.
   
2. Optimistic Update
   → Local state updates immediately
   → Canvas re-renders
   
3. Database Update
   → saveFlow(flowId, updatedGraph)
   → UPDATE stitch_flows SET graph = ...
   
4. Real-Time Propagation
   → Other connected clients receive update
   → Their canvases update automatically
   
5. Confirmation
   → Real-time event confirms change
   → Optimistic update validated
```

**Multi-User:** All connected users see changes within 100-300ms

## Real-Time Hooks

### useRunStatus

**Purpose:** Subscribe to workflow execution status

**Location:** `src/hooks/useRunStatus.ts`

```typescript
const { nodeStates, loading, error } = useRunStatus(runId);
```

**Subscription:**
- **Table:** `stitch_runs`
- **Filter:** `id=eq.{runId}`
- **Event:** `UPDATE`

**Update Frequency:** High during execution (every node completion)

**Use Cases:**
- Display node execution status on canvas
- Show progress indicators
- Detect workflow completion
- Identify failed nodes

### useEntities

**Purpose:** Track entities with real-time movement

**Location:** `src/hooks/useEntities.ts`

```typescript
const { entities, entityProgress } = useEntities(canvasId);
```

**Subscription:**
- **Table:** `stitch_entities`
- **Filter:** `canvas_id=eq.{canvasId}`
- **Event:** `*` (INSERT, UPDATE, DELETE)

**Update Frequency:** Medium (entity movements, arrivals)

**Special Features:**
- Automatic animation triggering
- Local progress tracking
- Journey event integration

**Use Cases:**
- Display entities on canvas
- Animate entity travel
- Track entity counts
- Show entity details

### useFlow

**Purpose:** Subscribe to canvas graph changes

**Location:** `src/hooks/useFlow.ts`

```typescript
const { flow, loading, error } = useFlow(flowId, realtime);
```

**Subscription:**
- **Table:** `stitch_flows`
- **Filter:** `id=eq.{flowId}`
- **Event:** `UPDATE`

**Update Frequency:** Low (manual graph edits)

**Use Cases:**
- Multi-user canvas editing
- Version change detection
- Graph modification sync
- Metadata updates

## Animation Integration

### Entity Travel Animation

Stitch combines real-time updates with smooth animations for entity movement.

#### Animation Flow

```
1. Database Update
   current_edge_id: null → 'edge-1'
   
2. useEntities Detects Change
   if (updated.current_edge_id && !old.current_edge_id)
   
3. Trigger Animation
   animateEntityTravel({
     entityId,
     edgeId,
     destinationNodeId,
     duration: 2,
     onProgress: (progress) => {
       // Update local state for smooth rendering
       setEntityProgress(prev => 
         new Map(prev).set(entityId, progress)
       )
     },
     onComplete: () => {
       // Animation done, database will update
       setEntityProgress(prev => {
         const next = new Map(prev);
         next.delete(entityId);
         return next;
       })
     }
   })
   
4. Framer Motion Animation
   animate(0, 1, {
     duration: 2,
     ease: 'easeInOut',
     onUpdate: (progress) => onProgress(progress)
   })
   
5. Arrival
   arriveAtNode(entityId, nodeId)
   → Database update
   → Real-time event
   → Entity position updated
```

#### Local vs Database State

**Local State (entityProgress):**
- Updated 60 times per second during animation
- Not persisted to database
- Used for smooth visual rendering
- Cleared when animation completes

**Database State (current_edge_id, edge_progress):**
- Updated at start and end of travel
- Persisted for reliability
- Synced across all clients
- Source of truth for entity position

#### Why This Approach?

1. **Performance**: Avoid 60 database writes per second
2. **Smoothness**: Local state enables 60fps animations
3. **Reliability**: Database tracks actual position
4. **Sync**: All clients see entity traveling
5. **Recovery**: If client disconnects, entity position preserved

### Animation Implementation

**Location:** `src/lib/entities/travel.ts`

```typescript
export async function animateEntityTravel({
  entityId,
  edgeId,
  destinationNodeId,
  duration = 2,
  onProgress,
  onComplete
}: TravelConfig): Promise<void> {
  // Start the animation
  await animate(0, 1, {
    duration,
    ease: 'easeInOut',
    onUpdate: (progress) => {
      // Update local state for smooth animation
      onProgress?.(progress);
    },
    onComplete: async () => {
      // Animation finished, update database
      await arriveAtNode(entityId, destinationNodeId);
      onComplete?.();
    }
  });
}
```

**Key Points:**
- Uses Framer Motion for smooth easing
- Calls `onProgress` 60 times per second
- Updates database only on completion
- Async/await for proper sequencing

## Performance Optimization

### Reference Counting

**Problem:** Multiple components subscribing to the same data creates duplicate channels.

**Solution:** Reference counting in `useRealtimeSubscription`

```typescript
// Component A subscribes
useRealtimeSubscription(config, callbackA);
// → Creates channel, refCount = 1

// Component B subscribes (same config)
useRealtimeSubscription(config, callbackB);
// → Reuses channel, refCount = 2

// Component A unmounts
// → refCount = 1, channel stays open

// Component B unmounts
// → refCount = 0, channel closed
```

**Benefits:**
- Single WebSocket connection per unique subscription
- Reduced network overhead
- Lower memory usage
- Faster subscription setup

### Subscription Deduplication

**Key Generation:**
```typescript
const key = `${table}:${filter}:${event}`;
```

**Registry Lookup:**
```typescript
let entry = subscriptionRegistry.get(key);
if (entry) {
  // Reuse existing channel
  entry.refCount++;
  entry.callbacks.add(callback);
} else {
  // Create new channel
  const channel = supabase.channel(key).on(...).subscribe();
  entry = { channel, refCount: 1, callbacks: new Set([callback]) };
  subscriptionRegistry.set(key, entry);
}
```

### Callback Batching

When multiple callbacks are registered for the same channel:

```typescript
.on('postgres_changes', {...}, (payload) => {
  // Invoke all registered callbacks
  const entry = subscriptionRegistry.get(key);
  if (entry) {
    entry.callbacks.forEach((cb) => cb(payload));
  }
})
```

**Benefits:**
- Single event handler per channel
- All subscribers notified simultaneously
- Minimal processing overhead

### Mount Safety

Callbacks only fire if component is still mounted:

```typescript
const mountedRef = useRef(true);

const wrappedCallback = (payload: any) => {
  if (mountedRef.current) {
    callbackRef.current(payload);
  }
};

return () => {
  mountedRef.current = false;
  // Cleanup...
};
```

**Prevents:**
- State updates on unmounted components
- Memory leaks
- React warnings
- Stale closure issues

## Error Handling

### Connection Errors

```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setStatus('connected');
    setError(null);
  } else if (status === 'CHANNEL_ERROR') {
    setStatus('error');
    setError('Subscription failed');
  } else if (status === 'TIMED_OUT') {
    setStatus('error');
    setError('Subscription timed out');
  }
});
```

**Handling in Components:**

```typescript
const { status, error } = useRealtimeSubscription(config, callback);

if (status === 'connecting') {
  return <Spinner />;
}

if (error) {
  return <ErrorMessage message={error} />;
}
```

### Reconnection

Supabase handles reconnection automatically:

1. **Connection Lost**: WebSocket disconnects
2. **Automatic Retry**: Supabase attempts reconnection
3. **Exponential Backoff**: Retry delays increase
4. **Resubscribe**: Channels resubscribed on reconnect
5. **State Sync**: Components refetch initial state

**No manual intervention required.**

### Database Errors

If database update fails, real-time event won't fire:

```typescript
async function updateNodeState(runId: string, nodeId: string, state: NodeState) {
  const { error } = await supabase
    .from('stitch_runs')
    .update({ node_states: {...} })
    .eq('id', runId);

  if (error) {
    // Real-time subscribers won't receive update
    throw new Error(`Failed to update: ${error.message}`);
  }
}
```

**Mitigation:**
- Optimistic updates provide immediate feedback
- Error handling reverts optimistic changes
- User notified of failure
- Retry mechanisms for critical updates

## Testing Real-Time Features

### Unit Testing Hooks

**Location:** `src/hooks/__tests__/useRunStatus.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useRunStatus } from '../useRunStatus';

describe('useRunStatus', () => {
  it('fetches initial node states', async () => {
    const { result } = renderHook(() => useRunStatus('run-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.nodeStates).toBeDefined();
  });

  it('updates when subscription receives event', async () => {
    const { result } = renderHook(() => useRunStatus('run-123'));

    // Simulate real-time update
    await simulateSupabaseEvent({
      table: 'stitch_runs',
      event: 'UPDATE',
      new: { id: 'run-123', node_states: {...} }
    });

    await waitFor(() => {
      expect(result.current.nodeStates).toEqual({...});
    });
  });
});
```

### Integration Testing

Test real-time flow end-to-end:

```typescript
describe('Real-Time Workflow Execution', () => {
  it('updates UI when node completes', async () => {
    // 1. Render canvas with run
    render(<WorkflowCanvas flowId="flow-1" runId="run-1" />);

    // 2. Simulate worker callback
    await fetch('/api/stitch/callback/run-1/node-1', {
      method: 'POST',
      body: JSON.stringify({ status: 'completed', output: {...} })
    });

    // 3. Wait for real-time update
    await waitFor(() => {
      expect(screen.getByTestId('node-1')).toHaveClass('completed');
    });
  });
});
```

### Manual Testing

**Test Scenarios:**

1. **Multi-Tab Sync**:
   - Open canvas in two browser tabs
   - Modify graph in tab 1
   - Verify tab 2 updates automatically

2. **Entity Movement**:
   - Trigger workflow with entity
   - Watch entity animate across canvas
   - Verify smooth 2-second animation

3. **Execution Status**:
   - Start workflow run
   - Watch nodes change from pending → running → completed
   - Verify status updates in real-time

4. **Connection Loss**:
   - Disconnect network
   - Make changes
   - Reconnect network
   - Verify state syncs correctly

## Best Practices

### 1. Always Fetch Initial State

```typescript
// ✅ Good: Fetch then subscribe
useEffect(() => {
  fetchInitialData();
}, []);

useRealtimeSubscription(config, callback);

// ❌ Bad: Only subscribe
useRealtimeSubscription(config, callback);
```

**Why:** Subscription only receives future updates, not current state.

### 2. Use Conditional Subscriptions

```typescript
// ✅ Good: Only subscribe when needed
useRealtimeSubscription(
  config,
  callback,
  !!resourceId  // enabled parameter
);

// ❌ Bad: Always subscribe
useRealtimeSubscription(config, callback);
```

**Why:** Prevents unnecessary subscriptions and network traffic.

### 3. Handle Loading States

```typescript
// ✅ Good: Show loading indicator
if (loading) return <Spinner />;
if (error) return <Error message={error} />;
if (!data) return <Empty />;

// ❌ Bad: Render without checking
return <div>{data.name}</div>;
```

**Why:** Prevents rendering errors and improves UX.

### 4. Memoize Callbacks

```typescript
// ✅ Good: Stable callback reference
const handleUpdate = useCallback((payload) => {
  setState(payload.new);
}, []);

useRealtimeSubscription(config, handleUpdate);

// ❌ Bad: Inline callback
useRealtimeSubscription(config, (payload) => {
  setState(payload.new);
});
```

**Why:** Prevents unnecessary re-subscriptions.

### 5. Clean Up Side Effects

```typescript
// ✅ Good: Cleanup in useEffect
useEffect(() => {
  const animation = startAnimation();
  
  return () => {
    animation.cancel();
  };
}, []);

// ❌ Bad: No cleanup
useEffect(() => {
  startAnimation();
}, []);
```

**Why:** Prevents memory leaks and stale animations.

### 6. Use Optimistic Updates Sparingly

```typescript
// ✅ Good: Optimistic for user actions
async function handleSave() {
  setData(newData);  // Optimistic
  await saveToDatabase(newData);
}

// ❌ Bad: Optimistic for external events
useRealtimeSubscription(config, (payload) => {
  setData(payload.new);  // Just use real-time data
});
```

**Why:** Optimistic updates are for user-initiated changes only.

### 7. Monitor Subscription Count

```typescript
// Development only
useEffect(() => {
  const count = getActiveSubscriptionCount();
  console.log(`Active subscriptions: ${count}`);
}, []);
```

**Why:** Helps identify subscription leaks during development.

## Building Real-Time Features

This section provides practical guidance for frontend developers building new real-time features in Stitch.

### Development Workflow

When building a new real-time feature, follow this workflow:

```
1. Define Data Model
   ↓
2. Create Database Operations
   ↓
3. Build Custom Hook
   ↓
4. Implement UI Component
   ↓
5. Test Real-Time Behavior
   ↓
6. Optimize Performance
```

### Step 1: Define Your Data Model

Before implementing real-time features, clearly define what data you're tracking.

**Questions to Answer:**
- What database table(s) will you subscribe to?
- What events do you care about? (INSERT, UPDATE, DELETE, or all)
- What filters do you need? (specific ID, user, canvas, etc.)
- How frequently will updates occur? (high, medium, low)
- Do you need derived state from multiple tables?

**Example: Real-Time Comments Feature**

```typescript
// Data model
interface Comment {
  id: string;
  canvas_id: string;
  user_id: string;
  node_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Subscription requirements
// - Table: stitch_comments
// - Filter: canvas_id=eq.{canvasId}
// - Events: INSERT, UPDATE, DELETE
// - Frequency: Medium (user-driven)
```

### Step 2: Create Database Operations

Implement the database operations your feature needs.

**Location:** `src/lib/db/comments.ts` (create new file)

```typescript
import { supabase } from '@/lib/supabase/client';
import type { Comment } from '@/types/comment';

/**
 * Fetch all comments for a canvas
 */
export async function getComments(canvasId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('stitch_comments')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new comment
 */
export async function createComment(
  comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>
): Promise<Comment> {
  const { data, error } = await supabase
    .from('stitch_comments')
    .insert(comment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing comment
 */
export async function updateComment(
  commentId: string,
  updates: Partial<Comment>
): Promise<Comment> {
  const { data, error } = await supabase
    .from('stitch_comments')
    .update(updates)
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('stitch_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}
```

**Key Principles:**
- One file per database table
- Async functions with proper error handling
- Type-safe with TypeScript interfaces
- Clear function names describing the operation

### Step 3: Build a Custom Hook

Create a custom hook that combines initial data fetching with real-time subscriptions.

**Location:** `src/hooks/useComments.ts` (create new file)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { getComments } from '@/lib/db/comments';
import type { Comment } from '@/types/comment';

export function useComments(canvasId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial fetch
  useEffect(() => {
    if (!canvasId) {
      setComments([]);
      setLoading(false);
      return;
    }

    async function fetchComments() {
      try {
        setLoading(true);
        setError(null);
        const data = await getComments(canvasId);
        setComments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch comments');
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [canvasId]);

  // 2. Handle real-time INSERT events
  const handleInsert = useCallback((payload: any) => {
    const newComment = payload.new as Comment;
    setComments((prev) => [...prev, newComment]);
  }, []);

  // 3. Handle real-time UPDATE events
  const handleUpdate = useCallback((payload: any) => {
    const updatedComment = payload.new as Comment;
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === updatedComment.id ? updatedComment : comment
      )
    );
  }, []);

  // 4. Handle real-time DELETE events
  const handleDelete = useCallback((payload: any) => {
    const deletedId = payload.old.id;
    setComments((prev) => prev.filter((comment) => comment.id !== deletedId));
  }, []);

  // 5. Subscribe to INSERT events
  useRealtimeSubscription(
    {
      table: 'stitch_comments',
      filter: `canvas_id=eq.${canvasId}`,
      event: 'INSERT',
    },
    handleInsert,
    !!canvasId
  );

  // 6. Subscribe to UPDATE events
  useRealtimeSubscription(
    {
      table: 'stitch_comments',
      filter: `canvas_id=eq.${canvasId}`,
      event: 'UPDATE',
    },
    handleUpdate,
    !!canvasId
  );

  // 7. Subscribe to DELETE events
  useRealtimeSubscription(
    {
      table: 'stitch_comments',
      filter: `canvas_id=eq.${canvasId}`,
      event: 'DELETE',
    },
    handleDelete,
    !!canvasId
  );

  return {
    comments,
    loading,
    error,
  };
}
```

**Hook Pattern Breakdown:**

1. **State Management**: Track data, loading, and error states
2. **Initial Fetch**: Load existing data on mount
3. **Memoized Callbacks**: Stable callback references with `useCallback`
4. **Multiple Subscriptions**: Separate subscriptions for INSERT, UPDATE, DELETE
5. **Conditional Subscription**: Only subscribe when `canvasId` exists
6. **Type Safety**: Proper TypeScript types throughout

**Alternative: Single Subscription for All Events**

```typescript
// Subscribe to all events with a single subscription
const handleChange = useCallback((payload: any) => {
  if (payload.eventType === 'INSERT') {
    setComments((prev) => [...prev, payload.new]);
  } else if (payload.eventType === 'UPDATE') {
    setComments((prev) =>
      prev.map((c) => (c.id === payload.new.id ? payload.new : c))
    );
  } else if (payload.eventType === 'DELETE') {
    setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
  }
}, []);

useRealtimeSubscription(
  {
    table: 'stitch_comments',
    filter: `canvas_id=eq.${canvasId}`,
    event: '*', // All events
  },
  handleChange,
  !!canvasId
);
```

**When to Use Each Approach:**
- **Multiple Subscriptions**: When you need different handling logic for each event type
- **Single Subscription**: When handling logic is similar or you want fewer subscriptions

### Step 4: Implement UI Component

Build the UI component that uses your custom hook.

**Location:** `src/components/canvas/CommentPanel.tsx` (create new file)

```typescript
'use client';

import { useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { createComment, updateComment, deleteComment } from '@/lib/db/comments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';

interface CommentPanelProps {
  canvasId: string;
  nodeId?: string;
}

export function CommentPanel({ canvasId, nodeId }: CommentPanelProps) {
  const { comments, loading, error } = useComments(canvasId);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter comments by node if specified
  const filteredComments = nodeId
    ? comments.filter((c) => c.node_id === nodeId)
    : comments;

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      
      // Optimistic update
      const tempComment = {
        id: `temp-${Date.now()}`,
        canvas_id: canvasId,
        node_id: nodeId || null,
        content: newComment,
        user_id: 'current-user', // Get from auth
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add to local state immediately
      setComments((prev) => [...prev, tempComment]);
      setNewComment('');

      // Save to database
      await createComment({
        canvas_id: canvasId,
        node_id: nodeId || null,
        content: newComment,
        user_id: 'current-user',
      });

      // Real-time subscription will update with actual data
    } catch (err) {
      console.error('Failed to create comment:', err);
      // Revert optimistic update
      setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
      setNewComment(newComment); // Restore input
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading comments: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredComments.length === 0 ? (
          <p className="text-gray-500 text-center">No comments yet</p>
        ) : (
          filteredComments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm">{comment.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(comment.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* New comment input */}
      <div className="border-t p-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="mb-2"
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </div>
  );
}
```

**Component Pattern Breakdown:**

1. **Use Custom Hook**: Get real-time data with `useComments`
2. **Loading States**: Show spinner while fetching
3. **Error Handling**: Display error messages
4. **Optimistic Updates**: Update UI immediately, then save to database
5. **Real-Time Updates**: Automatic updates from other users via subscription
6. **User Feedback**: Disable buttons during submission

### Step 5: Test Real-Time Behavior

Test your feature to ensure real-time updates work correctly.

#### Manual Testing Checklist

**Single User:**
- ✅ Initial data loads correctly
- ✅ Creating new items updates UI immediately
- ✅ Updating items reflects changes
- ✅ Deleting items removes from UI
- ✅ Loading states display correctly
- ✅ Error states display correctly

**Multi-User (Two Browser Tabs):**
- ✅ Tab 1 creates item → Tab 2 sees it appear
- ✅ Tab 1 updates item → Tab 2 sees changes
- ✅ Tab 1 deletes item → Tab 2 sees it disappear
- ✅ Both tabs can create items simultaneously
- ✅ Updates appear within 100-300ms

**Network Conditions:**
- ✅ Disconnect network → Make changes → Reconnect → Changes sync
- ✅ Slow network → Optimistic updates still feel instant
- ✅ Connection loss → Reconnection works automatically

#### Automated Testing

**Unit Test Example:**

```typescript
// src/hooks/__tests__/useComments.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useComments } from '../useComments';
import { createComment } from '@/lib/db/comments';

describe('useComments', () => {
  it('fetches initial comments', async () => {
    const { result } = renderHook(() => useComments('canvas-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toHaveLength(3);
  });

  it('adds new comment via real-time subscription', async () => {
    const { result } = renderHook(() => useComments('canvas-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.comments.length;

    // Simulate another user creating a comment
    await createComment({
      canvas_id: 'canvas-1',
      node_id: 'node-1',
      content: 'Test comment',
      user_id: 'user-2',
    });

    // Wait for real-time update
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(initialCount + 1);
    });

    const newComment = result.current.comments[result.current.comments.length - 1];
    expect(newComment.content).toBe('Test comment');
  });
});
```

### Step 6: Optimize Performance

After your feature works, optimize for performance.

#### Optimization Checklist

**1. Minimize Re-Renders**

```typescript
// ✅ Memoize expensive computations
const sortedComments = useMemo(() => {
  return comments.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}, [comments]);

// ✅ Memoize callbacks
const handleDelete = useCallback(async (id: string) => {
  await deleteComment(id);
}, []);

// ✅ Memoize components
const CommentItem = memo(({ comment }: { comment: Comment }) => {
  return <div>{comment.content}</div>;
});
```

**2. Reduce Subscription Count**

```typescript
// ❌ Bad: Multiple subscriptions for same data
function ComponentA() {
  useComments(canvasId); // Subscription 1
}

function ComponentB() {
  useComments(canvasId); // Subscription 2 (duplicate!)
}

// ✅ Good: Lift state to common parent
function ParentComponent() {
  const { comments } = useComments(canvasId); // Single subscription
  
  return (
    <>
      <ComponentA comments={comments} />
      <ComponentB comments={comments} />
    </>
  );
}
```

**3. Implement Pagination**

For large datasets, paginate to reduce initial load:

```typescript
export function useComments(canvasId: string, limit = 50, offset = 0) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    async function fetchComments() {
      const { data, count } = await supabase
        .from('stitch_comments')
        .select('*', { count: 'exact' })
        .eq('canvas_id', canvasId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      setComments(data || []);
      setHasMore((count || 0) > offset + limit);
    }

    fetchComments();
  }, [canvasId, limit, offset]);

  // Still subscribe to all new comments
  useRealtimeSubscription(
    {
      table: 'stitch_comments',
      filter: `canvas_id=eq.${canvasId}`,
      event: 'INSERT',
    },
    (payload) => {
      setComments((prev) => [payload.new, ...prev]);
    },
    !!canvasId
  );

  return { comments, hasMore };
}
```

**4. Debounce Frequent Updates**

For high-frequency updates, debounce to reduce re-renders:

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function EntityCounter() {
  const { entities } = useEntities(canvasId);
  
  // Debounce entity count updates
  const debouncedCount = useDebouncedValue(entities.length, 300);

  return <div>Entities: {debouncedCount}</div>;
}
```

**5. Virtualize Long Lists**

For very long lists, use virtualization:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function CommentList({ comments }: { comments: Comment[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: comments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated comment height
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const comment = comments[virtualItem.index];
          return (
            <div
              key={comment.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <CommentItem comment={comment} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Common Real-Time Patterns

#### Pattern 1: Presence (Who's Online)

Track which users are currently viewing a canvas:

```typescript
export function usePresence(canvasId: string) {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`presence:${canvasId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const userIds = Object.keys(state);
        setUsers(userIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setUsers((prev) => [...prev, key]);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setUsers((prev) => prev.filter((id) => id !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: 'current-user' });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [canvasId]);

  return users;
}
```

#### Pattern 2: Broadcast (Ephemeral Messages)

Send temporary messages without database persistence:

```typescript
export function useCursorBroadcast(canvasId: string) {
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );

  useEffect(() => {
    const channel = supabase.channel(`cursors:${canvasId}`);

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(payload.userId, { x: payload.x, y: payload.y });
          return next;
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [canvasId]);

  const sendCursor = (x: number, y: number) => {
    const channel = supabase.channel(`cursors:${canvasId}`);
    channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId: 'current-user', x, y },
    });
  };

  return { cursors, sendCursor };
}
```

#### Pattern 3: Optimistic Mutations

Update UI immediately, then sync with database:

```typescript
export function useOptimisticComments(canvasId: string) {
  const { comments, loading, error } = useComments(canvasId);
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);

  // Merge real and optimistic comments
  const allComments = useMemo(() => {
    return [...comments, ...optimisticComments];
  }, [comments, optimisticComments]);

  const addComment = async (content: string) => {
    const tempId = `temp-${Date.now()}`;
    const tempComment: Comment = {
      id: tempId,
      canvas_id: canvasId,
      content,
      user_id: 'current-user',
      node_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optimistic comment
    setOptimisticComments((prev) => [...prev, tempComment]);

    try {
      // Save to database
      await createComment({
        canvas_id: canvasId,
        content,
        user_id: 'current-user',
        node_id: null,
      });

      // Remove optimistic comment (real one will come via subscription)
      setOptimisticComments((prev) => prev.filter((c) => c.id !== tempId));
    } catch (err) {
      // Remove failed optimistic comment
      setOptimisticComments((prev) => prev.filter((c) => c.id !== tempId));
      throw err;
    }
  };

  return { comments: allComments, loading, error, addComment };
}
```

#### Pattern 4: Conflict Resolution

Handle concurrent updates from multiple users:

```typescript
export function useConflictResolution(canvasId: string) {
  const [localVersion, setLocalVersion] = useState(0);
  const [serverVersion, setServerVersion] = useState(0);

  useRealtimeSubscription(
    {
      table: 'stitch_flows',
      filter: `id=eq.${canvasId}`,
      event: 'UPDATE',
    },
    (payload) => {
      const newVersion = payload.new.version;

      if (newVersion > localVersion) {
        // Server has newer version, accept it
        setServerVersion(newVersion);
        setLocalVersion(newVersion);
      } else if (newVersion < localVersion) {
        // Conflict detected! Local changes not yet saved
        console.warn('Conflict detected, local changes may be lost');
        // Implement conflict resolution strategy:
        // 1. Last-write-wins (accept server version)
        // 2. Merge changes (complex)
        // 3. Prompt user to resolve
      }
    },
    !!canvasId
  );

  return { localVersion, serverVersion };
}
```

### Debugging Real-Time Features

#### Enable Debug Logging

```typescript
// Add to your hook during development
useEffect(() => {
  console.log('[useComments] Subscribing to:', {
    table: 'stitch_comments',
    filter: `canvas_id=eq.${canvasId}`,
  });

  return () => {
    console.log('[useComments] Unsubscribing');
  };
}, [canvasId]);

// Log subscription events
useRealtimeSubscription(
  config,
  (payload) => {
    console.log('[useComments] Received event:', payload);
    handleUpdate(payload);
  },
  enabled
);
```

#### Monitor Subscription Count

```typescript
// Create a debug hook
export function useSubscriptionDebug() {
  useEffect(() => {
    const interval = setInterval(() => {
      const count = getActiveSubscriptionCount();
      console.log(`[Debug] Active subscriptions: ${count}`);
    }, 5000);

    return () => clearInterval(interval);
  }, []);
}

// Use in development
function App() {
  useSubscriptionDebug();
  return <YourApp />;
}
```

#### Inspect Supabase Channels

```typescript
// Access Supabase client directly
import { supabase } from '@/lib/supabase/client';

// Log all active channels
console.log('Active channels:', supabase.getChannels());

// Inspect specific channel
const channel = supabase.channel('stitch_runs:id=eq.123:UPDATE');
console.log('Channel state:', channel.state);
```

### Real-Time Feature Checklist

Before shipping a real-time feature, verify:

**Functionality:**
- ✅ Initial data loads correctly
- ✅ Real-time updates work for INSERT, UPDATE, DELETE
- ✅ Multi-user sync works (test with two tabs)
- ✅ Optimistic updates provide instant feedback
- ✅ Error handling works (network errors, database errors)
- ✅ Loading states display correctly

**Performance:**
- ✅ No duplicate subscriptions
- ✅ Callbacks are memoized
- ✅ Expensive computations are memoized
- ✅ Large lists are paginated or virtualized
- ✅ Subscription count is reasonable (<10 per page)

**Reliability:**
- ✅ Subscriptions clean up on unmount
- ✅ No memory leaks
- ✅ Reconnection works after network loss
- ✅ Stale data doesn't persist
- ✅ Race conditions handled

**User Experience:**
- ✅ Updates feel instant (optimistic updates)
- ✅ Loading states are clear
- ✅ Error messages are helpful
- ✅ No UI jank or flashing
- ✅ Animations are smooth

**Code Quality:**
- ✅ TypeScript types are correct
- ✅ Code is well-documented
- ✅ Tests cover main scenarios
- ✅ Follows Stitch patterns
- ✅ No console errors or warnings

## Troubleshooting

### Issue: Updates Not Received

**Symptoms:** Component doesn't update when database changes

**Checklist:**
1. ✅ Is subscription enabled? Check `enabled` parameter
2. ✅ Is filter correct? Verify `filter` matches database value
3. ✅ Is table name correct? Check for typos
4. ✅ Is component mounted? Check mount safety
5. ✅ Is callback firing? Add console.log in callback
6. ✅ Is database actually updating? Check Supabase dashboard

**Common Causes:**
- Filter doesn't match (e.g., `id=eq.123` but ID is `'abc'`)
- Subscription disabled (`enabled: false`)
- Component unmounted before update received
- Database update failed silently

### Issue: Duplicate Subscriptions

**Symptoms:** Multiple channels for same data, high network usage

**Checklist:**
1. ✅ Are you using `useRealtimeSubscription`? (Not raw Supabase)
2. ✅ Is config stable? Memoize config object
3. ✅ Is callback stable? Use `useCallback`
4. ✅ Check subscription count with `getActiveSubscriptionCount()`

**Solution:**
```typescript
// ✅ Stable config
const config = useMemo(() => ({
  table: 'stitch_runs',
  filter: `id=eq.${runId}`,
  event: 'UPDATE',
}), [runId]);

const callback = useCallback((payload) => {
  setState(payload.new);
}, []);

useRealtimeSubscription(config, callback);
```

### Issue: Memory Leaks

**Symptoms:** Memory usage grows over time, subscriptions not cleaned up

**Checklist:**
1. ✅ Are you using hooks? (Not manual subscriptions)
2. ✅ Are callbacks wrapped with mount safety?
3. ✅ Are animations cleaned up?
4. ✅ Are timers cleared?

**Solution:** Use hooks, they handle cleanup automatically.

### Issue: Stale Data

**Symptoms:** Component shows old data after update

**Checklist:**
1. ✅ Is initial fetch happening? Check `useEffect`
2. ✅ Is subscription callback updating state?
3. ✅ Is state update batched? Check React 18 automatic batching
4. ✅ Is component re-rendering? Check React DevTools

**Solution:**
```typescript
// Ensure initial fetch
useEffect(() => {
  fetchData();
}, [id]);

// Ensure subscription updates state
useRealtimeSubscription(config, (payload) => {
  setState(payload.new);  // Must call setState
});
```

### Issue: Animation Jank

**Symptoms:** Entity animations are choppy or laggy

**Checklist:**
1. ✅ Is progress stored in local state? (Not database)
2. ✅ Is Framer Motion installed?
3. ✅ Is animation duration reasonable? (2 seconds recommended)
4. ✅ Are there too many entities? (Consider virtualization)

**Solution:**
```typescript
// ✅ Local state for smooth animation
const [entityProgress, setEntityProgress] = useState(new Map());

animateEntityTravel({
  onProgress: (progress) => {
    setEntityProgress(prev => new Map(prev).set(id, progress));
  }
});
```

## Related Documentation

- **[React Hooks](./hooks.md)**: Detailed hook documentation
- **[Entity Visualization](./entity-visualization.md)**: Entity rendering and animations
- **[Database Layer](../backend/database-layer.md)**: Database operations and schema
- **[Data Flow](../architecture/data-flow.md)**: System-wide data flow patterns
- **[Execution Model](../architecture/execution-model.md)**: Workflow execution architecture
