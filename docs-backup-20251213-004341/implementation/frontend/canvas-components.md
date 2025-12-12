# Canvas Components

## Overview

The canvas system in Stitch provides the visual interface for Business Model Canvas (BMC) sections and workflow graphs. Built on top of [@xyflow/react](https://reactflow.dev/), the canvas components handle navigation, rendering, real-time updates, and user interactions across different canvas types.

**Key Components:**
- **CanvasRouter**: Orchestrates view switching and navigation state
- **BMCCanvas**: Renders the 12-section Business Model Canvas
- **WorkflowCanvas**: Renders detailed workflow graphs with execution status
- **StitchCanvas**: Advanced canvas with versioning and editing capabilities

## Architecture

### Canvas Type Hierarchy

```
CanvasRouter (Orchestrator)
├── BMCCanvas (Top-level view)
│   ├── 12 Section Nodes
│   ├── Section Items
│   └── Entity Overlay
├── WorkflowCanvas (Drill-down view)
│   ├── Worker Nodes
│   ├── Splitter/Collector Nodes
│   ├── UX Nodes
│   └── Run Status Overlay
└── StitchCanvas (Advanced editing)
    ├── Version Controls
    ├── History Panel
    └── Real-time Execution
```

### Navigation Flow

```
BMC View → Click Section → Workflow View → Click Item → Detail View
    ↑                           ↑
    └─── Back Button ───────────┘
```

## CanvasRouter

**Location:** `src/components/canvas/CanvasRouter.tsx`

The CanvasRouter is the top-level orchestrator that manages canvas navigation, data fetching, and view rendering. It provides smooth transitions between different canvas types and maintains navigation state.

### Features

- **View Switching**: Automatically renders the correct canvas type (BMC, Workflow, Detail)
- **Navigation State**: Manages drill-down navigation with breadcrumbs
- **Data Fetching**: Loads flow data with caching via `useFlow` hook
- **Smooth Transitions**: Framer Motion animations between views
- **Loading States**: Custom "Frankenstein" themed loader
- **Error Handling**: Graceful error states with user-friendly messages

### Props

```typescript
interface CanvasRouterProps {
  initialFlowId: string;  // Starting canvas ID
  runId?: string;         // Optional run ID for execution status
}
```

### Usage

```tsx
import { CanvasRouter } from '@/components/canvas/CanvasRouter';

// Basic usage
<CanvasRouter initialFlowId="flow-123" />

// With run tracking
<CanvasRouter initialFlowId="flow-123" runId="run-456" />
```

### Key Behaviors

1. **Hydration**: On mount, hydrates navigation state from database
2. **Canvas Selection**: Determines which canvas to render based on `canvas_type`
3. **Transitions**: Animates between canvas views with fade and scale effects
4. **Breadcrumbs**: Displays navigation path at the top

### Canvas Type Routing

```typescript
switch (flow.canvas_type) {
  case 'bmc':
    return <BMCCanvas flow={flow} />;
  
  case 'workflow':
    return <WorkflowCanvas flow={flow} runId={runId} />;
  
  case 'detail':
    return <DetailCanvas />;  // Future implementation
  
  default:
    return <WorkflowCanvas flow={flow} runId={runId} />;
}
```

### Loading State

The router includes a custom "Frankenstein" themed loader with:
- Electric spark animation (pulsing Zap icon)
- Spinning loader with text
- Animated electric bars
- Dark theme consistent with Stitch aesthetic

### Error State

Displays user-friendly error messages when:
- Flow data fails to load
- Canvas is not found
- Network errors occur

## BMCCanvas

**Location:** `src/components/canvas/BMCCanvas.tsx`

The BMCCanvas renders the top-level Business Model Canvas with 12 sections, section items, and real-time entity tracking. It's the primary view users see when opening a canvas.

### Features

- **12 Section Layout**: Renders all BMC sections (Marketing, Sales, Data, Revenue, etc.)
- **Section Items**: Displays items within sections (CRM, API, integrations, etc.)
- **Drill-Down Navigation**: Click sections or items to navigate to workflows
- **Entity Visualization**: Shows entities moving across the canvas
- **Run Status**: Optional execution status overlay
- **Demo Mode**: Button to trigger demo workflows
- **Z-Index Management**: Proper layering of sections, items, and entities

### Props

```typescript
interface BMCCanvasProps {
  flow: StitchFlow;                    // Flow data with graph
  initialEntities?: StitchEntity[];    // Optional initial entities
  runId?: string;                      // Optional run ID for status
}
```

### Usage

```tsx
import { BMCCanvas } from '@/components/canvas/BMCCanvas';

// Basic BMC view
<BMCCanvas flow={bmcFlow} />

// With run tracking
<BMCCanvas flow={bmcFlow} runId="run-123" />
```

### Node Types Registry

The BMCCanvas registers multiple node types:

```typescript
const nodeTypes = {
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
  
  // Workflow nodes (for drill-down)
  Worker: WorkerNode,
  Collector: CollectorNode,
  UX: UXNode,
  Splitter: SplitterNode,
  MediaSelect: MediaSelectNode,
  
  // Fallback for unknown types
  fallback: FallbackNode,
};
```

### Z-Index Layering

Critical for proper visual stacking:

```typescript
const Z_INDEX_LAYERS = {
  SECTION_BACKGROUND: -1,      // Sections behind everything
  EDGES: 0,                    // Edges above sections
  ITEMS: 1,                    // Items above edges
  FINANCIAL_SECTIONS: 5,       // Financial sections
  ENTITY_OVERLAY: 100,         // Entities on top
};
```

**Important:** Nodes are sorted by z-index before rendering to ensure correct DOM stacking order:

```typescript
// CRITICAL: Sort nodes by zIndex for correct stacking
return sortNodesForRendering(transformedNodes);
```

### Interaction Handlers

**Double-Click on Section:**
```typescript
const handleNodeDoubleClick = (event, node) => {
  if (node.type === 'section') {
    const data = node.data;
    if (data.child_canvas_id) {
      drillInto(data.child_canvas_id, data.label, 'workflow');
    }
  }
};
```

**Single-Click on Item:**
```typescript
const handleNodeClick = (event, node) => {
  if (node.type === 'section-item') {
    const data = node.data;
    if (data.linked_workflow_id) {
      drillInto(data.linked_workflow_id, data.label, 'workflow');
    }
  }
};
```

### MiniMap Coloring

The minimap uses color coding based on section category:

```typescript
nodeColor={(node) => {
  if (node.type === 'section') {
    const category = node.data?.category;
    if (category === 'Production') return '#4f46e5';  // Indigo
    if (category === 'Customer') return '#10b981';    // Emerald
    if (category === 'Financial') return '#f59e0b';   // Amber
  }
  return '#64748b';  // Default slate
}}
```

### Overlays

1. **EntityOverlay**: Renders entities moving across the canvas
2. **RunStatusOverlay**: Shows execution status when `runId` is provided
3. **DemoModeButton**: Floating button to trigger demo workflows

## WorkflowCanvas

**Location:** `src/components/canvas/WorkflowCanvas.tsx`

The WorkflowCanvas renders detailed workflow graphs with real-time execution status. It's displayed when drilling into a BMC section or item.

### Features

- **Workflow Rendering**: Displays worker nodes, splitters, collectors, and UX nodes
- **Real-Time Status**: Subscribes to run updates via Supabase
- **Back Navigation**: Button to return to parent canvas
- **Status Indicators**: Visual feedback for node execution states
- **Animated Edges**: Shows data flow between nodes

### Props

```typescript
interface WorkflowCanvasProps {
  flow: StitchFlow;    // Workflow flow data
  runId?: string;      // Optional run ID for status tracking
}
```

### Usage

```tsx
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';

// Basic workflow view
<WorkflowCanvas flow={workflowFlow} />

// With execution tracking
<WorkflowCanvas flow={workflowFlow} runId="run-123" />
```

### Node Types

Workflow-specific node types:

```typescript
const nodeTypes = {
  Worker: WorkerNode,        // External service workers
  Collector: CollectorNode,  // Fan-in nodes
  UX: UXNode,               // User interaction nodes
  Splitter: SplitterNode,   // Fan-out nodes
  MediaSelect: MediaSelectNode,  // Media selection nodes
};
```

### Real-Time Updates

The canvas subscribes to run updates and propagates status to nodes:

```typescript
const { run } = useRealtimeRun(runId || '');

useEffect(() => {
  if (run) {
    setNodeStates(run.node_states);
  }
}, [run]);

// Pass node states to each node
const nodes = flow.graph.nodes.map((node) => ({
  ...node,
  data: {
    ...node.data,
    node_states: nodeStates,  // Injected into each node
  },
}));
```

### Status-Based Styling

Nodes change appearance based on execution status:

```typescript
// In node components
const status = data.node_states?.[nodeId]?.status;

switch (status) {
  case 'completed': 
    // Green glow, checkmark icon
  case 'running': 
    // Yellow glow, spinner
  case 'failed': 
    // Red glow, error icon
  case 'waiting_for_user': 
    // Blue glow, user icon
  default: 
    // Gray, idle state
}
```

### MiniMap Status Colors

The minimap reflects node execution status:

```typescript
nodeColor={(node) => {
  const status = node.data?.node_states?.[node.id]?.status;
  switch (status) {
    case 'completed': return '#00ff99';   // Green
    case 'running': return '#fbbf24';     // Yellow
    case 'failed': return '#ef4444';      // Red
    case 'waiting_for_user': return '#3b82f6';  // Blue
    default: return '#475569';            // Gray
  }
}}
```

### Back Navigation

The canvas includes a back button when navigation history exists:

```typescript
{canGoBack && (
  <button onClick={goBack}>
    <ArrowLeft /> Back to BMC
  </button>
)}
```

## StitchCanvas

**Location:** `src/components/canvas/StitchCanvas.tsx`

The StitchCanvas is an advanced canvas component with versioning, editing capabilities, and run management. It's used for canvas editing and development workflows.

### Features

- **Version Management**: Save versions, view history, revert changes
- **Change Detection**: Tracks unsaved changes automatically
- **Auto-Versioning**: Creates version before running
- **Run Management**: Start runs directly from canvas
- **Edit Mode**: Drag nodes, modify graph structure
- **History Panel**: View and restore previous versions

### Props

```typescript
interface StitchCanvasProps {
  flow: StitchFlow;      // Flow data
  run?: StitchRun;       // Optional run for status
  editable?: boolean;    // Enable editing mode
}
```

### Usage

```tsx
import { StitchCanvas } from '@/components/canvas/StitchCanvas';

// Read-only view
<StitchCanvas flow={flow} />

// Editable with versioning
<StitchCanvas flow={flow} editable={true} />

// With run tracking
<StitchCanvas flow={flow} run={run} editable={true} />
```

### Versioning Controls

The canvas displays version controls in the top-right:

1. **Unsaved Changes Badge**: Shows when graph has been modified
2. **Current Version Badge**: Displays current version ID
3. **History Button**: Opens version history panel
4. **Save Version Button**: Creates new version
5. **Run Button**: Auto-versions and starts execution

### Change Detection

Automatically detects changes by comparing current graph to original:

```typescript
useEffect(() => {
  if (!editable) return;
  
  const currentGraph = {
    nodes: nodes.map(convertToVisualNode),
    edges: edges.map(convertToVisualEdge),
  };
  
  const hasChanges = JSON.stringify(currentGraph) !== 
                     JSON.stringify(originalGraph);
  setHasUnsavedChanges(hasChanges);
}, [nodes, edges, originalGraph, editable]);
```

### Save Version Handler

```typescript
const handleSaveVersion = async () => {
  const response = await fetch(`/api/flows/${flow.id}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      visualGraph: currentGraph,
      commitMessage: 'Manual save'
    })
  });
  
  // Update original graph to new saved state
  setOriginalGraph(currentGraph);
  setHasUnsavedChanges(false);
};
```

### Run with Auto-Versioning

```typescript
const handleRun = async () => {
  const response = await fetch(`/api/flows/${flow.id}/run`, {
    method: 'POST',
    body: JSON.stringify({ visualGraph: currentGraph }),
  });
  
  const { runId } = await response.json();
  
  // Navigate to run view
  router.push(`/runs/${runId}`);
};
```

### Version History Panel

Displays a list of previous versions with:
- Version ID and timestamp
- Commit message
- View button (loads historical version)
- Revert button (makes version current)

## React Flow Integration

### Core Concepts

Stitch uses [@xyflow/react](https://reactflow.dev/) for canvas rendering. Key integration patterns:

#### 1. Node Types Registry

Register custom node components:

```typescript
const nodeTypes: NodeTypes = {
  Worker: WorkerNode,
  Collector: CollectorNode,
  UX: UXNode,
  // ... more types
};

