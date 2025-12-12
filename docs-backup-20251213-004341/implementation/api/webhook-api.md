# Webhook API

## Overview

The Webhook API enables external services to trigger Stitch workflows and create entities by sending HTTP POST requests to configured webhook endpoints. This provides a powerful integration mechanism for connecting third-party services (Stripe, Typeform, Calendly, n8n, etc.) to your Living Business Model Canvas.

**Key Features:**
- Receive webhooks from multiple sources with source-specific adapters
- Verify webhook signatures using provider-specific validation
- Extract entity data automatically from webhook payloads
- Create or update entities in the database
- Trigger workflow execution automatically
- Track entity journeys visually on the canvas
- Audit all webhook events for debugging and compliance

## Endpoint

### POST /api/webhooks/[endpoint_slug]

Receives webhook requests from external services and processes them through the complete integration pipeline.

**URL Pattern:**
```
POST https://your-domain.com/api/webhooks/{endpoint_slug}
```

The `endpoint_slug` is a unique identifier configured when creating the webhook endpoint. It determines which webhook configuration to use for processing.

## Request Format

### Headers

**Required:**
- `Content-Type: application/json`

**Optional (for signature verification):**
- `X-Webhook-Signature` - Generic HMAC-SHA256 signature
- `Stripe-Signature` - Stripe webhook signature
- `Typeform-Signature` - Typeform webhook signature
- `Calendly-Webhook-Signature` - Calendly webhook signature
- `x-webhook-secret` - n8n webhook secret

The signature header used depends on the webhook source configured.

### Body

The request body must be valid JSON. The structure depends on the external service sending the webhook.

**Example (Stripe):**
```json
{
  "id": "evt_1234567890",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "customer": "cus_abc123",
      "customer_details": {
        "email": "alice@example.com",
        "name": "Alice Johnson"
      },
      "amount_total": 9900,
      "payment_status": "paid"
    }
  }
}
```

**Example (Typeform):**
```json
{
  "event_id": "evt_abc123",
  "event_type": "form_response",
  "form_response": {
    "form_id": "form_123",
    "answers": [
      {
        "type": "email",
        "email": "bob@example.com"
      },
      {
        "type": "text",
        "field": { "ref": "name" },
        "text": "Bob Smith"
      }
    ]
  }
}
```

**Example (Custom/Generic):**
```json
{
  "customer": {
    "name": "Charlie Brown",
    "email": "charlie@example.com"
  },
  "event": "signup_completed",
  "metadata": {
    "plan": "pro",
    "source": "landing_page"
  }
}
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "webhookEventId": "evt_550e8400-e29b-41d4-a716-446655440000",
  "entityId": "ent_660e8400-e29b-41d4-a716-446655440001",
  "workflowRunId": "run_770e8400-e29b-41d4-a716-446655440002"
}
```

**Fields:**
- `success` - Always `true` for successful processing
- `webhookEventId` - UUID of the created webhook event record
- `entityId` - UUID of the created or updated entity
- `workflowRunId` - UUID of the created workflow run

### Error Responses

#### 400 Bad Request

Invalid JSON payload.

```json
{
  "error": "Invalid JSON payload"
}
```

#### 401 Unauthorized

Invalid webhook signature.

```json
{
  "error": "Invalid webhook signature"
}
```

#### 404 Not Found

Webhook endpoint not found or inactive.

```json
{
  "error": "Webhook endpoint not found: my-endpoint"
}
```

or

```json
{
  "error": "Webhook endpoint is inactive: my-endpoint"
}
```

#### 500 Internal Server Error

Processing error occurred.

```json
{
  "error": "Failed to create entity: <error details>"
}
```

## Webhook Configuration

### Configuration Object

Webhook endpoints are configured in the `stitch_webhook_configs` table:

