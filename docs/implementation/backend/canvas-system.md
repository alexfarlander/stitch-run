# Canvas System

## Overview

The Canvas System is the core compilation and validation layer that transforms visual workflow graphs into optimized execution graphs. It consists of three main components:

1. **Version Manager** - Manages flow versions, auto-versioning, and database operations
2. **OEG Compiler** - Compiles visual graphs to Optimized Execution Graphs (OEG)
3. **Graph Validator** - Validates graphs for cycles, missing inputs, and invalid configurations

The canvas system bridges the gap between the visual editor (React Flow) and the execution engine, ensuring that only valid, optimized workflows are executed.

## Architecture

### Data Flow

```
Visual Graph (UI) 
    ↓
[Validation] → Errors or Continue
    ↓
[Compilation] → Execution Graph (OEG)
    ↓
[Version Creation] → Database Storage
    ↓
[Execution Engine] → Workflow Execution
```

### Key Principles

**Database as Source of Truth**
- All versions are persisted to `stitch_flow_versions` table
- Visual graph and execution graph stored together
- Current version tracked in `stitch_flows.current_version_id`

**Immutable Versions**
- Once created, versions never change
- Each edit creates a new version
- Version history preserved for rollback

**Validation Before Execution**
- Graphs validated before compilation
- Invalid graphs rejected with detailed errors
- No invalid workflows can be executed

## Components

### 1. Version Manager

**Location:** `src/lib/canvas/version-manager.ts`

The Version Manager handles all version-related operations including creation, retrieval, and auto-versioning.

#### Core Functions

##### `createVersion(flowId, visualGraph, commitMessage?)`

Creates a new version of a flow by compiling and storing both visual and execution graphs.

**Process:**
1. Compile visual graph to OEG (validates and optimizes)
2. Insert version record with both graphs
3. Update `current_version_id` in `stitch_flows`

**Parameters:**
- `flowId` - The flow to create a version for
- `visualGraph` - The visual graph to version
- `commitMessage` - Optional commit message describing changes

**Returns:**
- `versionId` - The created version ID
- `executionGraph` - The compiled execution graph

**Throws:**
- `ValidationFailureError` - If graph validation fails
- `Error` - If database operations fail

**Example:**
```typescript
try {
  const { versionId, executionGraph } = await createVersion(
    'flow-123',
    visualGraph,
    'Added new worker node'
  );
  console.log('Version created:', versionId);
} catch (error) {
  if (error instanceof ValidationFailureError) {
    console.error('Validation errors:', error.errors);
  }
}
```

##### `getVersion(versionId)`

Retrieves a specific version by ID.

**Parameters:**
- `versionId` - The version ID to retrieve

**Returns:**
- `FlowVersion` - Complete version with visual and execution graphs
- `null` - If version not found

**Example:**
```typescript
const version = await getVersion('version-456');
if (version) {
  console.log('Visual graph:', version.visual_graph);
  console.log('Execution graph:', version.execution_graph);
}
```

##### `getVersionAdmin(versionId)`

Same as `getVersion` but uses admin client for webhook endpoints without auth.

**Use Case:** Webhook endpoints that need to access versions without user session.

##### `listVersions(flowId)`

Lists all versions for a flow, returning lightweight metadata only.

**Performance Note:** Excludes `visual_graph` and `execution_graph` to avoid downloading megabytes of JSON. Use `getVersion()` to fetch full version data.

**Parameters:**
- `flowId` - The flow to list versions for

**Returns:**
- Array of `FlowVersionMetadata` ordered by `created_at` DESC (newest first)

**Example:**
```typescript
const versions = await listVersions('flow-123');
versions.forEach(v => {
  console.log(`${v.created_at}: ${v.commit_message}`);
});
```

##### `autoVersionOnRun(flowId, currentVisualGraph)`

Auto-versions a flow before execution if there are unsaved changes.

**Process:**
1. Get current version from flow
2. If no version exists, create first version
3. If version exists, compare with current graph
4. If changes detected, create new version
5. Return version ID to use for run

**Parameters:**
- `flowId` - The flow to auto-version
- `currentVisualGraph` - The current visual graph from UI

**Returns:**
- `versionId` - Version ID to use for the run (existing or newly created)

**Example:**
```typescript
// Before starting a run
const versionId = await autoVersionOnRun('flow-123', currentGraph);
await startRun(flowId, versionId, inputs);
```

#### Data Types

