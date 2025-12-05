# Task 22: Implement Drill-Down Navigation

## Implementation Summary

Successfully implemented drill-down navigation for item nodes in the Clockwork Canvas. When users click on item nodes that have linked workflows, the canvas navigates to the detailed workflow view.

## Changes Made

### 1. Workflow Linking Script
Created `scripts/link-workflows-to-items.ts` to establish the connection between BMC item nodes and their child workflows:

**Key Features:**
- Maps workflow names to parent item node IDs
- Updates BMC graph to add `linked_workflow_id` to item nodes
- Verifies all links are properly established
- Provides detailed output of linking process

**Workflow to Item Mapping:**
```typescript
const WORKFLOW_TO_ITEM_MAP = {
  'Lead Capture Logic': 'item-linkedin-ads',
  'Demo Scheduling Logic': 'item-demo-call',
  'Trial Activation Logic': 'item-free-trial',
  'Support Handler Logic': 'item-help-desk',
  'CRM Sync': 'item-crm',
  'Analytics Update': 'item-analytics',
  'Slack Notify': 'item-slack',
  'Stripe Sync': 'item-stripe',
};
```

### 2. Navigation Verification Script
Created `scripts/verify-drill-down-navigation.ts` to verify the complete navigation system:

**Verification Checks:**
- ✅ All linked item nodes have valid workflows
- ✅ All workflows are properly configured
- ✅ All workflows are linked to BMC canvas
- ✅ Navigation system is ready

### 3. Updated Master Seed Script
Enhanced `scripts/seed-clockwork.ts` to automatically link workflows during seeding:

**New Step 4.5:**
- Fetches all workflows after they're created
- Maps workflows to their parent item nodes
- Updates BMC graph with `linked_workflow_id` references
- Implements idempotency (skips already-linked nodes)

### 4. Existing Navigation System
The navigation functionality was already implemented in:

**SectionItemNode Component** (`src/components/canvas/nodes/SectionItemNode.tsx`):
```typescript
const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation();

  // Priority 1: Navigate to linked workflow
  if (nodeData.linked_workflow_id) {
    drillInto(nodeData.linked_workflow_id, nodeData.label, 'workflow');
    return;
  }

  // Priority 2: Navigate to linked detail canvas
  if (nodeData.linked_canvas_id) {
    drillInto(nodeData.linked_canvas_id, nodeData.label, 'workflow');
    return;
  }

  // Priority 3: Show detail panel (if callback provided)
  if (nodeData.onShowDetail) {
    nodeData.onShowDetail(id);
  }
};
```

**useCanvasNavigation Hook** (`src/hooks/useCanvasNavigation.ts`):
- Provides `drillInto()` function for navigation
- Manages navigation stack and breadcrumbs
- Handles forward/backward navigation
- Supports canvas type specification

## How It Works

### 1. Data Structure
Each drillable item node has:
```typescript
{
  id: 'item-linkedin-ads',
  type: 'section-item',
  data: {
    label: 'LinkedIn Ads',
    icon: 'Linkedin',
    linked_workflow_id: '2fb66ecf-9b5c-4f5e-afed-ab7e40e214e8',
    // ... other properties
  }
}
```

### 2. Navigation Flow
1. User clicks on an item node (e.g., "LinkedIn Ads")
2. `SectionItemNode` component detects `linked_workflow_id`
3. Calls `drillInto(workflowId, 'LinkedIn Ads', 'workflow')`
4. Navigation system pushes new canvas onto stack
5. Canvas router loads the workflow view
6. Breadcrumbs show: BMC > LinkedIn Ads
7. User can click breadcrumb to return to BMC

### 3. Visual Indicators
Item nodes with linked workflows display:
- 🔗 Drill-down indicator icon (bottom-right corner)
- Cyan glow on hover
- Cursor changes to pointer
- Icon scales up on hover

## Drillable Nodes

### Customer Journey Workflows
1. **LinkedIn Ads** → Lead Capture Logic (4 nodes)
   - Validate Lead → Score Lead → CRM Sync → Assign SDR

2. **Demo Call** → Demo Scheduling Logic (3 nodes)
   - Send Email → Wait for Booking → Pre-Demo Prep

3. **Free Trial** → Trial Activation Logic (3 nodes)
   - Provision Account → Send Onboarding → Wait for Upgrade

4. **Help Desk** → Support Handler Logic (3 nodes)
   - Analyze Ticket → AI Suggest → Escalate if Needed

### Production System Workflows
5. **CRM** → CRM Sync (3 nodes)
   - Validate → Transform → API Call

6. **Analytics** → Analytics Update (1 node)
   - Increment Metric

7. **Stripe** → Stripe Sync (1 node)
   - Create/Update Subscription

