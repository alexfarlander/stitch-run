# Execution Model

## Overview

Stitch uses an **edge-walking execution model** that is fundamentally event-driven and recursive. Unlike traditional workflow engines that use a central scheduler, Stitch's execution flows naturally through the graph by "walking" edges from completed nodes to their downstream neighbors.

This document explains the core execution patterns, node status state machine, and parallel execution handling that power Stitch workflows.

## Core Principles

### Database as Source of Truth

All execution state is persisted to the database immediately. There is **no in-memory state management**. This ensures:

- Workflows can resume after server restarts
- Multiple instances can coordinate execution
- Complete audit trail of all state changes
- Real-time UI updates via database subscriptions

### Event-Driven Execution

Execution is triggered by events, not polling:

1. **Node Completes** → Update database with status and output
2. **Read Outbound Edges** → Find downstream nodes
3. **Check Dependencies** → Verify all upstream nodes are completed
4. **Fire Ready Nodes** → Execute nodes whose dependencies are satisfied
5. **Repeat Recursively** → Each completion triggers the next wave

### Async Worker Pattern

All workers are treated as asynchronous to handle long-running operations:

1. **Fire Worker** → Send HTTP POST to worker webhook
2. **Mark Running** → Update node status to 'running'
3. **End Process** → Request handler returns immediately
4. **Worker Processes** → External service does its work
5. **Callback Received** → Worker POSTs result to callback URL
6. **Resume Execution** → Mark node 'completed' and trigger edge-walking

This pattern prevents timeouts and allows workflows to handle operations that take seconds, minutes, or even hours.

## Edge-Walking Pattern

### The Walking Algorithm

The edge-walking algorithm is implemented in `src/lib/engine/edge-walker.ts`:

```typescript
export async function walkEdges(
  completedNodeId: string,
  run: StitchRun
): Promise<void> {
  // 1. Load execution graph from run's flow_version_id
  const version = await getVersion(run.flow_version_id);
  const executionGraph = version.execution_graph;
  
  // 2. Strip parallel suffix to get static node ID
  const staticNodeId = completedNodeId.replace(/_\d+$/, '');
  
  // 3. Check if this is a terminal node (no outbound edges)
  if (executionGraph.terminalNodes.includes(staticNodeId)) {
    return; // Stop edge-walking
  }
  
  // 4. Use adjacency map for O(1) edge lookup
  const targetNodeIds = executionGraph.adjacency[staticNodeId] || [];
  
  // 5. For each target node, check dependencies and fire if ready
  for (const targetNodeId of targetNodeIds) {
    if (areUpstreamDependenciesCompleted(targetNodeId, executionGraph, run)) {
      await fireNodeWithGraph(targetNodeId, executionGraph, run);
    }
  }
}
```

### Key Characteristics

**O(1) Edge Lookup**: The execution graph uses an adjacency map for constant-time edge lookups:
```typescript
adjacency: {
  "node-1": ["node-2", "node-3"],
  "node-2": ["node-4"],
  "node-3": ["node-4"]
}
```

**Dependency Checking**: Before firing a node, the engine verifies all upstream nodes are completed:
```typescript
function areUpstreamDependenciesCompleted(
  nodeId: string,
  executionGraph: ExecutionGraph,
  run: StitchRun
): boolean {
  const upstreamNodeIds = getUpstreamNodeIds(nodeId, executionGraph);
  
  for (const upstreamId of upstreamNodeIds) {
    const upstreamState = run.node_states[upstreamId];
    if (!upstreamState || upstreamState.status !== 'completed') {
      return false;
    }
  }
  
  return true;
}
```

**Terminal Node Detection**: Nodes with no outbound edges stop the walking process automatically.

### Starting a Workflow

Workflows begin at **entry nodes** (nodes with no inbound edges):

