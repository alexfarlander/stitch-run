# Implementation Plan: Workflow Observability

## Overview

This implementation plan converts the workflow observability design into a series of focused tasks that build incrementally. The plan prioritizes integration of existing components over creating new ones, as most observability features already exist but need proper wiring and verification.

## Task List

- [ ] 1. Add Dashboard Navigation to Canvas Page
  - Import DashboardButton component into canvas page
  - Add button to canvas header/toolbar area
  - Position button appropriately in UI layout
  - Test navigation to dashboard works correctly
  - _Requirements: 3.1, 3.2_


- [ ] 2. Verify Node Output Panel Integration
  - Test NodeOutputPanel integration in RunViewer
  - Verify click handler works for completed nodes
  - Test JSON formatting with various data types
  - Verify copy functionality works correctly
  - Test panel close behavior (X button, outside click, escape)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_


- [ ] 3. Verify Journey Timeline Integration
  - Test JourneyTimelinePanel integration in EntityListPanel
  - Verify timeline displays all journey events correctly
  - Test event click highlighting on canvas
  - Verify pagination works with large event lists
  - Test real-time updates when entity positions change
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


- [ ] 4. Verify Dashboard Analytics Functionality
  - Test WorkflowDashboard displays all required metrics
  - Verify entity distribution chart renders correctly
  - Test conversion rate calculations are accurate
  - Verify time range filtering works
  - Test export functionality for all data types
  - _Requirements: 3.3, 3.4, 3.5, 5.1, 5.2, 5.3_


- [x] 5. Verify Real-time Updates
  - Test entity position changes update timeline automatically
  - Verify dashboard metrics update when runs complete
  - Test node output availability updates in real-time
  - Verify user context is maintained during updates
  - Test graceful degradation when real-time connections fail
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [x] 6. Add Loading State Consistency
  - Verify loading indicators appear for all async operations
  - Test loading states for timeline data fetching
  - Verify loading states for dashboard data loading
  - Test loading states during export operations
  - Ensure loading states are visually consistent
  - _Requirements: 2.5, 5.4_


- [x] 7. Handle Edge Cases and Error States
  - Test behavior when nodes have no output data
  - Verify error handling for timeline loading failures
  - Test dashboard behavior with no workflow data
  - Verify export error handling and user feedback
  - Test empty states for all observability features
  - _Requirements: 1.5, 5.5_

- [ ] 8. End-to-End Integration Testing
  - Test complete user workflow from canvas to dashboard
  - Verify all observability features work with real data
  - Test performance with large datasets
  - Verify cross-component interactions work correctly
  - Test responsive design on different screen sizes
  - _All Requirements_

- [ ] 9. Checkpoint - Ensure all tests pass, ask the user if questions arise

## Task Details

### Task 1: Add Dashboard Navigation to Canvas Page

**Estimated Time**: 1 hour

**Files to Modify**:
- `src/app/canvas/[id]/page.tsx`

**Implementation Steps**:
1. Import `DashboardButton` from `@/components/dashboard/DashboardButton`
2. Add button to canvas header area (top-right suggested)
3. Ensure button only shows for workflow canvases (not BMC or section)
4. Test navigation works correctly

**Acceptance Criteria**:
- Dashboard button visible on canvas page
- Button navigates to correct dashboard URL
- Button only appears for appropriate canvas types
- Button styling matches existing UI

### Task 2: Verify Node Output Panel Integration

**Estimated Time**: 2 hours

**Files to Check**:
- `src/components/RunViewer.tsx`
- `src/components/runs/NodeOutputPanel.tsx`

**Verification Steps**:
1. Navigate to run view with completed nodes
2. Click on completed nodes to verify output panel opens
3. Test with various JSON data types and sizes
4. Verify copy button copies complete JSON
5. Test panel close behavior (X, outside click, escape)

**Acceptance Criteria**:
- Output panel opens for completed nodes only
- JSON data displays with syntax highlighting
- Copy functionality works correctly
- Panel closes properly with all methods

