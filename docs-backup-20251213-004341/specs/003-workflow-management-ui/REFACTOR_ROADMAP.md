# Workflow Management UI - Refactor Roadmap

**Created:** 2025-12-09
**Status:** PLANNING
**Goal:** Transform 193 files of partial code into working, integrated features

---

## Philosophy

**One feature at a time. Make it work. Make it accessible. Move on.**

- No task is "done" until users can access and use it
- Integration is part of implementation, not a separate step
- Test manually as you go (can I click this button?)
- Skip automated tests until dedicated testing phase

---

## Current State Assessment

### What Actually Works ✅
1. **Canvas Creation Modal** - Users can create new canvases
2. **Canvas List Page** - Users can see their canvases
3. **Basic Canvas Display** - Canvas page loads (but may be broken)

### What's Partially Built ⚠️
- API endpoints exist but may not be called
- Components exist but aren't imported/rendered
- Modals exist but no buttons to open them
- Panels exist but aren't integrated into pages

### What's Just Documentation ❌
- Design system files (not used anywhere)
- Performance utilities (not applied anywhere)
- Error handling components (not integrated)
- Security utilities (not applied to routes)

---

## Critical Architecture Notes

### API Endpoints (Verified to Exist)
- ✅ **Run Start:** `POST /api/flows/{flowId}/run` - Use this everywhere
- ✅ **Entities CRUD:** `/api/entities` and `/api/entities/[entityId]` - Already exist
- ✅ **Canvas Nodes:** `/api/canvas/[id]/nodes` and `/api/canvas/[id]/nodes/[nodeId]`
- ✅ **Canvas Edges:** `/api/canvas/[id]/edges` and `/api/canvas/[id]/edges/[edgeId]`
- ✅ **Function Registry:** `/api/function-registry` - For user-provided webhooks only
- ✅ **Schedules:** `/api/schedules` - Needs `stitch_schedules` table first
- ✅ **Webhook Configs:** `/api/webhook-configs` - Uses `stitch_webhook_configs`
- ✅ **Email Reply Configs:** `/api/email-reply-configs`
- ✅ **Airtable Sync:** `/api/integrations/airtable/sync`

### Key Principles

**M-Shape Architecture (CRITICAL):**
1. **UX Spine:** Entities travel ONLY on the horizontal UX spine (UX node → UX node)
2. **System Paths:** Workflows execute vertically "under" each UX node (invisible to entities)
3. **Entity Position:** `current_node_id` is always a UX node, never a Worker node
4. **Trigger Model:** Entity arrives at UX node → System path fires → Completes → Entity moves to next UX node

**Technical Principles:**
1. **Run Start:** Always use `POST /api/flows/{flowId}/run` (never /api/canvas/[id]/run)
2. **Entity Reads:** Use existing `useCanvasEntities` hook to avoid double-fetch
3. **Function Registry:** Only for user-provided webhooks; built-in workers stay code-registered
4. **Webhook Configs:** Reuse `stitch_webhook_configs` table; signature validation ON by default
5. **Schedules:** Requires `stitch_schedules` table with RLS policies and indexes
6. **Email Replies:** Guard to pick correct active run (most recent in `waiting_for_user` status)
7. **Airtable:** Validate email field early; handle CORS/auth properly
8. **Real-time:** Use Supabase real-time or reasonable polling intervals (not too aggressive)

---

## Refactor Strategy

### Phase 0: Stabilize Foundation (3-4 hours)
**Goal:** Make sure the app doesn't crash and verify what exists

1. Run `npm run build` to catch broken imports
2. Verify canvas list page works
3. Verify canvas detail page loads (even if empty)
4. Remove any broken imports
5. Verify API routes exist (nodes, edges, entities)
6. Check if `stitch_schedules` table exists (needed for Phase 4)

### Phase 1: Core Canvas View (1 week)
**Goal:** Users can view and edit workflow canvases

**Milestone 1.1: Canvas Display Works** (4 hours)
- Fix WorkflowCanvas component to render properly
- Ensure nodes display correctly
- Ensure edges display correctly
- Test: User can navigate to canvas and see the workflow

**Milestone 1.2: Node Palette Integration** (3 hours)
- Import NodePalette into WorkflowCanvas
- Add button/toggle to show/hide palette
- Wire up drag-and-drop to add nodes
- Test: User can drag node from palette onto canvas

**Milestone 1.3: Node Configuration** (4 hours)
- Import NodeConfigPanel into WorkflowCanvas
- Show panel when node is selected
- Wire up config changes to update node data
- Add auto-save to persist changes to database
- Test: User can click node, edit config, see changes persist

**Milestone 1.4: Edge Creation** (3 hours)
- Enable edge handles in WorkflowCanvas
- Wire up onConnect to save edges to database
- Add edge deletion (select + delete key)
- Test: User can connect nodes and delete edges

### Phase 2: Contact Management (Proto-CRM) ✅ COMPLETED
**Goal:** Create proto-CRM for storing contacts that can be used to seed workflows
**Spec:** [004-contact-management](./../004-contact-management/README.md)
**Status:** 100% Complete (15/15 tasks)

**Key Insight:** Originally planned as "Entity Management" but pivoted to "Contact Management" after realizing the distinction:
- **Contacts** = People in your database (proto-CRM) - can be imported
- **Entities** = Contacts that have entered a workflow - created when workflows run

