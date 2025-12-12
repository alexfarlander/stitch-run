# Implementation Plan

- [x] 1. Implement SVG path-based entity positioning
  - Create enhanced position calculation functions that use SVG path interpolation
  - Update EntityDot to use path-based positioning
  - Update EntityOverlay to provide path elements to position calculator
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 1.1 Write property test for SVG path following accuracy
  - **Property 1: SVG Path Following Accuracy**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* 1.2 Write unit tests for edge position edge cases
  - Test progress = 0.0 positions at source
  - Test progress = 1.0 positions at target
  - Test progress = 0.5 positions at midpoint
  - _Requirements: 1.4, 1.5, 1.6_

- [x] 2. Create centralized subscription management system
  - Implement useRealtimeSubscription hook with channel lifecycle management
  - Add subscription registry with reference counting
  - Update existing hooks to use centralized subscription
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ]* 2.1 Write unit tests for subscription lifecycle
  - Test component mount creates subscription
  - Test component unmount cleans up subscription
  - Test multiple components share single channel
  - Test callback invocation on updates
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Implement idempotent demo session management
  - Create DemoManager class with cleanup logic
  - Update demo API endpoint to use DemoManager
  - Add metadata tagging for demo entities
  - Implement cleanup endpoint for demo sessions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 3.1 Write property test for demo session idempotency
  - **Property 2: Demo Session Idempotency**
  - **Validates: Requirements 3.2, 3.3**

- [ ]* 3.2 Write unit tests for demo entity management
  - Test existing demo entities are checked
  - Test existing demo entities are deleted
  - Test new entities have demo metadata
  - Test entity filtering excludes demo entities
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 4. Implement type-safe journey event handling
  - Define discriminated union types for journey events
  - Create type guards and normalization functions
  - Update JourneyHistoryPanel to use typed events
  - Remove all `any` types from journey event processing
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 4.1 Write property test for journey event type safety
  - **Property 3: Journey Event Type Safety**
  - **Validates: Requirements 4.2, 4.5**

- [ ]* 4.2 Write unit tests for journey event handling
  - Test database event normalization
  - Test fallback event normalization
  - Test type guards work correctly
  - Test display handles both event types
  - _Requirements: 4.2, 4.5_

- [ ] 5. Optimize entity position calculations with memoization
  - Create useEntityPosition hook with precise dependencies
  - Update EntityOverlay to use per-entity memoization
  - Separate viewport transformation from position calculation
  - Add position cache for unchanged entities
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 5.1 Write unit tests for memoization behavior
  - Test unchanged entities don't recalculate
  - Test memoization uses correct dependencies
  - Test viewport changes only affect screen coords
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 5.2 Write performance tests for entity rendering
  - Test 100 entities render within 16ms
  - Test viewport changes don't recalculate all entities
  - _Requirements: 5.5_

- [ ] 6. Implement user-visible error handling
  - Update RunStatusOverlay to display error messages
  - Add error styling and icons
  - Ensure all errors are logged for debugging
  - Remove silent failures that return null
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 6.1 Write property test for error visibility
  - **Property 5: Error Visibility**
  - **Validates: Requirements 6.2, 6.4**

- [ ]* 6.2 Write unit tests for error handling
  - Test error messages are displayed
  - Test error messages are user-friendly
  - Test errors are logged
  - Test no silent failures
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 7. Implement node status transition validation
  - Create status state machine with valid transitions
  - Implement validateTransition function
  - Add StatusTransitionError class
  - Update node status update logic to validate transitions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]* 7.1 Write property test for status transition validation
  - **Property 4: Status Transition Validation**
  - **Validates: Requirements 7.2, 7.5**

- [ ]* 7.2 Write unit tests for status transitions
  - Test completed to pending is rejected
  - Test failed to running is allowed (retry)
  - Test all valid transitions succeed
  - Test invalid transitions preserve state
  - _Requirements: 7.3, 7.4, 7.5, 7.6_

- [ ] 8. Add accessibility support for node status indicators
  - Update NodeStatusIndicator with ARIA labels
  - Add role="status" attribute
  - Add aria-live="polite" attribute
  - Format labels as "Node status: {status}"
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 8.1 Write property test for ARIA label presence
  - **Property 6: ARIA Label Presence**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [ ]* 8.2 Write unit tests for accessibility
  - Test ARIA label format
  - Test role attribute presence
  - Test aria-live attribute presence
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 9. Eliminate code duplication in BMC generation
  - Move BMC generation logic from scripts to lib/seeds
  - Update scripts to import from lib/seeds
  - Remove duplicate BMC structure definitions
  - Verify scripts contain only orchestration logic
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Refactor demo mode for separation of concerns
  - Extract DemoManager class from DemoModeButton
  - Create useDemoManager hook
  - Update DemoModeButton to delegate to DemoManager
  - Ensure button only handles UI rendering
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integration testing and verification
  - Test entity visualization with real React Flow context
  - Test subscription management across multiple components
  - Test demo mode end-to-end flow
  - Verify no memory leaks in subscriptions
  - _Requirements: All_

- [ ]* 12.1 Write integration tests for entity visualization
  - Test EntityOverlay with EntityDot integration
  - Test position updates trigger re-renders
  - Test viewport changes optimization

- [ ]* 12.2 Write integration tests for subscription management
  - Test multiple components sharing subscriptions
  - Test channel cleanup on unmount
  - Test update propagation to all subscribers

- [ ]* 12.3 Write integration tests for demo mode
  - Test complete demo flow from button to spawn
  - Test cleanup of previous demo entities
  - Test workflow triggering for demo entities

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
