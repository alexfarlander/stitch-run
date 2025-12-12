# Implementation Plan

- [x] 1. Add edge visibility state management to BMCCanvas
  - Add `showAllEdges` state (boolean) for manual toggle control
  - Add `selectedNodeId` state (string | null) for tracking selected nodes
  - Add `handleSelectionChange` callback to update selectedNodeId based on React Flow selection events
  - Wire up `onSelectionChange` prop to ReactFlow component
  - _Requirements: 2.1, 3.1, 3.2_

- [ ]* 1.1 Write unit tests for state management
  - Test initial state values
  - Test handleSelectionChange with single node selection
  - Test handleSelectionChange with multi-node or empty selection
  - _Requirements: 2.1, 3.1, 3.2_

- [ ]* 1.2 Write property test for toggle state inversion
  - **Property 9: Toggle state inversion**
  - **Validates: Requirements 2.1**

- [ ]* 1.3 Write property test for single node selection
  - **Property 10: Single node selection state**
  - **Validates: Requirements 3.1**

- [ ]* 1.4 Write property test for multi-selection state
  - **Property 11: Multi-selection or deselection state**
  - **Validates: Requirements 3.2**

- [x] 2. Create visibility toggle button UI
  - Add toggle button positioned at top-right (right-32 to avoid Demo button)
  - Implement conditional styling: cyan when active, slate when inactive
  - Add emoji icons: 👁 when active, 👁‍🗨 when inactive
  - Add tooltip with title attribute showing "Hide edges" or "Show all edges"
  - Wire onClick handler to toggle showAllEdges state
  - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [ ]* 2.1 Write unit tests for toggle button rendering
  - Test button renders with correct styling when showAllEdges is false
  - Test button renders with correct styling when showAllEdges is true
  - Test button click toggles state
  - _Requirements: 2.3, 2.4_

- [ ]* 2.2 Write property test for tooltip text correctness
  - **Property 13: Tooltip text correctness**
  - **Validates: Requirements 2.5**

- [x] 3. Implement edge visibility calculation logic
  - Update edges useMemo to include visibility conditions
  - Calculate isTraversing from traversingEdges map (already exists)
  - Calculate isConnectedToSelected by checking edge source/target against selectedNodeId
  - Calculate isVisible as: showAllEdges OR isTraversing OR isConnectedToSelected
  - Determine edgeType with fallback to 'journey' if not specified
  - Apply opacity style: 1 if visible, 0 if hidden
  - Apply transition style: 'opacity 0.3s ease-in-out'
  - Apply pointerEvents style: 'auto' if visible, 'none' if hidden
  - Set animated property to isTraversing value
  - Apply stroke color based on edge type: #06b6d4 for journey, #64748b for system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.3, 3.4, 4.2, 4.3, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

- [ ]* 3.1 Write property test for default hidden state
  - **Property 1: Default hidden state**
  - **Validates: Requirements 1.2, 4.5**

- [ ]* 3.2 Write property test for toggle override visibility
  - **Property 2: Toggle override visibility**
  - **Validates: Requirements 2.2**

- [ ]* 3.3 Write property test for selected node edge visibility
  - **Property 3: Selected node edge visibility**
  - **Validates: Requirements 3.3, 3.4**

- [ ]* 3.4 Write property test for traversing edge visibility
  - **Property 4: Traversing edge visibility and animation**
  - **Validates: Requirements 4.2, 4.3**

- [ ]* 3.5 Write property test for journey edge styling
  - **Property 5: Journey edge styling**
  - **Validates: Requirements 6.1, 6.2, 6.5**

- [ ]* 3.6 Write property test for system edge styling
  - **Property 6: System edge styling**
  - **Validates: Requirements 6.3, 6.4**

- [ ]* 3.7 Write property test for hidden edge interaction prevention
  - **Property 7: Hidden edge interaction prevention**
  - **Validates: Requirements 1.4**

- [ ]* 3.8 Write property test for consistent transition timing
  - **Property 8: Consistent transition timing**
  - **Validates: Requirements 1.3, 7.3, 7.4**

- [x] 4. Add SystemEdge pulse visibility override
  - Add shouldForceVisible constant based on isPulsing state
  - Wrap main render content in <g> element with conditional opacity override
  - Set group opacity to 1 when shouldForceVisible is true, undefined otherwise
  - This ensures pulsing system edges override parent opacity: 0 style
  - _Requirements: 5.3_

- [ ]* 4.1 Write property test for system edge pulse override
  - **Property 12: System edge pulse override**
  - **Validates: Requirements 5.3**

- [ ] 5. Visual verification checkpoint
  - Test default view: all edges should be hidden
  - Test toggle button: click to show all edges, click again to hide
  - Test node selection: click a node, verify connected edges appear
  - Test entity traversal: trigger demo mode, verify edges appear during entity movement
  - Test system edge firing: verify system edges pulse and become visible when firing
  - Verify smooth 0.3s opacity transitions
  - Verify journey edges are cyan and solid
  - Verify system edges are slate gray and dashed
  - _Requirements: All_
