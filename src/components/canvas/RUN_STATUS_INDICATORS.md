# Run Status Indicators

Visual feedback system for node execution status on the canvas.

## Overview

The run status indicator system provides real-time visual feedback for workflow execution by overlaying status indicators on nodes. It subscribes to database changes via Supabase real-time and updates the UI automatically.

## Components

### 1. `useRunStatus` Hook
Location: `src/hooks/useRunStatus.ts`

Subscribes to `stitch_runs` table changes and provides real-time node status updates.

```typescript
const { nodeStates, loading, error } = useRunStatus(runId);
```

**Features:**
- Initial fetch of run data
- Real-time subscription to run updates
- Automatic cleanup on unmount
- Error handling and reconnection

### 2. `NodeStatusIndicator` Component
Location: `src/components/canvas/nodes/NodeStatusIndicator.tsx`

Visual indicator that overlays on nodes to show execution status.

**Status Styles:**
- **Running**: Pulsing blue animation (`#3b82f6`)
- **Completed**: Green glow effect (`#10b981`)
- **Failed**: Red indicator with error icon (`#ef4444`)
- **Waiting for User**: Pulsing amber animation (`#f59e0b`)
- **Pending**: No indicator (default styling)

### 3. `RunStatusOverlay` Component
Location: `src/components/canvas/RunStatusOverlay.tsx`

Renders status indicators for all nodes in an active run. Uses React Flow's `useNodes` hook to get node positions.

## Integration

### StitchCanvas (Workflow View)
Already integrated! The `StitchCanvas` component accepts a `run` prop and automatically displays status indicators when a run is active.

```typescript
<StitchCanvas flow={flow} run={run} />
```

### BMCCanvas (Business Model Canvas View)
The `BMCCanvas` component accepts an optional `runId` prop:

```typescript
<BMCCanvas flow={flow} runId={runId} />
```

## Testing

Run the test script to verify the implementation:

```bash
npx tsx scripts/test-run-status.ts
```

This script:
1. Finds a BMC canvas
2. Creates a test run
3. Updates node statuses through different states
4. Provides a URL to view the results

## Visual Results

When viewing a run at `/flow/[runId]`:
- Nodes pulse blue when running
- Nodes glow green when completed
- Nodes show red with error icon when failed
- Hover over failed nodes to see error message

## Requirements Validated

- ✅ 1.1: Node status updates to "running" in database
- ✅ 1.2: Node status updates to "completed" in database
- ✅ 1.3: Node status updates to "failed" with error message
- ✅ 1.5: Pulsing animation for running nodes
- ✅ 8.2: Pulsing animation with blue indicator for running
- ✅ 8.3: Green glow effect for completed
- ✅ 8.4: Red indicator with error icon for failed
- ✅ 8.5: Tooltip with error message on hover (via title attribute)

## Real-Time Updates

The system uses Supabase real-time subscriptions to receive updates within 500ms of database changes. The subscription is automatically cleaned up when the component unmounts.

## Performance

- Status indicators are positioned absolutely and don't affect layout
- Animations use CSS transforms for GPU acceleration
- Subscriptions are scoped to specific run IDs to minimize network traffic
- Component only renders when a run is active
