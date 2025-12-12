# Design Document: Webhook Database & Types

## Overview

The webhook system extends Stitch to accept external HTTP requests that trigger workflow executions. This design introduces two new database tables (`stitch_webhook_configs` and `stitch_webhook_events`), extends existing tables (`stitch_runs`), and defines comprehensive TypeScript types to support webhook-driven workflow orchestration.

The system follows Stitch's core principles:
- **Database as Source of Truth**: All webhook configurations and events are persisted in Supabase
- **Event-Driven Architecture**: Webhook requests trigger workflow runs through the existing edge-walking execution model
- **Entity-Centric Design**: Webhooks create or update entities that travel through the canvas
- **Async Worker Pattern**: Webhook processing follows the same async pattern as worker nodes

## Architecture

### High-Level Flow

```
External Service → POST /api/webhooks/{endpoint_slug}
                ↓
         Validate Secret
                ↓
         Log Event (stitch_webhook_events)
                ↓
         Map Payload → Entity Data
                ↓
         Create/Update Entity (stitch_entities)
                ↓
         Create Workflow Run (stitch_runs)
                ↓
         Start Execution at Entry Edge
```

### Database Schema Architecture

The webhook system introduces three key database changes:

1. **stitch_webhook_configs**: Stores webhook endpoint configurations
   - Links to canvas and workflow
   - Defines entity mapping rules
   - Stores authentication secrets

2. **stitch_webhook_events**: Audit log for all webhook requests
   - Captures complete payload
   - Links to created entities and workflow runs
   - Tracks processing status

3. **stitch_runs extensions**: Adds trigger tracking
   - Links runs to entities
   - Records trigger source metadata

### Integration with Existing System

The webhook system integrates with existing Stitch components:

- **Entity System**: Webhooks create entities that use existing position tracking (current_node_id, current_edge_id, edge_progress)
- **Execution Engine**: Webhook-triggered runs use the same edge-walking execution model
- **Worker Nodes**: Extended with entity movement configuration (onSuccess, onFailure)
- **Journey Events**: Entity movements from webhook runs are tracked in stitch_journey_events

## Components and Interfaces

### Webhook Adapter System

The webhook adapter system provides source-specific handling for different webhook providers. Each adapter implements a common interface and knows how to:

1. **Verify signatures** using the provider's specific format
2. **Extract entity data** from the provider's payload structure
3. **Identify event types** from the provider's event naming

#### Adapter Interface

```typescript
export interface ExtractedEntity {
  name?: string;
  email?: string;
  avatar_url?: string;
  metadata: Record<string, any>;
}

export interface WebhookAdapter {
  source: string;
  
  /**
   * Verifies the webhook signature.
   * @param rawBody Raw string body (for HMAC)
   * @param headers Request headers
   * @param secret Configured secret
   */
  verifySignature(
    rawBody: string, 
    headers: Headers, 
    secret: string | null
  ): Promise<boolean> | boolean;
  
  /**
   * Extracts entity data from the source-specific payload.
   */
  extractEntity(
    payload: any, 
    config: WebhookConfig
  ): ExtractedEntity;
  
  /**
   * Identifies the event type (e.g. 'checkout.session.completed').
   */
  getEventType(payload: any): string;
}
```

#### Supported Adapters

**Stripe Adapter**
- Signature: Parses `Stripe-Signature` header (format: `t=timestamp,v1=signature`)
- Verification: HMAC-SHA256 with timestamp validation
- Entity extraction: Extracts from `data.object.customer_details` or `data.object.customer_email`
- Metadata: Includes `stripe_customer_id`, `payment_status`, `amount`, `currency`

**Typeform Adapter**
- Signature: Parses `Typeform-Signature` header (format: `sha256=signature`)
- Verification: HMAC-SHA256 with base64 encoding
- Entity extraction: Searches `form_response.answers` for email and name fields
- Metadata: Includes `form_id`, `submitted_at`

**Calendly Adapter**
- Signature: Parses `Calendly-Webhook-Signature` header (format: `t=timestamp,v1=signature`)
- Verification: HMAC-SHA256 with timestamp validation
- Entity extraction: Extracts from `payload.invitee` object
- Metadata: Includes `event_type`, `meeting_name`, `start_time`, `join_url`

**n8n Adapter**
- Signature: Checks `x-webhook-secret` or `x-auth-token` header
- Verification: Simple string token comparison
- Entity extraction: Uses generic JSONPath mapping (n8n payloads are dynamic)
- Metadata: Includes `execution_id` if present

**Generic Adapter**
- Signature: Uses generic HMAC-SHA256 validation with `X-Webhook-Signature` header
- Verification: Standard HMAC comparison
- Entity extraction: Uses JSONPath mapping from webhook config
- Metadata: Includes all mapped fields
- Fallback: Used for custom webhooks and unknown sources

