# Implementation Plan

Each task produces a visible result that can be tested immediately.

- [x] 1. Fix BMC seed with demo workflow nodes
  - Verify and fix `scripts/seed-bmc.ts` to create proper 13-section BMC
  - Add demo workflow nodes inside sections (e.g., "Email Campaign" in Marketing, "Demo Call" in Sales)
  - Add edges connecting workflow nodes (NOT sections - sections are containers)
  - Create script to spawn 3 test entities (Monica, Ross, Rachel) at workflow nodes
  - Run seed script and verify BMC renders with sections, workflow nodes, and entities
  - **Visual Result**: BMC with 12 sections containing workflow nodes, with 3 entity dots at nodes
  - _Requirements: 5A.1, 5A.2, 4.1_

- [x] 2. Show static entity dots on BMC
  - Check how Entities are currently implemented
  - If needed, create `src/hooks/useCanvasEntities.ts` hook (fetch only, no realtime yet)
  - If needed, create `src/components/canvas/entities/StaticEntityDot.tsx` component
  - Use existing `getEntityNodePosition` to calculate positions
  - Render entity dots at their `current_node_id` positions
  - Add to `BMCCanvas.tsx`
  - **Visual Result**: Entity dots appear at correct section positions on BMC
  - _Requirements: 4.2, 9.1, 9.3_

- [x] 3. Add entity click interactions
  - Add click handler to select entity
  - Display entity info panel on click (name, type, current position)
  - **Visual Result**: Hover shows name, click shows entity details
  - _Requirements: 9.2, 9.5_

- [x] 4. Make entity dots update in real-time
  - Check if any realtime entity hooks have been implemented before
  - Update `useCanvasEntities` hook to subscribe to `stitch_entities` changes
  - Handle INSERT, UPDATE, DELETE events
  - Test by manually updating entity position in database
  - **Visual Result**: Entity dots move when database is updated
  - _Requirements: 11.1, 11.2, 11.4_

- [x] 5. Animate entity movement along edges
  - Check if any animation has been implemented before. 
  - Update `StaticEntityDot` to `AnimatedEntityDot`
  - Detect when `current_node_id` changes
  - Animate dot from old position to new position using framer-motion
  - Use existing `getEntityEdgePosition` for edge travel
  - **Visual Result**: Entity dots smoothly animate when moved
  - _Requirements: 5.2, 5.3, 5.5_



- [x] 6. Show entity clustering when multiple at same node
  - Update position calculation to handle multiple entities at one node
  - Spread entities horizontally below node (existing logic in `getEntityNodePosition`)
  - Test by moving multiple entities to same section
  - **Visual Result**: Multiple entities cluster without overlapping
  - _Requirements: 4.3, 9.4_

- [x] 7. Add journey history panel
  - Check if Journey history has been implemented before
  - If needed, create `src/components/canvas/JourneyHistoryPanel.tsx`
  - Fetch journey events using existing `getJourneyHistory` function
  - Display events with timestamps and dwell times
  - Open panel when entity is clicked
  - **Visual Result**: Click entity shows its journey history
  - _Requirements: 9.5, 10.1, 10.2, 10.3, 10.5_

- [x] 8. Show run status indicators on nodes
  - Check if the runnins status has been previously implemented - If not, create `src/hooks/useRunStatus.ts` to subscribe to `stitch_runs`
  - Create `src/components/canvas/nodes/NodeStatusIndicator.tsx`
  - Show pulsing blue for "running", green glow for "completed", red for "failed"
  - Add to BMC canvas when a run is active
  - Test by running a workflow
  - **Visual Result**: Nodes pulse/glow based on execution status
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 8.2, 8.3, 8.4_

- [x] 9. Add error tooltips for failed nodes
  - Add hover tooltip to failed nodes showing error message
  - Style with red border and error icon
  - **Visual Result**: Hover over failed node shows error details
  - _Requirements: 8.5_

- [x] 10. Create demo mode API endpoint
  - Create `src/app/api/demo/start/route.ts`
  - Spawn 3 demo entities at different sections
  - Trigger workflows for each entity with staggered delays
  - Return demo session info
  - Test with curl/Postman
  - **Visual Result**: API call spawns entities and starts workflows
  - _Requirements: 6.1, 6.2, 6.3, 13.1, 13.2, 13.3_

- [x] 11. Add demo mode button to BMC
  - Create `src/components/canvas/DemoModeButton.tsx`
  - Call demo API on click
  - Show loading state while demo runs
  - Add button to BMC canvas toolbar
  - **Visual Result**: Click button to see automated demo with entities moving
  - _Requirements: 6.1, 6.4, 6.5, 13.4, 13.5_

- [ ] 12. Polish and final testing
  - Test all interactions (hover, click, drag)
  - Test with multiple simultaneous runs
  - Test navigation between BMC and workflow views
  - Verify entity positions persist across navigation
  - **Visual Result**: Smooth, polished living BMC experience
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
