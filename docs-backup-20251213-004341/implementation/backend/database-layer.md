# Database Layer

## Overview

The database layer provides a comprehensive abstraction over Supabase PostgreSQL operations for the Stitch platform. It implements atomic operations, race condition prevention, and consistent error handling across all database interactions.

**Key Principles:**
- **Database as Source of Truth**: All state persists to the database immediately
- **Atomic Operations**: Critical updates use PostgreSQL RPC functions to prevent race conditions
- **Admin Client Pattern**: Webhook and callback endpoints use admin client to bypass RLS
- **Validation Before Persistence**: Status transitions and data integrity validated before writes

## Database Schema Overview

### Core Tables

#### stitch_flows
Stores flow metadata and serves as a container for versions.

```sql
CREATE TABLE stitch_flows (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  graph JSONB NOT NULL,              -- Legacy: Empty in versioned flows
  canvas_type TEXT,                   -- 'bmc', 'workflow', 'detail'
  parent_id UUID,                     -- For nested canvases
  current_version_id UUID,            -- Points to active version
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_stitch_flows_created_at` - Chronological ordering
- `idx_stitch_flows_current_version_id` - Version lookups

#### stitch_flow_versions
Immutable snapshots of flow canvases with both visual and execution graphs.

```sql
CREATE TABLE stitch_flow_versions (
  id UUID PRIMARY KEY,
  flow_id UUID NOT NULL,
  visual_graph JSONB NOT NULL,       -- UI representation with positions/styles
  execution_graph JSONB NOT NULL,    -- Optimized runtime graph
  commit_message TEXT,
  created_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_flow_versions_flow_id` - Version queries by flow
- `idx_flow_versions_created_at` - Chronological ordering

**Foreign Keys:**
- `flow_id` → `stitch_flows(id)` ON DELETE CASCADE

#### stitch_runs
Tracks workflow execution state with per-node status.

```sql
CREATE TABLE stitch_runs (
  id UUID PRIMARY KEY,
  flow_id UUID NOT NULL,
  flow_version_id UUID,              -- Links to specific version
  node_states JSONB NOT NULL,        -- { nodeId: { status, output, error } }
  entity_id UUID,                    -- Optional entity link
  trigger JSONB NOT NULL,            -- Trigger metadata
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_stitch_runs_flow_id` - Runs by flow
- `idx_stitch_runs_flow_version_id` - Runs by version
- `idx_stitch_runs_entity_id` - Runs by entity
- `idx_stitch_runs_created_at` - Chronological ordering

**Foreign Keys:**
- `flow_id` → `stitch_flows(id)` ON DELETE CASCADE
- `flow_version_id` → `stitch_flow_versions(id)` ON DELETE SET NULL
- `entity_id` → `stitch_entities(id)` ON DELETE SET NULL

#### stitch_entities
Tracks individual customers/leads and their position in workflows.

```sql
CREATE TABLE stitch_entities (
  id UUID PRIMARY KEY,
  canvas_id UUID NOT NULL,
  entity_type TEXT NOT NULL,         -- 'customer', 'lead', 'churned'
  name TEXT NOT NULL,
  email TEXT,
  metadata JSONB,
  current_node_id TEXT,              -- At node (mutually exclusive with edge)
  current_edge_id TEXT,              -- On edge (mutually exclusive with node)
  edge_progress NUMERIC(3,2),       -- 0.0 to 1.0
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  -- Constraints ensure position is either node OR edge, not both
  CONSTRAINT check_position_exclusivity CHECK (
    (current_node_id IS NOT NULL AND current_edge_id IS NULL AND edge_progress IS NULL) OR
    (current_node_id IS NULL AND current_edge_id IS NOT NULL AND edge_progress IS NOT NULL) OR
    (current_node_id IS NULL AND current_edge_id IS NULL AND edge_progress IS NULL)
  ),
  CONSTRAINT check_edge_progress_range CHECK (
    edge_progress IS NULL OR (edge_progress >= 0.0 AND edge_progress <= 1.0)
  )
);
```

**Indexes:**
- `idx_stitch_entities_canvas_id` - Entities by canvas
- `idx_stitch_entities_current_edge_id` - Entities on edge
- `idx_stitch_entities_current_node_id` - Entities at node

#### stitch_journey_events
Audit log of entity movement through workflows.

