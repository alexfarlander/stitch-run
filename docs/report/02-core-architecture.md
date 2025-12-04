# Core Architecture: Stateless Execution Engine

## Overview

Stitch's core architecture is a stateless, database-driven orchestration engine that executes visual workflow graphs. The system follows an event-driven, edge-walking execution model where node completions trigger downstream execution by traversing graph edges.

## Execution Model: Edge-Walking

### The Loop

```
Node Completes → Update DB → Read Edges → Check Dependencies → Fire Downstream Nodes
                                                                          ↓
                                                                    (Recursive)
```

### Key Characteristics

1. **Stateless**: No in-memory execution state
2. **Event-Driven**: Each completion triggers the next step
3. **Recursive**: Edge-walking calls itself for downstream nodes
4. **Database-Backed**: All state persisted immediately

### Example Flow

```typescript
// 1. Node completes (via callback or UX input)
await updateNodeState(runId, nodeId, { status: 'completed', output: {...} });

// 2. Trigger edge-walking
await walkEdges(nodeId, flow, run);

// 3. Edge-walker finds downstream nodes
const outboundEdges = getOutboundEdges(nodeId, flow);
const targetNodes = getTargetNodes(outboundEdges);

// 4. Check dependencies and fire ready nodes
for (const targetNodeId of targetNodes) {
  if (areUpstreamDependenciesCompleted(targetNodeId, flow, run)) {
    await fireNode(targetNodeId, flow, run);
  }
}
```

## Node Types

### 1. Worker Nodes

**Purpose**: Delegate work to external services via webhooks

**Execution Flow**:
```typescript
// 1. Mark node as 'running'
await updateNodeState(runId, nodeId, { status: 'running' });

// 2. Fire webhook to external worker
await fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify({
    runId,
    nodeId,
    config: node.data,
    input: mergedInput,
    callbackUrl: `${BASE_URL}/api/stitch/callback/${runId}/${nodeId}`
  })
});

// 3. Return immediately (async pattern)
// Worker will POST to callbackUrl when done
```

**Callback Handling**:
```typescript
// Worker POSTs back to callback URL
POST /api/stitch/callback/:runId/:nodeId
{
  "status": "completed",
  "output": { "result": "..." }
}

// Stitch updates state and continues execution
await updateNodeState(runId, nodeId, { status: 'completed', output });
await walkEdges(nodeId, flow, run);
```

### 2. UX Nodes (Human Gates)

**Purpose**: Pause execution for human input

**Execution Flow**:
```typescript
// 1. Mark node as 'waiting_for_user'
await updateNodeState(runId, nodeId, { status: 'waiting_for_user' });

// 2. Execution pauses here
// UI displays prompt to user

// 3. User provides input via API
POST /api/stitch/complete/:runId/:nodeId
{
  "input": { "userChoice": "approve" }
}

// 4. Resume execution
await updateNodeState(runId, nodeId, { status: 'completed', output: input });
await walkEdges(nodeId, flow, run);
```

### 3. Splitter Nodes (Fan-Out)

**Purpose**: Process array elements in parallel

**Execution Flow**:
```typescript
// Input: { items: ["A", "B", "C"] }

// 1. Extract array from input
const array = extractArray(input, node.data.arrayPath); // ["A", "B", "C"]

// 2. Create parallel node instances
const parallelStates = {};
array.forEach((item, index) => {
  const parallelId = `${downstreamNodeId}_${index}`;
  parallelStates[parallelId] = {
    status: 'pending',
    output: item  // Seed with array element
  };
});

// 3. Update database with parallel instances
await updateNodeStates(runId, parallelStates);

// 4. Mark splitter as completed
await updateNodeState(runId, nodeId, { status: 'completed', output: array });

// 5. Edge-walking will fire all parallel instances
await walkEdges(nodeId, flow, run);
```

**Parallel Tracking**:
```json
{
  "splitter-1": { "status": "completed", "output": ["A", "B", "C"] },
  "worker-1_0": { "status": "completed", "output": "Result A" },
  "worker-1_1": { "status": "running" },
  "worker-1_2": { "status": "pending" }
}
```

### 4. Collector Nodes (Fan-In)

**Purpose**: Merge parallel execution paths

