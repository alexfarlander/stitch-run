# Task 007: Entity Fields and Visualization System

**Phase:** Entity Tracking System  
**Completed:** December 3, 2025

## Overview

This task implemented the missing entity database fields and built the complete entity visualization system for the Stitch canvas. Entities (customers/leads) can now be tracked visually as they move through the Business Model Canvas, with support for real-time position updates, journey history display, and detailed entity information panels.

## Files Modified

### Database Schema

#### `stitch-run/supabase/migrations/007_add_missing_entity_fields.sql`
**Created** - Added three critical fields to the `stitch_entities` table:
- `email` (TEXT) - Entity identity/contact information
- `destination_node_id` (TEXT) - Tracks where entity is heading when traveling on an edge
- `completed_at` (TIMESTAMPTZ) - Timestamp for when entity finishes their journey
- Added indexes on `completed_at` and `email` for efficient queries

### Seed Scripts

#### `stitch-run/scripts/seed-bmc.ts`
**Modified** - Enhanced BMC seeding with entity data:
- Added `seedEntities()` function that creates 5 demo entities (Monica, Ross, Rachel, Chandler, Phoebe)
- Entities demonstrate different states: customer (completed journey), lead (in trial), traveling (on edge), churned
- Each entity includes realistic journey history with timestamps, metadata (CAC, LTV, source, plan)
- Integrated entity seeding into main seed flow
- Added entity count verification to output

#### `stitch-run/scripts/verify-bmc.ts`
**No changes** - Verification script remains focused on BMC structure validation

#### `stitch-run/scripts/apply-bmc-migration.ts`
**No changes** - Migration application script unchanged

### Type Definitions & Business Logic

#### `stitch-run/src/lib/seeds/default-bmc.ts`
**Modified** - Core BMC generation with entity support:
- Added `seedEntities()` function (same as in seed-bmc.ts for consistency)
- Updated `seedDefaultBMC()` to call entity seeding after BMC creation
- Maintains idempotency - only seeds entities if BMC is newly created
- Entities reference actual item nodes in the BMC graph (e.g., 'item-linkedin-ads', 'item-free-trial')

#### `stitch-run/src/lib/entities/position.ts`
**No changes** - Position calculation utilities remain unchanged

### UI Components

#### `stitch-run/src/components/canvas/entities/EntityDot.tsx`
**Modified** - Visual representation of individual entities:
- Renders 28px circular avatar dots with glow effects
- Color-coded by entity type: cyan (lead), green (customer), red (churned)
- Pulse animation when entity is moving (has `current_edge_id`)
- Hover tooltip shows entity name
- Reduced opacity for churned entities (0.6)
- Click handler for entity selection
- **Note:** `isSelected` prop currently unused (potential future enhancement)

#### `stitch-run/src/components/canvas/entities/EntityOverlay.tsx`
**Modified** - Manages all entity rendering on canvas:
- Uses `useEntities()` hook to fetch real-time entity data for canvas
- Calculates entity positions based on current node or edge location
- For node positions: clusters entities at bottom of node with horizontal spacing
- For edge positions: interpolates along edge path using progress value
- Transforms flow coordinates to screen coordinates using React Flow viewport
- Handles entity selection state
- **Note:** Unused `nodes` variable could be cleaned up

#### `stitch-run/src/components/canvas/edges/JourneyEdge.tsx`
**No changes** - Edge visualization with stats tooltips unchanged

#### `stitch-run/src/components/panels/EntityDetailPanel.tsx`
**Modified** - Detailed entity information sidebar:
- Displays entity avatar, name, type badge, and email
- Shows business metrics: source, plan, CAC (Customer Acquisition Cost), LTV (Lifetime Value)
- Current position display (node or edge with progress percentage)
- Complete journey timeline with visual event markers
- Chronological event list with timestamps, node/edge IDs, and notes
- Shows created_at, updated_at, and completed_at timestamps
- Color-coded type badges matching EntityDot colors
- Formatted dates in readable format (e.g., "Nov 20, 2:00 PM")

#### `stitch-run/src/components/canvas/BMCCanvas.tsx`
**Modified** - Main canvas component integration:
- Added `EntityOverlay` component to render entities on top of canvas
- Passes `flow.id` as `canvasId` to EntityOverlay for entity filtering
- Entities render above nodes/edges but below controls
- Maintains existing BMC section and item node rendering

## Technical Details

### Entity States Demonstrated

1. **Customer (Monica)** - Completed full journey from LinkedIn Ads → Demo → Trial → Pro Plan → Active Subscriber
2. **Lead in Trial (Ross)** - Currently in free trial, came from SEO content
3. **Lead Traveling (Rachel)** - Currently moving along edge from LinkedIn Ads to Demo Call (40% progress)
4. **Churned (Chandler)** - Completed journey but churned from Basic Plan, includes churn reason in metadata
5. **New Lead (Phoebe)** - Just entered from YouTube Channel

### Position Calculation

- **At Node:** Entities cluster at bottom of node with 35px horizontal spacing
- **On Edge:** Linear interpolation between source and target nodes (TODO: Use actual SVG path for curved edges)
- **Screen Coords:** Flow coordinates transformed using React Flow viewport (zoom + pan)

### Real-time Updates

- `EntityOverlay` uses `useEntities()` hook which subscribes to Supabase real-time updates
- Position changes in database automatically trigger UI re-renders
- No manual refresh needed to see entity movement

## Validation

The implementation satisfies these Entity Tracking System requirements:
- **Requirement 1:** Entity position tracking (node or edge with progress)
- **Requirement 2:** Database persistence of entity positions
- **Requirement 3:** Journey history with timestamped events
- **Requirement 5:** Visual entity dots on canvas with color coding
- **Requirement 7:** Real-time UI updates via Supabase subscriptions

## Known Issues

1. **EntityDot.tsx:** `isSelected` prop is declared but never used (line 8)
2. **EntityOverlay.tsx:** `nodes` variable is declared but never read (line 28)
3. **Edge interpolation:** Currently uses linear interpolation; should use SVG path's `getPointAtLength()` for curved edges (see design.md)

## Next Steps

1. Implement proper Bezier curve interpolation for edge positions
2. Add entity selection/detail panel interaction
3. Clean up unused variables
4. Add entity movement API functions (startJourney, moveAlongEdge, arriveAtNode)
5. Implement edge statistics display
6. Add manual entity movement controls