**What Was Built:**
- ✅ **Contact Database**: `stitch_contacts` table (user-scoped, not per-canvas)
- ✅ **Full CRUD Operations**: Create, read, update, delete contacts
- ✅ **Reusable Component**: ContactManager component (can be embedded anywhere)
- ✅ **Manual Import**: Add individual contacts via form
- ✅ **CSV Import**: Bulk import from CSV files with preview and progress
- ✅ **Airtable Sync**: Multi-step wizard for syncing from Airtable bases
- ✅ **Contact Editing**: Edit existing contact information
- ✅ **Contact Deletion**: Delete contacts with confirmation dialog
- ✅ **Error Handling**: Comprehensive error states and user feedback
- ✅ **Demo Pages**: Testing pages for all functionality

**Architecture Decision:** ContactManager is a standalone reusable component, NOT integrated into canvas page. This allows it to be embedded in node configuration panels when implementing specific node types.

**Integration Point:** ContactManager will be embedded in node config panels (e.g., "Send Email" node) where users select contacts for that workflow step.

**Known Issues:** See [KNOWN_ISSUES.md](./../004-contact-management/KNOWN_ISSUES.md) - 18 identified gaps including Airtable credential storage, entity-contact relationship, and pagination.

### Phase 3: M-Shape Architecture & Entity Journey (1 week) - CORRECTED
**Goal:** Wire up the M-Shape architecture where entities travel the BMC while system paths execute underneath

**CRITICAL ARCHITECTURE:**

**The M-Shape Model:**
```
BMC (horizontal UX spine - what entity experiences):
┌─────────┐         ┌─────────────────┐         ┌────────────┐
│  Form   │────────→│ Confirmation    │────────→│ Demo Event │
└────┬────┘         └────────┬────────┘         └────────────┘
     │                       │
     │ (drill-down)          │
     ↓                       ↓
   [CRM]                  [none]
     ↓
 [Calendar]
     ↓
  [Invite]
```

**Key Principles:**
1. **BMC IS the entity journey** - No separate view needed
2. **Entities travel UX nodes on BMC** - horizontal movement
3. **Drill-down shows system paths** - click UX node to see workflow underneath
4. **Entity moves when system path completes** - automatic progression

**What Already Exists:**
- ✅ `canvas_type: 'bmc' | 'workflow' | 'detail'` - Canvas types defined
- ✅ `EntityDot`, `TravelingEntitiesLayer`, `EntityOverlay` - Entity display components
- ✅ `parent_id` on flows - Drill-down relationship
- ✅ `current_node_id` on entities - Position tracking
- ⚠️ May need wiring/integration

**Milestone 3.1: Verify Entity Display on BMC** (2 hours)
- Verify `EntityOverlay` renders entities on BMC canvas
- Verify entities appear at their `current_node_id` position
- Fix any broken wiring if entities don't display
- Test: Entities visible on BMC at correct UX nodes

**Milestone 3.2: Verify Drill-Down Navigation** (3 hours)
- Verify clicking UX node navigates to child workflow canvas
- Verify `parent_id` relationship is set correctly
- Verify "back" navigation returns to BMC
- Fix any broken drill-down navigation
- Test: Click UX node → see system path → click back → return to BMC

**Milestone 3.3: Entity Seeding** (4 hours)
- Add "Add to Journey" button on BMC
- Embed ContactManager for contact selection
- Create entities with `current_node_id` = first UX node
- Trigger system path under first UX node
- Test: Add contacts → entities appear at first UX node

**Milestone 3.4: Journey Progression Logic** (5 hours)
- When system path (child workflow) completes:
  1. Find next UX node on BMC (follow UX edge)
  2. Update entity's `current_node_id` to next UX node
  3. Trigger system path under new UX node
- Handle end of journey (no next UX node)
- Test: System path completes → entity moves to next UX node

**Milestone 3.5: Entity Panel** (3 hours)
- Wire up existing EntityListPanel or create EntityPanel
- Show all entities with current UX node position
- Show journey progress (nodes visited)
- Show status: "at [Node]" or "processing"
- Test: Panel shows entity positions and status

**Milestone 3.6: Real-time Updates** (3 hours)
- Verify Supabase real-time subscription for entity position changes
- Show processing indicator on UX node when system path running
- Show error indicator if system path fails
- Test: Entity movement updates in real-time

**Database Implications:**
- `stitch_entities.current_node_id` = UX node ID (not any node)
- Need to distinguish UX edges (journey) from system edges (workflow)
- Runs are tied to UX nodes, not to entities directly

**Key Changes from Previous (Wrong) Plan:**
- ❌ OLD: "Entities enter workflows"
- ✅ NEW: "Entities travel UX spine, workflows execute underneath"
- ❌ OLD: "Start run for entity"
- ✅ NEW: "Entity arrives at UX node, system path triggers"
- ❌ OLD: "Entity position = any node in workflow"
- ✅ NEW: "Entity position = UX node on spine only"

### Phase 4: Settings Pages (1 week)
**Goal:** Users can configure webhooks, functions, schedules

