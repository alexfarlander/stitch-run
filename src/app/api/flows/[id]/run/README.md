# Flow Run API Endpoint

## Overview

This endpoint handles workflow execution with automatic versioning support. It implements the "Run" button behavior where unsaved changes are automatically versioned before execution begins.

## Endpoint

```
POST /api/flows/[id]/run
```

## Request Body

```typescript
{
  visualGraph?: VisualGraph;  // Optional: Current visual graph from UI
  entityId?: string;           // Optional: Entity to attach to run
  input?: any;                 // Optional: Initial input data
}
```

## Response

```typescript
{
  runId: string;      // The created run ID
  versionId: string;  // The version ID used for execution
  status: string;     // Initial run status ("started")
}
```

## Behavior

### With Visual Graph (Auto-Versioning)

When `visualGraph` is provided in the request:

1. Calls `autoVersionOnRun(flowId, visualGraph)`
2. Compares current graph with saved version
3. If changes detected: creates new version
4. If no changes: uses current version
5. Creates run with the version ID
6. Starts execution

**Validates Requirement 5.1**: Auto-version on run with unsaved changes

### Without Visual Graph (Use Current Version)

When no `visualGraph` is provided:

1. Uses flow's `current_version_id`
2. Returns 400 if no current version exists
3. Creates run with current version ID
4. Starts execution

**Validates Requirement 5.2**: Run references specific version

## Error Responses

### 404 - Flow Not Found
```json
{
  "error": "Flow not found"
}
```

### 400 - No Current Version
```json
{
  "error": "Flow has no current version. Please save the flow first."
}
```

### 400 - Validation Failed
```json
{
  "error": "Failed to create version",
  "details": "Graph validation failed: ..."
}
```

### 500 - Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "..."
}
```

## Implementation Details

### Auto-Versioning Logic

The `autoVersionOnRun` function:
1. Fetches current version from database
2. Deep compares visual graphs
3. Creates new version only if changes detected
4. Returns version ID to use for run

### Execution Start

The `startRun` function:
1. Creates run record with `flow_version_id`
2. Loads execution graph from version
3. Initializes node states
4. Fires entry nodes to begin execution

## Testing

See `__tests__/route.test.ts` for comprehensive test coverage including:
- Auto-versioning with visual graph
- Using current version without graph
- Entity and input passing
- Error handling (404, 400, 500)

## Requirements Validated

- **5.1**: Auto-version on run with unsaved changes
- **5.2**: Run references specific version and uses execution graph
