# Design Document

## Overview

The Workflow Management UI feature transforms Stitch from a code-driven workflow platform into a fully visual, user-friendly application. This design enables users to create, configure, and manage workflows entirely through the interface, eliminating the need for seed scripts, API calls, and manual database configuration.

The system is built on Stitch's existing architecture, extending the canvas system with comprehensive UI controls for workflow creation, entity management, run execution, and observability. The design follows a phased approach, prioritizing core functionality first (canvas creation, node configuration, entity import, run management) before adding advanced features (scheduling, webhooks, metrics).

## Architecture

### System Context

The Workflow Management UI sits at the presentation layer, providing user-facing controls for the existing Stitch execution engine, database layer, and worker system. It does not replace or modify core execution logic—instead, it surfaces existing capabilities through intuitive interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                  Workflow Management UI                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Canvas   │ Node     │ Entity   │ Run      │ Settings │  │
│  │ Creation │ Config   │ Import   │ Mgmt     │ Panels   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Existing Stitch Architecture                    │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Canvas   │ Execution│ Database │ Worker   │ Webhook  │  │
│  │ System   │ Engine   │ Layer    │ System   │ System   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Canvas Mode Architecture

The design introduces a clear separation between BMC/Section canvases (read-mostly) and Workflow canvases (full-edit):

**BMC/Section Canvas Mode:**
- Limited node types: Section, SectionItem only
- Read-mostly interactions: select, view, drill-in
- No edge editing
- Minimal toolbar: pan, zoom, drill-in
- Entity visualization for high-level status

**Workflow Canvas Mode:**
- Full node palette: Worker, UX, Splitter, Collector, SectionItem
- Full editing: add/edit/delete nodes and edges
- Configuration panels for node settings
- Run controls and output viewing
- Entity tracking for workflow runs

This separation reduces cognitive load and provides appropriate controls for each context.

### Component Hierarchy

```
App Layout
├── Navigation Bar
│   ├── Canvas List Link
│   ├── Settings Link
│   └── User Menu
│
├── Canvas List Page (/canvases)
│   ├── Canvas List Panel (left)
│   │   ├── Search/Filter
│   │   ├── Canvas Items
│   │   └── New Canvas Button
│   └── Canvas Preview (main)
│
├── Canvas View Page (/canvas/[id])
│   ├── Entity Panel (left, collapsible)
│   │   ├── Entity List
│   │   ├── Search/Filter
│   │   ├── Import Button
│   │   └── Bulk Actions
│   ├── Canvas (main)
│   │   ├── BMCCanvas or WorkflowCanvas
│   │   ├── Node Palette (workflow mode)
│   │   └── Run Status Overlay
│   └── Detail Panel (right, collapsible)
│       ├── Node Configuration
│       ├── Entity Detail
│       └── Journey Timeline
│
├── Run View Page (/runs/[id])
│   ├── Run Info Panel (left)
│   │   ├── Run Metadata
│   │   ├── Node List
│   │   └── Timeline
│   ├── Canvas with Status (main)
│   └── Output Panel (right)
│       ├── Node Output Viewer
│       └── Output History
│
└── Settings Pages (/settings/*)
    ├── Functions Registry
    ├── Schedules Management
    ├── Webhooks Configuration
    └── Email Reply Handling
```

### Data Flow

**Canvas Creation Flow:**
```
User clicks "New Canvas"
  → Modal opens with form
  → User enters name, type, template
  → POST /api/flows with visual graph
  → createFlowWithVersion() creates flow + version
  → Navigate to new canvas
```

**Node Configuration Flow:**
```
User adds Worker node
  → Node appears on canvas
  → User clicks node
  → Config panel opens
  → User enters webhook URL, config
  → onChange updates node.data
  → Auto-save to canvas graph
```

**Entity Import Flow:**
```
User clicks "Import Entities"
  → Modal opens with source selector
  → User selects CSV/Airtable/Manual
  → User maps fields, selects entry node
  → POST /api/entities (batch)
  → Entities created with current_node_id
  → Entity panel updates via subscription
```

**Run Start Flow:**
```
User selects entity, clicks "Start Run"
  → POST /api/flows/{id}/run with entity_id
  → Run created, entry nodes fired
  → Navigate to /runs/[runId]
  → Real-time status via useRealtimeRun
```

## Components and Interfaces

### 1. Canvas Creation UI

**Component:** `CanvasCreationModal`

**Location:** `src/components/canvas/CanvasCreationModal.tsx`

**Props:**
```typescript
interface CanvasCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (flowId: string) => void;
}
```

