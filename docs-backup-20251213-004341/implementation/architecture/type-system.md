# Type System Architecture

## Overview

Stitch uses TypeScript's type system to enforce correctness across the entire platform. The type system is organized into distinct layers that separate concerns between visual representation, runtime execution, and data persistence.

**Key Principle**: The type system distinguishes between what the user sees (visual graph) and what the engine executes (execution graph), ensuring UI concerns never leak into runtime logic.

## Core Type Categories

### 1. Visual Graph Types (`canvas-schema.ts`)

Visual graph types represent the **UI layer** - what users see and interact with in the canvas editor. These types include all React Flow properties needed for rendering, positioning, and styling.

**Key Types:**
- `VisualNode` - Complete node with position, style, and UI properties
- `VisualEdge` - Edge with animation, style, and visual properties
- `VisualGraph` - Full canvas representation with nodes and edges

**Visual Node Structure:**
```typescript
interface VisualNode {
  id: string;
  type: string;  // worker, ux, splitter, collector, section, item
  position: { x: number; y: number };  // Canvas coordinates
  data: {
    label: string;  // Display name
    worker_type?: string;  // For worker nodes
    config?: Record<string, any>;  // Worker configuration
    inputs?: Record<string, InputSchema>;  // Input validation
    outputs?: Record<string, OutputSchema>;  // Output schema
    entityMovement?: EntityMovementConfig;  // Entity routing
    [key: string]: any;  // Additional UI data
  };
  
  // React Flow nesting properties
  parentNode?: string;  // For nested nodes (items in sections)
  extent?: 'parent';  // Keeps item inside parent
  style?: React.CSSProperties;  // UI styling
  width?: number;  // Explicit dimensions
  height?: number;
}
```

**Visual Edge Structure:**
```typescript
interface VisualEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // Multiple outputs
  targetHandle?: string;  // Multiple inputs
  type?: string;  // default, journey, etc.
  animated?: boolean;  // Visual animation
  style?: React.CSSProperties;  // Edge styling
  
  data?: {
    mapping?: EdgeMapping;  // Data flow configuration
    [key: string]: any;  // Additional UI data
  };
}
```

**When to Use:**
- Canvas editor components
- Mermaid import/export
- Version storage in database
- Any UI rendering logic

### 2. Execution Graph Types (`execution-graph.ts`)

Execution graph types represent the **runtime layer** - the optimized structure used by the execution engine. All UI properties are stripped away, and the graph is restructured for O(1) lookups.

**Key Types:**
- `ExecutionNode` - Stripped node with only execution data
- `ExecutionGraph` - Optimized graph with indexed nodes and adjacency map

**Execution Node Structure:**
```typescript
interface ExecutionNode {
  id: string;  // MUST match VisualNode.id exactly
  type: string;  // Node type for handler selection
  worker_type?: string;  // Worker identifier
  config?: Record<string, any>;  // Worker configuration
  inputs?: Record<string, InputSchema>;  // Input validation
  outputs?: Record<string, OutputSchema>;  // Output schema
  entityMovement?: EntityMovementConfig;  // Entity routing
  // NO position, style, label, or UI properties
}
```

**Execution Graph Structure:**
```typescript
interface ExecutionGraph {
  // O(1) node lookup by ID
  nodes: Record<string, ExecutionNode>;
  
  // O(1) edge traversal: source -> [targets]
  adjacency: Record<string, string[]>;
  
  // O(1) mapping lookup: "source->target" -> mapping
  edgeData: Record<string, EdgeMapping>;
  
  // Pre-computed entry and terminal nodes
  entryNodes: string[];
  terminalNodes: string[];
}
```

**Critical Rule**: `ExecutionNode.id` MUST exactly match `VisualNode.id`. The execution engine logs status updates against these IDs, and the frontend uses them to highlight nodes during execution. Never rename, sanitize, or modify node IDs during compilation.

**When to Use:**
- Workflow execution engine
- Edge-walking logic
- Node handler selection
- Status updates and logging

### 3. Entity Types (`entity.ts`)

Entity types represent **tracked individuals** (customers, leads, churned users) moving through the canvas.