```sql
CREATE TABLE stitch_journey_events (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,          -- 'edge_start', 'node_arrival', etc.
  node_id TEXT,
  edge_id TEXT,
  progress NUMERIC(3,2),
  metadata JSONB,
  timestamp TIMESTAMPTZ
);
```

**Indexes:**
- `idx_journey_events_entity_id` - Events by entity
- `idx_journey_events_timestamp` - Chronological ordering
- `idx_journey_events_event_type` - Filter by type
- `idx_journey_events_edge_id` - Events by edge
- `idx_journey_events_node_id` - Events by node

**Foreign Keys:**
- `entity_id` → `stitch_entities(id)` ON DELETE CASCADE

#### stitch_webhook_configs
Webhook endpoint configurations for external integrations.

```sql
CREATE TABLE stitch_webhook_configs (
  id UUID PRIMARY KEY,
  canvas_id UUID NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL,              -- 'stripe', 'typeform', 'calendly', etc.
  endpoint_slug TEXT NOT NULL UNIQUE,
  secret TEXT,
  workflow_id UUID NOT NULL,
  entry_edge_id TEXT NOT NULL,
  entity_mapping JSONB NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_webhook_configs_endpoint_slug` - Lookup by slug
- `idx_webhook_configs_canvas_id` - Configs by canvas
- `idx_webhook_configs_workflow_id` - Configs by workflow

**Foreign Keys:**
- `canvas_id` → `stitch_flows(id)` ON DELETE CASCADE
- `workflow_id` → `stitch_flows(id)` ON DELETE CASCADE

#### stitch_webhook_events
Audit log of webhook deliveries and processing.

```sql
CREATE TABLE stitch_webhook_events (
  id UUID PRIMARY KEY,
  webhook_config_id UUID NOT NULL,
  received_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  entity_id UUID,
  workflow_run_id UUID,
  status TEXT NOT NULL,              -- 'pending', 'completed', 'failed'
  error TEXT,
  processed_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_webhook_events_config_id` - Events by config
- `idx_webhook_events_received_at` - Chronological ordering
- `idx_webhook_events_status` - Filter by status

**Foreign Keys:**
- `webhook_config_id` → `stitch_webhook_configs(id)` ON DELETE CASCADE
- `entity_id` → `stitch_entities(id)` ON DELETE SET NULL
- `workflow_run_id` → `stitch_runs(id)` ON DELETE SET NULL

## Database Operations

### Flow Operations (`src/lib/db/flows.ts`)

#### createFlow()
Creates a legacy flow without versioning (deprecated for new code).

```typescript
await createFlow(
  'My Workflow',
  { nodes: [], edges: [] },
  'workflow',
  parentId
);
```

**Requirements:** 1.1

#### createFlowWithVersion()
**Recommended:** Creates flow with initial version and OEG compilation.

```typescript
const { flow, versionId } = await createFlowWithVersion(
  'My Workflow',
  visualGraph,
  'workflow',
  parentId,
  'Initial version'
);
```

**Process:**
1. Create flow record (metadata container)
2. Create initial version with visual and execution graphs
3. Update flow's current_version_id

**Requirements:** 1.1, 1.6, 5.6

#### getFlow() / getFlowAdmin()
Retrieves flow by ID with optional version data.

```typescript
// With auth (server components)
const flow = await getFlow(flowId, includeCurrentVersion);

// Without auth (webhooks/callbacks)
const flow = await getFlowAdmin(flowId, includeCurrentVersion);
```

**Admin Pattern:** Webhook endpoints use `getFlowAdmin()` to bypass RLS when no user session exists.

#### getAllFlows()
Lists all flows with optional version data.

```typescript
const flows = await getAllFlows(includeCurrentVersion);
```

#### updateFlow()
**⚠️ DEPRECATED for graph updates:** Only use for metadata (name).

```typescript
// ✅ CORRECT: Update metadata only
await updateFlow(flowId, { name: 'New Name' });

// ❌ WRONG: Bypasses versioning!
await updateFlow(flowId, { graph: newGraph });
```

**Critical Warning:** Updating `graph` directly bypasses:
- OEG compiler
- Version management
- current_version_id synchronization

**Correct Approach:** Use `createVersion()` from version-manager.ts

#### deleteFlow()
Deletes flow and cascades to versions and runs.

```typescript
await deleteFlow(flowId);
```

### Run Operations (`src/lib/db/runs.ts`)

#### createRun() / createRunAdmin()
Creates new run with all nodes initialized to 'pending'.