```typescript
export async function startRun(
  flowId: string,
  options: {
    entityId?: string | null;
    trigger?: TriggerMetadata;
    input?: any;
    flow_version_id?: string;
  } = {}
): Promise<StitchRun> {
  // 1. Create the run record
  const run = await createRun(flowId, options);
  
  // 2. Load execution graph
  const version = await getVersion(run.flow_version_id);
  const executionGraph = version.execution_graph;
  
  // 3. Fire all entry nodes
  for (const nodeId of executionGraph.entryNodes) {
    const node = executionGraph.nodes[nodeId];
    await fireNodeWithGraph(node.id, executionGraph, run);
  }
  
  return run;
}
```

## Node Status State Machine

### Status Types

Nodes progress through a strict state machine defined in `src/lib/engine/status-transitions.ts`:

```typescript
export type NodeStatus = 
  | 'pending'           // Waiting to be executed
  | 'running'           // Currently executing
  | 'completed'         // Finished successfully
  | 'failed'            // Execution failed
  | 'waiting_for_user'; // UX node waiting for human input
```

### Valid Transitions

The state machine enforces valid transitions to prevent corruption:

```typescript
export const VALID_TRANSITIONS: Record<NodeStatus, NodeStatus[]> = {
  'pending': ['running'],
  'running': ['completed', 'failed', 'waiting_for_user'],
  'completed': [], // Terminal state - no transitions allowed
  'failed': ['running'], // Allow retry
  'waiting_for_user': ['running'], // User provides input, resume
};
```

### State Machine Diagram

```
┌─────────┐
│ pending │
└────┬────┘
     │
     ▼
┌─────────┐     ┌──────────────────┐
│ running │────▶│ waiting_for_user │
└────┬────┘     └────────┬─────────┘
     │                   │
     ├───────────────────┘
     │
     ├──────────┬──────────┐
     ▼          ▼          ▼
┌───────────┐ ┌────────┐
│ completed │ │ failed │
└───────────┘ └───┬────┘
                  │
                  │ (retry)
                  ▼
              ┌─────────┐
              │ running │
              └─────────┘
```

### Transition Validation

All status updates are validated before being applied:

```typescript
export function validateTransition(from: NodeStatus, to: NodeStatus): void {
  const validTargets = VALID_TRANSITIONS[from];
  
  if (!validTargets || !validTargets.includes(to)) {
    throw new StatusTransitionError(from, to);
  }
}
```

This prevents invalid transitions like:
- `completed` → `running` (completed is terminal)
- `pending` → `completed` (must go through running)
- `failed` → `completed` (must retry through running)

## Node Types and Handlers

### Worker Nodes

Worker nodes delegate work to external services via HTTP webhooks:

```typescript
export async function fireWorkerNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  input: any
): Promise<void> {
  // 1. Mark node as 'running'
  await updateNodeState(runId, nodeId, { status: 'running' });
  
  // 2. Build worker payload
  const payload = {
    runId,
    nodeId,
    config,
    input,
    callbackUrl: `${baseUrl}/api/stitch/callback/${runId}/${nodeId}`
  };
  
  // 3. Send HTTP POST to worker
  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  // 4. Return immediately (async pattern)
  // Node stays 'running' until callback received
}
```

**Integrated Workers**: Some workers (Claude, MiniMax, ElevenLabs, Shotstack) are integrated directly and don't require external webhooks.

### UX Nodes

UX nodes implement human-in-the-loop gates:

```typescript
export async function fireUXNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  input: any
): Promise<void> {
  // Mark node as 'waiting_for_user'
  await updateNodeState(runId, nodeId, {
    status: 'waiting_for_user',
    output: input // Pass through input for UI display
  });
  
  // Execution pauses here until user provides input
}
```

When the user provides input via the UI:
1. Node transitions from `waiting_for_user` → `running` → `completed`
2. User input is stored in node output
3. Edge-walking resumes to downstream nodes

### Splitter Nodes

Splitter nodes implement fan-out for parallel execution (see Parallel Execution section below).

### Collector Nodes

Collector nodes implement fan-in to merge parallel paths (see Parallel Execution section below).

