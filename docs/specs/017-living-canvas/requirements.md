# Requirements Document

## Introduction

The Living Canvas feature transforms Stitch from a static visual workflow tool into a dynamic, real-time execution environment where users can see workflows execute, entities move through the business model, and outputs generate in real-time. This feature is the key differentiator that sets Stitch apart from traditional workflow tools like n8n or Zapier by making the Business Model Canvas itself executable and alive.

## Glossary

- **Canvas**: A visual representation of either a Business Model Canvas (BMC) or a workflow graph
- **BMC (Business Model Canvas)**: The top-level canvas showing 12 business sections (Marketing, Sales, Revenue, etc.)
- **Entity**: A customer, lead, or data object that travels through the canvas (e.g., "Monica", "Ross")
- **Node**: A single step in a workflow (worker, splitter, collector, UX)
- **Edge**: A connection between nodes that defines data flow and entity travel paths
- **Worker Node**: A node that performs asynchronous work via external services
- **Run**: A single execution instance of a workflow
- **Demo Mode**: An automated demonstration that spawns entities and executes workflows
- **Entity Movement**: The visual and data representation of entities traveling along edges
- **Journey Event**: A database record tracking an entity's movement through the canvas
- **Node Status**: The execution state of a node (idle, running, completed, failed)
- **OEG (Optimized Execution Graph)**: The compiled, executable version of a visual graph

## Requirements

### Requirement 1

**User Story:** As a user, I want to see nodes change status in real-time as workflows execute, so that I can understand what is currently happening in my workflow.

#### Acceptance Criteria

1. WHEN a node begins execution THEN the System SHALL update the node status to "running" in the database
2. WHEN a node completes successfully THEN the System SHALL update the node status to "completed" in the database
3. WHEN a node fails THEN the System SHALL update the node status to "failed" in the database and store the error message
4. WHEN a node status changes THEN the System SHALL broadcast the change via Supabase real-time subscriptions
5. WHILE a node is in "running" status THEN the Canvas SHALL display a pulsing animation on that node

### Requirement 2

**User Story:** As a user, I want to see visual animations of data flowing along edges during execution, so that I can understand how data moves through my workflow.

#### Acceptance Criteria

1. WHEN data flows from one node to another THEN the Canvas SHALL display animated particles moving along the edge
2. WHEN an edge is actively transmitting data THEN the Canvas SHALL increase the animation intensity
3. WHEN multiple data items flow through an edge THEN the Canvas SHALL adjust particle density to reflect volume
4. WHEN an edge has not transmitted data recently THEN the Canvas SHALL display the edge in an idle state
5. WHILE particles are animating THEN the Canvas SHALL maintain smooth 60fps animation performance

### Requirement 3

**User Story:** As a user, I want to see node outputs in a side panel as they complete, so that I can inspect the data being generated without leaving the canvas view.

#### Acceptance Criteria

1. WHEN a node completes execution THEN the System SHALL store the output data in the database
2. WHEN a user clicks on a completed node THEN the Canvas SHALL display a side panel showing the node's output
3. WHEN the output contains media files THEN the Canvas SHALL render previews for images, videos, and audio
4. WHEN the output contains JSON data THEN the Canvas SHALL format it with syntax highlighting
5. WHEN a node is still running THEN the Canvas SHALL display a loading indicator in the output panel

### Requirement 4

**User Story:** As a user, I want entities to visually attach to specific nodes in the workflow, so that I know exactly where they are in the funnel.

#### Acceptance Criteria

1. WHEN an entity exists THEN the System SHALL store a current_node_id reference for that entity
2. WHEN the Canvas renders THEN the Canvas SHALL display the entity avatar visually docked next to its current node
3. WHEN multiple entities are at the same node THEN the Canvas SHALL cluster them visually with offset positioning
4. WHEN an entity is not transitioning THEN the Canvas SHALL ensure the entity is anchored to a node
5. WHEN an entity's current_node_id changes THEN the System SHALL update the database immediately

### Requirement 5

**User Story:** As a user, I want to see entities travel along the connecting lines when they advance to the next step, so that I can visualize the customer journey like a board game.

#### Acceptance Criteria

1. WHEN an entity's current_node_id changes from node A to node B THEN the System SHALL identify the edge connecting A to B
2. WHEN an edge is identified THEN the Canvas SHALL play a translation animation following that edge's SVG path
3. WHEN the animation completes THEN the Canvas SHALL dock the entity at the target node
4. WHEN no direct edge exists between nodes THEN the System SHALL prevent the movement and log an error
5. WHEN travel animation is playing THEN the Canvas SHALL use the duration specified in cinematic mode settings

### Requirement 5A

**User Story:** As a user, I want entities to move between BMC sections when workflows complete, so that I can see the complete customer journey across my entire business model.

#### Acceptance Criteria

1. WHEN a workflow in a section completes THEN the System SHALL move the entity to the target section specified in the configuration
2. WHEN viewing the BMC canvas THEN the Canvas SHALL display entities at their current section positions
3. WHEN an entity moves between sections THEN the Canvas SHALL animate the movement at the BMC level
4. WHEN multiple entities are in a section THEN the Canvas SHALL position them to avoid overlap
5. WHEN an entity enters a new section THEN the System SHALL update financial metrics based on the section type

### Requirement 6

**User Story:** As a user, I want to trigger a demo mode that automatically runs workflows with sample entities, so that I can quickly demonstrate how Stitch works to stakeholders.

#### Acceptance Criteria