```typescript
// With auth
const run = await createRun(flowId, {
  flow_version_id: versionId,  // Optional: defaults to current_version_id
  entity_id: entityId,          // Optional: for entity-linked runs
  trigger: {                    // Optional: defaults to manual trigger
    type: 'webhook',
    source: 'stripe',
    event_id: webhookEventId,
    timestamp: new Date().toISOString()
  }
});

// Without auth (webhooks)
const run = await createRunAdmin(flowId, options);
```

**Process:**
1. Resolve version (use provided or get current from flow)
2. Initialize all nodes to 'pending' from execution graph
3. Insert run with optional entity_id and trigger metadata

**Requirements:** 1.3, 5.2

#### getRun() / getRunAdmin()
Retrieves run by ID.

```typescript
const run = await getRun(runId);
const run = await getRunAdmin(runId); // For webhooks
```

#### getRunsForFlow()
Lists all runs for a flow, ordered by creation date.

```typescript
const runs = await getRunsForFlow(flowId);
```

#### updateNodeState()
**Atomic:** Updates single node state using PostgreSQL RPC.

```typescript
const updatedRun = await updateNodeState(runId, nodeId, {
  status: 'completed',
  output: { result: 'success' },
  error: null
});
```

**Race Condition Prevention:**
- Uses `update_node_state` RPC function
- Single database operation with `jsonb_set`
- Validates status transitions before update
- Always uses admin client for webhook callbacks

**Requirements:** 7.2, 7.5, 11.2, 11.5

#### updateNodeStates()
Updates multiple node states (for bulk operations like splitter initialization).

```typescript
const updatedRun = await updateNodeStates(runId, {
  'node-1': { status: 'running' },
  'node-2': { status: 'running' },
  'node-3': { status: 'running' }
});
```

**Note:** Still has read-modify-write pattern but used in single-threaded scenarios.

**Requirements:** 7.2, 7.5, 11.2, 11.5

#### deleteRun()
Deletes run.

```typescript
await deleteRun(runId);
```

### Entity Operations (`src/lib/db/entities.ts`)

#### startJourney()
**Atomic:** Moves entity to edge with progress 0.0.

```typescript
const entity = await startJourney(entityId, edgeId);
```

**Process:**
1. Update entity (clear node, set edge, progress = 0.0)
2. Create journey event with type 'edge_start'
3. Both operations in single transaction via RPC

**Requirements:** 6.1, 6.2, 3.1

#### moveAlongEdge()
Updates entity progress along edge (0.0 to 1.0).

```typescript
const entity = await moveAlongEdge(entityId, 0.5);
```

**Validation:**
- Progress must be between 0.0 and 1.0
- Entity must be on an edge (current_edge_id not null)

**Requirements:** 6.3, 6.4, 1.4

#### arriveAtNode()
**Atomic:** Moves entity to node (clears edge position).

```typescript
const entity = await arriveAtNode(entityId, nodeId);
```

**Process:**
1. Update entity (set node, clear edge and progress)
2. Create journey event with type 'node_arrival'
3. Both operations in single transaction via RPC

**Requirements:** 6.5, 6.6, 2.5

#### getEntitiesAtNode()
Queries entities at specific node, scoped by canvas.

```typescript
const entities = await getEntitiesAtNode(canvasId, nodeId);
```

**Canvas Scoping:** Prevents data leakage between canvases.

**Requirements:** 2.3

#### getEntitiesOnEdge()
Queries entities on specific edge, scoped by canvas.

```typescript
const entities = await getEntitiesOnEdge(canvasId, edgeId);
```

**Requirements:** 2.4

#### getJourneyHistory()
Retrieves complete journey history for entity.

```typescript
const events = await getJourneyHistory(entityId);
```

**Returns:** Array of journey events ordered chronologically.

**Requirements:** 3.4

#### createJourneyEvent()
Creates journey event for entity movement.

```typescript
await createJourneyEvent(
  entityId,
  'node_arrival',
  nodeId,
  null,
  null,
  { completion_status: 'success' }
);
```

**Event Types:**
- `edge_start` - Entity starts moving on edge
- `edge_progress` - Entity progress update
- `node_arrival` - Entity arrives at node
- `node_complete` - Node processing complete
- `manual_move` - Manual entity movement

#### moveEntityToSection()
Moves entity to target section (for worker node entity movement).

