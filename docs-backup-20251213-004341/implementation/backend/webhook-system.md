# Webhook System

## Overview

The webhook system enables external services to trigger Stitch workflows and create entities by sending HTTP POST requests to configured endpoints. It provides a complete integration pipeline from webhook receipt to workflow execution, with support for signature verification, entity extraction, and visual journey tracking.

**Key Capabilities:**
- Receive webhooks from multiple sources (Stripe, Typeform, Calendly, n8n, custom)
- Verify webhook signatures using source-specific validation
- Extract entity data using adapters or JSONPath mapping
- Create/update entities in the database
- Place entities on visual journey paths
- Trigger workflow execution automatically
- Audit all webhook events

## Architecture

### Component Overview

```
External Service → Webhook API → Processor → Adapter → Entity Creation → Workflow Execution
                                     ↓
                              Webhook Event Log
```

**Core Components:**

1. **Webhook API Endpoint** (`/api/webhooks/[endpoint_slug]`)
   - HTTP entry point for webhook requests
   - Extracts raw body and signature
   - Routes to processor

2. **Webhook Processor** (`processor.ts`)
   - Orchestrates the complete webhook processing flow
   - Coordinates all steps from validation to execution
   - Ensures database persistence at each stage

3. **Adapter System** (`adapters/`)
   - Source-specific signature verification
   - Source-specific entity extraction
   - Fallback to generic JSONPath mapping

4. **Entity Mapper** (`entity-mapper.ts`)
   - Transforms webhook payloads to entity data
   - Uses JSONPath expressions for field extraction
   - Validates required fields

5. **Signature Validator** (`signature.ts`)
   - Generic HMAC-SHA256 signature verification
   - Timing-safe comparison to prevent attacks
   - Used by generic adapter

6. **JSON Path Extractor** (`json-path.ts`)
   - Extracts values from nested JSON structures
   - Supports property access, array indices, static values
   - Used by entity mapper

## Webhook Processing Flow

### Complete Processing Pipeline

The webhook processor orchestrates a 10-step pipeline:

```
1. Look up webhook configuration by endpoint_slug
2. Create webhook event record (status: 'pending')
3. Check if webhook is active
4. Validate signature using adapter
5. Extract entity data using adapter
6. Update webhook event (status: 'processing')
7. Create or update entity in database
8. Place entity on entry edge (visual journey)
9. Create workflow run with trigger metadata
10. Fire entry node to start execution
11. Update webhook event (status: 'completed')
```

### Step-by-Step Breakdown

#### Step 1: Configuration Lookup

```typescript
const webhookConfig = await getWebhookConfigBySlugAdmin(endpointSlug);
```

Retrieves the webhook configuration from `stitch_webhook_configs` table using the endpoint slug from the URL.

**Configuration includes:**
- `source`: Webhook source identifier (stripe, typeform, etc.)
- `secret`: Secret for signature verification
- `workflow_id`: Target workflow to execute
- `entry_edge_id`: Edge where entity journey begins
- `entity_mapping`: JSONPath mapping for entity extraction
- `is_active`: Whether webhook is enabled

#### Step 2: Event Logging

```typescript
const webhookEvent = await createWebhookEvent({
  webhook_config_id: webhookConfig.id,
  payload,
  status: 'pending',
  // ...
});
```

Creates an audit record in `stitch_webhook_events` table BEFORE validation. This ensures all webhook attempts are logged, even failures.

#### Step 3: Active Check

```typescript
if (!webhookConfig.is_active) {
  throw new Error(`Webhook endpoint is inactive: ${endpointSlug}`);
}
```

Validates that the webhook endpoint is enabled before processing.

#### Step 4-5: Adapter Processing

```typescript
const entityData = await processAdapterLogic(
  webhookConfig,
  rawBody,
  payload,
  headers
);
```

Delegates to the adapter system for:
1. **Signature Verification**: Uses source-specific validation logic
2. **Entity Extraction**: Extracts entity data from payload structure

