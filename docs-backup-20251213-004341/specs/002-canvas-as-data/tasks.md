# Implementation Plan

- [x] 1. Create type definitions for canvas schema
  - Define VisualGraph, VisualNode, VisualEdge, EdgeMapping types
  - Define InputSchema and OutputSchema types
  - Define EntityMovementConfig types
  - Export all types from src/types/canvas-schema.ts
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Create type definitions for execution graph
  - Define ExecutionGraph and ExecutionNode types
  - Define adjacency map and edge data structures
  - Export all types from src/types/execution-graph.ts
  - _Requirements: 3.1, 3.3, 3.6_

- [x] 3. Create type definitions for worker definitions
  - Define WorkerDefinition interface
  - Define worker input/output schema types
  - Export from src/types/worker-definition.ts
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 4. Create type definitions for workflow creation
  - Define WorkflowCreationRequest interface
  - Support mermaid, graph, nodeConfigs, and edgeMappings
  - Export from src/types/workflow-creation.ts
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5. Create database migration for versioning schema
  - Create stitch_flows table with current_version_id
  - Create stitch_flow_versions table with visual_graph and execution_graph
  - Add flow_version_id column to stitch_runs
  - Add foreign key constraints
  - Add indexes on flow_id, created_at, flow_version_id
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. Implement graph validation utilities
  - Create src/lib/canvas/validate-graph.ts
  - Implement cycle detection using DFS
  - Implement required input validation
  - Implement worker type validation
  - Implement edge mapping validation
  - Return ValidationError array
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 6.1 Write property test for cycle detection
  - **Property 18: Cycle detection**
  - **Validates: Requirements 4.1**

- [ ]* 6.2 Write property test for required input validation
  - **Property 19: Required input validation**
  - **Validates: Requirements 4.2**

- [ ]* 6.3 Write property test for worker type validation
  - **Property 20: Worker type validation**
  - **Validates: Requirements 4.3**

- [x] 7. Implement OEG compiler
  - Create src/lib/canvas/compile-oeg.ts
  - Implement compileToOEG function
  - Build adjacency map from edges
  - Strip UI properties (position, style, label, width, height)
  - Index nodes by ID
  - Compute entry nodes (no incoming edges)
  - Compute terminal nodes (no outgoing edges)
  - Index edge data by "source->target" keys
  - Preserve node IDs exactly (no renaming or sanitization)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.4_

- [x] 7.1 Write property test for adjacency map creation
  - **Property 12: Adjacency map creation**
  - **Validates: Requirements 3.1**

- [ ]* 7.2 Write property test for UI property stripping
  - **Property 13: UI property stripping**
  - **Validates: Requirements 3.2**

- [ ]* 7.3 Write property test for node indexing
  - **Property 14: Node indexing by ID**
  - **Validates: Requirements 3.3**

- [ ]* 7.4 Write property test for entry node computation
  - **Property 15: Entry node computation**
  - **Validates: Requirements 3.4**

- [ ]* 7.5 Write property test for terminal node computation
  - **Property 16: Terminal node computation**
  - **Validates: Requirements 3.5**

- [ ]* 7.6 Write property test for edge data indexing
  - **Property 17: Edge data indexing**
  - **Validates: Requirements 3.6**

- [ ]* 7.7 Write property test for successful compilation
  - **Property 21: Successful compilation returns execution graph**
  - **Validates: Requirements 4.4**

- [x] 8. Implement worker registry
  - Create src/lib/workers/registry.ts
  - Define WORKER_DEFINITIONS constant
  - Add definitions for claude, minimax, elevenlabs, shotstack
  - Include input/output schemas for each worker
  - Export getWorkerDefinition helper function
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 8.1 Write property test for worker definition completeness
  - **Property 36: Worker definition completeness**
  - **Validates: Requirements 8.1**

- [ ]* 8.2 Write property test for input schema structure
  - **Property 37: Input schema structure**
  - **Validates: Requirements 8.2**