```typescript
const entity = await moveEntityToSection(
  entityId,
  targetSectionId,
  'success',
  { reason: 'workflow_complete' },
  'customer' // Optional: convert lead → customer
);
```

**Process:**
1. Update entity's current_node_id to target section
2. Clear edge position
3. Optionally convert entity_type
4. Create journey event with metadata

**Requirements:** 5.3, 5.4

### Version Operations (`src/lib/canvas/version-manager.ts`)

#### createVersion()
Creates new version with OEG compilation.

```typescript
const { versionId, executionGraph } = await createVersion(
  flowId,
  visualGraph,
  'Added new worker node'
);
```

**Process:**
1. Compile visual graph to OEG (validates and optimizes)
2. Insert version record with both graphs
3. Update current_version_id in stitch_flows

**Validation:** Throws `ValidationFailureError` if graph invalid.

**Requirements:** 1.2, 1.5, 10.1, 10.2, 10.3

#### getVersion() / getVersionAdmin()
Retrieves version by ID.

```typescript
const version = await getVersion(versionId);
const version = await getVersionAdmin(versionId); // For webhooks
```

**Requirements:** 10.4

#### listVersions()
Lists version metadata (excludes heavy graph blobs).

```typescript
const versions = await listVersions(flowId);
```

**Performance:** Only selects `id, flow_id, commit_message, created_at` to avoid downloading megabytes of JSON.

**Requirements:** 10.5

#### autoVersionOnRun()
Auto-creates version if unsaved changes detected.

```typescript
const versionId = await autoVersionOnRun(flowId, currentVisualGraph);
```

**Process:**
1. Get current version from flow
2. If no version exists, create first version
3. If version exists, compare with current graph
4. If changes detected, create new version
5. Return version ID to use for run

**Requirements:** 5.1

### Webhook Operations

#### Webhook Configs (`src/lib/db/webhook-configs.ts`)

**createWebhookConfig()**
```typescript
const config = await createWebhookConfig({
  canvas_id: canvasId,
  name: 'Stripe Payments',
  source: 'stripe',
  endpoint_slug: 'stripe-payments',
  secret: 'whsec_...',
  workflow_id: workflowId,
  entry_edge_id: 'edge-1',
  entity_mapping: { name: '$.customer.name', email: '$.customer.email' },
  is_active: true
});
```

**Requirements:** 1.1, 1.2

**getWebhookConfigBySlug() / getWebhookConfigBySlugAdmin()**
```typescript
const config = await getWebhookConfigBySlug('stripe-payments');
const config = await getWebhookConfigBySlugAdmin('stripe-payments'); // For webhooks
```

**Requirements:** 1.2, 1.4

**getWebhookConfigsByCanvas()**
```typescript
const configs = await getWebhookConfigsByCanvas(canvasId);
```

**Requirements:** 1.3, 1.4

**updateWebhookConfig()**
```typescript
const config = await updateWebhookConfig(id, {
  is_active: false,
  entity_mapping: newMapping
});
```

**Requirements:** 1.4

**deleteWebhookConfig()**
```typescript
await deleteWebhookConfig(id);
```

**Requirements:** 1.3

#### Webhook Events (`src/lib/db/webhook-events.ts`)

**createWebhookEvent()**
```typescript
const event = await createWebhookEvent({
  webhook_config_id: configId,
  payload: webhookPayload,
  entity_id: null,
  workflow_run_id: null,
  status: 'pending',
  error: null
});
```

**Requirements:** 2.1

**updateWebhookEvent()**
```typescript
const event = await updateWebhookEvent(eventId, {
  status: 'completed',
  entity_id: entityId,
  workflow_run_id: runId
});
```

**Auto-timestamps:** Sets `processed_at` when status changes to 'completed' or 'failed'.

**Requirements:** 2.2, 2.3, 2.4

**getWebhookEventsByConfig()**
```typescript
const events = await getWebhookEventsByConfig(configId);
```

**Requirements:** 2.5

**getWebhookEventById() / getWebhookEventByIdAdmin()**
```typescript
const event = await getWebhookEventById(eventId);
const event = await getWebhookEventByIdAdmin(eventId); // For webhooks
```

## Atomic Update Patterns

### Problem: Race Conditions in Concurrent Updates

When multiple workers complete simultaneously, naive read-modify-write patterns cause lost updates:

```typescript
// ❌ WRONG: Race condition
const run = await getRun(runId);
run.node_states[nodeId] = newState;
await updateRun(runId, { node_states: run.node_states });
```

