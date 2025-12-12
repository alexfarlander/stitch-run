# Stitch Execution Engine

The execution engine implements the edge-walking execution model for Stitch workflows.

## Starting a Workflow Run

### Using `startRun` (Recommended for Manual Triggers)

The `startRun` function provides a clean API for starting workflow executions, especially useful for manual triggers from UI buttons or scripts:

```typescript
import { startRun } from '@/lib/engine/edge-walker';

// Start a workflow with an entity attached
const run = await startRun(flowId, {
  entityId: 'entity-uuid',
  trigger: {
    type: 'manual',
    timestamp: new Date().toISOString(),
  },
  input: { initialData: 'value' },
});

// Start a workflow without an entity
const run = await startRun(flowId, {
  trigger: {
    type: 'scheduled',
    timestamp: new Date().toISOString(),
  },
});
```

### Starting from a Specific Entry Edge (For Webhooks)

Webhooks should start execution using the **versioned graphs** (ExecutionGraph + VisualGraph) rather than `flow.graph`.
This avoids integrity risks if `stitch_flows.graph` diverges from the version referenced by `run.flow_version_id`.

```typescript
import { fireNodeWithGraph } from '@/lib/engine/edge-walker';
import { createRunAdmin } from '@/lib/db/runs';
import { startJourney } from '@/lib/db/entities';
import { getVersionAdmin } from '@/lib/canvas/version-manager';

// 1. Place entity on entry edge (visual journey)
await startJourney(entityId, entryEdgeId);

// 2. Create workflow run
const run = await createRunAdmin(flowId, {
  entity_id: entityId,
  trigger: {
    type: 'webhook',
    source: 'linkedin',
    event_id: webhookEventId,
    timestamp: new Date().toISOString(),
  },
});

// 3. Load versioned graphs and fire the target node
const version = await getVersionAdmin(run.flow_version_id!);
if (!version) throw new Error('Version not found');

const entryEdge = version.visual_graph.edges.find((e) => e.id === entryEdgeId);
if (!entryEdge) throw new Error('Entry edge not found');

await fireNodeWithGraph(entryEdge.target, version.execution_graph, run);
```

## Entity Attachment

Workflows can be attached to entities (customers/leads) to track their journey through the canvas:

- **entity_id**: Links the run to a specific entity
- **trigger**: Metadata about what triggered the workflow (webhook, manual, scheduled, etc.)

When an entity is attached:
1. The entity appears on the entry edge (visual journey)
2. As nodes complete, the entity moves through the workflow
3. The entity's journey history is tracked in the database

### Entity Type Conversion

Worker nodes can convert entity types during movement (e.g., lead → customer):

```typescript
const workerNode = {
  type: 'Worker',
  data: {
    webhookUrl: 'https://api.example.com/qualify-lead',
    entityMovement: {
      onSuccess: {
        targetSectionId: 'customers-section',
        completeAs: 'success',
        setEntityType: 'customer',  // Convert lead to customer
      },
      onFailure: {
        targetSectionId: 'nurture-section',
        completeAs: 'neutral',
        // Entity stays as 'lead'
      },
    },
  },
};
```

This allows workflows to automatically promote leads to customers when they complete qualifying actions.

## Node Types

- **Worker**: Async webhook-based workers
- **UX**: Human-in-the-loop gates (wait for user action)
- **Splitter**: Fan-out to parallel paths
- **Collector**: Fan-in from parallel paths

## Edge-Walking Model

The engine uses an event-driven edge-walking model:

1. Node completes → Update DB
2. Read outbound edges
3. Check if downstream nodes' dependencies are satisfied
4. Fire ready downstream nodes
5. Repeat recursively

This ensures all state is persisted to the database and execution can resume after restarts.
