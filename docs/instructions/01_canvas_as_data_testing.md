# Testing Instructions for Canvas as Data Feature

## Overview

The Canvas as Data feature transforms Stitch canvases from in-memory structures to a robust, versioned, database-backed system. This implementation includes:

- **Mermaid Import/Export**: Create workflows using Mermaid flowchart syntax
- **Version Management**: Track changes over time with immutable snapshots
- **Auto-Versioning**: Automatically version workflows before execution
- **API Endpoints**: Programmatic canvas management
- **Validation System**: Comprehensive graph validation with cycle detection

## Prerequisites

### Environment Setup

1. **Database Migration**: Ensure the versioning migration has been applied
   ```bash
   cd stitch-run
   npm run db:migrate
   ```

2. **Environment Variables**: Verify `.env.local` contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Verify Server**: Navigate to `http://localhost:3000` and confirm the app loads

### Test Data Setup

You'll need at least one flow in the database. If none exist, create one:

1. Navigate to `http://localhost:3000`
2. Look for a "Create Flow" or similar button
3. Create a test flow named "Test Workflow"

## Step-by-Step Testing Guide

---

### Test 1: Mermaid Import - Basic Workflow Creation

**Purpose**: Verify that users can import a workflow from Mermaid syntax

1. **Navigate to Canvas Editor**
   - Go to `http://localhost:3000/canvas/[flow-id]` (replace `[flow-id]` with an actual flow ID)
   - You should see the canvas editor with a toolbar at the top

2. **Open Import Dialog**
   - Look for an "Import" button with an upload icon in the toolbar
   - Click the "Import" button
   - A dialog titled "Import from Mermaid" should appear

3. **Enter Mermaid Syntax**
   - In the dialog, you'll see tabs: "Mermaid", "Node Configs", "Edge Mappings"
   - Ensure the "Mermaid" tab is selected
   - In the textarea, paste this example:
     ```
     flowchart LR
       Start[User Input] --> Process[Generate Script]
       Process --> Output[Display Result]
     ```

4. **Preview the Import**
   - Click the "Preview" button at the bottom of the dialog
   - You should see a preview section appear showing:
     - "✓ 3 nodes, 2 edges"
     - Node details: "Start (ux), Process (worker), Output (worker)"
     - Edge details: "Start → Process, Process → Output"

5. **Import the Workflow**
   - Click the "Import" button (green/primary color)
   - The dialog should close
   - The canvas should now display 3 nodes arranged horizontally
   - Nodes should be connected with arrows

**Expected Results**:
- ✅ Import dialog opens smoothly
- ✅ Mermaid syntax is accepted without errors
- ✅ Preview shows correct node and edge count
- ✅ Canvas updates with new nodes after import
- ✅ Nodes are positioned automatically (no overlap)

**Visual Verification**:
- Start node should have a rectangular shape (UX node)
- Process and Output nodes should have rounded shapes (Worker nodes)
- Arrows should connect Start → Process → Output

---

### Test 2: Mermaid Import - Advanced Configuration

**Purpose**: Test importing with detailed node configurations

1. **Open Import Dialog** (same as Test 1, step 2)

2. **Enter Mermaid Syntax**
   - In the "Mermaid" tab, paste:
     ```
     flowchart LR
       A[Input] --> B[Claude]
       B --> C[Video]
     ```

3. **Add Node Configurations**
   - Click the "Node Configs" tab
   - In the JSON textarea, paste:
     ```json
     {
       "B": {
         "workerType": "claude",
         "config": {
           "model": "claude-3-sonnet-20240229",
           "temperature": 0.7
         }
       },
       "C": {
         "workerType": "minimax",
         "config": {
           "duration": 5
         }
       }
     }
     ```

4. **Add Edge Mappings**
   - Click the "Edge Mappings" tab
   - In the JSON textarea, paste:
     ```json
     {
       "A->B": {
         "prompt": "input.text"
       },
       "B->C": {
         "prompt": "output.script.scenes[0].description"
       }
     }
     ```