**Scenario:**
1. Worker A reads run (node-1: pending, node-2: pending)
2. Worker B reads run (node-1: pending, node-2: pending)
3. Worker A writes (node-1: completed, node-2: pending)
4. Worker B writes (node-1: pending, node-2: completed)
5. **Result:** Worker A's update is lost!

### Solution: PostgreSQL RPC Functions

#### update_node_state RPC
Atomic single-node update using `jsonb_set`:

```sql
CREATE FUNCTION update_node_state(
  p_run_id UUID,
  p_node_id TEXT,
  p_status TEXT,
  p_output JSONB,
  p_error TEXT
) RETURNS TABLE(...) AS $
BEGIN
  UPDATE stitch_runs
  SET node_states = jsonb_set(
    node_states,
    array[p_node_id],
    jsonb_build_object('status', p_status, 'output', p_output, 'error', p_error),
    true
  )
  WHERE id = p_run_id
  RETURNING *;
END;
$;
```

**Benefits:**
- Single database operation
- No read-modify-write race
- Atomic at PostgreSQL level

#### Atomic Entity Movement RPCs

**start_journey()**
```sql
CREATE FUNCTION start_journey(p_entity_id UUID, p_edge_id TEXT)
RETURNS SETOF stitch_entities AS $
BEGIN
  -- 1. Update entity
  UPDATE stitch_entities
  SET current_edge_id = p_edge_id,
      edge_progress = 0.0,
      current_node_id = null
  WHERE id = p_entity_id
  RETURNING * INTO v_updated_entity;
  
  -- 2. Log event
  INSERT INTO stitch_journey_events (entity_id, event_type, edge_id, progress)
  VALUES (p_entity_id, 'edge_start', p_edge_id, 0.0);
  
  RETURN NEXT v_updated_entity;
END;
$;
```

**arrive_at_node()**
```sql
CREATE FUNCTION arrive_at_node(p_entity_id UUID, p_node_id TEXT)
RETURNS SETOF stitch_entities AS $
BEGIN
  -- 1. Update entity
  UPDATE stitch_entities
  SET current_node_id = p_node_id,
      current_edge_id = null,
      edge_progress = null
  WHERE id = p_entity_id
  RETURNING * INTO v_updated_entity;
  
  -- 2. Log event
  INSERT INTO stitch_journey_events (entity_id, event_type, node_id)
  VALUES (p_entity_id, 'node_arrival', p_node_id);
  
  RETURN NEXT v_updated_entity;
END;
$;
```

**Benefits:**
- Entity update + event logging in single transaction
- Guaranteed consistency
- No partial updates

## Admin Client Pattern

### Problem: RLS Blocks Webhook Callbacks

Webhook endpoints receive callbacks without user authentication:
- No cookies
- No session
- RLS policies block access

### Solution: Admin Client with Service Role

```typescript
// ❌ WRONG: Uses user session (doesn't exist in webhooks)
const supabase = createServerClient();

// ✅ CORRECT: Uses service role key
const supabase = getAdminClient();
```

**When to Use Admin Client:**
- Webhook receivers (`/api/webhooks/[endpoint_slug]`)
- Worker callbacks (`/api/stitch/callback/[runId]/[nodeId]`)
- Background jobs
- Server-side operations without user context

**Security Note:** Admin client bypasses RLS. Only use in trusted server-side code.

## Status Transition Validation

### Enforced State Machine

Before updating node states, validate transitions:

```typescript
import { validateTransition } from '../engine/status-transitions';

// Validate before update
validateTransition(currentStatus, newStatus);
```

**Valid Transitions:**
- `pending` → `running`
- `running` → `completed`
- `running` → `failed`
- `pending` → `skipped`

