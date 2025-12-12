# Design Document

## Overview

This design addresses critical code quality, performance, and architecture improvements identified through code analysis of the Stitch system. The improvements focus on five key areas:

1. **Entity Edge Path Following**: Implementing accurate SVG path interpolation for entity movement visualization
2. **Subscription Management**: Centralizing real-time database subscription lifecycle to prevent memory leaks
3. **Demo Session Management**: Ensuring idempotent demo operations with proper cleanup
4. **Type Safety**: Eliminating `any` types and implementing discriminated unions for journey events
5. **Performance Optimization**: Memoizing entity position calculations to reduce unnecessary re-renders
6. **Error Handling**: Making errors visible to users instead of silent failures
7. **State Machine Validation**: Preventing invalid node status transitions
8. **Accessibility**: Adding ARIA labels for screen reader support
9. **Code Organization**: Eliminating duplication and improving separation of concerns

These improvements align with Stitch's core principles: Visual-First Philosophy (accurate entity visualization), Database as Source of Truth (proper subscription management), and robust error handling.

## Architecture

### Entity Visualization Layer

The entity visualization system consists of three main components:

1. **EntityDot Component**: Renders individual entity avatars with animation
2. **EntityOverlay Component**: Manages all entity dots and their positions
3. **Position Calculation Module**: Computes entity positions based on node/edge data

Current implementation uses linear interpolation between nodes, which doesn't follow curved edges. The improved design will use SVG path interpolation via `getPointAtLength()` API.

```
┌─────────────────────────────────────────┐
│         EntityOverlay                    │
│  ┌────────────────────────────────────┐ │
│  │  Position Calculation (Memoized)   │ │
│  │  - getEntityNodePosition()         │ │
│  │  - getEntityEdgePositionFromPath() │ │
│  └────────────────────────────────────┘ │
│              ↓                           │
│  ┌────────────────────────────────────┐ │
│  │  EntityDot (Framer Motion)         │ │
│  │  - Follows SVG path                │ │
│  │  - Smooth animation                │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Subscription Management Architecture

Current state: Multiple hooks create independent subscriptions, leading to:
- Duplicate channels for the same data
- Inconsistent cleanup
- Memory leaks when components unmount improperly

Improved design: Centralized subscription manager with reference counting

```
┌──────────────────────────────────────────┐
│   useRealtimeSubscription Hook           │
│  ┌────────────────────────────────────┐  │
│  │  Subscription Registry             │  │
│  │  - Map<key, SubscriptionRef>       │  │
│  │  - Reference counting              │  │
│  │  - Automatic cleanup               │  │
│  └────────────────────────────────────┘  │
│              ↓                            │
│  ┌────────────────────────────────────┐  │
│  │  Supabase Channel                  │  │
│  │  - Single channel per key          │  │
│  │  - Shared across components        │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Demo Session Management

Current issue: Demo entities accumulate without cleanup, causing data pollution.

Improved design: Idempotent demo operations with metadata tagging

```
Start Demo Flow:
1. Check for existing demo entities (metadata.source === 'demo')
2. Delete existing demo entities
3. Create new demo entities with session ID
4. Tag entities with metadata: { source: 'demo', session_id: '...' }
5. Return session ID for cleanup reference
```

### Type Safety for Journey Events

Current issue: Using `any` type for journey events, mixing database and fallback formats.

Improved design: Discriminated union types

```typescript
type DatabaseJourneyEvent = {
  source: 'database';
  event_type: 'node_arrival' | 'edge_start' | 'edge_progress' | 'node_complete';
  node_id?: string;
  edge_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

type FallbackJourneyEvent = {
  source: 'fallback';
  type: string;
  node_id?: string;
  edge_id?: string;
  timestamp: string;
  note?: string;
};

type JourneyEvent = DatabaseJourneyEvent | FallbackJourneyEvent;
```

### Performance Optimization Strategy

Current issue: EntityOverlay recalculates all entity positions on every viewport change.