See [Adapter System](#adapter-system) section for details.

#### Step 6: Status Update

```typescript
await updateWebhookEvent(webhookEventId, {
  status: 'processing',
});
```

Updates the webhook event status to indicate active processing.

#### Step 7: Entity Creation/Update

```typescript
// Check for existing entity by email
const { data: existingEntity } = await supabase
  .from('stitch_entities')
  .select('*')
  .eq('canvas_id', webhookConfig.canvas_id)
  .eq('email', entityData.email)
  .single();

if (existingEntity) {
  // Update existing entity
  entity = await updateEntity(existingEntity.id, entityData);
} else {
  // Create new entity
  entity = await createEntity(entityData);
}
```

Creates a new entity or updates an existing one (matched by email). This ensures entities are deduplicated within a canvas.

#### Step 8: Visual Journey Placement

```typescript
if (webhookConfig.entry_edge_id) {
  await startJourney(entity.id, webhookConfig.entry_edge_id);
}
```

Places the entity on the entry edge for visual journey tracking. This creates the "travelling" animation effect before workflow execution begins.

#### Step 9: Workflow Run Creation

```typescript
const triggerMetadata: TriggerMetadata = {
  type: 'webhook',
  source: webhookConfig.source,
  event_id: webhookEventId,
  timestamp: new Date().toISOString(),
};

const workflowRun = await createRunAdmin(webhookConfig.workflow_id, {
  entity_id: entity.id,
  trigger: triggerMetadata,
});
```

Creates a workflow run record with trigger metadata linking back to the webhook event.

#### Step 10: Execution Start

```typescript
// Find the entry edge
const entryEdge = flow.graph.edges.find(e => e.id === webhookConfig.entry_edge_id);

// Fire the target node of the entry edge
await fireNode(entryEdge.target, flow, workflowRun);
```

Starts workflow execution by firing the target node of the entry edge. This triggers the edge-walking execution model.

#### Step 11: Completion

```typescript
await updateWebhookEvent(webhookEventId, {
  status: 'completed',
  entity_id: entity.id,
  workflow_run_id: workflowRun.id,
});
```

Updates the webhook event with final status and links to created entity and workflow run.

### Error Handling

All errors are caught and logged:

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  await updateWebhookEvent(webhookEventId, {
    status: 'failed',
    error: errorMessage,
  });
  
  return {
    success: false,
    webhookEventId,
    error: errorMessage,
  };
}
```

Failed webhooks are marked with `status: 'failed'` and include error details for debugging.

## Adapter System

### Adapter Interface

All adapters implement the `WebhookAdapter` interface:

```typescript
interface WebhookAdapter {
  source: string;
  
  verifySignature(
    rawBody: string,
    headers: Headers,
    secret: string | null
  ): Promise<boolean> | boolean;
  
  extractEntity(
    payload: any,
    config: WebhookConfig
  ): ExtractedEntity;
  
