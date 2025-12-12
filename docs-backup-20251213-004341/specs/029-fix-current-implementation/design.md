# Design Document

## Overview

This design addresses critical stability and functionality issues in the Stitch Living Business Model Canvas implementation. The primary focus is on fixing entity movement reliability, eliminating canvas flickering, improving user interactions, and ensuring robust error handling. The design prioritizes stability and correctness over visual effects, using simpler, more reliable patterns where the current implementation has proven fragile.

## Architecture

### Current Issues

The current implementation has several architectural problems:

1. **Framer Motion Dependency**: Entity movement relies on framer-motion animations that can fail mid-flight, causing entities to disappear
2. **Overlay Complexity**: EntityOverlay component manages both traveling entities and badges, leading to flickering
3. **State Synchronization**: Animation state and database state can become desynchronized
4. **Event Handling**: Panel tab switching is triggered by entity selection events during demo execution
5. **Z-Index Conflicts**: Edge layers block pointer events to underlying nodes

### Proposed Architecture

The redesign follows these principles:

1. **Database as Source of Truth**: All entity positions must be persisted immediately
2. **Simplified Animation**: Use CSS transitions instead of complex animation libraries
3. **Separation of Concerns**: Split entity rendering from badge rendering
4. **Explicit User Actions**: Only user clicks should trigger UI state changes
5. **Proper Layer Management**: Use pointer-events CSS to manage click-through behavior

## Components and Interfaces

### Entity Movement System

**Current Implementation Problems:**
- Uses framer-motion `animate()` function for path-based animation
- Animation can be interrupted without updating database
- No retry logic for failed movements
- Complex animation state tracking in refs

**Redesigned Implementation:**

```typescript
interface EntityMovementConfig {
  entityId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeId: string;
  duration: number; // milliseconds
}

interface EntityPosition {
  entityId: string;
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  progress?: number; // 0-1 for edge travel
}

class EntityMovementManager {
  // Initiate movement with immediate DB update
  async startMovement(config: EntityMovementConfig): Promise<void>
  
  // Update entity position during travel (throttled DB writes)
  async updateProgress(entityId: string, progress: number): Promise<void>
  
  // Complete movement with final DB update
  async completeMovement(entityId: string, targetNodeId: string): Promise<void>
  
  // Handle movement failure
  async handleMovementFailure(entityId: string, error: Error): Promise<void>
}
```

**Key Changes:**
- Replace framer-motion with CSS transitions or simpler animation approach
- Write to database at start, during (throttled), and end of movement
- Add retry logic with exponential backoff
- Use atomic database operations for position updates

### Canvas Rendering System

**Current Implementation Problems:**
- EntityOverlay re-renders frequently causing flicker
- Sections can disappear during heavy updates
- No render batching for multiple simultaneous updates

**Redesigned Implementation:**

```typescript
interface CanvasRenderConfig {
  batchUpdates: boolean;
  batchDelay: number; // milliseconds
  maxFPS: number;
}

class CanvasRenderManager {
  // Batch multiple entity updates into single render
  batchEntityUpdates(updates: EntityPosition[]): void
  
  // Throttle renders to maintain target FPS
  throttleRender(renderFn: () => void): void
  
  // Separate render paths for static vs dynamic content
  renderStaticNodes(): void
  renderDynamicEntities(): void
}
```

**Key Changes:**
- Split EntityOverlay into separate components for traveling entities vs badges
- Use React.memo() and useMemo() to prevent unnecessary re-renders
- Implement render batching for simultaneous updates
- Use requestAnimationFrame for smooth animations

### Entity Count Badge System

**Current Implementation Problems:**
- Badges are not clickable
- No way to see which entities are at a node
- Badge rendering mixed with entity overlay logic

**Redesigned Implementation:**

```typescript
interface EntityBadgeProps {
  nodeId: string;
  entities: StitchEntity[];
  onEntityClick: (entityId: string) => void;
}

// Rendered inside node component, not as overlay
function EntityCountBadge({ nodeId, entities, onEntityClick }: EntityBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <button onClick={(e) => e.stopPropagation()}>
          {entities.length}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <EntityList entities={entities} onSelect={onEntityClick} />
      </PopoverContent>
    </Popover>
  );
}
```

