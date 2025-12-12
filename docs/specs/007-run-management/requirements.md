# Requirements: M-Shape Architecture & Entity Journey

## Introduction

This specification defines the requirements for implementing the M-Shape architecture in Stitch. The M-Shape model separates the **UX Spine** (horizontal entity journey) from **System Paths** (vertical workflows that execute under each UX node).

## The M-Shape Model

```
UX Spine (horizontal - what entity experiences):
┌─────────┐         ┌─────────────────┐         ┌────────────┐
│  Form   │────────→│ Confirmation    │────────→│ Demo Event │
└────┬────┘         └────────┬────────┘         └────────────┘
     │                       │
     │ (system paths)        │
     ↓                       ↓
   [CRM]                  [none]
     ↓
 [Calendar]
     ↓
  [Invite]
     ↓
  [Notify]
```

**Key Concepts:**
- **UX Spine**: Horizontal path of UX nodes that entities travel
- **System Path**: Vertical workflow under each UX node (invisible to entities)
- **Entity Journey**: Movement from UX node to UX node along the spine
- **Run**: Execution of a system path triggered by entity arrival at UX node

## Glossary

- **Entity**: A representation of a person on the customer-facing side of the BMC. Includes leads, paying customers, churned customers, and any consumer role. NOT called "customers" because they may not be customers yet. Entities travel UX edges only.
- **UX Node**: A node on the UX spine representing a customer touchpoint (form, email, event, etc.)
- **System Node**: A Worker node in a system path (CRM update, notification, etc.) - invisible to entities
- **UX Edge**: Connection between UX nodes (journey edge) - the ONLY edges entities can travel
- **System Edge**: Connection between system nodes (workflow edge) - entities never travel these
- **Entity Position**: The UX node where an entity currently resides (always a UX node, never a system node)
- **Journey Event**: A logged record of entity movement between UX nodes

## Requirements

### Requirement 1: BMC as Entity Journey

**User Story:** As a workflow builder, I want to see entities traveling across the Business Model Canvas, so that I can understand customer journey progress.

#### Acceptance Criteria

1. WHEN a user views the BMC, THE system SHALL display entities at their current UX node positions
2. WHEN entities exist on the canvas, THE system SHALL show them traveling between sections/UX nodes
3. WHEN a UX node has system paths underneath, THE system SHALL allow drill-down navigation (not a separate view)
4. WHEN UX nodes are connected by journey edges, THE system SHALL show the path entities can travel
5. WHEN a user wants to see system details, THE system SHALL navigate into the UX node (drill-down)

### Requirement 2: Entity Position on UX Spine

**User Story:** As a workflow manager, I want to see where each entity is on the UX spine, so that I can track customer journey progress.

#### Acceptance Criteria

1. WHEN entities exist for a canvas, THE system SHALL display them at their current UX node position
2. WHEN an entity's current_node_id is set, THE system SHALL validate it references a UX node (not a system node)
3. WHEN multiple entities are at the same UX node, THE system SHALL display a count badge on that node
4. WHEN a user clicks a UX node with entities, THE system SHALL show a list of entities at that node
5. WHEN an entity has no current_node_id, THE system SHALL display it as "not started"

### Requirement 3: Entity Journey Panel

**User Story:** As a workflow manager, I want to see the journey progress for all entities, so that I can monitor the overall flow.

#### Acceptance Criteria

1. WHEN a user views the canvas, THE system SHALL display an Entity Journey Panel
2. WHEN entities are listed, THE system SHALL show each entity's current UX node
3. WHEN an entity has journey history, THE system SHALL display the UX nodes they have visited
4. WHEN a system path is executing for an entity, THE system SHALL show "processing" status
5. WHEN an entity completes the journey, THE system SHALL show "completed" status

### Requirement 4: System Path Drill-Down

**User Story:** As an admin, I want to drill down into a UX node to see the system workflow underneath, so that I can debug and monitor backend processes.

#### Acceptance Criteria