  getEventType(payload: any): string;
}
```

### Available Adapters

#### 1. Stripe Adapter

**Signature Format:** `Stripe-Signature: t=timestamp,v1=signature`

**Verification:**
```typescript
// Reconstruct signed payload: timestamp.rawBody
const signedPayload = `${timestamp}.${rawBody}`;
const computed = HMAC-SHA256(signedPayload, secret);
```

**Entity Extraction:**
```typescript
{
  email: payload.data.object.customer_details.email,
  name: payload.data.object.customer_details.name,
  entity_type: 'customer',
  metadata: {
    stripe_customer_id: payload.data.object.customer,
    payment_status: payload.data.object.payment_status,
    amount: payload.data.object.amount_total / 100
  }
}
```

#### 2. Typeform Adapter

**Signature Format:** `Typeform-Signature: sha256=signature`

**Entity Extraction:**
```typescript
{
  email: answers.find(a => a.type === 'email').email,
  name: answers.find(a => a.type === 'text' && a.field.ref === 'name').text,
  entity_type: 'lead'
}
```

#### 3. Calendly Adapter

**Signature Format:** `Calendly-Webhook-Signature: signature`

**Entity Extraction:**
```typescript
{
  email: payload.payload.invitee.email,
  name: payload.payload.invitee.name,
  entity_type: 'lead',
  metadata: {
    event_type: payload.payload.event_type.name,
    scheduled_at: payload.payload.scheduled_event.start_time
  }
}
```

#### 4. n8n Adapter

**Signature Format:** `x-webhook-secret: secret`

**Verification:** Direct secret comparison (not HMAC)

**Entity Extraction:** Uses generic JSONPath mapping

#### 5. Generic Adapter

**Signature Format:** `X-Webhook-Signature: signature`

**Verification:** HMAC-SHA256 with timing-safe comparison

**Entity Extraction:** Uses JSONPath mapping from webhook config

### Adapter Selection Logic

```typescript
export function getAdapter(source: string): WebhookAdapter {
  return adapters[source] || genericAdapter;
}
```

The adapter registry maps source identifiers to adapters. Unknown sources fall back to the generic adapter.

### Fallback Mechanism

If an adapter returns incomplete entity data, the system falls back to generic JSONPath mapping:

```typescript
if (!entityData.name || !entityData.email || !entityData.entity_type) {
  const genericData = genericAdapter.extractEntity(payload, config);
  return {
    ...entityData,
    name: entityData.name || genericData.name,
    email: entityData.email || genericData.email,
    entity_type: entityData.entity_type || genericData.entity_type,
    metadata: { ...genericData.metadata, ...entityData.metadata }
  };
}
```

This ensures entity extraction always succeeds if the webhook config has valid JSONPath mappings.

## Entity Mapping

### JSONPath Extraction

The entity mapper uses JSONPath expressions to extract fields from webhook payloads:

```typescript
interface EntityMapping {
  name: string;           // JSONPath to name field
  email?: string;         // JSONPath to email field (optional)
  entity_type: string;    // JSONPath or static value for entity type
  avatar_url?: string;    // JSONPath to avatar URL (optional)
  metadata?: Record<string, string>; // Map of metadata fields to JSONPaths
}
```

### JSONPath Syntax

**Property Access:**
```typescript
"$.customer.name"  // Accesses payload.customer.name
```

**Nested Properties:**
```typescript
"$.data.object.email"  // Accesses payload.data.object.email
```

**Array Indices:**
```typescript
"$.items[0].name"  // Accesses payload.items[0].name
```

**Static Values:**
```typescript
"customer"  // Returns the literal string "customer"
```

### Example Mapping

**Webhook Config:**
```json
{
  "entity_mapping": {
    "name": "$.customer.name",
    "email": "$.customer.email",
    "entity_type": "customer",
    "metadata": {
      "plan": "$.subscription.plan",
      "amount": "$.subscription.amount"
    }
  }
}
```

**Webhook Payload:**
```json
{
  "customer": {
    "name": "Alice",
    "email": "alice@example.com"
  },
  "subscription": {
    "plan": "pro",
    "amount": 99
  }
}
```

**Extracted Entity:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "entity_type": "customer",
  "metadata": {
    "plan": "pro",
    "amount": 99
  }
}
```

## Signature Verification

### Generic HMAC-SHA256 Validation

The generic signature validator uses HMAC-SHA256 with timing-safe comparison:

```typescript
export function validateSignature(
  rawBody: string,
  signature: string | undefined | null,
  secret: string | undefined | null
): boolean {
  // No secret configured = no validation required
  if (!secret) return true;
  
  // Secret configured but no signature = validation fails
  if (!signature) return false;
  
  // Compute HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const computedSignature = hmac.digest('hex');
  
  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}
```

### Why Raw Body?

Signature verification MUST use the raw request body string, not the parsed JSON object. This is because:

1. **Key Order:** `JSON.stringify()` cannot guarantee key order
2. **Whitespace:** Formatting differences break HMAC verification
3. **Precision:** Number precision may differ after parsing

The webhook API endpoint preserves the raw body:

```typescript
const rawBody = await request.text();
const payload = JSON.parse(rawBody);
```

### Source-Specific Verification

Each adapter implements its own signature verification logic:

- **Stripe:** Reconstructs `timestamp.rawBody` and verifies HMAC
- **Typeform:** Verifies `sha256=signature` format
- **Calendly:** Verifies signature header
- **n8n:** Direct secret comparison (not HMAC)
- **Generic:** HMAC-SHA256 with `X-Webhook-Signature` header