5. **Preview and Import**
   - Click "Preview"
   - Verify the preview shows 3 nodes with worker types
   - Click "Import"
   - Canvas should update with configured nodes

**Expected Results**:
- ✅ Node configs are accepted (valid JSON)
- ✅ Edge mappings are accepted (valid JSON)
- ✅ Preview reflects the configurations
- ✅ Nodes display correct worker types (Claude, MiniMax)

---

### Test 3: Mermaid Import - Error Handling

**Purpose**: Verify validation and error messages work correctly

#### Test 3a: Invalid Mermaid Syntax

1. **Open Import Dialog**
2. **Enter Invalid Mermaid**:
   ```
   flowchart LR
     A[Start] -> B[End]
   ```
   (Note: Uses `->` instead of `-->`)

3. **Click Preview**
   - An error message should appear in red
   - Error should mention "Failed to parse Mermaid" or similar

**Expected Result**: ✅ Clear error message displayed, import blocked

#### Test 3b: Invalid JSON in Node Configs

1. **Open Import Dialog**
2. **Enter Valid Mermaid** (from Test 1)
3. **Switch to Node Configs Tab**
4. **Enter Invalid JSON**:
   ```json
   {
     "A": {
       "workerType": "claude"
     
   ```
   (Note: Missing closing braces)

5. **Click Preview**
   - Error message should appear: "Invalid nodeConfigs JSON"

**Expected Result**: ✅ JSON validation error displayed

#### Test 3c: Cyclic Graph Detection

1. **Open Import Dialog**
2. **Enter Cyclic Mermaid**:
   ```
   flowchart LR
     A[Start] --> B[Process]
     B --> C[End]
     C --> A
   ```
   (Note: C connects back to A, creating a cycle)

3. **Click Preview**
   - Error should mention "cycle detected" or "graph must be acyclic"

**Expected Result**: ✅ Cycle detection prevents import

---

### Test 4: Mermaid Export

**Purpose**: Verify users can export existing workflows to Mermaid

1. **Navigate to Canvas with Existing Workflow**
   - Go to a canvas that has at least 2-3 nodes connected

2. **Open Export Dialog**
   - Look for an "Export" button with a download icon
   - Click the "Export" button
   - A dialog titled "Export to Mermaid" should appear

3. **View Generated Mermaid**
   - The dialog should display Mermaid syntax in a readonly textarea
   - Syntax should start with `flowchart LR`
   - Should contain node definitions like `A[Label]`
   - Should contain connections like `A --> B`

4. **Copy to Clipboard**
   - Click the "Copy to Clipboard" button
   - A success message should appear (toast or inline)
   - Open a text editor and paste (Ctrl+V / Cmd+V)
   - Verify the Mermaid syntax was copied

**Expected Results**:
- ✅ Export dialog opens with generated Mermaid
- ✅ Mermaid syntax is valid and readable
- ✅ Copy to clipboard works
- ✅ Node labels match canvas nodes
- ✅ Connections match canvas edges

---

### Test 5: Unsaved Changes Protection

**Purpose**: Verify users are warned before losing unsaved work

1. **Navigate to Canvas**
2. **Make Changes**
   - Add a new node or move an existing node
   - Do NOT save (no "Save" button click)

3. **Attempt Import**
   - Click the "Import" button
   - A warning dialog should appear with title "⚠️ Unsaved Changes"
   - Message should say: "You have unsaved changes in your current canvas. Importing will replace your current work."

4. **Test Cancel Option**
   - Click "Cancel" button
   - Warning dialog should close
   - Import dialog should close
   - Canvas should remain unchanged

5. **Test Discard Option**
   - Click "Import" again
   - In the warning dialog, click "Discard Changes"
   - Import dialog should reappear
   - Proceed with import (use Test 1 example)
   - Canvas should update with imported workflow (unsaved changes lost)

