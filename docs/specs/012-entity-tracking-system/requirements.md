# Requirements Document

## Introduction

The Entity Tracking System enables real-time visualization and tracking of individual entities (customers, leads, etc.) as they move through Stitch workflows. This system provides granular position tracking, journey history, and visual representation of entities traveling along edges between nodes in the workflow canvas.

## Glossary

- **Entity**: An individual customer, lead, or business object being tracked through the system
- **Node**: A station or processing point in a workflow where entities can reside
- **Edge**: A path connecting two nodes along which entities travel
- **Journey**: The complete path an entity takes through a workflow
- **Edge Progress**: A normalized value (0.0 to 1.0) representing an entity's position along an edge
- **Journey Event**: A timestamped record of an entity's movement or state change
- **Entity Dot**: A visual representation of an entity on the canvas
- **Stitch System**: The workflow execution engine that processes entities through nodes

## Requirements

### Requirement 1

**User Story:** As a business user, I want to see individual entities positioned on the workflow canvas, so that I can understand where each customer is in the process at any given moment.

#### Acceptance Criteria

1. WHEN an entity is at a node THEN the Stitch System SHALL store the current node identifier in the entity record
2. WHEN an entity is traveling along an edge THEN the Stitch System SHALL store both the edge identifier and progress value in the entity record
3. WHEN querying an entity's position THEN the Stitch System SHALL return either a node identifier or an edge identifier with progress, but not both simultaneously
4. WHEN an entity's edge progress is stored THEN the Stitch System SHALL ensure the value is between 0.0 and 1.0 inclusive
5. WHERE an entity has no position data THEN the Stitch System SHALL treat the entity as not yet started in the workflow

### Requirement 2

**User Story:** As a system administrator, I want entity position data persisted in the database, so that entity locations survive system restarts and can be queried efficiently.

#### Acceptance Criteria

1. WHEN an entity's position changes THEN the Stitch System SHALL update the database record immediately
2. WHEN the system restarts THEN the Stitch System SHALL restore all entity positions from the database
3. WHEN querying entities by node THEN the Stitch System SHALL return all entities currently at that node
4. WHEN querying entities by edge THEN the Stitch System SHALL return all entities currently on that edge with their progress values
5. WHEN an entity moves from edge to node THEN the Stitch System SHALL clear the edge position fields and set the node position field

### Requirement 3

**User Story:** As a business analyst, I want detailed journey history for each entity, so that I can analyze conversion paths and identify bottlenecks.

#### Acceptance Criteria

1. WHEN an entity starts traveling on an edge THEN the Stitch System SHALL create a journey event record with the edge identifier and timestamp
2. WHEN an entity arrives at a node THEN the Stitch System SHALL create a journey event record with the node identifier and timestamp
3. WHEN an entity completes processing at a node THEN the Stitch System SHALL create a journey event record with the completion event type
4. WHEN querying an entity's journey history THEN the Stitch System SHALL return all events ordered chronologically
5. WHEN a journey event is created THEN the Stitch System SHALL include the entity identifier, event type, timestamp, and relevant node or edge identifier

### Requirement 4

**User Story:** As a workflow designer, I want to see aggregate statistics on edges, so that I can understand traffic patterns and conversion rates between nodes.

#### Acceptance Criteria

1. WHEN calculating edge statistics THEN the Stitch System SHALL count the total number of entities that have traversed the edge
2. WHEN calculating edge conversion rate THEN the Stitch System SHALL compute the ratio of entities that completed the downstream node to entities that entered the edge
3. WHEN displaying edge data THEN the Stitch System SHALL include current entity count, total historical count, and conversion rate
4. WHEN an edge has no historical data THEN the Stitch System SHALL return zero for traffic count and null for conversion rate
5. WHEN multiple entities are on the same edge THEN the Stitch System SHALL track each entity's progress independently

### Requirement 5

**User Story:** As a user viewing the canvas, I want to see visual representations of entities, so that I can quickly identify where customers are in the workflow.

#### Acceptance Criteria

1. WHEN an entity is at a node THEN the Stitch System SHALL render an entity dot at the node's position
2. WHEN an entity is on an edge THEN the Stitch System SHALL render an entity dot at the interpolated position based on edge progress
3. WHEN rendering an entity dot THEN the Stitch System SHALL apply color coding based on entity type
4. WHEN multiple entities are at the same position THEN the Stitch System SHALL render them with slight offsets to prevent overlap
5. WHEN the canvas viewport changes THEN the Stitch System SHALL update entity dot screen coordinates accordingly

### Requirement 6

**User Story:** As a developer, I want programmatic functions to control entity movement, so that I can integrate entity tracking with workflow execution logic.

#### Acceptance Criteria

1. WHEN starting an entity journey THEN the Stitch System SHALL accept an entity identifier and edge identifier as parameters
2. WHEN starting an entity journey THEN the Stitch System SHALL set the entity's edge position to the specified edge with progress 0.0
3. WHEN moving an entity along an edge THEN the Stitch System SHALL accept an entity identifier and progress value as parameters
4. WHEN moving an entity along an edge THEN the Stitch System SHALL update the entity's edge progress to the specified value
5. WHEN an entity arrives at a node THEN the Stitch System SHALL clear the edge position fields and set the current node identifier
6. WHEN an entity arrives at a node THEN the Stitch System SHALL create a journey event recording the arrival
7. WHEN any movement function is called with an invalid entity identifier THEN the Stitch System SHALL return an error without modifying database state

### Requirement 7

**User Story:** As a system integrator, I want entity position updates to trigger real-time UI updates, so that users see entity movement without manual refresh.

#### Acceptance Criteria

1. WHEN an entity's position changes in the database THEN the Stitch System SHALL emit a real-time update event
2. WHEN a client subscribes to entity updates for a run THEN the Stitch System SHALL send position changes for all entities in that run
3. WHEN an entity moves along an edge THEN the Stitch System SHALL broadcast the new progress value to subscribed clients
4. WHEN an entity arrives at a node THEN the Stitch System SHALL broadcast the node arrival to subscribed clients
5. WHERE real-time connection is unavailable THEN the Stitch System SHALL allow polling-based position queries as a fallback

### Requirement 8

**User Story:** As a workflow operator, I want to manually move entities between nodes, so that I can handle exceptions and test workflows.

#### Acceptance Criteria

1. WHEN manually moving an entity THEN the Stitch System SHALL validate that the target node exists in the workflow
2. WHEN manually moving an entity THEN the Stitch System SHALL create a journey event with a manual movement event type
3. WHEN manually moving an entity to a node THEN the Stitch System SHALL clear any edge position data
4. WHEN manually moving an entity THEN the Stitch System SHALL update the entity's position immediately in the database
5. WHERE the target node is invalid THEN the Stitch System SHALL reject the movement and return an error message