<ReactFlow nodeTypes={nodeTypes} />
```

#### 2. Edge Types Registry

Register custom edge components:

```typescript
const edgeTypes: EdgeTypes = {
  journey: JourneyEdge,
};

<ReactFlow edgeTypes={edgeTypes} />
```

#### 3. Node State Management

For editable canvases, use React Flow's state hooks:

```typescript
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
/>
```

#### 4. Event Handlers

Handle user interactions:

```typescript
<ReactFlow
  onNodeClick={handleNodeClick}
  onNodeDoubleClick={handleNodeDoubleClick}
  onEdgeClick={handleEdgeClick}
  onConnect={handleConnect}
/>
```

#### 5. Controls and UI

Add standard React Flow controls:

```typescript
<ReactFlow>
  <Background />           {/* Grid background */}
  <Controls />            {/* Zoom/pan controls */}
  <MiniMap />            {/* Overview map */}
  <Panel position="top-right">  {/* Custom panels */}
    {/* Custom UI */}
  </Panel>
</ReactFlow>
```

### Data Transformation

Transform Stitch graph format to React Flow format:

```typescript
// Stitch Node → React Flow Node
const nodes: Node[] = flow.graph.nodes.map((node) => ({
  id: node.id,
  type: node.type,
  position: node.position,
  data: node.data,
  style: node.style,
  draggable: editable,
  selectable: true,
}));

