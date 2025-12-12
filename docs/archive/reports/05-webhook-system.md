# Webhook System: External Service Integration

## Overview

The webhook system extends Stitch to accept external HTTP requests that trigger workflow executions. External services (Stripe, Typeform, Calendly, n8n, etc.) can POST to unique webhook endpoints, which create entities and initiate workflow runs.

## Architecture

```
External Service (Stripe, Typeform, etc.)
    ↓ POST /api/webhooks/{endpoint_slug}
Webhook Endpoint
    ↓ Verify Signature
    ↓ Log Event (stitch_webhook_events)
    ↓ Extract Entity Data (using adapter)
    ↓ Create/Update Entity (stitch_entities)
    ↓ Create Workflow Run (stitch_runs)
    ↓ Start Execution at Entry Edge
```

## Webhook Adapters

The adapter system provides source-specific handling for different webhook providers.

### Adapter Interface

```typescript
export interface WebhookAdapter {
  source: string;
  
  /**
   * Verifies the webhook signature
   */
  verifySignature(
    rawBody: string,
    headers: Headers,
    secret: string | null
  ): Promise<boolean> | boolean;
  
  /**
   * Extracts entity data from payload
   */
  extractEntity(
    payload: any,
    config: WebhookConfig
  ): ExtractedEntity;
  
  /**
   * Identifies the event type
   */
  getEventType(payload: any): string;
}

export interface ExtractedEntity {
  name?: string;
  email?: string;
  avatar_url?: string;
  metadata: Record<string, any>;
}
```

### Supported Adapters

#### 1. Stripe Adapter

**Signature Verification**:
```typescript
// Parses Stripe-Signature header: "t=timestamp,v1=signature"
const signature = headers.get('Stripe-Signature');
const [timestamp, sig] = parseStripeSignature(signature);

// Verify HMAC-SHA256
const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${rawBody}`)
  .digest('hex');

return crypto.timingSafeEqual(
  Buffer.from(sig),
  Buffer.from(expectedSig)
);
```

**Entity Extraction**:
```typescript
extractEntity(payload: any): ExtractedEntity {
  const customer = payload.data?.object?.customer_details || {};
  
  return {
    name: customer.name,
    email: customer.email,
    metadata: {
      stripe_customer_id: payload.data?.object?.customer,
      payment_status: payload.data?.object?.payment_status,
      amount: payload.data?.object?.amount_total,
      currency: payload.data?.object?.currency,
    }
  };
}
```

#### 2. Typeform Adapter

**Signature Verification**:
```typescript
// Parses Typeform-Signature header: "sha256=signature"
const signature = headers.get('Typeform-Signature');
const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('base64');

return signature === `sha256=${expectedSig}`;
```

**Entity Extraction**:
```typescript
extractEntity(payload: any): ExtractedEntity {
  const answers = payload.form_response?.answers || [];
  
  // Find email and name fields
  const emailAnswer = answers.find(a => a.type === 'email');
  const nameAnswer = answers.find(a => a.field?.type === 'short_text');
  
  return {
    name: nameAnswer?.text,
    email: emailAnswer?.email,
    metadata: {
      form_id: payload.form_response?.form_id,
      submitted_at: payload.form_response?.submitted_at,
    }
  };
}
```

#### 3. Calendly Adapter

**Signature Verification**:
```typescript
// Parses Calendly-Webhook-Signature header: "t=timestamp,v1=signature"
const signature = headers.get('Calendly-Webhook-Signature');
const [timestamp, sig] = parseCalendlySignature(signature);

const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${rawBody}`)
  .digest('hex');

return crypto.timingSafeEqual(
  Buffer.from(sig),
  Buffer.from(expectedSig)
);
```

**Entity Extraction**:
```typescript
extractEntity(payload: any): ExtractedEntity {
  const invitee = payload.payload?.invitee || {};
  
  return {
    name: invitee.name,
    email: invitee.email,
    metadata: {
      event_type: payload.event,
      meeting_name: payload.payload?.event?.name,
      start_time: payload.payload?.event?.start_time,
      join_url: payload.payload?.event?.location?.join_url,
    }
  };
}
```

#### 4. n8n Adapter

**Signature Verification**:
```typescript
// Simple token comparison
const token = headers.get('x-webhook-secret') || headers.get('x-auth-token');
return token === secret;
```

**Entity Extraction**:
```typescript
extractEntity(payload: any, config: WebhookConfig): ExtractedEntity {
  // n8n payloads are dynamic, use generic JSONPath mapping
  return genericAdapter.extractEntity(payload, config);
}
```

#### 5. Generic Adapter