**Key Types:**
- `StitchEntity` - Complete entity with position and journey
- `EntityType` - Classification: 'lead', 'customer', 'churned'
- `JourneyEvent` - Movement event in entity's journey
- `EntityPosition` - Current position on canvas

**Entity Structure:**
```typescript
interface StitchEntity {
  id: string;
  canvas_id: string;
  
  // Identity
  name: string;
  email?: string;
  avatar_url?: string;
  entity_type: EntityType;  // lead, customer, churned
  
  // Position (mutually exclusive)
  current_node_id?: string;  // At a node
  current_edge_id?: string;  // On an edge
  edge_progress?: number;  // 0.0 to 1.0 when on edge
  destination_node_id?: string;  // Target node when on edge
  
  // Journey tracking
  journey: JourneyEvent[];  // Historical movement
  metadata: EntityMetadata;  // Custom data
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
```

**Journey Event Structure:**
```typescript
interface JourneyEvent {
  timestamp: string;
  type: 'entered_node' | 'left_node' | 'started_edge' | 
        'completed_edge' | 'converted' | 'churned';
  node_id?: string;
  edge_id?: string;
  from_node_id?: string;
  workflow_run_id?: string;
  note?: string;
}
```

**When to Use:**
- Entity tracking and visualization
- Journey animations
- Webhook entity creation
- Entity movement between sections

### 4. Worker Types (`worker-definition.ts`, `stitch.ts`)

Worker types define the **integration layer** - how Stitch communicates with external services.

**Key Types:**
- `WorkerDefinition` - Schema for a worker type
- `WorkerPayload` - Outbound message to worker
- `WorkerCallback` - Inbound response from worker

**Worker Definition Structure:**
```typescript
interface WorkerDefinition {
  id: string;  // 'claude', 'minimax', 'elevenlabs', etc.
  name: string;  // Human-readable name
  type: 'sync' | 'async';  // Execution model
  description: string;
  
  // Input/output schemas
  input: Record<string, InputSchema>;
  output: Record<string, OutputSchema>;
  
  // Optional configuration
  config?: WorkerConfig;
}
```

**Worker Protocol (Immutable Contract):**

Outbound (Stitch → Worker):
```typescript
interface WorkerPayload {
  runId: string;
  nodeId: string;
  config: NodeConfig;  // Static node settings
  input: any;  // Data from upstream
  callbackUrl: string;  // Where to send results
}
```

Inbound (Worker → Stitch):
```typescript
interface WorkerCallback {
  status: 'completed' | 'failed';
  output?: any;  // Result data
  error?: string;  // Error message if failed
}
```

**When to Use:**
- Worker registry and implementations
- Worker node execution
- Callback handling
- Worker configuration UI

### 5. Workflow Execution Types (`stitch.ts`)

Workflow execution types represent **runtime state** - the current status of a workflow run.

**Key Types:**
- `StitchRun` - Run instance with node states
- `NodeState` - Execution state of a single node
- `NodeStatus` - Status enum: pending, running, completed, failed

**Run Structure:**
```typescript
interface StitchRun {
  id: string;
  flow_id: string;
  flow_version_id: string | null;  // Snapshot version
  entity_id: string | null;  // Associated entity
  
  // Node execution states
  node_states: Record<string, NodeState>;
  
  // Trigger information
  trigger: TriggerMetadata;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}
```

**Node State Structure:**
```typescript
interface NodeState {
  status: NodeStatus;  // pending, running, completed, failed
  output?: any;  // Node output data
  error?: string;  // Error message if failed
  
  // Collector-specific state
  upstream_completed_count?: number;
  expected_upstream_count?: number;
  upstream_outputs?: Record<string, any>;
}
```

**When to Use:**
- Execution engine state management
- Status polling and updates
- Run history and debugging
- Real-time UI updates

### 6. API Types (`canvas-api.ts`, `workflow-creation.ts`)

API types define **request/response contracts** for REST endpoints.

**Key Types:**
- `CreateCanvasRequest` / `CreateCanvasResponse`
- `RunWorkflowRequest` / `RunWorkflowResponse`
- `WorkflowCreationRequest` - Flexible workflow creation

