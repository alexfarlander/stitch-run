# Spec 001: Workflow Management UI - Fix Plan

**Date**: December 9, 2024  
**Status**: Ready to Execute  
**Goal**: Make existing features accessible and working

## Problem Summary

From the audit: ~45% complete. Most code exists but isn't integrated. Users can't access features.

## Fix Strategy

Fix in 3 phases, each with small, focused tasks (2-4 hours each).

---

## Phase 1: Core Features Integration (Priority 1)

**Goal**: Make core workflow management accessible  
**Time Estimate**: 1 day (8 hours)  
**Impact**: Users can create workflows, import entities, start runs

### Task 1.1: Integrate NodePalette into WorkflowCanvas (2 hours)

**What to do**:
1. Import NodePalette in `WorkflowCanvas.tsx`
2. Add NodePalette to left sidebar
3. Wire up drag-and-drop to add nodes
4. Test: User can drag nodes from palette to canvas

**Files to modify**:
- `src/components/canvas/WorkflowCanvas.tsx`

**Success criteria**:
- [ ] NodePalette visible in canvas UI
- [ ] User can drag Worker node to canvas
- [ ] User can drag UX node to canvas
- [ ] Nodes appear on canvas when dropped

---

### Task 1.2: Integrate NodeConfigPanel into WorkflowCanvas (2 hours)

**What to do**:
1. Import NodeConfigPanel in `WorkflowCanvas.tsx`
2. Add state for selected node
3. Show panel when node is clicked
4. Wire up config changes to update node
5. Test: User can click node and configure it

**Files to modify**:
- `src/components/canvas/WorkflowCanvas.tsx`

**Success criteria**:
- [ ] Clicking node opens config panel
- [ ] Panel shows node configuration options
- [ ] Changing config updates the node
- [ ] Panel closes when clicking outside

---

### Task 1.3: Integrate EntityImportButton into WorkflowCanvas (1 hour)

**What to do**:
1. Import EntityImportButton in `WorkflowCanvas.tsx`
2. Add button to canvas toolbar (top-right)
3. Wire up to open EntityImportModal
4. Test: User can click button and import entities

**Files to modify**:
- `src/components/canvas/WorkflowCanvas.tsx`

**Success criteria**:
- [ ] Import button visible in canvas toolbar
- [ ] Clicking button opens import modal
- [ ] User can import entities via CSV
- [ ] Entities appear in database

---

### Task 1.4: Integrate EntityListPanel into Canvas Page (3 hours)

**What to do**:
1. Open `src/app/canvas/[id]/page.tsx`
2. Import EntityListPanel
3. Add panel to page layout (left side)
4. Wire up entity selection
5. Test: User can see and manage entities

**Files to modify**:
- `src/app/canvas/[id]/page.tsx`

**Success criteria**:
- [ ] Entity list panel visible on canvas page
- [ ] Panel shows entities for current canvas
- [ ] User can search/filter entities
- [ ] User can select entities
- [ ] Bulk actions work (start runs, move, delete)

---

## Phase 2: Settings Navigation (Priority 2)

**Goal**: Make settings pages accessible  
**Time Estimate**: 0.5 days (4 hours)  
**Impact**: Users can access functions, schedules, webhooks

### Task 2.1: Create Settings Navigation (2 hours)

**What to do**:
1. Create `src/components/navigation/SettingsNav.tsx`
2. Add links to: Functions, Schedules, Webhooks, Email Replies
3. Add settings icon to main navigation
4. Test: User can navigate to all settings pages

**Files to create**:
- `src/components/navigation/SettingsNav.tsx`

**Files to modify**:
- Main navigation component (find and update)

**Success criteria**:
- [ ] Settings link visible in main nav
- [ ] Clicking opens settings menu
- [ ] All 4 settings pages accessible
- [ ] Current page highlighted

---

### Task 2.2: Add Dashboard Link to Canvas Page (1 hour)

**What to do**:
1. Open `src/app/canvas/[id]/page.tsx`
2. Add "Dashboard" button to canvas toolbar
3. Link to `/canvas/[id]/dashboard`
4. Test: User can navigate to dashboard

**Files to modify**:
- `src/app/canvas/[id]/page.tsx`

**Success criteria**:
- [ ] Dashboard button visible in canvas toolbar
- [ ] Clicking navigates to dashboard
- [ ] Dashboard shows metrics

---

### Task 2.3: Integrate Run Controls into EntityListPanel (1 hour)

**What to do**:
1. Open `src/components/canvas/entities/EntityListPanel.tsx`
2. Verify RunControlPanel is imported
3. Verify RunHistoryPanel is integrated
4. Test: User can start runs and view history

**Files to modify**:
- `src/components/canvas/entities/EntityListPanel.tsx` (verify only)

**Success criteria**:
- [ ] Run controls visible in entity panel
- [ ] User can start single run
- [ ] User can start bulk runs
- [ ] User can view run history

---

## Phase 3: Testing and Validation (Priority 3)

**Goal**: Verify everything works  
**Time Estimate**: 0.5 days (4 hours)  
**Impact**: Confidence that features work

### Task 3.1: Manual Testing Checklist (2 hours)

**What to test**:
1. Create new workflow
2. Add nodes from palette
3. Configure nodes
4. Connect edges
5. Import entities
6. Start runs
7. View run history
8. Access settings pages
9. View dashboard

**Deliverable**: Testing report with pass/fail for each item

---

### Task 3.2: Run Automated Tests (2 hours)

**What to do**:
1. Run `npm test`
2. Run `npm run build`
3. Run `eslint .`
4. Fix any critical errors
5. Document remaining issues

**Deliverable**: Test results report

---

## After Phase 3: Decide on Phase 4

Once Phases 1-3 are complete, decide whether to:

**Option A**: Create new spec (002) for Phase 4 utilities
- Design System (refactor to use panel components)
- Error Handling (apply to all components)
- Performance (apply optimizations)
- Security (apply auth and validation)

**Option B**: Add Phase 4 tasks to spec 001
- Smaller, focused tasks (4-8 hours each)
- Each task = implement AND apply utility

---

## Task Execution Rules

For each task:

1. ✅ Write/modify code
2. ✅ Integrate into UI
3. ✅ Manual test (can user access it?)
4. ✅ Write task summary
5. ❌ **NO automated tests** (only in Phase 3)

---

## Success Metrics

After Phase 1:
- [ ] Users can create workflows
- [ ] Users can add and configure nodes
- [ ] Users can import entities
- [ ] Users can start runs

After Phase 2:
- [ ] Users can access all settings pages
- [ ] Users can view dashboard
- [ ] Users can manage runs

After Phase 3:
- [ ] All manual tests pass
- [ ] All automated tests pass
- [ ] No critical bugs

---

## Next Steps

1. **Start with Task 1.1** (Integrate NodePalette)
2. Complete Phase 1 tasks in order
3. Write task summary after each task
4. Update spec README with progress
5. Move to Phase 2 after Phase 1 complete

---

## Notes

- Each task is 1-3 hours (small and focused)
- Integration is part of each task
- No tests until Phase 3
- Write summaries as you go
- Update spec README after each task

---

## Questions?

If unsure about:
- How to integrate a component → Check existing integrations
- Where to add navigation → Look at main nav component
- How to test → Follow manual testing checklist

Refer to:
- [Task Completion Standards](../../steering/task-completion-standards.md)
- [Spec Creation Guide](../../steering/spec-creation-guide.md)
- [Implementation Audit](../../stitch-run/WORKFLOW_UI_IMPLEMENTATION_AUDIT.md)