**Signature Verification**:
```typescript
// Standard HMAC-SHA256 with X-Webhook-Signature header
const signature = headers.get('X-Webhook-Signature');
const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

return signature === expectedSig;
```

**Entity Extraction**:
```typescript
extractEntity(payload: any, config: WebhookConfig): ExtractedEntity {
  // Use JSONPath mapping from config
  const name = extractValue(payload, config.entity_mapping.name);
  const email = extractValue(payload, config.entity_mapping.email);
  
  const metadata: Record<string, any> = {};
  for (const [key, path] of Object.entries(config.entity_mapping.metadata || {})) {
    metadata[key] = extractValue(payload, path);
  }
  
  return { name, email, metadata };
}

// JSONPath extraction
function extractValue(obj: any, path: string): any {
  // Path format: "$.customer.name" or "customer.name"
  const parts = path.replace(/^\$\./, '').split('.');
  let value = obj;
  
  for (const part of parts) {
    if (value === undefined || value === null) break;
    value = value[part];
  }
  
  return value;
}
```

### Adapter Registry

```typescript
const adapters: Record<string, WebhookAdapter> = {
  'stripe': stripeAdapter,
  'typeform': typeformAdapter,
  'calendly': calendlyAdapter,
  'n8n': n8nAdapter,
  'generic': genericAdapter,
};

export function getAdapter(source: string): WebhookAdapter {
  return adapters[source] || genericAdapter;
}
```

## Webhook Configuration

### Creating a Webhook

```typescript
interface WebhookConfig {
  id: string;
  canvas_id: string;
  name: string;
  source: string;                    // 'stripe', 'typeform', etc.
  endpoint_slug: string;              // URL-safe unique identifier
  secret: string | null;              // For signature verification
  workflow_id: string;                // Workflow to execute
  entry_edge_id: string;              // Where to start execution
  entity_mapping: EntityMapping;      // How to extract entity data
  is_active: boolean;
}

interface EntityMapping {
  name: string;                       // JSONPath or static value
  email?: string;
  entity_type: string;
  avatar_url?: string;
  metadata?: Record<string, string>;  // Field name → JSONPath
}
```

**Example Configuration**:
```typescript
{
  name: "Stripe Payment Success",
  source: "stripe",
  endpoint_slug: "stripe-payment-success",
  secret: "whsec_abc123...",
  workflow_id: "workflow-uuid",
  entry_edge_id: "edge-1",
  entity_mapping: {
    name: "$.data.object.customer_details.name",
    email: "$.data.object.customer_details.email",
    entity_type: "customer",
    metadata: {
      plan: "$.data.object.metadata.plan",
      amount: "$.data.object.amount_total"
    }
  },
  is_active: true
}
```

## Webhook Endpoint Implementation

### POST /api/webhooks/[endpoint_slug]

```typescript
export async function POST(
  request: Request,
  { params }: { params: { endpoint_slug: string } }
) {
  const { endpoint_slug } = params;
  
  // 1. Look up webhook config
  const config = await getWebhookConfig(endpoint_slug);
  if (!config || !config.is_active) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }
  
  // 2. Get raw body and headers
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);
  const headers = request.headers;
  
  // 3. Get adapter for source
  const adapter = getAdapter(config.source);
  
  // 4. Verify signature
  const isValid = await adapter.verifySignature(rawBody, headers, config.secret);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // 5. Create webhook event log
  const event = await createWebhookEvent({
    webhook_config_id: config.id,
    payload,
    status: 'processing',
  });
  
  try {
    // 6. Extract entity data
    const entityData = adapter.extractEntity(payload, config);
    
    // 7. Create or update entity
    const entity = await createEntity({
      canvas_id: config.canvas_id,
      name: entityData.name || 'Unknown',
      email: entityData.email,
      entity_type: config.entity_mapping.entity_type,
      metadata: entityData.metadata,
    });
    
    // 8. Create workflow run
    const run = await createRunAdmin(config.workflow_id, {
      entity_id: entity.id,
      trigger: {
        type: 'webhook',
        source: config.source,
        event_id: event.id,
        timestamp: new Date().toISOString(),
      },
    });
    
    // 9. Start execution at entry edge
    const flow = await getFlowAdmin(config.workflow_id);
    await startRun(config.workflow_id, {
      entityId: entity.id,
      trigger: run.trigger,
    });
    
    // 10. Update webhook event
    await updateWebhookEvent(event.id, {
      entity_id: entity.id,
      workflow_run_id: run.id,
      status: 'completed',
      processed_at: new Date().toISOString(),
    });
    
    return NextResponse.json({ success: true, run_id: run.id });
    
  } catch (error) {
    // Log error
    await updateWebhookEvent(event.id, {
      status: 'failed',
      error: error.message,
      processed_at: new Date().toISOString(),
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

## Webhook Event Logging

### Event Structure

```typescript
interface WebhookEvent {
  id: string;
  webhook_config_id: string;
  received_at: string;
  payload: Record<string, any>;      // Complete webhook payload
  entity_id: string | null;          // Created entity
  workflow_run_id: string | null;    // Created run
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  processed_at: string | null;
}
```

### Querying Events

```typescript
// Get all events for a webhook config
const events = await supabase
  .from('stitch_webhook_events')
  .select('*')
  .eq('webhook_config_id', configId)
  .order('received_at', { ascending: false });