// Stitch Edge → React Flow Edge
const edges: Edge[] = flow.graph.edges.map((edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle,
  targetHandle: edge.targetHandle,
  type: 'journey',
  animated: true,
}));
```

### Z-Index Management

**Critical Pattern:** React Flow renders nodes in array order, which affects DOM stacking. Always sort nodes by z-index:

```typescript
import { sortNodesForRendering } from './utils';

const sortedNodes = sortNodesForRendering(nodes);

<ReactFlow nodes={sortedNodes} />
```

### Styling

Apply custom styles to nodes and edges:

```typescript
// Node styling
{
  id: 'node-1',
  style: {
    background: '#1e293b',
    border: '2px solid #06b6d4',
    borderRadius: '8px',
    padding: '16px',
    zIndex: 1,
  }
}

// Edge styling
{
  id: 'edge-1',
  style: {
    stroke: '#06b6d4',
    strokeWidth: 2,
  },
  animated: true,
}
```

### Viewport Control

Control the viewport programmatically:

```typescript
<ReactFlow
  fitView              // Fit all nodes on mount
  minZoom={0.1}       // Minimum zoom level
  maxZoom={2}         // Maximum zoom level
  defaultViewport={{   // Initial viewport
    x: 0,
    y: 0,
    zoom: 1,
  }}
