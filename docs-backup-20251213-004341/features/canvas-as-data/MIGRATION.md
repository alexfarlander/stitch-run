# Migration Guide

Guide for migrating existing Stitch flows to the versioned Canvas as Data system.

## Overview

The Canvas as Data feature introduces a new database schema with versioning. This guide covers:

1. Understanding the new schema
2. Running the migration script
3. Handling migration errors
4. Updating application code
5. Testing migrated flows

## New Schema

### Before (Old Schema)

```sql
-- Flows stored graph data directly
CREATE TABLE stitch_flows (
  id uuid PRIMARY KEY,
  name text,
  user_id uuid,
  graph jsonb,  -- Visual graph stored here
  created_at timestamptz,
  updated_at timestamptz
);

-- Runs stored graph data directly
CREATE TABLE stitch_runs (
  id uuid PRIMARY KEY,
  flow_id uuid,
  graph jsonb,  -- Copy of graph at run time
  status text,
  created_at timestamptz
);
```

### After (New Schema)

```sql
-- Flows now just metadata
CREATE TABLE stitch_flows (
  id uuid PRIMARY KEY,
  name text,
  user_id uuid,
  current_version_id uuid,  -- Points to latest version
  canvas_type text,
  parent_id uuid,
  created_at timestamptz,
  updated_at timestamptz
);

-- Versions store immutable snapshots
CREATE TABLE stitch_flow_versions (
  id uuid PRIMARY KEY,
  flow_id uuid,
  visual_graph jsonb,      -- For UI rendering
  execution_graph jsonb,   -- For runtime execution
  commit_message text,
  created_at timestamptz
);

-- Runs reference versions
CREATE TABLE stitch_runs (
  id uuid PRIMARY KEY,
  flow_id uuid,
  flow_version_id uuid,  -- References specific version
  status text,
  created_at timestamptz
);
```

## Migration Process

### Step 1: Backup Database

**Always backup before migration!**

```bash
# Using Supabase CLI
supabase db dump > backup-$(date +%Y%m%d).sql

# Or using pg_dump
pg_dump -h your-host -U your-user -d your-db > backup.sql
```

### Step 2: Apply Schema Migration

Run the versioning migration:

```bash
# Using Supabase CLI
supabase migration up

# Or using the migration script
npm run migrate:versioning
```

This creates:
- `stitch_flow_versions` table
- `flow_version_id` column in `stitch_runs`
- Foreign key constraints
- Indexes

### Step 3: Run Data Migration

The data migration script handles existing flows and runs:

```bash
npm run migrate:to-versions
```

Or programmatically:

```typescript
import { migrateToVersions } from '@/scripts/migrate-to-versions';

const results = await migrateToVersions();

console.log('Migration results:');
console.log('- Flows migrated:', results.flowsMigrated);
console.log('- Flows failed:', results.flowsFailed);
console.log('- Runs migrated:', results.runsMigrated);
console.log('- Runs failed:', results.runsFailed);
```

### Migration Script Behavior

The script processes each flow:

```typescript
for (const flow of existingFlows) {
  try {
    // 1. Load graph from old schema
    const visualGraph = flow.graph;
    
    // 2. Attempt to compile to execution graph
    const result = compileToOEG(visualGraph);
    
    if (result.success) {
      // 3. Create initial version
      const version = await createVersion(
        flow.id,
        visualGraph,
        'Migrated from old schema'
      );
      
      // 4. Update current_version_id
      await updateFlow(flow.id, {
        current_version_id: version.id
      });
      
      // 5. Migrate associated runs
      await migrateRunsForFlow(flow.id, version.id);
      
      console.log(`✓ Migrated flow ${flow.id}`);
    } else {
      // Compilation failed - invalid graph
      console.error(`✗ Flow ${flow.id} has invalid graph:`, result.errors);
      
      // Set current_version_id to NULL
      await updateFlow(flow.id, {
        current_version_id: null
      });
      
      // Log for manual review
      await logMigrationError(flow.id, result.errors);
    }
  } catch (error) {
    console.error(`✗ Failed to migrate flow ${flow.id}:`, error);
  }
}
```

## Handling Migration Errors

### Invalid Graphs

Some flows may have invalid graphs that fail compilation:

```typescript
// Migration output
✗ Flow abc-123 has invalid graph:
  - Cycle detected: A -> B -> C -> A
  - Missing required input: node D, field "prompt"
  - Invalid worker type: node E, type "custom-worker"
```

**Resolution:**

1. Load the flow in the UI
2. Fix validation errors
3. Save to create first version

```typescript
// In the UI
const flow = await getFlow('abc-123');

if (!flow.current_version_id) {
  // Show warning: "This flow needs to be saved"
  // Display validation errors
  // Allow user to fix and save
}
```

### Orphaned Runs

Runs for flows that failed migration:

```typescript
// Migration output
⚠ Run xyz-789 references flow abc-123 which failed migration
  - Run will be marked for manual review
```

**Resolution:**

1. Fix the parent flow
2. Re-run migration for that flow
3. Link orphaned runs to new version

```typescript
// Manual fix
const flow = await getFlow('abc-123');
const version = await createVersion(flow.id, fixedGraph);

// Update orphaned runs
await updateRun('xyz-789', {
  flow_version_id: version.id
});
```

## Code Updates

### Before: Loading Flows

```typescript
// Old code
const flow = await getFlow(flowId);
const graph = flow.graph;  // Graph stored directly

renderCanvas(graph);
```

### After: Loading Flows

```typescript
// New code
const flow = await getFlow(flowId, { includeVersion: true });
const graph = flow.currentVersion?.visual_graph;

if (!graph) {
  // No version exists - show error
  showError('Flow needs to be saved');
  return;
}

renderCanvas(graph);
```