## Database Schema

### stitch_webhook_configs

Stores webhook endpoint configurations:

```sql
CREATE TABLE stitch_webhook_configs (
  id UUID PRIMARY KEY,
  canvas_id UUID REFERENCES stitch_canvases(id),
  name TEXT NOT NULL,
  source TEXT NOT NULL,  -- 'stripe', 'typeform', 'calendly', 'n8n', 'custom'
  endpoint_slug TEXT UNIQUE NOT NULL,
  secret TEXT,
  workflow_id UUID REFERENCES stitch_flows(id),
  entry_edge_id TEXT NOT NULL,
  entity_mapping JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### stitch_webhook_events

Audit log for all webhook requests:

```sql
CREATE TABLE stitch_webhook_events (
  id UUID PRIMARY KEY,
  webhook_config_id UUID REFERENCES stitch_webhook_configs(id),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  entity_id UUID REFERENCES stitch_entities(id),
  workflow_run_id UUID REFERENCES stitch_runs(id),
  status TEXT NOT NULL,  -- 'pending', 'processing', 'completed', 'failed'
  error TEXT,
  processed_at TIMESTAMPTZ
);
```

## API Endpoint

### POST /api/webhooks/[endpoint_slug]

Receives webhook requests from external services.

**Request:**
```http
POST /api/webhooks/my-stripe-webhook HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: abc123...

{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "customer_details": {
        "email": "alice@example.com",
        "name": "Alice"
      }
    }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "webhookEventId": "evt_123",
  "entityId": "ent_456",
  "workflowRunId": "run_789"
}
```

**Error Responses:**

- **400 Bad Request:** Invalid JSON payload
- **401 Unauthorized:** Invalid signature
- **404 Not Found:** Endpoint slug not found or inactive
- **500 Internal Server Error:** Processing error

## Integration with Execution Engine

### Workflow Triggering

After entity creation, the webhook processor triggers workflow execution:

```typescript
// Find the entry edge
const entryEdge = flow.graph.edges.find(e => e.id === webhookConfig.entry_edge_id);

// Fire the target node
await fireNode(entryEdge.target, flow, workflowRun);
```

This starts the edge-walking execution model, which:
1. Fires the entry node
2. Waits for node completion
3. Walks outgoing edges
4. Fires downstream nodes
5. Continues until workflow completes

### Trigger Metadata

Workflow runs include trigger metadata linking back to the webhook:

```typescript
interface TriggerMetadata {
  type: 'webhook';
  source: string;        // 'stripe', 'typeform', etc.
  event_id: string;      // webhook_event.id
  timestamp: string;     // ISO 8601 timestamp
}
```

This enables tracing workflow runs back to their originating webhook events.

## Visual Journey Integration

### Entry Edge Placement

Before workflow execution, entities are placed on the entry edge:

```typescript
await startJourney(entity.id, webhookConfig.entry_edge_id);
```

This creates a journey event in `stitch_journey_events` table:

```typescript
{
  entity_id: entity.id,
  edge_id: webhookConfig.entry_edge_id,
  started_at: NOW(),
  completed_at: null,
  status: 'travelling'
}
```

### Journey Animation

The UI subscribes to journey events and animates entities travelling along edges:

1. Entity appears on entry edge
2. Animates towards target node
3. Arrives at node when workflow execution starts
4. Continues through workflow as nodes complete

See [Entity Visualization](../frontend/entity-visualization.md) for details.

## Configuration Example

### Creating a Stripe Webhook

```typescript
const webhookConfig = {
  canvas_id: 'canvas_123',
  name: 'Stripe Checkout Completed',
  source: 'stripe',
  endpoint_slug: 'stripe-checkout',
  secret: 'whsec_abc123...',
  workflow_id: 'workflow_456',
  entry_edge_id: 'edge_789',
  entity_mapping: {
    name: '$.data.object.customer_details.name',
    email: '$.data.object.customer_details.email',
    entity_type: 'customer',
    metadata: {
      stripe_customer_id: '$.data.object.customer',
      amount: '$.data.object.amount_total'
    }
  },
  is_active: true
};
```

### Webhook URL

```
https://your-domain.com/api/webhooks/stripe-checkout
```

Configure this URL in Stripe's webhook settings.

## Testing

### Manual Testing

Use curl to test webhook endpoints:

```bash
curl -X POST https://your-domain.com/api/webhooks/test-endpoint \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: your-signature" \
  -d '{
    "customer": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }'