## Parallel Execution (The M-Shape)

### Overview

Stitch supports parallel execution through the **Splitter-Collector pattern**, which creates an "M-shape" in the workflow graph:

```
        ┌──────────┐
        │ Splitter │
        └────┬─────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
  ┌────────┐   ┌────────┐
  │ Path 0 │   │ Path 1 │
  └───┬────┘   └───┬────┘
      │             │
      └──────┬──────┘
             ▼
       ┌───────────┐
       │ Collector │
       └───────────┘
```

### Splitter Node Execution

Splitters take an array input and create parallel execution paths:

```typescript
export async function fireSplitterNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  input: any,
  downstreamNodeIds: string[]
): Promise<void> {
  // 1. Extract array from input using configured path
  const arrayElements = extractArray(input, config.arrayPath);
  
  // 2. Create parallel path states for each array element
  const parallelStates: Record<string, NodeState> = {};
  
  for (let i = 0; i < arrayElements.length; i++) {
    for (const nodeId of downstreamNodeIds) {
      // Augment node ID with index suffix
      const augmentedNodeId = `${nodeId}_${i}`;
      parallelStates[augmentedNodeId] = {
        status: 'pending',
        output: arrayElements[i] // Store array element as initial output
      };
    }
  }
  
  // 3. Update all parallel path states atomically
  await updateNodeStates(runId, {
    ...parallelStates,
    [nodeId]: { status: 'completed', output: arrayElements }
  });
}
```

**Key Points**:
- Downstream nodes get index suffixes: `worker-1` becomes `worker-1_0`, `worker-1_1`, etc.
- Each parallel instance gets its array element as initial output
- All parallel paths are created atomically in a single database update

### Parallel Instance Execution

When edge-walking encounters a node with parallel instances, it fires ALL instances:

```typescript
export async function fireNodeWithGraph(
  nodeId: string,
  executionGraph: ExecutionGraph,
  run: StitchRun
): Promise<void> {
  // Check for parallel instances
  const parallelKeys = Object.keys(run.node_states).filter(
    key => key.startsWith(`${nodeId}_`) && /_\d+$/.test(key)
  );
  
  if (parallelKeys.length > 0) {
    // Fire all parallel instances concurrently
    await Promise.all(
      parallelKeys.map(async (parallelId) => {
        const state = run.node_states[parallelId];
        const input = state?.output || {};
        
        // Fire based on node type
        switch (node.type) {
          case 'Worker':
            await fireWorkerNode(run.id, parallelId, node.config, input);
            break;
          case 'UX':
            await fireUXNode(run.id, parallelId, node.config, input);
            break;
        }
      })
    );
    return;
  }
  
  // No parallel instances, fire static node normally
  // ...
}
```

### Collector Node Execution

Collectors wait for ALL upstream parallel paths to complete before firing:

```typescript
export async function fireCollectorNode(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  upstreamNodeIds: string[]
): Promise<void> {
  // 1. Get current run state
  const run = await getRun(runId);
  
  // 2. Identify all upstream parallel paths
  const parallelPaths = identifyUpstreamPaths(run.node_states, upstreamNodeIds);
  
  // 3. Count completed paths
  let completedCount = 0;
  for (const upstreamId of parallelPaths) {
    const upstreamState = run.node_states[upstreamId];
    if (upstreamState?.status === 'completed') {
      completedCount++;
    }
  }
  
  // 4. Wait until all paths are completed
  if (completedCount < parallelPaths.length) {
    // Not ready yet, remain pending
    return;
  }
  
  // 5. All paths completed! Merge outputs preserving order
  const mergedOutput = mergeParallelOutputs(run.node_states, parallelPaths);
  
  // 6. Mark collector as completed
  await updateNodeState(runId, nodeId, {
    status: 'completed',
    output: mergedOutput
  });
}
```

**Key Points**:
- Collectors track completion progress in their node state
- Edge-walking may call `fireCollectorNode` multiple times as upstream paths complete
- Only when ALL paths are done does the collector transition to 'completed'
- Outputs are merged in order by sorting parallel instance IDs

