# Design: Core Canvas View

## Overview

This design document describes the architecture for the core canvas viewing and editing functionality in the Stitch workflow management system. The implementation builds upon existing components (WorkflowCanvas, NodePalette, NodeConfigPanel) and integrates them into a cohesive, functional workflow editor.

The design follows the "database as source of truth" principle from Stitch architecture, where all changes are immediately persisted to the database and the UI reflects the current database state.

## Architecture Overview

### Component Hierarchy

```
WorkflowCanvas (Main Container)
├── ReactFlow (Canvas Rendering)
│   ├── Nodes (WorkerNode, UXNode, SplitterNode, CollectorNode, etc.)
│   ├── Edges (JourneyEdge, SystemEdge)
│   ├── Background
│   └── Controls
├── NodePalette (Floating Button + Modal)
├── NodeConfigPanel (Right Sheet)
└── AIAssistantPanel (Optional)
```

### Data Flow

```
User Action → Local State Update → API Call → Database Update → State Refresh
```

**Example: Adding a Node**
1. User drags node from palette
2. WorkflowCanvas creates node in local state
3. POST /api/canvas/[id]/nodes saves to database
4. On success: node persists in local state
5. On error: rollback local state, show error

### State Management

The application uses React hooks for local state management:

- `useNodesState` - Manages node positions and data
- `useEdgesState` - Manages edge connections
- `useState` - Manages UI state (selected node, palette visibility, etc.)

No global state management library is used. Database is the source of truth.

## Components and Interfaces

### WorkflowCanvas Component

**Purpose**: Main container that renders the workflow canvas and coordinates all sub-components.

**Props**:
```typescript
interface WorkflowCanvasProps {
  flow: StitchFlow;      // Canvas data including graph structure
  runId?: string;        // Optional run ID for execution view mode
}
```

**Key Responsibilities**:
- Render React Flow canvas with nodes and edges
- Handle node selection and configuration
- Coordinate node addition from palette
- Manage edge creation and deletion
- Persist all changes to database
- Handle keyboard shortcuts (Delete key)

**State**:
```typescript
const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
```

### NodePalette Component

**Purpose**: Floating button that opens a modal with available node types.

**Props**:
```typescript
interface NodePaletteProps {
  onAddNode: (nodeType: string) => void;
  className?: string;
}
```

**Node Types**:
- Worker - External webhook call
- UX - User input/interaction
- Splitter - Fan-out to parallel paths
- Collector - Fan-in from parallel paths
- SectionItem - Visual waypoint marker

**Behavior**:
- Closed state: Shows floating "+" button in bottom-right
- Open state: Shows modal with categorized node types
- Click node type: Calls `onAddNode` callback and closes modal

### NodeConfigPanel Component

**Purpose**: Right-side sheet for editing node configuration.

**Props**:
```typescript
interface NodeConfigPanelProps {
  nodeId: string | null;           // null when closed
  canvasId: string;
  onClose: () => void;
  onSave: (nodeId: string, config: NodeConfig) => Promise<void>;
}
```

**Configuration Types**:

**Worker Node**:
- Label (string)
- Worker Type (dropdown from WORKER_DEFINITIONS)
- Webhook URL (string)
- Config fields (dynamic based on worker type)
- Entity movement rules (optional)

**UX Node**:
- Label (string)
- Prompt/Description (textarea)
- Timeout hours (number)

**Splitter Node**:
- Label (string)
- Array path (string) - JSON path to array in input data

**Collector Node**:
- Label (string)
- Expected upstream count (number, optional)

**Features**:
- Real-time field validation
- Auto-save with debouncing (500ms)
- Visual feedback for validation errors
- Escape key to close

## Data Models

### VisualNode

```typescript
interface VisualNode {
  id: string;
  type: string;  // 'Worker' | 'UX' | 'Splitter' | 'Collector' | 'SectionItem'
  position: { x: number; y: number };
  data: {
    label: string;
    // Worker-specific
    worker_type?: string;
    webhookUrl?: string;
    config?: Record<string, unknown>;
    entityMovement?: {
      onSuccess?: {
        targetNodeId?: string;
        targetSectionId?: string;
        entityType?: string;
      };
      onFailure?: {
        targetNodeId?: string;
        targetSectionId?: string;
      };
    };
    // UX-specific
    prompt?: string;
    timeoutHours?: number;
    // Splitter-specific
    arrayPath?: string;
    // Collector-specific
    expectedUpstreamCount?: number;
    // Metadata
    createdAt?: string;
    [key: string]: unknown;
  };
}
```

### VisualEdge