**Workflow Creation Request:**
```typescript
interface WorkflowCreationRequest {
  // Option 1: Mermaid syntax (quick sketch)
  mermaid?: string;
  
  // Option 2: Full graph (detailed control)
  graph?: VisualGraph;
  
  // Option 3: Hybrid (Mermaid + configs)
  nodeConfigs?: { [nodeId: string]: NodeConfig };
  edgeMappings?: { [edgeKey: string]: EdgeMapping };
}
```

**When to Use:**
- API route handlers
- Client-side API calls
- Request validation
- Response formatting

## Visual vs Execution Graphs

### The Transformation Pipeline

```
User Edits Canvas
       ↓
  VisualGraph (with UI properties)
       ↓
  Save to Database (stitch_flow_versions)
       ↓
  User Starts Run
       ↓
  Compile to ExecutionGraph (strip UI, optimize)
       ↓
  Execute Workflow (edge-walking)
       ↓
  Update Node States (status, output)
       ↓
  UI Polls for Updates (using node IDs)
```

### Key Differences

| Aspect | Visual Graph | Execution Graph |
|--------|-------------|-----------------|
| **Purpose** | UI rendering | Runtime execution |
| **Node Storage** | Array | Record (indexed by ID) |
| **Edge Storage** | Array | Adjacency map + edge data |
| **Properties** | position, style, label, width, height | Only execution data |
| **Lookup Speed** | O(n) | O(1) |
| **Size** | Larger (all UI data) | Smaller (stripped) |
| **When Used** | Canvas editor, version storage | Workflow execution |

### Why Two Representations?

1. **Separation of Concerns**: UI logic never leaks into execution logic
2. **Performance**: O(1) lookups during execution instead of O(n) array searches
3. **Clarity**: Execution engine doesn't need to know about positions or styles
4. **Flexibility**: UI can change without affecting execution
5. **Debugging**: Node IDs remain consistent across both representations

## Schema and Validation Types

### Input/Output Schemas

Schemas define the contract for data flowing through nodes:

```typescript
interface InputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  required: boolean;
  description?: string;
  default?: any;
}

interface OutputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  description?: string;
}
```

**Usage:**
- Worker definitions specify expected inputs/outputs
- Nodes validate incoming data against input schemas
- Edge mappings reference output schemas
- UI shows schema information in node inspector

### Edge Mappings

Edge mappings define how data flows between nodes:

```typescript
interface EdgeMapping {
  [targetInput: string]: string;  // JSONPath or static value
}
```

**Example:**
```typescript
{
  "prompt": "output.text",           // Simple path
  "scenes": "result.data.scenes",    // Nested path
  "duration": "5"                    // Static value
}
```

**When to Use:**
- Wiring node outputs to inputs
- Data transformation between nodes
- Static value injection
- Complex data extraction

## Entity Movement Types

### Entity Movement Configuration

Defines how entities move between sections based on worker outcomes:

```typescript
interface EntityMovementConfig {
  onSuccess?: EntityMovementAction;
  onFailure?: EntityMovementAction;
}

interface EntityMovementAction {
  targetSectionId: string;  // Where to move entity
  completeAs: 'success' | 'failure' | 'neutral';  // Completion status
  setEntityType?: 'customer' | 'churned' | 'lead';  // Type conversion
}
```

**Example:**
```typescript
{
  onSuccess: {
    targetSectionId: "production",
    completeAs: "success",
    setEntityType: "customer"  // Convert lead to customer
  },
  onFailure: {
    targetSectionId: "support",
    completeAs: "failure"
  }
}
```

**When to Use:**
- Worker node configuration
- Entity routing logic
- Conversion tracking
- Journey visualization

## Type Safety Patterns

### Discriminated Unions

Journey events use discriminated unions for type safety:

```typescript
type DatabaseJourneyEvent = {
  source: 'database';
  event_type: 'node_arrival' | 'edge_start' | ...;
  // ... database-specific fields
};

type FallbackJourneyEvent = {
  source: 'fallback';
  type: string;
  // ... fallback-specific fields
};

type TypedJourneyEvent = DatabaseJourneyEvent | FallbackJourneyEvent;
```

**Type Guards:**
```typescript
function isDatabaseEvent(event: TypedJourneyEvent): event is DatabaseJourneyEvent {
  return event.source === 'database';
}
```

