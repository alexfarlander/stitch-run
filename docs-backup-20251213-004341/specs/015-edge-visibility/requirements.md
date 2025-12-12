# Requirements Document

## Introduction

The Edge Visibility feature enhances the Stitch Business Model Canvas (BMC) by implementing intelligent edge visibility controls. By default, edges between nodes are hidden to reduce visual clutter, creating a cleaner, more "magical" user experience. Edges become visible only when relevant to the current context: during entity traversal, when nodes are selected, when system edges fire, or when the user manually toggles visibility. This feature distinguishes between Journey Edges (customer/entity movement) and System Edges (backend data signals) through distinct visual styling.

## Glossary

- **BMC Canvas**: The Business Model Canvas component that displays nodes, edges, and entities in a visual workflow representation
- **Journey Edge**: A visual connection representing physical customer/entity movement between nodes, styled with solid cyan lines
- **System Edge**: A visual connection representing backend data transmission or signals between nodes, styled with dashed slate gray lines
- **Entity**: A customer or lead that travels across the canvas, represented visually as an avatar or dot
- **Edge Traversal**: The process of an entity moving along an edge from a source node to a target node
- **Firing Edge**: A system edge that is actively transmitting data, indicated by a pulsing animation
- **Selected Node**: A node that the user has clicked or otherwise selected in the canvas interface
- **Visibility Toggle**: A UI control that allows users to manually show or hide all edges regardless of other visibility conditions
- **Realtime Subscription**: A Supabase real-time database subscription that broadcasts edge traversal and firing events
- **Edge Progress**: A numeric value from 0 to 1 indicating an entity's position along an edge during traversal

## Requirements

### Requirement 1

**User Story:** As a canvas user, I want edges to be hidden by default, so that the canvas appears clean and uncluttered when no interactions are occurring.

#### Acceptance Criteria

1. WHEN the BMC Canvas initially renders THEN the System SHALL set all edge opacity to 0
2. WHEN no entities are traversing edges AND no nodes are selected AND the visibility toggle is off THEN the System SHALL maintain all edges at opacity 0
3. WHEN edges transition between visible and hidden states THEN the System SHALL apply a 0.3 second ease-in-out opacity transition
4. WHEN edges are hidden THEN the System SHALL set pointer events to none to prevent interaction with invisible edges

### Requirement 2

**User Story:** As a canvas user, I want to manually toggle edge visibility, so that I can see the complete workflow structure when needed.

#### Acceptance Criteria

1. WHEN the user clicks the visibility toggle button THEN the System SHALL change the showAllEdges state to its opposite value
2. WHILE the showAllEdges state is true THEN the System SHALL set all edges to opacity 1 regardless of other visibility conditions
3. WHEN the showAllEdges state is true THEN the System SHALL display the toggle button with cyan styling and "👁 Edges" text
4. WHEN the showAllEdges state is false THEN the System SHALL display the toggle button with slate styling and "👁‍🗨 Edges" text
5. WHEN the user hovers over the toggle button THEN the System SHALL display a tooltip indicating the current action ("Hide edges" or "Show all edges")

### Requirement 3

**User Story:** As a canvas user, I want to see edges connected to a selected node, so that I understand the node's connections within the workflow.

#### Acceptance Criteria

1. WHEN the user selects exactly one node THEN the System SHALL store that node's identifier in the selectedNodeId state
2. WHEN the user deselects all nodes OR selects multiple nodes THEN the System SHALL set selectedNodeId to null
3. WHILE a node is selected THEN the System SHALL set opacity to 1 for all edges where the source matches the selectedNodeId
4. WHILE a node is selected THEN the System SHALL set opacity to 1 for all edges where the target matches the selectedNodeId
5. WHEN the selectedNodeId changes THEN the System SHALL recalculate edge visibility within the same render cycle

### Requirement 4

**User Story:** As a canvas user, I want to see edges while entities are traversing them, so that I can visually track entity movement across the workflow.

#### Acceptance Criteria

1. WHEN an entity begins edge traversal THEN the System SHALL receive an edge_start event via Realtime subscription
2. WHILE an entity is traversing an edge THEN the System SHALL set that edge's opacity to 1
3. WHILE an entity is traversing an edge THEN the System SHALL set that edge's animated property to true
4. WHEN an entity completes edge traversal THEN the System SHALL remove that edge from the traversing edges collection
5. WHEN an edge is no longer being traversed AND is not connected to a selected node AND the visibility toggle is off THEN the System SHALL set that edge's opacity to 0

### Requirement 5

**User Story:** As a canvas user, I want to see system edges when they fire, so that I understand when backend data transmission occurs.

#### Acceptance Criteria

1. WHEN a system edge fires THEN the System SHALL receive an edge_fired event via Realtime subscription
2. WHEN a SystemEdge component receives an edge_fired event matching its edge identifier THEN the System SHALL set isPulsing to true
3. WHILE isPulsing is true THEN the System SHALL override the edge opacity to 1 regardless of parent style settings
4. WHEN isPulsing is set to true THEN the System SHALL schedule isPulsing to return to false after 1000 milliseconds
5. WHEN isPulsing returns to false AND the edge is not connected to a selected node AND the visibility toggle is off THEN the System SHALL allow the edge opacity to return to 0

### Requirement 6

**User Story:** As a canvas user, I want journey edges and system edges to have distinct visual appearances, so that I can differentiate between customer movement and backend signals.

#### Acceptance Criteria

1. WHEN rendering a journey edge THEN the System SHALL apply a solid stroke style with 2px width
2. WHEN rendering a journey edge THEN the System SHALL apply a cyan color (#06b6d4)
3. WHEN rendering a system edge THEN the System SHALL apply a dashed stroke style (stroke-dasharray: 5 5) with 2px width
4. WHEN rendering a system edge THEN the System SHALL apply a slate gray color (#64748b)
5. WHEN an edge type is not explicitly specified THEN the System SHALL default to journey edge styling

### Requirement 7

**User Story:** As a canvas user, I want smooth opacity transitions when edges appear and disappear, so that the visual changes feel polished and not jarring.

#### Acceptance Criteria

1. WHEN an edge's visibility condition changes from false to true THEN the System SHALL animate opacity from 0 to 1 over 300 milliseconds
2. WHEN an edge's visibility condition changes from true to false THEN the System SHALL animate opacity from 1 to 0 over 300 milliseconds
3. WHEN multiple visibility conditions change simultaneously THEN the System SHALL apply the transition using an ease-in-out timing function
4. WHEN the showAllEdges toggle is activated THEN the System SHALL apply the same 300 millisecond transition to all edges
5. WHEN an edge becomes visible due to traversal THEN the System SHALL complete the opacity transition before the entity reaches 10% progress along the edge

### Requirement 8

**User Story:** As a developer, I want the edge visibility logic to use existing hooks and components, so that the implementation is maintainable and does not duplicate functionality.

#### Acceptance Criteria

1. WHEN implementing edge traversal tracking THEN the System SHALL use the existing useEdgeTraversal hook from src/hooks/useEdgeTraversal.ts
2. WHEN implementing entity position tracking THEN the System SHALL use the existing useEntityPosition hook from src/hooks/useEntityPosition.ts
3. WHEN rendering journey edges THEN the System SHALL use the existing JourneyEdge component from src/components/canvas/edges/JourneyEdge.tsx
4. WHEN rendering system edges THEN the System SHALL use the existing SystemEdge component from src/components/canvas/edges/SystemEdge.tsx
5. WHEN calculating edge visibility THEN the System SHALL not create new hooks or duplicate existing edge traversal logic
