# Design Document

## Overview

The Stitch MCP Server is a Model Context Protocol implementation that enables AI assistants to interact with the Stitch platform programmatically. The server exposes tools for creating canvas nodes and retrieving integration code, along with resources for accessing documentation. The implementation follows a modular architecture with clear separation between tools, resources, API communication, and backend endpoints.

The MCP server runs as a standalone Node.js process that communicates with AI assistants via stdio transport and with the Stitch platform via REST API calls. This design ensures loose coupling between the AI assistant layer and the Stitch platform while maintaining security through API key authentication.

## Architecture

### System Components

```
┌─────────────────┐
│  AI Assistant   │
│   (Claude)      │
└────────┬────────┘
         │ stdio
         │
┌────────▼────────┐
│   MCP Server    │
│  (stitch-mcp)   │
│                 │
│  ┌───────────┐  │
│  │   Tools   │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ Resources │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ API Client│  │
│  └───────────┘  │
└────────┬────────┘
         │ HTTPS + Bearer Token
         │
┌────────▼────────┐
│ Stitch Platform │
│   (Next.js)     │
│                 │
│  ┌───────────┐  │
│  │ API Routes│  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │  Supabase │  │
│  └───────────┘  │
└─────────────────┘
```

### Communication Flow

1. **AI Assistant → MCP Server**: AI assistant calls tools or requests resources via MCP protocol over stdio
2. **MCP Server → Stitch Platform**: MCP server makes authenticated REST API calls to Stitch endpoints
3. **Stitch Platform → Database**: Stitch platform persists changes to Supabase
4. **External Assets → Stitch Platform**: Deployed assets send webhooks and uptime pings to Stitch

### Package Structure

```
packages/stitch-mcp/
├── src/
│   ├── index.ts              # Server entry point
│   ├── lib/
│   │   ├── api.ts            # API client helper
│   │   └── templates.ts      # Code template generator
│   ├── tools/
│   │   ├── index.ts          # Tool registration
│   │   ├── create-node.ts    # Node creation tool
│   │   └── get-stitching-code.ts  # Code generation tool
│   └── resources/
│       ├── index.ts          # Resource registration
│       ├── dictionary.ts     # Terminology resource
│       └── instructions.ts   # Documentation resources
├── package.json
└── tsconfig.json
```

## Components and Interfaces

### MCP Server Core

**File**: `src/index.ts`

The server entry point initializes the MCP server with stdio transport and registers all tools and resources.

```typescript
interface ServerConfig {
  name: string;
  version: string;
}

interface ServerCapabilities {
  tools: {};
  resources: {};
}
```

**Responsibilities**:
- Load environment variables (STITCH_URL, STITCH_API_KEY)
- Initialize MCP Server instance
- Register tools and resources
- Connect stdio transport
- Handle startup errors

### API Client

**File**: `src/lib/api.ts`

Provides a centralized HTTP client for making authenticated requests to the Stitch platform.

```typescript
async function stitchRequest(
  path: string,
  options?: RequestInit
): Promise<any>
```

**Responsibilities**:
- Prepend STITCH_URL to request paths
- Add Authorization header with Bearer token
- Handle HTTP errors with descriptive messages
- Parse JSON responses
- Validate API key presence

### Code Template Generator

**File**: `src/lib/templates.ts`

Generates framework-specific integration code snippets for external assets.

```typescript
interface TemplateParams {
  nodeId: string;
  webhookUrl: string;
  uptimeUrl: string;
  framework: 'nextjs' | 'express' | 'python-flask';
  assetType: 'landing-page' | 'api';
}

function generateStitchingCode(params: TemplateParams): string
```

**Template Structure**:
- Helper utilities for API communication
- Health check endpoint implementation
- Webhook notification code
- Framework-specific setup instructions
- Asset-type-specific examples (forms, analytics, etc.)

### Tool: Create Node

**File**: `src/tools/create-node.ts`

Enables AI assistants to create nodes on the Stitch canvas.

```typescript
interface CreateNodeParams {
  canvasId: string;
  label: string;
  nodeType: 'asset' | 'worker' | 'integration';
  icon?: string;
  url?: string;
  position?: { x: number; y: number };
}

interface CreateNodeResponse {
  nodeId: string;
  webhookUrl: string;
  uptimeUrl: string;
}
```

