# Implementation Plan

- [x] 1. Update type definitions and database schema
  - [x] 1.1 Update StitchEntity interface in types
    - Add `current_edge_id`, `edge_progress` fields to `StitchEntity` interface
    - Create `JourneyEvent` interface with all event types
    - Create `JourneyEdgeData` interface for edge statistics
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Create database migration for entity position tracking
    - Add `current_edge_id` and `edge_progress` columns to `stitch_entities` table
    - Add constraint to ensure progress is between 0.0 and 1.0
    - Add constraint to ensure position exclusivity (node OR edge, not both)
    - Add index on `current_edge_id` for efficient queries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

  - [x] 1.3 Create stitch_journey_events table
    - Create table with id, entity_id, event_type, node_id, edge_id, progress, metadata, timestamp
    - Add foreign key constraint to stitch_entities with CASCADE delete
    - Add indexes on entity_id, timestamp, event_type, edge_id
    - Enable Supabase realtime publication
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 1.4 Write property test for position mutual exclusivity
    - **Property 1: Position mutual exclusivity**
    - **Validates: Requirements 1.3**

  - [x] 1.5 Write property test for edge progress bounds
    - **Property 2: Edge progress bounds**
    - **Validates: Requirements 1.4**

- [x] 2. Implement entity movement API functions
  - [x] 2.1 Implement startJourney() function
    - Accept entityId and edgeId parameters
    - Validate entity exists and edge exists in workflow
    - Update entity: set current_edge_id, edge_progress to 0.0, clear current_node_id
    - Create journey event with type 'edge_start'
    - Use admin client for database operations
    - _Requirements: 6.1, 6.2, 3.1_

  - [ ]* 2.2 Write property test for startJourney
    - **Property 20: Start journey sets edge position**
    - **Validates: Requirements 6.2**

  - [ ]* 2.3 Write property test for journey event creation on edge start
    - **Property 7: Journey event creation on edge start**
    - **Validates: Requirements 3.1**

  - [x] 2.4 Implement moveAlongEdge() function
    - Accept entityId and progress parameters
    - Validate entity exists and is on an edge
    - Validate progress is between 0.0 and 1.0
    - Update entity: set edge_progress to new value
    - Optionally create journey event for significant milestones
    - _Requirements: 6.3, 6.4, 1.4_

  - [ ]* 2.5 Write property test for moveAlongEdge
    - **Property 21: Move along edge updates progress**
    - **Validates: Requirements 6.4**

  - [x] 2.6 Implement arriveAtNode() function
    - Accept entityId and nodeId parameters
    - Validate entity exists and node exists in workflow
    - Update entity: set current_node_id, clear current_edge_id and edge_progress
    - Create journey event with type 'node_arrival'
    - _Requirements: 6.5, 6.6, 2.5_

  - [ ]* 2.7 Write property test for arriveAtNode
    - **Property 6: Edge to node transition clears edge data**
    - **Validates: Requirements 2.5, 6.5, 8.3**

  - [ ]* 2.8 Write property test for journey event creation on node arrival
    - **Property 8: Journey event creation on node arrival**
    - **Validates: Requirements 3.2, 6.6**

  - [ ]* 2.9 Write property test for invalid entity ID error handling
    - **Property 22: Invalid entity ID error handling**
    - **Validates: Requirements 6.7**

- [x] 3. Implement entity query functions
  - [x] 3.1 Implement getEntitiesAtNode() function
    - Query stitch_entities where current_node_id matches
    - Return array of entities
    - _Requirements: 2.3_

  - [ ]* 3.2 Write property test for query by node correctness
    - **Property 4: Query by node correctness**
    - **Validates: Requirements 2.3**

  - [x] 3.3 Implement getEntitiesOnEdge() function
    - Query stitch_entities where current_edge_id matches
    - Return array of entities with progress values
    - _Requirements: 2.4_

  - [ ]* 3.4 Write property test for query by edge correctness
    - **Property 5: Query by edge correctness**
    - **Validates: Requirements 2.4**

  - [ ]* 3.5 Write property test for independent progress tracking
    - **Property 15: Independent progress tracking**
    - **Validates: Requirements 4.5**

  - [x] 3.6 Implement getJourneyHistory() function
    - Query stitch_journey_events where entity_id matches
    - Order by timestamp ascending
    - Return array of journey events
    - _Requirements: 3.4_

  - [ ]* 3.7 Write property test for journey history ordering
    - **Property 10: Journey history chronological ordering**
    - **Validates: Requirements 3.4**

  - [ ]* 3.8 Write property test for journey event completeness
    - **Property 11: Journey event completeness**
    - **Validates: Requirements 3.5**

