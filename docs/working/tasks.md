# Implementation Plan

This plan follows the priority order from roadmap-4.md, focusing on high-impact, visible features first. Each task produces an immediate visual result that can be demonstrated.

## Priority 1: The Pulse (Node Status Animations)

- [ ] 1. Add enhanced node status animations
  - Add CSS keyframes to `stitch-run/src/app/globals.css` for pulse-running, flash-completed, flash-failed
  - Update `getStatusStyles` function in `stitch-run/src/components/canvas/nodes/BaseNode.tsx`
  - Replace opacity-based animate-pulse with box-shadow animations
  - Test by running a workflow and observing node animations
  - **Visual Result**: Nodes glow with amber pulse when running, flash green on completion, flash red on failure
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

## Priority 2: M-Shape Drill-Down (Enhanced Navigation)

- [ ] 2. Enhance drill-down animations
  - Update `stitch-run/src/components/canvas/CanvasRouter.tsx` animation props
  - Change from scale 0.98 to dramatic zoom effects (scale 2→1 for drill-in, 0.5→1 for drill-out)
  - Add direction tracking to navigation context
  - Update animation duration to 300ms with ease-in-out
  - Add opacity fade (0→1) during transitions
  - **Visual Result**: Drilling into sections feels like "diving in", going back feels like "surfacing"
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 3. Add drill-down visual cues to section nodes
  - Update `stitch-run/src/components/canvas/nodes/SectionNode.tsx`
  - Add Layers icon from lucide-react when `data.child_canvas_id` exists
  - Add tooltip "Double-click to drill down"
  - Style icon with hover highlight effect
  - **Visual Result**: Sections with workflows show a layers icon, making it clear they can be drilled into
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 4. Implement "Back to Surface" button
  - Check if CanvasRouter already has DetailCanvas implementation
  - If not, implement DetailCanvas component in `stitch-run/src/components/canvas/CanvasRouter.tsx`
  - Add "Back to Surface" button that calls `goBack()` from useCanvasNavigation
  - Style button prominently in toolbar
  - Hide button when at top-level BMC
  - **Visual Result**: Clear navigation button to return from workflow to BMC view
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

## Priority 3: AI Assistant (Workflow Creation)

- [ ] 5. Create AI Assistant panel component
  - Create `stitch-run/src/components/panels/AIAssistantPanel.tsx`
  - Implement chat UI with message history display
  - Add toggle button (MessageSquare icon) in bottom-right corner
  - Style as fixed bottom-right panel (similar to chat widget)
  - Add input field and send button
  - **Visual Result**: Chat icon appears in corner, clicking opens AI chat panel
  - _Requirements: 8.1_

- [ ] 6. Implement AI request handling
  - Add message submission handler that calls `/api/ai-manager`
  - Include canvasId and conversation history in request
  - Display loading state while waiting for response
  - Add assistant messages to conversation history
  - **Visual Result**: User can type messages and see AI responses
  - _Requirements: 8.2, 9.1, 20.1_

- [ ] 7. Wire AI graph updates into canvas
  - Add `onGraphUpdate` callback prop to AIAssistantPanel
  - Handle `createWorkflow` action by adding nodes/edges to React Flow
  - Handle `modifyWorkflow` action by updating existing graph
  - Use `setNodes` and `setEdges` from useNodesState/useEdgesState
  - **Visual Result**: AI-created workflows appear on canvas immediately
  - _Requirements: 8.3, 8.4, 8.5_

- [ ] 8. Add AI validation and error handling
  - Validate that AI-created nodes use valid worker types from registry
  - Validate that AI-created edges connect to existing nodes
  - Display error messages in chat for invalid operations
  - Add conversation context cleanup on panel close
  - **Visual Result**: AI operations are validated, errors shown in chat
  - _Requirements: 9.3, 9.4, 9.5, 20.4, 20.5_

- [ ] 9. Integrate AI Assistant into BMC and Workflow canvases
  - Add AIAssistantPanel to `stitch-run/src/components/canvas/BMCCanvas.tsx`
  - Add AIAssistantPanel to `stitch-run/src/components/canvas/WorkflowCanvas.tsx`
  - Pass canvasId and onGraphUpdate callback
  - **Visual Result**: AI assistant available on all canvas views
  - _Requirements: 8.1, 8.5_

## Priority 4: Edge Animation (Data Flow Visualization)

