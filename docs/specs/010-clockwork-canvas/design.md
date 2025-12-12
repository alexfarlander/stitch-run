# Design Document

## Overview

The Clockwork Canvas is a comprehensive demonstration system that transforms the Business Model Canvas from a static diagram into a living, interactive visualization of business operations. The system consists of several interconnected components:

1. **Entity System**: Halloween-themed entities (monsters) that represent customers and leads flowing through the business
2. **Dual Edge Architecture**: Journey edges (solid, for entity travel) and System edges (dashed, for background automation)
3. **Webhook-Driven State Machine**: External events trigger entity movement and workflow execution
4. **Demo Orchestrator**: Scripted event sequences for live demonstrations
5. **Drill-Down Workflows**: Detailed logic views for each business touchpoint
6. **Real-Time Synchronization**: Supabase Realtime ensures all clients see updates instantly
7. **Dynamic Financial Tracking**: Revenue and cost metrics update based on entity actions

The design follows the existing Stitch architecture principles: database as source of truth, edge-walking execution model, async worker pattern, and visual-first philosophy.

## Architecture

### High-Level Component Diagram

```mermaid
graph TB
    subgraph External World
        A[LinkedIn/Calendly/Stripe APIs]
    end
    
    subgraph Webhook Layer
        B[/api/webhooks/[source]]
        C[Webhook Processor]
        D[Node Mapper]
    end
    
    subgraph State Management
        E[(Supabase DB)]
        F[Entity Manager]
        G[Journey Event Logger]
    end
    
    subgraph Execution Engine
        H[Edge Walker]
        I[System Edge Trigger]
        J[Worker Registry]
    end
    
    subgraph UI Layer
        K[BMC Canvas]
        L[Demo Control Panel]
        M[Realtime Subscription]
    end
    
    A -->|POST webhook| B
    B --> C
    C --> D
    C --> F
    C --> G
    F --> E
    G --> E
    C --> H
    H --> I
    I --> J
    E -->|Realtime| M
    M --> K
    L -->|Trigger Demo| B
```

### Data Flow

1. **Webhook Reception**: External event arrives at `/api/webhooks/[source]`
2. **Entity Resolution**: Find or create entity by email
3. **Position Update**: Update entity's `current_node_id` in database
4. **Journey Logging**: Create `journey_event` record
5. **Parallel Execution**: 
   - Journey edge fires → Entity animates to next node
   - System edges fire → Background workflows execute
6. **Financial Update**: If applicable, update MRR/cost metrics
7. **Realtime Broadcast**: Supabase pushes changes to all clients
8. **UI Animation**: Canvas animates entity movement and edge pulses

## Components and Interfaces

### 1. Entity System

#### Entity Data Structure

```typescript
interface ClockworkEntity extends StitchEntity {
  id: string;
  canvas_id: string;
  name: string;              // e.g., "Frankenstein"
  email: string;             // e.g., "frank@monsters.io"
  avatar_url: string;        // DiceBear URL with monster seed
  entity_type: 'lead' | 'customer' | 'churned';
  current_node_id: string | null;
  current_edge_id: string | null;
  edge_progress: number | null;
  journey: JourneyEntry[];
  metadata: {
    monster_type: string;    // e.g., "frankenstein"
    journey_story: string;   // Narrative description
    [key: string]: any;
  };
}
```

#### Entity Seed Data

Location: `src/lib/seeds/clockwork-entities.ts`

```typescript
export const CLOCKWORK_ENTITIES = [
  {
    name: 'Frankenstein',
    email: 'frankenstein@monsters.io',
    monster_type: 'frankenstein',
    entity_type: 'customer',
    current_node_id: 'item-active-subscribers',
    journey_story: 'The OG. Completed the full journey. A loyal Pro subscriber.',
  },
  {
    name: 'Dracula',
    email: 'dracula@monsters.io',
    monster_type: 'dracula',
    entity_type: 'lead',
    current_node_id: 'item-demo-call',
    journey_story: 'Has booked a demo. Ancient, cautious, needs to be convinced.',
  },
  // ... 11 more entities
];
```

### 2. Dual Edge Architecture

#### Edge Types

