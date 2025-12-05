# AI Validation Module

This module provides validation utilities for AI-generated graph updates to ensure they use valid worker types and connect to existing nodes before being applied to the canvas.

## Overview

The AI validation system prevents invalid graph updates from being applied to the canvas by validating:
1. **Worker Types** - All nodes must use valid worker types from the registry
2. **Edge Connections** - All edges must connect to existing or new nodes

## Files

- `validation.ts` - Core validation logic and utilities
- `__tests__/validation.test.ts` - Comprehensive unit tests (17 tests)

## Usage

### Basic Validation

```typescript
import { validateGraphUpdate } from '@/lib/ai/validation';

// Validate a complete graph update
const result = validateGraphUpdate(
  {
    nodes: [...],
    edges: [...]
  },
  existingNodes
);

if (!result.valid) {
  console.error('Validation failed:', result.errors);
}
```

### In AIAssistantPanel

```typescript
import { validateGraphUpdate, formatValidationErrors } from '@/lib/ai/validation';

// Validate before applying
const validation = validateGraphUpdate(graph, currentNodes);

if (!validation.valid) {
  // Show error in chat
  const errorMessage = formatValidationErrors(validation.errors);
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: errorMessage
  }]);
} else {
  // Apply the update
  onGraphUpdate(graph);
}
```

## API Reference

### `validateWorkerTypes(nodes: Node[]): ValidationResult`

Validates that all nodes use valid worker types from the registry.

**Returns:** `{ valid: boolean, errors: ValidationError[] }`

**Validates:**
- Each node has a `workerType` or `type` field
- The worker type exists in `WORKER_DEFINITIONS`

### `validateEdgeConnections(edges: Edge[], existingNodes: Node[], newNodes?: Node[]): ValidationResult`

Validates that all edges connect to existing nodes.

**Returns:** `{ valid: boolean, errors: ValidationError[] }`

**Validates:**
- Each edge has source and target
- Source and target nodes exist (in existing or new nodes)

### `validateGraphUpdate(graph: { nodes: Node[], edges: Edge[] }, existingNodes: Node[]): ValidationResult`

Validates a complete graph update (both worker types and edges).

**Returns:** `{ valid: boolean, errors: ValidationError[] }`

**Validates:**
- All worker types are valid
- All edge connections are valid

### `formatValidationErrors(errors: ValidationError[]): string`

Formats validation errors into a user-friendly message for display in chat.

**Returns:** Formatted error message with bullet points and helpful guidance

## Validation Rules

### Worker Type Validation (Property 31)

For any node created by the AI, the worker type SHALL exist in the WORKER_DEFINITIONS registry.

**Valid Worker Types:**
- `claude` - Claude Script Generator
- `minimax` - MiniMax Video Generator
- `elevenlabs` - ElevenLabs Voice Generator
- `shotstack` - Shotstack Video Assembler

**Error Messages:**
- "Node 'X' is missing a worker type"
- "Invalid worker type 'X' for node 'Y'. Valid types are: claude, minimax, elevenlabs, shotstack"

### Edge Connection Validation (Property 32)

For any edge created by the AI, both the source and target nodes SHALL exist in the canvas.

**Validation Logic:**
- Checks against existing nodes on canvas
- Checks against new nodes being added in same update
- Allows edges between new nodes

**Error Messages:**
- "Edge 'X' is missing a source node"
- "Edge 'X' references non-existent source node 'Y'"
- "Edge 'X' is missing a target node"
- "Edge 'X' references non-existent target node 'Y'"

## Error Handling

### ValidationError Interface

```typescript
interface ValidationError {
  field: string;        // e.g., "node.1.workerType"
  message: string;      // Human-readable error message
  details?: any;        // Additional context (nodeId, edgeId, etc.)
}
```

### ValidationResult Interface

```typescript
interface ValidationResult {
  valid: boolean;       // true if no errors
  errors: ValidationError[];  // Array of validation errors
}
```

## Testing

The validation module has comprehensive test coverage:

### Unit Tests (17 tests)
- Worker type validation (4 tests)
- Edge connection validation (6 tests)
- Complete graph validation (3 tests)
- Error formatting (4 tests)

### Integration Tests (8 tests)
- Valid graph updates accepted
- Invalid worker types rejected
- Invalid edge connections rejected
- Multiple errors collected
- Error message formatting

**Run tests:**
```bash
npm test src/lib/ai/__tests__/validation.test.ts
```

## Requirements

This module implements the following requirements:

- **9.3** - Validate that AI-created nodes use valid worker types from registry
- **9.4** - Validate that AI-created edges connect to existing nodes
- **9.5** - Display error messages in chat for invalid operations

## Properties

This module validates the following correctness properties:

- **Property 31:** AI worker type validation - For any node created by the AI, the worker type SHALL exist in the WORKER_DEFINITIONS registry
- **Property 32:** AI edge validation - For any edge created by the AI, both the source and target nodes SHALL exist in the canvas

## Integration

### AIAssistantPanel

The validation module is integrated into the AI Assistant Panel:

1. Panel receives `currentNodes` prop with existing canvas nodes
2. When AI responds with graph update, validation runs first
3. If validation passes, graph update is applied
4. If validation fails, error message is shown in chat

### Worker Registry

The validation module imports from the worker registry:

```typescript
import { isValidWorkerType, getAvailableWorkerTypes } from '@/lib/workers/registry';
```

This ensures validation always uses the latest worker definitions.

## Future Enhancements

Potential improvements for future iterations:

1. **Schema Validation** - Validate node input fields against worker schemas
2. **Cycle Detection** - Detect and prevent circular dependencies in edges
3. **Node Limits** - Enforce maximum node count per canvas
4. **Custom Validators** - Allow custom validation rules per worker type
5. **Async Validation** - Support async validation (e.g., checking external APIs)

## See Also

- [Worker Registry](../workers/registry.ts) - Worker type definitions
- [AIAssistantPanel](../../components/panels/AIAssistantPanel.tsx) - AI chat interface
- [Design Document](../../../.kiro/specs/living-canvas-enhancements/design.md) - Full design specification