- [ ] 4. Implement edge statistics functions
  - [ ] 4.1 Implement getEdgeStatistics() function
    - Query current entities on edge for current_entity_count
    - Query journey events with type 'edge_start' for total_entity_count
    - Calculate conversion rate from node_complete events
    - Return JourneyEdgeData object
    - Handle empty edge case (zero count, null conversion)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.2 Write property test for edge traffic count accuracy
    - **Property 12: Edge traffic count accuracy**
    - **Validates: Requirements 4.1**

  - [ ]* 4.3 Write property test for edge conversion rate calculation
    - **Property 13: Edge conversion rate calculation**
    - **Validates: Requirements 4.2**

  - [ ]* 4.4 Write property test for edge statistics completeness
    - **Property 14: Edge statistics completeness**
    - **Validates: Requirements 4.3**

  - [ ]* 4.5 Write unit test for empty edge statistics
    - Test edge with no traffic returns zero count and null conversion
    - _Requirements: 4.4_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement visual components for entity rendering
  - [ ] 6.1 Create EntityDot component
    - Accept entity, position, color, size, onClick props
    - Render as absolutely positioned colored circle
    - Use CSS for styling and hover effects
    - _Requirements: 5.1, 5.3_

  - [ ]* 6.2 Write unit test for EntityDot rendering
    - Test component renders with correct props
    - Test color mapping from entity_type
    - _Requirements: 5.1, 5.3_

  - [ ]* 6.3 Write property test for entity color mapping
    - **Property 17: Entity color mapping**
    - **Validates: Requirements 5.3**

  - [ ] 6.2 Create edge position interpolation utility
    - Implement function to get SVG path element by edge ID
    - Use path.getPointAtLength(totalLength * progress) for Bezier curve interpolation
    - Handle missing path element error
    - Return {x, y} coordinates
    - _Requirements: 5.2_

  - [ ] 6.3 Write property test for edge position interpolation
    - **Property 16: Edge position interpolation**
    - **Validates: Requirements 5.2**

  - [ ]* 6.4 Write unit test for missing edge path error handling
    - Test error thrown when edge path element not found
    - _Requirements: 5.2_

  - [ ] 6.5 Create overlap offset calculation utility
    - Accept array of entities at same position
    - Calculate circular offset pattern to prevent overlap
    - Return array of offset positions
    - _Requirements: 5.4_

  - [ ] 6.6 Write property test for overlap offset calculation
    - **Property 18: Overlap offset calculation**
    - **Validates: Requirements 5.4**

  - [ ] 6.7 Create EntityOverlay component
    - Accept runId, flowId, entities, nodes, edges props
    - Use React Flow's useReactFlow() hook for coordinate transformation
    - Subscribe to Supabase realtime for entity position updates
    - Render EntityDot for each entity at calculated position
    - Handle entities at nodes vs on edges differently
    - Apply overlap offsets for entities at same position
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 7.2_

  - [ ]* 6.8 Write property test for coordinate transformation consistency
    - **Property 19: Coordinate transformation consistency**
    - **Validates: Requirements 5.5**

  - [ ]* 6.9 Write integration test for EntityOverlay
    - Test component renders entities at correct positions
    - Test real-time updates trigger re-renders
    - _Requirements: 5.1, 5.2, 7.2_

- [ ] 7. Implement edge statistics display component
  - [ ] 7.1 Create EdgeStatsDisplay component
    - Accept edgeId, stats, position props
    - Render statistics overlay at edge midpoint
    - Display current count, total count, conversion rate
    - Style with semi-transparent background
    - _Requirements: 4.3_

  - [ ]* 7.2 Write unit test for EdgeStatsDisplay rendering
    - Test component displays all statistics fields
    - Test formatting of conversion rate as percentage
    - _Requirements: 4.3_

