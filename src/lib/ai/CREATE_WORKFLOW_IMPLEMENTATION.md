# CREATE_WORKFLOW Action Handler Implementation

## Overview

The CREATE_WORKFLOW action handler is now fully implemented in `src/lib/ai/action-executor.ts`. This handler validates and stores AI-generated workflows in the database.

## Implementation Details

### Function: `handleCreateWorkflow`

**Location:** `src/lib/ai/action-executor.ts`

**Purpose:** Validates AI-generated canvases and stores them in the database.

### Performance Optimization

The validation uses a **Set-based lookup** for node ID validation to achieve O(N) complexity instead of O(N²):
- A `Set<string>` of node IDs is built once at the start (O(N))
- All subsequent node existence checks use `Set.has()` which is O(1)
- This prevents O(N) lookups inside loops when validating entity movement and edges

### Validation Steps

The handler performs comprehensive validation in the following order:

#### 1. Node Property Validation (Requirement 4.5)
- Validates all nodes have required properties:
  - `id` (string)
  - `type` (string)
  - `data` (object)
  - `data.label` (string)

#### 2. Worker Node Validation (Requirements 7.3, 7.4)
For nodes with `type === 'worker'`:
- Validates `worker_type` field exists
- Validates `worker_type` is a valid worker from the registry (claude, minimax, elevenlabs, shotstack)
- Validates `config` is an object (if present)

#### 3. Entity Movement Validation (Requirements 10.1, 10.2, 10.3, 10.4, 10.5)
For worker nodes with `entityMovement` configuration:
- Validates `onSuccess` and `onFailure` actions (if present)
- For each action:
  - Validates `targetSectionId` exists and references a valid node
  - Validates `completeAs` has valid value (success, failure, neutral)
  - Validates `setEntityType` has valid value (customer, churned, lead) if present

#### 4. Edge Validation (Requirement 4.5)
- Validates all edges have required properties:
  - `id` (string)
  - `source` (references existing node)
  - `target` (references existing node)

#### 5. Graph Structure Validation (Requirement 4.1)
- Uses `validateGraph` to check for:
  - Cycles (would cause infinite loops)
  - Disconnected nodes
  - Invalid worker types
  - Invalid edge mappings

#### 6. Database Storage
- Creates flow with initial version using `createFlowWithVersion`
- Returns canvas ID and full canvas structure

## Error Handling

All validation errors throw `ActionExecutorError` with:
- Descriptive error message
- Error code (VALIDATION_ERROR, DATABASE_ERROR)
- Additional details (node ID, field name, etc.)

## Testing

### Unit Tests
Location: `src/lib/ai/__tests__/action-executor.test.ts`

Tests cover:
- Missing node properties (id, type, data, label)
- Missing worker_type on worker nodes
- Invalid worker_type values
- Missing entity movement fields
- Invalid entity movement values
- Non-existent edge references
- Invalid completeAs values
- Invalid setEntityType values

All 36 unit tests pass ✅

### Integration Tests
Location: `src/lib/ai/__tests__/create-workflow-integration.test.ts`

Tests cover:
- Creating simple workflows with UX nodes
- Creating workflows with worker nodes
- Creating workflows with entity movement configuration
- Creating workflows with multiple worker types
- Database storage and retrieval

All 4 integration tests pass ✅

## Usage Example

```typescript
import { handleCreateWorkflow, CreateWorkflowPayload } from '@/lib/ai/action-executor';

const payload: CreateWorkflowPayload = {
  name: 'Video Generation Workflow',
  canvas: {
    nodes: [
      {
        id: 'ux-1',
        type: 'ux',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'worker-1',
        type: 'worker',
        position: { x: 300, y: 100 },
        data: {
          label: 'Generate Script',
          worker_type: 'claude',
          config: {
            model: 'claude-sonnet-4-20250514',
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'ux-1',
        target: 'worker-1',
      },
    ],
  },
};

const result = await handleCreateWorkflow(payload);
console.log('Created canvas:', result.canvasId);
```

## Requirements Coverage

✅ **Requirement 4.1:** Validate generated canvas structure  
✅ **Requirement 4.5:** Check all nodes have required properties  
✅ **Requirement 7.3:** Check for valid worker types  
✅ **Requirement 7.4:** Verify worker configuration  
✅ **Requirement 10.1:** Verify entity movement configuration on worker nodes  
✅ **Requirement 10.2:** Verify onSuccess behavior  
✅ **Requirement 10.3:** Verify onFailure behavior  
✅ **Requirement 10.4:** Validate targetSectionId references existing node  
✅ **Requirement 10.5:** Validate completeAs field with target entity type  

## Next Steps

The CREATE_WORKFLOW handler is complete and ready for use. The next tasks in the implementation plan are:

- Task 17: Implement MODIFY_WORKFLOW action handler
- Task 18: Implement RUN_WORKFLOW action handler
- Task 19: Implement GET_STATUS action handler
- Task 20: Implement POST /api/ai-manager endpoint

These handlers will use the same validation patterns established in CREATE_WORKFLOW.
