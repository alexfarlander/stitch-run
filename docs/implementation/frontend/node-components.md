# Node Components

**Last Updated:** December 5, 2024  
**Related Files:**
- [Canvas Components](./canvas-components.md)
- [Entity Visualization](./entity-visualization.md)
- [React Hooks](./hooks.md)
- [Execution Model](../architecture/execution-model.md)

## Overview

Node components are the visual building blocks of Stitch canvases. They represent different types of operations, sections, and items in both the Business Model Canvas (BMC) and workflow graphs. All nodes are built on React Flow and follow a consistent pattern for status visualization, interaction, and data flow.

## Node Type Registry

Nodes are registered in two main locations depending on the canvas type:

### BMC Canvas Registry (`BMCCanvas.tsx`)

```typescript
const nodeTypes: NodeTypes = {
  // Background containers (The 12 Sections)
  section: SectionNode,
  
  // Items inside sections
  'section-item': SectionItemNode,
  
  // Production-side items
  'integration-item': IntegrationItem,
  'person-item': PersonItem,
  'code-item': CodeItem,
  'data-item': DataItem,
  
  // Financial sections
  'costs-section': CostsSectionNode,
  'revenue-section': RevenueSectionNode,
  
  // Workflow nodes
  Worker: WorkerNode,
  Collector: CollectorNode,
  UX: UXNode,
  Splitter: SplitterNode,
  MediaSelect: MediaSelectNode,
  
  // Fallback for unknown types
  fallback: FallbackNode,
};
```

### Workflow Canvas Registry (`WorkflowCanvas.tsx`)

```typescript
const nodeTypes: NodeTypes = {
  Worker: WorkerNode,
  Collector: CollectorNode,
  UX: UXNode,
  Splitter: SplitterNode,
  MediaSelect: MediaSelectNode,
};
```

## Core Node Components

### BaseNode

**Location:** `src/components/canvas/nodes/BaseNode.tsx`

The foundational wrapper for all workflow nodes. Provides consistent styling, status indicators, and the "Frankenstein's Lab" aesthetic with neon glows and pulsing animations.

**Props:**
```typescript
interface BaseNodeProps {
  id: string;           // Node identifier
  type: string;         // Node type label (e.g., "Worker", "Splitter")
  status: NodeStatus;   // Current execution status
  label: string;        // Status text (e.g., "Running", "Completed")
  children?: React.ReactNode;  // Node content
}
```

