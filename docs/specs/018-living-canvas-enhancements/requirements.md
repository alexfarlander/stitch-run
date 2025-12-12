# Requirements Document

## Introduction

The Living Canvas Enhancements feature builds upon the existing Living Canvas foundation to add advanced visualizations, interactive controls, and AI-powered workflow creation. These enhancements transform Stitch from a real-time execution viewer into an interactive, cinematic experience with professional-grade animations and intelligent assistance. The goal is to create the "wow factor" that makes Stitch demonstrations compelling and memorable.

## Glossary

- **Canvas**: A visual representation of either a Business Model Canvas (BMC) or a workflow graph
- **Edge Traversal**: The visual animation of data or entities moving along an edge between nodes
- **Node Status Animation**: Visual feedback showing a node's execution state through animated effects
- **Node Configuration Panel**: An interactive UI panel for editing node settings and worker configurations
- **Entity Cluster**: A visual grouping of multiple entities at the same location, displayed as a badge with count
- **Timeline Scrubber**: A UI control that allows users to navigate through workflow execution history
- **Time Travel**: The ability to view the canvas state at any point in the past execution timeline
- **AI Assistant**: A chat-based interface for creating and modifying workflows using natural language
- **Drill-Down Animation**: The visual transition effect when navigating from BMC to workflow view
- **Worker Definition**: The schema defining a worker's input/output structure and configuration options
- **Cinematic Mode**: A visualization mode with enhanced animations for demonstrations
- **Journey Event**: A database record tracking an entity's movement through the canvas
- **Node State**: The execution status and output data for a node in a workflow run

## Requirements

### Requirement 1

**User Story:** As a user, I want to see glowing pulses travel along edges when entities move, so that I can visually track the flow of data through my workflow.

#### Acceptance Criteria

1. WHEN an entity begins moving from node A to node B THEN the System SHALL display a glowing pulse animation along the connecting edge
2. WHEN the pulse animation plays THEN the System SHALL use a cyan gradient that travels from source to target
3. WHEN the pulse reaches the target node THEN the System SHALL complete the animation within 500 milliseconds
4. WHEN multiple entities traverse the same edge THEN the System SHALL display multiple pulses without visual interference
5. WHEN an edge is not being traversed THEN the System SHALL display the edge in its default state without pulse effects

### Requirement 2

**User Story:** As a user, I want nodes to have animated glowing effects based on their status, so that I can immediately understand workflow health through visual feedback.

#### Acceptance Criteria

1. WHEN a node status is "running" THEN the Canvas SHALL display a pulsing amber box-shadow animation
2. WHEN a node status changes to "completed" THEN the Canvas SHALL display a bright green flash that fades over 1 second
3. WHEN a node status changes to "failed" THEN the Canvas SHALL display a bright red flash that fades over 1 second
4. WHEN a node is idle THEN the Canvas SHALL display no animated effects
5. WHEN animations play THEN the Canvas SHALL use CSS keyframe animations for optimal performance

### Requirement 3

**User Story:** As a user, I want to click on a node to open a configuration panel, so that I can edit worker settings and input mappings without leaving the canvas.

#### Acceptance Criteria

1. WHEN a user clicks a workflow node THEN the Canvas SHALL display a configuration panel on the right side
2. WHEN the configuration panel opens THEN the System SHALL display the current worker type and all input field values
3. WHEN the user changes the worker type THEN the System SHALL update the input fields to match the new worker's schema
4. WHEN the user saves configuration changes THEN the System SHALL update the node in the database and close the panel
5. WHEN the user clicks outside the panel or presses escape THEN the System SHALL close the panel without saving changes

### Requirement 4

**User Story:** As a user, I want large groups of entities at the same node to display as a single badge with a count, so that the canvas remains readable when many entities are present.

#### Acceptance Criteria

1. WHEN more than 5 entities are at the same node THEN the Canvas SHALL display a single cluster badge instead of individual dots
2. WHEN a cluster badge is displayed THEN the Canvas SHALL show the count of entities in the cluster
3. WHEN a user clicks a cluster badge THEN the Canvas SHALL display a popover list of all entities in the cluster
4. WHEN 5 or fewer entities are at a node THEN the Canvas SHALL display individual entity dots
5. WHEN entities are added or removed from a cluster THEN the Canvas SHALL update the count in real-time

### Requirement 5

**User Story:** As a user, I want to manually move entities between nodes using drag-and-drop, so that I can test different workflow paths and scenarios.

#### Acceptance Criteria

1. WHEN a user drags an entity dot THEN the Canvas SHALL display a visual indicator of the drag operation
2. WHEN a user drops an entity on a valid target node THEN the System SHALL update the entity's position in the database
3. WHEN a user drops an entity on an invalid target THEN the System SHALL return the entity to its original position
4. WHEN an entity is moved manually THEN the System SHALL record a journey event with type "manual_move"
5. WHEN an entity is moved THEN the Canvas SHALL animate the movement along the connecting edge