#### Adapter Registry

```typescript
const adapters: Record<string, WebhookAdapter> = {
  'stripe': stripeAdapter,
  'typeform': typeformAdapter,
  'calendly': calendlyAdapter,
  'n8n': n8nAdapter,
  'linkedin': genericAdapter,
  'custom': genericAdapter,
  'manual': genericAdapter
};

export function getAdapter(source: string): WebhookAdapter {
  return adapters[source] || genericAdapter;
}
```

#### Adapter Processing Flow

```typescript
export async function processAdapterLogic(
  config: WebhookConfig,
  rawBody: string,
  payload: any,
  headers: Headers
) {
  const adapter = getAdapter(config.source);
  
  // 1. Verify signature
  const isValid = await adapter.verifySignature(rawBody, headers, config.secret || null);
  if (!isValid) throw new Error(`Invalid signature for ${config.source}`);
  
  // 2. Extract entity data
  const entityData = adapter.extractEntity(payload, config);
  
  // 3. Fallback to generic mapping if needed
  if (!entityData.name || !entityData.email) {
    const genericData = genericAdapter.extractEntity(payload, config);
    return {
      ...entityData,
      name: entityData.name || genericData.name,
      email: entityData.email || genericData.email,
      metadata: { ...genericData.metadata, ...entityData.metadata }
    };
  }
  
  return entityData;
}
```

### Database Tables

#### stitch_webhook_configs

```sql
CREATE TABLE stitch_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  endpoint_slug TEXT NOT NULL UNIQUE,
  secret TEXT,
  workflow_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  entry_edge_id TEXT NOT NULL,
  entity_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Field Descriptions:**
- `id`: Unique identifier for the webhook configuration
- `canvas_id`: Reference to the BMC canvas this webhook belongs to
- `name`: Human-readable name (e.g., "Stripe Payment Webhook")
- `source`: External service name (e.g., "stripe", "hubspot", "custom")
- `endpoint_slug`: URL-safe unique identifier used in webhook URL (e.g., "stripe-payment-success")
- `secret`: Optional secret for HMAC signature validation
- `workflow_id`: Reference to the workflow that should be executed
- `entry_edge_id`: The edge ID where execution should start
- `entity_mapping`: JSONB object defining how to map webhook payload to entity fields
- `is_active`: Whether this webhook is currently accepting requests

**Entity Mapping Structure:**
```typescript
{
  "name": "$.customer.name",           // JSON path to extract name
  "email": "$.customer.email",         // JSON path to extract email
  "entity_type": "customer",           // Static value or JSON path
  "metadata": {                        // Additional fields to store
    "plan": "$.subscription.plan",
    "amount": "$.amount_paid"
  }
}
```

#### stitch_webhook_events

```sql
CREATE TABLE stitch_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES stitch_webhook_configs(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  entity_id UUID REFERENCES stitch_entities(id) ON DELETE SET NULL,
  workflow_run_id UUID REFERENCES stitch_runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  processed_at TIMESTAMPTZ
);
```

**Field Descriptions:**
- `id`: Unique identifier for the event
- `webhook_config_id`: Reference to the webhook configuration
- `received_at`: Timestamp when request was received
- `payload`: Complete webhook payload as JSONB
- `entity_id`: Reference to created/updated entity (nullable for failed processing)
- `workflow_run_id`: Reference to created workflow run (nullable for failed processing)
- `status`: Processing status ('pending', 'processing', 'completed', 'failed')
- `error`: Error message if processing failed
- `processed_at`: Timestamp when processing completed

#### stitch_runs extensions

```sql
ALTER TABLE stitch_runs 
ADD COLUMN entity_id UUID REFERENCES stitch_entities(id) ON DELETE SET NULL;