### Before: Creating Runs

```typescript
// Old code
const run = await createRun(flowId, {
  graph: currentGraph  // Graph passed directly
});
```

### After: Creating Runs

```typescript
// New code
// Option 1: Auto-version
const versionId = await autoVersionOnRun(flowId, currentGraph);
const run = await createRun(flowId, versionId);

// Option 2: Use current version
const flow = await getFlow(flowId);
const run = await createRun(flowId, flow.current_version_id);
```

### Before: Viewing Runs

```typescript
// Old code
const run = await getRun(runId);
const graph = run.graph;  // Graph stored in run

renderCanvas(graph);
```

### After: Viewing Runs

```typescript
// New code
const run = await getRun(runId);
const version = await getVersion(run.flow_version_id);

renderCanvas(version.visual_graph);
```

## Testing Migration

### 1. Test Flow Loading

```typescript
// Test that flows load correctly
const flows = await listFlows();

for (const flow of flows) {
  const fullFlow = await getFlow(flow.id, { includeVersion: true });
  
  if (!fullFlow.current_version_id) {
    console.warn(`Flow ${flow.id} has no version`);
  } else {
    console.log(`✓ Flow ${flow.id} has version ${fullFlow.current_version_id}`);
  }
}
```

### 2. Test Run Loading

```typescript
// Test that runs load correctly
const runs = await listRuns();

for (const run of runs) {
  if (!run.flow_version_id) {
    console.warn(`Run ${run.id} has no version reference`);
  } else {
    const version = await getVersion(run.flow_version_id);
    if (version) {
      console.log(`✓ Run ${run.id} references valid version`);
    } else {
      console.error(`✗ Run ${run.id} references invalid version`);
    }
  }
}
```

### 3. Test Execution

```typescript
// Test that execution still works
const flow = await getFlow(flowId);

if (!flow.current_version_id) {
  console.error('Flow has no version - cannot run');
} else {
  const run = await createRun(flowId, flow.current_version_id);
  console.log(`✓ Run created: ${run.id}`);
  
  // Monitor execution
  const finalRun = await waitForCompletion(run.id);
  console.log(`✓ Run completed: ${finalRun.status}`);
}
```

## Rollback Plan

If migration fails, you can rollback:

### 1. Restore Database

```bash
# Restore from backup
psql -h your-host -U your-user -d your-db < backup.sql
```

### 2. Revert Schema Changes

```bash
# Rollback migration
supabase migration down
```

### 3. Revert Code Changes

```bash
# Checkout previous version
git checkout previous-version
```

## Common Issues

### Issue: Flow has no current_version_id

**Cause**: Flow failed validation during migration

**Solution**: Fix validation errors and save

```typescript
const flow = await getFlow(flowId);

if (!flow.current_version_id) {
  // Load old graph (if still available)
  const oldGraph = flow.graph;
  
  // Fix validation errors
  const fixedGraph = fixValidationErrors(oldGraph);
  
  // Create first version
  await createVersion(flowId, fixedGraph, 'Fixed validation errors');
}
```

### Issue: Run references null version

**Cause**: Run's parent flow failed migration

**Solution**: Fix parent flow first, then update run

```typescript
const run = await getRun(runId);

if (!run.flow_version_id) {
  // Fix parent flow
  const flow = await getFlow(run.flow_id);
  const version = await createVersion(flow.id, fixedGraph);
  
  // Update run
  await updateRun(run.id, {
    flow_version_id: version.id
  });
}
```

### Issue: Execution fails after migration

**Cause**: Execution graph format changed

**Solution**: Verify execution graph structure

```typescript
const version = await getVersion(versionId);
const oeg = version.execution_graph;

// Verify structure
console.assert(oeg.nodes, 'Missing nodes');
console.assert(oeg.adjacency, 'Missing adjacency');
console.assert(oeg.entryNodes, 'Missing entryNodes');
console.assert(oeg.terminalNodes, 'Missing terminalNodes');
```

## Post-Migration Cleanup

After successful migration:

### 1. Remove Old Columns

```sql
-- After verifying everything works
ALTER TABLE stitch_flows DROP COLUMN IF EXISTS graph;
ALTER TABLE stitch_runs DROP COLUMN IF EXISTS graph;
```

### 2. Vacuum Database

```sql
-- Reclaim space
VACUUM FULL stitch_flows;
VACUUM FULL stitch_runs;
```

### 3. Update Indexes

```sql
-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_runs_flow_version_id 
  ON stitch_runs(flow_version_id);

CREATE INDEX IF NOT EXISTS idx_versions_flow_id 
  ON stitch_flow_versions(flow_id);

CREATE INDEX IF NOT EXISTS idx_versions_created_at 
  ON stitch_flow_versions(created_at DESC);
```

## Migration Checklist

- [ ] Backup database
- [ ] Apply schema migration
- [ ] Run data migration script
- [ ] Review migration logs
- [ ] Fix flows with validation errors
- [ ] Test flow loading
- [ ] Test run loading
- [ ] Test execution
- [ ] Update application code
- [ ] Deploy updated code
- [ ] Monitor for issues
- [ ] Clean up old columns (after verification)

## Support

If you encounter issues during migration:

1. Check migration logs for specific errors
2. Review validation errors for failed flows
3. Test with a single flow first
4. Contact support with migration logs

## Next Steps

After successful migration:

- Read [Version Management](./VERSION_MANAGEMENT.md) to understand versioning
- Check [API Reference](./API.md) for updated endpoints
- Review [Examples](./EXAMPLES.md) for new workflow patterns