**Implementation**:
1. Validate input parameters using Zod schema
2. Construct VisualNode object with default position if not provided
3. Call POST `/api/canvas/[canvasId]/nodes` endpoint
4. Return node ID and generated URLs

### Tool: Get Stitching Code

**File**: `src/tools/get-stitching-code.ts`

Provides framework-specific integration code for external assets.

```typescript
interface GetStitchingCodeParams {
  nodeId: string;
  framework: 'nextjs' | 'express' | 'python-flask';
  assetType: 'landing-page' | 'api';
}
```

**Implementation**:
1. Validate input parameters
2. Retrieve node details from Stitch API (to get webhook/uptime URLs)
3. Generate code using template generator
4. Return markdown-formatted code blocks with instructions

### Resource: Dictionary

**File**: `src/resources/dictionary.ts`

Exposes Stitch terminology and concepts to AI assistants.

```typescript
interface DictionaryResource {
  uri: 'stitch://dictionary/core';
  name: 'Stitch Core Dictionary';
  mimeType: 'application/json';
}
```

**Content Structure**:
```json
{
  "concepts": {
    "node": "A visual element on the canvas...",
    "edge": "A connection between nodes...",
    "entity": "A customer or lead traveling through workflows..."
  },
  "nodeTypes": {
    "asset": "External application integrated with Stitch",
    "worker": "Automated task processor",
    "integration": "Third-party service connection"
  }
}
```

### Resource: Instructions

**File**: `src/resources/instructions.ts`

Provides integration guides and best practices.

```typescript
interface InstructionResource {
  uri: 'stitch://instructions/overview' | 'stitch://instructions/landing-page';
  name: string;
  mimeType: 'text/markdown';
}
```

**Resources**:
- `overview`: High-level integration guide covering the Stitch protocol
- `landing-page`: Specific guidance for landing page integration (forms, analytics)

## Data Models

### VisualNode (Extended)

The MCP server creates nodes that conform to the existing VisualNode schema with MCP-specific extensions:

```typescript
interface MCPCreatedNode extends VisualNode {
  type: 'asset' | 'worker' | 'integration';
  data: {
    label: string;
    icon?: string;
    url?: string;
    uptime?: {
      enabled: boolean;
      lastSeen?: string;
      status?: 'healthy' | 'degraded' | 'down';
    };
    mcp?: {
      createdBy: 'mcp';
      createdAt: string;
    };
  };
}
```

### Webhook Event

Stored when external assets send events to Stitch:

```typescript
interface WebhookEvent {
  id: string;
  node_id: string;
  payload: Record<string, any>;
  received_at: string;
  processed: boolean;
}
```

### Uptime Record

Tracks health status of external assets:

