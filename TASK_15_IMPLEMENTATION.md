# Task 15: Lead Capture Workflow Implementation

## Summary

Successfully implemented the Lead Capture drill-down workflow for the Clockwork Canvas. This workflow demonstrates the detailed logic behind the LinkedIn Ads marketing touchpoint.

## Implementation Details

### Files Created

1. **`src/lib/seeds/workflows/lead-capture.ts`**
   - Main workflow seed file
   - Exports `createLeadCaptureWorkflow()` function
   - Exports `seedLeadCaptureWorkflow()` function for database seeding
   - Implements idempotency checks

2. **`scripts/seed-lead-capture-workflow.ts`**
   - Standalone seed script for testing
   - Loads environment variables
   - Calls the workflow seed function

3. **`scripts/verify-lead-capture-workflow.ts`**
   - Comprehensive verification script
   - Checks all 10 aspects of the workflow
   - Validates structure, nodes, edges, and configurations

### Workflow Structure

The Lead Capture workflow consists of 4 nodes connected in sequence:

```
Validate Lead → Score Lead → CRM Sync → Assign SDR
```

#### Node Details

1. **Validate Lead** (Worker: data-transform)
   - Validates lead data including email format and required fields
   - Configuration: validates email and company_name
   - Position: (100, 100)

2. **Score Lead** (Worker: claude)
   - Analyzes lead quality using Claude AI
   - Assigns a score from 0-100
   - Categorizes as hot/warm/cold
   - Position: (300, 100)

3. **CRM Sync** (Worker: webhook-trigger)
   - Syncs lead data to HubSpot CRM
   - Makes POST request to HubSpot API
   - Position: (500, 100)

4. **Assign SDR** (Worker: data-transform)
   - Assigns lead to appropriate Sales Development Representative
   - Based on lead score and territory
   - Assignment rules: hot → senior-sdr, warm → mid-sdr, cold → junior-sdr
   - Position: (700, 100)

#### Edge Details

1. **e1**: validate-lead → score-lead
2. **e2**: score-lead → crm-sync
3. **e3**: crm-sync → assign-sdr

### Parent Linking

- **Parent Node**: `item-linkedin-ads` (LinkedIn Ads item in Marketing section)
- **Parent Canvas**: BMC canvas (canvas_type: 'bmc')
- **Canvas Type**: 'workflow'

This establishes the drill-down relationship where clicking on the LinkedIn Ads item node will navigate to this workflow.

## Verification Results

All 10 verification checks passed:

✅ Workflow exists in database
✅ Workflow correctly linked to BMC canvas
✅ Workflow has 4 nodes
✅ All nodes have correct IDs, types, and labels
✅ Workflow has 3 edges
✅ All edges connect correctly
✅ Validate Lead has correct workerType (data-transform)
✅ Score Lead has correct workerType (claude)
✅ CRM Sync has correct workerType (webhook-trigger)
✅ Assign SDR has correct workerType (data-transform)

## Requirements Validated

This implementation validates the following requirements from the design document:

- **Requirement 7.1**: Drillable item node navigation to child workflow
- **Requirement 7.2**: Workflow canvas displays sequence of worker nodes
- **Requirement 7.3**: Workflow linked to parent BMC item node via parent_id

## Database Schema

The workflow is stored in the `stitch_flows` table with:

```typescript
{
  id: '2fb66ecf-9b5c-4f5e-afed-ab7e40e214e8',
  name: 'Lead Capture Logic',
  canvas_type: 'workflow',
  parent_id: 'fe5fd5d3-323f-4fe5-8777-84b2ea9afab3', // BMC canvas ID
  graph: {
    nodes: [...], // 4 worker nodes
    edges: [...]  // 3 connecting edges
  }
}
```

## Testing

### Seed Script
```bash
npx tsx scripts/seed-lead-capture-workflow.ts
```

### Verification Script
```bash
npx tsx scripts/verify-lead-capture-workflow.ts
```

### Expected Output
- Workflow ID: `2fb66ecf-9b5c-4f5e-afed-ab7e40e214e8`
- All 10 checks pass (100%)
- Exit code: 0

## Next Steps

According to the task list, the next tasks are:

- **Task 16**: Create drill-down workflow: Demo Scheduling
- **Task 17**: Create drill-down workflow: Trial Activation
- **Task 18**: Create drill-down workflow: Support Handler
- **Task 19**: Create production system workflows
- **Task 20**: Update master seed script to include workflows

## Notes

- The workflow uses the same structure as existing workflows (wireframe-workflow.ts)
- Implements idempotency - safe to run multiple times
- Uses lazy imports to avoid environment variable issues
- Supports both global admin client and direct client injection
- All worker types are standard Stitch worker types
- Node positions are horizontally aligned for clean visualization

## Implementation Time

- File creation: ~5 minutes
- Testing and verification: ~10 minutes
- Documentation: ~5 minutes
- **Total**: ~20 minutes

## Status

✅ **COMPLETE** - All requirements met, all tests passing
