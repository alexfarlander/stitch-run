# BMC Financial Sections Integration

## Overview

This document describes the integration of the CostsSection and RevenueSection components into the Business Model Canvas (BMC) as custom node types.

## Implementation

### New Node Types

Two new node types have been registered in the BMC canvas:

1. **`costs-section`** - Displays expense breakdowns and cost trends
2. **`revenue-section`** - Displays revenue metrics, customer counts, and plan breakdowns

### Node Wrappers

Created wrapper components to integrate the sections with React Flow:

- `CostsSectionNode.tsx` - Wraps CostsSection for use as a React Flow node
- `RevenueSectionNode.tsx` - Wraps RevenueSection for use as a React Flow node

### BMCCanvas Updates

Updated `BMCCanvas.tsx` to:

1. Import the new node components
2. Register them in the `nodeTypes` object
3. Handle z-index layering properly:
   - Background sections: z-index -1
   - Financial sections: z-index 5
   - Regular items: z-index 10
   - Entity overlay: renders on top (via React Flow layer)

### Type System Updates

Extended `NodeType` in `stitch.ts` to include:
- `costs-section`
- `revenue-section`
- Other item types (`integration-item`, `person-item`, `code-item`, `data-item`)

## Z-Index Layering

The layering ensures proper visual hierarchy:

```
Layer 4 (Top):    Entity Overlay (dots and labels)
Layer 3:          Regular Items (z-index: 10)
Layer 2:          Financial Sections (z-index: 5)
Layer 1:          Background Sections (z-index: -1)
Layer 0 (Bottom): Canvas Background
```

This ensures:
- Entity dots render above all sections
- Financial sections are interactive but don't block items
- Background sections provide visual structure

## Usage

To add financial sections to a BMC canvas:

```typescript
const flow: StitchFlow = {
  // ... flow config
  graph: {
    nodes: [
      // Background section
      {
        id: 'financial-section',
        type: 'section',
        position: { x: 50, y: 50 },
        data: {
          label: 'Financial',
          category: 'Financial',
        },
        width: 600,
        height: 400,
      },
      // Costs section
      {
        id: 'costs-node',
        type: 'costs-section',
        position: { x: 70, y: 100 },
        data: {
          canvasId: 'canvas-id',
          showDemo: true,
          width: 500,
          height: 150,
        },
        width: 500,
        height: 150,
        parentId: 'financial-section',
      },
      // Revenue section
      {
        id: 'revenue-node',
        type: 'revenue-section',
        position: { x: 70, y: 270 },
        data: {
          canvasId: 'canvas-id',
          showDemo: true,
          width: 500,
          height: 150,
        },
        width: 500,
        height: 150,
        parentId: 'financial-section',
      },
    ],
    edges: [],
  },
};
```

## Test Page

A test page is available at `/test-bmc-financial` that demonstrates:
- Both financial sections rendered in a BMC canvas
- Proper z-index layering
- Demo mode with realistic data
- Entity overlay compatibility

## Node Data Interface

### CostsSectionNode Data

```typescript
interface CostsSectionNodeData {
  canvasId: string;      // Canvas ID for entity queries
  showDemo?: boolean;    // Use demo data
  width?: number;        // Section width
  height?: number;       // Section height
}
```

### RevenueSectionNode Data

```typescript
interface RevenueSectionNodeData {
  canvasId: string;      // Canvas ID for entity queries
  showDemo?: boolean;    // Use demo data
  width?: number;        // Section width
  height?: number;       // Section height
}
```

## Verification

To verify the integration:

1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/test-bmc-financial`
3. Verify:
   - ✓ Costs section displays with demo data
   - ✓ Revenue section displays with demo data
   - ✓ Sections are positioned within the Financial section
   - ✓ Sections are not draggable (locked in place)
   - ✓ Entity overlay would render above sections (if entities present)

## Requirements Satisfied

This implementation satisfies task requirements:

- ✓ Register 'costs-section' and 'revenue-section' node types in BMCCanvas
- ✓ Add sections to Financial category area
- ✓ Ensure proper z-index and positioning
- ✓ Verify entity overlay renders correctly over sections
- ✓ Test drill-down navigation if applicable (N/A for these sections)

**Requirements: 1.1, 2.1**