**Key Changes:**
- Badge is fully clickable button
- Opens popover with entity list
- Clicking entity in list opens detail panel
- Badge only shows when entities.length > 0

### Edge Layer Management

**Current Implementation Problems:**
- Edge SVG layer blocks clicks to underlying nodes
- Z-index conflicts between edges and nodes
- No pointer-events management based on visibility

**Redesigned Implementation:**

```typescript
interface EdgeLayerProps {
  edges: Edge[];
  visibility: number; // 0-1
}

function EdgeLayer({ edges, visibility }: EdgeLayerProps) {
  const pointerEvents = visibility === 0 ? 'none' : 'auto';
  
  return (
    <g 
      style={{ 
        opacity: visibility,
        pointerEvents: pointerEvents 
      }}
    >
      {edges.map(edge => (
        <EdgePath 
          key={edge.id} 
          {...edge}
          style={{ pointerEvents: 'stroke' }} // Only path is clickable
        />
      ))}
    </g>
  );
}
```

**Key Changes:**
- Set `pointer-events: none` when opacity is 0
- Use `pointer-events: stroke` on edge paths to only capture clicks on the line
- Ensure node layer has higher z-index than edge layer
- Add explicit z-index values to all canvas layers

### Panel Tab Management

**Current Implementation Problems:**
- Panel switches to Entity tab automatically when entity is selected during demo
- No distinction between user-initiated and system-initiated selection
- useEffect triggers tab switch on any selectedEntity change

**Redesigned Implementation:**

```typescript
interface PanelState {
  activeTab: TabId;
  isOpen: boolean;
  userSelectedTab: boolean; // Track if user explicitly chose tab
}

function LeftSidePanel({ selectedEntity, onEntityClose }: Props) {
  const [panelState, setPanelState] = useState<PanelState>({
    activeTab: 'events',
    isOpen: false,
    userSelectedTab: false
  });
  
  // Only switch tab if user explicitly clicked entity
  const handleEntityClick = (entityId: string) => {
    setPanelState({
      activeTab: 'entity',
      isOpen: true,
      userSelectedTab: true
    });
  };
  
  // Don't auto-switch tab on entity selection
  useEffect(() => {
    // Remove automatic tab switching logic
  }, [selectedEntity]);
  
  return (
    // Panel implementation
  );
}
```

**Key Changes:**
- Remove automatic tab switching on entity selection
- Only switch to Entity tab when user explicitly clicks entity
- Add `userSelectedTab` flag to track user intent
- Separate entity selection (for highlighting) from panel navigation

### Demo Script Improvements

**Current Implementation Problems:**
- Events can fire out of logical order
- Duplicate events for same action (e.g., multiple purchase events)
- Entity type changes not reflected before subsequent actions

**Redesigned Implementation:**