8. **Slack** → Slack Notify (2 nodes)
   - Format → Post to Channel

## Verification Results

### Linking Script Output
```
✅ Linked 8 workflows to item nodes
✅ All workflows verified
✅ Drill-down navigation ready
```

### Navigation Verification Output
```
✅ Total Item Nodes: 29
✅ Linked Item Nodes: 8
✅ Valid Navigation Links: 8/8
🎉 Drill-down navigation is fully functional!
```

## Testing

### Manual Testing Steps
1. ✅ Run seed script: `npx tsx scripts/seed-clockwork.ts`
2. ✅ Run linking script: `npx tsx scripts/link-workflows-to-items.ts`
3. ✅ Run verification: `npx tsx scripts/verify-drill-down-navigation.ts`
4. ✅ Open BMC canvas in browser
5. ✅ Verify drill-down indicators appear on 8 item nodes
6. ✅ Click "LinkedIn Ads" node
7. ✅ Verify navigation to Lead Capture workflow
8. ✅ Verify breadcrumbs show: BMC > LinkedIn Ads
9. ✅ Click BMC breadcrumb to return
10. ✅ Verify canvas returns to BMC view

### Automated Testing
All verification scripts pass:
- ✅ `verify-workflow-integration.ts` - All workflows exist
- ✅ `verify-drill-down-indicator.ts` - Visual indicators present
- ✅ `verify-drill-down-navigation.ts` - Navigation system ready

## Requirements Validated

✅ **Requirement 7.1**: "WHEN a drillable item node is clicked THEN the System SHALL navigate to the child workflow canvas"

**Evidence:**
- Item nodes have `linked_workflow_id` set
- Click handler calls `drillInto()` with workflow ID
- Navigation system loads workflow canvas
- Breadcrumbs enable return navigation

## Architecture Notes

### Navigation System Design
The navigation system follows the **Fractal Canvas** principle from Stitch architecture:
- Everything is a canvas (BMC, workflows, sections)
- Drill-down navigation zooms into context
- Breadcrumbs maintain navigation history
- State is managed in navigation singleton

### Data Flow
```
User Click
  ↓
SectionItemNode.handleClick()
  ↓
useCanvasNavigation.drillInto(workflowId, label, 'workflow')
  ↓
Navigation Stack Updated
  ↓
Canvas Router Detects Change
  ↓
Workflow Canvas Loads
  ↓
Breadcrumbs Update
```

### Database Schema
No schema changes required. The linking is stored in the BMC graph JSONB:
```sql
-- stitch_flows table
{
  id: 'bmc-id',
  canvas_type: 'bmc',
  graph: {
    nodes: [
      {
        id: 'item-linkedin-ads',
        data: {
          linked_workflow_id: 'workflow-id'  // Added by linking script
        }
      }
    ]
  }
}
```

## Integration with Existing Features

### Works With:
- ✅ Canvas navigation system (breadcrumbs, back button)
- ✅ Drill-down indicators (Task 21)
- ✅ Workflow seed system (Tasks 15-19)
- ✅ BMC canvas rendering
- ✅ Real-time updates

### Future Enhancements:
- Could add animation transitions between canvases
- Could show workflow preview on hover
- Could add keyboard shortcuts (e.g., Escape to go back)
- Could add workflow execution status in breadcrumbs

## Usage Instructions

### For Developers
```bash
# Seed the complete system (includes linking)
npx tsx scripts/seed-clockwork.ts

# Verify navigation is ready
npx tsx scripts/verify-drill-down-navigation.ts

# Re-link workflows if needed
npx tsx scripts/link-workflows-to-items.ts
```

### For Users
1. Open the BMC canvas
2. Look for item nodes with the 🔗 indicator
3. Click any linked node to drill down
4. Use breadcrumbs to navigate back
5. Explore the workflow details

## Success Criteria

✅ All 8 item nodes have linked workflows
✅ Click handler navigates to correct workflow
✅ Breadcrumbs show navigation path
✅ Return navigation works correctly
✅ Visual indicators show drillable nodes
✅ Navigation system is idempotent
✅ Verification scripts pass

## Next Steps

With drill-down navigation complete, the Clockwork Canvas now supports:
- ✅ Complete BMC structure (Tasks 1-7)
- ✅ Webhook system (Tasks 8-9)
- ✅ Demo orchestrator (Tasks 10-14)
- ✅ Drill-down workflows (Tasks 15-20)
- ✅ Visual indicators (Task 21)
- ✅ Navigation system (Task 22) ← **COMPLETE**

Remaining tasks:
- [ ] Task 23: Financial value display
- [ ] Task 24: Parallel edge execution
- [ ] Task 25: Database index for entity lookups
- [ ] Task 26: Final system integration verification

The navigation foundation is now in place for the complete Clockwork Canvas experience!
