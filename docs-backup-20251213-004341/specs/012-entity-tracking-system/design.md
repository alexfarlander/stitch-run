# Design Document: Entity Tracking System

## Overview

The Entity Tracking System extends Stitch's workflow execution engine to provide real-time visualization and tracking of individual entities (customers, leads, etc.) as they move through workflows. The system tracks entity positions both at nodes (stations) and along edges (paths), maintains detailed journey history, and provides visual feedback on the canvas.

This design integrates with the existing Stitch architecture, leveraging Supabase for persistence and real-time updates, React Flow for canvas rendering, and the edge-walking execution model for triggering entity movement.

### Key Capabilities

- **Granular Position Tracking**: Track entities at nodes or along edges with normalized progress (0.0 to 1.0)
- **Journey History**: Record every movement event with timestamps for analytics
- **Real-time Visualization**: Render entity dots on the canvas with live position updates
- **Edge Statistics**: Aggregate traffic and conversion metrics for workflow optimization
- **Programmatic Control**: API for starting journeys, moving entities, and handling arrivals

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Canvas UI Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ EntityOverlay│  │  EntityDot   │  │  EdgeStats   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Entity Movement API                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │startJourney()│  │moveAlongEdge()│ │arriveAtNode()│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer (Supabase)                   │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ stitch_entities  │  │ stitch_journey_events        │    │
│  │ - current_node   │  │ - entity_id                  │    │
│  │ - current_edge   │  │ - event_type                 │    │
│  │ - edge_progress  │  │ - node_id / edge_id          │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Realtime (Subscriptions)               │
│         Broadcasts entity position changes to clients        │
└─────────────────────────────────────────────────────────────┘
```

### Integration with Existing Systems

1. **Edge-Walking Execution**: When a node completes, the edge-walker triggers `startJourney()` to move entities onto outgoing edges
2. **Worker Callbacks**: When workers complete, `arriveAtNode()` is called to position entities at the destination node
3. **React Flow Canvas**: Entity dots are rendered as an overlay layer on top of the existing node/edge visualization
4. **Database Layer**: Extends existing `stitch_entities` table and adds new `stitch_journey_events` table

## Components and Interfaces

### Type Definitions

#### Updated StitchEntity Interface

```typescript
export interface StitchEntity {
  id: string;
  canvas_id: string;
  name: string;
  avatar_url: string | null;
  entity_type: string;
  
  // Position tracking (mutually exclusive)
  current_node_id: string | null;      // At a station
  current_edge_id: string | null;      // On a path
  edge_progress: number | null;        // 0.0 to 1.0 when on edge
  