- [ ] 10. Add edge traversal animation system
  - Update `stitch-run/src/components/canvas/edges/JourneyEdge.tsx`
  - Add `isTraversing` prop to JourneyEdgeData interface
  - Render second path element with cyan gradient when isTraversing=true
  - Add CSS animation for stroke-dashoffset pulse effect (500ms duration)
  - **Visual Result**: Edges show glowing cyan pulse when entities traverse them
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 11. Create useEdgeTraversal hook
  - Create `stitch-run/src/hooks/useEdgeTraversal.ts`
  - Subscribe to `stitch_journey_events` table for edge_start events
  - Return Map<edgeId, isTraversing>
  - Set timeout to clear traversing state after 500ms
  - Handle multiple concurrent traversals on same edge
  - **Visual Result**: Hook provides real-time edge traversal state
  - _Requirements: 1.4, 1.5_

- [ ] 12. Wire useEdgeTraversal into canvases
  - Update `stitch-run/src/components/canvas/BMCCanvas.tsx` edges memo
  - Update `stitch-run/src/components/canvas/WorkflowCanvas.tsx` edges memo
  - Add `isTraversing` to edge data from useEdgeTraversal map
  - **Visual Result**: Edges pulse when entities move across them
  - _Requirements: 1.1, 1.4_

- [ ] 13. Synchronize edge and entity animations
  - Ensure edge pulse starts when entity movement begins
  - Ensure both animations complete at same time
  - Use cinematic mode duration for both animations
  - Handle animation disabling for both entity and edge
  - **Visual Result**: Edge pulses and entity movement are perfectly synchronized
  - _Requirements: 17.1, 17.2, 17.4, 17.5_

## Priority 5: Node Config Panel (Interactive Editing)

- [ ] 14. Create NodeConfigPanel component
  - Create `stitch-run/src/components/panels/NodeConfigPanel.tsx`
  - Use Sheet component from shadcn/ui for right-side panel
  - Add props: nodeId, canvasId, onClose, onSave
  - Fetch node configuration on panel open
  - Import WORKER_DEFINITIONS from worker registry
  - **Visual Result**: Panel structure ready to display node configuration
  - _Requirements: 3.1, 12.1_

- [ ] 15. Implement dynamic form generation
  - Add worker type dropdown populated from WORKER_DEFINITIONS keys
  - Generate form fields dynamically from selected worker's input schema
  - Handle field types: string, number, boolean
  - Add labels and placeholders from schema
  - **Visual Result**: Form fields update when worker type changes
  - _Requirements: 3.2, 3.3, 12.2, 12.3, 12.4_

- [ ] 16. Add real-time validation
  - Implement validateField function for required fields and patterns
  - Validate on input change (real-time)
  - Validate on field blur (final check)
  - Display error messages below fields immediately
  - Clear errors when field becomes valid
  - **Visual Result**: Validation errors appear as user types, clear when fixed
  - _Requirements: 13.1, 13.2, 18.1, 18.2, 18.3, 18.4_

- [ ] 17. Implement save and cancel operations
  - Disable save button when validation errors exist
  - Enable save button when all fields valid
  - On save: update node in database via API, close panel
  - On cancel/escape: close panel without saving
  - Show success indicator when all fields valid
  - **Visual Result**: Save updates node config, cancel preserves original
  - _Requirements: 3.4, 3.5, 13.3, 13.4, 13.5, 18.5_

- [ ] 18. Wire NodeConfigPanel into WorkflowCanvas
  - Add state for selectedNodeId in `stitch-run/src/components/canvas/WorkflowCanvas.tsx`
  - Add onNodeClick handler to ReactFlow that sets selectedNodeId
  - Render NodeConfigPanel with selected node
  - Implement handleSaveNodeConfig to update database
  - **Visual Result**: Clicking nodes opens config panel, editing works
  - _Requirements: 3.1, 3.4_

- [ ] 19. Create node configuration API endpoint
  - Create `stitch-run/src/app/api/canvas/[id]/nodes/[nodeId]/config/route.ts`
  - Implement PUT endpoint to update node configuration
  - Validate worker type and inputs
  - Update node in database
  - **Visual Result**: API endpoint for saving node configurations
  - _Requirements: 3.4, 12.5_

## Priority 6: Entity Clustering (Scalability)

- [ ] 20. Create EntityCluster component
  - Create `stitch-run/src/components/canvas/entities/EntityCluster.tsx`
  - Render circular badge with entity count
  - Add Popover from shadcn/ui for entity list
  - Display avatar and name for each entity in popover
  - Position cluster at node location
  - **Visual Result**: Cluster badge shows count, clicking shows entity list
  - _Requirements: 4.2, 4.3_