```

### Signature Generation

Generate test signatures using Node.js:

```javascript
const crypto = require('crypto');

const rawBody = JSON.stringify(payload);
const secret = 'your-webhook-secret';

const hmac = crypto.createHmac('sha256', secret);
hmac.update(rawBody);
const signature = hmac.digest('hex');

console.log('X-Webhook-Signature:', signature);
```

### Webhook Event Inspection

Query webhook events to debug issues:

```sql
SELECT 
  we.id,
  we.status,
  we.error,
  we.payload,
  wc.name as webhook_name,
  wc.source
FROM stitch_webhook_events we
JOIN stitch_webhook_configs wc ON we.webhook_config_id = wc.id
WHERE we.status = 'failed'
ORDER BY we.received_at DESC
LIMIT 10;
```

## Best Practices

### Security

1. **Always use secrets** for production webhooks
2. **Validate signatures** before processing
3. **Use HTTPS** for webhook URLs
4. **Rotate secrets** periodically
5. **Log all webhook attempts** for audit trail

### Reliability

1. **Idempotent processing:** Handle duplicate webhooks gracefully
2. **Error logging:** Capture detailed error information
3. **Retry logic:** External services may retry failed webhooks
4. **Status tracking:** Use webhook event status for monitoring

### Performance

1. **Async execution:** Webhook processing returns quickly
2. **Database persistence:** All state saved immediately
3. **Background processing:** Workflow execution happens asynchronously
4. **Minimal validation:** Only validate what's necessary

## Common Issues

### Invalid Signature

**Symptom:** 401 Unauthorized responses

**Causes:**
- Incorrect secret configured
- Using parsed JSON instead of raw body
- Signature header name mismatch
- Clock skew (for timestamp-based signatures)

**Solution:**
- Verify secret matches external service
- Ensure raw body is used for HMAC
- Check signature header name for source
- Use timing-safe comparison

### Entity Not Created

**Symptom:** Webhook succeeds but no entity appears

**Causes:**
- Invalid JSONPath expressions
- Required fields missing from payload
- Entity mapping misconfigured

**Solution:**
- Test JSONPath expressions with sample payload
- Check webhook event payload in database
- Verify entity_mapping configuration

### Workflow Not Triggered

**Symptom:** Entity created but workflow doesn't run

**Causes:**
- Invalid entry_edge_id
- Workflow not found
- Entry edge target node missing

**Solution:**
- Verify entry_edge_id exists in workflow graph
- Check workflow_id is correct
- Ensure entry edge has valid target node

## Related Documentation

- [Execution Engine](./execution-engine.md) - Workflow execution after webhook trigger
- [Database Layer](./database-layer.md) - Database operations for webhooks and entities
- [Entity Visualization](../frontend/entity-visualization.md) - Visual journey tracking
- [API Documentation](../api/webhook-api.md) - Complete API reference

## File Locations

```
src/lib/webhooks/
├── processor.ts           # Main orchestration
├── entity-mapper.ts       # JSONPath entity extraction
├── signature.ts           # Generic HMAC validation
├── json-path.ts          # JSONPath parser
└── adapters/
    ├── index.ts          # Adapter registry
    ├── types.ts          # Adapter interface
    ├── generic.ts        # Generic adapter
    ├── stripe.ts         # Stripe adapter
    ├── typeform.ts       # Typeform adapter
    ├── calendly.ts       # Calendly adapter
    └── n8n.ts            # n8n adapter

src/app/api/webhooks/
└── [endpoint_slug]/
    └── route.ts          # HTTP endpoint

src/lib/db/
├── webhook-configs.ts    # Webhook config CRUD
└── webhook-events.ts     # Webhook event CRUD
```