Optimization approach:
1. Memoize individual entity positions based on entity data
2. Only recalculate when entity position data changes
3. Separate viewport transformation from position calculation

```typescript
// Before: O(n) recalculation on every viewport change
const entityPositions = useMemo(() => {
  return entities.map(e => calculatePosition(e));
}, [entities, viewport]); // Recalculates all on viewport change

// After: O(changed entities) recalculation
const useEntityPosition = (entity, viewport) => {
  return useMemo(() => {
    const canvasPos = calculatePosition(entity);
    return toScreenCoords(canvasPos, viewport);
  }, [
    entity.current_node_id,
    entity.current_edge_id,
    entity.edge_progress,
    viewport.zoom,
    viewport.x,
    viewport.y
  ]);
};
```

## Components and Interfaces

### 1. Enhanced Position Calculation Module

**File**: `src/lib/entities/position.ts`

```typescript
/**
 * Get entity position using SVG path interpolation
 * More accurate for curved edges
 */
export function getEntityEdgePositionFromPath(
  pathElement: SVGPathElement,
  progress: number
): Position {
  const totalLength = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(totalLength * progress);
  
  return {
    x: point.x - 14, // Center the 28px dot
    y: point.y - 14
  };
}

/**
 * Get SVG path element for an edge
 */
export function getEdgePathElement(
  edgeId: string
): SVGPathElement | null {
  const edgeElement = document.querySelector(
    `[data-id="${edgeId}"] path`
  );
  return edgeElement as SVGPathElement | null;
}
```

### 2. Centralized Subscription Hook

**File**: `src/hooks/useRealtimeSubscription.ts`

```typescript
interface SubscriptionConfig {
  table: string;
  filter: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface SubscriptionCallback<T> {
  (payload: T): void;
}

/**
 * Centralized real-time subscription hook
 * Manages channel lifecycle and prevents duplicate subscriptions
 */
export function useRealtimeSubscription<T>(
  config: SubscriptionConfig,
  callback: SubscriptionCallback<T>,
  enabled: boolean = true
): {
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
} {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    const key = `${config.table}:${config.filter}`;
    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        callback
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (subscriptionStatus === 'CHANNEL_ERROR') {
          setStatus('error');
          setError('Subscription failed');
        }
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, [config.table, config.filter, config.event, enabled]);
  
  return { status, error };
}
```

### 3. Demo Manager Service

**File**: `src/lib/demo/demo-manager.ts`

```typescript
export interface DemoConfig {
  canvasId: string;
  entities?: DemoEntityConfig[];
  staggerDelay?: number;
}

export interface DemoSession {
  sessionId: string;
  canvasId: string;
  entityIds: string[];
  runIds: string[];
}

export class DemoManager {
  /**
   * Start a demo session with idempotent cleanup
   */
  async startDemo(config: DemoConfig): Promise<DemoSession> {
    // 1. Clean up existing demo entities
    await this.cleanupDemoEntities(config.canvasId);
    
    // 2. Create new demo session
    const sessionId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // 3. Spawn entities with metadata tagging
    const entityIds = await this.spawnEntities(config, sessionId);
    
    // 4. Trigger workflows if applicable
    const runIds = await this.triggerWorkflows(config.canvasId, entityIds, sessionId);
    
    return {
      sessionId,
      canvasId: config.canvasId,
      entityIds,
      runIds,
    };
  }
  
  /**
   * Clean up demo entities for a canvas
   */
  private async cleanupDemoEntities(canvasId: string): Promise<void> {
    const supabase = getAdminClient();
    
    await supabase
      .from('stitch_entities')
      .delete()
      .eq('canvas_id', canvasId)
      .eq('metadata->>source', 'demo');
  }
  
  /**
   * Spawn demo entities with metadata tagging
   */
  private async spawnEntities(
    config: DemoConfig,
    sessionId: string
  ): Promise<string[]> {
    // Implementation details...
  }
}
```

### 4. Journey Event Type Definitions

