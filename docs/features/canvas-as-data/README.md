# Canvas as Data

## Overview

The Canvas as Data feature transforms Stitch canvases from in-memory structures to a robust, versioned, database-backed system. This enables:

- **AI Management**: LLMs can create and modify workflows using JSON or Mermaid
- **CLI Control**: Programmatic canvas management via API
- **Version History**: Track changes over time with immutable snapshots
- **Proper Execution**: Workflows execute against specific versions, not live canvases

## Key Concepts

### Visual Graph vs Execution Graph

**Visual Graph**: The complete React Flow JSON structure including UI properties (positions, styles, labels). Used for rendering the canvas in the UI.

**Execution Graph (OEG)**: An optimized, stripped version designed for runtime execution. Contains only the data needed to run workflows efficiently.

```
Visual Graph (UI)  →  [Compile & Validate]  →  Execution Graph (Runtime)
     ↓                                                    ↓
  Rendering                                          Execution
```

### Versioning Model

Every time you save a canvas, a new immutable version is created:

```
stitch_flows (metadata)
    ↓
stitch_flow_versions (snapshots)
    ↓
stitch_runs (executions)
```

- **Flow**: Container with metadata (name, user, current version pointer)
- **Version**: Immutable snapshot with both visual and execution graphs
- **Run**: Execution instance that references a specific version

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React Flow   │  │ Canvas Editor│  │ Run Viewer   │      │
│  │ UI           │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Flow CRUD    │  │ Version Mgmt │  │ Run Execution│      │
│  │ /api/flows   │  │ /api/flows/  │  │ /api/flows/  │      │
│  │              │  │ [id]/versions│  │ [id]/run     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Version      │  │ OEG Compiler │  │ Mermaid      │      │
│  │ Manager      │  │ (Validate &  │  │ Parser       │      │
│  │              │  │  Optimize)   │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer (Supabase)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ stitch_flows │  │ stitch_flow_ │  │ stitch_runs  │      │
│  │ (metadata)   │  │ versions     │  │ (execution)  │      │
│  │              │  │ (snapshots)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Documentation Index

- **[API Reference](./API.md)**: Complete API endpoint documentation
- **[Architecture](./ARCHITECTURE.md)**: Detailed system architecture and design
- **[Version Management](./VERSION_MANAGEMENT.md)**: How versioning works
- **[Mermaid Integration](./MERMAID.md)**: Using Mermaid for workflow creation
- **[Workflow Examples](./EXAMPLES.md)**: Common workflow patterns
- **[Migration Guide](./MIGRATION.md)**: Migrating existing flows to versioned system
- **[Changelog](./CHANGELOG.md)**: Recent stability patches and updates

## Quick Start

### Creating a Flow with Mermaid

```typescript
// POST /api/flows
const response = await fetch('/api/flows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Workflow',
    mermaid: `
      flowchart LR
        A[Input Form] --> B[Claude Script Generator]
        B --> C[MiniMax Video Generator]
        C --> D[Output]
    `,
    nodeConfigs: {
      B: {
        workerType: 'claude',
        config: { model: 'claude-3-sonnet-20240229' }
      },
      C: {
        workerType: 'minimax',
        config: { duration: 10 }
      }
    }
  })
});

const { flowId, versionId } = await response.json();
```

### Running a Flow

```typescript
// POST /api/flows/[id]/run
const response = await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Optional: provide updated visual graph for auto-versioning
    visualGraph: updatedGraph
  })
});

const { runId } = await response.json();
```

### Viewing Version History

```typescript
// GET /api/flows/[id]/versions
const response = await fetch(`/api/flows/${flowId}/versions`);
const versions = await response.json();

// versions is an array ordered by created_at DESC
versions.forEach(version => {
  console.log(version.id, version.created_at, version.commit_message);
});
```

## Core Features

### 1. Automatic Versioning

When you click "Run" with unsaved changes, a new version is automatically created:

```typescript
// The system detects changes and creates a version before execution
const versionId = await autoVersionOnRun(flowId, currentVisualGraph);
const run = await createRun(flowId, versionId);
```

### 2. Graph Validation

All graphs are validated before saving:

```typescript
const result = compileToOEG(visualGraph);

if (!result.success) {
  // result.errors contains validation errors:
  // - Cycle detection
  // - Missing required inputs
  // - Invalid worker types
  // - Invalid edge mappings
  console.error('Validation failed:', result.errors);
}
```

### 3. Optimized Execution

The execution graph is optimized for runtime performance:

- **60% smaller** than visual graph
- **O(1) edge lookup** via adjacency map
- **Pre-computed** entry and terminal nodes
- **Indexed** edge data for fast mapping

### 4. Historical Runs

Old runs always show the exact version that was executed:

```typescript
// Load run
const run = await getRun(runId);

// Load the version that was executed
const version = await getVersion(run.flow_version_id);

// Render the historical canvas
renderCanvas(version.visual_graph);
```

## Benefits

### For Developers

- **Type Safety**: Full TypeScript schemas for all graph structures
- **Validation**: Catch errors at save time, not runtime
- **Debugging**: See exactly what version was executed
- **Testing**: Property-based tests verify correctness

### For AI/LLMs

- **Natural Format**: Use Mermaid for quick workflow sketches
- **JSON Control**: Full control with detailed JSON when needed
- **Hybrid Approach**: Combine Mermaid structure with JSON configs
- **Programmatic**: Create and modify workflows via API

### For Users

- **Version History**: Track changes over time
- **Rollback**: Revert to previous versions
- **Confidence**: Know exactly what will execute
- **Debugging**: See historical execution states

## Next Steps

1. Read the [API Reference](./API.md) for detailed endpoint documentation
2. Check out [Workflow Examples](./EXAMPLES.md) for common patterns
3. Learn about [Version Management](./VERSION_MANAGEMENT.md) workflows
4. Explore [Mermaid Integration](./MERMAID.md) for AI-friendly workflow creation
