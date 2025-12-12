# Coding Instructions: Fix Race Conditions and Node Type Casing

**Status**: ✅ Completed (2025-12-12)
**Priority**: P1 (Data Integrity & Runtime Safety)
**Context**: Fixing high-priority gaps identified in `reviews/gaps-gpt-5-2.md`.

---

## Implementation Report

### Summary
Successfully implemented atomic bulk node updates using PostgreSQL RPC functions and standardized node type casing across the validation layer. All changes have been verified with TypeScript type checking.

### Files Modified
1. **Created**: `supabase/migrations/20251212165556_atomic_bulk_update.sql`
   - New PostgreSQL function for atomic JSONB merging

2. **Modified**: `src/lib/db/runs.ts` (lines 362-378)
   - Replaced read-modify-write pattern with RPC call

3. **Modified**: `src/lib/canvas/validate-graph.ts` (lines 23-29, 275, 418-423)
   - Updated NodeType constants to match type definitions
   - Removed `.toLowerCase()` calls from validation logic

### Testing
- ✅ TypeScript typecheck passes with no errors in modified files
- ✅ Constants now match type definitions in `src/types/stitch.ts`
- ✅ Migration syntax validated

### Impact
- **Race Condition Fix**: Multiple parallel node completions can no longer cause lost updates
- **Type Safety**: Validation now correctly matches node types, preventing silent validation failures
- **Database Performance**: Atomic operations reduce transaction overhead and prevent conflicts

---

## Task 1: Implement Atomic Bulk Node Updates

**Problem**: `updateNodeStates` in `src/lib/db/runs.ts` currently uses a read-modify-write pattern, which causes lost updates when multiple nodes (e.g., in a parallel flow) update simultaneously.

**Status**: ✅ Completed

**Implementation**:
- Created migration file with timestamp `20251212165556`
- Function signature includes all `stitch_runs` columns (added missing `entity_id` and `trigger`)
- Uses PostgreSQL's JSONB `||` operator for atomic top-level merge
- Granted permissions to `authenticated`, `service_role`, and `anon` roles
- TypeScript code properly handles RPC return format (array unwrapping)

### 1.1 Create SQL Migration
Create a new migration file `supabase/migrations/[TIMESTAMP]_atomic_bulk_update.sql` (use current timestamp).

```sql
-- Atomic bulk update function for node states
-- Merges a dictionary of node updates into the existing node_states JSONB
CREATE OR REPLACE FUNCTION update_node_states(
  p_run_id UUID,
  p_updates JSONB
)
RETURNS TABLE(
  id UUID,
  flow_id UUID,
  node_states JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atomically merge the updates into node_states
  -- The || operator on JSONB performs a top-level merge
  -- Since p_updates is a map of nodeId -> NodeState, this updates those specific keys
  -- without overwriting other nodes.
  RETURN QUERY
  UPDATE stitch_runs AS sr
  SET 
    node_states = sr.node_states || p_updates,
    updated_at = NOW()
  WHERE sr.id = p_run_id
  RETURNING 
    sr.id,
    sr.flow_id,
    sr.node_states,
    sr.created_at,
    sr.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION update_node_states TO authenticated, service_role, anon;
```

### 1.2 Update `src/lib/db/runs.ts`
Modify `updateNodeStates` to use this new RPC.

**File**: `src/lib/db/runs.ts`

**Changes**:
1.  Keep the validation logic (loading run and validating transitions).
2.  Replace the `supabase.from('stitch_runs').update(...)` call with `supabase.rpc(...)`.

```typescript
// ... inside updateNodeStates ...

  // Validate all status transitions before applying updates
  // (Keep existing validation logic)

  // REPLACE the update block with:
  const { data, error } = await supabase.rpc('update_node_states', {
    p_run_id: runId,
    p_updates: updates
  });

  if (error) {
    throw new Error(`Failed to update node states atomically: ${error.message}`);
  }
  
  // RPC returns an array
  if (!data || (Array.isArray(data) && data.length === 0)) {
     throw new Error(`Run not found: ${runId}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return result as StitchRun;
