# Entity Features Guide

## Overview

This guide covers building features that track and visualize entities (customers, leads, churned users) as they move through Stitch workflows. Entities are the core of the "Living Business Model Canvas" concept - they represent real people traveling across your canvas in real-time.

## Core Concepts

### Entity Types

Stitch tracks three types of entities:

- **Lead**: Potential customers entering your workflow
- **Customer**: Converted leads who have purchased
- **Churned**: Former customers who have left

Each type has a distinct visual appearance (cyan, green, red respectively) and can be converted between types as they move through workflows.

### Entity Position States

An entity can be in one of two states:

1. **At a Node**: `current_node_id` is set, entity is stationary
2. **On an Edge**: `current_edge_id` and `edge_progress` are set, entity is traveling

```typescript
interface StitchEntity {
  id: string;
  canvas_id: string;
  
  // Identity
  name: string;
  email?: string;
  avatar_url?: string;
  entity_type: 'lead' | 'customer' | 'churned';
  
  // Position (mutually exclusive states)
  current_node_id?: string;        // At a node
  current_edge_id?: string;         // On an edge
  edge_progress?: number;           // 0.0 to 1.0
  destination_node_id?: string;     // Where edge leads
  
  // Journey tracking
  journey: JourneyEvent[];
  metadata: EntityMetadata;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
```

## Entity Movement Patterns

### Pattern 1: Webhook Creates Entity

The most common pattern - an external webhook creates an entity and places it at a node:

```typescript
// In webhook processor
const entity = await supabase
  .from('stitch_entities')
  .insert({
    canvas_id: canvasId,
    name: webhookData.customer_name,
    email: webhookData.email,
    entity_type: 'lead',
    current_node_id: targetNodeId,  // Start at specific node
    journey: [{
      type: 'entered_node',
      node_id: targetNodeId,
      timestamp: new Date().toISOString(),
      note: 'Created from webhook'
    }],
    metadata: {
      source: 'stripe',
      campaign: webhookData.utm_campaign
    }
  })
  .select()
  .single();
```

### Pattern 2: Workflow Moves Entity

When a workflow completes, it can move the entity to a section:

```typescript
import { moveEntityToSection } from '@/lib/db/entities';

// In worker node handler
await moveEntityToSection(
  entityId,
  targetSectionId,
  'success',  // or 'failure', 'neutral'
  {
    workflow_id: workflowId,
    completion_reason: 'Onboarding completed'
  },
  'customer'  // Optional: convert lead → customer
);
```

This pattern:
- Updates `current_node_id` to the target section
- Clears edge position fields
- Creates a journey event
- Optionally converts entity type

### Pattern 3: Edge Walking (Automatic Movement)

When a node completes, the execution engine automatically moves entities along edges:

```typescript
// In execution engine (edge-walker.ts)
async function walkEdges(nodeId: string, runId: string) {
  // Get entities at this node
  const entities = await getEntitiesAtNode(canvasId, nodeId);
  
  // Get outgoing edges
  const edges = getOutgoingEdges(nodeId);
  
  for (const entity of entities) {
    for (const edge of edges) {
      // Start entity traveling
      await startJourney(entity.id, edge.id);
      
      // Fire downstream node
      await executeNode(edge.target, runId);
    }
  }
}
```

### Pattern 4: Manual Entity Movement

Users can manually move entities via the UI:

```typescript
// In EntityDetailPanel component
const handleMoveEntity = async (entityId: string, targetNodeId: string) => {
  await supabase
    .from('stitch_entities')
    .update({
      current_node_id: targetNodeId,
      current_edge_id: null,
      edge_progress: null,
    })
    .eq('id', entityId);
  
  // Create manual movement journey event
  await createJourneyEvent(
    entityId,
    'manual_move',
    targetNodeId,
    null,
    null,
    { moved_by: 'user' }
  );
};
```

## Journey Event Creation

Journey events track entity movement for analytics and debugging. There are two systems:

### Legacy System (entity.journey field)

The old approach stores events in a JSONB array:

```typescript
const event: JourneyEvent = {
  timestamp: new Date().toISOString(),
  type: 'entered_node',
  node_id: nodeId,
  note: 'Optional description'
};

// Append to journey array
const { data: entity } = await supabase
  .from('stitch_entities')
  .select('journey')
  .eq('id', entityId)
  .single();

const journey = [...(entity?.journey || []), event];

await supabase
  .from('stitch_entities')
  .update({ journey })
  .eq('id', entityId);
```

### Modern System (stitch_journey_events table)