// Get failed events for retry
const failedEvents = await supabase
  .from('stitch_webhook_events')
  .select('*')
  .eq('status', 'failed')
  .order('received_at', { ascending: false });
```

### Retrying Failed Events

```typescript
export async function retryWebhookEvent(eventId: string) {
  // Get event
  const event = await getWebhookEvent(eventId);
  if (!event) throw new Error('Event not found');
  
  // Get config
  const config = await getWebhookConfig(event.webhook_config_id);
  if (!config) throw new Error('Config not found');
  
  // Re-process using stored payload
  // (Same logic as webhook endpoint, but using event.payload)
  // ...
}
```

## Trigger Metadata

Workflow runs track what triggered them:

```typescript
interface TriggerMetadata {
  type: 'webhook' | 'manual' | 'scheduled' | 'entity_arrival';
  source: string | null;              // 'stripe', 'typeform', etc.
  event_id: string | null;            // Link to webhook event
  timestamp: string;
}
```

**Example**:
```json
{
  "type": "webhook",
  "source": "stripe",
  "event_id": "evt-uuid",
  "timestamp": "2024-12-03T10:30:00Z"
}
```

## Worker Node Entity Movement

Worker nodes can specify entity movement based on outcomes:

```typescript
interface WorkerNodeData {
  webhookUrl: string;
  entityMovement?: {
    onSuccess?: {
      targetSectionId: string;
      completeAs: 'success' | 'failure' | 'neutral';
      setEntityType?: 'customer' | 'churned' | 'lead';
    };
    onFailure?: {
      targetSectionId: string;
      completeAs: 'success' | 'failure' | 'neutral';
    };
  };
}
```

**Example**:
```typescript
// Payment processor worker
{
  webhookUrl: "https://api.stripe.com/process",
  entityMovement: {
    onSuccess: {
      targetSectionId: "customers-section",
      completeAs: "success",
      setEntityType: "customer"  // Convert lead → customer
    },
    onFailure: {
      targetSectionId: "failed-payments-section",
      completeAs: "failure"
    }
  }
}
```

## Security Considerations

### Signature Verification

All adapters verify signatures to prevent unauthorized requests:

```typescript
// Always verify before processing
const isValid = await adapter.verifySignature(rawBody, headers, secret);
if (!isValid) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

### Endpoint Slug Uniqueness

Database enforces unique endpoint slugs:

```sql
CREATE UNIQUE INDEX idx_webhook_configs_endpoint_slug 
ON stitch_webhook_configs(endpoint_slug);
```

### Secret Storage

Secrets are stored encrypted in the database and never exposed in API responses.

### Rate Limiting

Consider implementing rate limiting for webhook endpoints:

```typescript
// Example using Vercel Edge Config
const rateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
const { success } = await rateLimiter.limit(identifier);

if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

## Testing Webhooks

### Using cURL

```bash
# Test Stripe webhook
curl -X POST https://app.stitch.run/api/webhooks/stripe-payment-success \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=abc123..." \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "customer_details": {
          "name": "Monica Smith",
          "email": "monica@example.com"
        },
        "amount_total": 9900,
        "currency": "usd"
      }
    }
  }'
```

### Using Webhook Testing Tools

- **Stripe CLI**: `stripe listen --forward-to localhost:3000/api/webhooks/stripe-payment-success`
- **ngrok**: Expose local server for testing with real services
- **Postman**: Save webhook requests for repeated testing

## Key Implementation Files

- `src/lib/webhooks/adapters/` - All webhook adapters
- `src/lib/webhooks/processor.ts` - Webhook processing logic
- `src/lib/webhooks/signature.ts` - Signature verification utilities
- `src/lib/webhooks/json-path.ts` - JSONPath extraction
- `src/lib/db/webhook-configs.ts` - Config database operations
- `src/lib/db/webhook-events.ts` - Event database operations
- `src/app/api/webhooks/[endpoint_slug]/route.ts` - Webhook endpoint
- `src/lib/webhooks/__tests__/processor.test.ts` - Unit tests
- `src/lib/db/__tests__/webhook-events.property.test.ts` - Property tests
