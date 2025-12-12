# Canvas Management API

Complete reference for Canvas Management endpoints in the Stitch orchestration platform.

## Overview

The Canvas Management API provides programmatic access to create, read, update, and delete canvases (workflows and Business Model Canvas sections). Canvases are the core data structure in Stitch, representing visual graphs that can be executed as workflows.

**Base URL**: `/api/canvas`

**Key Features**:
- Create canvases from JSON or Mermaid format
- Automatic version management on updates
- OEG (Optimized Execution Graph) compilation
- Graph validation (cycles, disconnected nodes)
- Mermaid import/export support

## Table of Contents

- [Data Models](#data-models)
- [List All Canvases](#list-all-canvases)
- [Create Canvas](#create-canvas)
- [Get Canvas by ID](#get-canvas-by-id)
- [Update Canvas](#update-canvas)
- [Delete Canvas](#delete-canvas)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Data Models

### VisualGraph

The core canvas data structure representing the visual graph.

```typescript
interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}
```

### VisualNode

Represents a node in the visual graph.

```typescript
interface VisualNode {
  id: string;                    // Unique node identifier
  type: string;                  // Node type (worker, ux, splitter, collector, section, item)
  position: { x: number; y: number };  // Canvas position
  data: {
    label: string;               // Display label
    [key: string]: any;          // Type-specific data
  };
  parentNode?: string;           // Parent node ID (for nested nodes)
  extent?: 'parent';             // Constrain to parent bounds
  style?: Record<string, any>;   // Custom styling
  width?: number;                // Node width
  height?: number;               // Node height
}
```


### VisualEdge

Represents an edge (connection) in the visual graph.

```typescript
interface VisualEdge {
  id: string;                    // Unique edge identifier
  source: string;                // Source node ID
  target: string;                // Target node ID
  sourceHandle?: string;         // Source handle ID (for multiple outputs)
  targetHandle?: string;         // Target handle ID (for multiple inputs)
  type?: string;                 // Edge type (default, journey, etc.)
  animated?: boolean;            // Animate edge
  style?: Record<string, any>;   // Custom styling
  data?: Record<string, any>;    // Edge metadata
}
```

### CanvasMetadata

Lightweight canvas information for list responses.

```typescript
interface CanvasMetadata {
  id: string;                    // Canvas UUID
  name: string;                  // Canvas name
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
  node_count: number;            // Number of nodes
  edge_count: number;            // Number of edges
}
```

---

## List All Canvases

Retrieve a list of all canvases with metadata.

**Endpoint**: `GET /api/canvas`

**Authentication**: None (currently)

**Query Parameters**: None

### Response

**Status**: `200 OK`

**Body**:
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
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Customer Onboarding Flow",
      "created_at": "2024-12-03T14:00:00Z",
      "updated_at": "2024-12-03T16:00:00Z",
      "node_count": 8,
      "edge_count": 7
    }
  ]
}
```

### Response Schema

```typescript
interface ListCanvasesResponse {
  canvases: CanvasMetadata[];
}
```


### Implementation Details

- Fetches all flows from the database with version data
- Calculates node/edge counts from current version or legacy graph
- Returns lightweight metadata (no full graph structure)
- Sorted by creation date (newest first)

### Use Cases

- Display canvas list in UI
- Canvas selection for workflow execution
- Dashboard overview of all canvases
- Canvas management interface

### Example Request

```bash
curl -X GET https://your-domain.com/api/canvas
```

```typescript
const response = await fetch('/api/canvas');
const { canvases } = await response.json();

console.log(`Found ${canvases.length} canvases`);
canvases.forEach(canvas => {
  console.log(`${canvas.name}: ${canvas.node_count} nodes, ${canvas.edge_count} edges`);
});
```

---

## Create Canvas

Create a new canvas from JSON or Mermaid format.

**Endpoint**: `POST /api/canvas`

**Authentication**: None (currently)

**Content-Type**: `application/json`

### Request Body

```typescript
interface CreateCanvasRequest {
  name: string;                           // Canvas name
  format: 'json' | 'mermaid';            // Content format
  content: string | VisualGraph;         // Canvas content
}
```

### JSON Format

Create a canvas from a VisualGraph object.

**Request**:
```json
{
  "name": "Simple Workflow",
  "format": "json",
  "content": {
    "nodes": [
      {
        "id": "start",
        "type": "ux",
        "position": { "x": 0, "y": 0 },
        "data": { "label": "Start" }
      },
      {
        "id": "worker-1",
        "type": "worker",
        "position": { "x": 200, "y": 0 },
        "data": {
          "label": "Generate Text",
          "workerType": "claude",
          "config": {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1000
          }
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start",
        "target": "worker-1"
      }
    ]
  }
}
```


### Mermaid Format

Create a canvas from Mermaid flowchart syntax.

**Request**:
```json
{
  "name": "Simple Workflow",
  "format": "mermaid",
  "content": "flowchart LR\n    Start[Start] --> Worker[Generate Text]\n    Worker --> End[End]"
}
```

**Supported Mermaid Features**:
- Flowchart LR (left-to-right) and TD (top-down)
- Node shapes: `[]` (rectangle), `()` (rounded), `{}` (diamond)
- Node labels with text
- Directed edges with `-->`
- Edge labels with `-->|label|`

**Mermaid Parsing**:
- Automatically converts Mermaid syntax to VisualGraph
- Assigns node types based on labels (e.g., "Worker" → worker type)
- Calculates positions using auto-layout algorithm
- Validates graph structure (no cycles, connected nodes)

### Response

**Status**: `201 Created`

**Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "canvas": {
    "nodes": [
      {
        "id": "start",
        "type": "ux",
        "position": { "x": 0, "y": 0 },
        "data": { "label": "Start" }
      },
      {
        "id": "worker-1",
        "type": "worker",
        "position": { "x": 200, "y": 0 },
        "data": {
          "label": "Generate Text",
          "workerType": "claude",
          "config": {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1000
          }
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start",
        "target": "worker-1"
      }
    ]
  }
}
```

### Response Schema

```typescript
interface CreateCanvasResponse {
  id: string;                    // Created canvas UUID
  canvas: VisualGraph;           // Complete canvas structure
}
```


### Implementation Details

**Process Flow**:
1. Validate request body (name, format, content)
2. Parse content based on format:
   - **JSON**: Validate VisualGraph structure
   - **Mermaid**: Parse Mermaid syntax to VisualGraph
3. Validate graph structure (nodes, edges, references)
4. Create flow record in database
5. Create initial version with OEG compilation
6. Return canvas ID and structure

**Version Management**:
- Automatically creates initial version (v1)
- Compiles VisualGraph to OptimizedExecutionGraph (OEG)
- Stores both visual and execution graphs
- Sets version as current

**Graph Validation**:
- Ensures nodes array exists and is not empty
- Ensures edges array exists
- Validates edge references (source/target must exist)
- Checks for cycles (workflows cannot have cycles)
- Validates node types are recognized

### Errors

**400 BAD_REQUEST**:
```json
{
  "error": "Invalid JSON in request body",
  "code": "BAD_REQUEST"
}
```

**400 VALIDATION_ERROR**:
```json
{
  "error": "Invalid canvas: missing or invalid nodes array",
  "code": "VALIDATION_ERROR"
}
```

**400 PARSE_ERROR** (Mermaid):
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

**500 INTERNAL_ERROR**:
```json
{
  "error": "Database error: Failed to create canvas",
  "code": "INTERNAL_ERROR"
}
```

### Example Requests

**JSON Format**:
```bash
curl -X POST https://your-domain.com/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Workflow",
    "format": "json",
    "content": {
      "nodes": [...],
      "edges": [...]
    }
  }'
```


**Mermaid Format**:
```bash
curl -X POST https://your-domain.com/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Workflow",
    "format": "mermaid",
    "content": "flowchart LR\n    A[Start] --> B[Process]\n    B --> C[End]"
  }'
```

**TypeScript**:
```typescript
async function createCanvas(name: string, visualGraph: VisualGraph) {
  const response = await fetch('/api/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      format: 'json',
      content: visualGraph
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const { id, canvas } = await response.json();
  console.log(`Created canvas: ${id}`);
  return { id, canvas };
}
```

---

## Get Canvas by ID

Retrieve a specific canvas with its complete structure.

**Endpoint**: `GET /api/canvas/{id}`

**Authentication**: None (currently)

**Path Parameters**:
- `id` (required): Canvas UUID

### Response

**Status**: `200 OK`

**Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Video Generation Pipeline",
  "canvas": {
    "nodes": [
      {
        "id": "start",
        "type": "ux",
        "position": { "x": 0, "y": 0 },
        "data": { "label": "User Input" }
      },
      {
        "id": "worker-1",
        "type": "worker",
        "position": { "x": 200, "y": 0 },
        "data": {
          "label": "Generate Script",
          "workerType": "claude",
          "config": {
            "model": "claude-3-5-sonnet-20241022",
            "system_prompt": "You are a video script writer"
          }
        }
      },
      {
        "id": "worker-2",
        "type": "worker",
        "position": { "x": 400, "y": 0 },
        "data": {
          "label": "Generate Video",
          "workerType": "minimax",
          "config": {
            "model": "video-01"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start",
        "target": "worker-1"
      },
      {
        "id": "e2",
        "source": "worker-1",
        "target": "worker-2"
      }
    ]
  },
  "created_at": "2024-12-04T10:00:00Z",
  "updated_at": "2024-12-04T12:30:00Z"
}
```


### Response Schema

```typescript
interface GetCanvasResponse {
  id: string;                    // Canvas UUID
  name: string;                  // Canvas name
  canvas: VisualGraph;           // Complete canvas structure
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

### Implementation Details

**Process Flow**:
1. Validate canvas ID format (UUID)
2. Fetch flow from database with version data
3. Extract visual graph from current version or legacy graph
4. Return complete canvas structure with metadata

**Version Handling**:
- Returns visual graph from current version if available
- Falls back to legacy graph format if no versions exist
- Converts legacy StitchNode format to VisualNode format

**Use Cases**:
- Load canvas for editing in UI
- Retrieve canvas structure for execution
- Export canvas for backup or sharing
- Display canvas details

### Errors

**400 BAD_REQUEST**:
```json
{
  "error": "Invalid canvas ID format",
  "code": "BAD_REQUEST"
}
```

**404 NOT_FOUND**:
```json
{
  "error": "Canvas not found: 550e8400-e29b-41d4-a716-446655440000",
  "code": "NOT_FOUND"
}
```

**500 INTERNAL_ERROR**:
```json
{
  "error": "Database error: Failed to retrieve canvas",
  "code": "INTERNAL_ERROR"
}
```

### Example Requests

**cURL**:
```bash
curl -X GET https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000
```

**TypeScript**:
```typescript
async function getCanvas(id: string) {
  const response = await fetch(`/api/canvas/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const canvas = await response.json();
  console.log(`Loaded canvas: ${canvas.name}`);
  console.log(`Nodes: ${canvas.canvas.nodes.length}`);
  console.log(`Edges: ${canvas.canvas.edges.length}`);
  return canvas;
}
```

---


## Update Canvas

Update an existing canvas structure or metadata.

**Endpoint**: `PUT /api/canvas/{id}`

**Authentication**: None (currently)

**Content-Type**: `application/json`

**Path Parameters**:
- `id` (required): Canvas UUID

### Request Body

```typescript
interface UpdateCanvasRequest {
  name?: string;                 // Optional: Update canvas name
  canvas?: VisualGraph;          // Optional: Update canvas structure
}
```

**Update Name Only**:
```json
{
  "name": "Updated Workflow Name"
}
```

**Update Canvas Structure**:
```json
{
  "canvas": {
    "nodes": [
      {
        "id": "start",
        "type": "ux",
        "position": { "x": 0, "y": 0 },
        "data": { "label": "Start" }
      },
      {
        "id": "worker-1",
        "type": "worker",
        "position": { "x": 200, "y": 0 },
        "data": {
          "label": "Generate Text",
          "workerType": "claude"
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start",
        "target": "worker-1"
      }
    ]
  }
}
```

**Update Both**:
```json
{
  "name": "Updated Workflow Name",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  }
}
```

### Response

**Status**: `200 OK`

**Body**:
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

### Response Schema

```typescript
interface UpdateCanvasResponse {
  id: string;                    // Canvas UUID
  canvas: VisualGraph;           // Updated canvas structure
  updated_at: string;            // ISO 8601 timestamp
}
```


### Implementation Details

**Process Flow**:
1. Validate canvas ID format (UUID)
2. Validate request body (name and/or canvas)
3. Check if canvas exists
4. If canvas structure is provided:
   - Create new version using `createVersion()`
   - Compile to OEG (Optimized Execution Graph)
   - Validate graph structure
5. If name is provided:
   - Update flow metadata using `updateFlow()`
6. Fetch and return updated canvas

**Version Management** (Critical):
- ✅ **CORRECT**: Uses `createVersion()` for canvas structure updates
- ✅ Ensures versioning system is properly invoked
- ✅ Compiles VisualGraph to OptimizedExecutionGraph
- ✅ Maintains version history for reproducibility
- ⚠️ **SAFE**: Uses `updateFlow()` only for metadata (name)
- ⚠️ `updateFlow()` is deprecated for graph updates but safe for metadata

**Graph Validation**:
- Validates nodes array exists and is not empty
- Validates edges array exists
- Checks edge references (source/target must exist)
- Validates node types are recognized
- Checks for cycles (workflows cannot have cycles)

**Automatic Versioning**:
- Every canvas structure update creates a new version
- Version includes description: "Updated via API"
- Previous versions remain accessible
- Execution always uses versioned snapshots

### Use Cases

- Update canvas structure after user edits
- Rename canvas
- Add/remove nodes or edges
- Modify node configurations
- Reorganize canvas layout

### Errors

**400 BAD_REQUEST**:
```json
{
  "error": "Invalid JSON in request body",
  "code": "BAD_REQUEST"
}
```

**400 VALIDATION_ERROR**:
```json
{
  "error": "Invalid canvas: missing or invalid nodes array",
  "code": "VALIDATION_ERROR"
}
```

**404 NOT_FOUND**:
```json
{
  "error": "Canvas not found: 550e8400-e29b-41d4-a716-446655440000",
  "code": "NOT_FOUND"
}
```

**500 INTERNAL_ERROR**:
```json
{
  "error": "Failed to retrieve updated canvas",
  "code": "INTERNAL_ERROR"
}
```


### Example Requests

**Update Name Only**:
```bash
curl -X PUT https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Workflow Name"
  }'
```

**Update Canvas Structure**:
```bash
curl -X PUT https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "canvas": {
      "nodes": [...],
      "edges": [...]
    }
  }'
```

**TypeScript**:
```typescript
async function updateCanvas(id: string, updates: UpdateCanvasRequest) {
  const response = await fetch(`/api/canvas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  console.log(`Updated canvas: ${id}`);
  console.log(`Updated at: ${result.updated_at}`);
  return result;
}

// Update name only
await updateCanvas(canvasId, {
  name: "New Name"
});

// Update structure
await updateCanvas(canvasId, {
  canvas: {
    nodes: [...],
    edges: [...]
  }
});

// Update both
await updateCanvas(canvasId, {
  name: "New Name",
  canvas: {
    nodes: [...],
    edges: [...]
  }
});
```

---

## Delete Canvas

Delete a canvas by ID.

**Endpoint**: `DELETE /api/canvas/{id}`

**Authentication**: None (currently)

**Path Parameters**:
- `id` (required): Canvas UUID

### Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```


### Response Schema

```typescript
interface DeleteCanvasResponse {
  success: boolean;              // Always true on success
  id: string;                    // Deleted canvas UUID
}
```

### Implementation Details

**Process Flow**:
1. Validate canvas ID format (UUID)
2. Check if canvas exists
3. Delete canvas from database
4. Return success confirmation

**Cascade Deletion**:
- Deletes all associated versions
- Deletes all associated runs
- Deletes all associated entities
- Deletes all associated journey events

**Warning**: This operation is **irreversible**. All data associated with the canvas will be permanently deleted.

### Use Cases

- Remove test canvases
- Clean up unused workflows
- Delete deprecated canvases
- Canvas management interface

### Errors

**400 BAD_REQUEST**:
```json
{
  "error": "Invalid canvas ID format",
  "code": "BAD_REQUEST"
}
```

**404 NOT_FOUND**:
```json
{
  "error": "Canvas not found: 550e8400-e29b-41d4-a716-446655440000",
  "code": "NOT_FOUND"
}
```

**500 INTERNAL_ERROR**:
```json
{
  "error": "Database error: Failed to delete canvas",
  "code": "INTERNAL_ERROR"
}
```

### Example Requests

**cURL**:
```bash
curl -X DELETE https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000
```

**TypeScript**:
```typescript
async function deleteCanvas(id: string) {
  const response = await fetch(`/api/canvas/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  console.log(`Deleted canvas: ${result.id}`);
  return result;
}

// With confirmation
async function deleteCanvasWithConfirmation(id: string, name: string) {
  const confirmed = confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`);
  
  if (!confirmed) {
    return;
  }

  await deleteCanvas(id);
}
```

---


## Error Handling

All Canvas API endpoints return standardized error responses.

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;                 // Human-readable error message
  code: string;                  // Machine-readable error code
  details?: string[];            // Optional additional details
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input, malformed JSON, or validation failures |
| `NOT_FOUND` | 404 | Canvas not found |
| `VALIDATION_ERROR` | 400 | Canvas validation failed (invalid structure, cycles, etc.) |
| `PARSE_ERROR` | 400 | Mermaid parsing failed |
| `INTERNAL_ERROR` | 500 | Database errors or unexpected failures |

### Example Error Responses

**Invalid JSON**:
```json
{
  "error": "Invalid JSON in request body",
  "code": "BAD_REQUEST"
}
```

**Validation Error**:
```json
{
  "error": "Invalid canvas: missing or invalid nodes array",
  "code": "VALIDATION_ERROR"
}
```

**Mermaid Parse Error**:
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

**Not Found**:
```json
{
  "error": "Canvas not found: 550e8400-e29b-41d4-a716-446655440000",
  "code": "NOT_FOUND"
}
```

**Internal Error**:
```json
{
  "error": "Database error: Failed to create canvas",
  "code": "INTERNAL_ERROR"
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
async function createCanvasWithErrorHandling(name: string, canvas: VisualGraph) {
  try {
    const response = await fetch('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, format: 'json', content: canvas })
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error codes
      switch (error.code) {
        case 'VALIDATION_ERROR':
          console.error('Canvas validation failed:', error.details);
          alert(`Invalid canvas: ${error.error}`);
          break;
        case 'PARSE_ERROR':
          console.error('Mermaid parsing failed:', error.error);
          alert(`Parse error: ${error.error}\n${error.details?.join('\n')}`);
          break;
        default:
          console.error('API error:', error.error);
          alert(`Error: ${error.error}`);
      }
      
      throw new Error(error.error);
    }

    return await response.json();
  } catch (err) {
    console.error('Request failed:', err);
    throw err;
  }
}
```

---


## Best Practices

### 1. Validate Canvas Structure Before Submission

Always validate canvas structure client-side before sending to the API:

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
  
  // Check for cycles (simple DFS)
  const hasCycle = detectCycle(canvas);
  if (hasCycle) {
    errors.push('Canvas contains cycles (not allowed in workflows)');
  }
  
  return errors;
}

// Use before creating/updating
const errors = validateCanvas(myCanvas);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
  return;
}

await createCanvas('My Workflow', myCanvas);
```

### 2. Use Mermaid for Quick Prototyping

Mermaid format is ideal for quickly creating workflows:

```typescript
const mermaidContent = `
flowchart LR
    Start[User Input] --> Claude[Generate Script]
    Claude --> Minimax[Generate Video]
    Minimax --> End[Complete]
`;

await fetch('/api/canvas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Video Pipeline',
    format: 'mermaid',
    content: mermaidContent
  })
});
```

### 3. Handle Version Management

Canvas updates automatically create versions. Track version history:

```typescript
// Update canvas
const updateResponse = await fetch(`/api/canvas/${canvasId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ canvas: updatedCanvas })
});

// Fetch version history
const versionsResponse = await fetch(`/api/flows/${canvasId}/versions`);
const { versions } = await versionsResponse.json();

console.log(`Canvas has ${versions.length} versions`);
versions.forEach(v => {
  console.log(`- ${v.description} (${v.created_at})`);
});
```


### 4. Implement Optimistic UI Updates

Update UI immediately, then sync with server:

```typescript
async function updateCanvasOptimistic(
  id: string,
  updates: UpdateCanvasRequest,
  onOptimisticUpdate: (canvas: VisualGraph) => void,
  onServerUpdate: (canvas: VisualGraph) => void
) {
  // Apply optimistic update
  if (updates.canvas) {
    onOptimisticUpdate(updates.canvas);
  }

  try {
    // Send to server
    const response = await fetch(`/api/canvas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Update failed');
    }

    const result = await response.json();
    
    // Apply server update
    onServerUpdate(result.canvas);
  } catch (err) {
    // Revert optimistic update on error
    console.error('Failed to update canvas:', err);
    // Fetch current state from server
    const response = await fetch(`/api/canvas/${id}`);
    const current = await response.json();
    onServerUpdate(current.canvas);
  }
}
```

### 5. Batch Updates

If making multiple changes, batch them into a single update:

```typescript
// ❌ Bad: Multiple updates
await updateCanvas(id, { name: 'New Name' });
await updateCanvas(id, { canvas: updatedCanvas });

