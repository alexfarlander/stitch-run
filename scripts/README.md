# Stitch Scripts

This directory contains utility scripts for managing and testing the Stitch system.

## Verification Scripts

### verify-all.ts
Master verification script that runs all verification checks across the system.

```bash
npx tsx scripts/verify-all.ts
```

### verify-bmc.ts
Verifies the Business Model Canvas structure and data integrity.

```bash
npx tsx scripts/verify-bmc.ts
```

### verify-video-factory-v2.ts
Verifies the Video Factory V2 workflow structure and data integrity.

```bash
npx tsx scripts/verify-video-factory-v2.ts
```

## Worker Testing Scripts

### test-worker.ts
Tests individual workers in isolation to verify they can initialize, execute, and receive callbacks.

**Usage:**
```bash
npx tsx scripts/test-worker.ts <worker-name> [--mock]
```

**Supported Workers:**
- `claude` - Test Claude AI worker (Anthropic API)
- `minimax` - Test MiniMax video generation worker
- `elevenlabs` - Test ElevenLabs text-to-speech worker
- `shotstack` - Test Shotstack video assembly worker

**Options:**
- `--mock` - Use mock mode (no API calls, useful for testing without API keys)

**Examples:**
```bash
# Test Claude worker with real API calls
npx tsx scripts/test-worker.ts claude

# Test MiniMax worker in mock mode (no API calls)
npx tsx scripts/test-worker.ts minimax --mock

# Test ElevenLabs worker
npx tsx scripts/test-worker.ts elevenlabs

# Test Shotstack worker in mock mode
npx tsx scripts/test-worker.ts shotstack --mock
```

**What it tests:**
- ✅ API key presence and validation
- ✅ Worker initialization
- ✅ Worker execution
- ✅ Callback reception
- ✅ Output format validation
- ✅ Error handling

**Output includes:**
- Configuration details (worker name, mode)
- API key status
- Test input details
- Execution duration
- Callback status
- Output data (if successful)
- Error messages (if failed)
- Helpful suggestions for fixing issues

## Seed Scripts

### seed-bmc.ts
Seeds the database with the default Business Model Canvas structure.

```bash
npx tsx scripts/seed-bmc.ts
```

### seed-video-factory-v2.ts
Seeds the database with the Video Factory V2 workflow.

```bash
npx tsx scripts/seed-video-factory-v2.ts
```

### seed-demo-journey.ts
Seeds the database with a demo customer journey.

```bash
npx tsx scripts/seed-demo-journey.ts
```

### seed-simple-test-flow.ts
Seeds the database with a minimal test workflow for end-to-end execution testing.

```bash
npx tsx scripts/seed-simple-test-flow.ts
```

**What it creates:**
- Simple Test Flow workflow (Input → Claude → Output)
- 3 nodes: Input (UX), Claude (Worker), Output (UX)
- 2 edges connecting the nodes

### reset-and-seed.ts
Resets the database and seeds it with all default data.

```bash
npx tsx scripts/reset-and-seed.ts
```

## Test Execution Scripts

### test-simple-flow-structure.ts
Validates the Simple Test Flow structure and demonstrates execution logging.

```bash
npx tsx scripts/test-simple-flow-structure.ts
```

**What it validates:**
- ✅ Workflow exists and has correct structure
- ✅ Nodes are properly configured (Input UX, Claude Worker, Output UX)
- ✅ Edges connect nodes correctly (Input→Claude, Claude→Output)
- ✅ Run can be created with test input
- ✅ Execution logging works at each step
- ✅ Output schema is defined and validated

**Validation steps:**
1. Finds the Simple Test Flow workflow
2. Validates node configuration and types
3. Validates edge connections
4. Creates a run with test input
5. Validates initial node states
6. Validates output schema definition
7. Reports success or failure with detailed logging

**Requirements validated:**
- 5.1: Simple test flow created (Input → Claude → Output)
- 5.3: Execution progress logged at each step
- 5.4: Output format schema defined and validated
- 5.5: Detailed error information available if failures occur

**Prerequisites:**
- Run `npx tsx scripts/seed-simple-test-flow.ts` first

