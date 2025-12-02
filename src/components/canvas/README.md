# Stitch Canvas - Frankenstein's Lab Aesthetic

The visual layer that brings Stitch flows to life with real-time execution visualization.

## Architecture

### Core Components

**StitchCanvas** (`StitchCanvas.tsx`)
- Main visualization component
- Renders ReactFlow graph with real-time state
- Disables editing (run view only)
- Animated edges with neon green (#00ff99)

**BaseNode** (`nodes/BaseNode.tsx`)
- Visual wrapper for all node types
- Status-based styling with glows and animations
- Status indicator badges

**Node Types**
- `WorkerNode` - External webhook workers
- `CollectorNode` - Fan-in aggregation
- `SplitterNode` - Fan-out parallel execution
- `UXNode` - Human input nodes

### Hooks

**useRealtimeRun** (`hooks/useRealtimeRun.ts`)
- Fetches initial run state from `/api/stitch/status/[runId]`
- Subscribes to Supabase real-time updates
- Returns `{ run, loading, error }`

**useNodeStatus** (`hooks/useNodeStatus.ts`)
- Aggregates status across parallel instances
- Handles M-Shape logic (worker_0, worker_1, etc.)
- Returns `{ status, label }` with counts

## Status Styling (Frankenstein's Lab)

| Status | Visual Effect | Color |
|--------|--------------|-------|
| `pending` | Ghostly dim (50% opacity) | Slate |
| `running` | **Pulsing amber glow** | #fbbf24 |
| `completed` | **Neon green border** | #00ff99 |
| `failed` | Red glow | #ef4444 |
| `waiting_for_user` | **Blinking blue** | #3b82f6 |

## Parallel Execution (M-Shape)

When a Splitter creates parallel instances:
- Static node: `worker`
- Dynamic instances: `worker_0`, `worker_1`, `worker_2`

The `useNodeStatus` hook aggregates:
- If ANY failed → Status: `failed` with count
- If ANY running → Status: `running` with progress (2/4)
- If ALL completed → Status: `completed` with total

## Usage

### Basic Run Visualization

```tsx
import { StitchCanvas } from '@/components/canvas';

<StitchCanvas flow={flow} run={run} />
```

### With Real-time Updates

```tsx
import { useRealtimeRun } from '@/hooks/useRealtimeRun';
import { StitchCanvas } from '@/components/canvas';

function RunView({ runId, flow }) {
  const { run, loading } = useRealtimeRun(runId);
  
  if (loading) return <Loader />;
  
  return <StitchCanvas flow={flow} run={run} />;
}
```

## Routes

- `/runs/[runId]` - Live run visualization page
- `/test-canvas` - Static test page with mock data

## API Endpoints

- `GET /api/stitch/status/[runId]` - Fetch current run state

## Database Integration

Subscribes to `stitch_runs` table updates:
- Real-time enabled via Supabase
- Updates trigger automatic re-render
- No polling required

## Testing

Visit `/test-canvas` to see the canvas with mock data showing all status states.