**Status Styling:**
- `pending`: Dimmed with slate border (opacity 50%)
- `running`: Amber border with pulsing glow animation
- `completed`: Neon green (#00ff99) border with steady glow
- `failed`: Red border with glow
- `waiting_for_user`: Blue border with pulsing animation

**Status Icons:**
- Completed: Green circle with checkmark
- Failed: Red circle with alert icon
- Running: Amber circle with spinning loader
- Waiting for User: Blue circle with user icon (pulsing)

**Visual Features:**
- Frankenstein's Lab aesthetic with neon effects
- Status-based border colors and glows
- Animated status indicators
- Monospace type labels
- Node ID display

### WorkerNode

**Location:** `src/components/canvas/nodes/WorkerNode.tsx`

Represents an external worker that delegates tasks to services like Claude, MiniMax, ElevenLabs, or Shotstack.

**Data Interface:**
```typescript
interface WorkerNodeData {
  label?: string;                          // Display name
  webhookUrl?: string;                     // Worker endpoint
  node_states?: StitchRun['node_states'];  // Execution states
}
```

**Features:**
- Wraps BaseNode with Worker type
- Uses `useNodeStatus` hook for real-time status
- Top and bottom connection handles
- Displays worker name or "Worker" as fallback

**Execution Flow:**
1. Node receives input from upstream
2. Fires webhook to external worker
3. Status changes to "running"
4. Worker processes asynchronously
5. Worker calls back with results
6. Status changes to "completed" or "failed"
7. Edge-walking continues to downstream nodes

### SplitterNode

**Location:** `src/components/canvas/nodes/SplitterNode.tsx`

Implements the fan-out pattern for parallel execution. Takes an array input and creates multiple parallel execution paths.

**Data Interface:**
```typescript
interface SplitterNodeData {
  label?: string;                          // Display name
  arrayPath?: string;                      // JSON path to array in input
  node_states?: StitchRun['node_states'];
}
```

**Behavior:**
- Extracts array from input using `arrayPath`
- Creates parallel instances: `nodeId_0`, `nodeId_1`, etc.
- Each instance flows independently through downstream nodes
- Status aggregates across all instances

**Use Cases:**
- Processing multiple items from an API response
- Sending emails to multiple recipients
- Generating variations of content

### CollectorNode

**Location:** `src/components/canvas/nodes/CollectorNode.tsx`

Implements the fan-in pattern for parallel execution. Waits for ALL upstream parallel paths to complete before proceeding.

**Data Interface:**
```typescript
interface CollectorNodeData {
  label?: string;
  node_states?: StitchRun['node_states'];
}
```

**Behavior:**
- Tracks completion of all upstream parallel instances
- Only fires when ALL instances have completed
- Aggregates outputs from parallel paths into an array
- Critical for the M-Shape parallel execution pattern

**Use Cases:**
- Waiting for all parallel workers to finish
- Combining results from multiple API calls
- Synchronization point in workflows

### UXNode

**Location:** `src/components/canvas/nodes/UXNode.tsx`

Represents a point where user input is required. Pauses workflow execution until the user provides data.

**Data Interface:**
```typescript
interface UXNodeData {
  label?: string;                          // Display name
  prompt?: string;                         // User prompt text
  node_states?: StitchRun['node_states'];
}
```

**Features:**
- Status changes to `waiting_for_user` when reached
- Displays blue pulsing animation
- Workflow pauses until user responds
- User input becomes node output

**Use Cases:**
- Approval workflows
- Data collection from users
- Manual review steps

### MediaSelectNode

**Location:** `src/components/canvas/nodes/MediaSelectNode.tsx`

Allows workflows to select media assets from the library with filtering and preview capabilities.

**Data Interface:**
```typescript
interface MediaSelectNodeData {
  label?: string;
  mediaType?: MediaType;        // Filter by type
  allowMultiple?: boolean;      // Single or multi-select
  selectedAssets?: SelectedAsset[];  // Persisted selection
  node_states?: StitchRun['node_states'];
}

interface SelectedAsset {
  id: string;
  url: string;
  name: string;
  media_type: MediaType;
}
```

**Features:**
- Integrated MediaPicker dialog
- Type filtering (image, video, audio, wireframe, etc.)
- Single or multiple selection
- Thumbnail preview in node
- Persists selection in node data

**Output:**
```typescript
{
  media_id: string,
  url: string,
  name: string,
  metadata: object
}
```

**Use Cases:**
- Selecting images for video generation
- Choosing audio tracks for content
- Picking wireframes for design workflows

## BMC-Specific Nodes

### SectionNode

**Location:** `src/components/canvas/nodes/SectionNode.tsx`

Represents one of the 12 Business Model Canvas sections (Marketing, Sales, Data, Revenue, etc.). Acts as a container for section items.

**Data Interface:**
```typescript
interface SectionNodeData {
  label: string;                    // Section name
  category: 'Production' | 'Customer' | 'Financial';
  child_canvas_id?: string;         // Linked workflow canvas
}
```

**Visual Features:**
- Category-based glow colors:
  - Production: Indigo/Purple glow
  - Customer: Cyan/Teal glow
  - Financial: Amber/Gold glow
- Grid background pattern
- Section icon from Lucide
- Drill-down button when workflow linked
- Double-click to navigate to workflow

**Interaction:**
- Non-draggable (background layer)
- Non-selectable (background layer)
- Non-connectable (container only)
- Z-index: -1 (renders behind items)

### SectionItemNode

**Location:** `src/components/canvas/nodes/SectionItemNode.tsx`

Represents items inside BMC sections (e.g., "CRM", "API", "Email Service").

**Data Interface:**
```typescript
interface SectionItemNodeData {
  label: string;
  icon: string;                     // Lucide icon name
  status: 'idle' | 'active' | 'running' | 'error';
  itemType: 'worker' | 'asset' | 'integration' | 'product';
  linked_workflow_id?: string;      // Linked workflow
  linked_canvas_id?: string;        // Linked detail canvas
  onShowDetail?: (itemId: string) => void;
}
```

**Features:**
- Compact card design (120x60px)
- Dynamic icon from Lucide library
- Status indicator dot
- Drill-down icon on hover
- Left and right connection handles

**Interaction Priority:**
1. Navigate to linked workflow (if exists)
2. Navigate to linked detail canvas (if exists)
3. Show detail panel (if callback provided)

**Visual States:**
- Hover: Cyan border and shadow
- Status colors: Green (active), Amber (running), Red (error), Slate (idle)

### Production-Side Item Nodes

**Location:** `src/components/canvas/items/`

Specialized item nodes for the production side of the BMC:

#### IntegrationItem
- Represents third-party integrations (Stripe, Typeform, etc.)
- Displays integration logo or icon
- Shows connection status

#### PersonItem
- Represents team members or roles
- Displays avatar or initials
- Shows availability status

#### CodeItem
- Represents code repositories or services
- Displays code icon
- Shows deployment status

#### DataItem
- Represents data sources or databases
- Displays database icon
- Shows sync status

### Financial Section Nodes

#### RevenueSectionNode

**Location:** `src/components/canvas/nodes/RevenueSectionNode.tsx`

Wrapper for the RevenueSection component that displays financial revenue metrics.

**Features:**
- Revenue metrics visualization
- Customer count displays
- Plan breakdown charts
- Wrapped in error boundary

#### CostsSectionNode

**Location:** `src/components/canvas/nodes/CostsSectionNode.tsx`

Wrapper for the CostsSection component that displays expense breakdowns.

**Features:**
- Expense breakdown visualization
- Cost trend charts
- Budget tracking
- Wrapped in error boundary

## Utility Components

### FallbackNode

**Location:** `src/components/canvas/nodes/FallbackNode.tsx`

Renders when an unknown node type is encountered. Provides debugging information.

**Features:**
- Yellow warning styling
- Displays node ID and type
- Shows node label if available
- Helps identify registration issues

**When It Appears:**
- Node type not in registry
- Typo in node type string
- Missing node component import

### NodeStatusIndicator

**Location:** `src/components/canvas/nodes/NodeStatusIndicator.tsx`

Overlay component that provides visual feedback for node execution status.

**Props:**
```typescript
interface NodeStatusIndicatorProps {
  nodeId: string;
  status: NodeStatus;
  error?: string;
}
```

**Visual Effects:**
- Running: Pulsing blue border and glow
- Completed: Green border and glow
- Failed: Red border with error icon tooltip
- Waiting for User: Pulsing amber border

**Error Handling:**
- Displays error icon for failed nodes
- Tooltip shows error message
- Logs errors to console for debugging

## Hooks and Utilities

### useNodeStatus Hook

**Location:** `src/components/canvas/hooks/useNodeStatus.ts`

Aggregates node status across parallel instances (M-Shape pattern).

**Signature:**
```typescript
function useNodeStatus(
  nodeId: string,
  node_states: StitchRun['node_states'] | undefined
): NodeStatusResult

interface NodeStatusResult {
  status: NodeStatus;
  label: string;
}
```

**Aggregation Rules:**
- If ANY instance is 'failed' → Status: 'failed'
- If ANY instance is 'running' → Status: 'running'
- If ALL instances are 'completed' → Status: 'completed'
- If partial completion → Status: 'running' with count
- If no instances exist → Status: 'pending'

**Parallel Instance Handling:**
- Finds all instances: `nodeId`, `nodeId_0`, `nodeId_1`, etc.
- Aggregates status across instances
- Returns count for multi-instance nodes
- Example labels: "Running (2/5)", "Completed (5)"

## Node Data Flow

### Input/Output Pattern

All workflow nodes follow this data flow:

```typescript
// Input (from upstream nodes)
{
  // Previous node outputs merged together
  field1: value1,
  field2: value2,
  ...
}

// Node Processing
// (Worker execution, user input, media selection, etc.)

// Output (to downstream nodes)
{
  // All input fields passed through
  field1: value1,
  field2: value2,
  // Plus new fields from this node
  newField: newValue,
  ...
}
```

### Node State Persistence

Node states are stored in the database:

```typescript
// In stitch_runs table
{
  node_states: {
    "node-1": {
      status: "completed",
      output: { result: "..." },
      started_at: "2024-12-05T10:00:00Z",
      completed_at: "2024-12-05T10:00:05Z"
    },
    "node-2_0": {  // Parallel instance
      status: "running",
      output: null,
      started_at: "2024-12-05T10:00:05Z"
    }
  }
}
```

## Creating Custom Nodes

### Step 1: Create Node Component

```typescript
// src/components/canvas/nodes/CustomNode.tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';

interface CustomNodeData {
  label?: string;
  customField?: string;
  node_states?: StitchRun['node_states'];
}

export const CustomNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode id={id} type="Custom" status={status} label={label}>
        {nodeData.label || 'Custom Node'}
        {/* Add custom content here */}
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

CustomNode.displayName = 'CustomNode';
```

### Step 2: Register Node Type

Add to the appropriate canvas registry:

```typescript
// In BMCCanvas.tsx or WorkflowCanvas.tsx
import { CustomNode } from './nodes/CustomNode';

const nodeTypes = useMemo<NodeTypes>(() => ({
  // ... existing types
  Custom: CustomNode,
}), []);
```

### Step 3: Add Node Handler (Backend)

If the node requires execution logic:

```typescript
// src/lib/engine/handlers/custom-handler.ts
export async function handleCustomNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>
): Promise<Record<string, any>> {
  // Process node logic
  const result = await processCustomLogic(input, config);
  
  return {
    ...input,  // Pass through input
    customResult: result,  // Add output
  };
}
```

Register in edge-walker:

```typescript
// src/lib/engine/edge-walker.ts
case 'Custom':
  output = await handleCustomNode(nodeId, input, config);
  break;
```

## Node Styling Guidelines

### Color Palette

- **Neon Green (#00ff99)**: Completed status, success states
- **Amber (#fbbf24)**: Running status, warnings
- **Red (#ef4444)**: Failed status, errors
- **Blue (#3b82f6)**: Waiting for user, info states
- **Slate (#64748b)**: Pending status, neutral states
- **Cyan (#06b6d4)**: Hover states, interactive elements

### Animation Patterns

- **Pulse**: Used for active states (running, waiting)
- **Glow**: Used for status indication (completed, failed)
- **Spin**: Used for loading indicators
- **Fade**: Used for transitions

### Z-Index Layers

Defined in `src/components/canvas/utils.ts`:

```typescript
export const Z_INDEX_LAYERS = {
  SECTION_BACKGROUND: -1,      // Section containers
  FINANCIAL_SECTIONS: 10,      // Revenue/Costs sections
  ITEMS: 20,                   // Section items and workflow nodes
  ENTITIES: 100,               // Entity dots and overlays
};
```

## Best Practices

### Performance

1. **Memoization**: Always wrap node components in `React.memo()`
2. **Hook Usage**: Use `useNodeStatus` for status aggregation
3. **Registry Memoization**: Memoize nodeTypes object to prevent re-renders

### Accessibility

1. **ARIA Labels**: Add `aria-label` for status indicators
2. **Keyboard Navigation**: Ensure nodes are keyboard accessible
3. **Screen Readers**: Use `aria-live` for status updates

### Error Handling

1. **Fallback Nodes**: Always include fallback in registry
2. **Error Boundaries**: Wrap complex nodes in error boundaries
3. **Console Logging**: Log unknown node types for debugging

### Data Management

1. **Immutability**: Never mutate node data directly
2. **React Flow API**: Use `updateNodeData()` for updates
3. **Persistence**: Store minimal data in node data object

## Common Patterns

### Status-Based Rendering

```typescript
const { status, label } = useNodeStatus(id, nodeData.node_states);

// Conditional rendering based on status
{status === 'completed' && <SuccessIcon />}
{status === 'failed' && <ErrorIcon />}
{status === 'running' && <LoadingSpinner />}
```

### Drill-Down Navigation

```typescript
const { drillInto } = useCanvasNavigation();

const handleClick = () => {
  if (nodeData.linked_workflow_id) {
    drillInto(nodeData.linked_workflow_id, nodeData.label, 'workflow');
  }
};
```

### Parallel Instance Handling

```typescript
// Node creates parallel instances
const instances = arrayInput.map((item, index) => ({
  nodeId: `${nodeId}_${index}`,
  input: item,
}));

// Status aggregates across instances
const { status, label } = useNodeStatus(nodeId, node_states);
// Returns: "Running (2/5)" or "Completed (5)"
```

## Troubleshooting

### Node Not Rendering

1. Check if node type is registered in nodeTypes
2. Verify component is imported correctly
3. Check for console errors
4. Ensure node data structure matches interface

### Status Not Updating

1. Verify `node_states` is passed to node data
2. Check if `useNodeStatus` hook is used
3. Ensure real-time subscription is active
4. Check database for node state updates

### Styling Issues

1. Verify Tailwind classes are correct
2. Check z-index layering
3. Ensure parent container has proper dimensions
4. Check for CSS conflicts

### Performance Issues

1. Ensure nodeTypes is memoized
2. Check for unnecessary re-renders
3. Verify React.memo() is used
4. Profile with React DevTools

## Related Documentation

- [Canvas Components](./canvas-components.md) - Canvas rendering and navigation
- [Entity Visualization](./entity-visualization.md) - Entity tracking and animations
- [React Hooks](./hooks.md) - Custom hooks for node functionality
- [Execution Model](../architecture/execution-model.md) - How nodes execute
- [Worker System](../backend/worker-system.md) - Worker node implementation
- [Type System](../architecture/type-system.md) - Node data types