**Note:**
This script validates the workflow structure without requiring a running server.
For full end-to-end execution testing with callbacks and real API calls:
1. Start the application server: `npm run dev`
2. Navigate to the workflow in the UI
3. Trigger execution and observe real-time updates
4. Verify Claude generates actual scene descriptions
5. Confirm callbacks work and nodes complete successfully

## Migration Scripts

### apply-migration.ts
Applies database migrations.

```bash
npx tsx scripts/apply-migration.ts
```

### apply-bmc-migration.ts
Applies BMC-specific migrations.

```bash
npx tsx scripts/apply-bmc-migration.ts
```

### apply-entity-migrations.ts
Applies entity tracking migrations.

```bash
npx tsx scripts/apply-entity-migrations.ts
```

### apply-versioning-migration.ts
Applies the canvas versioning migration (creates stitch_flow_versions table).

```bash
npx tsx scripts/apply-versioning-migration.ts
```

### migrate-to-versions.ts
Migrates existing flows and runs to the new versioning system.

**⚠️ Important:** Run `apply-versioning-migration.ts` first to create the required tables.

```bash
npx tsx scripts/migrate-to-versions.ts
```

**What it does:**
1. **For each existing flow:**
   - Converts legacy graph format to visual graph format
   - Attempts to compile graph to OEG (Optimized Execution Graph)
   - If successful: creates initial version, updates current_version_id
   - If failed: sets current_version_id to NULL, logs error details
2. **For each existing run:**
   - Links to flow's current_version_id if available
   - Otherwise marks for manual review
3. **Logs all migration results** with detailed statistics

**Migration statistics include:**
- Total flows processed
- Successful migrations
- Failed migrations (with error details)
- Skipped flows (already have versions)
- Total runs processed
- Runs successfully linked to versions
- Runs needing manual review

**Requirements validated:**
- 9.1: Creates stitch_flows table with current_version_id
- 9.2: Creates stitch_flow_versions table with visual and execution graphs
- 9.3: Modifies stitch_runs to reference flow_version_id

**Prerequisites:**
- Run `npx tsx scripts/apply-versioning-migration.ts` first
- Backup your database before running (recommended)

**Example output:**
```
╔════════════════════════════════════════════════════════════╗
║  Stitch Canvas Versioning Migration                       ║
╚════════════════════════════════════════════════════════════╝

🔄 Starting flow migration...
Found 5 flows to migrate

📦 Migrating flow: Video Factory V2 (abc-123)
   ↳ Compiling graph to OEG...
   ↳ Creating initial version...
   ↳ Updating current_version_id...
   ✅ Successfully migrated

📦 Migrating flow: Simple Test Flow (def-456)
   ↳ Already has version, skipping

🔄 Starting run migration...
Found 10 runs to migrate

╔════════════════════════════════════════════════════════════╗
║  Migration Summary                                         ║
╚════════════════════════════════════════════════════════════╝

📊 Flows:
   Total:      5
   ✅ Success:  3
   ⏭️  Skipped:  1
   ❌ Failed:   1

📊 Runs:
   Total:      10
   ✅ Linked:   9
   ⚠️  Review:   1

✅ Migration completed successfully!
```

## Environment Variables

All scripts require proper environment configuration. See `.env.example` for required variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Supabase publishable key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_BASE_URL` - Application base URL for callbacks
- `ANTHROPIC_API_KEY` - Claude worker API key (optional)
- `MINIMAX_API_KEY` - MiniMax worker API key (optional)
- `MINIMAX_GROUP_ID` - MiniMax group ID (optional)
- `ELEVENLABS_API_KEY` - ElevenLabs worker API key (optional)
- `SHOTSTACK_API_KEY` - Shotstack worker API key (optional)

## Tips

1. **Use mock mode for testing**: If you don't have API keys, use `--mock` flag with test-worker.ts
2. **Run verification after seeding**: Always run verification scripts after seeding to ensure data integrity
3. **Check logs**: All scripts provide detailed logging to help debug issues
4. **Environment setup**: Make sure to copy `.env.example` to `.env.local` and fill in your values