```typescript
interface DemoEvent {
  id: string;
  delay: number;
  endpoint: string;
  payload: Record<string, unknown>;
  description: string;
  prerequisites?: string[]; // IDs of events that must complete first
}

class DemoOrchestrator {
  private completedEvents: Set<string> = new Set();
  
  async executeEvent(event: DemoEvent): Promise<void> {
    // Wait for prerequisites
    await this.waitForPrerequisites(event.prerequisites);
    
    // Execute webhook
    await this.callWebhook(event.endpoint, event.payload);
    
    // Mark complete
    this.completedEvents.add(event.id);
    
    // Verify entity state matches expected
    await this.verifyEntityState(event);
  }
  
  private async waitForPrerequisites(prereqs?: string[]): Promise<void> {
    if (!prereqs) return;
    
    while (!prereqs.every(id => this.completedEvents.has(id))) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

**Key Changes:**
- Add event IDs and prerequisites to enforce ordering
- Wait for prerequisite events to complete before firing dependent events
- Verify entity state after each event
- Add deduplication to prevent duplicate events
- Ensure type changes complete before subsequent actions

## Data Models

### Entity Position Tracking

```typescript
interface EntityPositionRecord {
  entity_id: string;
  canvas_id: string;
  current_node_id: string | null;
  current_edge_id: string | null;
  edge_progress: number | null; // 0-1, null if on node
  updated_at: timestamp;
  version: number; // For optimistic locking
}
```

### Journey Event

```typescript
interface JourneyEvent {
  id: string;
  entity_id: string;
  canvas_id: string;
  event_type: 'arrived' | 'departed' | 'type_changed' | 'action_completed';
  from_node_id: string | null;
  to_node_id: string | null;
  metadata: Record<string, unknown>;
  created_at: timestamp;
  sequence_number: number; // For ordering
}
```

### Movement Transaction

```typescript
interface MovementTransaction {
  id: string;
  entity_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at: timestamp;
  completed_at: timestamp | null;
  error: string | null;
  retry_count: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Entity Movement Completion
*For any* entity movement from source to destination, the entity should eventually reach the destination node and have its database position updated to match.
**Validates: Requirements 1.1, 1.3**

### Property 2: Entity Visibility During Travel
*For any* entity traveling on an edge, the entity should remain present in the DOM throughout the journey.
**Validates: Requirements 1.2**

### Property 3: Concurrent Movement Handling
*For any* set of simultaneous entity movements, all movements should complete successfully without any entities being lost.
**Validates: Requirements 1.4**

### Property 4: Movement Recovery After Interruption
*For any* entity movement interrupted by page refresh, the entity should be restored to its last persisted position in the database.
**Validates: Requirements 1.5**

### Property 5: Node Stability During Updates
*For any* canvas with moving entities, all section nodes should remain visible and present in the DOM.
**Validates: Requirements 2.2**

### Property 6: Entity Badge Rendering
*For any* node with entities present, the entity count badge should display the correct count and render all entity information (name, avatar, type) in the popover.
**Validates: Requirements 3.3**

### Property 7: Entity Badge Conditional Display
*For any* node, the entity count badge should only be displayed when the entity count is greater than zero.
**Validates: Requirements 3.5**

### Property 8: Edge Layer Click-Through
*For any* node on the canvas, clicking the node should register the click event regardless of edge visibility settings.
**Validates: Requirements 4.1, 4.2**

### Property 9: Edge Opacity Pointer Events
*For any* edge layer with 0% opacity, the layer should have pointer-events set to none.
**Validates: Requirements 4.3**

### Property 10: Edge Path Pointer Targeting
*For any* visible edge, only the edge path itself should capture pointer events, not the entire bounding box.
**Validates: Requirements 4.4**

### Property 11: Canvas Layer Z-Index Ordering
*For any* canvas with multiple layers, the z-index ordering should allow nodes to be clicked without interference from edge layers.
**Validates: Requirements 4.5**

### Property 12: Section Navigation Loading
*For any* section node with an associated workflow, double-clicking should load the workflow canvas without errors.
**Validates: Requirements 5.2**

### Property 13: Breadcrumb Navigation Update
*For any* navigation to a workflow canvas, the breadcrumb navigation should update to reflect the new location.
**Validates: Requirements 5.3**

### Property 14: Demo State Preservation
*For any* navigation between canvases, the current demo state (running/stopped, loop count) should be preserved.
**Validates: Requirements 5.5**

### Property 15: Panel Tab Persistence
*For any* user-selected panel tab, the panel should remain on that tab until the user explicitly changes it.
**Validates: Requirements 6.1**

### Property 16: Demo Tab Stability
*For any* running demo, entity events should not cause the panel to automatically switch tabs.
**Validates: Requirements 6.2, 6.3**

### Property 17: User-Initiated Tab Changes
*For any* panel tab change, the change should only occur due to explicit user action (clicking tab or entity).
**Validates: Requirements 6.5**

### Property 18: Event Deduplication
*For any* entity action, the system should not create duplicate events in the journey log.
**Validates: Requirements 7.2**

### Property 19: Purchase Event Uniqueness
*For any* entity purchase transaction, exactly one purchase event should be recorded.
**Validates: Requirements 7.3**

### Property 20: Type Change Ordering
*For any* entity type change, the type change event should appear in the log before any subsequent action events.
**Validates: Requirements 7.4**

### Property 21: Event Chronological Ordering
*For any* set of events in the log, events should be ordered by their timestamp in ascending order.
**Validates: Requirements 7.5**

### Property 22: Environment Variable Consistency
*For any* Supabase configuration read, the system should use the same environment variable names throughout the codebase.
**Validates: Requirements 8.1**

### Property 23: Environment Variable Error Messages
*For any* missing required environment variable, the system should provide an error message indicating which variable is needed.
**Validates: Requirements 8.4**

### Property 24: Movement Failure State Preservation
*For any* failed entity movement, the entity's database state should remain unchanged from before the movement attempt.
**Validates: Requirements 9.1**

### Property 25: Movement Retry Logic
*For any* entity movement that fails due to network issues, the system should retry the operation with exponential backoff.
**Validates: Requirements 9.2**

### Property 26: Concurrent Movement Conflict Resolution
*For any* conflicting concurrent movements, the database constraints should resolve the conflict and maintain consistency.
**Validates: Requirements 9.3**

### Property 27: Animation State Independence
*For any* entity movement, the animation state should not affect the database state management.
**Validates: Requirements 9.4**

### Property 28: Atomic Position Updates
*For any* entity position update, the database operation should be atomic (all-or-nothing).
**Validates: Requirements 9.5**

## Error Handling

### Entity Movement Errors

**Failure Scenarios:**
1. Network timeout during movement API call
2. Database constraint violation (concurrent update)
3. Invalid target node (node doesn't exist)
4. Animation interruption (component unmount)

**Handling Strategy:**
```typescript
async function moveEntity(entityId: string, targetNodeId: string): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Validate target node exists
      const targetNode = await validateNode(targetNodeId);
      if (!targetNode) {
        throw new Error(`Target node ${targetNodeId} does not exist`);
      }
      
      // Start transaction
      const transaction = await startMovementTransaction(entityId, targetNodeId);
      
      // Update database with optimistic locking
      await updateEntityPosition(entityId, targetNodeId, transaction.version);
      
      // Record journey event
      await recordJourneyEvent(entityId, 'arrived', targetNodeId);
      
      // Complete transaction
      await completeMovementTransaction(transaction.id);
      
      return; // Success
    } catch (error) {
      attempt++;
      
      if (error instanceof NetworkError && attempt < maxRetries) {
        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      
      // Log error and restore state
      console.error('Entity movement failed:', error);
      await rollbackMovementTransaction(entityId);
      
      // Show user-friendly error
      toast.error('Failed to move entity. Please try again.');
      throw error;
    }
  }
}
```

### Canvas Rendering Errors

**Failure Scenarios:**
1. React Flow node not found during position calculation
2. SVG path element missing for edge animation
3. Excessive re-renders causing performance issues

**Handling Strategy:**
```typescript
function useEntityPosition(entity: StitchEntity): Position | null {
  return useMemo(() => {
    try {
      if (entity.current_node_id) {
        const node = getNode(entity.current_node_id);
        if (!node) {
          console.warn(`Node ${entity.current_node_id} not found for entity ${entity.id}`);
          return null;
        }
        return calculateNodePosition(node);
      }
      
      if (entity.current_edge_id) {
        const edge = getEdge(entity.current_edge_id);
        if (!edge) {
          console.warn(`Edge ${entity.current_edge_id} not found for entity ${entity.id}`);
          return null;
        }
        return calculateEdgePosition(edge, entity.edge_progress || 0);
      }
      
      return null;
    } catch (error) {
      console.error('Error calculating entity position:', error);
      return null;
    }
  }, [entity.current_node_id, entity.current_edge_id, entity.edge_progress]);
}
```

### Demo Script Errors

**Failure Scenarios:**
1. Webhook endpoint returns error
2. Entity not found for demo action
3. Prerequisite event timeout

**Handling Strategy:**
```typescript
async function executeDemoEvent(event: DemoEvent): Promise<void> {
  try {
    // Wait for prerequisites with timeout
    await waitForPrerequisites(event.prerequisites, 30000);
    
    // Call webhook
    const response = await fetch(event.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event.payload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
    
    // Mark event complete
    markEventComplete(event.id);
  } catch (error) {
    console.error(`Demo event failed: ${event.description}`, error);
    
    // Continue demo despite error (don't break the flow)
    // Log to events panel
    logDemoError(event.description, error);
  }
}
```

## Testing Strategy

### Unit Testing

**Entity Movement:**
- Test `EntityMovementManager.startMovement()` with valid config
- Test `EntityMovementManager.completeMovement()` updates database
- Test `EntityMovementManager.handleMovementFailure()` preserves state
- Test retry logic with simulated network failures

**Canvas Rendering:**
- Test `CanvasRenderManager.batchEntityUpdates()` batches multiple updates
- Test `CanvasRenderManager.throttleRender()` limits render frequency
- Test entity position calculation with missing nodes/edges

**Entity Badge:**
- Test badge renders with correct count
- Test badge popover opens on click
- Test badge hidden when count is 0
- Test entity selection from popover

**Edge Layer:**
- Test pointer-events set to none when opacity is 0
- Test pointer-events set to auto when opacity > 0
- Test edge path captures clicks only on stroke

**Panel Management:**
- Test tab switching only on user click
- Test tab persistence during demo
- Test entity click switches to entity tab

### Property-Based Testing

We will use **fast-check** for JavaScript/TypeScript property-based testing. Each property test should run a minimum of 100 iterations.

**Property Test Configuration:**
```typescript
import fc from 'fast-check';

// Configure for 100+ iterations
const testConfig = { numRuns: 100 };
```

**Property Test Tags:**
Each property-based test must include a comment tag referencing the design document:
```typescript
// Feature: fix-current-implementation, Property 1: Entity Movement Completion
```

### Integration Testing

**End-to-End Entity Movement:**
1. Seed database with test entities
2. Trigger entity movement via API
3. Verify entity reaches destination
4. Verify database updated correctly
5. Verify journey event recorded

**Demo Orchestrator:**
1. Start demo
2. Verify events fire in correct order
3. Verify no duplicate events
4. Verify entity type changes reflected
5. Stop demo and verify state

**Canvas Interaction:**
1. Load canvas with entities
2. Click entity count badge
3. Verify popover opens
4. Click entity in list
5. Verify detail panel opens

**Navigation:**
1. Load BMC canvas
2. Double-click section node
3. Verify workflow canvas loads
4. Verify breadcrumbs update
5. Verify demo state preserved

## Implementation Notes

### Migration Strategy

1. **Phase 1: Entity Movement (High Priority)**
   - Replace framer-motion with CSS transitions
   - Add database writes at movement start/end
   - Implement retry logic
   - Add movement transaction tracking

2. **Phase 2: Canvas Rendering (High Priority)**
   - Split EntityOverlay into separate components
   - Add render batching
   - Implement React.memo() optimizations
   - Fix z-index and pointer-events

3. **Phase 3: User Interactions (Medium Priority)**
   - Make entity badges clickable
   - Fix panel tab switching logic
   - Improve section double-click handling

4. **Phase 4: Demo Script (Medium Priority)**
   - Add event prerequisites
   - Implement deduplication
   - Add state verification

5. **Phase 5: Error Handling (Low Priority)**
   - Add comprehensive error handling
   - Implement retry logic
   - Add user-friendly error messages

### Performance Considerations

- **Render Batching**: Batch multiple entity updates into single render cycle
- **Memoization**: Use React.memo() and useMemo() to prevent unnecessary re-renders
- **Throttling**: Throttle position updates during animation to reduce database writes
- **Lazy Loading**: Only render entities visible in viewport
- **Virtual Scrolling**: Use virtual scrolling for large entity lists in popovers

### Browser Compatibility

- **CSS Transitions**: Supported in all modern browsers
- **Pointer Events**: Supported in all modern browsers
- **SVG Path**: Supported in all modern browsers
- **Popover API**: Use Radix UI for cross-browser compatibility

### Accessibility

- **Entity Badges**: Ensure badges have proper ARIA labels
- **Keyboard Navigation**: Support keyboard navigation for entity selection
- **Screen Readers**: Provide descriptive text for entity movements
- **Focus Management**: Manage focus when opening/closing panels

## Dependencies

- **Remove**: framer-motion (replace with CSS transitions)
- **Keep**: @xyflow/react (canvas rendering)
- **Keep**: Radix UI (popover, dialog components)
- **Add**: fast-check (property-based testing)

## Timeline Estimate

- Phase 1 (Entity Movement): 3-4 days
- Phase 2 (Canvas Rendering): 2-3 days
- Phase 3 (User Interactions): 2 days
- Phase 4 (Demo Script): 1-2 days
- Phase 5 (Error Handling): 1-2 days
- Testing & Bug Fixes: 2-3 days

**Total**: 11-16 days