```typescript
interface UptimeRecord {
  node_id: string;
  last_seen: string;
  status?: string;
  metadata?: Record<string, any>;
}
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Node creation returns complete metadata

*For any* valid node creation request, the response should contain a node ID, webhook URL, and uptime monitoring URL.
**Validates: Requirements 1.2**

### Property 2: Node position is preserved

*For any* node creation request that includes position coordinates, the created node should have exactly those coordinates.
**Validates: Requirements 1.3**

### Property 3: Node type validation

*For any* node creation request, the node type should be rejected unless it is one of: "asset", "worker", or "integration".
**Validates: Requirements 1.5**

### Property 4: Framework-specific code generation

*For any* valid framework parameter ("nextjs", "express", "python-flask"), the generated stitching code should contain framework-specific syntax and imports.
**Validates: Requirements 2.1**

### Property 5: Instruction resources return markdown

*For any* instruction resource request (overview, landing-page), the returned content should be valid markdown format.
**Validates: Requirements 3.5**

### Property 6: Webhook events are persisted

*For any* valid webhook POST request, the event should be stored in the database with timestamp, payload, and node ID.
**Validates: Requirements 4.1, 4.3**

### Property 7: Webhook validates node existence

*For any* webhook request, if the node ID does not exist in the database, the response should be a 404 error.
**Validates: Requirements 4.2**

### Property 8: Malformed webhook requests return 400

*For any* webhook request with invalid JSON or missing required fields, the response should be a 400 error with details.
**Validates: Requirements 4.4**

### Property 9: Uptime pings update timestamp

*For any* valid uptime ping request, the node's last_seen timestamp should be updated to the current time.
**Validates: Requirements 5.1, 5.2**

### Property 10: Uptime status is stored

*For any* uptime ping that includes status information, the status should be persisted in the database.
**Validates: Requirements 5.3**

### Property 11: Node display includes uptime status

*For any* node with recent uptime pings, the node rendering should include uptime status information.
**Validates: Requirements 5.5**

### Property 12: API requests include authentication

*For any* API request made by the MCP server, the Authorization header should contain the Bearer token.
**Validates: Requirements 6.1**

### Property 13: Unauthenticated requests are rejected

*For any* API request without valid authentication, the Stitch platform should return a 401 error.
**Validates: Requirements 6.3**

### Property 14: Custom STITCH_URL is respected

*For any* configured STITCH_URL value, all API requests should use that URL as the base.
**Validates: Requirements 6.4**

### Property 15: API errors include status codes

*For any* failed Stitch API request, the error message should include the HTTP status code.
**Validates: Requirements 7.1**

### Property 16: Invalid tool parameters return validation errors

*For any* tool call with invalid parameters, the MCP server should return a clear validation error message.
**Validates: Requirements 7.2**

### Property 17: Network errors are handled gracefully

*For any* network error during API communication, the MCP server should catch the error and return a user-friendly message.
**Validates: Requirements 7.3**

### Property 18: Missing resources return descriptive errors

*For any* request for a non-existent resource, the error message should include the requested resource URI.
**Validates: Requirements 7.4**

### Property 19: Unknown tools return descriptive errors

*For any* call to a non-existent tool, the error message should include the tool name that was requested.
**Validates: Requirements 7.5**

## Error Handling

### MCP Server Errors

**Startup Errors**:
- Missing STITCH_API_KEY: Throw error immediately with clear message
- Invalid environment configuration: Log error and exit with code 1
- Stdio transport connection failure: Log error and exit with code 1

**Runtime Errors**:
- Tool execution failures: Return MCP error response with details
- Resource read failures: Return MCP error response with URI
- API communication errors: Wrap in user-friendly message with status code

### API Endpoint Errors

**Webhook Endpoint** (`/api/webhooks/node/[nodeId]`):
- 400: Malformed JSON or missing required fields
- 404: Node ID does not exist
- 500: Database or internal server error

**Uptime Endpoint** (`/api/uptime/ping/[nodeId]`):
- 404: Node ID does not exist
- 500: Database or internal server error

**Node Creation Endpoint** (`/api/canvas/[canvasId]/nodes`):
- 400: Invalid node data or missing required fields
- 401: Missing or invalid authentication
- 404: Canvas ID does not exist
- 500: Database or internal server error

### Error Response Format

All API endpoints should return consistent error responses:

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  statusCode: number;
}
```

## Testing Strategy

### Unit Testing

**MCP Server Components**:
- API client: Test request construction, header injection, error handling
- Template generator: Test code generation for each framework/asset type combination
- Tool handlers: Test parameter validation and response formatting
- Resource handlers: Test resource retrieval and content formatting

**API Endpoints**:
- Webhook endpoint: Test event storage, validation, error cases
- Uptime endpoint: Test timestamp updates, status storage, error cases
- Node creation endpoint: Test node creation, validation, error cases

**Test Framework**: Vitest (already used in the Stitch project)

### Property-Based Testing

Property-based tests will use `fast-check` library to generate random inputs and verify properties hold across many test cases.

**Key Properties to Test**:
- Node creation with random valid parameters always returns complete metadata
- Webhook events with random payloads are always persisted correctly
- API requests with random valid data always include authentication headers
- Error responses always include required fields (error, message, statusCode)

**Configuration**: Each property test should run a minimum of 100 iterations.

### Integration Testing

**End-to-End Flows**:
1. Create node via MCP tool → Verify node exists in database
2. Generate stitching code → Verify code compiles/runs
3. Send webhook from external asset → Verify event stored
4. Send uptime ping → Verify timestamp updated
5. Request resources → Verify content returned

**Test Environment**:
- Use test Supabase instance
- Mock external HTTP calls where appropriate
- Use in-memory stdio transport for MCP testing

### Manual Testing