**PREREQUISITES:**
- Verify `stitch_schedules` table exists (if not, create migration first)
- Verify `stitch_webhook_configs` table has `require_signature` column
- Verify `stitch_function_registry` table exists

**Milestone 4.1: Function Registry Page** (5 hours)
**Note:** Function registry is for USER-PROVIDED webhooks only. Built-in workers stay code-registered.
- Fix /settings/functions page to display function list
- Wire up AddFunctionModal to "Add Function" button
- Wire up EditFunctionModal to edit buttons
- Wire up TestFunctionModal to test buttons
- Connect all modals to API endpoints
- Test: User can add, edit, test functions

**Milestone 4.2: Webhook Configuration Page** (5 hours)
**Note:** Reuses `stitch_webhook_configs` table. Signature validation ON by default.

- Fix /settings/webhooks page to display webhook list
- Wire up AddWebhookModal to "Add Webhook" button
- Wire up EditWebhookModal to edit buttons
- Generate and display webhook URLs (show once, then hide)
- Display secret key (show once on creation, then hide)
- Ensure `require_signature` defaults to true
- Show webhook logs from `stitch_webhook_events` table
- Test: User can configure webhooks with signature validation

**Milestone 4.3: Email Reply Webhooks** (4 hours)
**Note:** Must handle picking correct active run/UX node. Log unmatched replies without erroring.