1. WHEN an admin clicks a UX node, THE system SHALL navigate to display the system path underneath (drill-down)
2. WHEN the system path is shown, THE system SHALL display all Worker nodes connected to that UX node
3. WHEN a run is active for that system path, THE system SHALL show the run status
4. WHEN Worker nodes have executed, THE system SHALL display their inputs and outputs
5. WHEN the admin wants to return, THE system SHALL provide navigation back to the UX spine (drill-up)

### Requirement 5: Entity Seeding to Journey

**User Story:** As a workflow manager, I want to add contacts to the journey, so that they begin traveling the UX spine.

#### Acceptance Criteria

1. WHEN a user clicks "Add to Journey", THE system SHALL open a contact selection modal
2. WHEN contacts are selected, THE system SHALL create entities with current_node_id set to null (not yet on the journey)
3. WHEN a system path is triggered for the first UX node, THE system SHALL move the entity to that UX node and log a journey event
4. WHEN duplicate contacts exist for the canvas, THE system SHALL skip duplicates and report them
5. WHEN entities are successfully added, THE system SHALL refresh the journey panel
6. WHEN setting current_node_id, THE system SHALL validate that the node ID references a UX-type node only

### Requirement 6: Journey Progression

**User Story:** As a system, I want entities to move along the UX spine based on system path execution, so that the journey reflects actual business process completion.

#### Acceptance Criteria

1. WHEN a system path is triggered for a UX node, THE system SHALL move the entity to that UX node and log a journey_event with type "node_arrival"
2. WHEN a system path completes successfully, THE system SHALL identify the next UX node on the spine and move the entity there
3. WHEN the entity moves to a new UX node, THE system SHALL validate the target node is UX-type and log a journey_event with type "node_departure" and "node_arrival"
4. WHEN there is no next UX node, THE system SHALL mark the entity journey as "completed"
5. WHEN a system path fails, THE system SHALL keep the entity at the current UX node and mark status as "failed"
6. WHEN updating current_node_id, THE system SHALL enforce validation that only UX-type nodes can be assigned to entities

### Requirement 7: Journey Monitoring

**User Story:** As a workflow manager, I want to monitor entity journeys in real-time, so that I can see progress and identify issues.

#### Acceptance Criteria

1. WHEN an entity moves on the UX spine, THE system SHALL update the display in real-time
2. WHEN a system path is executing, THE system SHALL show a processing indicator on the UX node
3. WHEN a system path fails, THE system SHALL show an error indicator on the UX node
4. WHEN an error occurs, THE system SHALL provide a retry option for the failed system path
5. WHEN monitoring, THE system SHALL use Supabase real-time or polling with 5-10 second intervals

### Requirement 8: Data Model Constraints

**User Story:** As a developer, I want the data model to enforce M-Shape architecture, so that entities cannot be placed inside system paths.

#### Acceptance Criteria

1. WHEN storing entity position, THE system SHALL validate at API and runtime that current_node_id references only UX-type nodes
2. WHEN edges are created, THE system SHALL distinguish between UX edges (journey) and system edges (workflow) using edge type metadata
3. WHEN runs are created, THE system SHALL associate them with a UX node (the trigger point) and validate the node type
4. WHEN querying entity positions, THE system SHALL include node type validation to ensure only UX nodes are returned
5. WHEN validating canvas structure, THE system SHALL verify UX spine connectivity using only UX edges

## Non-Functional Requirements

### Performance
- Entity position updates should reflect within 2 seconds
- Journey panel should load within 1 second for up to 1000 entities
- System path drill-down should render within 500ms

### Usability
- BMC should show entities at their current positions
- Drill-down navigation should be intuitive (click UX node to see system path)
- Entity status should be color-coded for quick scanning

### Data Integrity
- Entity current_node_id must always reference a valid UX node
- Journey events must be immutable once created
- System path completion must be atomic (all-or-nothing entity movement)

## Out of Scope

- Multiple UX spines per canvas (entities follow a single linear UX path)
- Conditional UX routing (entities always move to the next UX node in sequence)
- Time-based automatic progression (entities move only when system paths complete)
- Entity backtracking (entities only move forward on the spine)
- A/B testing of UX paths (single path per canvas)
