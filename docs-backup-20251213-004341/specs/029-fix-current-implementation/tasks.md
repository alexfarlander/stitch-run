# Implementation Plan

## Testing Libraries

The project already has these testing libraries installed:
- **vitest** - Test runner (already configured)
- **@testing-library/react** - React component testing
- **@testing-library/user-event** - User interaction simulation
- **fast-check** - Property-based testing (if needed)

Run tests with: `npm test` or `npm run test:watch`

## Testing Strategy

- Write tests ONLY for complex logic that's hard to verify manually
- Skip tests for simple UI changes (visual inspection is faster)
- Focus on critical paths: entity movement, database operations, error handling
- Use manual testing checklist for end-to-end verification

---

- [x] 1. Fix Entity Movement System
  - Replace framer-motion with simpler CSS-based animation
  - Add database persistence at movement start and completion
  - Implement basic retry logic for network failures
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.4, 9.5_

- [x] 1.1 Refactor entity movement to use CSS transitions
  - Remove framer-motion `animate()` calls from useEntityMovement hook
  - Implement simpler CSS transition-based movement
  - Write entity position to database at movement start
  - Write entity position to database at movement completion
  - Calculate positions using SVG path methods (getPointAtLength)
  - Update EntityDot component to use CSS transforms
  - Add basic retry logic (3 attempts with exponential backoff) for network failures
  - Handle interrupted movements by restoring from database on page load
  - Manually test: Start demo, verify entities reach destination without disappearing
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 9.2, 9.4_

- [x] 2. Fix Canvas Rendering and Stability
  - Split EntityOverlay to reduce re-renders
  - Add React.memo() optimizations
  - Fix z-index and pointer-events issues
  - _Requirements: 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.1 Refactor canvas rendering for stability
  - Split EntityOverlay: create TravelingEntitiesLayer for entities on edges only
  - Move entity badge rendering into node components (not overlay)
  - Wrap EntityDot with React.memo() to prevent unnecessary re-renders
  - Wrap node components with React.memo()
  - Add useMemo() for expensive position calculations
  - Add useCallback() for event handlers
  - Manually test: Run demo for 5+ minutes, verify no flickering or disappearing sections
  - _Requirements: 2.2, 2.3_

- [x] 2.2 Fix edge and layer interactions
  - Set pointer-events to 'none' on edge layer when opacity is 0
  - Set pointer-events to 'stroke' on edge paths when visible
  - Define explicit z-index values: nodes (10), edges (5), entity overlay (100)
  - Document z-index hierarchy in code comments
  - Manually test: Set edge visibility to 0%, verify nodes are clickable
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Implement Clickable Entity Badges
  - Make entity count badges clickable
  - Show entity list in popover
  - Connect to entity detail panel
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 Make entity badges fully interactive
  - Update EntityCountBadge: make button fully clickable with stopPropagation
  - Implement Radix UI Popover showing entity list
  - Display entity avatar, name, and type in popover
  - Only render badge when entity count > 0
  - Connect entity selection to panel (switch to entity tab, highlight entity)
  - Manually test: Click badge, verify popover opens with entity list, click entity, verify panel opens
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Fix Panel Tab Management
  - Remove automatic tab switching during demo
  - Only switch tabs on explicit user clicks
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.1 Fix panel tab switching logic
  - Remove useEffect that auto-switches to entity tab on selectedEntity change
  - Add userSelectedTab flag to track explicit user intent
  - Only switch to entity tab when user explicitly clicks entity or tab
  - Ensure demo events don't trigger tab switches
  - Manually test: Select Events tab, start demo, verify tab doesn't auto-switch
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Fix Section Navigation
  - Implement double-click to drill down
  - Update breadcrumbs
  - Preserve demo state
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5.1 Implement section drill-down navigation
  - Add onDoubleClick handler to section nodes
  - Navigate to section's workflow canvas
  - Handle sections without workflows gracefully (show message)
  - Update breadcrumb state to show hierarchy
  - Store demo state in context and restore after navigation
  - Manually test: Double-click section, verify navigation works, breadcrumbs update, demo continues
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Manual Testing - Verify All Fixes
  - Follow the manual testing instructions below
  - Verify all critical issues from TESTING_CHECKLIST_1.md are resolved
  - Ask user if any issues remain
  - **STATUS**: Ready for user testing - all implementation complete