**Features:**
- Name input field
- Canvas type selector (BMC, Workflow, Section)
- Template selector (Blank, Outreach, Onboarding, Support)
- Create button with loading state
- Cancel button

**API Integration:**
```typescript
const response = await fetch('/api/flows', {
  method: 'POST',
  body: JSON.stringify({
    name: canvasName,
    canvas_type: canvasType,
    graph: templateGraph,
  }),
});
```

**Templates:**
- Blank: Empty canvas
- Outreach: Queued → Send Email → Await Reply → Reply/No Reply → Registered
- Onboarding: Signed Up → Welcome Email → Tutorial → Activated
- Support: Ticket Created → Assign → Resolve → Close

### 2. Node Creation UI

**Component:** `NodePalette` (workflow mode only)

**Location:** `src/components/canvas/NodePalette.tsx`

**Features:**
- Floating palette with node type buttons
- Drag-to-add or click-to-add modes
- Node type icons and labels
- Collapsible sections by category

**Node Types:**
- **Actions:** Worker (webhook), MediaSelect
- **Flow Control:** Splitter (fan-out), Collector (fan-in)
- **User Interaction:** UX (wait for input)
- **Waypoints:** SectionItem (visual marker)

**Component:** `NodeConfigPanel`

**Location:** `src/components/canvas/NodeConfigPanel.tsx`

**Props:**
```typescript
interface NodeConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}
```

**Worker Node Config:**
- Label input
- Webhook URL input (with function registry selector)
- Config fields (JSON editor or key-value pairs)
- Entity movement settings (optional)
  - On success: target section, entity type
  - On failure: target section

**UX Node Config:**
- Label input
- Prompt/description textarea
- Timeout settings (hours/days)

**Splitter Node Config:**
- Label input
- Array path input (JSON path to array in input)

**Collector Node Config:**
- Label input
- Expected upstream count (optional, auto-detected)

### 3. Edge Creation UI

**Implementation:** React Flow built-in drag handles

**Features:**
- Drag from node handle to another node
- Visual edge with arrow
- Edge selection and deletion (Delete key or context menu)
- Edge labels (future: conditional routing)

**Configuration:**
```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onConnect={handleConnect}
  onEdgesChange={onEdgesChange}
  connectionMode="loose"
  connectionLineType="smoothstep"
/>
```

**Edge Creation Handler:**
```typescript
const handleConnect = (connection: Connection) => {
  const newEdge = {
    id: `${connection.source}-${connection.target}`,
    source: connection.source!,
    target: connection.target!,
    type: 'journey',
    animated: true,
  };
  
  setEdges((eds) => addEdge(newEdge, eds));
  
  // Auto-save
  saveCanvasGraph();
};
```

### 4. Entity Import UI

**Component:** `EntityImportModal`

**Location:** `src/components/entities/EntityImportModal.tsx`

**Props:**
```typescript
interface EntityImportModalProps {
  canvasId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}
```

**Features:**
- Source selector tabs: CSV, Airtable, Manual
- Entry node selector (dropdown of canvas nodes)

**CSV Import Tab:**
- File upload dropzone
- CSV preview table
- Column mapping interface
  - Name → entity name
  - Email → entity email
  - Company → entity company
  - Type → entity type
- Import button with progress

**Airtable Import Tab:**
- Base ID input
- Table name input
- Field mapping interface
- Sync now button
- Optional: recurring sync checkbox

**Manual Entry Tab:**
- Name input
- Email input (required)
- Company input
- Entity type selector (Lead, Customer, Churned)
- Add button

**API Integration:**
```typescript
// CSV/Manual import
const response = await fetch('/api/entities', {
  method: 'POST',
  body: JSON.stringify({
    entities: parsedEntities,
    canvas_id: canvasId,
    current_node_id: entryNodeId,
  }),
});

// Airtable import
const response = await fetch('/api/integrations/airtable/sync', {
  method: 'POST',
  body: JSON.stringify({
    base_id: baseId,
    table_name: tableName,
    field_mapping: fieldMapping,
    canvas_id: canvasId,
    entry_node_id: entryNodeId,
  }),
});
```

### 5. Entity List Panel

**Component:** `EntityListPanel`

**Location:** `src/components/entities/EntityListPanel.tsx`

**Props:**
```typescript
interface EntityListPanelProps {
  canvasId: string;
  collapsed?: boolean;
  onToggle?: () => void;
}
```

**Features:**
- Search input (filters by name/email)
- Node filter dropdown (show entities at specific node)
- Type filter dropdown (Lead, Customer, Churned)
- Entity list with:
  - Avatar/icon
  - Name and email
  - Current node badge
  - Status indicator (run status)
  - Checkbox for bulk selection