The new approach uses a dedicated table with atomic operations:

```typescript
import { createJourneyEvent } from '@/lib/db/entities';

// Create journey event
await createJourneyEvent(
  entityId,
  'node_arrival',  // event_type
  nodeId,          // node_id
  null,            // edge_id
  null,            // progress
  {                // metadata
    workflow_id: workflowId,
    completion_status: 'success'
  }
);
```

Event types:
- `edge_start`: Entity begins traveling on edge
- `edge_progress`: Entity progress update (optional, for long journeys)
- `node_arrival`: Entity arrives at node
- `node_complete`: Entity completes processing at node
- `manual_move`: User manually moved entity

### Querying Journey History

```typescript
import { getJourneyHistory } from '@/lib/db/entities';

const events = await getJourneyHistory(entityId);

// Events are ordered chronologically
events.forEach(event => {
  console.log(`${event.event_type} at ${event.timestamp}`);
  if (event.node_id) console.log(`  Node: ${event.node_id}`);
  if (event.edge_id) console.log(`  Edge: ${event.edge_id}`);
  if (event.metadata) console.log(`  Metadata:`, event.metadata);
});
```

## Animation Implementation

### Overview

Entity animations use a two-layer approach:

1. **Database State**: Source of truth for entity position
2. **Client Animation**: Smooth visual transitions between states

### Layer 1: Database Updates

The database tracks discrete position changes:

```typescript
// Entity starts at node A
{ current_node_id: 'A', current_edge_id: null }

// Workflow completes, entity starts traveling
{ current_node_id: null, current_edge_id: 'A->B', edge_progress: 0.0 }

// Entity arrives at node B
{ current_node_id: 'B', current_edge_id: null }
```

### Layer 2: Client Animation

The client smoothly animates between database states using Framer Motion:

```typescript
// EntityDot.tsx
<motion.div
  animate={{
    left: position.x,
    top: position.y,
  }}
  transition={{
    duration: isMoving ? 2 : 0.5,  // Slower when on edge
    ease: isMoving ? 'linear' : 'easeInOut',
  }}
>
  {/* Entity visual */}
</motion.div>
```

### Position Calculation

Entity positions are calculated based on their state:

**At a Node:**
```typescript
import { getEntityNodePosition } from '@/lib/entities/position';

// Calculate position at node (with clustering for multiple entities)
const position = getEntityNodePosition(
  node,           // React Flow node
  index,          // Entity index at this node
  totalCount,     // Total entities at node
  allNodes        // All nodes (for collision detection)
);
```

**On an Edge:**
```typescript
import { getEntityEdgePosition } from '@/lib/entities/position';

// Calculate position along edge path
const position = getEntityEdgePosition(
  edge,           // React Flow edge
  sourceNode,     // Source node
  targetNode,     // Target node
  progress,       // 0.0 to 1.0
  allNodes        // All nodes
);
```

### Optimized Position Hook

Use `useEntityPosition` for single entities or `useEntityPositions` for multiple:

```typescript
import { useEntityPosition, useEntityPositions } from '@/hooks/useEntityPosition';

// Single entity
const position = useEntityPosition(entity, allEntities);

// Multiple entities (more efficient)
const positions = useEntityPositions(entities);
const position = positions.get(entityId);
```

These hooks optimize performance by:
- Only recalculating when entity position data changes
- Separating canvas position from viewport transformation
- Memoizing results to prevent unnecessary renders

### Real-Time Updates

Entity movements trigger real-time UI updates via Supabase subscriptions:

```typescript
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

useRealtimeSubscription<{
  new: StitchEntity;
  old: StitchEntity;
}>(
  {
    table: 'stitch_entities',
    filter: `canvas_id=eq.${canvasId}`,
    event: 'UPDATE',
  },
  (payload) => {
    const entity = payload.new;
    const oldEntity = payload.old;
    
    // Detect movement start
    if (entity.current_edge_id && !oldEntity.current_edge_id) {
      // Entity started traveling - trigger animation
      startTravelAnimation(entity);
    }
    
    // Detect arrival
    if (entity.current_node_id && !oldEntity.current_node_id) {
      // Entity arrived at node - snap to position
      snapToNode(entity);
    }
  },
  true  // enabled
);
```

## Building Entity Features

### Feature: Entity Creation from Webhook