**Claude Desktop Integration**:
1. Configure MCP server in Claude Desktop config
2. Restart Claude Desktop
3. Verify tools appear in Claude's tool list
4. Test conversational node creation
5. Test code generation and deployment

## API Endpoints

### POST /api/canvas/[canvasId]/nodes

Creates a new node on the specified canvas.

**Request**:
```typescript
{
  label: string;
  type: 'asset' | 'worker' | 'integration';
  data: {
    label: string;
    icon?: string;
    url?: string;
    uptime?: { enabled: boolean };
  };
  position?: { x: number; y: number };
}
```

**Response**:
```typescript
{
  id: string;
  label: string;
  type: string;
  position: { x: number; y: number };
  data: { ... };
}
```

**Implementation**:
1. Validate canvas exists
2. Validate authentication
3. Generate unique node ID
4. Add node to canvas graph JSON
5. Update canvas in database
6. Return created node

### POST /api/webhooks/node/[nodeId]

Receives webhook events from external assets.

**Request**:
```typescript
{
  event: string;
  data: Record<string, any>;
  timestamp?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  eventId: string;
}
```

**Implementation**:
1. Validate node exists
2. Parse and validate payload
3. Insert event into `stitch_webhook_events` table
4. Return success with event ID

### POST /api/uptime/ping/[nodeId]

Receives uptime heartbeat from external assets.

**Request**:
```typescript
{
  status?: 'healthy' | 'degraded' | 'down';
  metadata?: Record<string, any>;
}
```

**Response**:
```typescript
{
  success: boolean;
  lastSeen: string;
}
```

**Implementation**:
1. Validate node exists
2. Update node's last_seen timestamp
3. Store status if provided
4. Return success with timestamp

## Database Schema

### stitch_webhook_events

Stores webhook events received from external assets.

```sql
CREATE TABLE stitch_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_node_id ON stitch_webhook_events(node_id);
CREATE INDEX idx_webhook_events_received_at ON stitch_webhook_events(received_at);
```

### stitch_node_uptime

Tracks uptime status for nodes with monitoring enabled.

```sql
CREATE TABLE stitch_node_uptime (
  node_id TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL,
  status TEXT,
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_node_uptime_last_seen ON stitch_node_uptime(last_seen);
```

## Deployment

### MCP Server Deployment

**Local Development**:
```bash
cd packages/stitch-mcp
npm install
npm run dev
```

**Production Build**:
```bash
npm run build
npm start
```

**Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "stitch": {
      "command": "node",
      "args": ["/absolute/path/to/stitch-run/packages/stitch-mcp/dist/index.js"],
      "env": {
        "STITCH_URL": "https://your-stitch-instance.com",
        "STITCH_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### API Endpoints Deployment

The new API endpoints are part of the main Stitch Next.js application and deploy automatically with the application.

**Environment Variables**:
- `STITCH_API_KEY`: API key for authenticating MCP server requests (should match the key configured in Claude Desktop)
- `NEXT_PUBLIC_BASE_URL`: Base URL for generating webhook and uptime URLs

## Security Considerations

1. **API Key Management**: API keys should be stored securely and never committed to version control
2. **Webhook Validation**: Consider adding HMAC signature validation for webhook requests
3. **Rate Limiting**: Implement rate limiting on webhook and uptime endpoints to prevent abuse
4. **Input Sanitization**: All user inputs should be validated and sanitized before database storage
5. **CORS Configuration**: Webhook endpoints should have appropriate CORS headers for external assets

## Performance Considerations

1. **Database Indexing**: Indexes on node_id and timestamps ensure fast webhook/uptime queries
2. **Payload Size Limits**: Webhook payloads should have reasonable size limits (e.g., 1MB)
3. **Connection Pooling**: Use Supabase connection pooling for high-throughput scenarios
4. **Async Processing**: Consider async processing for webhook events if they trigger complex workflows

## Future Enhancements

1. **Webhook Retry Logic**: Implement retry mechanism for failed webhook deliveries
2. **Uptime Monitoring Dashboard**: Visual dashboard showing uptime status across all monitored nodes
3. **Event Streaming**: Real-time event streaming for webhook events
4. **Multi-Language Support**: Add templates for more frameworks (Ruby, Go, Rust)
5. **Advanced Analytics**: Track webhook patterns and uptime trends over time