- Bulk action buttons:
  - Start Runs
  - Move to Node
  - Delete
- Add Entity button
- Import button

**Data Fetching:**
```typescript
const { entities, loading } = useCanvasEntities(canvasId);

// Filter logic
const filteredEntities = useMemo(() => {
  return entities
    .filter((e) => {
      if (searchText && !e.name.includes(searchText) && !e.email.includes(searchText)) {
        return false;
      }
      if (nodeFilter && e.current_node_id !== nodeFilter) {
        return false;
      }
      if (typeFilter && e.entity_type !== typeFilter) {
        return false;
      }
      return true;
    });
}, [entities, searchText, nodeFilter, typeFilter]);
```

### 6. Run Management UI

**Component:** `RunControlPanel`

**Location:** `src/components/runs/RunControlPanel.tsx`

**Features:**
- Start Run button (single entity)
- Bulk Start Runs button (multiple entities)
- Run status badge on entity
- Run history list

**Start Run Handler:**
```typescript
const handleStartRun = async (entityId: string) => {
  const response = await fetch(`/api/flows/${flowId}/run`, {
    method: 'POST',
    body: JSON.stringify({
      entityId,
      input: {},
    }),
  });
  
  const { runId } = await response.json();
  
  // Navigate to run view
  router.push(`/runs/${runId}`);
};
```

**Bulk Start Handler:**
```typescript
const handleBulkStartRuns = async (entityIds: string[]) => {
  setLoading(true);
  
  for (const entityId of entityIds) {
    await handleStartRun(entityId);
    
    // Rate limiting: wait 100ms between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  setLoading(false);
  toast.success(`Started ${entityIds.length} runs`);
};
```

**Component:** `RunHistoryPanel`

**Location:** `src/components/runs/RunHistoryPanel.tsx`

**Props:**
```typescript
interface RunHistoryPanelProps {
  entityId: string;
}
```

**Features:**
- List of runs for entity
- Run status badge (running, completed, failed)
- Timestamp
- Click to view run detail

### 7. Function Registry UI

**Page:** `/settings/functions`

**Component:** `FunctionRegistryPage`

**Location:** `src/app/settings/functions/page.tsx`

**Features:**
- List of registered functions
  - Name
  - Webhook URL
  - Last called timestamp
  - Status indicator
- Add Function button
- Test Function button per function
- Edit/Delete actions

**Component:** `AddFunctionModal`

**Features:**
- Name input
- Webhook URL input
- Config schema editor (JSON)
- Description textarea
- Save button

**API Integration:**
```typescript
// Create function
const response = await fetch('/api/function-registry', {
  method: 'POST',
  body: JSON.stringify({
    name: functionName,
    webhook_url: webhookUrl,
    config_schema: configSchema,
    description: description,
  }),
});

// Test function
const response = await fetch('/api/function-registry/test', {
  method: 'POST',
  body: JSON.stringify({
    function_id: functionId,
    test_payload: {
      runId: 'test-run',
      nodeId: 'test-node',
      config: {},
      input: {},
      callbackUrl: 'https://example.com/callback',
    },
  }),
});
```

### 8. Schedule Management UI

**Page:** `/settings/schedules`

**Component:** `ScheduleManagementPage`

**Location:** `src/app/settings/schedules/page.tsx`

**Features:**
- List of schedules
  - Name
  - Cron expression (human-readable)
  - Next run time
  - Last run time and result
  - Enabled toggle
- Add Schedule button
- Edit/Delete actions
- Execution logs per schedule

**Component:** `AddScheduleModal`

**Features:**
- Name input
- Canvas selector
- Cron expression builder
  - Days of week checkboxes
  - Time range inputs
  - Or: raw cron expression input
- Target node selector (optional filter)
- Max per day input
- Batch size input
- Save button

**Cron Builder:**
```typescript
// Convert UI inputs to cron expression
const buildCronExpression = (config: {
  days: string[];  // ['MON', 'TUE', 'WED']
  startHour: number;  // 8
  endHour: number;  // 12
}) => {
  // Run every hour between start and end on selected days
  const hours = Array.from(
    { length: config.endHour - config.startHour + 1 },
    (_, i) => config.startHour + i
  ).join(',');
  
  const daysOfWeek = config.days.join(',');
  
  return `0 ${hours} * * ${daysOfWeek}`;
};
```