**FlowVersion**
```typescript
interface FlowVersion {
  id: string;
  flow_id: string;
  visual_graph: VisualGraph;
  execution_graph: ExecutionGraph;
  commit_message: string | null;
  created_at: string;
}
```

**FlowVersionMetadata** (lightweight)
```typescript
interface FlowVersionMetadata {
  id: string;
  flow_id: string;
  commit_message: string | null;
  created_at: string;
}
```

**ValidationFailureError**
```typescript
class ValidationFailureError extends Error {
  constructor(message: string, errors: ValidationError[])
}
```

### 2. OEG Compiler

**Location:** `src/lib/canvas/compile-oeg.ts`

The OEG (Optimized Execution Graph) Compiler transforms visual graphs into optimized execution graphs for runtime.

#### Compilation Process

The compiler performs five key steps:

**1. VALIDATION**
- Check for cycles (would cause infinite loops)
- Validate required inputs have connections or defaults
- Validate worker types are registered
- Validate edge mappings reference valid fields

**2. OPTIMIZATION**
- Build adjacency map for O(1) edge lookup
- Index nodes by ID for instant access
- Index edge data by "source->target" for mapping lookup

**3. STRIPPING**
- Remove UI properties (position, style, label, width, height)
- Keep only runtime-necessary data
- Preserve node IDs exactly (critical for status updates)

**4. INDEXING**
- Create node lookup: `{ "node1": ExecutionNode, ... }`
- Create adjacency map: `{ "nodeA": ["nodeB", "nodeC"], ... }`
- Create edge data map: `{ "nodeA->nodeB": EdgeMapping, ... }`

**5. COMPUTATION**
- Compute entry nodes (no incoming edges)
- Compute terminal nodes (no outgoing edges)

#### Core Function

##### `compileToOEG(visualGraph)`

Compiles a visual graph to an optimized execution graph.

**Parameters:**
- `visualGraph` - The visual graph to compile

**Returns:**
- `CompileResult` - Either success with execution graph or failure with errors

**Example:**
```typescript
const result = compileToOEG(visualGraph);

if (result.success) {
  console.log('Compiled successfully');
  console.log('Entry nodes:', result.executionGraph.entryNodes);
  console.log('Terminal nodes:', result.executionGraph.terminalNodes);
} else {
  console.error('Compilation failed:', result.errors);
}
```

#### Data Structures

**Visual Graph → Execution Graph Transformation**

```typescript
// BEFORE (Visual Graph)
{
  nodes: [
    {
      id: "worker1",
      type: "worker",
      position: { x: 100, y: 200 },  // ← UI property
      style: { ... },                 // ← UI property
      data: {
        label: "Claude Worker",       // ← UI property
        worker_type: "claude",
        config: { model: "claude-3" },
        inputs: { prompt: { type: "string", required: true } },
        outputs: { text: { type: "string" } }
      }
    }
  ],
  edges: [
    {
      id: "e1",
      source: "worker1",
      target: "worker2",
      data: { mapping: { input: "output.text" } }
    }
  ]
}

// AFTER (Execution Graph)
{
  nodes: {
    "worker1": {
      id: "worker1",              // ← ID preserved exactly
      type: "worker",
      worker_type: "claude",
      config: { model: "claude-3" },
      inputs: { prompt: { type: "string", required: true } },
      outputs: { text: { type: "string" } }
      // position, style, label removed
    }
  },
  adjacency: {
    "worker1": ["worker2"]        // ← O(1) edge lookup
  },
  edgeData: {
    "worker1->worker2": { input: "output.text" }  // ← O(1) mapping lookup
  },
  entryNodes: ["worker1"],
  terminalNodes: ["worker2"]
}
```

#### Critical Implementation Details

**Node ID Preservation**

Node IDs are preserved exactly during compilation. This is critical because:
- The execution engine logs status updates against these IDs
- The frontend uses these IDs to highlight nodes during execution
- Changing IDs would break the connection between UI and execution

**DO NOT:**
- Rename node IDs
- Sanitize node IDs
- Modify node IDs in any way

**Adjacency Map Optimization**

The adjacency map enables O(1) edge traversal during execution:
```typescript
// Instead of iterating all edges to find downstream nodes:
const downstream = edges.filter(e => e.source === nodeId).map(e => e.target);

// We do instant lookup:
const downstream = adjacency[nodeId];
```

**Edge Data Indexing**

Edge data is indexed by "source->target" for instant mapping lookup:
```typescript
// Instead of searching all edges:
const edge = edges.find(e => e.source === sourceId && e.target === targetId);
const mapping = edge?.data?.mapping;

// We do instant lookup:
const mapping = edgeData[`${sourceId}->${targetId}`];
```

