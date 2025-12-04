# Canvas Management API

The Canvas Management API provides REST endpoints for programmatic management of Stitch canvases (workflows).

## Endpoints

### Base Routes

#### `GET /api/canvas`
List all canvases with metadata.

**Response:**
```json
{
  "canvases": [
    {
      "id": "uuid",
      "name": "Canvas Name",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "node_count": 5,
      "edge_count": 4
    }
  ]
}
```

#### `POST /api/canvas`
Create a new canvas from JSON or Mermaid format.

**Request:**
```json
{
  "name": "My Workflow",
  "format": "json",
  "content": {
    "nodes": [
      {
        "id": "node-1",
        "type": "Worker",
        "position": { "x": 0, "y": 0 },
        "data": {
          "label": "Claude Worker",
          "worker_type": "claude"
        }
      }
    ],
    "edges": []
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "canvas": { /* VisualGraph */ }
}
```

### Individual Canvas Routes

#### `GET /api/canvas/[id]`
Retrieve a canvas by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "Canvas Name",
  "canvas": { /* VisualGraph */ },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### `PUT /api/canvas/[id]`
Update a canvas by ID.

**Request:**
```json
{
  "name": "Updated Name",
  "canvas": { /* VisualGraph */ }
}
```

**Response:**
```json
{
  "id": "uuid",
  "canvas": { /* VisualGraph */ },
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### `DELETE /api/canvas/[id]`
Delete a canvas by ID.

**Response:**
```json
{
  "success": true,
  "id": "uuid"
}
```

### Workflow Execution Routes

#### `POST /api/canvas/[id]/run`
Start workflow execution (to be implemented in task 10).

#### `GET /api/canvas/[id]/status`
Get workflow execution status (to be implemented in task 11).

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["Optional detail 1", "Optional detail 2"]
}
```

### Error Codes

- `BAD_REQUEST` (400): Invalid request format or parameters
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_ERROR` (500): Server error
- `VALIDATION_ERROR` (400): Validation failed
- `PARSE_ERROR` (400): Failed to parse input

## Implementation Details

### Type Definitions

All request/response types are defined in `src/types/canvas-api.ts`.

### Error Handling

Error handling utilities are provided in `src/lib/api/error-handler.ts`:
- `APIError`: Custom error class with status codes
- `createErrorResponse()`: Create standardized error responses
- `handleAPIError()`: Handle errors with consistent formatting
- `validateRequestBody()`: Validate request body exists
- `validateRequiredFields()`: Validate required fields
- `validateCanvasId()`: Validate canvas ID format

### Database Operations

Canvas CRUD operations use the existing `src/lib/db/flows.ts` module:
- `getAllFlows()`: List all flows
- `createFlowWithVersion()`: Create flow with initial version
- `getFlow()`: Get flow by ID
- `updateFlow()`: ⚠️ **DEPRECATED for graph updates** - Only use for metadata (name)
- `deleteFlow()`: Delete flow

### Versioning

All canvas operations use the versioning system:
- Creating a canvas automatically creates an initial version via `createFlowWithVersion()`
- Updating a canvas creates a new version snapshot via `createVersion()`
- Version history is maintained in `stitch_flow_versions` table

**⚠️ CRITICAL: Canvas Update Pattern**

When updating canvas structure, you MUST use the versioning system:

```typescript
// ✅ CORRECT: Update canvas structure
await createVersion(flowId, visualGraph, 'Updated via API');

// ❌ WRONG: This bypasses versioning and OEG compiler!
await updateFlow(flowId, { graph: { nodes, edges } });

// ✅ SAFE: Update metadata only
await updateFlow(flowId, { name: 'New Name' });
```

**Why this matters:**
- `createVersion()` compiles the canvas to OEG (Optimized Execution Graph)
- `createVersion()` updates the `current_version_id` pointer
- The Run button executes the current version
- Bypassing versioning means the Run button executes stale data

## Testing

Tests are located in:
- `src/app/api/canvas/__tests__/route.test.ts`
- `src/app/api/canvas/[id]/__tests__/route.test.ts`

Run tests:
```bash
npm test src/app/api/canvas
```

## Requirements Coverage

This implementation covers:
- **Requirement 1.1**: List all canvases (GET /api/canvas)
- **Requirement 1.2**: Create canvas (POST /api/canvas)
- **Requirement 1.3**: Get canvas by ID (GET /api/canvas/[id])
- **Requirement 1.4**: Update canvas (PUT /api/canvas/[id])
- **Requirement 1.5**: Delete canvas (DELETE /api/canvas/[id])
- **Requirement 9.1**: Invalid JSON error handling
- **Requirement 9.2**: Not found error handling
- **Requirement 9.3**: Database error handling

## Future Work

- Task 7: Implement Mermaid parser/generator
- Task 10: Implement workflow execution (POST /api/canvas/[id]/run)
- Task 11: Implement status monitoring (GET /api/canvas/[id]/status)
