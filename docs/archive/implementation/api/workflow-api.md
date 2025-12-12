# Workflow API

Complete reference for workflow execution endpoints in the Stitch orchestration platform.

## Overview

The Workflow API provides programmatic access to workflow execution, status monitoring, and callback handling. It implements the edge-walking execution model with support for async workers, parallel execution, and entity tracking.

**Base URL**: `https://your-domain.com/api` (Production) or `http://localhost:3000/api` (Development)

## Table of Contents

- [Run Creation](#run-creation)
- [Status Checking](#status-checking)
- [Callback Handling](#callback-handling)
- [UX Node Completion](#ux-node-completion)
- [Node Retry](#node-retry)
- [Execution Model](#execution-model)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Run Creation

### Start Workflow Execution

Create a new workflow run with automatic versioning support.

**Endpoint**: `POST /api/flows/{id}/run`

**Parameters**:
- `id` (path): Flow UUID

**Request Body**:
```json
{
  "visualGraph": {
    "nodes": [...],
    "edges": [...]
  },
  "entityId": "customer-123",
  "input": {
    "prompt": "Generate a video about AI"
  }
}
```

**Fields**:
- `visualGraph` (optional): Current visual graph from UI. If provided, triggers auto-versioning
- `entityId` (optional): Entity UUID to attach to this run for tracking
- `input` (optional): Initial input data for entry nodes

**Response**: `200 OK`
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "versionId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "started"
}
```

**Execution Flow**:

1. **Validation**: Checks that flow exists
2. **Auto-Versioning** (if visualGraph provided):
   - Compares visual graph with current version
   - Creates new version if changes detected
   - Compiles visual graph to execution graph (OEG)
3. **Version Selection** (if no visualGraph):
   - Uses `current_version_id` from flow
   - Fails if no current version exists
4. **Run Creation**:
   - Creates run record with `flow_version_id`
   - Initializes `node_states` as empty object
   - Attaches `entity_id` if provided
5. **Execution Start**:
   - Loads execution graph from version
   - Identifies entry nodes (nodes with no incoming edges)
   - Fires entry nodes with provided input
   - Returns run ID and version ID

**Entry Node Behavior**:
- **UX Nodes**: Start in `waiting_for_user` status
- **Worker Nodes**: Fire immediately, mark as `running`
- **Splitter Nodes**: Process input array, create parallel instances
- **Other Nodes**: Fire immediately with input

**Entity Attachment**:
When `entityId` is provided:
- Entity is attached to the run
- Entity moves to entry node(s) immediately
- Entity tracks journey through workflow
- Entity movement triggers on node completion

**Auto-Versioning Logic**:
```typescript
// If visual graph provided
if (visualGraph) {
  versionId = await autoVersionOnRun(flowId, visualGraph);
  // Creates version only if graph changed
}

// If no graph provided
else {
  if (!flow.current_version_id) {
    throw new Error('Flow has no current version');
  }
  versionId = flow.current_version_id;
}
```

**Errors**:
- `400 BAD_REQUEST`: Invalid input or flow has no current version
- `404 NOT_FOUND`: Flow not found
- `500 INTERNAL_ERROR`: Version creation or execution start failed

**Requirements**: 4.3

---


## Status Checking

### Get Run Status

Query the current status of a workflow execution.

**Endpoint**: `GET /api/stitch/status/{runId}`

**Parameters**:
- `runId` (path): Run UUID

**Response**: `200 OK`

**Running Workflow**:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "flow_id": "550e8400-e29b-41d4-a716-446655440000",
  "flow_version_id": "770e8400-e29b-41d4-a716-446655440000",
  "entity_id": "customer-123",
  "node_states": {
    "node-1": {
      "status": "completed",
      "output": {
        "prompt": "Generate video about AI"
      }
    },
    "node-2": {
      "status": "running"
    },
    "node-3": {
      "status": "pending"
    }
  },
  "trigger": {
    "type": "manual",
    "source": null,
    "event_id": null,
    "timestamp": "2024-12-05T10:00:00Z"
  },
  "created_at": "2024-12-05T10:00:00Z",
  "updated_at": "2024-12-05T10:01:30Z"
}
```

**Completed Workflow**:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "flow_id": "550e8400-e29b-41d4-a716-446655440000",
  "flow_version_id": "770e8400-e29b-41d4-a716-446655440000",
  "entity_id": "customer-123",
  "node_states": {
    "node-1": {
      "status": "completed",
      "output": {
        "prompt": "Generate video about AI"
      }
    },
    "node-2": {
      "status": "completed",
      "output": {
        "video_url": "https://cdn.example.com/video.mp4",
        "duration": 30
      }
    }
  },
  "trigger": {
    "type": "manual",
    "source": null,
    "event_id": null,
    "timestamp": "2024-12-05T10:00:00Z"
  },
  "created_at": "2024-12-05T10:00:00Z",
  "updated_at": "2024-12-05T10:05:00Z"
}
```


**Failed Workflow**:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "flow_id": "550e8400-e29b-41d4-a716-446655440000",
  "flow_version_id": "770e8400-e29b-41d4-a716-446655440000",
  "entity_id": null,
  "node_states": {
    "node-1": {
      "status": "completed",
      "output": {
        "prompt": "Generate video"
      }
    },
    "node-2": {
      "status": "failed",
      "error": "API rate limit exceeded"
    }
  },
  "trigger": {
    "type": "webhook",
    "source": "stripe",
    "event_id": "evt_123",
    "timestamp": "2024-12-05T10:00:00Z"
  },
  "created_at": "2024-12-05T10:00:00Z",
  "updated_at": "2024-12-05T10:02:15Z"
}
```

**Parallel Execution**:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "flow_id": "550e8400-e29b-41d4-a716-446655440000",
  "flow_version_id": "770e8400-e29b-41d4-a716-446655440000",
  "entity_id": null,
  "node_states": {
    "splitter-1": {
      "status": "completed",
      "output": {
        "items": ["item1", "item2", "item3"]
      }
    },
    "worker-1_0": {
      "status": "completed",
      "output": {
        "result": "processed item1"
      }
    },
    "worker-1_1": {
      "status": "running"
    },
    "worker-1_2": {
      "status": "pending"
    },
    "collector-1": {
      "status": "pending",
      "upstream_completed_count": 1,
      "expected_upstream_count": 3
    }
  },
  "created_at": "2024-12-05T10:00:00Z",
  "updated_at": "2024-12-05T10:03:00Z"
}
```

**Node Status Values**:
- `pending`: Node is waiting for upstream dependencies
- `running`: Node is currently executing (worker fired, awaiting callback)
- `completed`: Node finished successfully
- `failed`: Node execution failed
- `waiting_for_user`: UX node waiting for human input

**Parallel Instance Naming**:
- Static node: `worker-1`
- Parallel instances: `worker-1_0`, `worker-1_1`, `worker-1_2`
- Created by Splitter nodes for fan-out execution

**Errors**:
- `404 NOT_FOUND`: Run not found
- `500 INTERNAL_ERROR`: Database error

**Requirements**: 4.3

---


## Callback Handling

### Worker Callback Endpoint

Receives completion callbacks from external workers. This is the core of the async worker pattern.

**Endpoint**: `POST /api/stitch/callback/{runId}/{nodeId}`

**Parameters**:
- `runId` (path): Run UUID
- `nodeId` (path): Node ID (may include parallel suffix like `worker-1_0`)

**Request Body (Success)**:
```json
{
  "status": "completed",
  "output": {
    "video_url": "https://cdn.example.com/video.mp4",
    "duration": 30,
    "thumbnail_url": "https://cdn.example.com/thumb.jpg"
  }
}
```

**Request Body (Failure)**:
```json
{
  "status": "failed",
  "error": "API rate limit exceeded. Please try again in 60 seconds."
}
```

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Callback Payload Structure**:

Required fields:
- `status`: Must be `"completed"` or `"failed"`

Optional fields:
- `output`: Object containing result data (required for `completed` status)
- `error`: String describing the error (required for `failed` status)

**Validation Rules**:
1. Payload must be valid JSON object
2. `status` field is required
3. `status` must be exactly `"completed"` or `"failed"`
4. `output` must be an object if provided (for completed status)
5. `error` must be a string if provided (for failed status)

**Processing Flow**:

1. **Validation**:
   - Validates runId and nodeId exist
   - Validates run exists in database
   - Validates node exists in run's node_states
   - Validates callback payload structure

2. **State Update (Success)**:
   - Merges callback output with stored input
   - Updates node status to `completed`
   - Stores merged output in node state

3. **State Update (Failure)**:
   - Updates node status to `failed`
   - Stores error message in node state

4. **Entity Movement** (if configured):
   - Applies entity movement based on worker configuration
   - Moves entity to target section
   - Updates entity type if specified

5. **Edge-Walking** (success only):
   - Loads execution graph from version
   - Identifies downstream nodes
   - Checks dependencies for each downstream node
   - Fires ready downstream nodes


**Output Merging**:

The callback handler merges callback output with stored input to implement pass-through:

```typescript
const currentNodeState = run.node_states[nodeId];
const storedInput = currentNodeState?.output || {};

const mergedOutput = {
  ...storedInput,
  ...callback.output,
};
```

This ensures data flows through the pipeline. For example:
- Node 1 outputs: `{ voice_text: "Hello" }`
- Node 2 receives: `{ voice_text: "Hello" }`
- Node 2 outputs: `{ audio_url: "https://..." }`
- Node 2 final state: `{ voice_text: "Hello", audio_url: "https://..." }`

**Edge-Walking Trigger**:

Only successful completions trigger edge-walking:
```typescript
if (callback.status === 'completed') {
  await walkEdges(nodeId, updatedRun);
}
```

Failed nodes do NOT trigger downstream execution. They must be manually retried.

**Entity Movement Example**:

Worker node configuration:
```json
{
  "workerType": "claude",
  "webhookUrl": "https://worker.example.com/claude",
  "entityMovement": {
    "onSuccess": {
      "targetSectionId": "customers",
      "completeAs": "success",
      "setEntityType": "customer"
    },
    "onFailure": {
      "targetSectionId": "failed-leads",
      "completeAs": "failure"
    }
  }
}
```

On successful callback:
- Entity moves to "customers" section
- Entity type changes to "customer"
- Journey marked as success

**Errors**:
- `400 BAD_REQUEST`: Invalid payload structure, missing fields, or invalid status value
- `404 NOT_FOUND`: Run or node not found
- `500 INTERNAL_ERROR`: Database error or edge-walking failure

**Requirements**: 4.3

---


## UX Node Completion

### Complete UX Node with User Input

Mark a UX node as completed with user-provided input.

**Endpoint**: `POST /api/stitch/complete/{runId}/{nodeId}`

**Parameters**:
- `runId` (path): Run UUID
- `nodeId` (path): Node ID

**Request Body**:
```json
{
  "input": {
    "user_choice": "approve",
    "comments": "Looks good, proceed with generation"
  }
}
```

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Processing Flow**:

1. **Validation**:
   - Validates run exists
   - Validates node exists in run
   - Validates node type is `UX`
   - Validates node status is `waiting_for_user`

2. **State Update**:
   - Updates node status to `completed`
   - Stores user input as node output

3. **Edge-Walking**:
   - Triggers edge-walking from completed UX node
   - Fires downstream nodes if dependencies satisfied

**UX Node Lifecycle**:

1. **Creation**: UX node starts in `waiting_for_user` status
2. **User Input**: User provides input via UI or API
3. **Completion**: Node marked as `completed` with input as output
4. **Propagation**: Edge-walking fires downstream nodes

**Example UX Node Configuration**:
```json
{
  "id": "ux-1",
  "type": "UX",
  "data": {
    "label": "Approve Script",
    "prompt": "Review the generated script and approve or reject"
  }
}
```

**Errors**:
- `400 BAD_REQUEST`: Node is not UX type or not in `waiting_for_user` status
- `404 NOT_FOUND`: Run or node not found
- `500 INTERNAL_ERROR`: Database error or edge-walking failure

**Requirements**: 4.3

---


## Node Retry

### Retry Failed Node

Manually retry a failed node.

**Endpoint**: `POST /api/stitch/retry/{runId}/{nodeId}`

**Parameters**:
- `runId` (path): Run UUID
- `nodeId` (path): Node ID

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Processing Flow**:

1. **Validation**:
   - Validates run exists
   - Validates node exists in run
   - Validates node status is `failed`

2. **State Reset**:
   - Updates node status to `pending`
   - Clears error message

3. **Dependency Check**:
   - Loads execution graph from version
   - Identifies upstream nodes
   - Checks if all upstream nodes are `completed`

4. **Re-execution**:
   - If dependencies satisfied: Fires node immediately
   - If dependencies not satisfied: Node remains `pending`

**Retry Behavior**:

The retry endpoint does NOT automatically retry upstream failures. It only retries the specific node.

Example scenario:
```
Node A (completed) → Node B (failed) → Node C (pending)
```

Retrying Node B:
1. Checks Node A status (completed ✓)
2. Resets Node B to pending
3. Fires Node B immediately
4. Node C remains pending until Node B completes

**Parallel Instance Retry**:

For parallel instances created by Splitters:
```
Splitter → Worker_0 (completed), Worker_1 (failed), Worker_2 (completed)
```

Retrying `Worker_1`:
- Only `Worker_1` is retried
- Other parallel instances are unaffected
- Collector waits for all instances to complete

**Errors**:
- `400 BAD_REQUEST`: Node is not in `failed` status
- `404 NOT_FOUND`: Run, node, or version not found
- `500 INTERNAL_ERROR`: Database error or execution failure

**Requirements**: 4.3

---


## Execution Model

### Edge-Walking Pattern

Stitch uses an event-driven edge-walking execution model:

**Core Principle**: Node completion triggers downstream execution

**Flow**:
1. Node completes → Update database
2. Load execution graph
3. Find downstream nodes (O(1) adjacency lookup)
4. For each downstream node:
   - Check if all upstream dependencies completed
   - If yes: Fire node
   - If no: Node remains pending

**Execution Graph (OEG)**:

The Optimized Execution Graph provides O(1) lookups:

```typescript
interface ExecutionGraph {
  nodes: Record<string, ExecutionNode>;  // O(1) node lookup
  adjacency: Record<string, string[]>;   // O(1) downstream lookup
  entryNodes: string[];                  // Pre-computed entry points
  terminalNodes: string[];               // Pre-computed terminal nodes
  edgeData: Record<string, any>;         // Edge metadata
}
```

**Example**:
```typescript
// Visual Graph
{
  nodes: [
    { id: "A", type: "Worker" },
    { id: "B", type: "Worker" },
    { id: "C", type: "Worker" }
  ],
  edges: [
    { source: "A", target: "B" },
    { source: "B", target: "C" }
  ]
}

// Compiled Execution Graph
{
  nodes: {
    "A": { id: "A", type: "Worker", config: {...} },
    "B": { id: "B", type: "Worker", config: {...} },
    "C": { id: "C", type: "Worker", config: {...} }
  },
  adjacency: {
    "A": ["B"],
    "B": ["C"],
    "C": []
  },
  entryNodes: ["A"],
  terminalNodes: ["C"]
}
```

### Async Worker Pattern

All workers are treated as asynchronous:

**Fire Phase**:
1. Create worker payload
2. Send HTTP POST to worker webhook
3. Mark node as `running`
4. End process (don't wait)

**Resume Phase**:
1. Worker completes work
2. Worker sends callback to Stitch
3. Stitch updates node state
4. Stitch triggers edge-walking

**Worker Payload**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "nodeId": "worker-1",
  "config": {
    "workerType": "claude",
    "model": "claude-3-opus"
  },
  "input": {
    "prompt": "Generate a video script"
  },
  "callbackUrl": "https://stitch.example.com/api/stitch/callback/660e8400/worker-1"
}
```

**Callback URL Construction**:
```typescript
const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/stitch/callback/${runId}/${nodeId}`;
```

⚠️ **Critical**: Always use `NEXT_PUBLIC_BASE_URL` environment variable. Never hardcode domains.


### Parallel Execution (M-Shape)

Splitter and Collector nodes enable parallel execution:

**Splitter Node**:
- Takes array input
- Creates parallel instances for downstream nodes
- Each instance gets one array element

**Example**:
```typescript
// Input to Splitter
{
  "items": ["item1", "item2", "item3"]
}

// Splitter creates parallel instances
node_states: {
  "splitter-1": { status: "completed", output: { items: [...] } },
  "worker-1_0": { status: "pending", output: "item1" },
  "worker-1_1": { status: "pending", output: "item2" },
  "worker-1_2": { status: "pending", output: "item3" }
}
```

**Collector Node**:
- Waits for ALL upstream parallel instances
- Merges outputs into array
- Fires only when all instances complete

**Example**:
```typescript
// Collector state while waiting
{
  "collector-1": {
    "status": "pending",
    "upstream_completed_count": 2,
    "expected_upstream_count": 3,
    "upstream_outputs": {
      "worker-1_0": { result: "processed item1" },
      "worker-1_1": { result: "processed item2" }
    }
  }
}

// Collector state when all complete
{
  "collector-1": {
    "status": "completed",
    "output": {
      "results": [
        { result: "processed item1" },
        { result: "processed item2" },
        { result: "processed item3" }
      ]
    }
  }
}
```

**Parallel Instance Naming**:
- Static node ID: `worker-1`
- Parallel instances: `worker-1_0`, `worker-1_1`, `worker-1_2`
- Suffix format: `_{index}` where index starts at 0

**Dependency Resolution**:

When checking dependencies, the system handles both static and parallel instances:

```typescript
function areUpstreamDependenciesCompleted(nodeId, executionGraph, run) {
  const upstreamNodeIds = getUpstreamNodeIds(nodeId, executionGraph);
  
  for (const upstreamId of upstreamNodeIds) {
    // Check for parallel instances
    const parallelInstances = Object.keys(run.node_states)
      .filter(key => key.startsWith(`${upstreamId}_`));
    
    if (parallelInstances.length > 0) {
      // ALL parallel instances must be completed
      for (const parallelId of parallelInstances) {
        const state = run.node_states[parallelId];
        if (!state || state.status !== 'completed') {
          return false;
        }
      }
    } else {
      // Check static node
      const state = run.node_states[upstreamId];
      if (!state || state.status !== 'completed') {
        return false;
      }
    }
  }
  
  return true;
}
```


### Data Flow and Merging

**Upstream Output Merging**:

When a node fires, it receives merged outputs from all upstream nodes:

```typescript
function mergeUpstreamOutputs(nodeId, executionGraph, run) {
  const upstreamNodeIds = getUpstreamNodeIds(nodeId, executionGraph);
  const mergedInput = {};
  
  for (const upstreamId of upstreamNodeIds) {
    const upstreamState = run.node_states[upstreamId];
    
    if (upstreamState?.output) {
      // Check for edge data mapping
      const edgeKey = `${upstreamId}->${nodeId}`;
      const edgeMapping = executionGraph.edgeData[edgeKey];
      
      if (edgeMapping) {
        // Apply data mapping
        for (const [targetInput, sourcePath] of Object.entries(edgeMapping)) {
          mergedInput[targetInput] = resolvePath(upstreamState.output, sourcePath);
        }
      } else {
        // No mapping, merge directly
        Object.assign(mergedInput, upstreamState.output);
      }
    }
  }
  
  return mergedInput;
}
```

**Example Without Mapping**:
```typescript
// Node A output
{ text: "Hello", language: "en" }

// Node B output
{ audio_url: "https://..." }

// Node C input (merges A + B)
{ text: "Hello", language: "en", audio_url: "https://..." }
```

**Example With Mapping**:
```typescript
// Edge A → C has mapping
edgeData: {
  "A->C": {
    "prompt": "text",      // C.prompt = A.text
    "lang": "language"     // C.lang = A.language
  }
}

// Node A output
{ text: "Hello", language: "en" }

// Node C input (mapped)
{ prompt: "Hello", lang: "en" }
```

### Entity Tracking

**Entity Attachment**:

Entities can be attached to runs for journey tracking:

```typescript
// Create run with entity
POST /api/flows/{id}/run
{
  "entityId": "customer-123",
  "input": { ... }
}
```

**Entity Movement**:

Entities move through the workflow as nodes complete:

1. **Entry**: Entity moves to entry node(s) on run start
2. **Progress**: Entity moves to next node on completion
3. **Visualization**: Entity position tracked in database
4. **Journey**: All movements recorded in journey events

**Worker Node Entity Movement**:

Workers can configure entity movement based on outcome:

```json
{
  "entityMovement": {
    "onSuccess": {
      "targetSectionId": "customers",
      "completeAs": "success",
      "setEntityType": "customer"
    },
    "onFailure": {
      "targetSectionId": "failed-leads",
      "completeAs": "failure"
    }
  }
}
```

**Entity Movement Trigger**:

Movement is applied in the callback handler:

```typescript
if (node.type === 'Worker' && node.data.entityMovement) {
  await applyEntityMovement(runId, nodeId, node.data, callback.status);
}
```


## Error Handling

### Error Response Format

All workflow API endpoints return standardized error responses:

```json
{
  "error": "Human-readable error message",
  "details": "Additional context or debugging information"
}
```

### Common Error Scenarios

**Run Creation Errors**:

```json
// Flow not found
{
  "error": "Flow not found",
  "status": 404
}

// No current version
{
  "error": "Flow has no current version. Please save the flow first.",
  "status": 400
}

// Version creation failed
{
  "error": "Failed to create version",
  "details": "Graph validation failed: cycle detected",
  "status": 400
}
```

**Callback Errors**:

```json
// Invalid payload structure
{
  "error": "Missing required field: status",
  "status": 400
}

// Invalid status value
{
  "error": "Invalid status value: \"pending\". Must be \"completed\" or \"failed\"",
  "status": 400
}

// Node not found
{
  "error": "Node not found in run: worker-1",
  "status": 404
}
```

**Retry Errors**:

```json
// Node not in failed state
{
  "error": "Node is not in failed state",
  "status": 400
}

// Version not found
{
  "error": "Flow version not found",
  "status": 404
}
```

**UX Completion Errors**:

```json
// Not a UX node
{
  "error": "Node is not a UX node",
  "status": 400
}

// Not waiting for user
{
  "error": "Node is not waiting for user input",
  "status": 400
}
```

### Error Handling Best Practices

**1. Check HTTP Status Codes**:
```typescript
const response = await fetch('/api/flows/123/run', {
  method: 'POST',
  body: JSON.stringify({ input: {...} })
});

if (!response.ok) {
  const error = await response.json();
  console.error('Run creation failed:', error.error);
  throw new Error(error.error);
}
```

**2. Handle Specific Error Cases**:
```typescript
try {
  const run = await createRun(flowId, input);
  return run;
} catch (error) {
  if (error.message.includes('no current version')) {
    // Prompt user to save flow first
    showSavePrompt();
  } else if (error.message.includes('not found')) {
    // Flow doesn't exist
    showNotFoundError();
  } else {
    // Generic error
    showGenericError(error.message);
  }
}
```

**3. Implement Retry Logic**:
```typescript
async function retryFailedNode(runId: string, nodeId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fetch(`/api/stitch/retry/${runId}/${nodeId}`, {
        method: 'POST'
      });
      return; // Success
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```


**4. Log Errors for Debugging**:
```typescript
try {
  await processCallback(runId, nodeId, callback);
} catch (error) {
  console.error('Callback processing failed:', {
    runId,
    nodeId,
    callback,
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

**5. Validate Before Sending**:
```typescript
function validateCallback(callback: any): string[] {
  const errors: string[] = [];
  
  if (!callback.status) {
    errors.push('Missing required field: status');
  }
  
  if (callback.status && !['completed', 'failed'].includes(callback.status)) {
    errors.push(`Invalid status: ${callback.status}`);
  }
  
  if (callback.status === 'completed' && !callback.output) {
    errors.push('Output required for completed status');
  }
  
  if (callback.status === 'failed' && !callback.error) {
    errors.push('Error message required for failed status');
  }
  
  return errors;
}
```

---

## Best Practices

### 1. Use Auto-Versioning

Always provide the visual graph when running workflows to enable auto-versioning:

```typescript
// ✅ Good: Auto-versioning enabled
const response = await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  body: JSON.stringify({
    visualGraph: currentGraph,
    input: { prompt: 'Generate video' }
  })
});

// ❌ Bad: Requires manual version management
const response = await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  body: JSON.stringify({
    input: { prompt: 'Generate video' }
  })
});
```

### 2. Poll Status with Exponential Backoff

Implement efficient polling for run status:

```typescript
async function pollRunStatus(runId: string): Promise<StitchRun> {
  let delay = 1000; // Start with 1 second
  const maxDelay = 10000; // Max 10 seconds
  
  while (true) {
    const response = await fetch(`/api/stitch/status/${runId}`);
    const run = await response.json();
    
    // Check if run is complete
    const allCompleted = Object.values(run.node_states).every(
      state => state.status === 'completed' || state.status === 'failed'
    );
    
    if (allCompleted) {
      return run;
    }
    
    // Wait before next poll
    await sleep(delay);
    delay = Math.min(delay * 1.5, maxDelay);
  }
}
```

### 3. Handle Parallel Execution

When working with Splitter/Collector patterns, track parallel instances:

```typescript
function getParallelInstances(nodeId: string, run: StitchRun): string[] {
  return Object.keys(run.node_states)
    .filter(key => key.startsWith(`${nodeId}_`) && /_\d+$/.test(key));
}

function areAllParallelInstancesComplete(nodeId: string, run: StitchRun): boolean {
  const instances = getParallelInstances(nodeId, run);
  
  if (instances.length === 0) {
    // No parallel instances, check static node
    const state = run.node_states[nodeId];
    return state?.status === 'completed' || state?.status === 'failed';
  }
  
  // Check all parallel instances
  return instances.every(instanceId => {
    const state = run.node_states[instanceId];
    return state?.status === 'completed' || state?.status === 'failed';
  });
}
```


### 4. Implement Worker Callbacks Correctly

When building workers, follow the callback contract:

```typescript
// Worker implementation
async function processWork(payload: WorkerPayload) {
  try {
    // Do work
    const result = await generateVideo(payload.input);
    
    // Send success callback
    await fetch(payload.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        output: {
          video_url: result.url,
          duration: result.duration
        }
      })
    });
  } catch (error) {
    // Send failure callback
    await fetch(payload.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'failed',
        error: error.message
      })
    });
  }
}
```

### 5. Use Entity Tracking for Customer Journeys

Attach entities to runs for journey visualization:

```typescript
// Create run with entity
const response = await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  body: JSON.stringify({
    visualGraph: currentGraph,
    entityId: customer.id,
    input: { email: customer.email }
  })
});

// Entity will automatically move through workflow
// Track journey in real-time via Supabase subscriptions
```

### 6. Configure Entity Movement in Workers

Define entity movement behavior in worker nodes:

```typescript
const workerNode = {
  id: 'qualify-lead',
  type: 'Worker',
  data: {
    workerType: 'claude',
    webhookUrl: 'https://worker.example.com/qualify',
    entityMovement: {
      onSuccess: {
        targetSectionId: 'qualified-leads',
        completeAs: 'success',
        setEntityType: 'lead'
      },
      onFailure: {
        targetSectionId: 'unqualified-leads',
        completeAs: 'failure'
      }
    }
  }
};
```

### 7. Handle UX Gates Properly

Implement UX node completion in your UI:

```typescript
async function completeUXNode(runId: string, nodeId: string, userInput: any) {
  const response = await fetch(`/api/stitch/complete/${runId}/${nodeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: userInput
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  // Edge-walking triggered automatically
  // Poll status to see downstream execution
}
```

### 8. Monitor Run Progress

Track run progress in real-time:

```typescript
function calculateRunProgress(run: StitchRun): {
  completed: number;
  running: number;
  pending: number;
  failed: number;
  total: number;
  percentage: number;
} {
  const states = Object.values(run.node_states);
  const total = states.length;
  
  const completed = states.filter(s => s.status === 'completed').length;
  const running = states.filter(s => s.status === 'running').length;
  const pending = states.filter(s => s.status === 'pending').length;
  const failed = states.filter(s => s.status === 'failed').length;
  
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return { completed, running, pending, failed, total, percentage };
}
```


### 9. Implement Graceful Degradation

Handle worker failures gracefully:

```typescript
async function executeWorkflowWithRetry(flowId: string, input: any) {
  const response = await fetch(`/api/flows/${flowId}/run`, {
    method: 'POST',
    body: JSON.stringify({ visualGraph, input })
  });
  
  const { runId } = await response.json();
  
  // Poll until complete
  while (true) {
    const run = await fetchRunStatus(runId);
    
    // Check for failures
    const failedNodes = Object.entries(run.node_states)
      .filter(([_, state]) => state.status === 'failed');
    
    if (failedNodes.length > 0) {
      // Attempt retry
      for (const [nodeId, state] of failedNodes) {
        console.log(`Retrying failed node: ${nodeId}`);
        await retryNode(runId, nodeId);
      }
    }
    
    // Check if complete
    const allTerminal = Object.values(run.node_states)
      .every(s => s.status === 'completed' || s.status === 'failed');
    
    if (allTerminal) {
      return run;
    }
    
    await sleep(2000);
  }
}
```

### 10. Use Real-Time Subscriptions

Subscribe to run updates via Supabase:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

function subscribeToRun(runId: string, onUpdate: (run: StitchRun) => void) {
  const subscription = supabase
    .channel(`run:${runId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stitch_runs',
        filter: `id=eq.${runId}`
      },
      (payload) => {
        onUpdate(payload.new as StitchRun);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

// Usage
const unsubscribe = subscribeToRun(runId, (run) => {
  console.log('Run updated:', run);
  updateUI(run);
});

// Cleanup
unsubscribe();
```

---

## Related Documentation

- [REST Endpoints](./rest-endpoints.md) - Complete API reference
- [Canvas API](./canvas-api.md) - Canvas management endpoints
- [Execution Engine](../backend/execution-engine.md) - Edge-walker implementation
- [Version Manager](../backend/canvas-system.md) - Auto-versioning system
- [Worker System](../backend/worker-system.md) - Worker integration guide
- [Entity Tracking](../frontend/entity-visualization.md) - Entity movement visualization

---

## Examples

### Complete Workflow Execution Example

```typescript
import { createClient } from '@supabase/supabase-js';

async function executeWorkflow(flowId: string, input: any) {
  // 1. Load current graph
  const graph = await loadGraph(flowId);
  
  // 2. Start run with auto-versioning
  const runResponse = await fetch(`/api/flows/${flowId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visualGraph: graph,
      input: input
    })
  });
  
  const { runId, versionId } = await runResponse.json();
  console.log(`Run started: ${runId}, Version: ${versionId}`);
  
  // 3. Subscribe to real-time updates
  const supabase = createClient(url, key);
  const subscription = supabase
    .channel(`run:${runId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'stitch_runs',
      filter: `id=eq.${runId}`
    }, (payload) => {
      const run = payload.new as StitchRun;
      console.log('Run updated:', run);
      
      // Check progress
      const progress = calculateRunProgress(run);
      console.log(`Progress: ${progress.percentage}%`);
      
      // Check for failures
      const failed = Object.entries(run.node_states)
        .filter(([_, s]) => s.status === 'failed');
      
      if (failed.length > 0) {
        console.error('Failed nodes:', failed);
      }
    })
    .subscribe();
  
  // 4. Poll for completion
  let run: StitchRun;
  while (true) {
    const statusResponse = await fetch(`/api/stitch/status/${runId}`);
    run = await statusResponse.json();
    
    const allTerminal = Object.values(run.node_states)
      .every(s => s.status === 'completed' || s.status === 'failed');
    
    if (allTerminal) break;
    
    await sleep(2000);
  }
  
  // 5. Cleanup
  subscription.unsubscribe();
  
  // 6. Return final state
  return run;
}
```

---

**Last Updated**: 2024-12-05  
**API Version**: 1.0.0  
**Requirements**: 4.3