- [ ] 21. Implement clustering logic in EntityOverlay
  - Update `stitch-run/src/components/canvas/entities/EntityOverlay.tsx`
  - Group entities by current_node_id
  - For groups with >5 entities, render EntityCluster
  - For groups with <=5 entities, render individual EntityDots
  - Handle real-time updates to cluster counts
  - **Visual Result**: Large entity groups show as badges, small groups show as dots
  - _Requirements: 4.1, 4.4, 4.5_

- [ ] 22. Add manual entity movement via drag-and-drop
  - Add drag handlers to EntityDot and EntityCluster components
  - Implement drop validation (target node exists, edge exists)
  - Create API endpoint for manual entity movement
  - Record journey event with type "manual_move"
  - Animate movement along edge after drop
  - **Visual Result**: Users can drag entities to move them between nodes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 23. Create entity movement API endpoint
  - Create `stitch-run/src/app/api/entities/[entityId]/move/route.ts`
  - Implement POST endpoint with targetNodeId parameter
  - Validate target node exists and edge exists
  - Update entity current_node_id in database
  - Create journey event with manual_move type
  - Return updated entity and journey event
  - **Visual Result**: API endpoint for manual entity movement
  - _Requirements: 5.2, 5.4, 14.1, 14.2, 14.3, 14.4, 14.5_

## Priority 7: Time Travel Debugger (Advanced Feature)

- [ ] 24. Create TimelineScrubber component
  - Create `stitch-run/src/components/canvas/TimelineScrubber.tsx`
  - Fetch all journey events for runId
  - Render horizontal Slider component from shadcn/ui
  - Set min/max to first/last event timestamps
  - Call onTimestampChange when slider moves
  - **Visual Result**: Slider appears at bottom of workflow view
  - _Requirements: 6.1_

- [ ] 25. Add timeline event markers
  - Render markers for node_complete and node_failure events
  - Position markers along timeline based on timestamp
  - Add tooltips showing event details on hover
  - Implement marker click to jump to that timestamp
  - Cluster nearby markers to prevent overlap
  - **Visual Result**: Important events shown as markers on timeline
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 26. Create useTimelineNodeStates hook
  - Create `stitch-run/src/hooks/useTimelineNodeStates.ts`
  - Accept runId and timestamp parameters
  - Query journey events up to selected timestamp
  - Reconstruct node_states by processing events in order
  - Apply node_arrival → running, node_complete → completed, node_failure → failed
  - Return reconstructed node_states object
  - **Visual Result**: Hook provides historical node states
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 27. Wire TimelineScrubber into WorkflowCanvas
  - Add scrubTimestamp state to `stitch-run/src/components/canvas/WorkflowCanvas.tsx`
  - Use useTimelineNodeStates hook with scrubTimestamp
  - Render historical node states when scrubbing
  - Render TimelineScrubber at bottom of canvas
  - Add "Exit Time Travel" button to return to real-time
  - **Visual Result**: Moving slider changes node statuses to show past state
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 28. Create timeline API endpoints
  - Create `stitch-run/src/app/api/runs/[runId]/timeline/route.ts` for fetching events
  - Create `stitch-run/src/app/api/runs/[runId]/state/route.ts` for historical state
  - Implement efficient event querying with timestamp filters
  - Return reconstructed node states and entity positions
  - **Visual Result**: API endpoints for timeline functionality
  - _Requirements: 6.2, 6.3, 7.1_

## Final Polish

- [ ] 29. Performance optimization and testing
  - Test all animations maintain 60fps
  - Test with 100+ entities on canvas
  - Test timeline with 10,000+ events
  - Optimize real-time subscription handling
  - Add loading states for all async operations
  - **Visual Result**: Smooth, performant experience at scale
  - _Requirements: All performance-related requirements_

- [ ] 30. Error handling and edge cases
  - Add error boundaries for all new components
  - Handle network failures gracefully
  - Add retry logic for failed operations
  - Test with missing data and invalid states
  - Add comprehensive error logging
  - **Visual Result**: Robust error handling throughout
  - _Requirements: All error handling requirements_

- [ ] 31. Integration testing and documentation
  - Test all features work together
  - Test navigation between BMC and workflow views
  - Verify state preservation across navigation
  - Test demo mode with all new features
  - Update component documentation
  - **Visual Result**: Fully integrated, polished living canvas experience
  - _Requirements: All integration requirements_
