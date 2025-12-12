# Requirements Document

## Introduction

This specification addresses critical bugs and stability issues discovered during manual testing of the Stitch Living Business Model Canvas. The testing revealed several high-priority issues affecting entity movement, canvas rendering stability, user interactions, and demo orchestration. These issues significantly impact the user experience and must be resolved to ensure the system functions reliably.

## Glossary

- **Entity**: A customer or lead represented as a visual dot that travels across the canvas
- **Canvas**: The visual workspace displaying the Business Model Canvas or workflow diagrams
- **Node**: A visual element on the canvas representing a section, item, or workflow step
- **Demo Orchestrator**: The system that automates entity movement for demonstration purposes
- **Entity Count Badge**: A numeric indicator showing how many entities are present at a node
- **Edge**: A connection between nodes that entities travel along
- **Panel**: A side panel UI component displaying entity details, AI assistant, or events log
- **Flickering**: Rapid, unintended visual changes causing instability in the UI

## Requirements

### Requirement 1

**User Story:** As a user watching the demo, I want entities to complete their journey to destination nodes, so that I can see the full customer journey visualization.

#### Acceptance Criteria

1. WHEN an entity begins moving from a source node to a destination node THEN the system SHALL ensure the entity reaches the destination node without disappearing
2. WHEN an entity is in transit between nodes THEN the system SHALL maintain the entity's visibility throughout the entire journey
3. WHEN an entity reaches a destination node THEN the system SHALL update the entity's position in the database to reflect the new location
4. WHEN multiple entities are moving simultaneously THEN the system SHALL handle all movements without losing any entities
5. WHEN an entity movement is interrupted by a page refresh THEN the system SHALL restore the entity to its last persisted position

### Requirement 2

**User Story:** As a user viewing the canvas, I want a stable, flicker-free display, so that I can comfortably observe entity movements and canvas state.

#### Acceptance Criteria

1. WHEN the demo is running THEN the canvas SHALL render without flickering or rapid visual changes
2. WHEN entities are moving on the canvas THEN the section nodes SHALL remain visible and stable
3. WHEN the canvas re-renders THEN the system SHALL use efficient rendering techniques to prevent unnecessary updates
4. WHEN multiple real-time updates occur THEN the system SHALL batch updates to minimize render cycles
5. WHEN the canvas displays complex layouts THEN the system SHALL maintain 60fps rendering performance

### Requirement 3

**User Story:** As a user, I want to click on entity count badges to see which entities are at a node, so that I can inspect individual entity details.

#### Acceptance Criteria

1. WHEN a node displays an entity count badge THEN the badge SHALL be clickable
2. WHEN a user clicks an entity count badge THEN the system SHALL display a list of entities at that node
3. WHEN the entity list is displayed THEN the system SHALL show entity names, avatars, and types
4. WHEN a user clicks an entity in the list THEN the system SHALL open the entity detail panel
5. WHEN no entities are present at a node THEN the system SHALL not display an entity count badge

### Requirement 4

**User Story:** As a user, I want to interact with canvas elements without interference from edge visibility layers, so that I can click on nodes and navigate effectively.

#### Acceptance Criteria

1. WHEN edges are rendered on the canvas THEN the edge layer SHALL not block pointer events to underlying nodes
2. WHEN a user clicks on a node THEN the system SHALL register the click regardless of edge visibility settings
3. WHEN edges have 0% opacity THEN the edge layer SHALL have pointer-events set to none
4. WHEN edges are visible THEN the edge layer SHALL only capture pointer events on the visible edge paths
5. WHEN the canvas has multiple layers THEN the system SHALL maintain correct z-index ordering for interaction

### Requirement 5

**User Story:** As a user, I want to double-click section nodes to drill down into their workflows, so that I can navigate the canvas hierarchy.

#### Acceptance Criteria

1. WHEN a user double-clicks a section node THEN the system SHALL navigate to the section's workflow canvas
2. WHEN a section node is double-clicked THEN the system SHALL load the workflow canvas without errors
3. WHEN navigating to a workflow canvas THEN the system SHALL update the breadcrumb navigation
4. WHEN a section has no associated workflow THEN the system SHALL handle the double-click gracefully
5. WHEN double-click navigation occurs THEN the system SHALL preserve the current demo state

### Requirement 6

**User Story:** As a user viewing the right side panel, I want the panel to remain on my selected tab, so that I can review information without unexpected interruptions.

#### Acceptance Criteria

1. WHEN a user selects a panel tab THEN the panel SHALL remain on that tab until the user changes it
2. WHEN the demo is running THEN the panel SHALL not automatically switch tabs
3. WHEN entity events occur THEN the system SHALL not force the panel to switch to Entity Details
4. WHEN a user explicitly clicks an entity THEN the system SHALL switch to Entity Details tab
5. WHEN the panel tab changes THEN the system SHALL only change due to explicit user action

### Requirement 7

**User Story:** As a user watching the demo, I want to see a logical, sequential flow of events, so that I can understand the customer journey progression.

#### Acceptance Criteria

1. WHEN the demo script executes THEN events SHALL occur in a logical sequence
2. WHEN an entity transitions through stages THEN the system SHALL not show duplicate or conflicting events
3. WHEN an entity purchases a plan THEN the system SHALL show only one purchase event per transaction
4. WHEN an entity changes type THEN the system SHALL show the type change before subsequent actions
5. WHEN the events log displays events THEN events SHALL be ordered chronologically and make narrative sense

### Requirement 8

**User Story:** As a developer, I want consistent environment variable naming, so that the application configuration is clear and maintainable.

#### Acceptance Criteria

1. WHEN the application reads Supabase configuration THEN the system SHALL use consistent environment variable names
2. WHEN documentation references environment variables THEN the documentation SHALL match the actual variable names used
3. WHEN the application starts THEN the system SHALL validate that required environment variables are present
4. WHEN environment variables are missing THEN the system SHALL provide clear error messages indicating which variables are needed
5. WHEN environment variable names change THEN the system SHALL update all references in code and documentation

### Requirement 9

**User Story:** As a developer, I want robust entity movement implementation, so that the system handles edge cases and errors gracefully.

#### Acceptance Criteria

1. WHEN an entity movement fails THEN the system SHALL log the error and maintain entity state
2. WHEN network issues occur during movement THEN the system SHALL retry the movement operation
3. WHEN concurrent movements conflict THEN the system SHALL resolve conflicts using database constraints
4. WHEN the system uses animation libraries THEN the animations SHALL not interfere with state management
5. WHEN entity positions are updated THEN the system SHALL use atomic database operations

### Requirement 10

**User Story:** As a user, I want the canvas to use stable, performant rendering techniques, so that the application feels responsive and reliable.

#### Acceptance Criteria

1. WHEN the canvas renders THEN the system SHALL minimize the use of complex animation libraries
2. WHEN entity overlays are displayed THEN the system SHALL use efficient rendering patterns
3. WHEN the canvas updates THEN the system SHALL avoid unnecessary re-renders of unchanged components
4. WHEN multiple entities move THEN the system SHALL handle rendering without performance degradation
5. WHEN the canvas architecture is evaluated THEN the implementation SHALL prioritize stability over visual effects
