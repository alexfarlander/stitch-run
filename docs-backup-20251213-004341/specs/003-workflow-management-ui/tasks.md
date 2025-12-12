# Implementation Plan: Workflow Management UI

## Overview

This plan focuses on integrating existing components to make features accessible to users. Code exists but needs to be wired up in the UI.

## Critical Rules

- ❌ NO tests during implementation (except Task 9)
- ✅ Write code, integrate, manual test, write summary
- ✅ Each task = 1-3 hours focused work

---

## Tasks

- [x] 1. Integrate NodePalette into WorkflowCanvas
  - Open src/components/canvas/WorkflowCanvas.tsx
  - Import NodePalette component
  - Add NodePalette to left sidebar of canvas
  - Wire up drag-and-drop to add nodes to canvas
  - Manual test: User can drag Worker/UX/Splitter/Collector nodes to canvas
  - Write task summary in summaries/task-01-node-palette.md
  - _Requirements: 2.1, 2.2_

- [x] 2. Integrate NodeConfigPanel into WorkflowCanvas
  - Open src/components/canvas/WorkflowCanvas.tsx
  - Import NodeConfigPanel component
  - Add state for selectedNodeId
  - Show panel when node is clicked (right side)
  - Wire up config changes to update node
  - Manual test: Click node opens config panel, changes update node, panel closes properly
  - Write task summary in summaries/task-02-node-config.md
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 3. Integrate EntityImportButton into WorkflowCanvas
  - Open src/components/canvas/WorkflowCanvas.tsx
  - Import EntityImportButton component
  - Add button to canvas toolbar (top-right area)
  - Wire up onClick to open EntityImportModal
  - Manual test: Button visible, opens modal, CSV and manual import work, entities persist to database
  - Write task summary in summaries/task-03-entity-import.md
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8_

- [x] 4. Integrate EntityListPanel into Canvas Page
  - Open src/app/canvas/[id]/page.tsx
  - Import EntityListPanel component
  - Add panel to page layout (left side, collapsible)
  - Wire up entity selection state
  - Verify run controls are integrated
  - Manual test: Panel visible, shows entities, search/filter works, bulk actions work, run controls functional
  - Write task summary in summaries/task-04-entity-list.md
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 5.1, 5.2_

- [ ] 5. Create Settings Navigation Component
  - Create src/components/navigation/SettingsNav.tsx
  - Add navigation links to Functions, Schedules, Webhooks, Email Replies pages
  - Find main navigation component and add Settings link
  - Manual test: Settings link in main nav, all 4 pages accessible, current page highlighted
  - Write task summary in summaries/task-05-settings-nav.md
  - _Requirements: 6.1, 7.1, 8.1, 9.1_

- [ ] 6. Add Dashboard Link to Canvas Page
  - Open src/app/canvas/[id]/page.tsx
  - Add Dashboard button to canvas toolbar
  - Link to /canvas/[id]/dashboard
  - Manual test: Button visible, navigates to dashboard, dashboard shows metrics/charts
  - Write task summary in summaries/task-06-dashboard-link.md
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 7. Verify Run Controls Integration
  - Open src/components/canvas/entities/EntityListPanel.tsx
  - Verify RunControlPanel is imported and rendered
  - Verify RunHistoryPanel is integrated
  - Verify RunStatusBadge appears on entities
  - Manual test: Run controls visible, single/bulk runs work, history visible, status badges appear
  - Write task summary in summaries/task-07-run-controls.md (verification report)
  - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [ ] 8. Manual Testing Checklist
  - Test Canvas Management: create workflow, add nodes, configure, connect edges
  - Test Entity Management: import entities, search, filter, start runs, view history
  - Test Settings: navigate to all settings pages
  - Test Dashboard: view metrics and charts
  - Write task summary in summaries/task-08-manual-testing.md with pass/fail for each test
  - Document any bugs found
  - _Requirements: All_

- [ ] 9. Run Automated Tests
  - Run npm test and document results
  - Run npm run build and document results
  - Run eslint and document results
  - Fix ONLY critical errors that block functionality
  - Document remaining issues for future tasks
  - Write task summary in summaries/task-09-automated-testing.md with results and issues
  - Note: This is the ONLY task where automated tests are run
  - _Requirements: All_

---

## Task Execution Guidelines

Each task must include:
1. Code implementation
2. UI integration (make accessible)
3. Manual testing
4. Task summary in summaries/task-[number]-[name].md

See [Task Completion Standards](../../steering/task-completion-standards.md) for details.

---

## Progress

- Phase 1 (Core Features): 0/4 complete
- Phase 2 (Settings/Navigation): 0/3 complete  
- Phase 3 (Testing): 0/2 complete
- Overall: 0/9 complete (0%)

---

## Success Criteria

After Phase 1: Users can create workflows, add/configure nodes, import entities, start runs
After Phase 2: Users can access settings pages, view dashboard, manage runs
After Phase 3: All tests pass, no critical bugs

---

## References

- [Requirements](requirements.md)
- [Design](design.md)
- [Task Completion Standards](../../steering/task-completion-standards.md)
- [Implementation Audit](../../stitch-run/WORKFLOW_UI_IMPLEMENTATION_AUDIT.md)