```typescript
interface VisualEdge {
  id: string;
  source: string;        // Source node ID
  target: string;        // Target node ID
  sourceHandle?: string; // Optional handle ID
  targetHandle?: string; // Optional handle ID
  type?: string;         // 'journey' | 'system'
  animated?: boolean;    // Default: true
}
```

### VisualGraph

```typescript
interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}
```

## API Contracts

### Create Node

**Endpoint**: `POST /api/canvas/[id]/nodes`

**Request**:
```json
{
  "node": {
    "id": "worker-1234567890",
    "type": "Worker",
    "position": { "x": 250, "y": 100 },
    "data": {
      "label": "Send Email"
    }
  }
}
```

**Response** (201 Created):
```json
{
  "id": "worker-1234567890",
  "label": "Send Email",
  "type": "Worker",
  "position": { "x": 250, "y": 100 },
  "data": {
    "label": "Send Email",
    "createdAt": "2025-12-09T10:30:00Z"
  },
  "webhookUrl": "https://app.stitch.run/api/webhooks/node/worker-1234567890",
  "uptimeUrl": "https://app.stitch.run/api/uptime/ping/worker-1234567890"
}
```

**Error Responses**:
- 400: Invalid request body or missing required fields
- 404: Canvas not found
- 500: Server error

### Update Node

**Endpoint**: `PATCH /api/canvas/[id]/nodes/[nodeId]`

**Request**:
```json
{
  "label": "Send Welcome Email",
  "workerType": "email-sender",
  "config": {
    "to": "{{entity.email}}",
    "subject": "Welcome!",
    "template": "welcome"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "node": {
    "id": "worker-1234567890",
    "type": "Worker",
    "data": {
      "label": "Send Welcome Email",
      "worker_type": "email-sender",
      "config": {
        "to": "{{entity.email}}",
        "subject": "Welcome!",
        "template": "welcome"
      }
    }
  }
}
```

### Delete Node