6. **Test Save & Import Option** (if `onSaveBeforeImport` is implemented)
   - Make changes again
   - Click "Import"
   - In warning dialog, click "Save & Import"
   - Changes should be saved first
   - Then import dialog should appear
   - Proceed with import

**Expected Results**:
- ✅ Warning appears when unsaved changes exist
- ✅ Cancel preserves current work
- ✅ Discard allows import to proceed
- ✅ Save & Import saves before importing (if implemented)

---

### Test 6: Version Creation - Manual Save

**Purpose**: Test creating versions manually with commit messages

**Note**: This test requires API access or a UI component for version management. If no UI exists yet, test via API:

1. **Using API (via browser console or Postman)**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Run:
     ```javascript
     fetch('/api/flows/[flow-id]/versions', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         visualGraph: {
           nodes: [
             {
               id: 'test1',
               type: 'worker',
               position: { x: 0, y: 0 },
               data: { label: 'Test Node', worker_type: 'claude' }
             }
           ],
           edges: []
         },
         commitMessage: 'Test version creation'
       })
     }).then(r => r.json()).then(console.log)
     ```
   - Replace `[flow-id]` with actual flow ID

2. **Verify Response**
   - Response should have status 200
   - Response body should contain:
     - `versionId`: A UUID string
     - `executionGraph`: An object with `nodes`, `adjacency`, `edgeData`, etc.

3. **Verify Database**
   - Open Supabase dashboard
   - Navigate to Table Editor → `stitch_flow_versions`
   - Find the newly created version by `versionId`
   - Verify:
     - `flow_id` matches your flow
     - `visual_graph` contains the node data
     - `execution_graph` is populated
     - `commit_message` is "Test version creation"
     - `created_at` is recent

**Expected Results**:
- ✅ API returns 200 status
- ✅ Version ID is returned
- ✅ Execution graph is compiled
- ✅ Database record is created
- ✅ Commit message is stored

---

### Test 7: Version History - List Versions

**Purpose**: Verify version listing returns all versions for a flow

1. **Create Multiple Versions** (repeat Test 6 with different commit messages):
   - Version 1: "Initial version"
   - Version 2: "Added error handling"
   - Version 3: "Optimized workflow"

2. **List Versions via API**:
   ```javascript
   fetch('/api/flows/[flow-id]/versions')
     .then(r => r.json())
     .then(console.log)
   ```

3. **Verify Response**
   - Response should have `versions` array
   - Array should contain 3+ versions
   - Each version should have:
     - `id`: UUID
     - `flow_id`: Matches your flow
     - `commit_message`: The message you provided
     - `created_at`: Timestamp
   - Versions should be ordered by `created_at` DESC (newest first)
   - **Important**: Response should NOT include `visual_graph` or `execution_graph` (metadata only)

**Expected Results**:
- ✅ All versions are returned
- ✅ Ordered newest first
- ✅ Metadata only (no heavy graph blobs)
- ✅ Commit messages are preserved

---

### Test 8: Version Retrieval - Get Specific Version

**Purpose**: Test retrieving a specific version with full graph data

1. **Get a Version ID** (from Test 7 response)

2. **Retrieve Specific Version**:
   ```javascript
   fetch('/api/flows/[flow-id]/versions/[version-id]')
     .then(r => r.json())
     .then(console.log)
   ```

3. **Verify Response**
   - Response should have `version` object
   - Object should contain:
     - `id`: Matches requested version ID
     - `flow_id`: Matches flow
     - `visual_graph`: Full graph with nodes, edges, positions
     - `execution_graph`: Optimized graph with adjacency map
     - `commit_message`: Original message
     - `created_at`: Timestamp

**Expected Results**:
- ✅ Correct version is returned
- ✅ Full graph data is included
- ✅ Visual graph has UI properties (positions, styles)
- ✅ Execution graph is optimized (no UI properties)

---

### Test 9: Auto-Versioning on Run

**Purpose**: Verify workflows are automatically versioned before execution

