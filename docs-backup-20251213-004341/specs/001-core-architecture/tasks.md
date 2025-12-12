# Implementation Plan

- [x] 1. Set up database schema and Supabase client
  - Create Supabase migration files for `stitch_flows` and `stitch_runs` tables
  - Configure Supabase client with environment variables
  - Create database utility functions for connection management
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.3, 2.5_

- [x] 2. Define TypeScript type system
  - Create `src/types/stitch.ts` with all core interfaces (StitchNode, StitchEdge, StitchFlow, NodeState, StitchRun, NodeConfig)
  - Define NodeType and NodeStatus enums
  - Define WorkerPayload and WorkerCallback interfaces
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 5.2_

- [x] 3. Implement database operations layer
  - Create `src/lib/db/flows.ts` with functions to create, read, update flows
  - Create `src/lib/db/runs.ts` with functions to create, read, update runs
  - Implement run initialization logic that sets all nodes to 'pending' status
  - Implement atomic state update functions using database transactions
  - _Requirements: 2.6, 11.2, 11.5_

- [x] 3.1 Write unit tests for database operations
  - Test run initialization sets all nodes to 'pending'
  - Test state updates persist to database
  - Test flow graph structure validation
  - Test node state structure conformance
  - _Requirements: 1.3, 1.4, 2.4, 2.6, 11.2_

- [x] 4. Build execution engine core
  - Create `src/lib/engine/index.ts` with main execution orchestration logic
  - Implement edge-walking function that reads edges and identifies downstream nodes
  - Implement dependency checking function that verifies all upstream nodes are completed
  - Implement input merging function that combines outputs from upstream nodes
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [x] 4.1 Write property test for edge-walking
  - **Property 26: Edge-walking identifies outbound edges**
  - **Validates: Requirements 9.1**

- [x] 4.2 Write property test for dependency checking
  - **Property 27: Dependency checking before firing**
  - **Validates: Requirements 9.3**

- [x] 4.3 Write property test for input merging
  - **Property 29: Input merging from upstream nodes**
  - **Validates: Requirements 9.5**

- [x] 4.4 Write property test for node firing
  - **Property 28: Node fires when dependencies satisfied**
  - **Validates: Requirements 9.4**

- [x] 4.5 Write property test for terminal nodes
  - **Property 31: Terminal node stops edge-walking**
  - **Validates: Requirements 9.7**

- [x] 5. Implement Worker node handler
  - Create `src/lib/engine/handlers/worker.ts`
  - Implement function to construct callback URL using `process.env.NEXT_PUBLIC_BASE_URL`
  - Implement function to build WorkerPayload with runId, nodeId, config, input, callbackUrl
  - Implement HTTP POST request to worker webhook URL with error handling
  - Mark node as 'running' before firing, handle unreachable/invalid URLs by marking as 'failed'
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 9.6, 12.1, 12.2_

- [x] 5.1 Write unit tests for Worker node handler
  - Test webhook fires with correct payload structure
  - Test callback URL follows correct pattern with BASE_URL
  - Test node marked as 'running' before firing
  - Test error handling for unreachable/invalid URLs
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 9.6_

- [x] 6. Implement UX node handler
  - Create `src/lib/engine/handlers/ux.ts`
  - Implement function to mark UX node as 'waiting_for_user' when fired
  - Implement logic to prevent downstream execution while in waiting state
  - _Requirements: 8.1, 8.2_

- [x] 6.1 Write unit tests for UX node handler
  - Test UX node enters 'waiting_for_user' state when fired
  - Test downstream nodes remain pending while UX node is waiting
  - _Requirements: 8.1, 8.2_

- [x] 7. Implement Splitter node handler
  - Create `src/lib/engine/handlers/splitter.ts`
  - Implement array extraction using configured arrayPath (support nested paths like "data.items")
  - Implement parallel path creation by augmenting downstream nodeIds with index suffixes
  - Create node_states entries for each parallel path (nodeId_0, nodeId_1, etc.)
  - Handle empty array edge case by marking splitter as completed and firing collectors
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_

- [x] 7.1 Write property test for splitter parallel paths
  - **Property 14: Splitter creates parallel paths**
  - **Validates: Requirements 6.1**

- [x] 7.2 Write property test for splitter array extraction
  - **Property 15: Splitter array extraction**
  - **Validates: Requirements 6.2**