ALTER TABLE stitch_runs 
ADD COLUMN trigger JSONB NOT NULL DEFAULT '{}'::jsonb;
```

**Trigger Structure:**
```typescript
{
  "type": "webhook" | "manual" | "scheduled" | "entity_arrival",
  "source": "stripe" | "hubspot" | "manual" | null,
  "event_id": "uuid-of-webhook-event" | null,
  "timestamp": "2024-12-03T10:30:00Z"
}
```

### API Endpoints

#### POST /api/webhooks/[endpoint_slug]

Receives webhook requests from external services.

**Request Headers:**
- `X-Webhook-Signature`: Optional HMAC signature for validation
- `Content-Type`: application/json

**Request Body:**
- Any valid JSON payload (structure defined by external service)

**Response:**
- `200 OK`: Webhook accepted and queued for processing
- `401 Unauthorized`: Invalid signature
- `404 Not Found`: Endpoint slug not found
- `500 Internal Server Error`: Processing error

**Processing Flow:**
1. Look up webhook config by endpoint_slug
2. Validate signature if secret is configured
3. Create webhook event record (status: 'pending')
4. Extract entity data using entity_mapping
5. Create or update entity in stitch_entities
6. Create workflow run with trigger metadata
7. Start execution at entry_edge_id
8. Update webhook event (status: 'completed', link entity_id and workflow_run_id)

## Data Models

### TypeScript Types

#### WebhookConfig

```typescript
export interface WebhookConfig {
  id: string;
  canvas_id: string;
  name: string;
  source: string;
  endpoint_slug: string;
  secret: string | null;
  workflow_id: string;
  entry_edge_id: string;
  entity_mapping: EntityMapping;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntityMapping {
  name: string;              // JSON path or static value
  email?: string;            // JSON path or static value
  entity_type: string;       // JSON path or static value
  avatar_url?: string;       // JSON path or static value
  metadata?: Record<string, string>; // Map of field name to JSON path
}
```

#### WebhookEvent

```typescript
export interface WebhookEvent {
  id: string;
  webhook_config_id: string;
  received_at: string;
  payload: Record<string, any>;
  entity_id: string | null;
  workflow_run_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  processed_at: string | null;
}
```

#### StitchRun (Extended)

```typescript
export interface StitchRun {
  id: string;
  flow_id: string;
  entity_id: string | null;  // NEW: Link to entity
  node_states: Record<string, NodeState>;
  trigger: TriggerMetadata;  // NEW: Trigger information
  created_at: string;
  updated_at: string;
}

export interface TriggerMetadata {
  type: 'webhook' | 'manual' | 'scheduled' | 'entity_arrival';
  source: string | null;
  event_id: string | null;
  timestamp: string;
}
```

#### WorkerNodeData (Extended)

```typescript
export interface WorkerNodeData extends NodeConfig {
  webhookUrl?: string;
  workerType?: string;
  entityMovement?: EntityMovementConfig;  // NEW: Entity movement configuration
}

export interface EntityMovementConfig {
  onSuccess?: EntityMovementAction;
  onFailure?: EntityMovementAction;
}

export interface EntityMovementAction {
  targetSectionId: string;     // Section node ID to move entity to
  completeAs: 'success' | 'failure' | 'neutral';  // How to mark completion
}
```

### JSON Path Extraction

The system uses JSON path syntax (similar to JSONPath) to extract values from webhook payloads:

- `$.customer.name` - Extract nested field
- `$.items[0].id` - Extract from array
- `$.metadata.plan` - Extract from nested object

Static values can also be used:
- `"customer"` - Use literal string value

## Error Handling

### Webhook Processing Errors

1. **Invalid Endpoint**: Return 404 if endpoint_slug not found
2. **Inactive Webhook**: Return 404 if webhook is_active = false
3. **Signature Validation Failure**: Return 401 if signature doesn't match
4. **Entity Mapping Error**: Log error in webhook_events, return 500
5. **Workflow Execution Error**: Log error in webhook_events, return 500

### Error Recovery

- All webhook events are logged regardless of success/failure
- Failed events can be retried by re-processing the stored payload
- Entity creation failures don't prevent event logging
- Workflow execution failures are tracked in node_states

### Validation Rules

1. **Endpoint Slug**: Must be URL-safe (alphanumeric, hyphens, underscores)
2. **Entity Mapping**: Must contain at least 'name' and 'entity_type'
3. **Entry Edge**: Must exist in the referenced workflow
4. **Workflow Reference**: Must be a valid workflow canvas (canvas_type = 'workflow')

## Testing Strategy

### Property-Based Testing Library

This project will use **fast-check** for property-based testing in TypeScript.

**Installation:**
```bash
npm install --save-dev fast-check
```

**Configuration:**
- Each property-based test will run a minimum of 100 iterations
- Tests will be tagged with comments referencing design document properties
- Tag format: `// Feature: webhook-system, Property {number}: {property_text}`

### Unit Testing Approach

Unit tests will cover:
- JSON path extraction from webhook payloads
- Entity mapping transformation logic
- Signature validation algorithms
- Webhook event status transitions
- Error handling for invalid configurations

### Property-Based Testing Approach

Property-based tests will verify:
- Universal properties that hold across all webhook payloads
- Entity mapping consistency across different payload structures
- Trigger metadata preservation through workflow execution
- Database constraint enforcement (uniqueness, foreign keys)



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Endpoint slug uniqueness enforcement

*For any* two webhook configurations, if they have the same endpoint_slug, then the second creation attempt should fail with a uniqueness constraint violation.

**Validates: Requirements 1.2**

### Property 2: Webhook configuration referential integrity

*For any* webhook configuration that references a workflow, deleting the referenced workflow should cascade delete the webhook configuration, maintaining referential integrity.

**Validates: Requirements 1.3**

### Property 3: Webhook configuration round-trip consistency

*For any* webhook configuration with all fields populated (including optional secret), saving it to the database and then querying it back should return an equivalent configuration with all fields preserved.

**Validates: Requirements 1.4, 1.5**

### Property 4: Webhook event payload preservation

*For any* webhook request with a JSON payload, processing the request should create an event log entry where the stored payload exactly matches the received payload.

**Validates: Requirements 2.1**

### Property 5: Webhook event status tracking

*For any* webhook event that is processed (successfully or with failure), the event record should have its status field updated to reflect the outcome and include error messages when processing fails.

**Validates: Requirements 2.2**

### Property 6: Webhook event entity and run linking

*For any* webhook event that successfully creates an entity and triggers a workflow, the event record should have both entity_id and workflow_run_id populated with the correct references.

**Validates: Requirements 2.3, 2.4**

### Property 7: Webhook event chronological ordering

*For any* set of webhook events with different received_at timestamps, querying all events should return them ordered chronologically by received_at.

**Validates: Requirements 2.5**

### Property 8: Workflow run trigger metadata round-trip

*For any* workflow run created with trigger metadata (type, source, event_id, timestamp), querying the run should return trigger metadata that exactly matches what was stored.

**Validates: Requirements 3.1, 3.4**

### Property 9: Webhook trigger event linking

*For any* workflow run triggered by a webhook, the run's trigger metadata should contain an event_id that matches the webhook event's id.

**Validates: Requirements 3.2**

### Property 10: Workflow run entity referential integrity

*For any* workflow run associated with an entity, the entity_id foreign key reference should be maintained, and deleting the entity should set the run's entity_id to null.

**Validates: Requirements 3.3**

### Property 11: Trigger metadata immutability

*For any* workflow run with trigger metadata, completing the run (updating node_states to all completed) should not modify the trigger metadata—it should remain identical to the original value.

**Validates: Requirements 3.5**

### Property 12: Entity movement configuration round-trip

*For any* worker node configuration with entityMovement settings (onSuccess and/or onFailure with targetSectionId and completeAs), saving the configuration and retrieving it should preserve all entity movement fields exactly.

**Validates: Requirements 5.1, 5.2, 5.5**

### Property 13: Success entity movement application

*For any* worker node with entityMovement.onSuccess configured, when the node completes with status 'completed', the associated entity's current_node_id should be updated to the targetSectionId specified in onSuccess.

**Validates: Requirements 5.3**

### Property 14: Failure entity movement application

*For any* worker node with entityMovement.onFailure configured, when the node completes with status 'failed', the associated entity's current_node_id should be updated to the targetSectionId specified in onFailure.

**Validates: Requirements 5.4**

### Property 15: Canvas deletion cascade to webhook configs

*For any* canvas with associated webhook configurations, deleting the canvas should cascade delete all webhook configurations that reference it via canvas_id.

**Validates: Requirements 6.4**

### Property 16: Workflow run deletion preserves webhook events

*For any* webhook event linked to a workflow run, deleting the workflow run should preserve the webhook event record and set its workflow_run_id to null (not cascade delete).

**Validates: Requirements 6.5**

### Property 17: Adapter selection by source

*For any* webhook configuration with a specified source, processing a webhook should use the adapter registered for that source, or fall back to the generic adapter if no specific adapter exists.

**Validates: Requirements 7.1, 7.7**

### Property 18: Stripe signature verification

*For any* Stripe webhook with a valid Stripe-Signature header and matching secret, the Stripe adapter should successfully verify the signature, and for any webhook with an invalid signature, verification should fail.

**Validates: Requirements 7.2, 7.8**

### Property 19: Typeform signature verification

*For any* Typeform webhook with a valid Typeform-Signature header and matching secret, the Typeform adapter should successfully verify the signature, and for any webhook with an invalid signature, verification should fail.

**Validates: Requirements 7.3, 7.8**

### Property 20: Calendly signature verification

*For any* Calendly webhook with a valid Calendly-Webhook-Signature header and matching secret, the Calendly adapter should successfully verify the signature, and for any webhook with an invalid signature, verification should fail.

**Validates: Requirements 7.4, 7.8**

### Property 21: n8n token verification

*For any* n8n webhook with a valid x-webhook-secret header matching the configured secret, the n8n adapter should successfully verify the token, and for any webhook with an invalid token, verification should fail.

**Validates: Requirements 7.5, 7.8**

### Property 22: Source-specific entity extraction with fallback

*For any* webhook payload processed by a source-specific adapter, if the adapter successfully extracts entity data (name and email), that data should be used; otherwise, the system should fall back to generic JSONPath mapping from the webhook config.

**Validates: Requirements 7.6, 7.7**