// ✅ Good: Single update
await updateCanvas(id, {
  name: 'New Name',
  canvas: updatedCanvas
});
```

### 6. Use TypeScript Types

Import and use the official types for type safety:

```typescript
import {
  VisualGraph,
  VisualNode,
  VisualEdge,
  CreateCanvasRequest,
  CreateCanvasResponse,
  UpdateCanvasRequest,
  UpdateCanvasResponse
} from '@/types/canvas-api';

async function createTypedCanvas(
  name: string,
  canvas: VisualGraph
): Promise<CreateCanvasResponse> {
  const request: CreateCanvasRequest = {
    name,
    format: 'json',
    content: canvas
  };

  const response = await fetch('/api/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error('Failed to create canvas');
  }

  return await response.json();
}
```

### 7. Handle Large Canvases

For large canvases, consider pagination or lazy loading:

```typescript
// Fetch metadata only
const { canvases } = await fetch('/api/canvas').then(r => r.json());

// Load full canvas on demand
async function loadCanvasOnDemand(id: string) {
  const canvas = await fetch(`/api/canvas/${id}`).then(r => r.json());
  return canvas;
}

// Display list with lazy loading
canvases.forEach(metadata => {
  console.log(`${metadata.name}: ${metadata.node_count} nodes`);
  // Load full canvas only when user clicks
});
```

---


## Examples

### Complete CRUD Workflow

```typescript
import {
  VisualGraph,
  CreateCanvasRequest,
  UpdateCanvasRequest
} from '@/types/canvas-api';