**API Integration:**
```typescript
// Create schedule
const response = await fetch('/api/schedules', {
  method: 'POST',
  body: JSON.stringify({
    canvas_id: canvasId,
    name: scheduleName,
    cron_expression: cronExpression,
    target_node_id: targetNodeId,
    max_per_day: maxPerDay,
    batch_size: batchSize,
    enabled: true,
  }),
});

// Toggle enabled
const response = await fetch(`/api/schedules/${scheduleId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    enabled: !currentEnabled,
  }),
});
```

### 9. Webhook Configuration UI

**Page:** `/settings/webhooks`

**Component:** `WebhookConfigPage`

**Location:** `src/app/settings/webhooks/page.tsx`

**Features:**
- List of webhooks
  - Name
  - Source (Calendly, Stripe, Custom)
  - Endpoint URL (copyable)
  - Last received timestamp
  - Status
- Add Webhook button
- View Logs button per webhook
- Edit/Delete actions

**Component:** `AddWebhookModal`

**Features:**
- Name input
- Source selector (Calendly, Stripe, Typeform, n8n, Custom)
- Canvas selector
- Target node selector
- Entity mapping interface
  - JSON path → entity field mapping
  - Example: `data.email` → `email`
- Auto-generated endpoint URL (display only)
- Secret key (display once, copyable)
- Save button

**API Integration:**
```typescript
// Create webhook
const response = await fetch('/api/webhook-configs', {
  method: 'POST',
  body: JSON.stringify({
    name: webhookName,
    source: webhookSource,
    canvas_id: canvasId,
    target_node_id: targetNodeId,
    entity_mapping: entityMapping,
    require_signature: true,
  }),
});

const { webhook_id, endpoint_url, secret_key } = await response.json();

// Display endpoint URL and secret
setEndpointUrl(endpoint_url);
setSecretKey(secret_key);
```

**Webhook Logs Component:**

**Features:**
- List of recent webhook events
- Timestamp
- Payload preview (collapsible JSON)
- Processing status (success, failed)
- Error message if failed
- Retry button for failed events

### 10. Email Reply Webhook UI

**Page:** `/settings/webhooks/email-replies`

**Component:** `EmailReplyWebhookPage`

**Location:** `src/app/settings/webhooks/email-replies/page.tsx`

**Features:**
- Provider selector (Resend, SendGrid, Postmark, Custom)
- Field mapping (auto-filled based on provider)
  - From email path
  - Body text path
  - Subject path (optional)
- Target UX node selector
- Intent keywords configuration
  - "Yes" keywords (comma-separated)
  - "No" keywords (comma-separated)
  - Default intent (yes/no/neutral)
- Endpoint URL (display, copyable)
- Secret key (display once, copyable)
- Save button

**Provider-Specific Mappings:**
```typescript
const providerMappings = {
  resend: {
    from_email: 'from',
    body: 'text',
    subject: 'subject',
  },
  sendgrid: {
    from_email: 'from.email',
    body: 'text',
    subject: 'subject',
  },
  postmark: {
    from_email: 'FromFull.Email',
    body: 'TextBody',
    subject: 'Subject',
  },
};
```

**Intent Detection Config:**
```typescript
interface IntentConfig {
  yes_keywords: string[];  // ['yes', 'sure', 'interested', 'definitely']
  no_keywords: string[];   // ['no', 'not interested', 'unsubscribe']
  default_intent: 'yes' | 'no' | 'neutral';
}
```

### 11. Node Output Viewer

**Component:** `NodeOutputPanel` (extends RunViewer)

**Location:** `src/components/runs/NodeOutputPanel.tsx`

**Props:**
```typescript
interface NodeOutputPanelProps {
  runId: string;
  nodeId: string;
  open: boolean;
  onClose: () => void;
}
```

**Features:**
- JSON output viewer with syntax highlighting
- Collapsible sections for nested objects
- Copy output button
- Output history toggle
  - Shows outputs from previous runs
  - Comparison view
- Pagination for large outputs

**Implementation:**
```typescript
const { run } = useRealtimeRun(runId);

const nodeOutput = run?.node_states?.[nodeId]?.output;

// Render with react-json-view or similar
<JSONViewer 
  src={nodeOutput}
  collapsed={1}
  displayDataTypes={false}
  enableClipboard={true}
