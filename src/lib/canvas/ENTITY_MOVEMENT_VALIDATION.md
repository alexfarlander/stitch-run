# Entity Movement Validation

## Overview

Entity movement validation ensures that worker nodes have properly configured entity movement rules that determine how entities (customers/leads) move through the canvas when workflows complete.

## Requirements

This implementation satisfies:
- **Requirement 10.4**: Validate targetSectionId references existing node
- **Requirement 10.5**: Validate completeAs has valid value and setEntityType has valid entity type

## Implementation

### Location

The validation is implemented in `src/lib/canvas/validate-graph.ts` and integrated into the main `validateGraph()` function.

### Validation Rules

#### 1. targetSectionId Validation (Requirement 10.4)

- **Required**: Must be present and be a string
- **Must Reference Existing Node**: The targetSectionId must reference a node that exists in the canvas
- **Error Message**: Provides clear feedback when a non-existent node is referenced

#### 2. completeAs Validation (Requirement 10.5)

- **Required**: Must be present and be a string
- **Valid Values**: Must be one of: `'success'`, `'failure'`, `'neutral'`
- **Error Message**: Lists valid values when an invalid value is provided

#### 3. setEntityType Validation (Requirement 10.5)

- **Optional**: This field is not required
- **Valid Values** (if present): Must be one of: `'customer'`, `'churned'`, `'lead'`
- **Type Check**: Must be a string if provided
- **Error Message**: Lists valid entity types when an invalid value is provided

### Structure

Entity movement configuration on worker nodes:

```typescript
{
  entityMovement: {
    onSuccess: {
      targetSectionId: 'node-id',      // Required, must exist
      completeAs: 'success',            // Required, must be valid
      setEntityType: 'customer'         // Optional, must be valid if present
    },
    onFailure: {
      targetSectionId: 'error-node',   // Required, must exist
      completeAs: 'failure'             // Required, must be valid
    }
  }
}
```

## Integration

The entity movement validation is integrated into the canvas validation pipeline:

1. **validateGraph()** - Main validation function that calls all validators
2. **validateEntityMovement()** - Specific validator for entity movement
3. **compileToOEG()** - Uses validateGraph before compilation
4. **AI Manager** - Uses validateGraph when creating/modifying workflows

## Test Coverage

### Unit Tests

Located in `src/lib/canvas/__tests__/entity-movement-validation.test.ts`:

- ✅ Valid entity movement configuration
- ✅ Invalid targetSectionId (non-existent node)
- ✅ Missing targetSectionId
- ✅ Invalid completeAs value
- ✅ All valid completeAs values
- ✅ Missing completeAs
- ✅ Valid setEntityType values
- ✅ Invalid setEntityType value
- ✅ Optional setEntityType
- ✅ Both onSuccess and onFailure validation
- ✅ Optional entityMovement
- ✅ Only validates worker nodes

### Integration Tests

Located in `src/lib/canvas/__tests__/entity-movement-integration.test.ts`:

- ✅ Compilation rejects invalid entity movement
- ✅ Compilation rejects invalid completeAs
- ✅ Compilation accepts valid entity movement
- ✅ Compilation accepts canvas without entity movement

## Error Messages

The validation provides clear, actionable error messages:

### Missing targetSectionId
```
Worker node "worker1" entityMovement.onSuccess missing required "targetSectionId"
```

### Non-existent targetSectionId
```
Worker node "worker1" entityMovement.onSuccess.targetSectionId references non-existent node: "non-existent-node"
```

### Invalid completeAs
```
Worker node "worker1" entityMovement.onSuccess.completeAs has invalid value: "invalid-value" (must be one of: success, failure, neutral)
```

### Invalid setEntityType
```
Worker node "worker1" entityMovement.onSuccess.setEntityType has invalid value: "invalid-type" (must be one of: customer, churned, lead)
```

## Usage

The validation runs automatically when:

1. **Creating workflows via AI Manager**: Validates before storing in database
2. **Modifying workflows via AI Manager**: Validates after applying modifications
3. **Compiling canvases**: Validates before generating execution graph
4. **Manual validation**: Can be called directly via `validateGraph()`

## Example

```typescript
import { validateGraph } from '@/lib/canvas/validate-graph';

const graph: VisualGraph = {
  nodes: [
    {
      id: 'worker1',
      type: 'worker',
      data: {
        worker_type: 'claude',
        entityMovement: {
          onSuccess: {
            targetSectionId: 'section1',
            completeAs: 'success',
            setEntityType: 'customer'
          }
        }
      }
    },
    {
      id: 'section1',
      type: 'section',
      data: { label: 'Section 1' }
    }
  ],
  edges: []
};

const errors = validateGraph(graph);
if (errors.length > 0) {
  console.error('Validation failed:', errors);
}
```

## Notes

- Entity movement is **optional** - worker nodes can exist without it
- Only **worker nodes** are validated for entity movement
- Validation is **strict** - all required fields must be present and valid
- Error messages are **descriptive** - they guide users to fix issues
- Validation is **integrated** - runs automatically in the validation pipeline