```typescript
// 1. Define webhook adapter
export class StripeWebhookAdapter implements WebhookAdapter {
  async extractEntities(payload: any): Promise<EntityCreationData[]> {
    return [{
      name: payload.customer.name,
      email: payload.customer.email,
      entity_type: 'lead',
      metadata: {
        source: 'stripe',
        plan: payload.subscription.plan.name,
        amount: payload.subscription.amount
      }
    }];
  }
}

// 2. Process webhook and create entity
const entities = await adapter.extractEntities(webhookPayload);

for (const entityData of entities) {
  await supabase
    .from('stitch_entities')
    .insert({
      canvas_id: canvasId,
      ...entityData,
      current_node_id: targetNodeId,
      journey: [{
        type: 'entered_node',
        node_id: targetNodeId,
        timestamp: new Date().toISOString()
      }]
    });
}
```

### Feature: Entity Filtering and Search

```typescript
// Filter entities by type
const customers = entities.filter(e => e.entity_type === 'customer');

// Filter by current location
const entitiesInMarketing = entities.filter(
  e => e.current_node_id === 'marketing-section'
);

// Filter by metadata
const highValueCustomers = entities.filter(
  e => e.metadata.ltv && e.metadata.ltv > 10000
);

// Search by name or email
const searchResults = entities.filter(
  e => e.name.toLowerCase().includes(query.toLowerCase()) ||
       e.email?.toLowerCase().includes(query.toLowerCase())
);
```

### Feature: Entity Conversion

```typescript
// Convert lead to customer when they purchase
async function convertToCustomer(entityId: string, purchaseData: any) {
  const { data: entity } = await supabase
    .from('stitch_entities')
    .update({
      entity_type: 'customer',
      metadata: {
        ...entity.metadata,
        conversion_date: new Date().toISOString(),
        first_purchase: purchaseData.amount,
        plan: purchaseData.plan
      }
    })
    .eq('id', entityId)
    .select()
    .single();
  
  // Create conversion journey event
  await createJourneyEvent(
    entityId,
    'node_arrival',
    entity.current_node_id,
    null,
    null,
    {
      event_subtype: 'conversion',
      from_type: 'lead',
      to_type: 'customer',
      purchase_amount: purchaseData.amount
    }
  );
  
  return entity;
}
```

### Feature: Entity Analytics

```typescript
// Calculate entity metrics
function calculateEntityMetrics(entities: StitchEntity[]) {
  const total = entities.length;
  const leads = entities.filter(e => e.entity_type === 'lead').length;
  const customers = entities.filter(e => e.entity_type === 'customer').length;
  const churned = entities.filter(e => e.entity_type === 'churned').length;
  
  const conversionRate = total > 0 ? (customers / total) * 100 : 0;
  const churnRate = customers > 0 ? (churned / customers) * 100 : 0;
  
  // Calculate average journey length
  const avgJourneyLength = entities.reduce(
    (sum, e) => sum + e.journey.length, 0
  ) / total;
  
  return {
    total,
    leads,
    customers,
    churned,
    conversionRate,
    churnRate,
    avgJourneyLength
  };
}
```

### Feature: Entity Detail Panel

```typescript
// Display entity information and journey
function EntityDetailPanel({ entity }: { entity: StitchEntity }) {
  const [journeyEvents, setJourneyEvents] = useState([]);
  
  useEffect(() => {
    async function loadJourney() {
      const events = await getJourneyHistory(entity.id);
      setJourneyEvents(events);
    }
    loadJourney();
  }, [entity.id]);
  
  return (
    <div className="entity-panel">
      <h2>{entity.name}</h2>
      <Badge>{entity.entity_type}</Badge>
      
      <div className="metadata">
        {entity.email && <p>Email: {entity.email}</p>}
        {entity.metadata.source && <p>Source: {entity.metadata.source}</p>}
        {entity.metadata.ltv && <p>LTV: ${entity.metadata.ltv}</p>}
      </div>
      
      <div className="journey">
        <h3>Journey History</h3>
        {journeyEvents.map(event => (
          <div key={event.id} className="journey-event">
            <span>{event.event_type}</span>
            <span>{new Date(event.timestamp).toLocaleString()}</span>
            {event.node_id && <span>Node: {event.node_id}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Best Practices

### 1. Always Use Atomic Operations

Use the RPC functions for entity movement to ensure consistency:

```typescript
// ✅ Good: Atomic operation
await startJourney(entityId, edgeId);