- Fix /settings/webhooks/email-replies page
- Add provider selector (SendGrid, Postmark, etc.)
- Add intent keywords configuration
- Wire up to save email reply config via `POST /api/email-reply-configs`
- Ensure processor picks correct run: most recent in `waiting_for_user` status for that node
- Add logging for unmatched replies (don't error, just log)
- Test: User can configure email reply handling
- Test: Multiple active runs scenario (ensure correct run is picked)

**Milestone 4.4: Schedule Management Page** (5 hours)
**Note:** Requires `stitch_schedules` table with RLS policies and indexes. Trigger.dev must read from this table.

**Prerequisites:**
- Create `stitch_schedules` table if it doesn't exist
- Add columns: canvas_id, cron_expression, enabled, last_run_at, next_run_at, last_run_status
- Add RLS policies for user access
- Add index on canvas_id
- Ensure Trigger.dev job reads from this table

**Actions:**
- Fix /settings/schedules page to display schedule list
- Wire up AddScheduleModal to "Add Schedule" button
- Wire up EditScheduleModal to edit buttons
- Add cron expression builder/validator
- Add enable/disable toggle
- Display last_run_at, next_run_at, last_run_status
- Ensure schedules call `POST /api/flows/{flowId}/run` (not a different endpoint)
- Test: User can create and manage schedules
- Test: Trigger.dev picks up schedule changes

### Phase 5: Observability (3-4 days)
**Goal:** Users can debug and monitor workflows

**Milestone 5.1: Node Output Viewer** (3 hours)
- Integrate NodeOutputPanel into RunViewer
- Add click handler to nodes to show outputs
- Wire up to fetch node execution data
- Add copy button for outputs
- Test: User can click node in run and see output

**Milestone 5.2: Journey Timeline** (4 hours)
- Create entity detail view/modal
- Integrate JourneyTimelinePanel
- Wire up to fetch journey events
- Add click to highlight nodes
- Test: User can view entity journey

**Milestone 5.3: Dashboard** (4 hours)
- Fix /canvas/[id]/dashboard page
- Wire up charts to real data
- Calculate conversion rates
- Add export functionality
- Add navigation link to dashboard
- Test: User can view workflow metrics

### Phase 6: Polish (3-4 days)
**Goal:** Consistent UI and better UX

**Milestone 6.1: Apply Design System** (1 day)
- Refactor EntityListPanel to use SidePanel components
- Refactor settings pages to use Panel components
- Remove hardcoded colors, use CSS variables
- Ensure consistent spacing/styling

**Milestone 6.2: Add Error Handling** (1 day)
- Add error states to all data-fetching components
- Add loading states to all async operations
- Add empty states to all lists
- Add toast notifications for user actions

**Milestone 6.3: Apply Performance Optimizations** (1 day)
- Add debouncing to search inputs
- Add virtual scrolling to long entity lists
- Add optimistic updates to common actions
- Add pagination where needed

### Phase 7: Security & Testing (1 week)
**Goal:** Secure and verified

**Milestone 7.1: Apply Security** (2 days)
- Add auth middleware to all API routes
- Add input sanitization to all endpoints
- Add webhook signature validation
- Verify RLS policies
- Encrypt sensitive data

**Milestone 7.2: Integration Testing** (2 days)
- Test all user workflows end-to-end
- Test error cases
- Test edge cases
- Document bugs found

**Milestone 7.3: Fix Bugs** (2 days)
- Fix all critical bugs
- Fix all high-priority bugs
- Document remaining known issues

---

## Detailed Task Breakdown

### Phase 0: Stabilize Foundation

#### Task 0.1: Verify Canvas List (1 hour)
**Files to check:**
- `src/app/canvases/page.tsx`
- `src/app/canvases/CanvasListClient.tsx`
- `src/components/canvas/CanvasCreationModal.tsx`

**Actions:**
1. Navigate to /canvases
2. Verify page loads without errors
3. Verify canvases display
4. Verify "Create Canvas" button works
5. Fix any broken imports or errors

**Done when:** User can view canvas list and create new canvas

---

#### Task 0.2: Verify Canvas Detail Page (1 hour)
**Files to check:**
- `src/app/canvas/[id]/page.tsx`
- `src/components/canvas/WorkflowCanvas.tsx`

**Actions:**
1. Navigate to /canvas/[id]
2. Verify page loads (even if canvas is empty)
3. Fix any critical errors that prevent page load
4. Don't worry about functionality yet, just make it load

**Done when:** User can navigate to canvas detail page without crashes

---

#### Task 0.3: Run Build and Fix Errors (1 hour)
**Actions:**
1. Run `npm run build`
2. Fix any TypeScript errors
3. Fix any import errors
4. Fix any missing dependencies
5. Run build again until it succeeds
6. Document any warnings (don't need to fix, just note them)

**Done when:** `npm run build` completes successfully

---

#### Task 0.4: Verify API Routes Exist (30 min)
**Files to check:**
- `src/app/api/canvas/[id]/nodes/route.ts`
- `src/app/api/canvas/[id]/edges/route.ts`
- `src/app/api/entities/route.ts`
- `src/app/api/flows/[id]/run/route.ts`

**Actions:**
1. Verify all routes exist
2. Read each route to understand what it does
3. Note any missing routes that need to be created
4. Check if routes have proper error handling

**Done when:** All required API routes verified to exist

---

#### Task 0.5: Check Database Tables (30 min)
**Tables to verify:**
- `stitch_entities` (should have `company` column from migration 019)
- `stitch_webhook_configs` (should have `require_signature` column)
- `stitch_schedules` (may not exist yet - needed for Phase 4)
- `stitch_runs` (for run status tracking)

**Actions:**
1. Check Supabase dashboard or run SQL queries
2. Verify required columns exist
3. Note if `stitch_schedules` table needs to be created
4. Verify RLS policies are in place

**Done when:** Database schema verified and documented

---

### Phase 1: Core Canvas View

#### Task 1.1: Fix Canvas Display (4 hours)
**Files to modify:**
- `src/components/canvas/WorkflowCanvas.tsx`
- `src/app/canvas/[id]/page.tsx`

**Current issues:**
- Canvas may not be rendering nodes/edges correctly
- React Flow may not be configured properly
- Data fetching may be broken

**Actions:**
1. Read current WorkflowCanvas.tsx implementation
2. Verify React Flow is set up correctly
3. Verify nodes and edges are being fetched from database
4. Verify nodes and edges are being passed to React Flow
5. Test: Navigate to canvas with existing workflow
6. Verify nodes display in correct positions
7. Verify edges connect nodes correctly

**Integration checklist:**
- [ ] WorkflowCanvas imported in canvas/[id]/page.tsx
- [ ] Canvas fetches flow data from database
- [ ] Nodes render on canvas
- [ ] Edges render on canvas
- [ ] Canvas is interactive (can pan/zoom)

**Done when:** User can view existing workflow with nodes and edges displayed correctly

---

#### Task 1.2: Integrate Node Palette (3 hours)
**Files to modify:**
- `src/components/canvas/WorkflowCanvas.tsx`
- `src/components/canvas/NodePalette.tsx`

**Current state:**
- NodePalette component exists
- Not imported or rendered anywhere
- API route exists: `POST /api/canvas/[id]/nodes`

**Actions:**
1. Import NodePalette into WorkflowCanvas
2. Add state to show/hide palette (useState)
3. Add button to toggle palette visibility
4. Position palette on left or right side
5. Wire up onDragEnd to add node to canvas
6. Save new node via `POST /api/canvas/[id]/nodes`
7. Update local React Flow state after successful save
8. Test: User can drag node from palette onto canvas
9. Verify node appears on canvas
10. Verify node is saved to database (refresh page, node still there)
11. Run `npm run build` to verify no errors

**Integration checklist:**
- [ ] NodePalette imported in WorkflowCanvas
- [ ] Toggle button added to show/hide palette
- [ ] Drag and drop works
- [ ] POST /api/canvas/[id]/nodes called with correct data
- [ ] New nodes saved to database
- [ ] New nodes persist after refresh
- [ ] Build succeeds

**Done when:** User can drag nodes from palette onto canvas and they persist

---

#### Task 1.3: Integrate Node Configuration (4 hours)
**Files to modify:**
- `src/components/canvas/WorkflowCanvas.tsx`
- `src/components/panels/NodeConfigPanel.tsx`

**Current state:**
- NodeConfigPanel component exists
- Not imported or rendered anywhere
- Config changes don't persist

**Actions:**
1. Import NodeConfigPanel into WorkflowCanvas
2. Add state for selected node (useState)
3. Show panel when node is clicked (onNodeClick)
4. Pass selected node data to panel
5. Wire up config changes to update node data
6. Implement auto-save: debounce config changes
7. Save to database via PATCH /api/canvas/[id]/nodes/[nodeId]
8. Test: Click node, edit config, verify changes save
9. Refresh page, verify config persisted

**Integration checklist:**
- [ ] NodeConfigPanel imported in WorkflowCanvas
- [ ] Panel shows when node is selected
- [ ] Config form displays current node data
- [ ] Config changes update node data
- [ ] Changes auto-save to database
- [ ] Changes persist after refresh

**Done when:** User can click node, edit configuration, and changes persist

---

#### Task 1.4: Enable Edge Creation (3 hours)
**Files to modify:**
- `src/components/canvas/WorkflowCanvas.tsx`

**Current state:**
- Edge API endpoints exist
- Edge handles not enabled in React Flow
- No auto-save for edges

**Actions:**
1. Enable connection handles in React Flow config
2. Add onConnect handler
3. Save new edge to database via POST /api/canvas/[id]/edges
4. Add onEdgesDelete handler
5. Delete edge from database via DELETE /api/canvas/[id]/edges/[edgeId]
6. Test: Connect two nodes
7. Verify edge appears
8. Verify edge saved to database (refresh, edge still there)
9. Test: Select edge and press Delete
10. Verify edge removed from canvas and database

**Integration checklist:**
- [ ] Connection handles visible on nodes
- [ ] Can drag from one node to another
- [ ] Edge appears when connection made
- [ ] Edge saved to database
- [ ] Can delete edges
- [ ] Edge deletion persisted to database

**Done when:** User can connect nodes with edges and delete edges

---

### Phase 2: Entity Management

#### Task 2.1: Create and Integrate Entity List Panel (4 hours)
**Files to create/modify:**
- `src/components/ui/LeftSidePanel.tsx` (create)
- `src/app/canvas/[id]/page.tsx`
- `src/components/canvas/entities/EntityListPanel.tsx`

**Current state:**
- EntityListPanel exists but not integrated
- No consistent left panel component
- `useCanvasEntities` hook exists - REUSE IT (don't create new fetch logic)

**Actions:**
1. Create LeftSidePanel component (similar to existing panels)
2. Import EntityListPanel into canvas page
3. Wrap EntityListPanel in LeftSidePanel
4. Position on left side of canvas (absolute positioning)
5. Verify EntityListPanel uses `useCanvasEntities` hook (don't duplicate fetch logic)
6. Test: Navigate to canvas
7. Verify entity panel appears on left
8. Verify entities display (if any exist)
9. Run `npm run build` to verify no errors

**Integration checklist:**
- [ ] LeftSidePanel component created
- [ ] EntityListPanel imported in canvas page
- [ ] Panel positioned on left side
- [ ] Panel uses useCanvasEntities hook (no duplicate fetching)
- [ ] Entities display in list
- [ ] Panel is collapsible/expandable
- [ ] Build succeeds

**Done when:** User sees entity list panel on left side of canvas

---

#### Task 2.2: Add Entity Import Button (2 hours)
**Files to modify:**
- `src/components/canvas/entities/EntityListPanel.tsx`
- `src/components/canvas/entities/EntityImportModal.tsx`

**Current state:**
- EntityImportModal exists
- No button to open it

**Actions:**
1. Add state for modal open/closed in EntityListPanel
2. Add "Import Entities" button to panel header
3. Wire button onClick to open modal
4. Import EntityImportModal into EntityListPanel
5. Pass modal state and handlers to modal
6. Test: Click "Import Entities" button
7. Verify modal opens
8. Test: Close modal (X button, cancel, outside click)
9. Verify modal closes

**Integration checklist:**
- [ ] "Import Entities" button added to panel
- [ ] Button opens EntityImportModal
- [ ] Modal can be closed
- [ ] Modal state managed properly

**Done when:** User can click button and import modal opens

---

#### Task 2.3: Wire Up Manual Entity Import (3 hours)
**Files to modify:**
- `src/components/canvas/entities/EntityImportModal.tsx`
- `src/components/canvas/entities/EntityListPanel.tsx`

**Current state:**
- Manual entry form exists in modal
- Not wired up to API
- API route exists: `POST /api/entities`
- Doesn't update entity list after import

**Actions:**
1. Wire up form submission in EntityImportModal
2. Validate required fields (email, name) before submission
3. Call `POST /api/entities` with form data including canvas_id
4. Handle success: close modal, show success message
5. Handle error: show error message
6. Refresh entity list after successful import (trigger useCanvasEntities refetch)
7. Test: Fill out manual entry form
8. Submit form
9. Verify entity appears in list
10. Verify entity saved to database
11. Run `npm run build` to verify no errors

**Integration checklist:**
- [ ] Form validation works (email required)
- [ ] Form submission calls POST /api/entities
- [ ] Success closes modal
- [ ] Entity list refreshes (useCanvasEntities refetch)
- [ ] New entity appears in list
- [ ] Error handling works
- [ ] Build succeeds

**Done when:** User can manually add entity and see it appear in list

---

#### Task 2.4: Wire Up CSV Import (4 hours)
**Files to modify:**
- `src/components/canvas/entities/EntityImportModal.tsx`

**Current state:**
- CSV upload UI exists
- CSV parsing logic exists
- Not fully wired up

**Actions:**
1. Wire up file upload handler
2. Parse CSV file
3. Validate required fields (email, name)
4. Show preview of entities to import
5. Add "Import" button to confirm
6. Batch create entities via POST /api/entities
7. Show progress indicator
8. Show results (success count, errors)
9. Refresh entity list after import
10. Test: Upload valid CSV
11. Verify preview shows
12. Confirm import
13. Verify entities appear in list

**Integration checklist:**
- [ ] File upload works
- [ ] CSV parsing works
- [ ] Validation works
- [ ] Preview displays
- [ ] Batch import works
- [ ] Progress shown
- [ ] Results shown
- [ ] Entity list refreshes

**Done when:** User can upload CSV and see entities imported

---

#### Task 2.5: Wire Up Airtable Import (4 hours)
**Files to modify:**
- `src/components/canvas/entities/EntityImportModal.tsx`
- `src/app/api/integrations/airtable/sync/route.ts`

**Current state:**
- Airtable form exists in modal
- API endpoint exists: `POST /api/integrations/airtable/sync`
- Not fully wired up

**Actions:**
1. Verify Airtable API route handles CORS/auth properly
2. Ensure route validates email field early (reject records without email)
3. Wire up Airtable form submission in modal
4. Call `POST /api/integrations/airtable/sync` with credentials and mapping
5. Show sync progress indicator
6. Handle success: show count of synced entities
7. Handle errors: show specific error messages
8. Refresh entity list after sync (trigger useCanvasEntities refetch)
9. Test: Enter Airtable credentials
10. Submit form
11. Verify sync happens
12. Verify entities appear in list
13. Test error case: missing email field
14. Run `npm run build` to verify no errors

**Integration checklist:**
- [ ] API route validates email field early
- [ ] API route handles CORS/auth
- [ ] Form submission works
- [ ] API call works
- [ ] Progress shown
- [ ] Success shows entity count
- [ ] Errors handled gracefully
- [ ] Entity list refreshes
- [ ] Build succeeds

**Done when:** User can sync entities from Airtable with proper error handling

---

### Phase 3: M-Shape Architecture & Entity Journey

#### Task 3.1: Verify Entity Display on BMC (2 hours)
**Goal:** Confirm entities display correctly on BMC canvas

**Files to check:**
- `src/components/canvas/entities/EntityOverlay.tsx`
- `src/components/canvas/entities/TravelingEntitiesLayer.tsx`
- `src/components/canvas/entities/EntityDot.tsx`

**Actions:**
1. Navigate to a BMC canvas with entities
2. Verify EntityOverlay is rendered on the canvas
3. Verify entities appear at their `current_node_id` positions
4. If not working, trace the data flow and fix wiring
5. Test: Entities visible on BMC at correct UX nodes

**Integration checklist:**
- [ ] EntityOverlay renders on BMC canvas
- [ ] Entities appear at correct node positions
- [ ] Entity count badges show on nodes with multiple entities

**Done when:** Entities are visible on BMC at their current UX node positions

---

#### Task 3.2: Verify Drill-Down Navigation (3 hours)
**Goal:** Confirm drill-down from BMC to system paths works

**Files to check:**
- `src/app/canvas/[id]/page.tsx`
- `src/lib/db/flows.ts` (parent_id relationship)
- Navigation components

**Actions:**
1. Create a BMC canvas with a UX node that has a child workflow
2. Click the UX node - should navigate to child workflow
3. Verify child workflow displays (system path)
4. Click "back" - should return to BMC
5. If not working, implement drill-down navigation
6. Test: Full drill-down and drill-up cycle works

**Integration checklist:**
- [ ] Click UX node navigates to child workflow
- [ ] Child workflow (system path) displays correctly
- [ ] Back navigation returns to BMC
- [ ] URL reflects current canvas context

**Done when:** User can drill into UX nodes and back to BMC

---

#### Task 3.3: Entity Seeding (4 hours)
**Goal:** Add contacts to journey at first UX node

**Files to modify:**
- `src/app/canvas/[id]/page.tsx` or BMC component
- Create `AddToJourneyModal.tsx` if needed

**Actions:**
1. Add "Add to Journey" button on BMC canvas
2. Open modal with ContactManager in selection mode
3. On confirm: create entities with `current_node_id` = first UX node
4. Trigger system path under first UX node (if exists)
5. Refresh entity display
6. Test: Add contacts → entities appear at first UX node

**Integration checklist:**
- [ ] "Add to Journey" button visible on BMC
- [ ] Contact selection modal works
- [ ] Entities created at first UX node
- [ ] System path triggers automatically

**Done when:** User can add contacts to journey, they appear at first UX node

---

#### Task 3.4: Journey Progression Logic (5 hours)
**Goal:** Entities move to next UX node when system path completes

**Files to modify:**
- `src/lib/engine/edge-walker.ts` or callback handler
- `src/app/api/stitch/callback/route.ts`

**Actions:**
1. When system path (child workflow) completes:
   - Detect completion (all nodes done or terminal node reached)
   - Find parent BMC canvas via `parent_id`
   - Find current UX node (the one that triggered this workflow)
   - Find next UX node (follow UX edge from current)
   - Update entity's `current_node_id` to next UX node
   - Log journey event
   - Trigger next system path (if exists)
2. Handle end of journey (no next UX node)
3. Test: System path completes → entity moves to next UX node

**Integration checklist:**
- [ ] System path completion detected
- [ ] Next UX node found via edge traversal
- [ ] Entity position updated
- [ ] Journey event logged
- [ ] Next system path triggered

**Done when:** Entities automatically progress through BMC as system paths complete

---

#### Task 3.5: Entity Panel (3 hours)
**Goal:** Show entity list with positions and status

**Files to modify:**
- `src/components/canvas/entities/EntityListPanel.tsx` (or create new)
- `src/app/canvas/[id]/page.tsx`

**Actions:**
1. Wire up EntityListPanel to BMC canvas page
2. Show all entities with current UX node name
3. Show journey progress (nodes visited from journey_events)
4. Show status: "at [Node]" or "processing" (if system path running)
5. Test: Panel shows accurate entity information

**Integration checklist:**
- [ ] Entity panel visible on BMC canvas
- [ ] Shows current position for each entity
- [ ] Shows journey history
- [ ] Shows processing status

**Done when:** User can see entity list with positions and status

---

#### Task 3.6: Real-time Updates (3 hours)
**Goal:** Entity positions update in real-time

**Files to check/modify:**
- `src/hooks/useCanvasEntities.ts` or similar
- Supabase real-time subscription setup

**Actions:**
1. Verify Supabase real-time subscription for `stitch_entities` changes
2. When entity position changes, UI should update automatically
3. Add processing indicator on UX node when system path is running
4. Add error indicator if system path fails
5. Test: Entity movement reflects in real-time without refresh

**Integration checklist:**
- [ ] Real-time subscription active
- [ ] Entity position changes reflect immediately
- [ ] Processing indicator shows during system path execution
- [ ] Error indicator shows on failure

**Done when:** Entity journey updates in real-time on BMC
- [ ] Shows processing status when system path running
- [ ] Integrated into canvas page

**Done when:** User can see entity journey progress on UX spine

---

#### Task 3.4: System Path Drill-Down (5 hours)
**Goal:** Admin can click UX node to see the workflow underneath

**Files to create/modify:**
- `src/components/canvas/SystemPathView.tsx` (create)
- `src/components/canvas/UXSpineView.tsx` (modify)

**Actions:**
1. Add click handler on UX nodes in UXSpineView
2. Create SystemPathView component
3. When UX node clicked, show the system path (workflow) underneath
4. Filter to show only nodes/edges connected to that UX node's system path
5. Show run status if entity triggered this system path
6. Show Worker execution details (inputs, outputs, status)
7. Add "back to spine" navigation
8. Test: Click UX node → see system workflow
9. Test: See run status for active system path

**Integration checklist:**
- [ ] Click UX node opens system path view
- [ ] System path shows Worker nodes
- [ ] Run status displayed
- [ ] Worker details accessible
- [ ] Navigation back to spine works

**Done when:** Admin can drill down from UX node to see system workflow

---

#### Task 3.5: Entity Seeding to UX Spine (4 hours)
**Goal:** Add contacts as entities at the first UX node

**Files to modify:**
- `src/components/canvas/EntityJourneyPanel.tsx`
- `src/components/canvas/AddToJourneyModal.tsx` (create)

**Actions:**
1. Add "Add to Journey" button in EntityJourneyPanel
2. Create AddToJourneyModal (embeds ContactManager)
3. Select contacts to add
4. Identify first UX node on spine (entry point)
5. Create entities with `current_node_id` = first UX node
6. This triggers the system path under that UX node
7. Test: Add contacts → entities appear at first UX node
8. Test: System path starts executing

**Integration checklist:**
- [ ] "Add to Journey" button works
- [ ] Contact selection works
- [ ] Entities created at first UX node
- [ ] System path triggers automatically

**Done when:** User can add contacts to journey, they appear at first UX node

---

#### Task 3.6: Journey Progression Logic (5 hours)
**Goal:** Entities move to next UX node when system path completes

**Files to modify:**
- `src/lib/engine/edge-walker.ts` (or equivalent)
- `src/app/api/stitch/callback/route.ts`

**Actions:**
1. When system path completes (all workers done)
2. Find the next UX node on the spine
3. Update entity's `current_node_id` to next UX node
4. Log journey event (node_arrival)
5. Trigger next system path automatically
6. Handle end of journey (no next UX node)
7. Test: System path completes → entity moves to next UX node
8. Test: Journey continues automatically
9. Test: End of journey handled correctly

**Integration checklist:**
- [ ] System path completion detected
- [ ] Entity moves to next UX node
- [ ] Journey event logged
- [ ] Next system path triggers
- [ ] End of journey handled

**Done when:** Entities automatically progress through UX spine as system paths complete

---

#### Task 3.7: Journey Monitoring (3 hours)
**Goal:** Real-time visibility of entity journey

**Files to modify:**
- `src/components/canvas/EntityJourneyPanel.tsx`
- `src/components/canvas/UXSpineView.tsx`

**Actions:**
1. Add real-time subscription for entity position changes
2. Animate entity movement on UX spine
3. Show "processing" indicator when system path running
4. Show error state if system path fails
5. Add retry button for failed system paths
6. Test: Entity moves in real-time
7. Test: Processing state shows
8. Test: Error handling works

**Integration checklist:**
- [ ] Real-time entity position updates
- [ ] Movement animation on spine
- [ ] Processing indicator shows
- [ ] Error state displays
- [ ] Retry functionality works

**Done when:** User can monitor entity journey in real-time

---

## Continue with Phases 4-7...

[I'll continue with detailed breakdowns for remaining phases if you want, but this gives you the pattern]

---

## Success Criteria

### For Each Task
- [ ] Code written
- [ ] Code integrated (imported and rendered)
- [ ] Feature accessible (user can navigate to it)
- [ ] Feature works (user can complete workflow)
- [ ] Manual testing done (verified it works)
- [ ] Task summary written

### For Each Phase
- [ ] All tasks in phase complete
- [ ] All features in phase accessible
- [ ] All features in phase tested
- [ ] Phase demo-able to stakeholders

### For Overall Project
- [ ] All core features work end-to-end
- [ ] Users can create workflows
- [ ] Users can import entities
- [ ] Users can run workflows
- [ ] Users can monitor results
- [ ] App is stable (no crashes)
- [ ] Ready for production use

---

## Build Verification

**CRITICAL:** Run `npm run build` after completing each phase to catch broken imports early.

- [ ] After Phase 0: Build succeeds
- [ ] After Phase 1: Build succeeds
- [x] **After Phase 2: Build succeeds** ✅ (Contact Management complete)
- [ ] After Phase 3: Build succeeds
- [ ] After Phase 4: Build succeeds
- [ ] After Phase 5: Build succeeds
- [ ] After Phase 6: Build succeeds
- [ ] After Phase 7: Build succeeds

If build fails, fix immediately before continuing to next phase.

## Progress Summary

### ✅ Completed Phases
- **Phase 2: Contact Management** - 100% complete with comprehensive proto-CRM functionality

### 🔄 Current Status
- Ready to begin Phase 3: Run Management
- Need to address Phase 2 known issues (especially entity-contact relationship)
- ContactManager component ready for integration into node configuration panels

### 📋 Next Priorities
1. **Fix Critical Issues**: Add contact_id FK to stitch_entities table
2. **Begin Phase 3**: Entity list panel and workflow seeding
3. **Node Integration**: Embed ContactManager in node config panels (future phases)

---

## Daily Progress Tracking

### Day 1: Foundation
- [ ] Task 0.1: Canvas list works
- [ ] Task 0.2: Canvas detail loads
- [ ] Task 0.3: Build succeeds
- [ ] Task 0.4: API routes verified
- [ ] Task 0.5: Database tables verified
- [ ] Task 1.1: Canvas displays workflows
- [ ] **Run npm run build**

### Day 2: Node Editing
- [ ] Task 1.2: Node palette integrated
- [ ] Task 1.3: Node config integrated
- [ ] Task 1.4: Edge creation works

### Day 3-9: Contact Management (Proto-CRM) ✅ COMPLETED
- [x] **Spec Creation**: Requirements, design, and task breakdown
- [x] **Database**: stitch_contacts table with user-scoped data
- [x] **API Endpoints**: Full CRUD operations (GET, POST, PATCH, DELETE)
- [x] **React Hook**: useContacts for data fetching
- [x] **UI Component**: ContactManager (reusable, embeddable)
- [x] **Import Functionality**: Manual, CSV, and Airtable import
- [x] **Edit/Delete**: Full contact management capabilities
- [x] **Error Handling**: Comprehensive error states and user feedback
- [x] **Testing**: Demo pages and manual testing
- [x] **Documentation**: Task summaries and known issues analysis

### Day 10+: M-Shape Architecture (Phase 3)
- [ ] Task 3.1: UX Spine Visualization (Journey View showing only UX nodes)
- [ ] Task 3.2: Entity Position on UX Spine (entities AT UX nodes, not inside workflows)
- [ ] Task 3.3: Entity Journey Panel (journey progress through UX spine)
- [ ] Task 3.4: System Path Drill-Down (admin view of workflow under UX node)
- [ ] Task 3.5: Entity Seeding to Journey (add contacts at first UX node)
- [ ] Task 3.6: Journey Progression Logic (entity moves when system path completes)
- [ ] Task 3.7: Journey Monitoring (real-time entity movement)

### Continue for remaining days...

---

## Notes

- **Don't skip integration** - Every task must wire up the feature
- **Test as you go** - Manual testing after each task
- **One task at a time** - Don't move on until current task works
- **Ask for help** - If stuck for >30 min, ask user for guidance
- **Document issues** - Keep list of bugs/issues found
- **Celebrate wins** - Each working feature is progress!

## Phase 2 Lessons Learned

### What Worked Well
- **Spec-driven development** - Having clear requirements and design documents prevented scope creep
- **Iterative refinement** - Pivoting from "entity import" to "contact management" early saved time
- **Reusable components** - ContactManager being standalone makes it flexible for future integration
- **Comprehensive testing** - Demo pages caught issues early
- **Gap analysis** - KNOWN_ISSUES.md provides clear roadmap for improvements

### What Could Be Improved
- **Architecture decisions** - Should have identified entity-contact relationship need earlier
- **Security planning** - Airtable credential storage should have been designed upfront
- **Performance considerations** - Pagination needs should have been anticipated

### Key Insights
- **Contacts ≠ Entities** - This distinction is crucial for the data model
- **Integration context matters** - ContactManager in node config makes more sense than canvas panel
- **Proto-CRM scope** - Contact management is a significant feature that deserves its own spec
- **User-scoped data** - Multi-tenancy considerations are critical for SaaS platforms

