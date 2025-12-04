# Version Management

Complete guide to version management in Canvas as Data.

## Overview

Every canvas in Stitch is versioned. When you save changes, a new immutable version is created. This ensures:

- **Historical accuracy**: Old runs always show the exact canvas that was executed
- **Safe experimentation**: Try changes without affecting running workflows
- **Audit trail**: Track who changed what and when
- **Rollback capability**: Revert to previous versions easily

## Architecture

### Client-Server Separation

Version management follows a strict client-server architecture to protect sensitive environment variables:

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Components                          │
│  (VersionHistory.tsx, StitchCanvas.tsx)                     │
│                                                              │
│  - Display version history                                   │
│  - Handle user interactions                                  │
│  - Detect unsaved changes                                    │
│  - Make API calls                                            │
└──────────────────┬───────────────────────────────────────────┘
                   │ HTTP/JSON
                   │
┌──────────────────▼───────────────────────────────────────────┐
│                   API Routes                                 │
│  (/api/flows/[id]/versions/*)                               │
│                                                              │
│  - Validate requests                                         │
│  - Call version manager functions                            │
│  - Handle errors                                             │
│  - Return formatted responses                                │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│                Version Manager                               │
│  (src/lib/canvas/version-manager.ts)                        │
│                                                              │
│  - Create versions                                           │
│  - List versions                                             │
│  - Get specific versions                                     │
│  - Auto-version on run                                       │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│              Supabase Server Client                          │
│  (src/lib/supabase/server.ts)                               │
│                                                              │
│  - Uses SUPABASE_SERVICE_ROLE_KEY                           │
│  - Bypasses Row Level Security                              │
│  - Server-side only                                          │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**

- Client components NEVER import `version-manager.ts` directly
- All database operations go through API routes
- Server-only environment variables stay server-side
- API routes use Next.js 16 async params pattern

## Version Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Version Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

1. Edit Canvas
   ↓
2. Save (Create Version)
   ↓
3. Validate & Compile
   ↓
4. Store Visual + Execution Graphs
   ↓
5. Update Current Version Pointer
   ↓
6. Version is Immutable
```

## Creating Versions

### Manual Save

Explicitly create a version with a commit message:

**Server-side (API routes, server components):**

```typescript
import { createVersion } from '@/lib/canvas/version-manager';

const { versionId, executionGraph } = await createVersion(
  flowId,
  visualGraph,
  'Added error handling for API failures'
);
```

**Client-side (React components):**

```typescript
const response = await fetch(`/api/flows/${flowId}/versions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visualGraph: currentGraph,
    commitMessage: 'Added error handling for API failures'
  })
});

if (!response.ok) {
  throw new Error('Failed to save version');
}

const { versionId, executionGraph } = await response.json();
```

### Auto-Versioning on Run

When you click "Run" with unsaved changes, a version is automatically created:

```typescript
import { autoVersionOnRun } from '@/lib/canvas/version-manager';

// Detects changes and creates version if needed
const versionId = await autoVersionOnRun(flowId, currentVisualGraph);

// Then create run with this version
const run = await createRun(flowId, versionId);
```

**Auto-versioning logic:**

1. Load current version from database
2. Compare with current visual graph
3. If different: create new version with message "Auto-versioned on run"
4. If same: use existing version
5. Return version ID for run creation

### First Version

When creating a new flow, you can optionally create the first version:

```typescript
// Create flow
const flow = await createFlow({
  name: 'My Workflow',
  user_id: userId
});

// Create first version
const version = await createVersion(
  flow.id,
  visualGraph,
  'Initial version'
);
```

Or create flow and version in one step via API:

```typescript
const response = await fetch('/api/flows', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My Workflow',
    visualGraph: initialGraph,
    commitMessage: 'Initial version'
  })
});
```

## Version Structure

Each version contains:

```typescript
interface FlowVersion {
  id: string;                      // Unique version ID
  flow_id: string;                 // Parent flow
  visual_graph: VisualGraph;       // For UI rendering
  execution_graph: ExecutionGraph; // For runtime execution
  commit_message: string | null;   // Optional description
  created_at: string;              // Timestamp
}
```

### Visual Graph

Contains everything needed to render the canvas:

- Node positions, styles, labels
- Edge styles, animations
- Worker configurations
- Input/output schemas
- Entity movement configs

### Execution Graph

Optimized for runtime performance:

- Stripped of UI properties (60% smaller)
- Adjacency map for O(1) edge lookup
- Pre-computed entry and terminal nodes
- Indexed edge data for fast mapping

## Validation

All versions are validated before creation:

```typescript
const result = compileToOEG(visualGraph);

if (!result.success) {
  throw new ValidationError('Graph validation failed', result.errors);
}
```

### Validation Checks

1. **Cycle Detection**: Graphs must be acyclic (DAGs)
2. **Strict Required Input Validation**: All required inputs must have **explicit edge mappings** or defaults
   - Implicit data passing is disabled for safety
   - Merely connecting an edge is not enough
   - Each required input must be satisfied by `edge.data.mapping[inputName]` or `inputDef.default`
3. **Worker Types**: All worker types must exist in registry
4. **Edge Mappings**: All mappings must reference valid fields

### Handling Validation Errors

```typescript
try {
  const version = await createVersion(flowId, visualGraph);
} catch (error) {
  if (error instanceof ValidationError) {
    // Display errors to user
    error.errors.forEach(err => {
      console.error(`${err.type} at node ${err.node}: ${err.message}`);
    });
  }
}
```

## Version History

### Listing Versions

Get all versions for a flow, ordered by creation date (newest first):

**Note:** The API endpoint `GET /api/flows/[id]/versions` returns metadata only (no graph blobs) to avoid bandwidth issues.

**Server-side (API routes, server components):**

```typescript
import { listVersions } from '@/lib/canvas/version-manager';

const versions = await listVersions(flowId);

versions.forEach(version => {
  console.log(`${version.created_at}: ${version.commit_message || 'No message'}`);
});

// To get full version data with graphs:
import { getVersion } from '@/lib/canvas/version-manager';
const fullVersion = await getVersion(versions[0].id);
console.log('Visual graph:', fullVersion.visual_graph);
```

**Client-side (React components):**

```typescript
// Fetch version list (metadata only)
const response = await fetch(`/api/flows/${flowId}/versions`);
const { versions } = await response.json();

versions.forEach(version => {
  console.log(`${version.created_at}: ${version.commit_message || 'No message'}`);
});

// To get full version data with graphs:
const versionResponse = await fetch(`/api/flows/${flowId}/versions/${versionId}`);
const { version } = await versionResponse.json();
console.log('Visual graph:', version.visual_graph);
```

### Retrieving Specific Version

**Server-side (API routes, server components):**

```typescript
import { getVersion } from '@/lib/canvas/version-manager';

const version = await getVersion(versionId);

if (version) {
  // Render historical canvas
  renderCanvas(version.visual_graph);
}
```

**Client-side (React components):**

```typescript
const response = await fetch(`/api/flows/${flowId}/versions/${versionId}`);
if (!response.ok) {
  throw new Error('Version not found');
}

const { version } = await response.json();

if (version) {
  // Render historical canvas
  renderCanvas(version.visual_graph);
}
```

### Version Comparison

Compare two versions to see what changed:

```typescript
const oldVersion = await getVersion(oldVersionId);
const newVersion = await getVersion(newVersionId);

// Compare nodes
const addedNodes = newVersion.visual_graph.nodes.filter(
  n => !oldVersion.visual_graph.nodes.find(o => o.id === n.id)
);

const removedNodes = oldVersion.visual_graph.nodes.filter(
  n => !newVersion.visual_graph.nodes.find(o => o.id === n.id)
);

const modifiedNodes = newVersion.visual_graph.nodes.filter(n => {
  const oldNode = oldVersion.visual_graph.nodes.find(o => o.id === n.id);
  return oldNode && !deepEqual(oldNode, n);
});

console.log('Added:', addedNodes.length);
console.log('Removed:', removedNodes.length);
console.log('Modified:', modifiedNodes.length);
```

## Current Version Pointer

Each flow has a `current_version_id` that points to the latest version:

```typescript
// When creating a version, the pointer is automatically updated
await createVersion(flowId, visualGraph);

// The flow's current_version_id now points to the new version
const flow = await getFlow(flowId);
console.log('Current version:', flow.current_version_id);
```

### Loading Current Version

```typescript
const flow = await getFlow(flowId, { includeVersion: true });

if (flow.currentVersion) {
  // Render the current version
  renderCanvas(flow.currentVersion.visual_graph);
}
```

## Runs and Versions

Every run references a specific version:

```typescript
interface Run {
  id: string;
  flow_id: string;
  flow_version_id: string;  // Immutable reference
  status: string;
  created_at: string;
}
```

### Creating Runs

```typescript
// Create run with specific version
const run = await createRun(flowId, versionId);

// Or let auto-versioning handle it
const versionId = await autoVersionOnRun(flowId, currentGraph);
const run = await createRun(flowId, versionId);
```

### Viewing Historical Runs

When viewing an old run, always load its specific version:

```typescript
const run = await getRun(runId);
const version = await getVersion(run.flow_version_id);

// Render the exact canvas that was executed
renderCanvas(version.visual_graph);

// Use the execution graph for analysis
analyzeExecution(version.execution_graph, run.node_states);
```

## Version Immutability

**Versions are immutable.** Once created, they cannot be modified.

This ensures:

- Historical runs always show accurate state
- No accidental changes to executed workflows
- Clear audit trail
- Safe rollback capability

### Modifying a Canvas

To modify a canvas:

1. Load current version
2. Make changes to visual graph
3. Create new version
4. New version becomes current

```typescript
// Load current
const flow = await getFlow(flowId, { includeVersion: true });
const currentGraph = flow.currentVersion.visual_graph;

// Modify
const updatedGraph = {
  ...currentGraph,
  nodes: [...currentGraph.nodes, newNode]
};

// Save as new version
await createVersion(flowId, updatedGraph, 'Added new node');
```

## Rollback

To rollback to a previous version:

**Server-side (API routes, server components):**

```typescript
// Get the old version
const oldVersion = await getVersion(oldVersionId);

// Create a new version with the old graph
await createVersion(
  flowId,
  oldVersion.visual_graph,
  `Rolled back to version from ${oldVersion.created_at}`
);
```

**Client-side (React components):**

```typescript
// Get the old version
const versionResponse = await fetch(`/api/flows/${flowId}/versions/${oldVersionId}`);
const { version: oldVersion } = await versionResponse.json();

// Create a new version with the old graph
const response = await fetch(`/api/flows/${flowId}/versions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visualGraph: oldVersion.visual_graph,
    commitMessage: `Rolled back to version from ${oldVersion.created_at}`
  })
});
```

**Note**: This creates a new version with the old content. The history is preserved.

**UI Implementation**: The `VersionHistory` component handles rollback automatically. When the user clicks "Revert", it fetches the old version, creates a new version with that content, and refreshes the UI.

## Best Practices

### 1. Use Meaningful Commit Messages

```typescript
// Good
await createVersion(flowId, graph, 'Added retry logic for API failures');

// Bad
await createVersion(flowId, graph, 'Update');
```

### 2. Version Before Major Changes

Create a version before making significant changes:

```typescript
// Save current state
await createVersion(flowId, currentGraph, 'Before refactoring');

// Make changes
const refactoredGraph = refactorWorkflow(currentGraph);

// Save refactored version
await createVersion(flowId, refactoredGraph, 'Refactored for performance');
```

### 3. Let Auto-Versioning Handle Runs

Don't manually version before every run. Let auto-versioning handle it:

```typescript
// Good: Let system auto-version if needed
const versionId = await autoVersionOnRun(flowId, currentGraph);
const run = await createRun(flowId, versionId);

// Bad: Manual version before every run
await createVersion(flowId, currentGraph, 'Pre-run version');
const run = await createRun(flowId, flow.current_version_id);
```

### 4. Clean Up Old Versions

For flows with many versions, consider archiving old versions:

```typescript
const versions = await listVersions(flowId);

// Keep last 10 versions, archive the rest
const toArchive = versions.slice(10);

for (const version of toArchive) {
  await archiveVersion(version.id);
}
```

### 5. Use Version Tags

Add tags to important versions:

```typescript
await createVersion(
  flowId,
  graph,
  'Production release v1.0 [tag:production]'
);
```

## UI Integration

### Version History Component

Display version history in the UI:

```tsx
import { VersionHistory } from '@/components/canvas/VersionHistory';

<VersionHistory
  flowId={flowId}
  currentVersionId={flow.current_version_id}
  onViewVersion={(version) => {
    // Load and display historical version
    renderCanvas(version.visual_graph);
  }}
  onRevertVersion={(version) => {
    // Callback after revert completes
    // Component handles creating new version internally via API
    router.refresh();
  }}
/>
```

**Implementation Details:**

The `VersionHistory` component is a client component that communicates with the server via API routes:

- **Fetches version list**: `GET /api/flows/[id]/versions` (returns metadata only)
- **Fetches full version**: `GET /api/flows/[id]/versions/[vid]` (includes graphs)
- **Creates new version**: `POST /api/flows/[id]/versions` (for revert operation)

This architecture ensures that server-only environment variables (like `SUPABASE_SERVICE_ROLE_KEY`) are never exposed to the client. All database operations happen server-side through API routes.

### Unsaved Changes Indicator

Show when canvas has unsaved changes:

```tsx
const [hasChanges, setHasChanges] = useState(false);

useEffect(() => {
  const checkChanges = async () => {
    const flow = await getFlow(flowId, { includeVersion: true });
    const isDifferent = !deepEqual(
      currentGraph,
      flow.currentVersion?.visual_graph
    );
    setHasChanges(isDifferent);
  };
  
  checkChanges();
}, [currentGraph]);

return (
  <div>
    {hasChanges && (
      <Badge variant="warning">Unsaved changes</Badge>
    )}
  </div>
);
```

### Save Button

```tsx
<Button
  onClick={async () => {
    try {
      const response = await fetch(`/api/flows/${flowId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualGraph: currentGraph,
          commitMessage: commitMessage
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.validationErrors) {
          toast.error('Validation failed');
          showValidationErrors(error.validationErrors);
        } else {
          throw new Error(error.error || 'Failed to save version');
        }
        return;
      }

      toast.success('Version saved');
      router.refresh(); // Refresh to show new version
    } catch (error) {
      toast.error('Failed to save version');
      console.error(error);
    }
  }}
>
  Save Version
</Button>
```

**Implementation Note**: The `StitchCanvas` component includes a complete implementation of version saving with unsaved changes detection, error handling, and UI feedback.

## Troubleshooting

### Version Creation Fails

**Problem**: Version creation returns validation errors

**Solution**: Fix validation errors before saving

```typescript
const result = compileToOEG(visualGraph);

if (!result.success) {
  result.errors.forEach(error => {
    switch (error.type) {
      case 'cycle':
        console.error('Graph contains cycles');
        break;
      case 'missing_input':
        console.error(`Node ${error.node} missing input ${error.field}`);
        break;
      case 'invalid_worker':
        console.error(`Node ${error.node} has invalid worker type`);
        break;
    }
  });
}
```

### Run Shows Wrong Version

**Problem**: Run displays different canvas than expected

**Solution**: Always load version from run, not current version

```typescript
// Wrong
const flow = await getFlow(run.flow_id);
renderCanvas(flow.currentVersion.visual_graph);

// Correct
const version = await getVersion(run.flow_version_id);
renderCanvas(version.visual_graph);
```

### Auto-Versioning Not Working

**Problem**: Changes not being auto-versioned on run

**Solution**: Ensure visual graph is passed to run endpoint

```typescript
// Wrong
await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  body: JSON.stringify({})
});

// Correct
await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  body: JSON.stringify({
    visualGraph: currentCanvasState
  })
});
```

## Migration

See [Migration Guide](./MIGRATION.md) for migrating existing flows to the versioned system.