**File**: `src/types/journey-event.ts`

```typescript
export type DatabaseJourneyEvent = {
  source: 'database';
  id: string;
  entity_id: string;
  event_type: 'node_arrival' | 'edge_start' | 'edge_progress' | 'node_complete' | 'manual_move';
  node_id?: string;
  edge_id?: string;
  progress?: number;
  timestamp: string;
  metadata?: Record<string, any>;
};

export type FallbackJourneyEvent = {
  source: 'fallback';
  type: string;
  node_id?: string;
  edge_id?: string;
  from_node_id?: string;
  workflow_run_id?: string;
  timestamp: string;
  note?: string;
};

export type JourneyEvent = DatabaseJourneyEvent | FallbackJourneyEvent;

/**
 * Type guard for database events
 */
export function isDatabaseEvent(event: JourneyEvent): event is DatabaseJourneyEvent {
  return event.source === 'database';
}

/**
 * Type guard for fallback events
 */
export function isFallbackEvent(event: JourneyEvent): event is FallbackJourneyEvent {
  return event.source === 'fallback';
}

/**
 * Normalize raw event to typed event
 */
export function normalizeJourneyEvent(raw: any): JourneyEvent {
  if ('event_type' in raw) {
    return {
      source: 'database',
      ...raw,
    } as DatabaseJourneyEvent;
  }
  
  return {
    source: 'fallback',
    ...raw,
  } as FallbackJourneyEvent;
}
```

### 5. Node Status State Machine

**File**: `src/lib/engine/status-transitions.ts`

```typescript
export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting_for_user';

export const VALID_TRANSITIONS: Record<NodeStatus, NodeStatus[]> = {
  'pending': ['running'],
  'running': ['completed', 'failed', 'waiting_for_user'],
  'completed': [], // Terminal state
  'failed': ['running'], // Allow retry
  'waiting_for_user': ['running'],
};

export class StatusTransitionError extends Error {
  constructor(from: NodeStatus, to: NodeStatus) {
    super(`Invalid status transition from '${from}' to '${to}'`);
    this.name = 'StatusTransitionError';
  }
}

/**
 * Validate a status transition
 * @throws StatusTransitionError if transition is invalid
 */
export function validateTransition(from: NodeStatus, to: NodeStatus): void {
  const validTargets = VALID_TRANSITIONS[from];
  
  if (!validTargets.includes(to)) {
    throw new StatusTransitionError(from, to);
  }
}

/**
 * Check if a transition is valid without throwing
 */
export function isValidTransition(from: NodeStatus, to: NodeStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### 6. Accessible Node Status Indicator

**File**: `src/components/canvas/nodes/NodeStatusIndicator.tsx`

```typescript
interface NodeStatusIndicatorProps {
  status: NodeStatus;
  nodeId: string;
}

export function NodeStatusIndicator({ status, nodeId }: NodeStatusIndicatorProps) {
  const statusStyles = getStatusStyles(status);
  
  return (
    <div
      className={`absolute inset-0 pointer-events-none rounded-lg border-2 ${statusStyles.className}`}
      role="status"
      aria-label={`Node status: ${status}`}
      aria-live="polite"
      style={{
        borderColor: statusStyles.color,
        boxShadow: statusStyles.glow,
      }}
    />
  );
}
```

## Data Models

### Demo Entity Metadata

```typescript
interface DemoEntityMetadata {
  source: 'demo';
  session_id: string;
  spawned_at: string;
}
```

### Subscription Registry Entry

```typescript
interface SubscriptionEntry {
  channel: RealtimeChannel;
  refCount: number;
  callbacks: Set<Function>;
}

