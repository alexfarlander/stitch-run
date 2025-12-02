# Race Condition Fix: Atomic Node State Updates

## The Problem

The original `updateNodeState` implementation had a classic **lost update** race condition:

```typescript
// ❌ RACE CONDITION - DO NOT USE
async function updateNodeState(runId, nodeId, state) {
  // 1. Worker A and Worker B both read version 1
  const run = await getRun(runId);
  
  // 2. Both modify in memory
  const updated = { ...run.node_states, [nodeId]: state };
  
  // 3. Worker A writes v2, Worker B writes v3 (OVERWRITES v2!)
  await supabase.from('stitch_runs').update({ node_states: updated });
}
```

### Scenario

Imagine a Splitter creates 3 parallel video processing paths:
- Worker A finishes processing video 1
- Worker B finishes processing video 2 at the same time
- Both read the database (both see the same state)
- Worker A marks video 1 as "completed"
- Worker B marks video 2 as "completed" BUT overwrites Worker A's update
- **Result**: Video 1 stays "running" forever, Collector never fires

## The Solution

We use a PostgreSQL function that performs the update **atomically** in a single database operation:

```sql
CREATE OR REPLACE FUNCTION update_node_state(
  p_run_id UUID,
  p_node_id TEXT,
  p_status TEXT,
  p_output JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS TABLE(...) AS $$
BEGIN
  -- Single atomic operation - no race condition possible
  RETURN QUERY
  UPDATE stitch_runs AS sr
  SET node_states = jsonb_set(sr.node_states, array[p_node_id], v_node_payload, true)
  WHERE sr.id = p_run_id
  RETURNING sr.*;
END;
$$;
```

### How It Works

1. **Single Operation**: The entire read-modify-write happens in one database transaction
2. **JSONB Path Update**: Uses `jsonb_set()` to update only the specific node, not the entire object
3. **Database-Level Locking**: PostgreSQL handles concurrent updates correctly
4. **No Read Required**: We don't need to read the current state first

### New Implementation

```typescript
// ✅ ATOMIC - SAFE FOR CONCURRENT UPDATES
export async function updateNodeState(runId, nodeId, state) {
  const supabase = getAdminClient(); // Use admin client for webhooks
  
  const { data, error } = await supabase.rpc('update_node_state', {
    p_run_id: runId,
    p_node_id: nodeId,
    p_status: state.status,
    p_output: state.output || null,
    p_error: state.error || null,
  });
  
  // Handle errors and return updated run
  return data[0];
}
```

## Why Admin Client?

We switched from `createServerClient()` to `getAdminClient()` because:

1. **Webhook Callbacks**: External workers don't have user cookies/sessions
2. **Bypass RLS**: The admin client bypasses Row Level Security policies
3. **Consistent Permissions**: Works in all contexts (API routes, webhooks, etc.)

## Testing

The fix is validated by tests that:
- Update multiple nodes concurrently (simulated)
- Verify all updates persist correctly
- Test parallel path scenarios (splitter/collector)
- Ensure no state is lost

All 18 tests pass, including the critical atomicity tests.

## Migration

The atomic update function is defined in:
- `supabase/migrations/20241202000002_atomic_node_state_update.sql`

Apply it to your database via Supabase SQL Editor or migration tools.