1. **Navigate to Canvas**
2. **Make Changes** (add/modify nodes)
3. **Run Workflow via API**:
   ```javascript
   fetch('/api/flows/[flow-id]/run', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       visualGraph: {
         nodes: [
           {
             id: 'auto1',
             type: 'worker',
             position: { x: 0, y: 0 },
             data: { 
               label: 'Auto Version Test',
               worker_type: 'claude',
               inputs: {
                 prompt: { type: 'string', required: true, default: 'test' }
               }
             }
           }
         ],
         edges: []
       }
     })
   }).then(r => r.json()).then(console.log)
   ```

4. **Verify Response**
   - Response should contain:
     - `runId`: UUID of created run
     - `versionId`: UUID of auto-created version
     - `status`: "started"

5. **Verify Version Was Created**
   - List versions (Test 7)
   - Find version with `versionId` from response
   - Commit message should be "Auto-versioned on run"

6. **Verify Run References Version**
   - Query database: `stitch_runs` table
   - Find run by `runId`
   - Verify `flow_version_id` matches `versionId`

**Expected Results**:
- ✅ Version is auto-created before run
- ✅ Run references the new version
- ✅ Commit message indicates auto-versioning
- ✅ Execution uses versioned graph

---

### Test 10: Validation - Cycle Detection

**Purpose**: Verify cyclic graphs are rejected

1. **Create Cyclic Graph via API**:
   ```javascript
   fetch('/api/flows/[flow-id]/versions', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       visualGraph: {
         nodes: [
           { id: 'A', type: 'worker', position: { x: 0, y: 0 }, data: { label: 'A', worker_type: 'claude' } },
           { id: 'B', type: 'worker', position: { x: 100, y: 0 }, data: { label: 'B', worker_type: 'claude' } },
           { id: 'C', type: 'worker', position: { x: 200, y: 0 }, data: { label: 'C', worker_type: 'claude' } }
         ],
         edges: [
           { id: 'e1', source: 'A', target: 'B' },
           { id: 'e2', source: 'B', target: 'C' },
           { id: 'e3', source: 'C', target: 'A' }  // Creates cycle
         ]
       }
     })
   }).then(r => r.json()).then(console.log)
   ```

2. **Verify Error Response**
   - Status should be 400
   - Response should contain:
     - `error`: "Graph validation failed"
     - `validationErrors`: Array with at least one error
   - First error should have:
     - `type`: "cycle"
     - `message`: Contains "cycle" or "acyclic"

**Expected Results**:
- ✅ Request is rejected with 400 status
- ✅ Validation error clearly indicates cycle
- ✅ Version is NOT created

---

### Test 11: Validation - Missing Required Inputs

**Purpose**: Verify graphs with missing required inputs are rejected

1. **Create Graph with Missing Input**:
   ```javascript
   fetch('/api/flows/[flow-id]/versions', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       visualGraph: {
         nodes: [
           {
             id: 'worker1',
             type: 'worker',
             position: { x: 0, y: 0 },
             data: {
               label: 'Worker',
               worker_type: 'claude',
               inputs: {
                 prompt: { type: 'string', required: true }
                 // No default value, no incoming edge mapping
               }
             }
           }
         ],
         edges: []  // No edges to provide input
       }
     })
   }).then(r => r.json()).then(console.log)
   ```

2. **Verify Error Response**
   - Status should be 400
   - `validationErrors` should contain error with:
     - `type`: "missing_input"
     - `node`: "worker1"
     - `field`: "prompt"
     - `message`: Mentions missing required input

**Expected Results**:
- ✅ Validation catches missing required input
- ✅ Error specifies which node and field
- ✅ Version creation is blocked

---

### Test 12: Validation - Invalid Worker Type

**Purpose**: Verify invalid worker types are rejected