### 3. Graph Validator

**Location:** `src/lib/canvas/validate-graph.ts`

The Graph Validator performs comprehensive validation to ensure workflows are executable.

#### Validation Checks

##### 1. Cycle Detection

**Purpose:** Prevent infinite loops during execution

**Algorithm:** Depth-First Search (DFS) with three states:
- WHITE (0): Not visited
- GRAY (1): Currently being explored (in recursion stack)
- BLACK (2): Fully explored

If we encounter a GRAY node during DFS, we have a cycle.

**Example Error:**
```
Graph contains a cycle: nodeA -> nodeB -> nodeC -> nodeA. 
This would cause infinite loops during execution.
```

##### 2. Required Input Validation

**Purpose:** Ensure all required inputs have data sources

**Strict Validation:** Required inputs MUST have either:
1. An explicit edge mapping (`edge.data.mapping[inputName]`)
2. A default value (`inputDef.default`)

**Why Strict?**
- Runtime will crash if upstream node doesn't provide expected data
- Better to catch at validation time than at runtime
- Explicit mappings make data flow clear

**Example Error:**
```
Required input "prompt" on node "worker1" has no explicit mapping or default value. 
Add an edge with data.mapping or provide a default.
```

##### 3. Worker Type Validation

**Purpose:** Ensure worker nodes reference registered workers

**Check:** Validates `worker_type` against worker registry

**Example Error:**
```
Unknown worker type: "invalid-worker" on node "worker1". 
Valid types: claude, minimax, elevenlabs, shotstack, ...
```

##### 4. Edge Mapping Validation

**Purpose:** Ensure edge mappings reference valid fields

**Checks:**
- Target input exists on target node
- Source path is a non-empty string
- Nodes referenced by edge exist

**Example Error:**
```
Edge "e1" maps to non-existent input "invalid" on target node "worker2"
```

##### 5. Splitter/Collector Validation

**Purpose:** Ensure parallel execution patterns are correct

**Checks:**
- Splitters fan out to multiple paths (at least 2)
- Collectors fan in from multiple paths (at least 2)
- Splitters connect to collectors
- Collectors have upstream splitters

**Example Error:**
```
Splitter node "split1" only connects to one downstream node. 
Splitters should fan out to multiple parallel paths.
```

##### 6. Entity Movement Validation

**Purpose:** Ensure entity movement configuration is valid

**Checks:**
- `targetSectionId` references an existing node
- `completeAs` has valid value (success, failure, neutral)
- `setEntityType` (if present) has valid type (customer, lead, churned)

**Example Error:**
```
Worker node "worker1" entityMovement.onSuccess.targetSectionId 
references non-existent node: "invalid-section"
```

#### Core Function

##### `validateGraph(graph)`

Validates a visual graph and returns array of errors.

**Parameters:**
- `graph` - The visual graph to validate

**Returns:**
- Array of `ValidationError` (empty if valid)

**Example:**
```typescript
const errors = validateGraph(visualGraph);

if (errors.length > 0) {
  console.error('Validation failed:');
  errors.forEach(err => {
    console.error(`- [${err.type}] ${err.message}`);
    if (err.node) console.error(`  Node: ${err.node}`);
    if (err.field) console.error(`  Field: ${err.field}`);
  });
} else {
  console.log('Graph is valid');
}
```

#### Validation Error Types

```typescript
interface ValidationError {
  type: 'cycle' | 'missing_input' | 'invalid_worker' | 
        'invalid_mapping' | 'splitter_collector_mismatch' | 
        'invalid_entity_movement';
  node?: string;      // Node ID where error occurred
  edge?: string;      // Edge ID where error occurred
  field?: string;     // Specific field with error
  message: string;    // Human-readable error message
}
```

## Integration with Execution Engine

### Version-Based Execution

The execution engine always runs against a specific version:

```typescript
// 1. Auto-version before run
const versionId = await autoVersionOnRun(flowId, currentGraph);

// 2. Start run with version
const run = await startRun(flowId, versionId, inputs);

// 3. Engine loads execution graph from version
const version = await getVersion(versionId);
const executionGraph = version.execution_graph;

// 4. Engine executes using OEG
await executeWorkflow(run.id, executionGraph);
```

### Status Updates

The execution engine updates node status using the preserved node IDs:

