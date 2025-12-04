# API Reference

Complete documentation for Canvas as Data API endpoints.

## Base URL

All endpoints are relative to your application's base URL:

```
https://your-app.com/api
```

## Authentication

All endpoints require authentication via Supabase. Include the session token in your requests.

## Endpoints

### Flow Management

#### Create Flow

Create a new flow with optional initial version.

```http
POST /api/flows
```

**Request Body:**

```typescript
{
  name: string;                    // Flow name
  canvas_type?: string;            // 'workflow' | 'bmc' | 'detail'
  parent_id?: string;              // Parent flow ID for nested canvases
  
  // Option 1: Mermaid (quick sketch)
  mermaid?: string;
  nodeConfigs?: Record<string, NodeConfig>;
  edgeMappings?: Record<string, EdgeMapping>;
  
  // Option 2: Full visual graph
  visualGraph?: VisualGraph;
  
  // Optional commit message
  commitMessage?: string;
}
```

**Response:**

```typescript
{
  flowId: string;
  versionId?: string;  // If initial version was created
}
```

**Example:**

```typescript
const response = await fetch('/api/flows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Video Factory',
    mermaid: `
      flowchart LR
        A[Input] --> B[Claude]
        B --> C[MiniMax]
        C --> D[Output]
    `,
    nodeConfigs: {
      B: { workerType: 'claude' },
      C: { workerType: 'minimax' }
    }
  })
});

const { flowId, versionId } = await response.json();
```

#### Get Flow

Retrieve flow metadata and optionally the current version.

```http
GET /api/flows/[id]?includeVersion=true
```

**Query Parameters:**

- `includeVersion` (optional): Include current version data

**Response:**

```typescript
{
  id: string;
  name: string;
  user_id: string;
  current_version_id: string | null;
  canvas_type: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  
  // If includeVersion=true
  currentVersion?: {
    id: string;
    visual_graph: VisualGraph;
    execution_graph: ExecutionGraph;
    commit_message: string | null;
    created_at: string;
  }
}
```

#### Update Flow

Update flow metadata (name, canvas_type, etc).

```http
PATCH /api/flows/[id]
```

**Request Body:**

```typescript
{
  name?: string;
  canvas_type?: string;
  parent_id?: string;
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

#### Delete Flow

Delete a flow and all its versions.

```http
DELETE /api/flows/[id]
```

**Response:**

```typescript
{
  success: boolean;
}
```

### Version Management

#### Create Version

Create a new version of a flow.

```http
POST /api/flows/[id]/versions
```

**Request Body:**

```typescript
{
  // Option 1: Mermaid
  mermaid?: string;
  nodeConfigs?: Record<string, NodeConfig>;
  edgeMappings?: Record<string, EdgeMapping>;
  
  // Option 2: Full visual graph
  visualGraph?: VisualGraph;
  
  // Optional commit message
  commitMessage?: string;
}
```

**Response:**

```typescript
{
  versionId: string;
  executionGraph: ExecutionGraph;
}
```

**Validation Errors:**

If the graph is invalid, returns 400 with:

```typescript
{
  error: string;
  validationErrors: ValidationError[];
}