- [x] 7.3 Write property test for splitter path tracking
  - **Property 16: Splitter path tracking with suffixes**
  - **Validates: Requirements 6.4**

- [x] 7.4 Write unit test for empty array edge case
  - Test that empty array marks splitter as completed and fires collectors
  - _Requirements: 6.6_

- [x] 8. Implement Collector node handler
  - Create `src/lib/engine/handlers/collector.ts`
  - Implement function to identify all upstream parallel paths using regex pattern matching
  - Implement synchronization logic to wait until all parallel paths are 'completed'
  - Implement output merging that preserves order by index (sort by suffix number)
  - Implement failure propagation: mark collector as 'failed' if any upstream path failed
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

- [x] 8.1 Write property test for collector path identification
  - **Property 17: Collector identifies upstream paths**
  - **Validates: Requirements 7.1**

- [x] 8.2 Write property test for collector synchronization
  - **Property 18: Collector waits for all paths**
  - **Validates: Requirements 7.2**

- [x] 8.3 Write property test for collector merging
  - **Property 19: Collector merges outputs into array**
  - **Validates: Requirements 7.3**

- [x] 8.4 Write property test for collector ordering
  - **Property 20: Collector preserves order**
  - **Validates: Requirements 7.4**

- [x] 8.5 Write property test for collector failure propagation
  - **Property 21: Collector fails on upstream failure**
  - **Validates: Requirements 7.6**

- [x] 9. Create callback API endpoint
  - Create `src/app/api/stitch/callback/[runId]/[nodeId]/route.ts`
  - Implement POST handler that validates runId and nodeId exist
  - Parse and validate WorkerCallback payload (status, output, error)
  - Update node state to 'completed' or 'failed' based on callback status
  - Trigger edge-walking after successful state update
  - Return appropriate HTTP responses (200, 404, 400)
  - Use getAdminClient to update the run state, as external workers are unauthenticated.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 9.1 Write unit tests for callback endpoint
  - Test completed callback updates state and triggers edge-walking
  - Test failed callback updates state with error
  - Test validation rejects invalid runId/nodeId (404)
  - Test malformed payload returns 400
  - Test successful processing returns 200
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 10. Create UX complete API endpoint
  - Create `src/app/api/stitch/complete/[runId]/[nodeId]/route.ts`
  - Implement POST handler that validates node is UX type and in 'waiting_for_user' status
  - Update node state to 'completed' with provided input as output
  - Trigger edge-walking after state update
  - Return appropriate HTTP responses (200, 404, 400)
  - _Requirements: 8.3, 8.4, 8.5_

- [x] 10.1 Write unit tests for UX complete endpoint
  - Test completion updates state and triggers edge-walking
  - Test 400 response for non-UX node
  - Test 400 response for non-waiting node
  - Test 404 response for invalid runId/nodeId
  - _Requirements: 8.3, 8.4, 8.5_

- [x] 11. Create retry API endpoint
  - Create `src/app/api/stitch/retry/[runId]/[nodeId]/route.ts`
  - Implement POST handler that validates node status is 'failed'
  - Reset node state to 'pending'
  - Re-evaluate upstream dependencies and fire node if satisfied
  - Return appropriate HTTP responses (200, 404, 400)
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 11.1 Write unit tests for retry endpoint
  - Test retry resets failed node to pending
  - Test retry re-evaluates dependencies and fires if satisfied
  - Test 400 response for non-failed node
  - Test 404 response for invalid runId/nodeId
  - _Requirements: 10.2, 10.3, 10.5_

- [x] 12. Implement environment configuration validation
  - Create `src/lib/config.ts` to validate required environment variables
  - Check that `NEXT_PUBLIC_BASE_URL` is set at startup
  - Throw configuration error if missing
  - Export validated config for use throughout application
  - _Requirements: 12.3_

- [x] 12.1 Write unit test for missing BASE_URL error
  - Test that system throws error when NEXT_PUBLIC_BASE_URL is not set
  - _Requirements: 12.3_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Write integration tests for complete workflows
  - Test simple linear flow (A → B → C)
  - Test parallel flow with Splitter/Collector
  - Test human-in-the-loop flow with UX gate
  - Test mixed flow with all node types
  - Test error recovery with worker failure and retry
  - Test system recovery after simulated restart
  - _Requirements: 11.3_
