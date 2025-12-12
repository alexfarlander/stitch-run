# Implementation Plan

- [x] 1. Set up Canvas Management API foundation
  - Create API route structure for canvas CRUD operations
  - Implement request/response type definitions
  - Set up error handling middleware
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3_

- [ ]* 1.1 Write property test for Canvas CRUD integrity
  - **Property 1: Canvas CRUD operations preserve data integrity**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 2. Implement GET /api/canvas endpoint
  - Query all canvases from stitch_flows table
  - Return canvas list with metadata (id, name, created_at, node_count, edge_count)
  - Handle database errors with 500 status
  - _Requirements: 1.1, 9.3_

- [x] 3. Implement POST /api/canvas endpoint
  - Accept JSON or Mermaid format in request body
  - Validate input format and content
  - Create canvas record in stitch_flows table
  - Return canvas ID and full canvas data
  - _Requirements: 1.2, 9.1_

- [x] 4. Implement GET /api/canvas/[id] endpoint
  - Query canvas by ID from stitch_flows table
  - Return 404 if canvas not found
  - Return complete canvas data with nodes and edges
  - _Requirements: 1.3, 9.2_

- [x] 5. Implement PUT /api/canvas/[id] endpoint
  - Load existing canvas by ID
  - Validate updated canvas data
  - Update canvas record in database
  - Return updated canvas with new timestamp
  - _Requirements: 1.4, 9.2_

- [x] 6. Implement DELETE /api/canvas/[id] endpoint
  - Check if canvas exists
  - Delete canvas record from database
  - Return success confirmation
  - _Requirements: 1.5, 9.2_

- [x] 7. Implement Mermaid parser
  - Parse flowchart syntax to extract nodes and edges
  - Extract node types from labels or syntax patterns
  - Create VisualGraph structure from parsed data
  - Generate unique node IDs if not specified
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7.1 Write property test for Mermaid round-trip
  - **Property 4: Mermaid round-trip preserves structure**
  - **Validates: Requirements 3.1, 3.4**

- [ ]* 7.2 Write property test for node type extraction
  - **Property 5: Mermaid parser extracts node types correctly**
  - **Validates: Requirements 3.2**

- [ ]* 7.3 Write property test for edge creation
  - **Property 6: Mermaid parser creates all edges**
  - **Validates: Requirements 3.3**

- [x] 8. Implement Mermaid generator
  - Convert VisualGraph to Mermaid flowchart syntax
  - Include node types in labels
  - Generate edge connections
  - Format output for readability
  - _Requirements: 3.4_

- [x] 9. Add Mermaid error handling
  - Catch parsing errors with descriptive messages
  - Return 400 status with error details
  - Include line numbers and syntax hints where possible
  - _Requirements: 3.5, 9.4_

- [ ]* 9.1 Write property test for Mermaid error messages
  - **Property 7: Invalid Mermaid produces descriptive errors**
  - **Validates: Requirements 3.5**

- [x] 10. Implement POST /api/canvas/[id]/run endpoint
  - Load canvas by ID
  - Create version snapshot automatically
  - Compile canvas to execution graph
  - Create run record in stitch_runs table
  - Start workflow execution
  - Return run ID, version ID, status, and statusUrl
  - _Requirements: 2.1, 2.3_

- [ ]* 10.1 Write property test for version snapshot creation
  - **Property 2: Workflow execution creates version snapshots**
  - **Validates: Requirements 2.3**

- [x] 11. Implement GET /api/canvas/[id]/status endpoint
  - Query run status from stitch_runs table
  - Query node states from stitch_node_states table
  - Aggregate node outputs for completed nodes
  - Return status with statusUrl for polling
  - _Requirements: 2.2_

- [ ]* 11.1 Write property test for workflow result persistence
  - **Property 3: Workflow execution persists results**
  - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

- [x] 12. Implement LLM client interface
  - Create LLMClient interface with complete() method
  - Implement ClaudeLLMClient using Anthropic API
  - Add retry logic with exponential backoff
  - Handle API errors and timeouts
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 13. Implement AI Manager context builder
  - Load worker definitions from registry
  - Strip UI properties from canvas (position, style, width, height)
  - Build structured context object
  - Format context as JSON for LLM
  - _Requirements: 5.6, 7.1_

- [ ]* 13.1 Write property test for UI property stripping
  - **Property 16: LLM context strips UI properties**
  - **Validates: Requirements 5.6**

- [x] 14. Implement AI Manager prompt template
  - Create system prompt with role definition
  - Include worker definitions section
  - Include entity movement rules explanation
  - Include output format specification
  - Add example requests and responses
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.2, 10.3_

- [x] 15. Implement AI Manager action executor
  - Parse LLM JSON response
  - Validate action type (CREATE_WORKFLOW, MODIFY_WORKFLOW, RUN_WORKFLOW, GET_STATUS)
  - Route to appropriate handler based on action
  - Handle parsing errors gracefully
  - _Requirements: 8.1, 8.5_

- [x] 15.1 Write property test for AI Manager response format
  - **Property 25: AI Manager responses are valid JSON**
  - **Validates: Requirements 8.1, 8.5**

- [x] 16. Implement CREATE_WORKFLOW action handler
  - Extract canvas from LLM payload
  - Validate generated canvas structure
  - Check for valid worker types
  - Verify entity movement configuration on worker nodes
  - Store canvas in database
  - Return canvas ID and full canvas
  - _Requirements: 4.1, 4.5, 7.3, 7.4_

