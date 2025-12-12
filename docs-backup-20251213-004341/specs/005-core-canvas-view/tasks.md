# Implementation Plan: Core Canvas View

## Overview

This implementation plan breaks down the Core Canvas View feature into discrete, manageable tasks. Each task is designed to be completed in 2-4 hours and results in a working, integrated feature that users can access and test.

**Important**: Do NOT run automated tests (npm test, eslint, vitest, build) during individual task implementation. Testing will be done in dedicated testing tasks at the end.

## Task List

- [x] 1. Verify Canvas Display Works
  - Verify WorkflowCanvas renders nodes and edges correctly
  - Ensure React Flow is configured properly
  - Test: User can navigate to canvas and see workflow
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Integrate Node Palette
  - Import NodePalette into WorkflowCanvas
  - Add toggle button to show/hide palette
  - Wire up onAddNode callback to create nodes
  - Save new nodes via POST /api/canvas/[id]/nodes
  - Test: User can add nodes from palette
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Integrate Node Configuration Panel
  - Import NodeConfigPanel into WorkflowCanvas
  - Show panel when node is clicked
  - Wire up onSave callback to update node data
  - Implement auto-save with debouncing (500ms)
  - Save changes via PATCH /api/canvas/[id]/nodes/[nodeId]
  - Test: User can configure nodes and changes persist
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Enable Edge Creation and Deletion
  - Enable connection handles in React Flow
  - Wire up onConnect to save edges via POST /api/canvas/[id]/edges
  - Wire up edge deletion via DELETE /api/canvas/[id]/edges/[edgeId]
  - Add keyboard shortcut (Delete key) for edge deletion
  - Test: User can connect and delete edges
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5. Add Error Handling and User Feedback
  - Add error states for failed API calls
  - Add loading states for async operations
  - Add toast notifications for success/error messages
  - Implement rollback logic for failed operations
  - Test: Errors display appropriately and don't crash app
  - _Requirements: 5.5, 5.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Task Details

### Task 1: Verify Canvas Display Works

**Goal**: Ensure the WorkflowCanvas component renders existing workflows correctly.

**Files to check**:
- `src/components/canvas/WorkflowCanvas.tsx`
- `src/app/canvas/[id]/page.tsx`

**Actions**:
1. Navigate to an existing canvas with nodes and edges
2. Verify canvas loads without errors
3. Verify nodes display in correct positions
4. Verify edges connect correct nodes
5. Verify pan and zoom work
6. Fix any rendering issues found

**Integration checklist**:
- [ ] WorkflowCanvas imported in canvas/[id]/page.tsx
- [ ] Canvas fetches flow data from database
- [ ] Nodes render on canvas
- [ ] Edges render on canvas
- [ ] Canvas is interactive (pan/zoom)

**Done when**: User can view existing workflow with nodes and edges displayed correctly.

---

### Task 2: Integrate Node Palette

**Goal**: Enable users to add new nodes to the canvas from a palette.

**Files to modify**:
- `src/components/canvas/WorkflowCanvas.tsx`
- `src/components/canvas/NodePalette.tsx`

**Current state**:
- NodePalette component exists
- Already imported in WorkflowCanvas
- onAddNode handler exists but may need verification

**Actions**:
1. Verify NodePalette is rendered in WorkflowCanvas
2. Verify toggle button shows/hides palette
3. Test clicking node types in palette
4. Verify handleAddNode creates node in local state
5. Verify POST /api/canvas/[id]/nodes is called
6. Verify new node appears on canvas
7. Refresh page and verify node persists
8. Fix any issues found

**Integration checklist**:
- [ ] NodePalette rendered in WorkflowCanvas
- [ ] Palette opens and closes correctly
- [ ] Clicking node type calls onAddNode
- [ ] New node added to local state
- [ ] POST /api/canvas/[id]/nodes called with correct data
- [ ] New node appears on canvas
- [ ] New node persists after refresh

**Done when**: User can add nodes from palette and they persist after refresh.

---

### Task 3: Integrate Node Configuration Panel

**Goal**: Enable users to configure node settings with auto-save.

**Files to modify**:
- `src/components/canvas/WorkflowCanvas.tsx`
- `src/components/panels/NodeConfigPanel.tsx`

**Current state**:
- NodeConfigPanel component exists
- Already imported in WorkflowCanvas
- onSave handler exists but may need verification