- [ ] 8. Implement manual entity movement API
  - [ ] 8.1 Create manualMoveEntity() function
    - Accept entityId, targetNodeId, workflowId parameters
    - Validate entity exists
    - Validate target node exists in workflow
    - Update entity position to target node
    - Clear any edge position data
    - Create journey event with type 'manual_move'
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 8.2 Write property test for manual move node validation
    - **Property 23: Manual move node validation**
    - **Validates: Requirements 8.1, 8.5**

  - [ ]* 8.3 Write property test for manual move event creation
    - **Property 24: Manual move event creation**
    - **Validates: Requirements 8.2**

  - [ ]* 8.4 Write unit test for manual move with invalid node
    - Test error returned when target node doesn't exist
    - _Requirements: 8.5_

- [ ] 9. Integrate entity movement with edge-walker execution
  - [ ] 9.1 Update edge-walker to call startJourney()
    - When node completes, get entities at that node
    - For each outgoing edge, call startJourney() for entities
    - Handle splitter nodes (multiple entities on multiple edges)
    - _Requirements: 6.2_

  - [ ] 9.2 Update worker callback handler to call arriveAtNode()
    - When worker completes, get entities on incoming edge
    - Call arriveAtNode() for each entity
    - Create node_complete journey event
    - _Requirements: 6.5, 3.3_

  - [ ]* 9.3 Write property test for node completion event creation
    - **Property 9: Journey event creation on node completion**
    - **Validates: Requirements 3.3**

  - [ ]* 9.4 Write integration test for complete entity journey
    - Create entity, start journey, move along edge, arrive at node
    - Verify all journey events created correctly
    - Verify position updates at each step
    - _Requirements: 3.1, 3.2, 3.3, 6.2, 6.4, 6.5_

- [ ] 10. Create API routes for entity operations
  - [ ] 10.1 Create POST /api/entities/[entityId]/start-journey route
    - Accept edgeId in request body
    - Call startJourney() function
    - Return updated entity
    - _Requirements: 6.2_

  - [ ] 10.2 Create POST /api/entities/[entityId]/move route
    - Accept progress in request body
    - Call moveAlongEdge() function
    - Return updated entity
    - _Requirements: 6.4_

  - [ ] 10.3 Create POST /api/entities/[entityId]/arrive route
    - Accept nodeId in request body
    - Call arriveAtNode() function
    - Return updated entity
    - _Requirements: 6.5_

  - [ ] 10.4 Create POST /api/entities/[entityId]/manual-move route
    - Accept targetNodeId and workflowId in request body
    - Call manualMoveEntity() function
    - Return updated entity
    - _Requirements: 8.1, 8.2_

  - [ ] 10.5 Create GET /api/entities/node/[nodeId] route
    - Call getEntitiesAtNode() function
    - Return array of entities
    - _Requirements: 2.3_

  - [ ] 10.6 Create GET /api/entities/edge/[edgeId] route
    - Call getEntitiesOnEdge() function
    - Return array of entities
    - _Requirements: 2.4_

  - [ ] 10.7 Create GET /api/entities/[entityId]/journey route
    - Call getJourneyHistory() function
    - Return array of journey events
    - _Requirements: 3.4_

  - [ ] 10.8 Create GET /api/edges/[edgeId]/statistics route
    - Call getEdgeStatistics() function
    - Return edge statistics
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 10.9 Write integration tests for API routes
    - Test each route with valid and invalid inputs
    - Test error handling and status codes
    - _Requirements: All API requirements_

- [ ] 11. Integrate EntityOverlay into canvas pages
  - [ ] 11.1 Update flow canvas page to include EntityOverlay
    - Import EntityOverlay component
    - Fetch entities for current run
    - Pass entities, nodes, edges to EntityOverlay
    - Position overlay above canvas
    - _Requirements: 5.1, 5.2_

  - [ ] 11.2 Add entity management UI controls
    - Add button to create test entities
    - Add button to manually move selected entity
    - Add entity list panel showing current positions
    - _Requirements: 8.1_

  - [ ]* 11.3 Write end-to-end test for entity visualization
    - Create run, add entities, trigger movements
    - Verify entities render at correct positions
    - Verify real-time updates work
    - _Requirements: 5.1, 5.2, 7.2_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
