# Verification System

This directory contains the verification infrastructure for validating database state and configuration in the Stitch system.

## Overview

The verification system provides functions to check:
- Database integrity (foreign keys, node types, edge references, parent nodes)
- Topology rules (Splitter/Collector configurations)
- Realtime configuration
- RLS (Row Level Security) policies

## Files

- `types.ts` - Type definitions for verification results, errors, and warnings
- `checks.ts` - Core verification functions
- `utils.ts` - Helper utilities for creating and aggregating results
- `logger.ts` - Logging utilities for verification output
- `__tests__/` - Test suite and examples

## Usage

### Basic Usage

```typescript
import {
  checkForeignKeys,
  checkNodeTypes,
  checkEdgeReferences,
  checkParentNodes,
  checkTopology,
  checkRealtimeConfig,
  checkRLSPolicies,
} from '@/lib/verification/checks';

// Check a specific flow
const flowId = 'your-flow-id';
const errors = await checkForeignKeys(flowId);

if (errors.length > 0) {
  console.error('Foreign key violations found:', errors);
}

// Check Realtime configuration
const realtimeErrors = await checkRealtimeConfig();

// Check RLS policies
const rlsErrors = await checkRLSPolicies();
```

### Using the Check Runner

```typescript
import { runChecks } from '@/lib/verification/utils';
import { checkForeignKeys, checkNodeTypes } from '@/lib/verification/checks';

const checks = [
  {
    name: 'Foreign Keys',
    description: 'Validate all foreign key relationships',
    run: () => checkForeignKeys(flowId),
  },
  {
    name: 'Node Types',
    description: 'Validate node types are registered',
    run: () => checkNodeTypes(flowId),
  },
];

const result = await runChecks(checks);

if (result.passed) {
  console.log('All checks passed!');
} else {
  console.error(`${result.errors.length} errors found`);
}
```

## Verification Functions

### Database Integrity Checks

#### `checkForeignKeys(flowId: string)`
Validates all foreign key relationships:
- `stitch_flows.parent_id` → `stitch_flows.id`
- `stitch_entities.canvas_id` → `stitch_flows.id`
- `stitch_entities.current_node_id` → node exists in canvas graph
- `stitch_entities.current_edge_id` → edge exists in canvas graph
- `stitch_runs.flow_id` → `stitch_flows.id`

#### `checkNodeTypes(flowId: string)`
Validates that all node types in the flow graph are registered in React Flow.

#### `checkEdgeReferences(flowId: string)`
Validates that all edges reference valid source and target node IDs.

#### `checkParentNodes(flowId: string)`
Validates that parent node references use the correct field name and reference valid nodes.

#### `checkTopology(flowId: string)`
Validates topology rules:
- Splitter nodes must have more than one outgoing edge
- Collector nodes must have more than one incoming edge

### Configuration Checks

#### `checkRealtimeConfig()`
Verifies that Realtime is enabled on the `stitch_runs` table. This function:
1. Attempts to query Supabase metadata tables
2. Falls back to creating a test subscription if metadata is unavailable
3. Reports any configuration issues

#### `checkRLSPolicies()`
Tests that RLS policies allow SELECT permissions on key tables:
- `stitch_runs`
- `stitch_flows`
- `stitch_entities`
- `stitch_journey_events`

This function:
1. Attempts to query `pg_policies` for each table
2. Falls back to functional testing (attempting SELECT queries)
3. Reports any permission issues

## Running Tests

```bash
# Run all verification tests
npm test src/lib/verification/__tests__/checks.test.ts

# Run example script
npx tsx src/lib/verification/__tests__/example.ts [flowId]
```

## Error Types

The verification system uses typed errors:

- `foreign_key` - Foreign key constraint violations
- `node_type` - Invalid or unregistered node types
- `edge_reference` - Invalid edge source/target references
- `parent_node` - Invalid parent node references
- `topology` - Topology rule violations (Splitter/Collector)
- `realtime` - Realtime configuration issues
- `rls` - RLS policy issues
- `journey_edge` - Journey event edge reference issues

## Requirements Validated

This verification system validates requirements from the fix-current-implementation spec:

- **Requirement 1.1-1.7**: Database integrity and topology
- **Requirement 2.6**: Realtime configuration
- **Requirement 2.7**: RLS policies

## Notes

### Realtime Verification

The Realtime verification function uses multiple approaches:
1. First attempts to query Supabase metadata tables
2. Falls back to creating a test subscription
3. This ensures verification works even with limited database permissions

### RLS Verification

The RLS verification function:
- Uses the service role key, which bypasses RLS
- Checks for the existence of policies rather than testing actual permissions
- Reports warnings if no policies are found (may be intentional)

### Environment Variables

All verification functions require:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These are loaded automatically in tests via vitest configuration.