```typescript
type EdgeType = 'journey' | 'system';

interface StitchEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  animated?: boolean;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;  // "5 5" for system edges
  };
  data?: {
    edgeType?: EdgeType;       // Redundant storage for filtering
    systemAction?: string;     // e.g., "crm_sync", "slack_notify"
  };
}
```

#### Journey Edge Component

Location: `src/components/canvas/edges/JourneyEdge.tsx` (existing)

- Solid line
- Colored based on section
- Animated when entity is traveling
- Shows entity avatar during transit

#### System Edge Component

Location: `src/components/canvas/edges/SystemEdge.tsx` (new)

```typescript
export function SystemEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Subscribe to system edge fire events
  useEffect(() => {
    const subscription = supabase
      .channel('system-edges')
      .on('broadcast', { event: 'edge_fired' }, (payload) => {
        if (payload.edge_id === id) {
          setIsPulsing(true);
          setTimeout(() => setIsPulsing(false), 1000);
        }
      })
      .subscribe();
    
    return () => { subscription.unsubscribe(); };
  }, [id]);
  
  return (
    <g className={isPulsing ? 'animate-pulse' : ''}>
      <path
        d={`M ${sourceX},${sourceY} L ${targetX},${targetY}`}
        stroke="#64748b"
        strokeWidth={2}
        strokeDasharray="5 5"
        fill="none"
      />
    </g>
  );
}
```

### 3. Webhook API Layer

#### Dynamic Route Handler

Location: `src/app/api/webhooks/[source]/route.ts`

```typescript
export async function POST(
  request: Request,
  { params }: { params: { source: string } }
) {
  const { source } = params;
  const payload = await request.json();
  
  // 1. Map source to target node
  const targetNodeId = WEBHOOK_NODE_MAP[source];
  if (!targetNodeId) {
    return Response.json({ error: 'Unknown webhook source' }, { status: 400 });
  }
  
  // 2. Find or create entity
  const entity = await findOrCreateEntity(payload.email, {
    name: payload.name,
    entity_type: determineEntityType(source),
    metadata: { source, ...payload },
  });
  
  // 3. Move entity to target node
  await moveEntityToNode(entity.id, targetNodeId);
  
  // 4. Create journey event
  await createJourneyEvent({
    entity_id: entity.id,
    event_type: 'node_arrival',
    node_id: targetNodeId,
  });
  
  // 5. Trigger system edges
  await triggerSystemEdges(targetNodeId, entity.id);
  
  // 6. Update financials if applicable
  if (source.startsWith('stripe-subscription')) {
    await updateFinancials(payload);
  }
  
  return Response.json({ success: true, entity_id: entity.id });
}
```

#### Webhook Node Mapping

Location: `src/lib/webhooks/node-map.ts`

```typescript
export const WEBHOOK_NODE_MAP: Record<string, string> = {
  'linkedin-lead': 'item-linkedin-ads',
  'youtube-signup': 'item-youtube-channel',
  'seo-form': 'item-seo-content',
  'calendly-demo': 'item-demo-call',
  'stripe-trial': 'item-free-trial',
  'stripe-subscription-basic': 'item-basic-plan',
  'stripe-subscription-pro': 'item-pro-plan',
  'stripe-subscription-enterprise': 'item-enterprise',
  'zendesk-ticket': 'item-help-desk',
  'stripe-churn': 'item-help-desk',
  'referral': 'item-referral-program',
};
```

### 4. Demo Orchestrator

#### Demo Script Structure

Location: `src/lib/demo/demo-script.ts`

```typescript
export interface DemoEvent {
  delay: number;           // Milliseconds from demo start
  endpoint: string;        // Webhook endpoint path
  payload: Record<string, any>;
  description: string;     // For UI display
}

export const CLOCKWORK_DEMO_SCRIPT: DemoEvent[] = [
  {
    delay: 0,
    endpoint: '/api/webhooks/linkedin-lead',
    payload: { name: 'Werewolf', email: 'werewolf@monsters.io' },
    description: 'New lead from LinkedIn Ads',
  },
  {
    delay: 5000,
    endpoint: '/api/webhooks/calendly-demo',
    payload: { email: 'goblin@monsters.io' },
    description: 'Demo call booked',
  },
  {
    delay: 10000,
    endpoint: '/api/webhooks/stripe-trial',
    payload: { email: 'witch@monsters.io' },
    description: 'Trial started',
  },
  {
    delay: 15000,
    endpoint: '/api/webhooks/stripe-subscription-pro',
    payload: { email: 'ghost@monsters.io', plan: 'pro', amount: 99 },
    description: 'Converted to Pro plan',
  },
  {
    delay: 20000,
    endpoint: '/api/webhooks/zendesk-ticket',
    payload: { email: 'mummy@monsters.io', subject: 'Help needed' },
    description: 'Support ticket opened',
  },
];
```