### Requirement 6

**User Story:** As a user, I want a timeline scrubber at the bottom of the canvas, so that I can navigate through workflow execution history and debug issues.

#### Acceptance Criteria

1. WHEN viewing a completed workflow run THEN the Canvas SHALL display a timeline scrubber at the bottom
2. WHEN the user moves the scrubber slider THEN the Canvas SHALL update all node statuses to reflect the state at that timestamp
3. WHEN the user scrubs through time THEN the Canvas SHALL display entity positions as they were at that point in history
4. WHEN the scrubber reaches the end of the timeline THEN the Canvas SHALL display the final execution state
5. WHEN the user exits time travel mode THEN the Canvas SHALL return to displaying the current real-time state

### Requirement 7

**User Story:** As a user, I want to reconstruct historical node states from journey events, so that I can see exactly what happened at any point in the workflow execution.

#### Acceptance Criteria

1. WHEN reconstructing state for a timestamp THEN the System SHALL query all journey events up to that timestamp
2. WHEN processing journey events THEN the System SHALL apply node_arrival events to set status to "running"
3. WHEN processing journey events THEN the System SHALL apply node_complete events to set status to "completed"
4. WHEN processing journey events THEN the System SHALL apply node_failure events to set status to "failed"
5. WHEN reconstruction completes THEN the System SHALL return a complete node_states object for that timestamp

### Requirement 8

**User Story:** As a user, I want an AI assistant chat panel, so that I can create and modify workflows using natural language instead of manual node placement.

#### Acceptance Criteria

1. WHEN a user clicks the AI assistant icon THEN the Canvas SHALL display a chat panel in the bottom-right corner
2. WHEN the user types a message THEN the System SHALL send the request to the AI manager API
3. WHEN the AI responds with a workflow creation action THEN the System SHALL add the new nodes and edges to the canvas
4. WHEN the AI responds with a workflow modification action THEN the System SHALL update the existing canvas graph
5. WHEN the AI operation completes THEN the Canvas SHALL display the changes immediately without page refresh

### Requirement 9

**User Story:** As a user, I want the AI assistant to understand the current canvas context, so that it can make intelligent suggestions based on existing nodes and workflows.

#### Acceptance Criteria

1. WHEN sending a request to the AI THEN the System SHALL include the current canvas ID in the request
2. WHEN the AI processes a request THEN the System SHALL have access to the current canvas structure and node types
3. WHEN the AI creates nodes THEN the System SHALL use valid worker types from the worker registry
4. WHEN the AI creates edges THEN the System SHALL ensure they connect to existing nodes
5. WHEN the AI suggests modifications THEN the System SHALL validate changes before applying them to the canvas

### Requirement 10

**User Story:** As a user, I want enhanced drill-down animations when navigating from BMC to workflow view, so that the transition feels smooth and intuitive.

#### Acceptance Criteria

1. WHEN drilling into a section THEN the Canvas SHALL animate with a zoom-in effect from scale 2 to scale 1
2. WHEN navigating back to BMC THEN the Canvas SHALL animate with a zoom-out effect from scale 0.5 to scale 1
3. WHEN the animation plays THEN the Canvas SHALL use a 300ms duration with ease-in-out timing
4. WHEN drilling down THEN the Canvas SHALL fade in the new view from opacity 0 to 1
5. WHEN the animation completes THEN the Canvas SHALL be fully interactive with no lag

### Requirement 11

**User Story:** As a user, I want visual cues on section nodes that indicate they contain workflows, so that I know which sections I can drill into.

#### Acceptance Criteria

1. WHEN a section node has a child workflow THEN the Canvas SHALL display a layers icon in the corner
2. WHEN a user hovers over a section with a workflow THEN the Canvas SHALL display a tooltip saying "Double-click to drill down"
3. WHEN a section has no child workflow THEN the Canvas SHALL not display the drill-down icon
4. WHEN a user double-clicks a section with a workflow THEN the Canvas SHALL navigate to the workflow view
5. WHEN a section is being hovered THEN the Canvas SHALL highlight the drill-down icon

### Requirement 12

**User Story:** As a developer, I want to access worker definitions from the registry, so that I can dynamically generate configuration forms for any worker type.

#### Acceptance Criteria

1. WHEN the configuration panel loads THEN the System SHALL import WORKER_DEFINITIONS from the worker registry
2. WHEN displaying worker type options THEN the System SHALL list all keys from WORKER_DEFINITIONS
3. WHEN a worker type is selected THEN the System SHALL access the input schema from WORKER_DEFINITIONS
4. WHEN generating form fields THEN the System SHALL create inputs for each field in the worker's input schema
5. WHEN validating configuration THEN the System SHALL ensure all required fields from the schema are provided

### Requirement 13