// ❌ Bad: Manual updates can cause race conditions
await supabase.from('stitch_entities').update({...});
```

### 2. Create Journey Events

Always create journey events for significant movements:

```typescript
// After any entity movement
await createJourneyEvent(
  entityId,
  eventType,
  nodeId,
  edgeId,
  progress,
  metadata
);
```

### 3. Scope Queries by Canvas

Always filter by `canvas_id` to prevent data leakage:

```typescript
// ✅ Good: Scoped to canvas
const entities = await getEntitiesAtNode(canvasId, nodeId);

// ❌ Bad: Could return entities from other canvases
const entities = await supabase
  .from('stitch_entities')
  .select('*')
  .eq('current_node_id', nodeId);
```

### 4. Handle Missing Positions Gracefully

Not all entities will have valid positions:

```typescript
const position = useEntityPosition(entity, allEntities);

if (!position) {
  // Entity is not visible (no valid position)
  return null;
}

return <EntityDot position={position} />;
```

### 5. Optimize Rendering

Use memoization and batch position calculations:

```typescript
// ✅ Good: Batch calculation
const positions = useEntityPositions(entities);

// ❌ Bad: Individual calculations
entities.map(e => useEntityPosition(e, entities));
```

### 6. Use Type Guards for Journey Events

The journey system has two formats - use type guards:

```typescript
import { isDatabaseEvent, getEventType } from '@/types/journey-event';

if (isDatabaseEvent(event)) {
  // Access database-specific fields
  console.log(event.event_type, event.metadata);
} else {
  // Access fallback fields
  console.log(event.type, event.note);
}
```

## Common Patterns

### Pattern: Entity Clustering at Nodes

When multiple entities are at the same node, position them in a cluster:

```typescript
// Automatically handled by getEntityNodePosition
const entitiesAtNode = entities.filter(
  e => e.current_node_id === nodeId
);

entitiesAtNode.forEach((entity, index) => {
  const position = getEntityNodePosition(
    node,
    index,
    entitiesAtNode.length,
    allNodes
  );
  // Entities are positioned in a circle around the node
});
```

### Pattern: Progress Indicators

Show entity progress along edges:

```typescript
function EntityProgressIndicator({ entity }: { entity: StitchEntity }) {
  if (!entity.current_edge_id) return null;
  
  const progress = entity.edge_progress || 0;
  
  return (
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${progress * 100}%` }}
      />
      <span>{Math.round(progress * 100)}%</span>
    </div>
  );
}
```

### Pattern: Entity Type Conversion Workflow

```typescript
// Worker node that converts leads to customers
async function onboardingCompleteHandler(
  nodeId: string,
  runId: string,
  input: any
) {
  const entityId = input.entityId;
  
  // Move to customer section and convert type
  await moveEntityToSection(
    entityId,
    'customer-section',
    'success',
    {
      onboarding_completed: true,
      completion_date: new Date().toISOString()
    },
    'customer'  // Convert lead → customer
  );
}
```

## Troubleshooting

### Entities Not Appearing

1. Check entity has valid position:
   ```typescript
   console.log(entity.current_node_id, entity.current_edge_id);
   ```

2. Verify node/edge exists in canvas:
   ```typescript
   const node = getNode(entity.current_node_id);
   console.log('Node exists:', !!node);
   ```

3. Check canvas_id matches:
   ```typescript
   console.log('Entity canvas:', entity.canvas_id);
   console.log('Current canvas:', canvasId);
   ```

### Animations Not Smooth

1. Check subscription is active:
   ```typescript
   // Enable subscription
   useRealtimeSubscription(..., true);
   ```

2. Verify position calculations are memoized:
   ```typescript
   // Use optimized hooks
   const positions = useEntityPositions(entities);
   ```

3. Check animation duration:
   ```typescript
   // Adjust in EntityDot.tsx
   transition={{ duration: 2 }}
   ```

### Journey Events Not Recording

1. Verify journey event creation:
   ```typescript
   const event = await createJourneyEvent(...);
   console.log('Created event:', event);
   ```

2. Check database permissions:
   ```typescript
   // Ensure RLS policies allow inserts
   ```

3. Query events to verify:
   ```typescript
   const events = await getJourneyHistory(entityId);
   console.log('Event count:', events.length);
   ```

## Related Documentation

- [Entity Visualization](../frontend/entity-visualization.md) - EntityOverlay and EntityDot components
- [React Hooks](../frontend/hooks.md) - useEntities, useEntityPosition, useEntityMovement
- [Database Layer](../backend/database-layer.md) - Entity database operations
- [Webhook System](../backend/webhook-system.md) - Creating entities from webhooks
- [Entity Movement Diagram](../diagrams/entity-movement.mmd) - Visual flow diagram