#### Demo API Endpoints

**Start Demo**: `POST /api/demo/start`

```typescript
export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  for (const event of CLOCKWORK_DEMO_SCRIPT) {
    setTimeout(async () => {
      await fetch(`${baseUrl}${event.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.payload),
      });
    }, event.delay);
  }
  
  return Response.json({ 
    success: true, 
    events: CLOCKWORK_DEMO_SCRIPT.length,
    duration: Math.max(...CLOCKWORK_DEMO_SCRIPT.map(e => e.delay)) + 5000,
  });
}
```

**Reset Demo**: `POST /api/demo/reset`

```typescript
export async function POST() {
  const supabase = getAdminClient();
  
  // Reset all entities to initial positions
  for (const entity of CLOCKWORK_ENTITIES) {
    await supabase
      .from('stitch_entities')
      .update({
        current_node_id: entity.current_node_id,
        current_edge_id: null,
        edge_progress: null,
      })
      .eq('email', entity.email);
  }
  
  // Reset financial metrics
  await resetFinancialMetrics();
  
  return Response.json({ success: true });
}
```

### 5. System Edge Execution

#### System Edge Trigger

Location: `src/lib/engine/system-edge-trigger.ts`

```typescript
export async function triggerSystemEdges(
  nodeId: string,
  entityId: string
): Promise<void> {
  const supabase = getAdminClient();
  
  // Find all system edges connected to this node
  const { data: flow } = await supabase
    .from('stitch_flows')
    .select('graph')
    .eq('canvas_type', 'bmc')
    .single();
  
  if (!flow) return;
  
  const systemEdges = flow.graph.edges.filter(
    (edge: StitchEdge) => 
      edge.source === nodeId && 
      edge.type === 'system'
  );
  
  // Fire all system edges in parallel
  await Promise.all(
    systemEdges.map(edge => executeSystemEdge(edge, entityId))
  );
}

async function executeSystemEdge(
  edge: StitchEdge,
  entityId: string
): Promise<void> {
  const systemAction = edge.data?.systemAction;
  
  // Broadcast pulse animation
  const supabase = getAdminClient();
  await supabase.channel('system-edges').send({
    type: 'broadcast',
    event: 'edge_fired',
    payload: { edge_id: edge.id },
  });
  
  // Execute the system action
  switch (systemAction) {
    case 'crm_sync':
      await executeCRMSync(entityId);
      break;
    case 'analytics_update':
      await executeAnalyticsUpdate(entityId);
      break;
    case 'slack_notify':
      await executeSlackNotify(entityId);
      break;
    case 'stripe_sync':
      await executeStripeSync(entityId);
      break;
  }
}
```

### 6. Drill-Down Workflows

#### Workflow Structure

Each drillable item node links to a child workflow canvas:

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  parent_id: string;        // Item node ID (e.g., 'item-linkedin-ads')
  canvas_type: 'workflow';
  graph: {
    nodes: StitchNode[];
    edges: StitchEdge[];
  };
}
```

#### Example: Lead Capture Workflow

Location: `src/lib/seeds/workflows/lead-capture.ts`

