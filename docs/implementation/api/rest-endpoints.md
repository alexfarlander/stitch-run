# REST API Endpoints

Complete reference for all REST API endpoints in the Stitch orchestration platform.

## Overview

The Stitch API provides programmatic access to canvas management, workflow execution, webhook integration, and AI-powered workflow creation. All endpoints return JSON responses and follow RESTful conventions.

**Base URL**: `https://your-domain.com/api` (Production) or `http://localhost:3000/api` (Development)

## Table of Contents

- [Canvas Management](#canvas-management)
- [Workflow Execution](#workflow-execution)
- [AI Manager](#ai-manager)
- [Webhooks](#webhooks)
- [Demo & Testing](#demo--testing)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Canvas Management

### List All Canvases

Retrieve a list of all canvases with metadata.

**Endpoint**: `GET /api/canvas`

**Response**: `200 OK`
```json
{
  "canvases": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Video Generation Pipeline",
      "created_at": "2024-12-04T10:00:00Z",
      "updated_at": "2024-12-04T12:30:00Z",
      "node_count": 5,
      "edge_count": 4
    }
  ]
}
```

**Requirements**: 4.1

---


### Create Canvas

Create a new canvas from JSON or Mermaid format.

**Endpoint**: `POST /api/canvas`

**Request Body**:
```json
{
  "name": "My Workflow",
  "format": "json",
  "content": {
    "nodes": [
      {
        "id": "node-1",
        "type": "ux",
        "position": { "x": 0, "y": 0 },
        "data": { "label": "Start" }
      }
    ],
    "edges": []
  }
}
```

**Mermaid Format**:
```json
{
  "name": "My Workflow",
  "format": "mermaid",
  "content": "flowchart LR\n    A[Start] --> B[End]"
}
```

**Response**: `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Errors**:
- `400 BAD_REQUEST`: Invalid JSON, malformed content, or validation error
- `400 PARSE_ERROR`: Mermaid parsing failed
- `500 INTERNAL_ERROR`: Database error

**Requirements**: 4.1

---

### Get Canvas by ID

Retrieve a specific canvas with its complete structure.

**Endpoint**: `GET /api/canvas/{id}`

**Parameters**:
- `id` (path): Canvas UUID

**Response**: `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Video Generation Pipeline",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  },
  "created_at": "2024-12-04T10:00:00Z",
  "updated_at": "2024-12-04T12:30:00Z"
}
```

**Errors**:
- `404 NOT_FOUND`: Canvas not found
- `500 INTERNAL_ERROR`: Database error

**Requirements**: 4.1

---


### Update Canvas

Update an existing canvas structure or metadata.

**Endpoint**: `PUT /api/canvas/{id}`

**Parameters**:
- `id` (path): Canvas UUID

**Request Body**:
```json
{
  "name": "Updated Workflow Name",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Response**: `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  },
  "updated_at": "2024-12-04T13:00:00Z"
}
```

**Notes**:
- Updating the canvas structure automatically creates a new version
- Uses the version management system to ensure reproducibility
- Only metadata (name) can be updated without creating a version

**Errors**:
- `400 BAD_REQUEST`: Invalid canvas structure
- `404 NOT_FOUND`: Canvas not found
- `500 INTERNAL_ERROR`: Database error

**Requirements**: 4.1

---

### Delete Canvas

Delete a canvas by ID.

**Endpoint**: `DELETE /api/canvas/{id}`

**Parameters**:
- `id` (path): Canvas UUID

**Response**: `200 OK`
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors**:
- `404 NOT_FOUND`: Canvas not found
- `500 INTERNAL_ERROR`: Database error

**Requirements**: 4.1

---


## Workflow Execution

### Run Workflow

Start workflow execution for a canvas. Automatically creates a version snapshot.

**Endpoint**: `POST /api/canvas/{id}/run`

**Parameters**:
- `id` (path): Canvas UUID

**Request Body**:
```json
{
  "input": {
    "prompt": "Generate a video about AI"
  },
  "entityId": "customer-123"
}
```

**Response**: `200 OK`
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "versionId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
}
```

**Process**:
1. Loads canvas by ID
2. Creates version snapshot
3. Compiles to execution graph (OEG)
4. Creates run record
5. Starts execution
6. Returns run ID and status URL

**Errors**:
- `400 BAD_REQUEST`: Invalid input
- `404 NOT_FOUND`: Canvas not found
- `500 INTERNAL_ERROR`: Database or execution error

**Requirements**: 4.1

---

### Get Workflow Status

Query the status of a workflow execution.

**Endpoint**: `GET /api/canvas/{id}/status`

**Parameters**:
- `id` (path): Canvas UUID
- `runId` (query): Run UUID from run response

**Response**: `200 OK`

**Running Workflow**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "nodes": {
    "node-1": {
      "status": "completed",
      "output": { "prompt": "Generate video" }
    },
    "node-2": {
      "status": "running"
    }
  },
  "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
}
```

**Completed Workflow**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "nodes": {
    "node-1": {
      "status": "completed",
      "output": { "prompt": "Generate video" }
    },
    "node-2": {
      "status": "completed",
      "output": { "video_url": "https://..." }
    }
  },
  "finalOutputs": {
    "node-2": {
      "video_url": "https://..."
    }
  },
  "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
}
```

**Failed Workflow**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "nodes": {
    "node-1": {
      "status": "completed",
      "output": { "prompt": "Generate video" }
    },
    "node-2": {
      "status": "failed",
      "error": "API rate limit exceeded"
    }
  },
  "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
}
```

**Errors**:
- `400 BAD_REQUEST`: Missing runId or run doesn't belong to canvas
- `404 NOT_FOUND`: Canvas or run not found
- `500 INTERNAL_ERROR`: Database error

**Requirements**: 4.1

---


### Worker Callback

Receives completion callbacks from external workers (internal endpoint).

**Endpoint**: `POST /api/stitch/callback/{runId}/{nodeId}`

**Parameters**:
- `runId` (path): Run UUID
- `nodeId` (path): Node ID

**Request Body**:
```json
{
  "status": "completed",
  "output": {
    "video_url": "https://...",
    "duration": 30
  }
}
```

**Failed Callback**:
```json
{
  "status": "failed",
  "error": "API rate limit exceeded"
}
```

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Process**:
1. Validates callback payload structure
2. Updates node state in database
3. Applies entity movement if configured
4. Triggers edge-walking for downstream nodes (if completed)

**Errors**:
- `400 BAD_REQUEST`: Invalid payload structure or missing fields
- `404 NOT_FOUND`: Run or node not found
- `500 INTERNAL_ERROR`: Processing error

**Requirements**: 4.1

---

### Retry Failed Node

Retry execution of a failed node.

**Endpoint**: `POST /api/stitch/retry/{runId}/{nodeId}`

**Parameters**:
- `runId` (path): Run UUID
- `nodeId` (path): Node ID

**Response**: `200 OK`
```json
{
  "success": true,
  "nodeId": "worker-1",
  "status": "running"
}
```

**Errors**:
- `400 BAD_REQUEST`: Node is not in failed state
- `404 NOT_FOUND`: Run or node not found
- `500 INTERNAL_ERROR`: Retry error

**Requirements**: 4.1

---

### Complete UX Node

Mark a UX node as completed with user input (internal endpoint).

**Endpoint**: `POST /api/stitch/complete/{runId}/{nodeId}`

**Parameters**:
- `runId` (path): Run UUID
- `nodeId` (path): Node ID

**Request Body**:
```json
{
  "output": {
    "user_input": "Generate a video about space"
  }
}
```

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Requirements**: 4.1

---


## AI Manager

### Process Natural Language Request

Send a natural language request to create, modify, or execute workflows.

**Endpoint**: `POST /api/ai-manager`

**Request Body**:
```json
{
  "request": "Create a workflow that generates a video from text using Claude and Minimax"
}
```

**With Canvas ID (for modifications)**:
```json
{
  "request": "Add a voice generation step using ElevenLabs",
  "canvasId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**: `200 OK`

**CREATE_WORKFLOW Response**:
```json
{
  "action": "CREATE_WORKFLOW",
  "result": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "canvas": {
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

**MODIFY_WORKFLOW Response**:
```json
{
  "action": "MODIFY_WORKFLOW",
  "result": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "canvas": {
      "nodes": [...],
      "edges": [...]
    },
    "changes": ["Added voice generation node"]
  }
}
```

**RUN_WORKFLOW Response**:
```json
{
  "action": "RUN_WORKFLOW",
  "result": {
    "runId": "660e8400-e29b-41d4-a716-446655440000",
    "versionId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
  }
}
```

**GET_STATUS Response**:
```json
{
  "action": "GET_STATUS",
  "result": {
    "runId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "nodes": {
      "worker-1": {
        "status": "completed",
        "output": { "text": "..." }
      }
    },
    "finalOutputs": {
      "worker-1": { "text": "..." }
    }
  }
}
```

**Available Workers**:
- `claude`: Text generation, analysis
- `minimax`: Video generation
- `elevenlabs`: Voice synthesis
- `shotstack`: Video editing
- `scene-parser`: Scene extraction
- `wireframe-generator`: UI mockups
- `image-to-video`: Image animation
- `media-library`: Media asset retrieval

**Errors**:
- `400 BAD_REQUEST`: Invalid request, parsing error, or validation error
- `401 UNAUTHORIZED`: Missing or invalid LLM API key
- `404 NOT_FOUND`: Canvas not found (for modification requests)
- `500 INTERNAL_ERROR`: LLM error or database error

**Requirements**: 4.1

---


## Webhooks

### Receive Webhook

Receives webhook requests from external services and processes them.

**Endpoint**: `POST /api/webhooks/{endpoint_slug}`

**Parameters**:
- `endpoint_slug` (path): Unique webhook endpoint identifier

**Headers**:
- `X-Webhook-Signature` (optional): HMAC signature for validation
- `Content-Type`: `application/json`

**Request Body**:
Any valid JSON payload (structure defined by external service)

**Example (Stripe)**:
```json
{
  "type": "customer.created",
  "data": {
    "object": {
      "id": "cus_123",
      "email": "customer@example.com",
      "name": "John Doe"
    }
  }
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "webhookEventId": "880e8400-e29b-41d4-a716-446655440000",
  "entityId": "990e8400-e29b-41d4-a716-446655440000",
  "workflowRunId": "aa0e8400-e29b-41d4-a716-446655440000"
}
```

**Process**:
1. Validates endpoint slug exists and is active
2. Validates signature if configured
3. Extracts entity data using configured adapter
4. Creates entity record
5. Triggers configured workflow
6. Records webhook event

**Supported Sources**:
- Stripe
- Typeform
- Calendly
- n8n
- Generic (custom adapters)

**Errors**:
- `400 BAD_REQUEST`: Invalid JSON payload
- `401 UNAUTHORIZED`: Invalid signature
- `404 NOT_FOUND`: Endpoint slug not found or inactive
- `500 INTERNAL_ERROR`: Processing error

**Requirements**: 4.1

---


## Version Management

### Create Version

Create a new version snapshot of a canvas.

**Endpoint**: `POST /api/flows/{id}/versions`

**Parameters**:
- `id` (path): Canvas UUID

**Request Body**:
```json
{
  "visualGraph": {
    "nodes": [...],
    "edges": [...]
  },
  "description": "Added voice generation step"
}
```

**Response**: `201 Created`
```json
{
  "versionId": "770e8400-e29b-41d4-a716-446655440000",
  "flowId": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Added voice generation step",
  "created_at": "2024-12-04T14:00:00Z"
}
```

**Requirements**: 4.1

---

### List Versions

List all versions for a canvas.

**Endpoint**: `GET /api/flows/{id}/versions`

**Parameters**:
- `id` (path): Canvas UUID

**Response**: `200 OK`
```json
{
  "versions": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "flow_id": "550e8400-e29b-41d4-a716-446655440000",
      "description": "Added voice generation step",
      "created_at": "2024-12-04T14:00:00Z"
    }
  ]
}
```

**Requirements**: 4.1

---

### Get Version

Retrieve a specific version by ID.

**Endpoint**: `GET /api/flows/{id}/versions/{vid}`

**Parameters**:
- `id` (path): Canvas UUID
- `vid` (path): Version UUID

**Response**: `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "flow_id": "550e8400-e29b-41d4-a716-446655440000",
  "visual_graph": {
    "nodes": [...],
    "edges": [...]
  },
  "execution_graph": {
    "nodes": {...},
    "edges": {...}
  },
  "description": "Added voice generation step",
  "created_at": "2024-12-04T14:00:00Z"
}
```

**Requirements**: 4.1

---


## Demo & Testing

### Start Demo

Start a demo session with entity movement visualization.

**Endpoint**: `POST /api/demo/start`

**Request Body**:
```json
{
  "flowId": "550e8400-e29b-41d4-a716-446655440000",
  "entityName": "Monica",
  "entityType": "customer"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "entityId": "990e8400-e29b-41d4-a716-446655440000"
}
```

**Requirements**: 4.1

---

### Cleanup Demo

Clean up demo session data.

**Endpoint**: `POST /api/demo/cleanup`

**Request Body**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000"
}
```

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Requirements**: 4.1

---

### Seed Database

Seed the database with default BMC structure (development only).

**Endpoint**: `GET /api/seed`

**Response**: `200 OK`
```json
{
  "success": true,
  "canvasId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Requirements**: 4.1

---

### Seed Demo Journey

Seed the database with demo journey data (development only).

**Endpoint**: `POST /api/seed/demo`

**Response**: `200 OK`
```json
{
  "success": true,
  "canvasId": "550e8400-e29b-41d4-a716-446655440000",
  "runId": "660e8400-e29b-41d4-a716-446655440000"
}
```

**Requirements**: 4.1

---

### Health Check

Check integration health status.

**Endpoint**: `GET /api/integrations/health`

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-12-04T15:00:00Z",
  "integrations": {
    "claude": "configured",
    "minimax": "configured",
    "elevenlabs": "not_configured"
  }
}
```

**Requirements**: 4.1

---


## Authentication

Currently, the Stitch API does not enforce authentication on most endpoints. This is suitable for development and internal deployments.

### Future Authentication

For production deployments, consider implementing:

**Bearer Token Authentication**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/canvas
```

**API Key Authentication**:
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-domain.com/api/canvas
```

**Session-Based Authentication**:
- Use Next.js middleware to validate session cookies
- Integrate with Supabase Auth for user management

### Webhook Authentication

Webhooks support signature validation:

**Configuration**:
```typescript
{
  "endpoint_slug": "stripe-customers",
  "secret": "whsec_...",
  "signature_header": "stripe-signature"
}
```

**Validation**:
The webhook processor validates HMAC signatures using the configured secret.

---

## Error Handling

All API endpoints return standardized error responses.

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": ["Additional detail 1", "Additional detail 2"]
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input, malformed JSON, or validation failures |
| `NOT_FOUND` | 404 | Canvas, run, or resource not found |
| `INTERNAL_ERROR` | 500 | Database errors or unexpected failures |
| `VALIDATION_ERROR` | 400 | Canvas validation failed (cycles, disconnected nodes, etc.) |
| `PARSE_ERROR` | 400 | Mermaid parsing failed |
| `LLM_ERROR` | 401/500 | LLM API errors (401 for auth, 500 for others) |

### Example Error Responses

**Validation Error**:
```json
{
  "error": "Invalid canvas: missing or invalid nodes array",
  "code": "VALIDATION_ERROR"
}
```

**Parse Error**:
```json
{
  "error": "Mermaid parsing failed: Invalid syntax at line 3",
  "code": "PARSE_ERROR",
  "details": [
    "Hint: Check for missing arrow syntax",
    "Line: 3"
  ]
}
```

**Not Found Error**:
```json
{
  "error": "Canvas not found: 550e8400-e29b-41d4-a716-446655440000",
  "code": "NOT_FOUND"
}
```

### Error Handling Best Practices

1. **Always check HTTP status codes** before parsing response
2. **Use error codes for programmatic handling** instead of parsing error messages
3. **Display error details to users** for debugging
4. **Log full error responses** for troubleshooting
5. **Implement retry logic** for 500-level errors

**Example**:
```typescript
try {
  const response = await fetch('/api/canvas', {
    method: 'POST',
    body: JSON.stringify(canvasData)
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Handle specific error codes
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.error('Canvas validation failed:', error.details);
        break;
      case 'PARSE_ERROR':
        console.error('Mermaid parsing failed:', error.error);
        break;
      default:
        console.error('API error:', error.error);
    }
    
    throw new Error(error.error);
  }

  const result = await response.json();
  return result;
} catch (err) {
  console.error('Request failed:', err);
  throw err;
}
```

---


## Rate Limiting

Currently, the Stitch API does not enforce rate limiting. This is suitable for development and internal deployments.

### Future Rate Limiting

For production deployments, consider implementing:

**Per-User Rate Limits**:
- 100 requests per minute per user
- 1000 requests per hour per user

**Per-IP Rate Limits**:
- 60 requests per minute per IP
- 600 requests per hour per IP

**Endpoint-Specific Limits**:
- AI Manager: 10 requests per minute (LLM API costs)
- Workflow Execution: 20 runs per minute
- Canvas Creation: 30 creates per minute

**Implementation Options**:

1. **Redis-based rate limiting**:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429 }
    );
  }
  
  return NextResponse.next();
}
```

2. **Next.js middleware with in-memory cache**:
```typescript
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}
```

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701705600
```

---

## API Versioning

The current API is version 1.0. Future versions will be indicated in the URL path.

**Current**: `/api/canvas`  
**Future**: `/api/v2/canvas`

### Breaking Changes

Breaking changes will be introduced in new API versions:
- Changes to request/response schemas
- Removal of endpoints
- Changes to error codes
- Changes to authentication requirements

### Non-Breaking Changes

Non-breaking changes may be introduced without version changes:
- Adding new endpoints
- Adding optional request fields
- Adding response fields
- Adding new error codes

---

## Best Practices

### 1. Use Status URLs for Polling

When running workflows, use the `statusUrl` returned in the response:

```typescript
const runResponse = await fetch(`/api/canvas/${canvasId}/run`, {
  method: 'POST',
  body: JSON.stringify({ input: { prompt: 'Generate video' } })
});

const { statusUrl } = await runResponse.json();

// Poll status URL
let status = 'running';
while (status === 'running') {
  await sleep(2000);
  const statusResponse = await fetch(statusUrl);
  const statusData = await statusResponse.json();
  status = statusData.status;
}
```

### 2. Implement Exponential Backoff

Use exponential backoff for polling to reduce server load:

```typescript
let delay = 1000; // Start with 1 second
while (status === 'running') {
  await sleep(delay);
  const statusResponse = await fetch(statusUrl);
  const statusData = await statusResponse.json();
  status = statusData.status;
  delay = Math.min(delay * 1.5, 10000); // Max 10 seconds
}
```

### 3. Validate Canvas Structure

Before creating or updating canvases, validate the structure:

```typescript
function validateCanvas(canvas: VisualGraph): string[] {
  const errors: string[] = [];
  
  // Check for nodes
  if (!canvas.nodes || canvas.nodes.length === 0) {
    errors.push('Canvas must have at least one node');
  }
  
  // Check for unique node IDs
  const nodeIds = new Set(canvas.nodes.map(n => n.id));
  if (nodeIds.size !== canvas.nodes.length) {
    errors.push('Node IDs must be unique');
  }
  
  // Check edge references
  for (const edge of canvas.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references non-existent source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references non-existent target: ${edge.target}`);
    }
  }
  
  return errors;
}
```

### 4. Handle Webhook Signatures

Always validate webhook signatures in production:

```typescript
import crypto from 'crypto';

function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 5. Use Natural Language Effectively

Be specific in AI Manager requests:

❌ **Vague**: "Create a workflow"  
✅ **Specific**: "Create a workflow that takes user input, generates a script with Claude, creates a video with Minimax, and adds voiceover with ElevenLabs"

---

## Related Documentation

- [Canvas API](./canvas-api.md) - Detailed canvas management documentation
- [Workflow API](./workflow-api.md) - Detailed workflow execution documentation
- [Webhook API](./webhook-api.md) - Detailed webhook integration documentation
- [AI Manager API](./ai-manager-api.md) - Detailed AI Manager documentation
- [Error Handler](../../src/lib/api/error-handler.ts) - Error handling implementation
- [OpenAPI Specification](../../src/app/api/openapi.yaml) - Machine-readable API spec

---

**Last Updated**: 2024-12-05  
**API Version**: 1.0.0  
**Requirements**: 4.1