/>
```

### 12. Journey Timeline UI

**Component:** `JourneyTimelinePanel`

**Location:** `src/components/entities/JourneyTimelinePanel.tsx`

**Props:**
```typescript
interface JourneyTimelinePanelProps {
  entityId: string;
}
```

**Features:**
- Vertical timeline of journey events
- Event items with:
  - Timestamp
  - Event type icon
  - Node/edge name
  - Metadata preview (collapsible)
- Click event to highlight on canvas
- Infinite scroll or pagination

**Data Fetching:**
```typescript
const { data: events } = useQuery({
  queryKey: ['journey-events', entityId],
  queryFn: async () => {
    const { data } = await supabase
      .from('stitch_journey_events')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    
    return data;
  },
});
```

**Event Types:**
- `arrived_at_node`: Entity moved to node
- `started_edge`: Entity began traversing edge
- `completed_edge`: Entity completed edge traversal
- `run_started`: Run started for entity
- `run_completed`: Run completed for entity
- `run_failed`: Run failed for entity

### 13. Dashboard/Metrics UI

**Page:** `/canvas/[id]/dashboard`

**Component:** `WorkflowDashboard`

**Location:** `src/app/canvas/[id]/dashboard/page.tsx`

**Features:**
- Total entity count
- Entities per node (funnel visualization)
- Conversion rates between nodes
- Today's activity
  - Runs started
  - Runs completed
  - Runs failed
- Time-based charts
  - Entities over time (line chart)
  - Daily sends (bar chart)
- Export data button

**Funnel Visualization:**
```typescript
// Calculate entities per node
const entitiesByNode = entities.reduce((acc, entity) => {
  const nodeId = entity.current_node_id;
  acc[nodeId] = (acc[nodeId] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

// Calculate conversion rates
const conversionRates = calculateConversionRates(
  journeyEvents,
  flowGraph
);
```

**Export Handler:**
```typescript
const handleExport = async (type: 'entities' | 'runs' | 'events') => {
  const response = await fetch(`/api/canvas/${canvasId}/export`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-${canvasId}-${Date.now()}.csv`;
  a.click();
};
```

## Data Models

### Entities API

**Endpoints:**

```typescript
// GET /api/entities?canvas_id={id}
interface GetEntitiesResponse {
  entities: StitchEntity[];
}

// POST /api/entities
interface CreateEntityRequest {
  entities: Array<{
    name: string;
    email: string;
    company?: string;
    entity_type: 'lead' | 'customer' | 'churned';
    canvas_id: string;
    current_node_id: string;
  }>;
}

// PATCH /api/entities/{id}
interface UpdateEntityRequest {
  name?: string;
  email?: string;
  company?: string;
  entity_type?: 'lead' | 'customer' | 'churned';
  current_node_id?: string;
}

// DELETE /api/entities/{id}
// Returns 204 No Content
```

### Function Registry Table

```sql
create table stitch_function_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  webhook_url text not null,
  config_schema jsonb,
  description text,
  last_called_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS policies
alter table stitch_function_registry enable row level security;

create policy "Users can view functions"
  on stitch_function_registry for select
  using (true);

create policy "Users can create functions"
  on stitch_function_registry for insert
  with check (true);

create policy "Users can update functions"
  on stitch_function_registry for update
  using (true);

create policy "Users can delete functions"
  on stitch_function_registry for delete
  using (true);
```

### Schedules Table

```sql
create table stitch_schedules (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references stitch_flows(id) on delete cascade,
  name text not null,
  cron_expression text not null,
  target_node_id text,
  max_per_day int default 20,
  batch_size int default 5,
  enabled boolean default true,
  last_run_at timestamp,
  last_run_result jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS policies
alter table stitch_schedules enable row level security;

create policy "Users can view schedules"
  on stitch_schedules for select
  using (true);

create policy "Users can create schedules"
  on stitch_schedules for insert
  with check (true);

create policy "Users can update schedules"
  on stitch_schedules for update
  using (true);

create policy "Users can delete schedules"
  on stitch_schedules for delete
  using (true);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable criteria from the prework analysis, I've identified several areas where properties can be consolidated to eliminate redundancy:

**Consolidation Opportunities:**

1. **Canvas Persistence (1.5) and Node/Edge Persistence (2.5, 3.5)**: These can be combined into a single property about graph changes being persisted immediately.

2. **Entity Filtering (10.2, 10.3, 10.4)**: These three filtering properties can be combined into one comprehensive filtering property.

3. **Webhook Logging (8.8) and Email Reply Logging (9.9)**: Both test that events are logged, can be combined.

4. **Run Status Display (5.3) and Run History (5.4, 5.5)**: These test related aspects of run visualization and can be combined.

5. **Dashboard Queries (13.1, 13.2, 13.3)**: These all test that dashboard data is derived correctly from database tables, can be combined.

**Properties to Keep Separate:**

- Canvas creation properties (1.2, 1.4) test different aspects (creation vs template population)
- Node operations (2.2, 2.6) test creation vs deletion
- Edge operations (3.1, 3.3) test creation vs deletion
- Import properties (4.3, 4.4, 4.6, 4.8) test different import sources and behaviors
- Webhook properties (8.3, 8.4, 8.5, 8.6, 8.7) test distinct security and processing steps
- Email reply properties (9.2-9.8) test a complex multi-step process that should be validated separately

### Correctness Properties

Property 1: Canvas creation with type
*For any* valid canvas name and canvas type, creating a canvas should result in a database record with the correct name, type, and mode (workflow canvases in full-edit mode, BMC/section canvases in read-mostly mode)
**Validates: Requirements 1.2, 1.6**

Property 2: Template population
*For any* workflow template selection, the created canvas should contain all nodes and edges defined in that template
**Validates: Requirements 1.4**

Property 3: Graph persistence
*For any* canvas graph modification (node addition/deletion/update or edge addition/deletion), the change should be persisted to the database immediately
**Validates: Requirements 2.5, 3.5, 1.5**

Property 4: Node type creation
*For any* valid node type selection, creating a node should result in a node of that type being added to the canvas graph
**Validates: Requirements 2.2**

Property 5: Node deletion cascade
*For any* node deletion, all edges connected to that node should also be removed from the canvas graph
**Validates: Requirements 2.6**

Property 6: Edge creation
*For any* two nodes on the canvas, dragging from one node handle to another should create a directional edge with correct source and target
**Validates: Requirements 3.1, 3.2**

Property 7: Edge deletion
*For any* edge on the canvas, deleting the edge should remove it from the canvas graph
**Validates: Requirements 3.3**

Property 8: CSV parsing and preview
*For any* valid CSV file upload, the system should parse the file and display a preview containing all rows with mapped columns
**Validates: Requirements 4.3**

Property 9: Entity import with entry node
*For any* entity import (CSV, Airtable, or Manual), all created entities should have their current_node_id set to the selected entry node
**Validates: Requirements 4.4, 4.6, 4.8**

Property 10: Run creation via API
*For any* entity, starting a run should call POST /api/flows/{flowId}/run with the entity_id and result in a new run record
**Validates: Requirements 5.1**

Property 11: Bulk run creation with rate limiting
*For any* set of selected entities, starting bulk runs should create runs for all entities with delays between API calls to respect rate limits
**Validates: Requirements 5.2**

Property 12: Run visualization
*For any* entity with runs, the system should display run status indicators, run history, and allow navigation to run detail views
**Validates: Requirements 5.3, 5.4, 5.5**

Property 13: Function registry persistence
*For any* valid function registration, the function should be persisted to stitch_function_registry and appear in the functions list
**Validates: Requirements 6.3**

Property 14: Function testing
*For any* registered function, testing the function should send a test payload to the webhook URL and display the response
**Validates: Requirements 6.4**

Property 15: Schedule persistence
*For any* valid schedule configuration, the schedule should be persisted to stitch_schedules with all configured parameters
**Validates: Requirements 7.3**

Property 16: Schedule toggle
*For any* schedule, toggling the enabled status should immediately update the enabled field in stitch_schedules
**Validates: Requirements 7.4**

Property 17: Schedule execution respects configuration
*For any* schedule execution, the system should read configuration from stitch_schedules and start runs only for entities at the target node, respecting max_per_day and batch_size limits
**Validates: Requirements 7.5**

Property 18: Schedule execution logging
*For any* schedule execution, the system should update last_run_at and last_run_result with timestamp, entities processed, and any errors
**Validates: Requirements 7.6**

Property 19: Webhook endpoint generation
*For any* webhook creation, the system should generate a unique endpoint URL and store it in stitch_webhook_configs
**Validates: Requirements 8.3**

Property 20: Webhook secret generation
*For any* webhook creation, the system should generate a secret key for signature validation and store it in stitch_webhook_configs
**Validates: Requirements 8.4**

Property 21: Webhook signature validation
*For any* webhook request, the system should validate the signature using the stored secret key before processing, and reject requests with invalid signatures
**Validates: Requirements 8.5, 8.6**

Property 22: Webhook entity processing
*For any* validated webhook event, the system should map payload fields to entity attributes and move the entity to the target node
**Validates: Requirements 8.7**

Property 23: Webhook event logging
*For any* webhook event (including email replies), the system should log the event with payload preview, processing status, and any errors
**Validates: Requirements 8.8, 9.9**

Property 24: Email reply intent keywords storage
*For any* intent keyword configuration, the system should store yes keywords, no keywords, and default intent correctly
**Validates: Requirements 9.2**

Property 25: Email reply signature validation
*For any* email reply webhook request, the system should validate the signature before processing
**Validates: Requirements 9.3**

Property 26: Email reply parsing
*For any* validated email reply, the system should parse the reply using the configured provider-specific field mapping
**Validates: Requirements 9.4**

Property 27: Email reply intent detection
*For any* email reply text, the system should detect intent based on configured keywords, matching yes keywords to "yes" intent, no keywords to "no" intent, and using default intent when no match
**Validates: Requirements 9.5**

Property 28: Email reply run selection
*For any* email reply from a sender, the system should find the most recent active run in running or waiting_for_user status for the target UX node, and complete only that run
**Validates: Requirements 9.6, 9.7, 9.8**

Property 29: Entity list filtering
*For any* combination of search text, node filter, and type filter, the entity list should display only entities matching all active filters
**Validates: Requirements 10.2, 10.3, 10.4**

Property 30: Node output display
*For any* completed node in a run, clicking the node should display the output from run.node_states[nodeId].output with JSON formatting
**Validates: Requirements 11.1, 11.2**

Property 31: Output clipboard copy
*For any* node output, clicking "Copy Output" should copy the output JSON to the clipboard
**Validates: Requirements 11.3**

Property 32: Output pagination
*For any* node output exceeding a size threshold, the system should paginate or truncate the display with an option to view the full output
**Validates: Requirements 11.5**

Property 33: Journey timeline display
*For any* entity, selecting the entity should query stitch_journey_events and display a timeline with timestamp, event type, node/edge, and metadata for each event
**Validates: Requirements 12.1, 12.2**

Property 34: Journey event highlighting
*For any* journey event, clicking the event should highlight the corresponding node or edge on the canvas
**Validates: Requirements 12.3**

Property 35: Journey path visualization
*For any* entity on the canvas, the system should optionally highlight the path the entity has taken using journey events
**Validates: Requirements 12.4**

Property 36: Journey timeline pagination
*For any* entity with numerous journey events, the timeline should paginate with infinite scroll or load more
**Validates: Requirements 12.5**

Property 37: Dashboard data accuracy
*For any* workflow dashboard, the displayed data should accurately reflect entity counts per node from stitch_entities, conversion rates from stitch_journey_events, and today's activity from stitch_runs
**Validates: Requirements 13.1, 13.2, 13.3**

Property 38: Dashboard time range filtering
*For any* time range selection, the dashboard charts should display entity flow data filtered to that time range
**Validates: Requirements 13.4**

Property 39: Data export generation
*For any* export type (entities, runs, events), clicking "Export Data" should generate a CSV file from the corresponding database table
**Validates: Requirements 13.5**

## Error Handling

### UI Error States

All UI components must handle three error states:

1. **Loading State**: Display skeleton loaders or spinners while fetching data
2. **Empty State**: Show helpful messages when no data exists (e.g., "No entities yet. Import some contacts.")
3. **Error State**: Display clear error messages with retry options when operations fail

### API Error Handling

All API calls must implement:

1. **Try-Catch Blocks**: Wrap all fetch calls in try-catch
2. **Status Code Checking**: Verify response.ok before parsing JSON
3. **User Feedback**: Display toast notifications for success/failure
4. **Retry Logic**: Provide retry buttons for failed operations
5. **Logging**: Log errors to console for debugging

Example:
```typescript
try {
  const response = await fetch('/api/entities', {
    method: 'POST',
    body: JSON.stringify(entityData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create entity');
  }
  
  const result = await response.json();
  toast.success('Entity created successfully');
  return result;
} catch (error) {
  console.error('Entity creation failed:', error);
  toast.error(error.message || 'Failed to create entity');
  throw error;
}
```

### Validation Errors

Form inputs must validate:

1. **Required Fields**: Show error messages for missing required fields
2. **Format Validation**: Validate email formats, URLs, JSON syntax
3. **Range Validation**: Ensure numbers are within acceptable ranges
4. **Uniqueness**: Check for duplicate names/IDs where applicable

### Network Errors

Handle network failures gracefully:

1. **Timeout Handling**: Set reasonable timeouts for API calls
2. **Offline Detection**: Detect offline state and show appropriate message
3. **Retry Strategy**: Implement exponential backoff for retries
4. **Fallback Data**: Use cached data when available

### Database Errors

Handle database operation failures:

1. **Constraint Violations**: Show user-friendly messages for unique constraint violations
2. **Foreign Key Errors**: Explain relationships when deletion fails
3. **Transaction Failures**: Rollback and inform user of failure
4. **Connection Errors**: Detect and report database connection issues

## Testing Strategy

Testing will be performed manually during the final testing phase (Task 20). No automated tests, eslint checks, build verification, or vitest runs will be performed during implementation tasks.

### Manual Testing Approach

After all features are implemented, perform comprehensive manual testing:

**Test Each Feature:**
- Canvas creation with all templates
- Node creation and configuration for all node types
- Edge creation and deletion
- Entity import via CSV, Airtable, and Manual entry
- Entity filtering and search
- Run management (single and bulk)
- Function registry operations
- Schedule management
- Webhook configuration and event processing
- Email reply handling
- Node output viewing
- Journey timeline
- Dashboard and metrics

**Test Error Cases:**
- Invalid inputs
- Network failures
- Missing data
- Edge cases

**Test Performance:**
- Large entity lists
- Many journey events
- Complex workflows

The focus is on building working features quickly, then debugging everything together at the end.

## Performance Considerations

### Frontend Performance

1. **Code Splitting**: Lazy load settings pages and modals
2. **Memoization**: Use React.memo for expensive components
3. **Virtual Scrolling**: Implement virtual scrolling for large entity lists
4. **Debouncing**: Debounce search inputs to reduce re-renders
5. **Optimistic Updates**: Update UI immediately, rollback on failure

### Database Performance

1. **Indexing**: Add indexes on frequently queried columns
   - `stitch_entities.canvas_id`
   - `stitch_entities.current_node_id`
   - `stitch_entities.email`
   - `stitch_journey_events.entity_id`
   - `stitch_runs.entity_id`
2. **Pagination**: Paginate large result sets (entities, journey events)
3. **Query Optimization**: Use select() to fetch only needed columns
4. **Connection Pooling**: Use Supabase connection pooling for high traffic

### Real-Time Performance

1. **Subscription Filtering**: Filter subscriptions to only relevant records
2. **Throttling**: Throttle real-time updates to avoid overwhelming UI
3. **Batching**: Batch multiple updates into single re-render
4. **Cleanup**: Unsubscribe from channels when components unmount

## Security Considerations

### Authentication

All API endpoints must require authentication:
- Use Supabase Auth for user authentication
- Verify JWT tokens on all API routes
- Implement session management

### Authorization

Implement Row Level Security (RLS) policies:
- Users can only access their own canvases
- Users can only modify their own entities
- Users can only view their own runs

### Input Validation

Validate all user inputs:
- Sanitize HTML inputs to prevent XSS
- Validate JSON inputs to prevent injection
- Validate file uploads (type, size, content)
- Validate webhook signatures to prevent spoofing

### Data Protection

Protect sensitive data:
- Store webhook secret keys encrypted
- Never expose secret keys in API responses (except on creation)
- Use HTTPS for all API calls
- Implement CORS policies

## Deployment Considerations

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_BASE_URL`: Base URL for callback URLs
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)

### Database Migrations

New tables to create:
1. `stitch_function_registry`
2. `stitch_schedules`

Ensure migrations are run before deploying UI changes.

### Feature Flags

Consider feature flags for phased rollout:
- Phase 1: Canvas creation, node configuration, entity import, run management
- Phase 2: Function registry, schedules, webhooks
- Phase 3: Metrics and dashboards

### Monitoring

Implement monitoring for:
- API endpoint response times
- Error rates by endpoint
- Database query performance
- Real-time subscription health
- Webhook processing success rates

## Future Enhancements

### Phase 4 Features (Post-MVP)

1. **Collaborative Editing**: Multiple users editing same canvas
2. **Version Control**: Git-like versioning with diffs and merges
3. **Canvas Templates Marketplace**: Share and download templates
4. **Advanced Analytics**: Cohort analysis, A/B testing
5. **Mobile App**: Native mobile app for monitoring
6. **AI Assistant**: Natural language canvas creation
7. **Custom Node Types**: User-defined node types
8. **Workflow Marketplace**: Share and sell workflows

### Technical Debt to Address

1. **Type Safety**: Improve TypeScript types for graph structures
2. **Test Coverage**: Increase unit test coverage to 90%
3. **Documentation**: Add JSDoc comments to all components
4. **Accessibility**: Improve keyboard navigation and screen reader support
5. **Performance**: Optimize large canvas rendering (1000+ nodes)

## Conclusion

This design provides a comprehensive blueprint for transforming Stitch into a fully visual workflow management platform. By building on the existing architecture and following the phased approach, we can deliver value incrementally while maintaining system stability and code quality.

The design prioritizes user experience through consistent UI patterns, comprehensive error handling, and real-time feedback. The property-based testing strategy ensures correctness across all inputs, while the integration tests verify end-to-end workflows.

The next step is to create the implementation task list, breaking down this design into discrete, manageable coding tasks that can be executed incrementally.