```typescript
export function createLeadCaptureWorkflow(parentItemId: string) {
  return {
    name: 'Lead Capture Logic',
    parent_id: parentItemId,
    canvas_type: 'workflow',
    graph: {
      nodes: [
        {
          id: 'validate-lead',
          type: 'Worker',
          position: { x: 100, y: 100 },
          data: {
            label: 'Validate Lead',
            workerType: 'data-transform',
            config: {
              validations: ['email', 'company_name'],
            },
          },
        },
        {
          id: 'score-lead',
          type: 'Worker',
          position: { x: 300, y: 100 },
          data: {
            label: 'Score Lead',
            workerType: 'claude',
            config: {
              prompt: 'Analyze lead quality based on: {{input}}',
            },
          },
        },
        {
          id: 'crm-sync',
          type: 'Worker',
          position: { x: 500, y: 100 },
          data: {
            label: 'CRM Sync',
            workerType: 'webhook-trigger',
            config: {
              url: 'https://api.hubspot.com/contacts',
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'validate-lead', target: 'score-lead' },
        { id: 'e2', source: 'score-lead', target: 'crm-sync' },
      ],
    },
  };
}
```

### 7. Financial Metrics System

#### Financial Node Data Structure

```typescript
interface FinancialNodeData extends NodeConfig {
  label: string;
  value: number;           // Current value in cents
  currency: string;        // 'USD'
  format: 'currency' | 'count';
  updateTriggers: string[]; // Node IDs that affect this metric
}
```

#### Financial Update Logic

Location: `src/lib/metrics/financial-updates.ts`

```typescript
export async function updateFinancials(payload: {
  plan?: string;
  amount?: number;
  worker_type?: string;
}): Promise<void> {
  const supabase = getAdminClient();
  
  // Get current BMC
  const { data: bmc } = await supabase
    .from('stitch_flows')
    .select('id, graph')
    .eq('canvas_type', 'bmc')
    .single();
  
  if (!bmc) return;
  
  const graph = bmc.graph;
  
  // Update revenue if subscription
  if (payload.plan && payload.amount) {
    const mrrNode = graph.nodes.find((n: StitchNode) => n.id === 'item-mrr');
    if (mrrNode) {
      mrrNode.data.value = (mrrNode.data.value || 0) + payload.amount;
    }
    
    // Add Stripe fee to costs
    const stripeFeeNode = graph.nodes.find((n: StitchNode) => n.id === 'item-stripe-fees');
    if (stripeFeeNode) {
      const fee = Math.round(payload.amount * 0.029 + 30); // 2.9% + $0.30
      stripeFeeNode.data.value = (stripeFeeNode.data.value || 0) + fee;
    }
  }
  
  // Update costs if worker invoked
  if (payload.worker_type) {
    const costMap: Record<string, number> = {
      'claude': 2,           // $0.02 per call
      'elevenlabs': 5,       // $0.05 per call
      'minimax': 50,         // $0.50 per call
    };
    
    const cost = costMap[payload.worker_type] || 0;
    const workerCostNode = graph.nodes.find(
      (n: StitchNode) => n.id === `item-${payload.worker_type}-cost`
    );
    
    if (workerCostNode) {
      workerCostNode.data.value = (workerCostNode.data.value || 0) + cost;
    }
  }
  
  // Save updated graph
  await supabase
    .from('stitch_flows')
    .update({ graph })
    .eq('id', bmc.id);
}
```

## Data Models

### Database Schema Extensions

#### Edge Type Column

```sql
-- Add type column to edges (stored in graph JSONB)
-- No migration needed - edges are stored in graph.edges array
-- Just ensure seed scripts include type: 'journey' | 'system'
```

#### Entity Email Index

```sql
-- Optimize entity lookups by email
CREATE INDEX IF NOT EXISTS idx_entities_email 
ON stitch_entities(canvas_id, email);
```

### Seed Data Structure

#### Complete BMC Seed

Location: `src/lib/seeds/default-bmc.ts` (updated)