### Strict Null Checking

All types use strict null checking:
- Optional fields use `?:` syntax
- Nullable fields use `| null` union
- Required fields have no null/undefined

### Type Inference

TypeScript infers types from usage:
```typescript
const node: VisualNode = { ... };
const execNode: ExecutionNode = {
  id: node.id,
  type: node.type,
  // TypeScript ensures we don't include UI properties
};
```

## Common Type Patterns

### Node Type Discrimination

```typescript
function handleNode(node: ExecutionNode) {
  switch (node.type) {
    case 'worker':
      return handleWorkerNode(node);
    case 'splitter':
      return handleSplitterNode(node);
    case 'collector':
      return handleCollectorNode(node);
    // TypeScript ensures all cases are handled
  }
}
```

### Status Type Safety

```typescript
type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting_for_user';

// TypeScript prevents invalid status values
const status: NodeStatus = 'invalid';  // ❌ Type error
const status: NodeStatus = 'completed';  // ✅ Valid
```

### Generic Data Handling

```typescript
// Worker outputs are typed as 'any' for flexibility
interface NodeState {
  output?: any;  // Different workers return different shapes
}

// But worker definitions specify expected output schema
interface WorkerDefinition {
  output: Record<string, OutputSchema>;  // Schema for validation
}
```

## Type Organization

### File Structure

```
src/types/
├── canvas-schema.ts       # Visual graph types (UI layer)
├── execution-graph.ts     # Execution graph types (runtime layer)
├── entity.ts              # Entity tracking types
├── stitch.ts              # Core workflow types
├── worker-definition.ts   # Worker integration types
├── canvas-api.ts          # API request/response types
├── workflow-creation.ts   # Workflow creation types
├── journey-event.ts       # Journey event types
└── media.ts               # Media library types
```

### Import Patterns

```typescript
// Visual layer imports
import { VisualGraph, VisualNode, VisualEdge } from '@/types/canvas-schema';

// Execution layer imports
import { ExecutionGraph, ExecutionNode } from '@/types/execution-graph';

// Entity layer imports
import { StitchEntity, JourneyEvent } from '@/types/entity';

// Worker layer imports
import { WorkerDefinition, WorkerPayload } from '@/types/worker-definition';
```

## Best Practices

### 1. Never Mix Visual and Execution Types

❌ **Bad:**
```typescript
function executeNode(node: VisualNode) {
  // Execution logic shouldn't see UI properties
}
```

✅ **Good:**
```typescript
function executeNode(node: ExecutionNode) {
  // Only execution data is visible
}
```

### 2. Preserve Node IDs Across Transformations

❌ **Bad:**
```typescript
const execNode = {
  id: sanitize(visualNode.id),  // ❌ Changes ID
  // ...
};
```

✅ **Good:**
```typescript
const execNode = {
  id: visualNode.id,  // ✅ Preserves ID exactly
  // ...
};
```

### 3. Use Type Guards for Discriminated Unions

✅ **Good:**
```typescript
if (isDatabaseEvent(event)) {
  // TypeScript knows event is DatabaseJourneyEvent
  console.log(event.event_type);
}
```

### 4. Validate Against Schemas

✅ **Good:**
```typescript
function validateInput(input: any, schema: Record<string, InputSchema>) {
  for (const [key, def] of Object.entries(schema)) {
    if (def.required && !(key in input)) {
      throw new Error(`Missing required input: ${key}`);
    }
  }
}
```

### 5. Use Strict TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

## Related Documentation

- [Execution Model](./execution-model.md) - How execution graphs are used
- [Data Flow](./data-flow.md) - How data moves through types
- [Canvas System](../backend/canvas-system.md) - Visual to execution compilation
- [Worker System](../backend/worker-system.md) - Worker type definitions

## Summary

The Stitch type system provides:
- **Clear separation** between UI and execution concerns
- **Type safety** across the entire platform
- **Performance optimization** through indexed structures
- **Flexibility** for different worker types and data shapes
- **Consistency** through strict null checking and discriminated unions

By maintaining distinct type layers, Stitch ensures that UI changes never break execution logic, and execution optimizations never complicate the UI.