**Invalid Transitions:**
- `completed` → `running` (can't restart)
- `failed` → `completed` (can't change outcome)
- `pending` → `completed` (must go through running)

**Implementation:** Both `updateNodeState()` and `updateNodeStates()` validate transitions before persisting.

## Error Handling

### DatabaseError Class

Consistent error handling across all operations:

```typescript
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

### Error Handling Utilities

**handleDatabaseError()**
```typescript
export function handleDatabaseError(error: unknown, operation: string): never {
  if (error && typeof error === 'object' && 'message' in error) {
    const dbError = error as { message: string; code?: string };
    throw new DatabaseError(
      `Database error during ${operation}: ${dbError.message}`,
      dbError.code
    );
  }
  throw new DatabaseError(`Unknown database error during ${operation}`);
}
```

**executeQuery()**
```typescript
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  operation: string
): Promise<T> {
  const { data, error } = await queryFn();
  
  if (error) {
    handleDatabaseError(error, operation);
  }
  
  if (data === null) {
    throw new DatabaseError(`No data returned from ${operation}`);
  }
  
  return data;
}
```

### Common Error Codes

- `PGRST116` - Record not found (return null, don't throw)
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `23514` - Check constraint violation

## Performance Considerations

### Indexes

All tables have appropriate indexes for common query patterns:

**Chronological Queries:**
- `idx_stitch_flows_created_at`
- `idx_stitch_runs_created_at`
- `idx_flow_versions_created_at`
- `idx_journey_events_timestamp`
- `idx_webhook_events_received_at`

**Foreign Key Lookups:**
- `idx_stitch_runs_flow_id`
- `idx_stitch_runs_entity_id`
- `idx_flow_versions_flow_id`
- `idx_journey_events_entity_id`
- `idx_webhook_configs_canvas_id`

**Unique Lookups:**
- `idx_webhook_configs_endpoint_slug`

**Position Queries:**
- `idx_stitch_entities_current_edge_id`
- `idx_stitch_entities_current_node_id`

### JSONB Performance

**node_states Column:**
- Uses `jsonb_set` for atomic updates
- Indexed access via GIN indexes (if needed)
- Efficient for sparse updates (single node)

**Optimization:** Use `updateNodeState()` for single nodes instead of `updateNodeStates()` to avoid full JSONB replacement.

### Realtime Subscriptions

Tables published to Supabase realtime:
- `stitch_runs` - Live execution updates
- `stitch_flow_versions` - Version changes
- `stitch_entities` - Entity movement
- `stitch_journey_events` - Journey tracking
- `stitch_webhook_configs` - Config changes
- `stitch_webhook_events` - Webhook processing

**Performance Impact:** Realtime adds minimal overhead. Subscriptions are client-side filtered.

## Best Practices

### 1. Always Use Versioning for New Flows

```typescript
// ✅ CORRECT
const { flow, versionId } = await createFlowWithVersion(
  name,
  visualGraph,
  'workflow'
);

// ❌ WRONG (legacy)
const flow = await createFlow(name, { nodes: [], edges: [] });
```

### 2. Use Admin Client in Webhooks

```typescript
// In /api/webhooks/[endpoint_slug]/route.ts
const supabase = getAdminClient(); // ✅
const config = await getWebhookConfigBySlugAdmin(slug); // ✅
```

### 3. Validate Before Persisting

```typescript
// Validate status transitions
validateTransition(currentStatus, newStatus);

// Validate entity progress
if (progress < 0.0 || progress > 1.0) {
  throw new Error('Invalid progress');
}
```

### 4. Use Atomic Operations for Concurrent Updates

```typescript
// ✅ CORRECT: Atomic
await updateNodeState(runId, nodeId, newState);

// ❌ WRONG: Race condition
const run = await getRun(runId);
run.node_states[nodeId] = newState;
await updateRun(runId, { node_states: run.node_states });
```

### 5. Handle Not Found Gracefully

```typescript
const flow = await getFlow(flowId);
if (!flow) {
  return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
}
```

### 6. Use Lightweight Queries When Possible

```typescript
// ✅ CORRECT: Metadata only
const versions = await listVersions(flowId);

// ❌ WRONG: Downloads megabytes of JSON
const versions = await supabase
  .from('stitch_flow_versions')
  .select('*')
  .eq('flow_id', flowId);
```

### 7. Scope Entity Queries by Canvas

```typescript
// ✅ CORRECT: Scoped
const entities = await getEntitiesAtNode(canvasId, nodeId);

// ❌ WRONG: Leaks data across canvases
const entities = await supabase
  .from('stitch_entities')
  .select('*')
  .eq('current_node_id', nodeId);
```

## Related Documentation

- [Execution Engine](./execution-engine.md) - How runs execute using database state
- [Canvas System](./canvas-system.md) - Version management and OEG compilation
- [Webhook System](./webhook-system.md) - Webhook processing and entity creation
- [Architecture: Data Flow](../architecture/data-flow.md) - Request-to-response flow
- [Architecture: Type System](../architecture/type-system.md) - Database type definitions
