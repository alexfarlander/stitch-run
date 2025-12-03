# Canvas Navigation System

## Overview

Stitch implements a fractal canvas navigation system that allows drill-down from BMC → Section → Item → Workflow at any depth.

## Navigation Levels

### Level 1: Business Model Canvas (BMC)
- Top-level view showing 12 sections (Marketing, Sales, Data, etc.)
- Sections are background containers with glowing borders
- **Drill-down**: Double-click section header or click expand icon

### Level 2: Section Workflow
- Shows the workflow inside a section
- Contains items/assets (CRM, Email Tool, API, etc.)
- **Drill-down**: Click an item with linked workflow

### Level 3: Item Detail Workflow
- Shows the detailed workflow for a specific item
- Example: "Email Sequences" → Email automation workflow
- **Drill-down**: Can nest infinitely via `parent_id` chain

## Implementation

### Navigation State Management

**Location**: `src/lib/navigation/canvas-navigation.ts`

```typescript
// Core navigation manager with persistence
const navigation = getCanvasNavigation();

// Drill into a canvas
navigation.drillInto({ id, name, type });

// Go back one level
navigation.goBack();

// Navigate to specific breadcrumb
navigation.navigateTo(index);

// Get current canvas
const current = navigation.getCurrentCanvas();

// Get breadcrumbs
const breadcrumbs = navigation.getBreadcrumbs();
```

### React Hook

**Location**: `src/hooks/useCanvasNavigation.ts`

```typescript
const {
  currentCanvasId,
  currentCanvas,
  breadcrumbs,
  canGoBack,
  drillInto,
  goBack,
  navigateTo,
  hydrateFromDatabase,
} = useCanvasNavigation();
```

### Persistence

Navigation stack is persisted in `sessionStorage` with key `stitch_canvas_stack`.

On page refresh or direct URL access, the stack is automatically hydrated by walking up the `parent_id` chain in the database.

## Node Configuration

### SectionNode (BMC Sections)

```typescript
interface SectionNodeData {
  label: string;
  category: 'Production' | 'Customer' | 'Financial';
  child_canvas_id?: string; // Links to section workflow
}
```

**Interaction**: Double-click header or click expand icon

### ItemNode (Items inside sections)

```typescript
interface ItemNodeData {
  label: string;
  icon: string;
  status: 'idle' | 'active' | 'running' | 'error';
  itemType: 'worker' | 'asset' | 'integration' | 'product';
  linked_workflow_id?: string; // Links to item workflow
  linked_canvas_id?: string;   // Alternative link field
  onShowDetail?: (itemId: string) => void; // Fallback for detail panel
}
```

**Interaction**: Click item

**Priority**:
1. Navigate to `linked_workflow_id` if present
2. Navigate to `linked_canvas_id` if present
3. Call `onShowDetail` callback if present
4. No action if none present

### SectionItemNode (Legacy)

Same as ItemNode but older implementation. Both support drill-down.

## Canvas Components

### BMCCanvas
- Renders Business Model Canvas
- Shows sections and items
- Supports entity tracking overlay

### WorkflowCanvas
- Renders workflow graphs
- Shows Worker, UX, Splitter, Collector nodes
- Real-time execution status
- Back button to return to parent

### CanvasBreadcrumbs
- Displays navigation path
- Clickable breadcrumbs to jump to any level
- Shows canvas type (BMC/workflow/section)

## Example Flow

```
BMC (Root)
├─ Marketing Section (child_canvas_id: "marketing-workflow-123")
│  └─ Marketing Workflow
│     ├─ Email Tool (linked_workflow_id: "email-automation-456")
│     │  └─ Email Automation Workflow
│     │     ├─ Trigger Node
│     │     ├─ Template Worker
│     │     └─ Send Worker
│     └─ Social Media Tool
└─ Sales Section
   └─ Sales Workflow
      └─ CRM (linked_workflow_id: "crm-sync-789")
```

## Database Schema

### stitch_flows (aka stitch_canvases)

```sql
CREATE TABLE stitch_flows (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  canvas_type TEXT DEFAULT 'workflow', -- 'bmc' | 'workflow'
  parent_id UUID REFERENCES stitch_flows(id),
  graph JSONB NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Hierarchy**: Use `parent_id` to create nested canvas relationships

## URL Structure

```
/canvas/[canvasId]              # View any canvas
/canvas/[canvasId]?runId=xyz    # View canvas with run tracking
```

The route automatically:
1. Fetches the canvas from database
2. Hydrates navigation stack
3. Renders BMC or Workflow based on `canvas_type`

## Visual Indicators

### Section with child canvas
- Expand icon (ChevronRight) in header
- Header border changes to cyan on hover
- Cursor: pointer

### Item with linked workflow
- Small ExternalLink icon appears on hover
- Icon color changes to cyan
- Cursor: pointer

## Best Practices

1. **Always set parent_id**: When creating child canvases, set the parent_id to enable breadcrumb hydration
2. **Use meaningful names**: Canvas names appear in breadcrumbs
3. **Set canvas_type correctly**: 'bmc' for top-level, 'workflow' for everything else
4. **Test hydration**: Direct URL access should reconstruct full breadcrumb path
5. **Handle missing links gracefully**: Items without links should still be clickable (show detail panel)

## Testing Navigation

```typescript
// Test drill-down
drillInto('canvas-123', 'Marketing', 'workflow');

// Test back navigation
goBack();

// Test breadcrumb navigation
navigateTo(0); // Jump to root

// Test hydration
await hydrateFromDatabase('deep-canvas-id');
// Should reconstruct: [Root, Parent, Current]
```
