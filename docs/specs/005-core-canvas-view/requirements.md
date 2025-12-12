# Requirements: Core Canvas View

## Introduction

This specification defines the core canvas viewing and editing functionality for the Stitch workflow management system. The goal is to enable users to view, create, and edit workflow canvases with nodes and edges, providing the foundation for visual workflow design.

This spec implements Phase 1 from the Workflow Management UI Refactor Roadmap, focusing on making the canvas functional and interactive before adding entity management and run capabilities.

**Scope**: These requirements apply specifically to **workflow canvases** (the detailed workflow view inside a BMC section). BMC and section canvases remain read-mostly with the node palette and connection handles disabled. This distinction ensures we don't conflate editing modes when wiring React Flow.

## Glossary

- **Canvas**: A visual workspace representing a workflow, containing nodes and edges
- **Node**: A visual element on the canvas representing a workflow step or action
- **Edge**: A connection between two nodes representing data flow or execution order
- **Node Palette**: A UI component displaying available node types that can be added to the canvas (Worker, UX, Splitter, Collector, SectionItem)
- **Node Configuration**: Settings and parameters specific to each node type
- **React Flow**: The underlying library used for canvas rendering and interaction
- **WorkflowCanvas**: The main component that renders and manages the canvas

## Requirements

### Requirement 1: Canvas Display

**User Story:** As a user, I want to view existing workflow canvases with their nodes and edges, so that I can understand the workflow structure.

#### Acceptance Criteria

1. WHEN a user navigates to a canvas detail page THEN the system SHALL render the canvas without errors
2. WHEN a canvas contains nodes THEN the system SHALL display all nodes in their saved positions
3. WHEN a canvas contains edges THEN the system SHALL display all edges connecting the correct nodes
4. WHEN a canvas is displayed THEN the system SHALL enable pan and zoom interactions
5. WHEN the canvas loads THEN the system SHALL fetch node and edge data from the database

### Requirement 2: Node Addition

**User Story:** As a user, I want to add new nodes to my workflow canvas, so that I can build my workflow step by step.

#### Acceptance Criteria

1. WHEN a user views a canvas THEN the system SHALL display a node palette toggle button
2. WHEN a user clicks the palette toggle button THEN the system SHALL show or hide the node palette
3. WHEN the node palette is visible THEN the system SHALL display all available node types (Worker, UX, Splitter, Collector, SectionItem)
4. WHEN a user drags a node from the palette onto the canvas THEN the system SHALL create a new node at the drop position
5. WHEN a new node is created THEN the system SHALL persist the node to the database immediately
6. WHEN a new node is saved THEN the system SHALL update the canvas display to show the new node
7. WHEN the page is refreshed THEN the system SHALL display all previously added nodes

### Requirement 3: Node Configuration

**User Story:** As a user, I want to configure node settings, so that I can customize how each workflow step behaves.

#### Acceptance Criteria

1. WHEN a user clicks on a node THEN the system SHALL display the node configuration panel
2. WHEN the configuration panel is displayed THEN the system SHALL show all configurable properties for the selected node type
3. WHEN a user modifies a configuration value THEN the system SHALL update the node data in memory
4. WHEN a configuration value changes THEN the system SHALL debounce the change and auto-save to the database
5. WHEN configuration changes are saved THEN the system SHALL persist the changes to the database
6. WHEN the page is refreshed THEN the system SHALL display the saved configuration values
7. WHEN no node is selected THEN the system SHALL hide the configuration panel

### Requirement 4: Edge Creation and Deletion

**User Story:** As a user, I want to connect nodes with edges and remove unwanted connections, so that I can define the workflow execution order.

#### Acceptance Criteria

1. WHEN a user hovers over a node THEN the system SHALL display connection handles on the node
2. WHEN a user drags from a source handle to a target handle THEN the system SHALL create a new edge
3. WHEN a new edge is created THEN the system SHALL persist the edge to the database immediately
4. WHEN an edge is saved THEN the system SHALL update the canvas display to show the new edge
5. WHEN a user selects an edge and presses the Delete key THEN the system SHALL remove the edge from the canvas
6. WHEN an edge is deleted THEN the system SHALL remove the edge from the database
7. WHEN the page is refreshed THEN the system SHALL display all previously created edges

### Requirement 5: Data Persistence

**User Story:** As a system architect, I want all canvas changes to persist to the database immediately, so that no work is lost and the database remains the source of truth.

#### Acceptance Criteria

1. WHEN a node is added THEN the system SHALL call POST /api/canvas/[id]/nodes with the node data
2. WHEN a node configuration is changed THEN the system SHALL call PATCH /api/canvas/[id]/nodes/[nodeId] with the updated data
3. WHEN an edge is created THEN the system SHALL call POST /api/canvas/[id]/edges with the edge data
4. WHEN an edge is deleted THEN the system SHALL call DELETE /api/canvas/[id]/edges/[edgeId]
5. WHEN any database operation fails THEN the system SHALL display an error message to the user
6. WHEN any database operation succeeds THEN the system SHALL update the local state to reflect the change

### Requirement 6: User Interface Integration

**User Story:** As a user, I want a cohesive interface where all canvas editing features are accessible, so that I can efficiently build workflows.

#### Acceptance Criteria

1. WHEN a user views a canvas THEN the system SHALL display the WorkflowCanvas component
2. WHEN the WorkflowCanvas is displayed THEN the system SHALL include the node palette toggle button
3. WHEN a node is selected THEN the system SHALL display the NodeConfigPanel component
4. WHEN the canvas is interactive THEN the system SHALL provide visual feedback for all user actions
5. WHEN components are rendered THEN the system SHALL use consistent styling and layout

## Non-Functional Requirements

### Performance

1. Canvas rendering SHALL complete within 2 seconds for workflows with up to 50 nodes
2. Node configuration auto-save SHALL debounce changes with a 500ms delay
3. Database operations SHALL complete within 1 second under normal conditions

### Usability

1. The node palette SHALL be positioned to not obscure the canvas workspace
2. The node configuration panel SHALL be positioned to not obscure the canvas workspace
3. Error messages SHALL be clear and actionable
4. Loading states SHALL be visible for all async operations

### Reliability

1. Failed database operations SHALL not crash the application
2. The canvas SHALL remain functional if individual API calls fail
3. All user actions SHALL provide feedback (success or error)

## Out of Scope

The following features are explicitly out of scope for this specification:

- Entity management and display
- Workflow execution and run management
- Run status monitoring
- Dashboard and analytics
- Settings pages (webhooks, functions, schedules)
- Performance optimizations (virtual scrolling, etc.)
- Security hardening (will be addressed in Phase 7)
- Comprehensive testing (will be addressed in Phase 7)

These features will be addressed in subsequent specifications following the refactor roadmap.