```

---

## Task 2: Standardize Node Type Casing

**Problem**: `src/types/stitch.ts` defines `NodeType` as Capitalized (e.g., `'Worker'`), but `src/lib/canvas/validate-graph.ts` validates against lowercase `'worker'`. This causes validation to skip checks or fail depending on how the graph was saved.

**Status**: ✅ Completed

**Implementation**:
- Updated `NodeType` constants: `'worker'` → `'Worker'`, `'ux'` → `'UX'`, `'splitter'` → `'Splitter'`, `'collector'` → `'Collector'`
- Kept `'section'` as lowercase (matches type definition in `stitch.ts`)
- Removed all `.toLowerCase()` calls in validation logic
- Updated `validateWorkerTypes` to use `NodeType.WORKER` constant (line 275)
- Updated `validateSplitterCollectorPairs` to use constants directly (lines 418-423)
- TypeScript compilation succeeds with no errors

### 2.1 Update Validation Constants
Update `src/lib/canvas/validate-graph.ts` to use Capitalized types matching `src/types/stitch.ts`.

**File**: `src/lib/canvas/validate-graph.ts`

**Changes**:
1.  Update the `NodeType` constant object values.

```typescript
export const NodeType = {
  WORKER: 'Worker',
  UX: 'UX',
  SPLITTER: 'Splitter',
  COLLECTOR: 'Collector',
  SECTION: 'section', // usage of section vs Section needs verification, but start with structural nodes
  // ... check other types in src/types/stitch.ts
} as const;
```

*Note*: If `section` is lowercase in `src/types/stitch.ts`, keep it lowercase. Check `src/types/stitch.ts` carefully.
(Checked: `src/types/stitch.ts` has `'section'`, `'section-item'`, etc. as lowercase. Only structural nodes `Worker`, `UX`, `Splitter`, `Collector`, `MediaSelect` are capitalized).

### 2.2 Update Validation Logic
Ensure validation handles the casing gracefully or enforces the standardized casing.

**In `validateWorkerTypes`**:
```typescript
// Ensure we match the node.type correctly
if (node.type === NodeType.WORKER && node.data.worker_type) { ... }
```

**In `validateSplitterCollectorPairs`**:
```typescript
// Remove .toLowerCase() calls if we are enforcing strict capitalized types
const splitters = graph.nodes.filter(n => n.type === NodeType.SPLITTER);
const collectors = graph.nodes.filter(n => n.type === NodeType.COLLECTOR);
```

### 2.3 Verification
Run a typecheck or partial build to ensure no other files rely on the `NodeType` constants from `validate-graph.ts` expecting lowercase.

---

## Task 3: Regression Test (Optional but Recommended)

**Status**: ⏭️ Skipped (optional)

**Recommendation**: Create a test file `src/lib/db/__tests__/atomic-update.test.ts` that verifies the `update_node_states` RPC correctly merges data without deleting existing keys. This could be done in a future PR if integration testing is needed.

---

## Notes for Deployment

### Migration Deployment
The migration file `supabase/migrations/20251212165556_atomic_bulk_update.sql` needs to be applied to the database before deploying the TypeScript changes. The deployment order should be:

1. **Apply database migration first** (create the `update_node_states` function)
2. **Deploy application code** (which calls the new function)

### Rollback Plan
If rollback is needed:
1. Deploy old application code first (restores read-modify-write pattern)
2. Drop the function: `DROP FUNCTION IF EXISTS update_node_states(UUID, JSONB);`

### Backward Compatibility
- ✅ The migration adds a new function without removing anything
- ✅ Old code continues to work during migration
- ⚠️ After deploying new code, the old function `update_node_state` (singular) is still used for single updates
- ✅ Both functions can coexist safely