  // Journey history
  journey: JourneyEntry[];
  
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

#### JourneyEvent Interface

```typescript
export interface JourneyEvent {
  id: string;
  entity_id: string;
  event_type: 'edge_start' | 'edge_progress' | 'node_arrival' | 'node_complete' | 'manual_move';
  node_id: string | null;
  edge_id: string | null;
  progress: number | null;
  metadata: Record<string, any>;
  timestamp: string;
}
```

#### JourneyEdgeData Interface

```typescript
export interface JourneyEdgeData {
  edge_id: string;
  current_entity_count: number;      // Entities currently on this edge
  total_entity_count: number;        // Total entities that have traversed
  conversion_rate: number | null;    // Ratio of completions to starts
  average_duration_ms: number | null; // Average time to traverse
}
```

### Entity Movement API

#### startJourney()

```typescript
/**
 * Start an entity's journey on an edge
 * Sets entity position to edge with progress 0.0
 * Creates journey event
 * 
 * @param entityId - UUID of the entity
 * @param edgeId - ID of the edge to start on
 * @returns Updated entity
 * @throws Error if entity not found or edge invalid
 */
export async function startJourney(
  entityId: string,
  edgeId: string
): Promise<StitchEntity>;
```

#### moveAlongEdge()

```typescript
/**
 * Update an entity's progress along an edge
 * Progress must be between 0.0 and 1.0
 * Optionally creates journey event for significant progress milestones
 * 
 * @param entityId - UUID of the entity
 * @param progress - Normalized progress value (0.0 to 1.0)
 * @returns Updated entity
 * @throws Error if entity not found or not on an edge
 */
export async function moveAlongEdge(
  entityId: string,
  progress: number
): Promise<StitchEntity>;
```

#### arriveAtNode()

```typescript
/**
 * Move an entity to a node (arrival)
 * Clears edge position fields
 * Sets current_node_id
 * Creates journey event
 * 
 * @param entityId - UUID of the entity
 * @param nodeId - ID of the destination node
 * @returns Updated entity
 * @throws Error if entity not found or node invalid
 */
export async function arriveAtNode(
  entityId: string,
  nodeId: string
): Promise<StitchEntity>;
```

#### getEntitiesAtNode()

```typescript
/**
 * Query all entities currently at a specific node
 * 
 * @param nodeId - ID of the node
 * @returns Array of entities at the node
 */
export async function getEntitiesAtNode(
  nodeId: string
): Promise<StitchEntity[]>;
```

#### getEntitiesOnEdge()

```typescript
/**
 * Query all entities currently on a specific edge
 * 
 * @param edgeId - ID of the edge
 * @returns Array of entities on the edge with their progress
 */
export async function getEntitiesOnEdge(
  edgeId: string
): Promise<StitchEntity[]>;
```

#### getJourneyHistory()

```typescript
/**
 * Get complete journey history for an entity
 * 
 * @param entityId - UUID of the entity
 * @returns Array of journey events ordered chronologically
 */
export async function getJourneyHistory(
  entityId: string
): Promise<JourneyEvent[]>;
```

#### getEdgeStatistics()

```typescript
/**
 * Calculate aggregate statistics for an edge
 * 
 * @param edgeId - ID of the edge
 * @returns Edge statistics including traffic and conversion
 */
export async function getEdgeStatistics(
  edgeId: string
): Promise<JourneyEdgeData>;
```

### Visual Components

#### EntityDot Component

```typescript
interface EntityDotProps {
  entity: StitchEntity;
  position: { x: number; y: number };  // Screen coordinates
  color: string;                        // Based on entity_type
  size?: number;                        // Diameter in pixels (default: 12)
  onClick?: (entity: StitchEntity) => void;
}

/**
 * Renders a single entity as a colored dot on the canvas
 * Positioned absolutely using screen coordinates
 */
export function EntityDot(props: EntityDotProps): JSX.Element;
```

#### EntityOverlay Component

```typescript
interface EntityOverlayProps {
  runId: string;
  flowId: string;
  entities: StitchEntity[];
  nodes: StitchNode[];
  edges: StitchEdge[];
}

/**
 * Renders all entities for a run as an overlay on the canvas
 * Handles coordinate transformation from flow space to screen space
 * Subscribes to real-time entity updates
 */
export function EntityOverlay(props: EntityOverlayProps): JSX.Element;
```

#### EdgeStatsDisplay Component

```typescript
interface EdgeStatsDisplayProps {
  edgeId: string;
  stats: JourneyEdgeData;
  position: { x: number; y: number };  // Midpoint of edge
}

/**
 * Displays aggregate statistics on an edge
 * Shows current count, total count, conversion rate
 */
export function EdgeStatsDisplay(props: EdgeStatsDisplayProps): JSX.Element;
```

## Data Models

### Database Schema Updates

#### stitch_entities Table Updates

```sql
-- Add edge position tracking columns
ALTER TABLE stitch_entities 
ADD COLUMN IF NOT EXISTS current_edge_id TEXT,
ADD COLUMN IF NOT EXISTS edge_progress NUMERIC(3,2);

-- Add constraint to ensure progress is between 0.0 and 1.0
ALTER TABLE stitch_entities
ADD CONSTRAINT check_edge_progress_range 
CHECK (edge_progress IS NULL OR (edge_progress >= 0.0 AND edge_progress <= 1.0));

-- Add constraint to ensure position is either node OR edge, not both
ALTER TABLE stitch_entities
ADD CONSTRAINT check_position_exclusivity
CHECK (
  (current_node_id IS NOT NULL AND current_edge_id IS NULL AND edge_progress IS NULL) OR
  (current_node_id IS NULL AND current_edge_id IS NOT NULL AND edge_progress IS NOT NULL) OR
  (current_node_id IS NULL AND current_edge_id IS NULL AND edge_progress IS NULL)
);

-- Add index for edge queries
CREATE INDEX IF NOT EXISTS idx_stitch_entities_current_edge_id 
ON stitch_entities(current_edge_id);
```

#### stitch_journey_events Table

```sql
CREATE TABLE IF NOT EXISTS stitch_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  node_id TEXT,
  edge_id TEXT,
  progress NUMERIC(3,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_journey_events_entity
    FOREIGN KEY (entity_id) 
    REFERENCES stitch_entities(id) 
    ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_journey_events_entity_id 
ON stitch_journey_events(entity_id);

CREATE INDEX IF NOT EXISTS idx_journey_events_timestamp 
ON stitch_journey_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_journey_events_event_type 
ON stitch_journey_events(event_type);

CREATE INDEX IF NOT EXISTS idx_journey_events_edge_id 
ON stitch_journey_events(edge_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_journey_events;
```

### Position State Machine

Entities transition through three position states:

1. **Unpositioned**: `current_node_id = NULL, current_edge_id = NULL`
2. **At Node**: `current_node_id = <nodeId>, current_edge_id = NULL, edge_progress = NULL`
3. **On Edge**: `current_node_id = NULL, current_edge_id = <edgeId>, edge_progress = <0.0-1.0>`

Transitions:
- Unpositioned → At Node: `arriveAtNode()`
- At Node → On Edge: `startJourney()`
- On Edge → On Edge: `moveAlongEdge()` (progress update)
- On Edge → At Node: `arriveAtNode()`

## Data Models

### Coordinate Transformation

Entity positions are stored in two coordinate systems:

1. **Flow Coordinates**: Node positions in the React Flow graph (stored in `StitchNode.position`)
2. **Screen Coordinates**: Pixel positions on the rendered canvas (calculated by React Flow)

The `EntityOverlay` component uses React Flow's `useReactFlow()` hook to access the `project()` function for transforming flow coordinates to screen coordinates.

For entities on edges, the position must follow the Bezier curve path rendered by React Flow:

```typescript
function interpolateEdgePosition(
  edgeId: string,
  progress: number
): { x: number; y: number } {
  // Access the SVG path element for the edge
  const pathElement = document.querySelector(`[data-id="${edgeId}"] path`) as SVGPathElement;
  
  if (!pathElement) {
    throw new Error(`Edge path not found: ${edgeId}`);
  }
  
  // Calculate position along the Bezier curve
  const totalLength = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(totalLength * progress);
  
  return {
    x: point.x,
    y: point.y,
  };
}
```

**Critical**: Do NOT use linear interpolation between source and target nodes. React Flow edges are Bezier curves, and entities must travel along the actual rendered path using SVG path methods.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Position mutual exclusivity
*For any* entity, the entity should have either a node position OR an edge position (with progress), but never both simultaneously, and possibly neither.
**Validates: Requirements 1.3**

### Property 2: Edge progress bounds
*For any* entity with an edge position, the edge_progress value should be between 0.0 and 1.0 inclusive.
**Validates: Requirements 1.4**

### Property 3: Position persistence
*For any* entity position change (node or edge), immediately querying the database should return the updated position.
**Validates: Requirements 2.1**

### Property 4: Query by node correctness
*For any* node and set of entities, querying entities by that node should return exactly the entities whose current_node_id matches that node.
**Validates: Requirements 2.3**

### Property 5: Query by edge correctness
*For any* edge and set of entities, querying entities by that edge should return exactly the entities whose current_edge_id matches that edge.
**Validates: Requirements 2.4**

### Property 6: Edge to node transition clears edge data
*For any* entity on an edge, calling arriveAtNode() should result in current_edge_id and edge_progress being NULL and current_node_id being set.
**Validates: Requirements 2.5, 6.5, 8.3**

### Property 7: Journey event creation on edge start
*For any* entity and edge, calling startJourney() should create a journey event with event_type 'edge_start' and the correct edge_id.
**Validates: Requirements 3.1**

### Property 8: Journey event creation on node arrival
*For any* entity and node, calling arriveAtNode() should create a journey event with event_type 'node_arrival' and the correct node_id.
**Validates: Requirements 3.2, 6.6**

### Property 9: Journey event creation on node completion
*For any* entity at a node, marking the node complete should create a journey event with event_type 'node_complete'.
**Validates: Requirements 3.3**

### Property 10: Journey history chronological ordering
*For any* entity with multiple journey events, querying the journey history should return events ordered by timestamp ascending.
**Validates: Requirements 3.4**

### Property 11: Journey event completeness
*For any* journey event, it should have entity_id, event_type, and timestamp populated, plus either node_id or edge_id depending on event type.
**Validates: Requirements 3.5**

### Property 12: Edge traffic count accuracy
*For any* edge, the total_entity_count in statistics should equal the number of journey events with event_type 'edge_start' for that edge.
**Validates: Requirements 4.1**

### Property 13: Edge conversion rate calculation
*For any* edge with traffic, the conversion_rate should equal (count of node_complete events for target node) / (count of edge_start events for edge).
**Validates: Requirements 4.2**

### Property 14: Edge statistics completeness
*For any* edge, calling getEdgeStatistics() should return an object with current_entity_count, total_entity_count, and conversion_rate fields.
**Validates: Requirements 4.3**

### Property 15: Independent progress tracking
*For any* set of entities on the same edge, each entity should have an independently settable edge_progress value.
**Validates: Requirements 4.5**

### Property 16: Edge position interpolation
*For any* entity on an edge with progress p, the interpolated position should be calculated using the SVG path's getPointAtLength() method at (totalLength * p).
**Validates: Requirements 5.2**

### Property 17: Entity color mapping
*For any* entity, the rendered color should be determined by a consistent mapping from entity_type to color.
**Validates: Requirements 5.3**

### Property 18: Overlap offset calculation
*For any* set of entities at the same position, each should have a unique offset to prevent complete overlap.
**Validates: Requirements 5.4**

### Property 19: Coordinate transformation consistency
*For any* viewport transformation, applying the transformation to flow coordinates should yield consistent screen coordinates.
**Validates: Requirements 5.5**

### Property 20: Start journey sets edge position
*For any* entity and edge, calling startJourney(entityId, edgeId) should set current_edge_id to edgeId and edge_progress to 0.0.
**Validates: Requirements 6.2**

### Property 21: Move along edge updates progress
*For any* entity on an edge and valid progress value, calling moveAlongEdge(entityId, progress) should update edge_progress to the specified value.
**Validates: Requirements 6.4**

### Property 22: Invalid entity ID error handling
*For any* invalid entity ID, all movement functions (startJourney, moveAlongEdge, arriveAtNode) should throw an error without modifying the database.
**Validates: Requirements 6.7**

### Property 23: Manual move node validation
*For any* entity and node ID, manual move should validate that the node exists in the workflow before updating position.
**Validates: Requirements 8.1, 8.5**

### Property 24: Manual move event creation
*For any* manual move operation, a journey event with event_type 'manual_move' should be created.
**Validates: Requirements 8.2**

## Error Handling

### Validation Errors

1. **Invalid Entity ID**: All movement functions should validate entity existence before attempting updates
   - Return: `Error: Entity not found: {entityId}`
   - HTTP Status: 404

2. **Invalid Progress Value**: `moveAlongEdge()` should validate progress is between 0.0 and 1.0
   - Return: `Error: Progress must be between 0.0 and 1.0, got: {progress}`
   - HTTP Status: 400

3. **Invalid Node ID**: `arriveAtNode()` and manual move should validate node exists in workflow
   - Return: `Error: Node not found in workflow: {nodeId}`
   - HTTP Status: 404

4. **Invalid Edge ID**: `startJourney()` should validate edge exists in workflow
   - Return: `Error: Edge not found in workflow: {edgeId}`
   - HTTP Status: 404

5. **Invalid State Transition**: Attempting to move along edge when entity is not on an edge
   - Return: `Error: Entity is not on an edge, cannot update progress`
   - HTTP Status: 400

### Database Errors

1. **Connection Failures**: Retry with exponential backoff (3 attempts)
2. **Constraint Violations**: Log error and return validation message to caller
3. **Transaction Failures**: Rollback and return error without partial updates

### Real-time Subscription Errors

1. **Connection Loss**: Client should implement reconnection logic with exponential backoff
2. **Subscription Failure**: Fall back to polling-based queries
3. **Message Delivery Failure**: Log warning, rely on polling fallback

## Testing Strategy

### Unit Testing

Unit tests will cover specific examples and edge cases:

1. **Position State Transitions**: Test specific transitions (unpositioned → node, node → edge, edge → node)
2. **Boundary Values**: Test progress values at 0.0, 0.5, 1.0
3. **Empty States**: Test entities with no position, edges with no traffic
4. **Error Cases**: Test invalid IDs, invalid progress values, constraint violations
5. **Coordinate Calculations**: Test interpolation with specific node positions
6. **Color Mapping**: Test specific entity types map to expected colors

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (TypeScript PBT library):

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: entity-tracking-system, Property {number}: {property_text}**`

**Test Coverage**:

1. **Property 1-2**: Generate random entities, verify position constraints
2. **Property 3**: Generate random position changes, verify persistence
3. **Property 4-5**: Generate random entity sets and queries, verify query correctness
4. **Property 6**: Generate random edge-to-node transitions, verify state clearing
5. **Property 7-9**: Generate random movements, verify event creation
6. **Property 10-11**: Generate random journey sequences, verify ordering and completeness
7. **Property 12-14**: Generate random edge traffic, verify statistics calculations
8. **Property 15**: Generate multiple entities on same edge, verify independence
9. **Property 16-19**: Generate random positions and viewports, verify rendering calculations
10. **Property 20-21**: Generate random movements, verify state updates
11. **Property 22**: Generate invalid IDs, verify error handling
12. **Property 23-24**: Generate manual moves, verify validation and events

**Generators**:
- `arbitraryEntity()`: Generate random StitchEntity with valid states
- `arbitraryProgress()`: Generate progress values between 0.0 and 1.0
- `arbitraryPosition()`: Generate random node positions
- `arbitraryJourneyEvents()`: Generate sequences of journey events
- `arbitraryEntityType()`: Generate entity type strings

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Complete Journey**: Create entity, start journey, move along edge, arrive at node
2. **Real-time Updates**: Verify Supabase subscriptions deliver position changes
3. **Canvas Rendering**: Verify EntityOverlay renders entities at correct positions
4. **Statistics Aggregation**: Create multiple entities, verify edge statistics accuracy
5. **Manual Movement**: Test manual move API with UI interaction

### Performance Testing

1. **Large Entity Sets**: Test with 1000+ entities on canvas
2. **High-Frequency Updates**: Test rapid position updates (100+ per second)
3. **Query Performance**: Test entity queries with large datasets
4. **Real-time Scalability**: Test subscription performance with multiple clients

## Implementation Notes

### Database Constraints

The database schema enforces critical invariants:
- Progress range constraint ensures values are 0.0-1.0
- Position exclusivity constraint ensures entities are at node OR edge, not both
- Foreign key cascades ensure orphaned records are cleaned up

### Real-time Architecture

Supabase real-time subscriptions provide live updates:
- Subscribe to `stitch_entities` table for position changes
- Subscribe to `stitch_journey_events` table for journey history
- Filter subscriptions by `canvas_id` to limit scope

### Rendering Performance

Entity rendering optimizations:
- Use React.memo() for EntityDot components
- Batch position updates to reduce re-renders
- Use CSS transforms for smooth animations
- Implement virtual scrolling for large entity counts

### Migration Strategy

Rolling out entity tracking to existing workflows:
1. Run database migration to add columns (nullable initially)
2. Deploy API functions (backward compatible)
3. Deploy UI components (opt-in per canvas)
4. Backfill existing entities with initial positions
5. Enable real-time subscriptions

## Future Enhancements

1. **Entity Grouping**: Support for grouping entities (e.g., cohorts, segments)
2. **Path Prediction**: ML-based prediction of entity paths through workflow
3. **Heatmaps**: Visual heatmaps showing high-traffic areas
4. **Time-based Replay**: Replay entity movements over time
5. **Entity Filtering**: Filter visible entities by type, status, or metadata
6. **Custom Animations**: Configurable animation curves for entity movement
7. **Entity Interactions**: Click entities to view details, manually move them
8. **Performance Metrics**: Track and display entity velocity, dwell time, bottlenecks