### Parallel Path Merging

Outputs from parallel paths are merged into an ordered array:

```typescript
export function mergeParallelOutputs(
  nodeStates: Record<string, NodeState>,
  parallelPaths: string[]
): any[] {
  // Sort parallel paths by their index suffix to preserve order
  const sortedPaths = [...parallelPaths].sort((a, b) => {
    const indexA = extractIndexFromNodeId(a); // "worker_5" -> 5
    const indexB = extractIndexFromNodeId(b);
    return indexA - indexB;
  });
  
  // Extract outputs in order
  return sortedPaths.map(nodeId => {
    const state = nodeStates[nodeId];
    return state?.output;
  });
}
```

### Failure Handling in Parallel Paths

If ANY parallel path fails, the collector fails:

```typescript
// Check for failures
for (const upstreamId of parallelPaths) {
  const upstreamState = run.node_states[upstreamId];
  if (upstreamState?.status === 'failed') {
    await updateNodeState(runId, nodeId, {
      status: 'failed',
      error: `Upstream node ${upstreamId} failed`
    });
    return;
  }
}
```

This ensures data integrity - if one element fails processing, the entire batch is marked as failed.

## Data Flow Through Nodes

### Input Merging

Nodes receive input by merging outputs from all upstream nodes:

```typescript
export function mergeUpstreamOutputs(
  nodeId: string,
  executionGraph: ExecutionGraph,
  run: StitchRun
): any {
  const upstreamNodeIds = getUpstreamNodeIds(nodeId, executionGraph);
  const mergedInput: any = {};
  
  for (const upstreamId of upstreamNodeIds) {
    const upstreamState = run.node_states[upstreamId];
    
    if (upstreamState && upstreamState.output !== undefined) {
      // If output is an object, merge its properties
      if (typeof upstreamState.output === 'object' && !Array.isArray(upstreamState.output)) {
        Object.assign(mergedInput, upstreamState.output);
      } else {
        // For non-object outputs, use the source node ID as the key
        mergedInput[upstreamId] = upstreamState.output;
      }
    }
  }
  
  return mergedInput;
}
```

### Edge Data Mapping

Edges can specify data mappings to transform outputs:

```typescript
// Edge data in execution graph
edgeData: {
  "node-1->node-2": {
    "targetInput": "output.text",  // Map output.text to targetInput
    "anotherInput": "result"       // Map result to anotherInput
  }
}
```

When merging inputs, the engine applies these mappings:

```typescript
const edgeKey = `${upstreamId}->${nodeId}`;
const edgeMapping = executionGraph.edgeData[edgeKey];

if (edgeMapping) {
  // Apply data mapping
  for (const [targetInput, sourcePath] of Object.entries(edgeMapping)) {
    const value = resolvePath(upstreamState.output, sourcePath);
    mergedInput[targetInput] = value;
  }
}
```

## Entity Movement

### Entity Attachment

Workflows can be attached to entities (customers, leads, churned users):

```typescript
const run = await startRun(flowId, {
  entityId: 'entity-uuid',
  trigger: {
    type: 'webhook',
    source: 'linkedin',
    timestamp: new Date().toISOString()
  }
});
```

### Visual Journey

When a workflow has an attached entity:
1. Entity appears on the entry edge (visual journey)
2. As nodes complete, entity moves through the workflow
3. Entity position is tracked in `stitch_entities` table
4. Journey history is recorded in `stitch_journey_events` table

### Entity Movement on Node Completion

Worker nodes can specify entity movement behavior:

```typescript
const workerNode = {
  type: 'Worker',
  data: {
    webhookUrl: 'https://api.example.com/qualify-lead',
    entityMovement: {
      onSuccess: {
        targetSectionId: 'customers-section',
        completeAs: 'success',
        setEntityType: 'customer'  // Convert lead to customer
      },
      onFailure: {
        targetSectionId: 'nurture-section',
        completeAs: 'neutral'
      }
    }
  }
};
```

