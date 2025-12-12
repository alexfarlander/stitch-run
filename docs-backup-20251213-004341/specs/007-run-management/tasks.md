# Implementation Plan: Run Management & Execution Engine

## Task Overview

Convert the M-Shape architecture design into implementable coding tasks that enhance the existing run system to stitch UX flows and system flows together. Each task builds incrementally on existing infrastructure.

## Task List

- [x] 1. Create UX-System Flow Mapping Infrastructure

- [x] 1.1 Create database migration for UX-system mapping table
  - Create `stitch_ux_system_mapping` table with `bmc_flow_id`, `ux_node_id`, `system_flow_id`
  - Add indexes for efficient lookups
  - Add foreign key constraints to existing `stitch_flows` table
  - _Requirements: 8.2, 8.5_

- [x] 1.2 Create UX-system mapping API endpoints
  - Implement `GET /api/flows/{bmcFlowId}/ux-mapping` to retrieve mappings
  - Implement `POST /api/flows/{bmcFlowId}/ux-mapping` to create/update mappings
  - Add validation to ensure BMC flow exists and system flow exists
  - _Requirements: 4.1, 4.2_


- [x] Implement Graph JSON Parsing Utilities

- [ ] 2.1 Create graph parsing utilities for UX node identification
  - Implement function to parse `stitch_flow_versions.graph` JSON to identify UX nodes
  - Implement function to find next UX node in sequence from graph edges
  - Add validation to ensure node types are correctly identified from versioned graph
  - _Requirements: 2.2, 8.1, 8.4_

- [ ] 2.2 Create UX node validation functions
  - Implement validation that checks if a node ID is a UX-type node
  - Integrate validation into entity position updates
  - Add error handling for invalid node type assignments
  - _Requirements: 2.2, 6.6, 8.1_


- [x] 3. Enhance Entity Creation from System Events

- [x] 3.1 Enhance webhook handlers to create entities
  - Modify existing webhook handlers to create entities when webhooks are received
  - Map webhook events to UX nodes using configuration
  - Ensure entities are created with correct `current_node_id` (UX nodes only)
  - _Requirements: 5.2, 6.1_

- [x] 3.2 Enhance email reply handlers to create entities
  - Modify existing email reply handlers to create entities from email responses
  - Set entity metadata from email content (sender, reply content)
  - Position entities at appropriate UX nodes for email replies
  - _Requirements: 5.2, 6.1_


- [x] 4. Enhance Run Start API with UX Context

- [x] 4.1 Extend existing run start API to accept UX context
  - Modify `POST /api/flows/{flowId}/run` to accept `ux_node_id` parameter
  - Store UX context in existing `stitch_runs.trigger` JSON field
  - Ensure backward compatibility with existing run start calls
  - _Requirements: 6.1, 8.3_

- [x] 4.2 Integrate UX context into run creation logic
  - Update run creation to store entity ID and UX node ID
  - Ensure runs are properly linked to entities via existing `entity_id` field
  - Add validation that UX node ID references valid UX node
  - _Requirements: 8.3_


- [x] 5. Implement System Path Completion Detection

- [x] 5.1 Create system path completion detection logic
  - Implement function to determine when a system path (workflow) is complete
  - Check all nodes in `stitch_runs.node_states` for completion status
  - Align with existing edge-walker completion criteria (all node_states completed)
  - _Requirements: 6.2, 6.3_

- [x] 5.2 Enhance existing callback handler with stitching logic
  - Modify `POST /api/stitch/callback/{runId}/{nodeId}` handler
  - Add check for system path completion after node state updates
  - Extend existing entity movement logic to handle UX spine progression
  - **CRITICAL**: Enhance the single entity movement system, don't duplicate it
  - Maintain existing callback functionality
  - _Requirements: 6.2, 6.3_


- [x] 6. Implement UX Spine Progression Logic

- [x] 6.1 Create UX spine progression functions
  - Implement logic to find next UX node on BMC spine using graph JSON
  - Handle end-of-journey cases when no next UX node exists
  - Ensure progression follows UX edges only (not system edges)
  - _Requirements: 6.2, 6.4, 8.5_

- [x] 6.2 Implement entity movement along UX spine
  - Update entity `current_node_id` when system path completes
  - Log journey events using existing `stitch_journey_events` table
  - Start next system flow if mapped to next UX node
  - _Requirements: 6.2, 6.3_

- [x] 7. Integrate Stitching Logic into Callback System

- [x] 7.1 Implement complete stitching workflow in callbacks
  - Combine system completion detection with UX progression
  - Extend existing entity movement logic to handle UX spine progression
  - **CRITICAL**: Enhance the single entity movement system to support M-Shape architecture
  - Add error handling for failed system paths
  - _Requirements: 6.2, 6.5_

- [x] 7.2 Add logging and monitoring for stitched runs
  - Log stitching events for debugging and monitoring
  - Track entity journey progress across UX spine
  - Monitor system path execution and completion
  - _Requirements: 7.1, 7.2, 7.3_


- [-] 8. Testing and Validation

- [x] 8.1 Create integration tests for end-to-end stitching
  - Test complete flow: webhook → entity creation → system run → UX progression
  - Test multiple system paths in sequence
  - Test error handling and recovery scenarios
  - _Requirements: All requirements_

- [ ] 8.2 Test outreach workflow example
  - Set up outreach system flow that pulls contacts and sends emails
  - Test email reply creating entities and starting journey
  - Verify entities move through UX spine as system paths complete
  - _Requirements: 5.2, 6.1, 6.2_


- [ ] 9. Documentation and Cleanup

- [ ] 9.1 Document UX-system mapping configuration
  - Create documentation for setting up UX-system flow mappings
  - Document webhook to UX node mapping configuration
  - Provide examples of complete M-Shape architecture setup
  - _Requirements: 4.1, 4.2_

- [ ] 9.2 Update existing API documentation
  - Document enhanced run start API with UX context parameters
  - Document callback behavior with stitching logic
  - Update webhook handler documentation for entity creation
  - _Requirements: 8.3_

## Implementation Notes

### Existing Infrastructure to Reuse
- `stitch_runs` table with `entity_id`, `trigger` JSON, `status` fields
- `stitch_entities` table with `current_node_id` field
- `stitch_journey_events` table for movement logging
- `POST /api/flows/{flowId}/run` API for starting runs
- `POST /api/stitch/callback/{runId}/{nodeId}` API for node completion
- Existing webhook and email reply handler infrastructure

### New Infrastructure (Minimal)
- `stitch_ux_system_mapping` table (one new table - does not exist yet)
- UX-system mapping API endpoints (two new endpoints - do not exist yet)
- Graph JSON parsing utilities (operates on `stitch_flow_versions.graph`)
- Enhanced callback logic for stitching

### Key Validation Points
- Entities can only be positioned at UX-type nodes (validate using graph JSON)
- System flows must be properly mapped to UX nodes
- Journey events must be logged for all entity movements
- Run completion must trigger UX spine progression
- **CRITICAL**: Enhance existing entity movement system to support M-Shape architecture, don't duplicate it

### Testing Strategy
- Property-based tests for core stitching logic
- Integration tests for end-to-end workflows
- Manual testing with outreach workflow example
- Error handling and edge case testing