```typescript
interface WebhookConfig {
  id: string;                    // UUID
  canvas_id: string;             // Canvas this webhook belongs to
  name: string;                  // Human-readable name
  source: string;                // Source identifier (see below)
  endpoint_slug: string;         // Unique URL slug
  secret: string | null;         // Secret for signature verification
  workflow_id: string;           // Workflow to trigger
  entry_edge_id: string;         // Edge where entity journey begins
  entity_mapping: EntityMapping; // JSONPath mapping for entity extraction
  is_active: boolean;            // Whether webhook is enabled
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

### Entity Mapping

The `entity_mapping` field defines how to extract entity data from webhook payloads using JSONPath expressions:

```typescript
interface EntityMapping {
  name: string;                          // JSONPath to name field
  email?: string;                        // JSONPath to email field (optional)
  entity_type: string;                   // JSONPath or static value
  avatar_url?: string;                   // JSONPath to avatar URL (optional)
  metadata?: Record<string, string>;     // Map of metadata fields to JSONPaths
}
```

**Example:**
```json
{
  "name": "$.customer.name",
  "email": "$.customer.email",
  "entity_type": "customer",
  "metadata": {
    "plan": "$.subscription.plan",
    "amount": "$.subscription.amount"
  }
}
```

### JSONPath Syntax

**Property Access:**
```
$.customer.name          → payload.customer.name
```

**Nested Properties:**
```
$.data.object.email      → payload.data.object.email
```

**Array Indices:**
```
$.items[0].name          → payload.items[0].name
```

**Static Values:**
```
customer                 → "customer" (literal string)
```

## Supported Sources

### 1. Stripe

**Source Identifier:** `stripe`

**Signature Header:** `Stripe-Signature`

**Signature Format:** `t=timestamp,v1=signature`

**Signature Verification:**
- Reconstructs signed payload: `timestamp.rawBody`
- Computes HMAC-SHA256 using webhook secret
- Compares with provided signature

**Entity Extraction:**
- Automatically extracts customer data from Stripe events
- Supports `checkout.session.completed`, `customer.created`, etc.
- Falls back to JSONPath mapping if automatic extraction fails

**Example Configuration:**
```json
{
  "source": "stripe",
  "endpoint_slug": "stripe-checkout",
  "secret": "whsec_abc123...",
  "entity_mapping": {
    "name": "$.data.object.customer_details.name",
    "email": "$.data.object.customer_details.email",
    "entity_type": "customer",
    "metadata": {
      "stripe_customer_id": "$.data.object.customer",
      "amount": "$.data.object.amount_total"
    }
  }
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/stripe-checkout
```

Configure this URL in your Stripe Dashboard under Developers → Webhooks.

### 2. Typeform

**Source Identifier:** `typeform`

**Signature Header:** `Typeform-Signature`

**Signature Format:** `sha256=signature`

**Signature Verification:**
- Computes HMAC-SHA256 of raw body
- Compares with signature after `sha256=` prefix

**Entity Extraction:**
- Automatically extracts respondent data from form responses
- Finds email and name fields from answers array
- Falls back to JSONPath mapping if automatic extraction fails

**Example Configuration:**
```json
{
  "source": "typeform",
  "endpoint_slug": "typeform-leads",
  "secret": "your-typeform-secret",
  "entity_mapping": {
    "name": "$.form_response.answers[?(@.field.ref=='name')].text",
    "email": "$.form_response.answers[?(@.type=='email')].email",
    "entity_type": "lead"
  }
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/typeform-leads
```

Configure this URL in your Typeform under Connect → Webhooks.

### 3. Calendly

**Source Identifier:** `calendly`

**Signature Header:** `Calendly-Webhook-Signature`

**Signature Verification:**
- Computes HMAC-SHA256 of raw body
- Compares with provided signature

**Entity Extraction:**
- Automatically extracts invitee data from scheduling events
- Supports `invitee.created`, `invitee.canceled`, etc.
- Falls back to JSONPath mapping if automatic extraction fails

**Example Configuration:**
```json
{
  "source": "calendly",
  "endpoint_slug": "calendly-bookings",
  "secret": "your-calendly-secret",
  "entity_mapping": {
    "name": "$.payload.invitee.name",
    "email": "$.payload.invitee.email",
    "entity_type": "lead",
    "metadata": {
      "event_type": "$.payload.event_type.name",
      "scheduled_at": "$.payload.scheduled_event.start_time"
    }
  }
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/calendly-bookings
```

Configure this URL in your Calendly account under Integrations → Webhooks.

### 4. n8n

**Source Identifier:** `n8n`

**Signature Header:** `x-webhook-secret`

**Signature Verification:**
- Direct secret comparison (not HMAC)
- Compares header value with configured secret

**Entity Extraction:**
- Uses generic JSONPath mapping
- No automatic extraction (n8n payloads are custom)

**Example Configuration:**
```json
{
  "source": "n8n",
  "endpoint_slug": "n8n-workflow",
  "secret": "your-n8n-secret",
  "entity_mapping": {
    "name": "$.name",
    "email": "$.email",
    "entity_type": "$.type"
  }
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/n8n-workflow
```

Configure this URL in your n8n workflow's Webhook node.

### 5. Custom/Generic

**Source Identifier:** `custom` or any unrecognized source

**Signature Header:** `X-Webhook-Signature`

**Signature Verification:**
- HMAC-SHA256 with timing-safe comparison
- Optional (if no secret configured, signature not required)

**Entity Extraction:**
- Uses JSONPath mapping from configuration
- No automatic extraction

**Example Configuration:**
```json
{
  "source": "custom",
  "endpoint_slug": "my-custom-webhook",
  "secret": "your-custom-secret",
  "entity_mapping": {
    "name": "$.user.full_name",
    "email": "$.user.email_address",
    "entity_type": "customer",
    "metadata": {
      "signup_source": "$.source",
      "plan": "$.plan_name"
    }
  }
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/my-custom-webhook
```

## Processing Pipeline

When a webhook is received, it goes through a 10-step processing pipeline:

1. **Configuration Lookup** - Find webhook config by endpoint_slug
2. **Event Logging** - Create webhook event record (status: 'pending')
3. **Active Check** - Verify webhook is enabled
4. **Signature Verification** - Validate using source-specific adapter
5. **Entity Extraction** - Extract entity data using adapter or JSONPath
6. **Status Update** - Update webhook event (status: 'processing')
7. **Entity Creation/Update** - Create new entity or update existing (matched by email)
8. **Visual Journey** - Place entity on entry edge for animation
9. **Workflow Run** - Create workflow run with trigger metadata
10. **Execution Start** - Fire entry node to begin workflow execution
11. **Completion** - Update webhook event (status: 'completed')

See [Webhook System](../backend/webhook-system.md) for detailed pipeline documentation.

## Entity Management

### Entity Creation

When a webhook is processed, an entity is created in the `stitch_entities` table:

```typescript
interface StitchEntity {
  id: string;                    // UUID
  canvas_id: string;             // Canvas this entity belongs to
  name: string;                  // Entity name
  email: string | null;          // Entity email (optional)
  entity_type: string;           // 'customer', 'lead', 'churned'
  avatar_url: string | null;     // Avatar URL (optional)
  metadata: Record<string, any>; // Additional data from webhook
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

### Entity Deduplication

Entities are deduplicated by email within a canvas:

- If an entity with the same email exists, it is **updated** with new data
- If no matching entity exists, a **new entity** is created
- If no email is provided, a new entity is always created

This ensures that the same customer/lead isn't duplicated when multiple webhooks are received.

### Entity Journey

After creation, the entity is placed on the configured entry edge:

```typescript
await startJourney(entity.id, webhookConfig.entry_edge_id);
```

This creates a journey event that triggers visual animation on the canvas, showing the entity travelling from the entry point through the workflow.

## Workflow Execution

### Trigger Metadata

Workflow runs include metadata linking back to the webhook:

```typescript
interface TriggerMetadata {
  type: 'webhook';
  source: string;        // 'stripe', 'typeform', etc.
  event_id: string;      // webhook_event.id
  timestamp: string;     // ISO 8601 timestamp
}
```

This enables tracing workflow runs back to their originating webhook events.

### Execution Start

The workflow execution begins by firing the target node of the entry edge:

```typescript
const entryEdge = flow.graph.edges.find(e => e.id === webhookConfig.entry_edge_id);
await fireNode(entryEdge.target, flow, workflowRun);
```

This triggers the edge-walking execution model, which continues until the workflow completes.

See [Execution Engine](../backend/execution-engine.md) for details on workflow execution.

## Webhook Events

### Event Logging

All webhook requests are logged in the `stitch_webhook_events` table:

```typescript
interface WebhookEvent {
  id: string;                    // UUID
  webhook_config_id: string;     // Reference to webhook config
  received_at: string;           // ISO 8601 timestamp
  payload: Record<string, any>;  // Full webhook payload
  entity_id: string | null;      // Created/updated entity
  workflow_run_id: string | null;// Created workflow run
  status: string;                // 'pending', 'processing', 'completed', 'failed'
  error: string | null;          // Error message if failed
  processed_at: string | null;   // ISO 8601 timestamp
}
```

### Event Status

- `pending` - Webhook received, not yet processed
- `processing` - Currently being processed
- `completed` - Successfully processed
- `failed` - Processing failed (see error field)

### Querying Events

Query webhook events for debugging:

```sql
SELECT 
  we.id,
  we.status,
  we.error,
  we.payload,
  wc.name as webhook_name,
  wc.source,
  e.name as entity_name,
  r.id as run_id
FROM stitch_webhook_events we
JOIN stitch_webhook_configs wc ON we.webhook_config_id = wc.id
LEFT JOIN stitch_entities e ON we.entity_id = e.id
LEFT JOIN stitch_runs r ON we.workflow_run_id = r.id
WHERE we.status = 'failed'
ORDER BY we.received_at DESC
LIMIT 10;
```

## Security

### Signature Verification

**Always configure secrets for production webhooks.** Signature verification ensures that webhooks are genuinely from the claimed source and haven't been tampered with.

**How it works:**
1. External service computes HMAC-SHA256 of request body using shared secret
2. Service includes signature in request header
3. Stitch recomputes HMAC-SHA256 using same secret
4. Signatures are compared using timing-safe comparison
5. Request is rejected if signatures don't match

### Secret Management

**Best Practices:**
- Use strong, randomly generated secrets
- Rotate secrets periodically
- Store secrets securely (environment variables, secret managers)
- Never commit secrets to version control
- Use different secrets for different environments

### HTTPS Required

**Always use HTTPS for webhook URLs in production.** HTTP webhooks are vulnerable to:
- Man-in-the-middle attacks
- Signature replay attacks
- Data interception

## Testing

### Manual Testing with curl

Test webhook endpoints using curl:

```bash
curl -X POST https://your-domain.com/api/webhooks/test-endpoint \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: your-signature" \
  -d '{
    "customer": {
      "name": "Test User",
      "email": "test@example.com"
    },
    "event": "test_event"
  }'
```

### Generating Test Signatures

Generate HMAC-SHA256 signatures using Node.js:

```javascript
const crypto = require('crypto');

const payload = {
  customer: {
    name: "Test User",
    email: "test@example.com"
  }
};

const rawBody = JSON.stringify(payload);
const secret = 'your-webhook-secret';

const hmac = crypto.createHmac('sha256', secret);
hmac.update(rawBody);
const signature = hmac.digest('hex');

console.log('X-Webhook-Signature:', signature);
```

### Testing with External Services

Most webhook providers offer testing tools:

**Stripe:**
- Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe-checkout`
- Trigger test events: `stripe trigger checkout.session.completed`

**Typeform:**
- Use Typeform's webhook testing interface
- Submit test responses to trigger webhooks

**Calendly:**
- Create test bookings to trigger webhooks
- Use Calendly's webhook logs to debug

### Webhook Event Inspection

Check webhook event logs to debug issues:

```sql
-- Find recent failed webhooks
SELECT * FROM stitch_webhook_events 
WHERE status = 'failed' 
ORDER BY received_at DESC 
LIMIT 10;

-- Find webhooks for specific entity
SELECT * FROM stitch_webhook_events 
WHERE entity_id = 'ent_abc123'
ORDER BY received_at DESC;

-- Find webhooks that triggered specific workflow run
SELECT * FROM stitch_webhook_events 
WHERE workflow_run_id = 'run_xyz789';
```

## Common Issues

### Issue: Invalid Signature (401)

**Symptoms:**
- Webhook returns 401 Unauthorized
- Error message: "Invalid webhook signature"

**Causes:**
- Incorrect secret configured
- Using parsed JSON instead of raw body for HMAC
- Signature header name mismatch
- Clock skew (for timestamp-based signatures like Stripe)

**Solutions:**
1. Verify secret matches external service configuration
2. Ensure raw body is used for HMAC computation (not parsed JSON)
3. Check signature header name matches source (e.g., `Stripe-Signature` for Stripe)
4. For Stripe, check timestamp tolerance (default 5 minutes)

### Issue: Entity Not Created

**Symptoms:**
- Webhook succeeds (200 OK)
- No entity appears in database
- Webhook event shows `entity_id: null`

**Causes:**
- Invalid JSONPath expressions in entity_mapping
- Required fields missing from webhook payload
- Entity mapping misconfigured

**Solutions:**
1. Test JSONPath expressions with sample payload
2. Check webhook event payload in database
3. Verify entity_mapping configuration
4. Check adapter logs for extraction errors

### Issue: Workflow Not Triggered

**Symptoms:**
- Entity created successfully
- Workflow doesn't execute
- No workflow run created

**Causes:**
- Invalid entry_edge_id
- Workflow not found
- Entry edge target node missing
- Workflow execution error

**Solutions:**
1. Verify entry_edge_id exists in workflow graph
2. Check workflow_id is correct and workflow exists
3. Ensure entry edge has valid target node
4. Check workflow execution logs for errors

### Issue: Duplicate Entities

**Symptoms:**
- Multiple entities created for same customer
- Entity deduplication not working

**Causes:**
- Email field not extracted correctly
- Email field missing from webhook payload
- Different email formats (case sensitivity)

**Solutions:**
1. Verify email JSONPath expression is correct
2. Check webhook payload contains email field
3. Normalize email addresses (lowercase)
4. Consider using external ID for deduplication

## Examples

### Example 1: Stripe Checkout Webhook

**Scenario:** Create customer entity when Stripe checkout completes.

**Configuration:**
```json
{
  "name": "Stripe Checkout Completed",
  "source": "stripe",
  "endpoint_slug": "stripe-checkout",
  "secret": "whsec_abc123...",
  "workflow_id": "workflow_onboarding",
  "entry_edge_id": "edge_entry",
  "entity_mapping": {
    "name": "$.data.object.customer_details.name",
    "email": "$.data.object.customer_details.email",
    "entity_type": "customer",
    "metadata": {
      "stripe_customer_id": "$.data.object.customer",
      "amount_paid": "$.data.object.amount_total",
      "payment_status": "$.data.object.payment_status"
    }
  },
  "is_active": true
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/stripe-checkout
```

**Test Request:**
```bash
curl -X POST https://your-domain.com/api/webhooks/stripe-checkout \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=abc123..." \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "customer": "cus_abc123",
        "customer_details": {
          "email": "alice@example.com",
          "name": "Alice Johnson"
        },
        "amount_total": 9900,
        "payment_status": "paid"
      }
    }
  }'
```

### Example 2: Typeform Lead Capture

**Scenario:** Create lead entity when Typeform is submitted.

**Configuration:**
```json
{
  "name": "Typeform Lead Capture",
  "source": "typeform",
  "endpoint_slug": "typeform-leads",
  "secret": "your-typeform-secret",
  "workflow_id": "workflow_lead_nurture",
  "entry_edge_id": "edge_entry",
  "entity_mapping": {
    "name": "$.form_response.answers[?(@.field.ref=='name')].text",
    "email": "$.form_response.answers[?(@.type=='email')].email",
    "entity_type": "lead",
    "metadata": {
      "form_id": "$.form_response.form_id",
      "company": "$.form_response.answers[?(@.field.ref=='company')].text"
    }
  },
  "is_active": true
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/typeform-leads
```

### Example 3: Custom Integration

**Scenario:** Create entity from custom application webhook.

**Configuration:**
```json
{
  "name": "Custom App Signup",
  "source": "custom",
  "endpoint_slug": "custom-signup",
  "secret": "your-custom-secret",
  "workflow_id": "workflow_onboarding",
  "entry_edge_id": "edge_entry",
  "entity_mapping": {
    "name": "$.user.full_name",
    "email": "$.user.email",
    "entity_type": "customer",
    "avatar_url": "$.user.avatar",
    "metadata": {
      "signup_source": "$.source",
      "plan": "$.plan",
      "referrer": "$.referrer"
    }
  },
  "is_active": true
}
```

**Webhook URL:**
```
https://your-domain.com/api/webhooks/custom-signup
```

**Test Request:**
```bash
# Generate signature
SECRET="your-custom-secret"
PAYLOAD='{"user":{"full_name":"Charlie Brown","email":"charlie@example.com","avatar":"https://example.com/avatar.jpg"},"source":"landing_page","plan":"pro","referrer":"google"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Send request
curl -X POST https://your-domain.com/api/webhooks/custom-signup \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

## Related Documentation

- [Webhook System](../backend/webhook-system.md) - Complete webhook processing pipeline
- [Execution Engine](../backend/execution-engine.md) - Workflow execution after webhook trigger
- [Database Layer](../backend/database-layer.md) - Database operations for webhooks and entities
- [Entity Visualization](../frontend/entity-visualization.md) - Visual journey tracking
- [REST Endpoints](./rest-endpoints.md) - Complete API reference

## File Locations

```
src/app/api/webhooks/
└── [endpoint_slug]/
    └── route.ts              # HTTP endpoint

src/lib/webhooks/
├── processor.ts              # Main orchestration
├── entity-mapper.ts          # JSONPath entity extraction
├── signature.ts              # Generic HMAC validation
├── json-path.ts             # JSONPath parser
└── adapters/
    ├── index.ts             # Adapter registry
    ├── types.ts             # Adapter interface
    ├── generic.ts           # Generic adapter
    ├── stripe.ts            # Stripe adapter
    ├── typeform.ts          # Typeform adapter
    ├── calendly.ts          # Calendly adapter
    └── n8n.ts               # n8n adapter

src/lib/db/
├── webhook-configs.ts        # Webhook config CRUD
└── webhook-events.ts         # Webhook event CRUD
```