// 1. Create a canvas
async function example() {
  const canvas: VisualGraph = {
    nodes: [
      {
        id: 'start',
        type: 'ux',
        position: { x: 0, y: 0 },
        data: { label: 'Start' }
      },
      {
        id: 'worker-1',
        type: 'worker',
        position: { x: 200, y: 0 },
        data: {
          label: 'Generate Text',
          workerType: 'claude',
          config: {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'start',
        target: 'worker-1'
      }
    ]
  };

  const createResponse = await fetch('/api/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Text Generation Workflow',
      format: 'json',
      content: canvas
    })
  });

  const { id } = await createResponse.json();
  console.log(`Created canvas: ${id}`);

  // 2. Get the canvas
  const getResponse = await fetch(`/api/canvas/${id}`);
  const canvasData = await getResponse.json();
  console.log(`Loaded canvas: ${canvasData.name}`);
  console.log(`Nodes: ${canvasData.canvas.nodes.length}`);

  // 3. Update the canvas
  const updatedCanvas: VisualGraph = {
    ...canvasData.canvas,
    nodes: [
      ...canvasData.canvas.nodes,
      {
        id: 'worker-2',
        type: 'worker',
        position: { x: 400, y: 0 },
        data: {
          label: 'Generate Voice',
          workerType: 'elevenlabs',
          config: {
            voice_id: 'default'
          }
        }
      }
    ],
    edges: [
      ...canvasData.canvas.edges,
      {
        id: 'e2',
        source: 'worker-1',
        target: 'worker-2'
      }
    ]
  };

  const updateResponse = await fetch(`/api/canvas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Text & Voice Generation Workflow',
      canvas: updatedCanvas
    })
  });

  const updated = await updateResponse.json();
  console.log(`Updated canvas at: ${updated.updated_at}`);

  // 4. List all canvases
  const listResponse = await fetch('/api/canvas');
  const { canvases } = await listResponse.json();
  console.log(`Total canvases: ${canvases.length}`);

  // 5. Delete the canvas
  const deleteResponse = await fetch(`/api/canvas/${id}`, {
    method: 'DELETE'
  });

  const deleteResult = await deleteResponse.json();
  console.log(`Deleted canvas: ${deleteResult.id}`);
}
```


### React Hook for Canvas Management

```typescript
import { useState, useEffect } from 'react';
import { VisualGraph, CanvasMetadata } from '@/types/canvas-api';

export function useCanvas(id?: string) {
  const [canvas, setCanvas] = useState<VisualGraph | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load canvas by ID
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    fetch(`/api/canvas/${id}`)
      .then(r => r.json())
      .then(data => {
        setCanvas(data.canvas);
        setMetadata({
          id: data.id,
          name: data.name,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
        setError(null);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Create canvas
  const createCanvas = async (name: string, canvas: VisualGraph) => {
    setLoading(true);
    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, format: 'json', content: canvas })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      setCanvas(result.canvas);
      setError(null);
      return result.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update canvas
  const updateCanvas = async (updates: { name?: string; canvas?: VisualGraph }) => {
    if (!id) throw new Error('No canvas ID');

    setLoading(true);
    try {
      const response = await fetch(`/api/canvas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      setCanvas(result.canvas);
      if (updates.name) {
        setMetadata((prev: any) => ({ ...prev, name: updates.name }));
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete canvas
  const deleteCanvas = async () => {
    if (!id) throw new Error('No canvas ID');

    setLoading(true);
    try {
      const response = await fetch(`/api/canvas/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setCanvas(null);
      setMetadata(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    canvas,
    metadata,
    loading,
    error,
    createCanvas,
    updateCanvas,
    deleteCanvas
  };
}

// Usage in component
function CanvasEditor({ canvasId }: { canvasId: string }) {
  const { canvas, metadata, loading, error, updateCanvas } = useCanvas(canvasId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!canvas) return <div>Canvas not found</div>;

  const handleSave = async (updatedCanvas: VisualGraph) => {
    await updateCanvas({ canvas: updatedCanvas });
  };

  return (
    <div>
      <h1>{metadata.name}</h1>
      {/* Render canvas editor */}
    </div>
  );
}
```


### Mermaid Import/Export

```typescript
// Export canvas to Mermaid
function canvasToMermaid(canvas: VisualGraph): string {
  let mermaid = 'flowchart LR\n';
  
  // Add nodes
  canvas.nodes.forEach(node => {
    const label = node.data.label || node.id;
    mermaid += `    ${node.id}[${label}]\n`;
  });
  
  // Add edges
  canvas.edges.forEach(edge => {
    mermaid += `    ${edge.source} --> ${edge.target}\n`;
  });
  
  return mermaid;
}

// Import canvas from Mermaid
async function importFromMermaid(name: string, mermaidContent: string) {
  const response = await fetch('/api/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      format: 'mermaid',
      content: mermaidContent
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// Usage
const canvas: VisualGraph = {
  nodes: [
    { id: 'A', type: 'ux', position: { x: 0, y: 0 }, data: { label: 'Start' } },
    { id: 'B', type: 'worker', position: { x: 200, y: 0 }, data: { label: 'Process' } },
    { id: 'C', type: 'ux', position: { x: 400, y: 0 }, data: { label: 'End' } }
  ],
  edges: [
    { id: 'e1', source: 'A', target: 'B' },
    { id: 'e2', source: 'B', target: 'C' }
  ]
};

// Export to Mermaid
const mermaidContent = canvasToMermaid(canvas);
console.log(mermaidContent);
// Output:
// flowchart LR
//     A[Start]
//     B[Process]
//     C[End]
//     A --> B
//     B --> C

// Import from Mermaid
const imported = await importFromMermaid('My Workflow', mermaidContent);
console.log(`Imported canvas: ${imported.id}`);
```

### Canvas Validation Utility

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateCanvasStructure(canvas: VisualGraph): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check nodes exist
  if (!canvas.nodes || canvas.nodes.length === 0) {
    errors.push('Canvas must have at least one node');
    return { valid: false, errors, warnings };
  }

  // Check edges exist
  if (!canvas.edges) {
    errors.push('Canvas must have an edges array');
    return { valid: false, errors, warnings };
  }

  // Build node ID set
  const nodeIds = new Set(canvas.nodes.map(n => n.id));

  // Check for duplicate node IDs
  if (nodeIds.size !== canvas.nodes.length) {
    errors.push('Node IDs must be unique');
  }

  // Check edge references
  canvas.edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references non-existent source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references non-existent target: ${edge.target}`);
    }
  });

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleDFS(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const outgoingEdges = canvas.edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (hasCycleDFS(edge.target)) {
          return true;
        }
      } else if (recStack.has(edge.target)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of canvas.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycleDFS(node.id)) {
        errors.push('Canvas contains cycles (not allowed in workflows)');
        break;
      }
    }
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  canvas.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  canvas.nodes.forEach(node => {
    if (!connectedNodes.has(node.id) && canvas.nodes.length > 1) {
      warnings.push(`Node "${node.id}" is not connected to any other nodes`);
    }
  });

  // Check for required node data
  canvas.nodes.forEach(node => {
    if (!node.data.label) {
      warnings.push(`Node "${node.id}" is missing a label`);
    }
    if (node.type === 'worker' && !node.data.workerType) {
      errors.push(`Worker node "${node.id}" is missing workerType`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Usage
const result = validateCanvasStructure(myCanvas);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
  return;
}

if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}

// Proceed with API call
await createCanvas('My Workflow', myCanvas);
```

---


## Related Documentation

- [REST API Endpoints](./rest-endpoints.md) - Complete API reference
- [Workflow API](./workflow-api.md) - Workflow execution endpoints
- [Canvas System](../backend/canvas-system.md) - Backend canvas implementation
- [Version Manager](../../src/lib/canvas/version-manager.ts) - Version management implementation
- [OEG Compiler](../../src/lib/canvas/compile-oeg.ts) - Execution graph compilation
- [Mermaid Parser](../../src/lib/canvas/mermaid-parser.ts) - Mermaid import implementation
- [Canvas Types](../../src/types/canvas-api.ts) - TypeScript type definitions
- [Canvas Schema](../../src/types/canvas-schema.ts) - Visual graph schema

## Implementation Files

**API Routes**:
- `/src/app/api/canvas/route.ts` - List and create endpoints
- `/src/app/api/canvas/[id]/route.ts` - Get, update, delete endpoints

**Database Layer**:
- `/src/lib/db/flows.ts` - Database operations for canvases

**Canvas System**:
- `/src/lib/canvas/version-manager.ts` - Version management
- `/src/lib/canvas/compile-oeg.ts` - OEG compilation
- `/src/lib/canvas/validate-graph.ts` - Graph validation
- `/src/lib/canvas/mermaid-parser.ts` - Mermaid parsing
- `/src/lib/canvas/mermaid-generator.ts` - Mermaid generation

**Type Definitions**:
- `/src/types/canvas-api.ts` - API request/response types
- `/src/types/canvas-schema.ts` - Visual graph types
- `/src/types/execution-graph.ts` - Execution graph types

**Error Handling**:
- `/src/lib/api/error-handler.ts` - Standardized error handling

## Key Concepts

### Visual Graph vs Execution Graph

**Visual Graph** (VisualGraph):
- UI representation with positions, styles, React Flow properties
- Stored in `stitch_flow_versions.visual_graph`
- Used for canvas rendering and editing
- Contains all UI-specific data

**Execution Graph** (OptimizedExecutionGraph):
- Runtime representation with O(1) lookup structures
- Compiled from VisualGraph by OEG compiler
- Stored in `stitch_flow_versions.execution_graph`
- Optimized for edge-walking execution

### Version Management

Every canvas update creates a new version:
- **Version Snapshot**: Immutable copy of canvas at a point in time
- **OEG Compilation**: Visual graph compiled to execution graph
- **Version History**: All versions preserved for reproducibility
- **Current Version**: Latest version used for execution

### Graph Validation

Canvas validation ensures:
- **Structure**: Nodes and edges arrays exist
- **References**: All edge source/target nodes exist
- **Uniqueness**: Node IDs are unique
- **Cycles**: No cycles in workflow graphs
- **Types**: Node types are recognized
- **Configuration**: Required node data is present

---

**Last Updated**: 2024-12-05  
**API Version**: 1.0.0  
**Requirements**: 4.2