1. **Create Graph with Invalid Worker**:
   ```javascript
   fetch('/api/flows/[flow-id]/versions', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       visualGraph: {
         nodes: [
           {
             id: 'invalid',
             type: 'worker',
             position: { x: 0, y: 0 },
             data: {
               label: 'Invalid Worker',
               worker_type: 'nonexistent-worker-type'
             }
           }
         ],
         edges: []
       }
     })
   }).then(r => r.json()).then(console.log)
   ```

2. **Verify Error Response**
   - Status should be 400
   - `validationErrors` should contain error with:
     - `type`: "invalid_worker"
     - `node`: "invalid"
     - `message`: Mentions "nonexistent-worker-type" and lists valid types (claude, minimax, elevenlabs, shotstack)

**Expected Results**:
- ✅ Invalid worker type is caught
- ✅ Error message lists available worker types
- ✅ Version creation is blocked

---

### Test 13: Round-Trip - Mermaid Export → Import

**Purpose**: Verify exported Mermaid can be re-imported without data loss

1. **Start with Existing Workflow**
   - Navigate to canvas with 3-4 nodes

2. **Export to Mermaid** (Test 4)
   - Copy the generated Mermaid syntax

3. **Create New Flow**
   - Create a blank flow or navigate to empty canvas

4. **Import the Mermaid**
   - Open Import dialog
   - Paste the copied Mermaid
   - Click Import

5. **Compare Graphs**
   - Original graph should have N nodes and M edges
   - Imported graph should have N nodes and M edges
   - Node IDs should match
   - Connections should match
   - Node types should match (ux, worker, splitter, collector)

**Expected Results**:
- ✅ Export → Import preserves structure
- ✅ Node count matches
- ✅ Edge count matches
- ✅ Node types are preserved
- ✅ Connections are preserved

**Note**: Detailed configurations (worker configs, entity movement) are NOT included in Mermaid export, so those won't round-trip.

---

## Visual Verification Checklist

### Import Dialog
- [ ] Dialog opens smoothly with no layout issues
- [ ] Tabs (Mermaid, Node Configs, Edge Mappings) are clearly labeled
- [ ] Textareas are large enough for comfortable editing
- [ ] Preview section displays clearly
- [ ] Buttons (Preview, Import, Cancel) are properly styled
- [ ] Error messages are visible and red/warning colored
- [ ] Dialog is responsive (works on different screen sizes)