- [ ]* 8.3 Write property test for output schema structure
  - **Property 38: Output schema structure**
  - **Validates: Requirements 8.3**

- [x] 9. Implement auto-layout algorithm
  - Create src/lib/canvas/auto-layout.ts
  - Implement autoLayout function using Longest Path Layering
  - Build reverse adjacency map (child -> parents)
  - Compute levels: node level = max(parent_levels) + 1
  - Wait for all parents to be visited before assigning level
  - Position nodes with horizontal and vertical spacing
  - Ensure no two nodes have identical positions
  - _Requirements: 7.5, 7.6_

- [ ]* 9.1 Write property test for position generation
  - **Property 34: Auto-layout generates positions**
  - **Validates: Requirements 7.5**

- [ ]* 9.2 Write property test for overlap prevention
  - **Property 35: Overlap prevention**
  - **Validates: Requirements 7.6**

- [x] 10. Implement Mermaid parser
  - Create src/lib/canvas/mermaid-parser.ts
  - Implement mermaidToCanvas function
  - Parse Mermaid flowchart syntax
  - Extract nodes and edges
  - Infer node types from labels (ux, worker, splitter, collector)
  - Infer worker types from labels (claude, minimax, elevenlabs)
  - Apply nodeConfigs if provided
  - Apply edgeMappings if provided
  - Call autoLayout to generate positions
  - _Requirements: 6.1, 6.2, 6.4, 7.1, 7.2, 7.3_

- [ ]* 10.1 Write property test for Mermaid parsing
  - **Property 25: Mermaid parsing extracts structure**
  - **Validates: Requirements 6.1**

- [ ]* 10.2 Write property test for worker type inference
  - **Property 26: Worker type inference**
  - **Validates: Requirements 6.2**

- [ ]* 10.3 Write property test for default config application
  - **Property 28: Default config application**
  - **Validates: Requirements 6.4**

- [x] 11. Implement Mermaid generator
  - Create src/lib/canvas/mermaid-generator.ts
  - Implement canvasToMermaid function
  - Convert nodes to Mermaid node definitions
  - Convert edges to Mermaid connections
  - Generate valid Mermaid flowchart syntax
  - _Requirements: 6.3, 6.5_

- [ ]* 11.1 Write property test for Mermaid generation round-trip
  - **Property 27: Mermaid generation round-trip**
  - **Validates: Requirements 6.3**

- [ ]* 11.2 Write property test for structure preservation
  - **Property 29: Structure preservation in Mermaid conversion**
  - **Validates: Requirements 6.5**

- [x] 12. Implement version manager
  - Create src/lib/canvas/version-manager.ts
  - Implement createVersion function
  - Call compileToOEG to validate and compile
  - Insert version record with both graphs
  - Update current_version_id in stitch_flows
  - Implement getVersion function
  - Implement listVersions function (ordered by created_at DESC)
  - Implement autoVersionOnRun function
  - Check for unsaved changes by comparing graphs
  - Create new version if changes detected
  - _Requirements: 1.2, 1.5, 5.1, 5.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 12.1 Write property test for version creation
  - **Property 2: Version creation stores both graphs**
  - **Validates: Requirements 1.2, 10.3**

- [ ]* 12.2 Write property test for current version pointer
  - **Property 5: Current version pointer updates**
  - **Validates: Requirements 1.5, 5.5**

- [x] 12.3 Write property test for auto-versioning
  - **Property 23: Auto-versioning on unsaved changes**
  - **Validates: Requirements 5.1**

- [ ]* 12.4 Write property test for version retrieval
  - **Property 43: Version retrieval completeness**
  - **Validates: Requirements 10.4**

- [ ]* 12.5 Write property test for version listing order
  - **Property 44: Version listing order**
  - **Validates: Requirements 10.5**