/>
```

### Performance Optimization

1. **Memoize Node Types**: Prevent unnecessary re-renders

```typescript
const nodeTypes = useMemo<NodeTypes>(() => ({
  Worker: WorkerNode,
  // ...
}), []);
```

2. **Memoize Nodes and Edges**: Only recompute when data changes

```typescript
const nodes = useMemo(() => 
  transformNodes(flow.graph.nodes), 
  [flow.graph.nodes]
);
```

3. **Use Keys**: Ensure stable keys for React reconciliation

```typescript
<ReactFlow key={flow.id} />
```

## Navigation Integration

### useCanvasNavigation Hook

The canvas components integrate with the navigation system:

```typescript
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';

const { 
  currentCanvasId,    // Current canvas ID
  breadcrumbs,        // Navigation path
  canGoBack,          // Can navigate back
  drillInto,          // Navigate to child canvas
  goBack,             // Navigate to parent
  navigateTo,         // Jump to breadcrumb
} = useCanvasNavigation();
```

### Drill-Down Pattern

```typescript
// In BMCCanvas - navigate to workflow
const handleNodeClick = (event, node) => {
  if (node.data.linked_workflow_id) {
    drillInto(
      node.data.linked_workflow_id,  // Canvas ID
      node.data.label,                // Display name
      'workflow'                      // Canvas type
    );
  }
};
```

### Breadcrumbs

Display navigation path:

```typescript
import { CanvasBreadcrumbs } from './CanvasBreadcrumbs';

<CanvasBreadcrumbs />
```

## Real-Time Updates

### Supabase Integration

Canvas components subscribe to real-time updates:

```typescript
import { useRealtimeRun } from '@/hooks/useRealtimeRun';