### Export Dialog
- [ ] Dialog opens smoothly
- [ ] Generated Mermaid is displayed in monospace font
- [ ] Textarea is readonly (user can't edit)
- [ ] Copy button is clearly visible
- [ ] Success message appears after copy
- [ ] Dialog can be closed easily

### Canvas Updates
- [ ] Imported nodes appear immediately
- [ ] Nodes are positioned without overlap
- [ ] Edges connect correctly
- [ ] Node shapes match types (rectangles for UX, rounded for workers, diamonds for splitters/collectors)
- [ ] Canvas is interactive after import (can drag nodes)

### Warning Dialog
- [ ] Warning icon (⚠️) is visible
- [ ] Message is clear and explains consequences
- [ ] Three buttons are clearly labeled
- [ ] Buttons have appropriate colors (Cancel: neutral, Discard: warning, Save: primary)

---

## Edge Cases to Test

### Edge Case 1: Empty Graph Import
- Import Mermaid with only one node, no edges
- **Expected**: Single node appears on canvas

### Edge Case 2: Large Graph Import
- Import Mermaid with 20+ nodes
- **Expected**: All nodes appear, auto-layout handles positioning

### Edge Case 3: Special Characters in Labels
- Import Mermaid with labels containing: `[`, `]`, `(`, `)`, `{`, `}`
- **Expected**: Labels are sanitized, no parsing errors

### Edge Case 4: Duplicate Node IDs
- Import Mermaid with duplicate node IDs
- **Expected**: System handles gracefully (either error or auto-rename)

### Edge Case 5: Disconnected Subgraphs
- Import Mermaid with two separate groups of nodes (no connection between groups)
- **Expected**: Both groups appear, validation passes

### Edge Case 6: Self-Loop
- Import Mermaid with node connecting to itself: `A --> A`
- **Expected**: Cycle detection catches this, import blocked

### Edge Case 7: Multiple Edges Between Same Nodes
- Import Mermaid with: `A --> B` and `A --> B` (duplicate)
- **Expected**: System handles gracefully (deduplicate or error)

### Edge Case 8: Very Long Commit Messages
- Create version with 500+ character commit message
- **Expected**: Message is stored, no truncation or error

### Edge Case 9: Concurrent Version Creation
- Create two versions simultaneously (two API calls at same time)
- **Expected**: Both versions are created with different IDs

### Edge Case 10: Version of Non-Existent Flow
- Try to create version for flow ID that doesn't exist
- **Expected**: 404 error with clear message

---

## Performance Testing

### Test P1: Large Graph Compilation
1. Create graph with 100 nodes and 150 edges
2. Create version via API
3. **Expected**: Compilation completes in < 2 seconds

### Test P2: Version List Performance
1. Create 50 versions for a single flow
2. List versions via API
3. **Expected**: Response returns in < 500ms

### Test P3: Import Large Mermaid
1. Import Mermaid with 50+ nodes
2. **Expected**: Preview generates in < 1 second, import completes in < 2 seconds

---

## Browser Compatibility

Test the Import/Export dialogs in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

Verify:
- Dialogs render correctly
- Textareas are editable
- Buttons work
- Copy to clipboard works

---

## Accessibility Testing

- [ ] Import/Export buttons have proper ARIA labels
- [ ] Dialogs can be closed with Escape key
- [ ] Tab navigation works through form fields
- [ ] Error messages are announced to screen readers
- [ ] Buttons have focus indicators

---

## Regression Testing

After completing all tests above, verify existing functionality still works:

- [ ] Canvas node dragging still works
- [ ] Canvas zoom/pan still works
- [ ] Existing "Run" button still works
- [ ] Node creation still works
- [ ] Edge creation still works
- [ ] Node deletion still works

---

## Known Limitations

Document any limitations discovered during testing:

1. **Mermaid Export Limitations**:
   - Worker configurations are NOT included in export
   - Entity movement configs are NOT included
   - Edge mappings are NOT included
   - Only structure (nodes and connections) is exported

2. **Auto-Layout Limitations**:
   - Positions are generated algorithmically
   - May not match original layout exactly
   - User may need to adjust positions after import

3. **Validation Strictness**:
   - Required inputs MUST have explicit edge mappings or defaults
   - Implicit data passing is disabled for safety

---

## Reporting Issues

When reporting issues, include:

1. **Test Number**: Which test failed (e.g., "Test 3a: Invalid Mermaid Syntax")
2. **Steps to Reproduce**: Exact steps taken
3. **Expected Result**: What should have happened
4. **Actual Result**: What actually happened
5. **Screenshots**: If visual issue
6. **Browser**: Browser and version
7. **Console Errors**: Any errors in browser console (F12)
8. **Network Errors**: Any failed API calls in Network tab

---

## Success Criteria

The Canvas as Data feature is considered fully functional when:

- ✅ All 13 main tests pass
- ✅ All edge cases are handled gracefully
- ✅ Visual verification checklist is complete
- ✅ No console errors during normal operation
- ✅ Performance benchmarks are met
- ✅ Accessibility requirements are satisfied
- ✅ No regressions in existing functionality

---

## Additional Resources

- **API Documentation**: `/docs/canvas-as-data/API.md`
- **Architecture Overview**: `/docs/canvas-as-data/ARCHITECTURE.md`
- **Mermaid Syntax Guide**: `/docs/canvas-as-data/MERMAID.md`
- **Version Management Guide**: `/docs/canvas-as-data/VERSION_MANAGEMENT.md`
- **Usage Examples**: `/docs/canvas-as-data/EXAMPLES.md`