- [x] 13. Update flow database operations
  - Update src/lib/db/flows.ts
  - Modify createFlow to support canvas_type and parent_id
  - Add createFlowWithVersion function
  - Ensure current_version_id is set when creating first version
  - Update getFlow to optionally include current version
  - _Requirements: 1.1, 1.6, 5.6_

- [ ]* 13.1 Write property test for flow creation
  - **Property 1: Flow creation stores metadata**
  - **Validates: Requirements 1.1**

- [ ]* 13.2 Write property test for new flow creation order
  - **Property 6: New flow creation order**
  - **Validates: Requirements 1.6, 5.6**

- [x] 14. Update run database operations
  - Update src/lib/db/runs.ts
  - Modify createRun to accept flow_version_id
  - Modify createRunAdmin to accept flow_version_id
  - Load execution graph from version instead of flow
  - Initialize node states from execution graph
  - _Requirements: 1.3, 5.2_

- [ ]* 14.1 Write property test for run version reference
  - **Property 3: Run references specific version**
  - **Validates: Requirements 1.3, 5.2**

- [x] 15. Implement API endpoints for flow versions
  - Create src/app/api/flows/[id]/versions/route.ts
  - POST endpoint to create new version
  - GET endpoint to list all versions for a flow
  - Create src/app/api/flows/[id]/versions/[vid]/route.ts
  - GET endpoint to retrieve specific version
  - _Requirements: 10.1, 10.4, 10.5_

- [x] 16. Implement API endpoint for running flows with auto-versioning
  - Create src/app/api/flows/[id]/run/route.ts
  - POST endpoint to run a flow
  - Accept optional visual graph in request body
  - Call autoVersionOnRun if graph provided
  - Create run with flow_version_id
  - Start execution using execution graph from version
  - Return run ID and status
  - _Requirements: 5.1, 5.2_

- [x] 17. Update execution engine to use execution graph
  - Update src/lib/engine/edge-walker.ts
  - Load execution graph from run's flow_version_id
  - Use adjacency map for O(1) edge lookup
  - Use edge data map for data mapping
  - Use entry nodes to start execution
  - Use terminal nodes to detect completion
  - _Requirements: 3.1, 3.6_

- [x] 18. Implement data migration script
  - Create scripts/migrate-to-versions.ts
  - For each existing flow:
    - Attempt to compile graph to OEG
    - If successful: create initial version, update current_version_id
    - If failed: set current_version_id to NULL, log error
  - For each existing run:
    - Link to flow's current_version_id if available
    - Otherwise mark for manual review
  - Log all migration results
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 19. Add version history UI component
  - Create src/components/canvas/VersionHistory.tsx
  - Display list of versions with timestamps and commit messages
  - Allow viewing historical versions
  - Show diff between versions (optional)
  - Allow reverting to previous version
  - _Requirements: 1.4, 5.3_

- [ ]* 19.1 Write property test for historical run preservation
  - **Property 4: Historical runs preserve version**
  - **Validates: Requirements 1.4, 5.3**

- [ ]* 19.2 Write property test for version immutability
  - **Property 24: Version immutability**
  - **Validates: Requirements 5.4**

- [x] 20. Update canvas editor to support versioning
  - Update src/components/canvas/StitchCanvas.tsx
  - Add "Save Version" button
  - Add "Run" button that auto-versions
  - Show current version indicator
  - Show unsaved changes indicator
  - Integrate VersionHistory component
  - _Requirements: 5.1, 5.5_

- [x] 21. Add Mermaid import/export UI
  - Create src/components/canvas/MermaidImportExport.tsx
  - Add "Import from Mermaid" dialog
  - Add "Export to Mermaid" button
  - Support optional nodeConfigs and edgeMappings
  - Preview generated canvas before import
  - _Requirements: 6.1, 6.3, 7.1, 7.2, 7.3, 7.4_

- [x] 22. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Update documentation
  - Document new API endpoints
  - Document version management workflow
  - Document Mermaid import/export
  - Add examples for common workflows
  - Update architecture diagrams
  - _Requirements: All_