```typescript
const BMC_ITEM_EDGES = [
  // Journey edges (existing)
  { id: 'e-linkedin-demo', source: 'item-linkedin-ads', target: 'item-demo-call', type: 'journey' },
  
  // System edges (new)
  { 
    id: 'sys-linkedin-crm', 
    source: 'item-linkedin-ads', 
    target: 'item-crm', 
    type: 'system',
    data: { systemAction: 'crm_sync' },
  },
  { 
    id: 'sys-linkedin-analytics', 
    source: 'item-linkedin-ads', 
    target: 'item-analytics', 
    type: 'system',
    data: { systemAction: 'analytics_update' },
  },
  // ... more system edges
];
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Avatar URL Monster Seed Matching

*For any* entity with a monster_type in metadata, the avatar_url should contain that monster_type as the seed parameter in the DiceBear URL.

**Validates: Requirements 1.2**

### Property 2: Entity Type Assignment Based on Journey Stage

*For any* entity creation with a specified journey stage (node_id), the assigned entity_type should correctly reflect whether that node represents a lead touchpoint, customer touchpoint, or churn state.

**Validates: Requirements 1.3**

### Property 3: Journey Edge Solid Rendering

*For any* edge with type='journey', the rendered edge should have a solid stroke (no strokeDasharray property).

**Validates: Requirements 3.2**

### Property 4: Entity Movement Database Update

*For any* entity movement operation, the entity's current_node_id in the database should be updated to match the target node.

**Validates: Requirements 3.3**

### Property 5: Journey Event Creation on Arrival

*For any* entity arrival at a node, a journey_event record with type='node_arrival' should be created in the database.

**Validates: Requirements 3.5**

### Property 6: System Edge Parallel Firing

*For any* node completion, all system edges connected to that node should be triggered concurrently (not sequentially).

**Validates: Requirements 4.1**

### Property 7: System Edge Dashed Rendering

*For any* edge with type='system', the rendered edge should have a dashed stroke (strokeDasharray property set).

**Validates: Requirements 4.2**

### Property 8: System Edge Pulse Animation

*For any* system edge fire event, a pulse animation should be triggered on that edge.

**Validates: Requirements 4.3**

### Property 9: System Edge No Entity Movement

*For any* system edge execution, the entity's current_node_id and current_edge_id should remain unchanged.

**Validates: Requirements 4.4**

### Property 10: System Edge Workflow Triggering

*For any* system edge with a systemAction defined, the corresponding production workflow should be executed.

**Validates: Requirements 4.5**

### Property 11: Webhook Source to Node Mapping

*For any* webhook source in WEBHOOK_NODE_MAP, the webhook processor should determine the correct target node_id.

**Validates: Requirements 5.1**

### Property 12: Entity Find or Create by Email

*For any* webhook with an email field, the system should either find an existing entity with that email or create a new one.

**Validates: Requirements 5.2**

### Property 13: Webhook Entity Position Update

*For any* webhook processing, the entity's current_node_id should be updated to the target node determined by the webhook source.

**Validates: Requirements 5.3**

### Property 14: Webhook Journey Event Logging

*For any* webhook processing, a journey_event record should be created.

**Validates: Requirements 5.4**

### Property 15: Webhook System Edge Triggering

*For any* webhook processing that moves an entity to a node, all system edges connected to that node should be triggered.

**Validates: Requirements 5.5**

### Property 16: Subscription Financial Update

*For any* webhook with source starting with 'stripe-subscription', the MRR financial metric should be incremented by the subscription amount.

**Validates: Requirements 5.6**

### Property 17: Webhook Success Response Format

*For any* successful webhook processing, the response should include success=true and the entity_id.

**Validates: Requirements 5.7**

### Property 18: Demo Mode Endpoint Consistency

*For any* demo event, the webhook endpoint used should be identical to the production webhook endpoint (same code path).

**Validates: Requirements 6.4**

### Property 19: Drillable Node Navigation

*For any* item node with a linked workflow (parent_id relationship), clicking the node should navigate to the child workflow canvas.

**Validates: Requirements 7.1**

### Property 20: Workflow Node Rendering

*For any* workflow canvas, all worker nodes defined in the graph should be rendered.

**Validates: Requirements 7.2**

### Property 21: Workflow Parent Linking

*For any* workflow created for a BMC item, the workflow's parent_id should match the item node's id.

**Validates: Requirements 7.3**

### Property 22: Workflow Completion Parent Trigger

*For any* workflow completion, if the workflow has a parent_id, the next step in the parent BMC journey should be triggered.

**Validates: Requirements 7.5**

### Property 23: Analytics Metric Increment

*For any* analytics system edge fire, the corresponding metric value should be incremented.

**Validates: Requirements 8.2**

### Property 24: Stripe Workflow Subscription Operation

*For any* Stripe system edge fire, a subscription create or update operation should occur.

**Validates: Requirements 8.4**

### Property 25: Production Workflow No Entity Movement

*For any* production workflow execution, entity positions (current_node_id, current_edge_id) should remain unchanged.

**Validates: Requirements 8.5**

### Property 26: Subscription MRR Increment

*For any* entity subscription to a plan, the MRR value in the Revenue section should increase by the plan amount.

**Validates: Requirements 9.1**

### Property 27: Worker Invocation Cost Increment

*For any* worker invocation, the corresponding cost value in the Costs section should increase by the worker's cost.

**Validates: Requirements 9.2**

### Property 28: Financial Node Value Display

*For any* financial node, the displayed value should match the node's data.value property.

**Validates: Requirements 9.3**

### Property 29: Subscription Dual Financial Update

*For any* subscription creation, both the revenue (MRR) and cost (Stripe fee) should be updated.

**Validates: Requirements 9.4**

### Property 30: Demo Reset Financial Restoration

*For any* demo reset operation, all financial metric values should be restored to their initial seeded values.

**Validates: Requirements 9.5**

### Property 31: Subscription Webhook Plan Node Mapping

*For any* stripe-subscription webhook, the entity should be moved to the node corresponding to the plan type (basic, pro, or enterprise).

**Validates: Requirements 11.4**

### Property 32: Churn Webhook Entity Type Change

*For any* stripe-churn webhook, the entity's entity_type should be changed to 'churned'.

**Validates: Requirements 11.6**

### Property 33: Parallel Edge Execution

*For any* node completion, journey edges and system edges should fire simultaneously (not blocking each other).

**Validates: Requirements 12.1**

### Property 34: Non-Blocking Entity Movement

*For any* parallel execution, entity movement should complete regardless of system edge completion status.

**Validates: Requirements 12.2**

### Property 35: System Edge Error Isolation

*For any* system edge failure, entity movement should still succeed.

**Validates: Requirements 12.3**

### Property 36: Concurrent System Edge Execution

*For any* multiple system edges firing from the same node, they should execute concurrently (not sequentially).

**Validates: Requirements 12.4**

### Property 37: Edge Execution Logging

*For any* edge execution (journey or system), the execution result should be logged.

**Validates: Requirements 12.5**

### Property 38: Seed Script Idempotency

*For any* seed script execution, running it multiple times should produce the same final database state (no duplicate entities or canvases).

**Validates: Requirements 13.7**

### Property 39: Worker Mock Fallback

*For any* worker invocation without required API keys, the worker should return mock data instead of throwing an error.

**Validates: Requirements 15.1**

### Property 40: Mock Worker Timing Simulation

*For any* worker running in mock mode, a realistic timing delay should be simulated before returning the mock data.

**Validates: Requirements 15.5**

## Error Handling

### Webhook Processing Errors

1. **Invalid Webhook Source**: Return 400 Bad Request with error message
2. **Entity Creation Failure**: Log error, return 500, update webhook_event status to 'failed'
3. **System Edge Failure**: Log error, continue with entity movement (error isolation)
4. **Database Connection Failure**: Return 503 Service Unavailable, retry with exponential backoff

### Demo Orchestrator Errors

1. **Webhook Call Failure**: Log error, continue with remaining demo events
2. **Reset Failure**: Log error, return 500, provide manual reset instructions

### Financial Update Errors

1. **Invalid Plan Type**: Log warning, skip financial update
2. **Node Not Found**: Log warning, skip financial update
3. **Concurrent Update Conflict**: Use optimistic locking, retry update

### Real-Time Synchronization Errors

1. **Supabase Connection Lost**: Show reconnection indicator, attempt reconnect
2. **Broadcast Failure**: Log error, continue (non-critical for demo)

## Testing Strategy

### Unit Testing

Unit tests will cover specific examples and edge cases:

1. **Webhook Node Mapping**: Test each webhook source maps to correct node
2. **Entity Creation**: Test entity creation with and without existing email
3. **Financial Calculations**: Test MRR increment, Stripe fee calculation
4. **Demo Script Timing**: Test event delays are correct
5. **Mock Worker Responses**: Test each worker returns correct mock data

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library). Each test will run a minimum of 100 iterations.

#### Test Configuration

```typescript
import fc from 'fast-check';