**User Story:** As a user, I want the node configuration panel to validate my inputs, so that I don't save invalid configurations that will cause workflow failures.

#### Acceptance Criteria

1. WHEN a required field is empty THEN the System SHALL display a validation error message
2. WHEN a field has an invalid format THEN the System SHALL display a format-specific error message
3. WHEN all fields are valid THEN the System SHALL enable the save button
4. WHEN validation errors exist THEN the System SHALL disable the save button
5. WHEN the user attempts to save with errors THEN the System SHALL prevent the save and highlight invalid fields

### Requirement 14

**User Story:** As a user, I want entity movement to be validated before execution, so that I don't accidentally move entities to invalid locations.

#### Acceptance Criteria

1. WHEN moving an entity to a target node THEN the System SHALL verify the target node exists in the canvas
2. WHEN moving an entity between nodes THEN the System SHALL verify an edge exists connecting the nodes
3. WHEN validation fails THEN the System SHALL display an error message and prevent the movement
4. WHEN validation succeeds THEN the System SHALL execute the movement and update the database
5. WHEN a validation error occurs THEN the System SHALL log the error with details for debugging

### Requirement 15

**User Story:** As a user, I want the timeline scrubber to show event markers, so that I can quickly jump to important moments in the workflow execution.

#### Acceptance Criteria

1. WHEN displaying the timeline THEN the Canvas SHALL show markers for node completion events
2. WHEN displaying the timeline THEN the Canvas SHALL show markers for node failure events
3. WHEN a user clicks a marker THEN the Canvas SHALL jump to that timestamp in the timeline
4. WHEN hovering over a marker THEN the Canvas SHALL display a tooltip with event details
5. WHEN multiple events occur at similar times THEN the Canvas SHALL cluster markers to prevent overlap

### Requirement 16

**User Story:** As a user, I want the AI assistant to provide feedback on workflow structure, so that I can learn best practices and optimize my workflows.

#### Acceptance Criteria

1. WHEN the AI analyzes a workflow THEN the System SHALL identify potential bottlenecks or inefficiencies
2. WHEN the AI finds issues THEN the System SHALL provide specific suggestions for improvement
3. WHEN the AI suggests changes THEN the System SHALL explain the reasoning behind each suggestion
4. WHEN the user accepts a suggestion THEN the System SHALL apply the changes to the canvas
5. WHEN the user rejects a suggestion THEN the System SHALL remember the preference for future interactions

### Requirement 17

**User Story:** As a user, I want edge traversal animations to be synchronized with entity movement, so that the visual feedback accurately represents the data flow.

#### Acceptance Criteria

1. WHEN an entity starts moving THEN the System SHALL trigger the edge traversal animation simultaneously
2. WHEN the entity animation completes THEN the System SHALL complete the edge traversal animation at the same time
3. WHEN multiple entities move on the same edge THEN the System SHALL stagger the pulse animations
4. WHEN cinematic mode is enabled THEN the System SHALL use the configured animation duration for both entity and edge animations
5. WHEN animations are disabled THEN the System SHALL skip both entity and edge animations

### Requirement 18

**User Story:** As a user, I want the configuration panel to show real-time validation feedback, so that I can fix errors as I type instead of waiting until I save.

#### Acceptance Criteria

1. WHEN a user types in an input field THEN the System SHALL validate the input in real-time
2. WHEN validation fails THEN the System SHALL display an error message below the field immediately
3. WHEN validation succeeds THEN the System SHALL remove any previous error messages
4. WHEN a field loses focus THEN the System SHALL perform a final validation check
5. WHEN all fields are valid THEN the System SHALL display a success indicator

### Requirement 19

**User Story:** As a user, I want to see a "Back to Surface" button when viewing a workflow, so that I can easily navigate back to the BMC view.

#### Acceptance Criteria

1. WHEN viewing a workflow canvas THEN the Canvas SHALL display a "Back to Surface" button in the toolbar
2. WHEN the user clicks the button THEN the Canvas SHALL navigate to the parent BMC view
3. WHEN the button is displayed THEN the Canvas SHALL show it with a clear visual style
4. WHEN navigating back THEN the Canvas SHALL preserve entity positions and run states
5. WHEN at the top-level BMC THEN the Canvas SHALL not display the back button

### Requirement 20

**User Story:** As a user, I want the AI assistant to remember conversation context, so that I can have natural multi-turn conversations about workflow creation.

#### Acceptance Criteria

1. WHEN the user sends a message THEN the System SHALL include previous messages in the conversation history
2. WHEN the AI responds THEN the System SHALL reference previous context when relevant
3. WHEN the user refers to "the workflow" or "that node" THEN the System SHALL understand the reference from context
4. WHEN the conversation ends THEN the System SHALL clear the context for the next session
5. WHEN the user starts a new conversation THEN the System SHALL begin with a fresh context