When the worker completes:
```typescript
export async function applyEntityMovement(
  runId: string,
  nodeId: string,
  config: NodeConfig,
  status: 'completed' | 'failed'
): Promise<void> {
  const run = await getRunAdmin(runId);
  if (!run || !run.entity_id) return;
  
  // Determine which movement action to apply
  const movementAction = status === 'completed' 
    ? config.entityMovement.onSuccess 
    : config.entityMovement.onFailure;
  
  if (movementAction) {
    await moveEntityToSection(
      run.entity_id,
      movementAction.targetSectionId,
      movementAction.completeAs,
      { run_id: runId, node_id: nodeId },
      movementAction.setEntityType  // Optional type conversion
    );
  }
}
```

## Execution Graph Optimization

### Visual Graph vs Execution Graph

Stitch maintains two representations:

**Visual Graph** (stored in `stitch_flows.graph`):
- Contains React Flow properties (positions, styles, dimensions)
- Includes UI-specific data (colors, labels, icons)
- Used for canvas rendering and editing

**Execution Graph** (stored in `stitch_flow_versions.execution_graph`):
- Stripped-down runtime representation
- O(1) lookup structures (adjacency map, node map)
- Pre-computed entry and terminal nodes
- No UI properties

### Compilation Process

When a flow is saved, it's compiled into an execution graph:

```typescript
export function compileToExecutionGraph(visualGraph: VisualGraph): ExecutionGraph {
  const executionGraph: ExecutionGraph = {
    nodes: {},
    adjacency: {},
    edgeData: {},
    entryNodes: [],
    terminalNodes: []
  };
  
  // Convert nodes to execution format (strip UI properties)
  for (const node of visualGraph.nodes) {
    executionGraph.nodes[node.id] = {
      id: node.id,
      type: node.type,
      config: node.data
    };
  }
  
  // Build adjacency map for O(1) edge lookups
  for (const edge of visualGraph.edges) {
    if (!executionGraph.adjacency[edge.source]) {
      executionGraph.adjacency[edge.source] = [];
    }
    executionGraph.adjacency[edge.source].push(edge.target);
    
    // Store edge data mapping if present
    if (edge.data?.mapping) {
      executionGraph.edgeData[`${edge.source}->${edge.target}`] = edge.data.mapping;
    }
  }
  
  // Identify entry nodes (no inbound edges)
  // Identify terminal nodes (no outbound edges)
  // ...
  
  return executionGraph;
}
```

### Performance Benefits

- **O(1) Edge Lookup**: Adjacency map provides constant-time edge traversal
- **No UI Overhead**: Execution doesn't process positions, styles, or React Flow properties
- **Pre-computed Metadata**: Entry and terminal nodes identified once at compile time
- **Smaller Payload**: Execution graph is ~70% smaller than visual graph

## Error Handling and Recovery

### Node Failure

When a node fails:
1. Status is set to 'failed'
2. Error message is stored in node state
3. Edge-walking stops for that path
4. Other parallel paths continue executing

### Retry Mechanism

Failed nodes can be retried:
```typescript
// Transition from 'failed' back to 'running'
await updateNodeState(runId, nodeId, { status: 'running' });

// Re-fire the node
await fireNodeWithGraph(nodeId, executionGraph, run);
```

### Workflow Resumption

Since all state is in the database, workflows can resume after crashes:

1. Server restarts
2. Load run from database
3. Identify nodes in 'running' state
4. Check for stale workers (running > timeout threshold)
5. Mark stale workers as 'failed' or retry

## Related Documentation

- [Architecture Overview](./overview.md) - High-level system architecture
- [Data Flow](./data-flow.md) - Request-to-response flow diagrams
- [Type System](./type-system.md) - TypeScript interfaces and types
- [Execution Engine](../backend/execution-engine.md) - Detailed handler implementations
- [Database Layer](../backend/database-layer.md) - Database operations and schema