const { run } = useRealtimeRun(runId);

// Run updates automatically trigger re-renders
useEffect(() => {
  if (run) {
    setNodeStates(run.node_states);
  }
}, [run]);
```

### Entity Movement

Entity positions update in real-time:

```typescript
<EntityOverlay canvasId={flow.id} />
```

The EntityOverlay subscribes to entity position changes and animates movement.

### Status Propagation

Node status flows from database → hook → canvas → nodes:

```
Database (stitch_runs.node_states)
  ↓
useRealtimeRun hook
  ↓
Canvas component (nodeStates state)
  ↓
Node data (data.node_states)
  ↓
Node component (visual status)
```

## Best Practices

### 1. Always Memoize Node Types

```typescript
const nodeTypes = useMemo<NodeTypes>(() => ({
  Worker: WorkerNode,
  // ...
}), []);
```

### 2. Sort Nodes by Z-Index

```typescript
const sortedNodes = sortNodesForRendering(nodes);
```

### 3. Use Stable Keys

```typescript
<ReactFlow key={flow.id} />
```

### 4. Handle Unknown Node Types

```typescript
const nodeType = registeredTypes.has(node.type) 
  ? node.type 
  : 'fallback';
```

### 5. Separate Read and Edit Modes

```typescript
<ReactFlow
  nodes={nodes}
  onNodesChange={editable ? onNodesChange : undefined}
  draggable={editable}
/>
```

### 6. Clean Up Subscriptions

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('run-updates')
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}, [runId]);
```

## Common Patterns

### Pattern 1: Canvas with Status

```typescript
<WorkflowCanvas 
  flow={flow} 
  runId={runId}  // Enables status tracking
/>
```

### Pattern 2: Editable Canvas

```typescript
<StitchCanvas 
  flow={flow} 
  editable={true}  // Enables editing
/>
```

### Pattern 3: Navigation Stack

```typescript
<CanvasRouter initialFlowId={bmcId}>
  {/* Automatically handles navigation */}
</CanvasRouter>
```

### Pattern 4: Custom Overlays

```typescript
<ReactFlow>
  <EntityOverlay canvasId={flow.id} />
  <RunStatusOverlay runId={runId} />
  <CustomOverlay />
</ReactFlow>
```

## Troubleshooting

### Issue: Nodes Render in Wrong Order

**Solution:** Sort nodes by z-index before passing to ReactFlow

```typescript
const sortedNodes = sortNodesForRendering(nodes);
```

### Issue: Canvas Doesn't Update on Data Change

**Solution:** Ensure proper memoization dependencies

```typescript
const nodes = useMemo(() => 
  transformNodes(flow.graph.nodes), 
  [flow.graph.nodes]  // Add all dependencies
);
```

### Issue: Navigation Doesn't Work

**Solution:** Verify navigation hook is properly initialized

```typescript
useEffect(() => {
  hydrateFromDatabase(initialFlowId);
}, [initialFlowId, hydrateFromDatabase]);
```

### Issue: Real-Time Updates Not Working

**Solution:** Check Supabase subscription and cleanup

```typescript
useEffect(() => {
  const subscription = supabase
    .channel(`run:${runId}`)
    .on('postgres_changes', handler)
    .subscribe();
  
  return () => subscription.unsubscribe();
}, [runId]);
```

## Related Documentation

- [Node Components](./node-components.md) - Individual node type implementations
- [Entity Visualization](./entity-visualization.md) - Entity tracking and animation
- [Architecture Overview](../architecture/overview.md) - System architecture
- [Type System](../architecture/type-system.md) - TypeScript interfaces
- [React Flow Documentation](https://reactflow.dev/) - Official React Flow docs

## Requirements Validation

This documentation satisfies **Requirement 3.1**:

> WHEN examining canvas components THEN the system SHALL document BMCCanvas, WorkflowCanvas, and CanvasRouter

**Coverage:**
- ✅ CanvasRouter: Orchestration, navigation, view switching
- ✅ BMCCanvas: 12-section layout, drill-down, entity visualization
- ✅ WorkflowCanvas: Workflow rendering, real-time status
- ✅ StitchCanvas: Advanced editing and versioning
- ✅ React Flow Integration: Patterns, best practices, troubleshooting