interface ValidationError {
  type: 'cycle' | 'missing_input' | 'invalid_worker' | 'invalid_mapping';
  node?: string;
  edge?: string;
  field?: string;
  message: string;
}
```

**Important:** Validation uses **strict input mapping**. Required inputs must have:
- An explicit edge mapping (`edge.data.mapping[inputName]`), OR
- A default value (`inputDef.default`)

Merely connecting an edge without an explicit mapping is **not sufficient** for required inputs.

**Example:**

```typescript
const response = await fetch(`/api/flows/${flowId}/versions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visualGraph: updatedGraph,
    commitMessage: 'Added error handling node'
  })
});

if (!response.ok) {
  const { error, validationErrors } = await response.json();
  console.error('Validation failed:', validationErrors);
} else {
  const { versionId } = await response.json();
  console.log('Version created:', versionId);
}
```

#### List Versions

Get all versions for a flow, ordered by creation date (newest first).

**Note:** Returns lightweight metadata only to avoid bandwidth issues. Use `GET /api/flows/[id]/versions/[vid]` to fetch full version data including graphs.

```http
GET /api/flows/[id]/versions
```

**Response:**

```typescript
{
  versions: Array<{
    id: string;
    flow_id: string;
    commit_message: string | null;
    created_at: string;
    // Note: visual_graph and execution_graph are NOT included
    // Use GET /api/flows/[id]/versions/[vid] to fetch full version
  }>
}
```

**Example:**

```typescript
const response = await fetch(`/api/flows/${flowId}/versions`);
const { versions } = await response.json();

versions.forEach(version => {
  console.log(`${version.created_at}: ${version.commit_message || 'No message'}`);
});

// To get full version data with graphs:
const fullVersion = await fetch(`/api/flows/${flowId}/versions/${versions[0].id}`);
const versionData = await fullVersion.json();
console.log('Visual graph:', versionData.visual_graph);
```

#### Get Specific Version

Retrieve a specific version by ID.

```http
GET /api/flows/[id]/versions/[versionId]
```

**Response:**

```typescript
{
  id: string;
  flow_id: string;
  visual_graph: VisualGraph;
  execution_graph: ExecutionGraph;
  commit_message: string | null;
  created_at: string;
}
```

### Workflow Execution

#### Run Flow

Execute a flow with automatic versioning.

```http
POST /api/flows/[id]/run
```

**Request Body:**

```typescript
{
  // Optional: provide updated visual graph for auto-versioning
  visualGraph?: VisualGraph;
  
  // Optional: initial input data
  input?: Record<string, any>;
}
```

**Behavior:**

1. If `visualGraph` is provided and differs from current version:
   - Automatically creates a new version
   - Uses the new version for execution
2. If no `visualGraph` or no changes:
   - Uses current version
3. If no current version exists:
   - Returns error (must create version first)

**Response:**

```typescript
{
  runId: string;
  versionId: string;  // Version used for execution
  status: 'pending' | 'running';
}
```

**Example:**

```typescript
// Run with auto-versioning
const response = await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    visualGraph: currentCanvasState,
    input: { topic: 'AI in Healthcare' }
  })
});

const { runId, versionId } = await response.json();
console.log(`Run ${runId} started with version ${versionId}`);
```

## Data Types

### VisualGraph

```typescript
interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}

interface VisualNode {
  id: string;
  type: string;  // 'worker' | 'ux' | 'splitter' | 'collector'
  position: { x: number; y: number };
  data: {
    label: string;
    worker_type?: string;  // 'claude' | 'minimax' | 'elevenlabs' | 'shotstack'
    config?: Record<string, any>;
    inputs?: Record<string, InputSchema>;
    outputs?: Record<string, OutputSchema>;
    entityMovement?: EntityMovementConfig;
  };
  parentNode?: string;
  style?: Record<string, any>;
  width?: number;
  height?: number;
}

interface VisualEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  data?: {
    mapping?: EdgeMapping;
    [key: string]: any;
  };
}
```

### ExecutionGraph

```typescript
interface ExecutionGraph {
  // Nodes indexed by ID for O(1) lookup
  nodes: Record<string, ExecutionNode>;
  
  // Adjacency map for instant edge traversal
  adjacency: Record<string, string[]>;
  
  // Edge data indexed by "source->target"
  edgeData: Record<string, EdgeMapping>;
  
  // Entry points (nodes with no incoming edges)
  entryNodes: string[];
  
  // Terminal nodes (nodes with no outgoing edges)
  terminalNodes: string[];
}

interface ExecutionNode {
  id: string;
  type: string;
  worker_type?: string;
  config?: Record<string, any>;
  inputs?: Record<string, InputSchema>;
  outputs?: Record<string, OutputSchema>;
  entityMovement?: EntityMovementConfig;
}
```

### EdgeMapping

```typescript
// Maps target input names to source output paths
interface EdgeMapping {
  [targetInput: string]: string;  // JSONPath or simple key
}

// Example:
{
  "prompt": "output.script.text",
  "duration": "config.defaultDuration"
}
```

### NodeConfig

```typescript
interface NodeConfig {
  workerType?: string;
  config?: Record<string, any>;
  entityMovement?: EntityMovementConfig;
}
```

### InputSchema / OutputSchema

```typescript
interface InputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  required: boolean;
  description?: string;
  default?: any;
}

interface OutputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  description?: string;
}
```

## Error Responses

All endpoints return consistent error responses:

```typescript
{
  error: string;           // Human-readable error message
  code?: string;           // Error code for programmatic handling
  details?: any;           // Additional error details
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Graph validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Resource conflict (e.g., duplicate)
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate-limited per user:

- **Flow operations**: 100 requests per minute
- **Version operations**: 50 requests per minute
- **Run operations**: 20 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

## Webhooks

For long-running operations, consider using webhooks instead of polling:

```typescript
// Configure webhook URL in flow settings
{
  webhookUrl: 'https://your-app.com/webhook',
  events: ['run.completed', 'run.failed']
}
```

## SDK Examples

### TypeScript SDK

```typescript
import { StitchClient } from '@stitch/sdk';

const client = new StitchClient({
  baseUrl: 'https://your-app.com',
  apiKey: 'your-api-key'
});

// Create flow
const flow = await client.flows.create({
  name: 'My Workflow',
  mermaid: '...'
});

// Create version
const version = await client.flows.createVersion(flow.id, {
  visualGraph: updatedGraph,
  commitMessage: 'Updated workflow'
});

// Run flow
const run = await client.flows.run(flow.id, {
  input: { topic: 'AI' }
});

// Watch run status
await client.runs.watch(run.id, (status) => {
  console.log('Run status:', status);
});
```

## Best Practices

1. **Always validate before saving**: Use the compilation endpoint to validate graphs before creating versions
2. **Use commit messages**: Provide meaningful commit messages for version history
3. **Handle validation errors**: Display validation errors to users for quick fixes
4. **Auto-version on run**: Let the system auto-version when running with changes
5. **Cache versions**: Versions are immutable, cache them aggressively
6. **Use webhooks**: For long-running workflows, use webhooks instead of polling
