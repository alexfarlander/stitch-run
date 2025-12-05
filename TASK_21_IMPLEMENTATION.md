# Task 21: Add Visual Drill-Down Cue to Item Nodes

## Implementation Summary

### Changes Made

1. **Updated SectionItemNode Component** (`src/components/canvas/nodes/SectionItemNode.tsx`)
   - Enhanced the drill-down indicator to be **always visible** when a node has linked content
   - Changed from hover-only visibility to permanent visibility with hover enhancement
   - Added a circular badge with cyan background and border around the ExternalLink icon
   - Indicator scales up on hover for better user feedback

### Visual Design

**Before:**
- ExternalLink icon only appeared on hover
- Simple icon with no background
- Could be easily missed by users

**After:**
- Circular badge with cyan background (`bg-cyan-500/20`) and border (`border-cyan-400/50`)
- Always visible when node is drillable
- Scales up and brightens on hover for interactive feedback
- Positioned at bottom-right corner of the node card

### Component Code

```tsx
{/* Drill-down indicator - always visible when node is drillable */}
{hasLinkedContent && (
  <div className="absolute bottom-1 right-1">
    <div className={`
      flex items-center justify-center
      w-4 h-4 rounded-full
      bg-cyan-500/20 border border-cyan-400/50
      transition-all duration-200
      ${isHovered ? 'bg-cyan-500/40 border-cyan-400 scale-110' : ''}
    `}>
      <ExternalLinkIcon 
        className="w-2.5 h-2.5 text-cyan-400"
      />
    </div>
  </div>
)}
```

### Requirements Validated

✅ **Requirement 2.5**: "WHEN an item node has a drill-down workflow THEN the System SHALL display a visual cue indicating it is clickable"

The implementation satisfies this requirement by:
- Checking if node has `linked_workflow_id` or `linked_canvas_id`
- Displaying a prominent, always-visible badge with icon
- Using cyan color scheme consistent with the canvas theme
- Providing hover feedback to indicate interactivity

### Verification

Created verification script: `scripts/verify-drill-down-indicator.ts`

The script:
- Generates the BMC graph from seed data
- Counts drillable vs non-drillable nodes
- Lists all nodes with their drill-down status
- Confirms component implementation details

**Current Status:**
- Component implementation: ✅ Complete
- Visual indicator: ✅ Always visible for drillable nodes
- Hover enhancement: ✅ Scales and brightens on hover
- No TypeScript errors: ✅ Verified with getDiagnostics

### Testing

To test the visual indicator:
1. Seed the BMC canvas: `npx tsx scripts/seed-clockwork.ts`
2. Seed workflow links: `npx tsx scripts/seed-lead-capture-workflow.ts` (and other workflow scripts)
3. Open the BMC canvas in the browser
4. Look for item nodes with the cyan circular badge in the bottom-right corner
5. Hover over drillable nodes to see the badge scale up
6. Click drillable nodes to navigate to their workflows

### Notes

- The indicator only appears when `hasLinkedContent` is true (node has `linked_workflow_id` or `linked_canvas_id`)
- The component already had drill-down navigation logic implemented
- This task focused on making the visual cue more prominent and always visible
- The cyan color scheme matches the existing canvas theme and edge colors
