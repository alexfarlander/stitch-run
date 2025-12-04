# Canvas Versioning Pattern

## ⚠️ CRITICAL: The Legacy Update Trap

### The Problem

The `updateFlow()` function in `flows.ts` is a **legacy function** that directly updates the `stitch_flows` table. If you use it to update canvas graph data, you will:

1. ❌ Bypass the OEG (Optimized Execution Graph) compiler
2. ❌ Leave `current_version_id` pointing to stale data
3. ❌ Cause the Run button to execute the old version
4. ❌ Break the versioning system
5. ❌ Confuse users who see their changes but workflows don't reflect them

### The Solution

**Always use the versioning system for canvas updates:**

```typescript
import { createVersion } from '@/lib/canvas/version-manager';

// ✅ CORRECT: Update canvas structure
await createVersion(
  flowId,
  visualGraph,
  'Commit message describing the change'
);
```

This ensures:
- ✅ Canvas is compiled to OEG
- ✅ `current_version_id` is updated
- ✅ Run button executes the latest version
- ✅ Version history is maintained
- ✅ Rollback is possible

## Correct Usage Patterns

### Creating a Canvas

```typescript
import { createFlowWithVersion } from '@/lib/db/flows';

const { flow, versionId } = await createFlowWithVersion(
  'Canvas Name',
  visualGraph,
  'workflow',
  undefined,
  'Initial version'
);
```

### Updating Canvas Structure

```typescript
import { createVersion } from '@/lib/canvas/version-manager';

// Update the canvas
await createVersion(
  flowId,
  updatedVisualGraph,
  'Added new worker node'
);
```

### Updating Canvas Metadata (Name Only)

```typescript
import { updateFlow } from '@/lib/db/flows';

// ✅ SAFE: Only updating metadata, not graph
await updateFlow(flowId, {
  name: 'New Canvas Name'
});
```

### Reading a Canvas

```typescript
import { getFlow } from '@/lib/db/flows';

// Get flow with current version data
const flow = await getFlow(flowId, true);

// Extract visual graph from current version
const visualGraph = flow.current_version?.visual_graph;
```

## API Route Implementation Example

See `src/app/api/canvas/[id]/route.ts` for the correct pattern:

```typescript
export async function PUT(request: NextRequest, { params }) {
  const { name, canvas } = await request.json();

  // ✅ CORRECT: Canvas structure goes through versioning
  if (canvas) {
    await createVersion(
      params.id,
      canvas,
      'Updated via API'
    );
  }

  // ✅ SAFE: Metadata updates use updateFlow
  if (name) {
    await updateFlow(params.id, { name });
  }

  return NextResponse.json({ success: true });
}
```

## Why updateFlow() Still Exists

The `updateFlow()` function is marked as `@deprecated` for graph updates but is still needed for:

1. **Metadata updates** - Updating flow name without creating a new version
2. **Legacy compatibility** - Some old code may still use it
3. **Migration path** - Allows gradual migration to versioning system

## Migration Checklist

If you find code using `updateFlow()` with graph data:

- [ ] Check if it's updating `graph` field
- [ ] Replace with `createVersion()` call
- [ ] Test that Run button executes latest version
- [ ] Verify version history is maintained
- [ ] Update any related documentation

## Testing

Always test that:

1. Canvas updates create new versions
2. `current_version_id` is updated
3. Run button executes the latest version
4. Version history is queryable
5. Rollback works correctly

## References

- Version Manager: `src/lib/canvas/version-manager.ts`
- Flow Database: `src/lib/db/flows.ts`
- Canvas API: `src/app/api/canvas/[id]/route.ts`
- Design Doc: `.kiro/specs/ai-manager/design.md`