1. WHEN a user activates demo mode THEN the System SHALL reset the canvas to a predefined initial state
2. WHEN demo mode starts THEN the System SHALL spawn multiple demo entities at specified positions
3. WHEN demo entities are spawned THEN the System SHALL trigger workflows for each entity with staggered delays
4. WHEN demo workflows execute THEN the Canvas SHALL display all real-time visualizations as normal
5. WHEN demo mode completes THEN the System SHALL provide an option to reset or keep the demo state

### Requirement 7

**User Story:** As a developer, I want entity movement to be configurable per worker node, so that I can control where entities go after each workflow step.

#### Acceptance Criteria

1. WHEN defining a worker node THEN the System SHALL accept an entityMovement configuration object
2. WHEN entityMovement specifies a target node THEN the System SHALL move entities to that node upon completion
3. WHEN entityMovement specifies a target section THEN the System SHALL move entities to that BMC section
4. WHEN entityMovement is not specified THEN the System SHALL keep entities at their current position
5. WHEN a worker fails THEN the System SHALL not move the entity from its current position

### Requirement 8

**User Story:** As a user, I want to see visual feedback that distinguishes between idle, running, completed, and failed nodes, so that I can quickly assess workflow health at a glance.

#### Acceptance Criteria

1. WHEN a node is idle THEN the Canvas SHALL display the node with default styling
2. WHEN a node is running THEN the Canvas SHALL display a pulsing animation with a blue indicator
3. WHEN a node completes successfully THEN the Canvas SHALL display a green glow effect
4. WHEN a node fails THEN the Canvas SHALL display a red indicator with an error icon
5. WHEN a user hovers over a failed node THEN the Canvas SHALL display a tooltip with the error message

### Requirement 9

**User Story:** As a user, I want entity dots to display avatars or identifiers, so that I can distinguish between different customers or leads on the canvas.

#### Acceptance Criteria

1. WHEN an entity has an avatar URL THEN the Canvas SHALL display the avatar image in the entity dot
2. WHEN an entity has a name THEN the Canvas SHALL display the name on hover
3. WHEN an entity has no avatar THEN the Canvas SHALL display a colored dot based on entity type
4. WHEN multiple entities are at the same position THEN the Canvas SHALL stack or cluster them visually
5. WHEN a user clicks an entity dot THEN the Canvas SHALL display the entity's journey history

### Requirement 10

**User Story:** As a system administrator, I want to track how long an entity spent at each step, so that I can analyze bottlenecks and optimize workflows.

#### Acceptance Criteria

1. WHEN an entity enters a node THEN the System SHALL record a journey event with entry timestamp and node ID
2. WHEN an entity leaves a node THEN the System SHALL record a journey event with exit timestamp and node ID
3. WHEN calculating dwell time THEN the System SHALL compute the duration between entry and exit timestamps
4. WHEN querying journey events THEN the System SHALL support filtering by entity, time range, and canvas
5. WHEN displaying entity history THEN the Canvas SHALL show dwell time for each node visited

### Requirement 11

**User Story:** As a user, I want the canvas to subscribe to real-time updates from the database, so that I see changes immediately without refreshing the page.

#### Acceptance Criteria

1. WHEN the canvas loads THEN the System SHALL establish a Supabase real-time subscription for node status changes
2. WHEN the canvas loads THEN the System SHALL establish a Supabase real-time subscription for entity position changes
3. WHEN a subscribed record changes THEN the Canvas SHALL update the visual representation within 500ms
4. WHEN the canvas unmounts THEN the System SHALL clean up all real-time subscriptions
5. WHEN a subscription error occurs THEN the System SHALL attempt to reconnect with exponential backoff

### Requirement 12

**User Story:** As a user, I want to drill down from the BMC view into a section's workflow and back, so that I can navigate between high-level business view and detailed execution view.

#### Acceptance Criteria

1. WHEN a user clicks a BMC section THEN the Canvas SHALL navigate to the workflow view for that section
2. WHEN viewing a workflow THEN the Canvas SHALL display a breadcrumb showing the navigation path
3. WHEN a user clicks the breadcrumb THEN the Canvas SHALL navigate back to the BMC view
4. WHEN navigating between views THEN the Canvas SHALL preserve entity positions and statuses
5. WHEN an entity moves while viewing a different level THEN the System SHALL update both BMC and workflow views

### Requirement 13

**User Story:** As a developer, I want a demo mode API that can be triggered programmatically, so that I can integrate demonstrations into presentations or automated tests.

#### Acceptance Criteria

1. WHEN calling the demo mode API THEN the System SHALL accept a canvas ID parameter
2. WHEN calling the demo mode API THEN the System SHALL accept optional entity configurations
3. WHEN the demo starts THEN the System SHALL return a demo session ID
4. WHEN querying the demo session THEN the System SHALL return the current status and progress
5. WHEN the demo completes THEN the System SHALL mark the session as complete and return final metrics

### Requirement 14

**User Story:** As a user, I want to control the speed of entity animations and workflow execution, so that I can create cinematic demonstrations or speed through testing.

#### Acceptance Criteria

1. WHEN cinematic mode is enabled THEN the System SHALL use configurable animation durations for entity travel
2. WHEN cinematic mode is disabled THEN the System SHALL use instant or minimal animation durations
3. WHEN setting animation speed THEN the System SHALL accept values from 0.1x to 5x normal speed
4. WHEN workflows execute in cinematic mode THEN the System SHALL add artificial delays between node completions
5. WHEN the user changes speed settings THEN the Canvas SHALL apply the new speed to ongoing animations