**Endpoint**: `DELETE /api/canvas/[id]/nodes/[nodeId]`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Node deleted successfully"
}
```

### Create Edge

**Endpoint**: `POST /api/canvas/[id]/edges`

**Request**:
```json
{
  "edge": {
    "id": "worker-123-ux-456",
    "source": "worker-123",
    "target": "ux-456",
    "sourceHandle": "success",
    "targetHandle": "input",
    "type": "journey",
    "animated": true
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "edge": {
    "id": "worker-123-ux-456",
    "source": "worker-123",
    "target": "ux-456",
    "sourceHandle": "success",
    "targetHandle": "input",
    "type": "journey",
    "animated": true
  }
}
```

### Delete Edge

**Endpoint**: `DELETE /api/canvas/[id]/edges/[edgeId]`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Edge deleted successfully"
}
```

## Database Schema

The application uses the existing Supabase schema with flow versioning:

**Note**: The codebase uses `stitch_flows` and `stitch_flow_versions` tables (not `stitch_canvases`/`stitch_canvas_versions`). In Stitch terminology, "canvas" and "flow" are used interchangeably - a flow is the underlying data structure, while canvas refers to the visual representation.

### stitch_flows

```sql
CREATE TABLE stitch_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  current_version_id UUID REFERENCES stitch_flow_versions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### stitch_flow_versions

```sql
CREATE TABLE stitch_flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES stitch_flows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  visual_graph JSONB NOT NULL,  -- Contains nodes and edges
  change_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

**visual_graph structure**:
```json
{
  "nodes": [
    {
      "id": "worker-123",
      "type": "Worker",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Send Email",
        "worker_type": "email-sender",
        "config": { ... }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-123",
      "source": "worker-123",
      "target": "ux-456",
      "type": "journey"
    }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Node Persistence

*For any* node added to the canvas, after successful creation, refreshing the page should display the same node in the same position with the same configuration.

**Validates: Requirements 2.5, 2.7**

### Property 2: Edge Persistence

*For any* edge created between two nodes, after successful creation, refreshing the page should display the same edge connecting the same nodes.

**Validates: Requirements 4.3, 4.4**

### Property 3: Configuration Auto-Save

*For any* node configuration change, after the debounce period (500ms), the change should be persisted to the database and visible after page refresh.

**Validates: Requirements 3.4, 3.5, 3.6**

### Property 4: Node Deletion Cascade

*For any* node that is deleted, all edges connected to that node (as source or target) should also be removed from the canvas and database.

**Validates: Requirements 4.6**

### Property 5: Canvas State Consistency

*For any* canvas, the displayed nodes and edges should exactly match the nodes and edges stored in the database's current version.

**Validates: Requirements 1.2, 1.3, 5.6**

### Property 6: Error Recovery

*For any* failed database operation, the local canvas state should either rollback to the previous state or display an error message without crashing the application.

**Validates: Requirements 5.5, 6.4**

### Property 7: Node Selection Exclusivity

*For any* canvas state, at most one node OR one edge can be selected at a time (not both simultaneously).

**Validates: Requirements 3.1, 3.7**

## Error Handling

### API Error Responses

All API endpoints follow a consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**Error Codes**:
- `BAD_REQUEST` (400) - Invalid request body or parameters
- `NOT_FOUND` (404) - Canvas, node, or edge not found
- `VALIDATION_ERROR` (400) - Field validation failed
- `SERVER_ERROR` (500) - Internal server error

### Client-Side Error Handling

**Network Errors**:
- Display toast notification with error message
- Rollback optimistic updates
- Provide retry option for critical operations

**Validation Errors**:
- Display inline error messages next to invalid fields
- Prevent form submission until errors are resolved
- Highlight invalid fields with red border

**State Errors**:
- Log to console for debugging
- Display generic error message to user
- Attempt to recover by refetching data

### Error Boundaries

The WorkflowCanvas component should be wrapped in an error boundary to catch and handle React errors gracefully without crashing the entire application.

## Testing Strategy

### Unit Testing

**Components to Test**:
- NodePalette: Node type selection and callback invocation
- NodeConfigPanel: Form validation and save operations
- WorkflowCanvas: Node/edge CRUD operations

**Test Cases**:
1. NodePalette opens and closes correctly
2. NodePalette calls onAddNode with correct node type
3. NodeConfigPanel validates required fields
4. NodeConfigPanel saves configuration correctly
5. WorkflowCanvas adds nodes to local state
6. WorkflowCanvas creates edges between nodes
7. WorkflowCanvas deletes nodes and connected edges

### Property-Based Testing

**Property 1: Node Persistence**
- Generate random node configurations
- Create node via API
- Fetch canvas data
- Verify node exists with same configuration

**Property 2: Edge Persistence**
- Generate random edge configurations
- Create edge via API
- Fetch canvas data
- Verify edge exists with same configuration

**Property 3: Configuration Auto-Save**
- Generate random configuration changes
- Update node configuration
- Wait for debounce period
- Fetch canvas data
- Verify configuration matches

**Property 4: Node Deletion Cascade**
- Create node with multiple connected edges
- Delete node
- Fetch canvas data
- Verify node and all connected edges are removed

**Property 5: Canvas State Consistency**
- Fetch canvas data from database
- Render canvas
- Compare displayed nodes/edges with database data
- Verify exact match

**Property 6: Error Recovery**
- Simulate API failures
- Attempt operations
- Verify application doesn't crash
- Verify error messages displayed

**Property 7: Node Selection Exclusivity**
- Select node
- Verify edge selection is cleared
- Select edge
- Verify node selection is cleared

### Integration Testing

**End-to-End Workflows**:
1. User creates new canvas
2. User adds multiple nodes from palette
3. User connects nodes with edges
4. User configures each node
5. User refreshes page
6. Verify all changes persisted

**Error Scenarios**:
1. Network failure during node creation
2. Invalid configuration data
3. Attempting to connect non-existent nodes
4. Deleting node while configuration panel is open

### Manual Testing Checklist

- [ ] Canvas displays existing workflows correctly
- [ ] Node palette opens and closes
- [ ] Nodes can be added from palette
- [ ] Nodes appear in correct positions
- [ ] Node configuration panel opens on click
- [ ] Configuration changes save automatically
- [ ] Edges can be created by dragging
- [ ] Edges can be deleted with Delete key
- [ ] Nodes can be deleted with Delete key
- [ ] Deleting node removes connected edges
- [ ] Page refresh preserves all changes
- [ ] Error messages display for failed operations
- [ ] Loading states show during async operations

## Performance Considerations

### Debouncing

Configuration changes are debounced with a 500ms delay to prevent excessive API calls while the user is typing.

```typescript
const debouncedSave = useMemo(
  () => debounce((nodeId: string, config: NodeConfig) => {
    handleSaveNodeConfig(nodeId, config);
  }, 500),
  []
);
```

### Optimistic Updates

For better UX, local state is updated immediately before the API call completes. If the API call fails, the state is rolled back.

```typescript
// Optimistic update
setNodes((nds) => [...nds, newNode]);

// API call
const response = await fetch('/api/canvas/[id]/nodes', { ... });

if (!response.ok) {
  // Rollback on error
  setNodes((nds) => nds.filter(n => n.id !== newNode.id));
  showError('Failed to create node');
}
```

### Canvas Rendering

React Flow handles canvas rendering efficiently. For workflows with 50+ nodes, consider:
- Lazy loading node details
- Virtualizing off-screen nodes
- Throttling pan/zoom events

(These optimizations are out of scope for this spec but noted for future consideration)

## Security Considerations

### Authentication

All API endpoints require authentication. The current implementation assumes authentication is handled by middleware.

### Authorization

Users should only be able to modify canvases they own or have access to. This is enforced by RLS policies in Supabase.

### Input Validation

All user inputs are validated:
- Node IDs: Must be non-empty strings
- Positions: Must be numeric x/y coordinates
- Labels: Must be non-empty strings
- Configuration: Must match worker definition schema

### XSS Prevention

All user-provided content (labels, configuration values) is sanitized before rendering to prevent XSS attacks.

## Trade-offs and Decisions

### Decision 1: Local State vs Global State

**Options Considered**:
- A: Use React Context or Redux for global state
- B: Use local component state with React hooks

**Decision**: Option B (local state)

**Rationale**: 
- Simpler implementation with fewer dependencies
- Database is the source of truth, not client state
- No need to sync state across multiple components
- Easier to reason about data flow

### Decision 2: Optimistic Updates vs Pessimistic Updates

**Options Considered**:
- A: Update UI immediately, rollback on error (optimistic)
- B: Wait for API response before updating UI (pessimistic)

**Decision**: Option A (optimistic updates)

**Rationale**:
- Better perceived performance
- Most operations succeed, so rollbacks are rare
- Users get immediate feedback
- Can still show loading states for long operations

### Decision 3: Auto-Save vs Manual Save

**Options Considered**:
- A: Auto-save configuration changes with debouncing
- B: Require explicit "Save" button click

**Decision**: Option A (auto-save)

**Rationale**:
- Reduces cognitive load (users don't need to remember to save)
- Prevents data loss from accidental navigation
- Debouncing prevents excessive API calls
- Consistent with modern web app UX patterns

### Decision 4: Modal vs Inline Node Palette

**Options Considered**:
- A: Floating button that opens modal with node types
- B: Always-visible sidebar with node types

**Decision**: Option A (modal)

**Rationale**:
- Maximizes canvas workspace
- Reduces visual clutter
- Node addition is infrequent, doesn't need constant visibility
- Consistent with existing design patterns in the app

### Decision 5: Sheet vs Modal for Node Configuration

**Options Considered**:
- A: Right-side sheet (current implementation)
- B: Center modal overlay

**Decision**: Option A (sheet)

**Rationale**:
- Allows viewing canvas while configuring
- Doesn't obscure the workflow
- Better for comparing multiple node configurations
- Consistent with modern design patterns (e.g., Figma, Notion)

## Dependencies

### External Libraries

- **@xyflow/react**: Canvas rendering and interaction
- **React**: UI framework
- **Next.js**: Application framework
- **Supabase**: Database and authentication

### Internal Dependencies

- **Canvas Version Manager**: Handles canvas versioning and persistence
- **Worker Registry**: Defines available worker types and their schemas
- **Theme Provider**: Provides theme context for styling
- **API Error Handler**: Standardizes error handling across API routes

### Database Dependencies

- `stitch_flows` table must exist
- `stitch_flow_versions` table must exist
- RLS policies must be configured
- User authentication must be set up

## Implementation Notes

### Existing Code

The following components already exist and are functional:
- WorkflowCanvas.tsx (needs integration fixes)
- NodePalette.tsx (needs wiring to WorkflowCanvas)
- NodeConfigPanel.tsx (needs wiring to WorkflowCanvas)
- API routes for nodes and edges (functional)

### Required Changes

1. **WorkflowCanvas Integration**:
   - Ensure NodePalette is imported and rendered
   - Ensure NodeConfigPanel is imported and rendered
   - Wire up onAddNode callback
   - Wire up onSave callback for configuration
   - Add error handling and user feedback

2. **State Management**:
   - Verify node/edge state updates correctly
   - Ensure selected node state is managed properly
   - Add rollback logic for failed operations

3. **Error Handling**:
   - Add toast notifications for errors
   - Add loading states for async operations
   - Add validation feedback in forms

### Testing Requirements

- Unit tests for each component
- Property-based tests for persistence and consistency
- Integration tests for end-to-end workflows
- Manual testing checklist completion

## Future Enhancements

The following features are out of scope for this spec but noted for future consideration:

- Undo/redo functionality
- Multi-select for bulk operations
- Copy/paste nodes
- Node templates
- Keyboard shortcuts for common operations
- Canvas minimap for navigation
- Node search/filter
- Collaborative editing (real-time multi-user)
- Canvas export (PNG, SVG, JSON)
- Node grouping/containers

These will be addressed in subsequent specifications.