- [ ]* 16.1 Write property test for AI-generated workflow validation
  - **Property 8: AI-generated workflows are valid**
  - **Validates: Requirements 4.1**

- [ ]* 16.2 Write property test for worker node entity movement
  - **Property 10: AI-generated worker nodes have entity movement**
  - **Validates: Requirements 4.4, 10.1, 10.2, 10.3**

- [ ]* 16.3 Write property test for required canvas properties
  - **Property 11: AI-generated canvases have required properties**
  - **Validates: Requirements 4.5**

- [ ]* 16.4 Write property test for worker type validation
  - **Property 23: AI-generated workers have correct types**
  - **Validates: Requirements 7.3**

- [ ]* 16.5 Write property test for worker configuration
  - **Property 24: AI-generated workers have required config**
  - **Validates: Requirements 7.4**

- [x] 17. Implement MODIFY_WORKFLOW action handler
  - Load current canvas from database
  - Extract modifications from LLM payload
  - Preserve existing node IDs where unchanged
  - Generate unique IDs for new nodes
  - Remove edges for deleted nodes
  - Validate resulting canvas
  - Update canvas in database
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_

- [ ]* 17.1 Write property test for node ID preservation
  - **Property 12: AI modifications preserve unchanged node IDs**
  - **Validates: Requirements 5.2**

- [ ]* 17.2 Write property test for unique node ID generation
  - **Property 13: AI modifications generate unique node IDs**
  - **Validates: Requirements 5.3**

- [ ]* 17.3 Write property test for edge removal
  - **Property 14: Node removal removes associated edges**
  - **Validates: Requirements 5.4**

- [ ]* 17.4 Write property test for modification validation
  - **Property 15: AI modifications validate resulting graph**
  - **Validates: Requirements 5.5**

- [x] 17.5 Write property test for edge integrity
  - **Property 17: AI modifications validate edge integrity**
  - **Validates: Requirements 5.7**

- [x] 18. Implement RUN_WORKFLOW action handler
  - Extract canvas ID and input from payload
  - Call POST /api/canvas/[id]/run endpoint
  - Return run ID and status
  - _Requirements: 6.1_

- [ ]* 18.1 Write property test for run ID return
  - **Property 18: Workflow execution returns run ID**
  - **Validates: Requirements 6.1**

- [x] 19. Implement GET_STATUS action handler
  - Extract run ID from payload
  - Call GET /api/canvas/[id]/status endpoint
  - Return status with node states and outputs
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ]* 19.1 Write property test for status node states
  - **Property 19: Status includes all node states**
  - **Validates: Requirements 6.2**

- [ ]* 19.2 Write property test for completed node outputs
  - **Property 20: Status includes completed node outputs**
  - **Validates: Requirements 6.3**

- [ ]* 19.3 Write property test for error reporting
  - **Property 21: Failed workflows report error details**
  - **Validates: Requirements 6.4**

- [ ]* 19.4 Write property test for terminal outputs
  - **Property 22: Completed workflows return terminal outputs**
  - **Validates: Requirements 6.5**

- [x] 20. Implement POST /api/ai-manager endpoint
  - Accept natural language request and optional canvas ID
  - Build AI Manager context
  - Generate prompt from template
  - Call LLM client
  - Parse and execute action
  - Return structured response
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 21. Add validation for splitter/collector pairs
  - Check that splitter split_count matches collector expected_count
  - Validate that all splitter outputs connect to collector inputs
  - Include validation in canvas validation pipeline
  - _Requirements: 4.3_

- [x] 21.1 Write property test for splitter/collector pairs
  - **Property 9: AI Manager includes splitter/collector pairs**
  - **Validates: Requirements 4.3**

- [x] 22. Add entity movement validation
  - Validate targetSectionId references existing node
  - Validate completeAs has valid value
  - Validate setEntityType has valid entity type
  - Include validation in canvas validation pipeline
  - _Requirements: 10.4, 10.5_

- [ ]* 22.1 Write property test for entity movement target validation
  - **Property 29: Entity movement validates target nodes**
  - **Validates: Requirements 10.4**

- [ ]* 22.2 Write property test for entity type conversion
  - **Property 30: Entity type conversion includes completeAs**
  - **Validates: Requirements 10.5**

- [x] 23. Add comprehensive error responses
  - Implement error response format with code and details
  - Add error handling for invalid JSON (400)
  - Add error handling for not found (404)
  - Add error handling for database errors (500)
  - Add error handling for validation failures (400)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 23.1 Write property test for error response format
  - **Property 28: Error responses include error field**
  - **Validates: Requirements 8.4**

- [x] 24. Add response format validation
  - Validate CREATE_WORKFLOW responses include canvas
  - Validate RUN_WORKFLOW responses include run ID
  - Validate all responses are valid JSON
  - _Requirements: 8.2, 8.3, 8.5_

- [ ]* 24.1 Write property test for create workflow response
  - **Property 26: Create workflow responses include canvas**
  - **Validates: Requirements 8.2**

- [ ]* 24.2 Write property test for execute workflow response
  - **Property 27: Execute workflow responses include run ID**
  - **Validates: Requirements 8.3**

- [x] 25. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. Add integration tests for end-to-end workflows
  - Test canvas creation via API to execution
  - Test AI Manager workflow creation to execution
  - Test Mermaid workflow creation to execution
  - Test workflow modification and re-execution
  - _Requirements: All_

- [x] 27. Add API documentation
  - Document all endpoints with request/response examples
  - Document error codes and responses
  - Document AI Manager natural language examples
  - Create OpenAPI/Swagger specification
  - _Requirements: All_

- [ ] 28. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