**Actions**:
1. Verify NodeConfigPanel is rendered in WorkflowCanvas
2. Click a node and verify panel opens
3. Verify panel shows correct configuration fields
4. Modify a configuration value
5. Wait 500ms (debounce period)
6. Verify PATCH /api/canvas/[id]/nodes/[nodeId] is called
7. Verify local state updates
8. Refresh page and verify config persisted
9. Test closing panel (Escape key, close button)
10. Fix any issues found

**Integration checklist**:
- [ ] NodeConfigPanel rendered in WorkflowCanvas
- [ ] Panel opens when node clicked
- [ ] Panel shows correct fields for node type
- [ ] Configuration changes update local state
- [ ] Changes debounced (500ms)
- [ ] PATCH /api/canvas/[id]/nodes/[nodeId] called
- [ ] Changes persist after refresh
- [ ] Panel closes correctly

**Done when**: User can configure nodes and changes persist after refresh.

---

### Task 4: Enable Edge Creation and Deletion

**Goal**: Enable users to connect nodes with edges and delete edges.

**Files to modify**:
- `src/components/canvas/WorkflowCanvas.tsx`

**Current state**:
- handleConnect exists
- handleDeleteEdge exists
- Keyboard shortcuts exist

**Actions**:
1. Verify connection handles appear on nodes
2. Drag from source to target node
3. Verify edge appears
4. Verify POST /api/canvas/[id]/edges is called
5. Refresh page and verify edge persists
6. Select an edge
7. Press Delete key
8. Verify edge removed from canvas
9. Verify DELETE /api/canvas/[id]/edges/[edgeId] is called
10. Refresh page and verify edge is gone
11. Fix any issues found

**Integration checklist**:
- [ ] Connection handles visible on nodes
- [ ] Can drag from source to target
- [ ] Edge appears when connection made
- [ ] POST /api/canvas/[id]/edges called
- [ ] Edge persists after refresh
- [ ] Can select edges
- [ ] Delete key removes edge
- [ ] DELETE /api/canvas/[id]/edges/[edgeId] called
- [ ] Edge deletion persists after refresh

**Done when**: User can create and delete edges with persistence.

---

### Task 5: Add Error Handling and User Feedback

**Goal**: Provide clear feedback for errors and loading states.

**Files to modify**:
- `src/components/canvas/WorkflowCanvas.tsx`
- `src/components/canvas/NodePalette.tsx`
- `src/components/panels/NodeConfigPanel.tsx`

**Actions**:
1. Add error state variables
2. Add loading state variables
3. Wrap API calls in try-catch blocks
4. On error: set error state, show toast notification, rollback optimistic updates
5. On loading: show loading indicators
6. Test error scenarios:
   - Network failure during node creation
   - Invalid configuration data
   - Attempting to connect non-existent nodes
7. Verify error messages display
8. Verify app doesn't crash
9. Verify rollback works correctly

**Integration checklist**:
- [ ] Error states added
- [ ] Loading states added
- [ ] Try-catch blocks around API calls
- [ ] Error messages display in toast
- [ ] Loading indicators show during operations
- [ ] Optimistic updates rollback on error
- [ ] App doesn't crash on errors

**Done when**: Errors display clearly and app remains stable.

---

### Task 6: Checkpoint

**Goal**: Ensure all features work together and all tests pass.

**Actions**:
1. Test complete workflow:
   - Navigate to canvas
   - Add multiple nodes
   - Configure each node
   - Connect nodes with edges
   - Delete some edges
   - Refresh page
   - Verify all changes persisted
2. Test error scenarios
3. Ask user if any issues or questions

**Done when**: All features work end-to-end and user confirms no issues.

---

## Success Criteria

### For Each Task
- [ ] Code written
- [ ] Code integrated (imported and rendered)
- [ ] Feature accessible (user can navigate to it)
- [ ] Feature works (user can complete workflow)
- [ ] Manual testing done (verified it works)
- [ ] Task summary written

### For Overall Spec
- [ ] All tasks complete
- [ ] All features accessible
- [ ] All features tested
- [ ] Canvas displays workflows correctly
- [ ] Users can add nodes from palette
- [ ] Users can configure nodes
- [ ] Users can create and delete edges
- [ ] All changes persist to database
- [ ] Errors handled gracefully
- [ ] Ready for next phase (Entity Management)

---

## Notes

- **Don't run automated tests** during task implementation (npm test, eslint, vitest, build)
- **Test manually** after each task (can I access this feature?)
- **One task at a time** - Don't move on until current task works
- **Integration is required** - Features must be accessible to users
- **Write task summaries** - Document what was done in summaries/ folder
- **Ask for help** - If stuck for >30 min, ask user for guidance
