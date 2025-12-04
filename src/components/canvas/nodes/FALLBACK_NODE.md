# Fallback Node Component

## Overview

The `FallbackNode` component is a safety mechanism that renders when an unknown node type is encountered in the canvas. This ensures the application doesn't crash when seed data or user-created flows contain node types that aren't registered in the `nodeTypes` registry.

## Purpose

**Validates: Requirements 6.2**

When a node type is not found in the registered `nodeTypes` object, the BMCCanvas component automatically substitutes it with the `FallbackNode` component. This provides:

1. **Visual feedback** - Users see a clear warning that something is wrong
2. **Debugging information** - Displays the node ID and original type
3. **Graceful degradation** - The canvas continues to render instead of crashing

## Implementation

### Node Type Registration

The BMCCanvas component maintains a list of registered node types:

```typescript
const registeredTypes = new Set([
  'section',
  'section-item',
  'integration-item',
  'person-item',
  'code-item',
  'data-item',
  'costs-section',
  'revenue-section',
  'Worker',
  'Collector',
  'UX',
  'Splitter',
  'MediaSelect',
]);
```

### Fallback Detection

When transforming nodes for React Flow, the component checks if each node type is registered:

```typescript
const nodeType = registeredTypes.has(node.type) ? node.type : 'fallback';

if (nodeType === 'fallback') {
  console.warn(`Unknown node type encountered: "${node.type}" for node "${node.id}". Using fallback component.`);
}
```

### Data Passing

The original node type is passed to the fallback component via the `data` prop:

```typescript
data: {
  ...node.data,
  originalType: node.type,
}
```

## Visual Design

The FallbackNode displays:

- **Yellow background** with border - Indicates a warning state
- **Warning icon** - AlertTriangle from lucide-react
- **"Unknown Node Type" heading** - Clear message about the issue
- **Node ID** - For debugging and identification
- **Original Type** - The unregistered type name
- **Label** - If provided in the node data

## Testing

### Unit Tests

Located in `src/components/canvas/nodes/__tests__/FallbackNode.test.tsx`

Tests verify:
- Component is defined and exportable
- Component has correct displayName

### Integration Tests

Located in `src/components/canvas/__tests__/BMCCanvas.test.tsx`

Tests verify:
- All seed node types are registered
- Workflow node types are registered
- BMC item types are registered

### Manual Testing

Run the test script to create a flow with unknown node types:

```bash
npx tsx scripts/test-fallback-node.ts
```

This creates a test flow with:
- 2 known UX nodes
- 2 unknown node types (CustomWorker, MagicProcessor)

To view the test:
1. Start the dev server: `npm run dev`
2. Navigate to the flow URL provided by the script
3. Verify the fallback components display correctly

## Adding New Node Types

When adding a new node type to the system:

1. **Create the component** in `src/components/canvas/nodes/`
2. **Import it** in `BMCCanvas.tsx`
3. **Register it** in the `nodeTypes` object
4. **Add to the registered types set** in the node transformation logic
5. **Update tests** to include the new type

Example:

```typescript
// 1. Import
import { MyNewNode } from './nodes/MyNewNode';

// 2. Register in nodeTypes
const nodeTypes = useMemo<NodeTypes>(() => ({
  // ... existing types
  'my-new-type': MyNewNode,
  fallback: FallbackNode,
}), []);

// 3. Add to registered types set
const registeredTypes = new Set([
  // ... existing types
  'my-new-type',
]);
```

## Troubleshooting

### Warning: "Unknown node type encountered"

This warning appears in the console when a node type is not registered. To fix:

1. Check the node type in the seed data or database
2. Verify the type is registered in `BMCCanvas.tsx`
3. Ensure the component is imported correctly
4. Check for typos in the type name

### Fallback node appears in production

If users see fallback nodes in production:

1. Check the database for invalid node types
2. Run verification scripts: `npx tsx scripts/verify-all.ts`
3. Fix seed data if needed
4. Update the node type registration if a new type was added

## Related Files

- `src/components/canvas/BMCCanvas.tsx` - Main canvas component with registration logic
- `src/components/canvas/nodes/FallbackNode.tsx` - Fallback component implementation
- `src/components/canvas/nodes/__tests__/FallbackNode.test.tsx` - Unit tests
- `src/components/canvas/__tests__/BMCCanvas.test.tsx` - Integration tests
- `scripts/test-fallback-node.ts` - Manual testing script
- `scripts/verify-bmc.ts` - Verification script for BMC canvas
- `scripts/verify-all.ts` - Master verification script