- [ ] 7. Update testing checklist with fixes
  - Mark resolved issues in TESTING_CHECKLIST_1.md
  - Add notes about fixes implemented
  - Update status from ⚠️ to ✅ for fixed items
  - **STATUS**: Pending user testing results

---

## Manual Testing Instructions

Run these tests after completing all implementation tasks to verify the fixes work correctly.

### Setup
1. Start the development server: `npm run dev`
2. Open browser to http://localhost:3000
3. Navigate to the canvas page
4. Open browser DevTools console to watch for errors

### Test 1: Entity Movement Completion
**Issue:** Entities disappear mid-journey

**Steps:**
1. Click "Play" on Demo Control Panel
2. Watch entities move between nodes for 2-3 minutes
3. Count entities at start and after 2 minutes

**Expected:**
- All 13 entities remain visible throughout demo
- Entities reach their destination nodes (don't disappear mid-way)
- No console errors about missing entities

**Pass/Fail:** ___________

---

### Test 2: Canvas Stability (No Flickering)
**Issue:** Canvas flickers, sections disappear during demo

**Steps:**
1. Start demo (click "Play")
2. Watch canvas for 5+ minutes
3. Observe section nodes and overall canvas stability

**Expected:**
- No flickering or rapid visual changes
- All 13 section nodes remain visible throughout
- Canvas feels stable and smooth

**Pass/Fail:** ___________

---

### Test 3: Entity Count Badges Clickable
**Issue:** Can't click badges to see entities inside nodes

**Steps:**
1. Start demo and wait for entities to accumulate at nodes
2. Find a node with entity count badge (number in corner)
3. Click the badge
4. Click an entity in the list

**Expected:**
- Badge is clickable (cursor changes to pointer)
- Popover opens showing list of entities
- Each entity shows avatar, name, and type
- Clicking entity opens detail panel on right
- Badge only appears when entities are present (count > 0)

**Pass/Fail:** ___________

---

### Test 4: Edge Visibility Doesn't Block Clicks
**Issue:** Edge layer blocks clicking on nodes when at 0% opacity

**Steps:**
1. Look for edge visibility controls (if available)
2. Set edge visibility to 0% or minimum
3. Try clicking on various nodes

**Expected:**
- Nodes are fully clickable even when edges are invisible
- No "dead zones" where clicks don't register
- Node selection works normally

**Pass/Fail:** ___________

---

### Test 5: Panel Tab Doesn't Auto-Switch
**Issue:** Panel switches to Entity tab automatically during demo

**Steps:**
1. Open left side panel
2. Click on "Events" tab
3. Start demo (click "Play")
4. Watch panel for 2-3 minutes as entities move

**Expected:**
- Panel stays on Events tab throughout demo
- Tab only changes when you explicitly click a tab or entity
- Entity movements don't trigger automatic tab switches

**Pass/Fail:** ___________

---

### Test 6: Section Double-Click Navigation
**Issue:** Sections not double-clickable for drill-down

**Steps:**
1. Find a section node on the BMC canvas (e.g., "Marketing")
2. Double-click the section node
3. Check breadcrumb navigation at top
4. Note if demo is still running

**Expected:**
- Double-click navigates to section's workflow canvas
- Breadcrumbs update to show hierarchy (BMC > Section Name)
- Demo state preserved (if running, continues running)
- If section has no workflow, shows friendly message

**Pass/Fail:** ___________

---

### Test 7: Multi-Window Real-Time Sync
**Issue:** Verify real-time updates still work after changes

**Steps:**
1. Open canvas in two browser windows side-by-side
2. Start demo in one window
3. Watch both windows

**Expected:**
- Both windows show same entity positions
- Updates sync in real-time (< 1 second delay)
- No conflicts or desyncs

**Pass/Fail:** ___________

---

### Test 8: Demo Loop Continuity
**Issue:** Verify demo runs smoothly for extended periods

**Steps:**
1. Start demo
2. Let run for 10+ minutes (multiple loops)
3. Watch for performance degradation

**Expected:**
- Demo continues running without stopping
- No memory leaks or slowdowns
- No accumulating console errors
- Loop counter increments correctly

**Pass/Fail:** ___________

---

### Summary

**Total Tests:** 8  
**Passed:** ___________  
**Failed:** ___________

**Critical Issues Resolved:**
- [ ] Entities complete journey without disappearing
- [ ] Canvas stable, no flickering
- [ ] Entity badges clickable
- [ ] Edges don't block node clicks
- [ ] Panel tabs don't auto-switch
- [ ] Section navigation works

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