### Task 3: Verify Journey Timeline Integration

**Estimated Time**: 2 hours

**Files to Check**:
- `src/components/canvas/entities/EntityListPanel.tsx`
- `src/components/entities/JourneyTimelinePanel.tsx`

**Verification Steps**:
1. Open entity list panel on canvas with entities
2. Select entity to open detail dialog
3. Click timeline tab to verify timeline displays
4. Click timeline events to verify canvas highlighting
5. Test with entities having many events (pagination)

**Acceptance Criteria**:
- Timeline tab appears in entity detail dialog
- All journey events display with correct information
- Event clicks highlight corresponding canvas elements
- Pagination works for large event lists

### Task 4: Verify Dashboard Analytics Functionality

**Estimated Time**: 3 hours

**Files to Check**:
- `src/components/dashboard/WorkflowDashboard.tsx`
- `src/app/canvas/[id]/dashboard/page.tsx`

**Verification Steps**:
1. Navigate to dashboard via new navigation button
2. Verify all key metrics display correctly
3. Test entity distribution chart with real data
4. Verify conversion rate calculations
5. Test export functionality for all data types

**Acceptance Criteria**:
- Dashboard loads and displays all required metrics
- Charts render correctly with real data
- Time range filtering works
- Export generates proper CSV files

### Task 5: Verify Real-time Updates

**Estimated Time**: 2 hours

**Files to Check**:
- Real-time subscription hooks
- Component update behavior

**Verification Steps**:
1. Open multiple views (timeline, dashboard, run viewer)
2. Trigger entity position changes
3. Complete workflow runs
4. Verify all views update automatically
5. Test connection failure scenarios

**Acceptance Criteria**:
- Timeline updates when entity positions change
- Dashboard updates when runs complete
- Node outputs become available in real-time
- User selections maintained during updates
- Graceful degradation on connection failure

### Task 6: Add Loading State Consistency

**Estimated Time**: 1 hour

**Files to Check**:
- All observability components

**Verification Steps**:
1. Test loading states for timeline data
2. Verify dashboard loading indicators
3. Test export operation loading states
4. Ensure visual consistency across components

**Acceptance Criteria**:
- Loading indicators appear for all async operations
- Loading states are visually consistent
- Loading indicators disappear when operations complete

### Task 7: Handle Edge Cases and Error States

**Estimated Time**: 2 hours

**Files to Check**:
- Error handling in all observability components

**Verification Steps**:
1. Test nodes with no output data
2. Simulate timeline loading failures
3. Test dashboard with empty workflow
4. Simulate export failures
5. Verify appropriate error messages

**Acceptance Criteria**:
- Appropriate messages for empty states
- Error states provide helpful feedback
- Users can recover from error conditions

### Task 8: End-to-End Integration Testing

**Estimated Time**: 3 hours

**Verification Steps**:
1. Create test workflow with real data
2. Test complete user journey through all observability features
3. Verify performance with realistic data volumes
4. Test on different browsers and screen sizes

**Acceptance Criteria**:
- All observability features work together seamlessly
- Performance is acceptable with realistic data
- Features work across different environments
- User experience is smooth and intuitive

## Success Criteria

### For Each Task
- [ ] Code integrated (components imported and rendered where needed)
- [ ] Feature accessible (users can navigate to and use the feature)
- [ ] Feature works (core functionality operates correctly)
- [ ] Manual testing completed (verified with real data)
- [ ] Task summary written (documents what was accomplished)

### For Overall Spec
- [ ] Dashboard accessible from canvas page
- [ ] Node output viewing works for completed nodes
- [ ] Journey timeline displays entity progress
- [ ] Real-time updates work across all components
- [ ] Export functionality works for all data types
- [ ] Error handling provides good user experience
- [ ] Performance is acceptable with realistic data volumes

## Notes

- Most components already exist and are partially integrated
- Focus is on verification and completing integration gaps
- Test with real workflow data to ensure functionality works in practice
- Pay attention to performance with larger datasets
- Ensure consistent user experience across all observability features