# Drill-Down Indicator Visual Reference

## What It Looks Like

### Item Node with Drill-Down Indicator

```
┌─────────────────────────┐
│ 🔧 LinkedIn Ads    ●    │  ← Status indicator (top-right)
│                         │
│                      ⭕ │  ← Drill-down badge (bottom-right)
└─────────────────────────┘
```

### Detailed View

**Normal State:**
- Circular badge: 16px × 16px
- Background: Cyan with 20% opacity (`bg-cyan-500/20`)
- Border: Cyan with 50% opacity (`border-cyan-400/50`)
- Icon: ExternalLink icon, 10px × 10px, cyan color

**Hover State:**
- Badge scales to 110% size
- Background brightens to 40% opacity (`bg-cyan-500/40`)
- Border becomes fully opaque (`border-cyan-400`)
- Smooth transition (200ms)

### Color Scheme

- **Badge Background**: `#06b6d4` (cyan-500) at 20% opacity
- **Badge Border**: `#22d3ee` (cyan-400) at 50% opacity
- **Icon Color**: `#22d3ee` (cyan-400) at 100% opacity

### When It Appears

The drill-down indicator appears when:
- Node has `linked_workflow_id` property set
- OR node has `linked_canvas_id` property set

### Nodes That Show Indicator (After Workflow Seeding)

1. **LinkedIn Ads** → Lead Capture Workflow
2. **Demo Call** → Demo Scheduling Workflow
3. **Free Trial** → Trial Activation Workflow
4. **Help Desk** → Support Handler Workflow
5. **CRM** → CRM Sync Workflow
6. **Analytics** → Analytics Update Workflow
7. **Slack** → Slack Notify Workflow
8. **Stripe** → Stripe Sync Workflow

### Nodes That Don't Show Indicator

All other item nodes without linked workflows (e.g., YouTube Channel, SEO Content, Basic Plan, etc.)

## User Experience

1. **Discovery**: Users can immediately see which nodes are drillable
2. **Affordance**: The badge signals interactivity without being intrusive
3. **Feedback**: Hover effect confirms the node is clickable
4. **Consistency**: Cyan color matches the canvas theme and system edges

## Implementation Details

- Component: `src/components/canvas/nodes/SectionItemNode.tsx`
- Condition: `hasLinkedContent = !!(linked_workflow_id || linked_canvas_id)`
- Position: `absolute bottom-1 right-1`
- Always visible (not just on hover)
- Scales on hover for better UX