// Configure all property tests to run 100+ iterations
const testConfig = { numRuns: 100 };
```

#### Property Test Examples

**Property 1: Avatar URL Monster Seed Matching**
```typescript
fc.assert(
  fc.property(
    fc.constantFrom('frankenstein', 'dracula', 'witch', 'werewolf', 'mummy'),
    (monsterType) => {
      const entity = createEntity({ monster_type: monsterType });
      return entity.avatar_url.includes(`seed=${monsterType}`);
    }
  ),
  testConfig
);
```

**Property 11: Webhook Source to Node Mapping**
```typescript
fc.assert(
  fc.property(
    fc.constantFrom(...Object.keys(WEBHOOK_NODE_MAP)),
    (webhookSource) => {
      const targetNode = mapWebhookSourceToNode(webhookSource);
      return targetNode === WEBHOOK_NODE_MAP[webhookSource];
    }
  ),
  testConfig
);
```

**Property 26: Subscription MRR Increment**
```typescript
fc.assert(
  fc.property(
    fc.integer({ min: 1000, max: 100000 }), // Amount in cents
    async (amount) => {
      const initialMRR = await getFinancialMetric('item-mrr');
      await processSubscription({ amount });
      const finalMRR = await getFinancialMetric('item-mrr');
      return finalMRR === initialMRR + amount;
    }
  ),
  testConfig
);
```

**Property 38: Seed Script Idempotency**
```typescript
fc.assert(
  fc.property(
    fc.integer({ min: 2, max: 5 }), // Run seed script N times
    async (runCount) => {
      for (let i = 0; i < runCount; i++) {
        await seedClockworkCanvas();
      }
      const entityCount = await countEntities();
      const canvasCount = await countCanvases();
      return entityCount === 13 && canvasCount === 1;
    }
  ),
  testConfig
);
```

### Integration Testing

Integration tests will verify component interactions:

1. **Webhook to Entity Movement**: Send webhook, verify entity moves
2. **System Edge Triggering**: Complete node, verify system edges fire
3. **Demo Orchestrator Flow**: Start demo, verify all events execute
4. **Financial Update Chain**: Subscribe entity, verify both revenue and cost update
5. **Drill-Down Navigation**: Click item node, verify workflow canvas loads

### Visual Testing

Visual tests will verify UI rendering:

1. **Edge Styling**: Verify journey edges are solid, system edges are dashed
2. **Entity Avatars**: Verify DiceBear avatars render correctly
3. **Financial Display**: Verify currency formatting
4. **Demo Control Panel**: Verify button states and positioning

### End-to-End Testing

E2E tests will verify complete user flows:

1. **Complete Demo Flow**: Play demo, verify all entities move correctly
2. **Manual Webhook Injection**: Send webhook via UI, verify entity appears
3. **Drill-Down and Return**: Navigate to workflow, verify return to BMC
4. **Multi-Client Sync**: Open two browsers, verify realtime sync

## Implementation Notes

### Phase 1: Foundation (Seed Data)

1. Update `default-bmc.ts` to include all item nodes and system edges
2. Create `clockwork-entities.ts` with 13 Halloween entities
3. Create seed script that combines BMC + entities

### Phase 2: Webhook Layer

1. Create dynamic webhook route handler
2. Implement webhook node mapper
3. Implement entity find-or-create logic
4. Implement system edge trigger

### Phase 3: Demo Orchestrator

1. Create demo script with timed events
2. Create demo start/reset API endpoints
3. Create Demo Control Panel component
4. Integrate panel into BMC Canvas

### Phase 4: System Edges

1. Create SystemEdge component with dashed styling
2. Add pulse animation CSS
3. Implement system edge execution logic
4. Add system edges to BMC seed data

### Phase 5: Drill-Down Workflows

1. Create workflow seed files (lead-capture, demo-scheduling, etc.)
2. Link workflows to parent item nodes
3. Verify drill-down navigation works

### Phase 6: Financial Metrics

1. Add financial nodes to BMC seed
2. Implement financial update logic
3. Add value display to financial nodes
4. Connect financial updates to webhook processing

### Phase 7: Testing & Polish

1. Write property-based tests for core properties
2. Write integration tests for webhook flow
3. Test demo orchestrator end-to-end
4. Polish UI animations and styling

## Dependencies

### External Libraries

- **fast-check**: Property-based testing library
- **@xyflow/react**: Canvas rendering (existing)
- **@supabase/supabase-js**: Database and realtime (existing)
- **dicebear**: Avatar generation API (existing)

### Internal Dependencies

- Existing webhook system (`src/lib/webhooks/`)
- Existing entity tracking (`src/lib/db/entities.ts`)
- Existing edge-walker (`src/lib/engine/edge-walker.ts`)
- Existing worker registry (`src/lib/workers/`)

### Environment Variables

- `NEXT_PUBLIC_BASE_URL`: Base URL for webhook callbacks
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- Worker API keys (optional, fallback to mocks):
  - `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY`
  - `MINIMAX_API_KEY`
  - `SHOTSTACK_API_KEY`

## Performance Considerations

### Database Queries

1. **Entity Lookup by Email**: Add index on `(canvas_id, email)`
2. **Journey Event Insertion**: Use batch inserts for multiple events
3. **Financial Updates**: Use optimistic locking to prevent race conditions

### Real-Time Synchronization

1. **Broadcast Throttling**: Limit system edge pulse broadcasts to 1 per second per edge
2. **Entity Position Updates**: Debounce position updates during animation
3. **Financial Metric Updates**: Batch updates and broadcast once per second

### Demo Orchestrator

1. **Webhook Calls**: Use Promise.all for parallel webhook calls when possible
2. **Timing Precision**: Use setTimeout for event scheduling (acceptable for demo)
3. **Reset Performance**: Use bulk updates for entity position reset

## Security Considerations

### Webhook Endpoints

1. **Rate Limiting**: Implement rate limiting on webhook endpoints (100 req/min per IP)
2. **Signature Validation**: Validate webhook signatures when provided
3. **Input Sanitization**: Sanitize all webhook payload fields before database insertion

### Demo Orchestrator

1. **Public Access**: Demo endpoints are public (no authentication required)
2. **Abuse Prevention**: Rate limit demo start endpoint (1 req/min per IP)
3. **Resource Limits**: Limit demo script to 20 events maximum

### Entity Data

1. **Email Privacy**: Hash emails in logs, display only in admin views
2. **Metadata Sanitization**: Sanitize metadata fields to prevent XSS
3. **Avatar URLs**: Validate DiceBear URLs before storage

## Monitoring and Observability

### Metrics to Track

1. **Webhook Processing Time**: P50, P95, P99 latency
2. **Entity Movement Success Rate**: Percentage of successful movements
3. **System Edge Execution Rate**: Number of system edges fired per minute
4. **Demo Completion Rate**: Percentage of demos that complete successfully
5. **Financial Update Accuracy**: Verify MRR calculations match expected values

### Logging

1. **Webhook Events**: Log all webhook receipts with source and entity_id
2. **System Edge Fires**: Log all system edge executions with timing
3. **Entity Movements**: Log all entity position changes
4. **Financial Updates**: Log all MRR and cost changes with amounts
5. **Demo Events**: Log demo start, reset, and completion

### Alerts

1. **Webhook Failure Rate > 5%**: Alert on-call engineer
2. **Entity Movement Failure**: Alert if entity stuck for > 5 minutes
3. **Financial Calculation Error**: Alert if MRR goes negative
4. **Demo Orchestrator Failure**: Alert if demo fails to start

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Custom Demo Scripts**: Allow users to create custom demo sequences
2. **Entity Filtering**: Filter entities by type, source, or journey stage
3. **Financial Forecasting**: Project future MRR based on current trends
4. **Workflow Templates**: Pre-built workflow templates for common patterns
5. **Multi-Canvas Support**: Support multiple BMC canvases with different configurations

### Advanced Features

1. **A/B Testing**: Compare different journey paths and conversion rates
2. **Cohort Analysis**: Track entity cohorts through the journey
3. **Predictive Analytics**: ML-based lead scoring and churn prediction
4. **External Integrations**: Real Stripe, HubSpot, Slack integrations
5. **Mobile Support**: Responsive canvas for mobile devices