type SubscriptionRegistry = Map<string, SubscriptionEntry>;
```

### Entity Position Cache

```typescript
interface EntityPositionCache {
  entityId: string;
  canvasPosition: { x: number; y: number };
  screenPosition: { x: number; y: number };
  lastCalculated: number;
  dependencies: {
    nodeId?: string;
    edgeId?: string;
    progress?: number;
    viewportZoom: number;
    viewportX: number;
    viewportY: number;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SVG Path Following Accuracy

*For any* entity traveling on an edge with progress value p, the entity position calculated using SVG path interpolation should match the point at distance (p * totalLength) along the path.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Demo Session Idempotency

*For any* canvas, starting a demo session multiple times should result in the same number of demo entities (previous demo entities should be cleaned up before creating new ones).

**Validates: Requirements 3.2, 3.3**

### Property 3: Journey Event Type Safety

*For any* raw journey event, normalizing it should produce a properly typed discriminated union (either DatabaseJourneyEvent or FallbackJourneyEvent) that can be processed without type errors.

**Validates: Requirements 4.2, 4.5**

### Property 4: Status Transition Validation

*For any* attempted node status transition, if the transition is invalid according to the state machine, the system should reject it and preserve the current state unchanged.

**Validates: Requirements 7.2, 7.5**

### Property 5: Error Visibility

*For any* error that occurs during run status loading, the system should display a user-visible error message and log detailed information for debugging.

**Validates: Requirements 6.2, 6.4**

### Property 6: ARIA Label Presence

*For any* node status indicator rendered, it should include an ARIA label in the format "Node status: {status}" and have role="status" and aria-live="polite" attributes.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

## Error Handling

### Entity Position Calculation Errors

**Scenario**: SVG path element not found for edge
- **Handling**: Fall back to linear interpolation
- **Logging**: Warn that path element is missing
- **User Impact**: Entity follows straight line instead of curved path

**Scenario**: Invalid edge progress value (< 0 or > 1)
- **Handling**: Clamp to [0, 1] range
- **Logging**: Warn about invalid progress value
- **User Impact**: Entity positioned at edge boundary

### Subscription Management Errors

**Scenario**: Supabase channel fails to connect
- **Handling**: Set status to 'error' and provide error message
- **Logging**: Log connection failure details
- **User Impact**: Real-time updates unavailable, user sees error indicator

**Scenario**: Component unmounts before subscription completes
- **Handling**: Use mounted flag to prevent state updates
- **Logging**: No logging needed (normal cleanup)
- **User Impact**: None

### Demo Session Errors

**Scenario**: Canvas not found when starting demo
- **Handling**: Return 404 error with message
- **Logging**: Log canvas ID that was not found
- **User Impact**: User sees error toast "Canvas not found"

**Scenario**: Entity creation fails during demo spawn
- **Handling**: Continue with remaining entities, log failure
- **Logging**: Log entity creation error details
- **User Impact**: Fewer entities spawned than requested

### Status Transition Errors

**Scenario**: Invalid status transition attempted
- **Handling**: Throw StatusTransitionError, preserve current state
- **Logging**: Log attempted transition and reason for rejection
- **User Impact**: Operation fails with clear error message

## Testing Strategy

### Unit Testing

Unit tests will cover specific examples and edge cases:

1. **Entity Position Edge Cases**
   - Progress = 0.0 positions at source node
   - Progress = 1.0 positions at target node
   - Progress = 0.5 positions at path midpoint

2. **Subscription Lifecycle**
   - Component mount creates subscription
   - Component unmount cleans up subscription
   - Multiple components share single channel

3. **Demo Session Management**
   - Starting demo checks for existing entities
   - Existing demo entities are deleted
   - New entities are tagged with metadata

4. **Status Transitions**
   - Valid transitions are allowed
   - Invalid transitions are rejected
   - Completed state is terminal

5. **Error Handling**
   - Errors display user-friendly messages
   - Errors are logged for debugging
   - Silent failures are prevented

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using **fast-check** (JavaScript/TypeScript PBT library). Each test will run a minimum of 100 iterations.

1. **Property 1: SVG Path Following Accuracy**
   - Generate: Random edges with various path geometries, random progress values [0, 1]
   - Test: Position from getEntityEdgePositionFromPath matches getPointAtLength
   - Tag: `**Feature: code-quality-improvements, Property 1: SVG Path Following Accuracy**`

2. **Property 2: Demo Session Idempotency**
   - Generate: Random canvas IDs, random numbers of existing demo entities
   - Test: After starting demo, entity count equals expected count (not accumulated)
   - Tag: `**Feature: code-quality-improvements, Property 2: Demo Session Idempotency**`

3. **Property 3: Journey Event Type Safety**
   - Generate: Random raw events (both database and fallback formats)
   - Test: normalizeJourneyEvent produces valid discriminated union
   - Tag: `**Feature: code-quality-improvements, Property 3: Journey Event Type Safety**`

4. **Property 4: Status Transition Validation**
   - Generate: Random status pairs (from, to)
   - Test: Invalid transitions are rejected, valid transitions succeed
   - Tag: `**Feature: code-quality-improvements, Property 4: Status Transition Validation**`

5. **Property 5: Error Visibility**
   - Generate: Random error scenarios
   - Test: All errors produce user-visible messages and debug logs
   - Tag: `**Feature: code-quality-improvements, Property 5: Error Visibility**`

6. **Property 6: ARIA Label Presence**
   - Generate: Random node statuses
   - Test: Rendered indicators have correct ARIA attributes
   - Tag: `**Feature: code-quality-improvements, Property 6: ARIA Label Presence**`

### Integration Testing

Integration tests will verify component interactions:

1. **Entity Visualization Integration**
   - Test EntityOverlay with EntityDot using real React Flow context
   - Verify position updates trigger re-renders
   - Verify viewport changes don't cause unnecessary recalculations

2. **Subscription Management Integration**
   - Test multiple components using useRealtimeSubscription
   - Verify channel sharing and cleanup
   - Verify updates propagate to all subscribers

3. **Demo Mode End-to-End**
   - Test complete demo flow from button click to entity spawn
   - Verify cleanup of previous demo entities
   - Verify workflow triggering for demo entities

### Performance Testing

Performance tests will verify optimization goals:

1. **Entity Position Calculation Performance**
   - Measure time to recalculate 100 entity positions
   - Verify viewport changes don't recalculate unchanged entities
   - Target: < 16ms for 100 entities (60fps)

2. **Subscription Memory Usage**
   - Create and destroy 100 subscriptions
   - Verify no memory leaks
   - Verify channels are properly cleaned up

## Implementation Notes

### SVG Path Access

React Flow renders edges as SVG paths. To access them:

```typescript
// Get edge element by data-id attribute
const edgeElement = document.querySelector(`[data-id="${edgeId}"]`);
const pathElement = edgeElement?.querySelector('path');

if (pathElement) {
  const totalLength = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(totalLength * progress);
}
```

### Memoization Strategy

Use React's `useMemo` with precise dependencies:

```typescript
// Memoize individual entity position
const entityPosition = useMemo(() => {
  const canvasPos = calculatePosition(entity);
  return toScreenCoords(canvasPos, viewport);
}, [
  entity.current_node_id,    // Only recalc if position changes
  entity.current_edge_id,
  entity.edge_progress,
  viewport.zoom,              // Only recalc if viewport changes
  viewport.x,
  viewport.y
]);
```

### Code Deduplication

Move BMC generation logic from scripts to lib:

```typescript
// Before: scripts/seed-bmc.ts contains full generation logic
// After: scripts/seed-bmc.ts imports from lib
import { generateBMCGraph, seedDefaultBMC } from '@/lib/seeds/default-bmc';

async function main() {
  const bmcId = await seedDefaultBMC();
  // Verification only
}
```

### Separation of Concerns

Extract demo orchestration from UI component:

```typescript
// Before: DemoModeButton handles API calls and state
const startDemo = async () => {
  const response = await fetch('/api/demo/start', { ... });
  // Handle response...
};

// After: DemoModeButton delegates to DemoManager
const demoManager = useDemoManager();
const startDemo = () => demoManager.startDemo(canvasId);
```