```typescript
// Engine logs status against node ID
await updateNodeStatus(runId, nodeId, 'running');

// Frontend highlights node using same ID
const node = nodes.find(n => n.id === nodeId);
node.data.status = 'running';
```

## Database Schema

### stitch_flow_versions

```sql
CREATE TABLE stitch_flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  visual_graph JSONB NOT NULL,      -- Complete visual graph with UI properties
  execution_graph JSONB NOT NULL,   -- Optimized execution graph (OEG)
  commit_message TEXT,              -- Optional description of changes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flow_versions_flow_id ON stitch_flow_versions(flow_id);
CREATE INDEX idx_flow_versions_created_at ON stitch_flow_versions(created_at DESC);
```

### stitch_flows

```sql
CREATE TABLE stitch_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  current_version_id UUID REFERENCES stitch_flow_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Error Handling

### Validation Errors

Validation errors are collected and returned as an array, allowing the UI to display all issues at once:

```typescript
try {
  const { versionId } = await createVersion(flowId, visualGraph);
} catch (error) {
  if (error instanceof ValidationFailureError) {
    // Display all validation errors to user
    error.errors.forEach(err => {
      showError(`${err.type}: ${err.message}`);
    });
  }
}
```

### Database Errors

Database errors are thrown as standard Error objects:

```typescript
try {
  const version = await getVersion(versionId);
} catch (error) {
  console.error('Database error:', error.message);
}
```

## Performance Considerations

### Version Listing

`listVersions()` excludes heavy JSON blobs to prevent bandwidth issues:

```typescript
// BAD: Downloads megabytes of JSON
const versions = await supabase
  .from('stitch_flow_versions')
  .select('*')  // Includes visual_graph and execution_graph
  .eq('flow_id', flowId);

// GOOD: Only downloads metadata
const versions = await supabase
  .from('stitch_flow_versions')
  .select('id, flow_id, commit_message, created_at')
  .eq('flow_id', flowId);
```

### Compilation Optimization

The OEG compiler creates O(1) lookup structures:

- **Node lookup:** `O(1)` instead of `O(N)` array search
- **Edge traversal:** `O(1)` instead of `O(E)` edge filtering
- **Mapping lookup:** `O(1)` instead of `O(E)` edge search

This makes execution significantly faster for large workflows.

### Deep Equality Check

The version manager uses sorted JSON serialization for deep equality:

```typescript
function deepEqual(a: any, b: any): boolean {
  const sortKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = sortKeys(obj[key]);
    });
    return sorted;
  };
  
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}
```

**Limitations:**
- Doesn't handle functions, undefined, or circular references
- Good enough for visual graphs (pure JSON)

## Common Patterns

### Creating a Version

```typescript
import { createVersion } from '@/lib/canvas/version-manager';

const { versionId, executionGraph } = await createVersion(
  flowId,
  visualGraph,
  'Added new worker node'
);
```

### Auto-Versioning Before Run

```typescript
import { autoVersionOnRun } from '@/lib/canvas/version-manager';

const versionId = await autoVersionOnRun(flowId, currentGraph);
await startRun(flowId, versionId, inputs);
```

### Validating a Graph

```typescript
import { validateGraph } from '@/lib/canvas/validate-graph';

const errors = validateGraph(visualGraph);
if (errors.length > 0) {
  throw new Error('Graph validation failed');
}
```

### Compiling to OEG

```typescript
import { compileToOEG } from '@/lib/canvas/compile-oeg';

const result = compileToOEG(visualGraph);
if (!result.success) {
  console.error('Compilation failed:', result.errors);
  return;
}

const executionGraph = result.executionGraph;
```

## Testing

### Unit Tests

The canvas system has comprehensive unit tests:

- `src/lib/canvas/__tests__/validate-graph.test.ts` - Validation tests
- `src/lib/canvas/__tests__/compile-oeg.test.ts` - Compilation tests
- `src/lib/canvas/__tests__/version-manager.test.ts` - Version management tests

### Test Coverage

Key test scenarios:
- Cycle detection with various graph structures
- Required input validation with mappings and defaults
- Worker type validation with valid and invalid types
- Edge mapping validation with nested paths
- Splitter/collector pair validation
- Entity movement validation
- OEG compilation and optimization
- Version creation and retrieval
- Auto-versioning logic

## Related Documentation

- [Architecture Overview](../architecture/overview.md) - System architecture
- [Type System](../architecture/type-system.md) - Visual vs execution graphs
- [Execution Engine](./execution-engine.md) - How OEGs are executed
- [Database Layer](./database-layer.md) - Version storage and retrieval