**Execution Flow**:
```typescript
// 1. Identify all upstream parallel paths
const parallelPaths = Object.keys(run.node_states)
  .filter(key => key.startsWith(`${upstreamNodeId}_`));

// 2. Check if ALL paths are completed
const allCompleted = parallelPaths.every(
  path => run.node_states[path].status === 'completed'
);

if (!allCompleted) {
  // Wait for remaining paths
  return;
}

// 3. Merge outputs in order
const mergedOutput = parallelPaths
  .sort() // Ensures _0, _1, _2 order
  .map(path => run.node_states[path].output);

// 4. Mark collector as completed
await updateNodeState(runId, nodeId, { 
  status: 'completed', 
  output: mergedOutput 
});

// 5. Continue execution
await walkEdges(nodeId, flow, run);
```

## Database Schema

### stitch_flows

Stores workflow definitions:

```sql
CREATE TABLE stitch_flows (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  graph JSONB NOT NULL,  -- { nodes: [...], edges: [...] }
  canvas_type TEXT DEFAULT 'workflow',
  parent_id UUID REFERENCES stitch_flows(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### stitch_runs

Stores execution state:

```sql
CREATE TABLE stitch_runs (
  id UUID PRIMARY KEY,
  flow_id UUID REFERENCES stitch_flows(id),
  entity_id UUID REFERENCES stitch_entities(id),
  node_states JSONB NOT NULL,  -- { nodeId: { status, output, error } }
  trigger JSONB NOT NULL,       -- { type, source, event_id, timestamp }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Atomic State Updates

To prevent race conditions when multiple workers complete simultaneously:

```sql
CREATE OR REPLACE FUNCTION update_node_state(
  p_run_id UUID,
  p_node_id TEXT,
  p_status TEXT,
  p_output JSONB,
  p_error TEXT
) RETURNS SETOF stitch_runs AS $$
BEGIN
  RETURN QUERY
  UPDATE stitch_runs
  SET 
    node_states = jsonb_set(
      node_states,
      ARRAY[p_node_id],
      jsonb_build_object(
        'status', p_status,
        'output', COALESCE(p_output, 'null'::jsonb),
        'error', p_error
      )
    ),
    updated_at = NOW()
  WHERE id = p_run_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

## Worker Protocol

### Outbound Payload (Stitch → Worker)

```typescript
interface WorkerPayload {
  runId: string;
  nodeId: string;
  config: NodeConfig;
  input: any;
  callbackUrl: string;
}
```

**Example**:
```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "nodeId": "worker-1",
  "config": { "model": "claude-3", "temperature": 0.7 },
  "input": { "prompt": "Generate a scene description" },
  "callbackUrl": "https://app.stitch.run/api/stitch/callback/550e8400-e29b-41d4-a716-446655440000/worker-1"
}
```

### Inbound Callback (Worker → Stitch)

```typescript
interface WorkerCallback {
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
}
```

**Success Example**:
```json
{
  "status": "completed",
  "output": { "scenes": [...] }
}
```

**Failure Example**:
```json
{
  "status": "failed",
  "error": "API rate limit exceeded"
}
```

## API Endpoints

### POST /api/stitch/callback/:runId/:nodeId

Receives worker completion callbacks.

**Implementation**:
```typescript
export async function POST(
  request: Request,
  { params }: { params: { runId: string; nodeId: string } }
) {
  const { runId, nodeId } = params;
  const body = await request.json();
  
  // 1. Validate run exists
  const run = await getRunAdmin(runId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  
  // 2. Update node state
  await updateNodeState(runId, nodeId, {
    status: body.status === 'completed' ? 'completed' : 'failed',
    output: body.output,
    error: body.error
  });
  
  // 3. Continue execution if completed
  if (body.status === 'completed') {
    const flow = await getFlowAdmin(run.flow_id);
    const updatedRun = await getRunAdmin(runId);
    await walkEdges(nodeId, flow, updatedRun);
  }
  
  return NextResponse.json({ success: true });
}
```

### POST /api/stitch/complete/:runId/:nodeId

Receives human input for UX nodes.

**Implementation**:
```typescript
export async function POST(
  request: Request,
  { params }: { params: { runId: string; nodeId: string } }
) {
  const { runId, nodeId } = params;
  const { input } = await request.json();
  
  // 1. Validate node is UX and waiting
  const run = await getRun(runId);
  const nodeState = run.node_states[nodeId];
  
  if (nodeState.status !== 'waiting_for_user') {
    return NextResponse.json(
      { error: 'Node is not waiting for user input' },
      { status: 400 }
    );
  }
  
  // 2. Update state with user input
  await updateNodeState(runId, nodeId, {
    status: 'completed',
    output: input
  });
  
  // 3. Continue execution
  const flow = await getFlow(run.flow_id);
  const updatedRun = await getRun(runId);
  await walkEdges(nodeId, flow, updatedRun);
  
  return NextResponse.json({ success: true });
}
```

### POST /api/stitch/retry/:runId/:nodeId

Manually retries a failed node.

**Implementation**:
```typescript
export async function POST(
  request: Request,
  { params }: { params: { runId: string; nodeId: string } }
) {
  const { runId, nodeId } = params;
  
  // 1. Validate node is failed
  const run = await getRun(runId);
  const nodeState = run.node_states[nodeId];
  
  if (nodeState.status !== 'failed') {
    return NextResponse.json(
      { error: 'Node is not in failed state' },
      { status: 400 }
    );
  }
  
  // 2. Reset to pending
  await updateNodeState(runId, nodeId, { status: 'pending' });
  
  // 3. Re-evaluate and fire if ready
  const flow = await getFlow(run.flow_id);
  const updatedRun = await getRun(runId);
  
  if (areUpstreamDependenciesCompleted(nodeId, flow, updatedRun)) {
    await fireNode(nodeId, flow, updatedRun);
  }
  
  return NextResponse.json({ success: true });
}
```

## Dependency Resolution

### Checking Upstream Dependencies

```typescript
function areUpstreamDependenciesCompleted(
  nodeId: string,
  flow: StitchFlow,
  run: StitchRun
): boolean {
  // Find all edges pointing to this node
  const inboundEdges = flow.graph.edges.filter(e => e.target === nodeId);
  
  // If no inbound edges, it's an entry node (always ready)
  if (inboundEdges.length === 0) {
    return true;
  }
  
  // Check if all source nodes are completed
  return inboundEdges.every(edge => {
    const sourceState = run.node_states[edge.source];
    return sourceState && sourceState.status === 'completed';
  });
}
```

### Merging Upstream Outputs

```typescript
function mergeUpstreamOutputs(
  nodeId: string,
  flow: StitchFlow,
  run: StitchRun
): any {
  const inboundEdges = flow.graph.edges.filter(e => e.target === nodeId);
  
  // Merge all upstream outputs into single object
  const merged = {};
  for (const edge of inboundEdges) {
    const sourceState = run.node_states[edge.source];
    if (sourceState && sourceState.output) {
      Object.assign(merged, sourceState.output);
    }
  }
  
  return merged;
}
```

## Error Handling

### Worker Communication Errors

```typescript
try {
  await fetch(webhookUrl, { method: 'POST', body: JSON.stringify(payload) });
} catch (error) {
  await updateNodeState(runId, nodeId, {
    status: 'failed',
    error: `Worker webhook unreachable: ${error.message}`
  });
}
```

### Callback Validation Errors

- **Invalid runId**: Return 404 "Run not found"
- **Invalid nodeId**: Return 404 "Node not found in run"
- **Malformed payload**: Return 400 "Invalid callback payload"

### Collector Upstream Failures

```typescript
// If any parallel path failed, fail the collector
const anyFailed = parallelPaths.some(
  path => run.node_states[path].status === 'failed'
);

if (anyFailed) {
  await updateNodeState(runId, nodeId, {
    status: 'failed',
    error: 'Upstream parallel path failed'
  });
  return; // Don't continue execution
}
```

## Key Implementation Files

- `src/lib/engine/edge-walker.ts` - Core execution engine
- `src/lib/engine/handlers/worker.ts` - Worker node handler
- `src/lib/engine/handlers/ux.ts` - UX node handler
- `src/lib/engine/handlers/splitter.ts` - Splitter node handler
- `src/lib/engine/handlers/collector.ts` - Collector node handler
- `src/lib/db/runs.ts` - Run database operations
- `src/lib/db/flows.ts` - Flow database operations
- `src/app/api/stitch/callback/[runId]/[nodeId]/route.ts` - Callback endpoint
- `src/app/api/stitch/complete/[runId]/[nodeId]/route.ts` - UX completion endpoint
- `src/app/api/stitch/retry/[runId]/[nodeId]/route.ts` - Retry endpoint

## Correctness Properties

The core architecture implements 35 correctness properties verified through property-based testing:

- **Flow/Run Structure**: Graph validation, initialization, state structure
- **Worker Protocol**: Webhook firing, payload structure, URL construction
- **Callback Handling**: State updates, edge-walking triggers, validation
- **Splitter Logic**: Parallel path creation, array extraction, tracking
- **Collector Logic**: Path identification, synchronization, merging, ordering
- **UX Gates**: Waiting state, blocking, completion, resumption
- **Edge-Walking**: Edge traversal, dependency checking, input merging
- **Persistence**: Immediate persistence, crash recovery

See `src/lib/engine/__tests__/engine.property.test.ts` for complete test suite.
