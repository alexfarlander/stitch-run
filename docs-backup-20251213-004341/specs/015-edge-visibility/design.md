# Design Document

## Overview

The Edge Visibility feature enhances the Stitch Business Model Canvas by implementing intelligent, context-aware edge visibility controls. This design transforms the canvas from a static network diagram into a dynamic, "living" visualization where connections appear and disappear based on user interaction and system activity.

The core principle is **progressive disclosure**: edges are hidden by default to reduce visual noise, but become visible when they provide contextual value. This creates a cleaner, more focused user experience while maintaining the ability to see the complete workflow structure when needed.

The implementation leverages existing React Flow infrastructure, Supabase Realtime subscriptions, and established hooks for edge traversal tracking. No new data models or backend changes are required—this is purely a frontend enhancement that orchestrates existing capabilities.

## Architecture

### Component Hierarchy

```
BMCCanvas (Main Container)
├── State Management
│   ├── showAllEdges (boolean)
│   ├── selectedNodeId (string | null)
│   └── traversingEdges (Map<string, boolean>) [from useEdgeTraversal hook]
├── ReactFlow
│   ├── Nodes (existing)
│   ├── Edges (enhanced with visibility logic)
│   │   ├── JourneyEdge (inherits opacity from parent)
│   │   └── SystemEdge (overrides opacity when pulsing)
│   └── Controls (existing + new toggle button)
└── Overlays (existing)
```

### Data Flow

1. **User Interaction → State Update**
   - Toggle button click → `setShowAllEdges(!showAllEdges)`
   - Node selection → `setSelectedNodeId(nodeId)`

2. **Realtime Events → State Update**
   - Entity starts traversal → `useEdgeTraversal` updates `traversingEdges` Map
   - System edge fires → `SystemEdge` component sets internal `isPulsing` state

3. **State → Edge Visibility Calculation**
   - `useMemo` recalculates edge array when dependencies change
   - Each edge gets `opacity` and `transition` styles based on visibility conditions

4. **Visibility Calculation → DOM Rendering**
   - React Flow renders edges with calculated styles
   - CSS transitions handle smooth opacity changes

### Visibility Decision Tree

```
For each edge E:
  IF showAllEdges === true
    THEN opacity = 1
  ELSE IF E.id in traversingEdges
    THEN opacity = 1
  ELSE IF selectedNodeId !== null AND (E.source === selectedNodeId OR E.target === selectedNodeId)
    THEN opacity = 1
  ELSE IF E.type === 'system' AND E.isPulsing === true
    THEN opacity = 1 (handled internally by SystemEdge component)
  ELSE
    opacity = 0
```

## Components and Interfaces

### Modified Components

#### 1. BMCCanvas.tsx

**New State:**
```typescript
const [showAllEdges, setShowAllEdges] = useState<boolean>(false);
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
```

**New Handler:**
```typescript
const handleSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
  if (nodes.length === 1) {
    setSelectedNodeId(nodes[0].id);
  } else {
    setSelectedNodeId(null);
  }
}, []);
```

**Enhanced Edge Calculation:**
```typescript
const edges: Edge[] = useMemo(() => {
  return flow.graph.edges.map((edge) => {
    const isTraversing = traversingEdges.get(edge.id) || false;
    const isConnectedToSelected = selectedNodeId && 
      (edge.source === selectedNodeId || edge.target === selectedNodeId);
    
    const isVisible = showAllEdges || isTraversing || isConnectedToSelected;
    
    const edgeType = edge.type || 'journey';
    
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edgeType,
      animated: isTraversing,
      style: { 
        stroke: edgeType === 'system' ? '#64748b' : '#06b6d4', 
        strokeWidth: 2,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none',
      },
      data: { 
        intensity: 0.8,
        isTraversing,
      },
    };
  });
}, [flow.graph.edges, traversingEdges, showAllEdges, selectedNodeId]);
```

**New UI Element:**
```typescript
<div className="absolute top-4 right-32 z-50">
  <button
    onClick={() => setShowAllEdges(prev => !prev)}
    className={`px-3 py-2 rounded-lg border transition-colors ${
      showAllEdges 
        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
        : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
    }`}
    title={showAllEdges ? 'Hide edges' : 'Show all edges'}
  >
    {showAllEdges ? '👁 Edges' : '👁‍🗨 Edges'}
  </button>
</div>
```

#### 2. SystemEdge.tsx

**Enhanced Visibility Logic:**
```typescript
// At component top, after isPulsing state
const shouldForceVisible = isPulsing;

// Wrap main render in group with conditional opacity override
<g style={{ opacity: shouldForceVisible ? 1 : undefined }}>
  {/* existing edge rendering */}
</g>
```

This ensures that when a system edge fires (isPulsing = true), it becomes visible even if the parent style has opacity: 0.

### Unchanged Components

- **JourneyEdge.tsx**: No changes needed. Opacity is controlled via parent style prop, which SVG elements inherit correctly.
- **useEdgeTraversal.ts**: No changes needed. Already provides the traversingEdges Map.
- **useEntityPosition.ts**: No changes needed. Entity positioning is independent of edge visibility.

## Data Models

No new data models are required. This feature uses existing data structures:

- **StitchFlow.graph.edges**: Array of edge definitions (source, target, type)
- **traversingEdges**: Map<string, boolean> from useEdgeTraversal hook
- **selectedNodeId**: Local component state (string | null)
- **showAllEdges**: Local component state (boolean)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties were identified as redundant or combinable:
- Properties 1.2 and 4.5 both test the default hidden state - consolidated into Property 1
- Properties 3.3 and 3.4 both test selected node connections - consolidated into Property 3
- Properties 6.1 and 6.2 both test journey edge styling - consolidated into Property 5
- Properties 6.3 and 6.4 both test system edge styling - consolidated into Property 6
- Properties 4.2 and 4.3 both test traversing edge state - consolidated into Property 4

### Correctness Properties

Property 1: Default hidden state
*For any* canvas state where showAllEdges is false AND no edges are in traversingEdges AND selectedNodeId is null, all edges should have opacity 0
**Validates: Requirements 1.2, 4.5**

Property 2: Toggle override visibility
*For any* edge, when showAllEdges is true, that edge's opacity should be 1 regardless of other visibility conditions
**Validates: Requirements 2.2**

Property 3: Selected node edge visibility
*For any* selected node and any edge, if the edge's source OR target matches the selectedNodeId, that edge's opacity should be 1
**Validates: Requirements 3.3, 3.4**

Property 4: Traversing edge visibility and animation
*For any* edge that exists in the traversingEdges map, that edge's opacity should be 1 AND its animated property should be true
**Validates: Requirements 4.2, 4.3**

Property 5: Journey edge styling
*For any* edge with type 'journey' or undefined type, the edge should have stroke color #06b6d4, strokeWidth 2, and no strokeDasharray
**Validates: Requirements 6.1, 6.2, 6.5**

Property 6: System edge styling
*For any* edge with type 'system', the edge should have stroke color #64748b, strokeWidth 2, and strokeDasharray '5 5'
**Validates: Requirements 6.3, 6.4**

Property 7: Hidden edge interaction prevention
*For any* edge with opacity 0, the pointerEvents style should be 'none'
**Validates: Requirements 1.4**

Property 8: Consistent transition timing
*For all* edges, the transition style property should include 'opacity 0.3s ease-in-out'
**Validates: Requirements 1.3, 7.3, 7.4**

Property 9: Toggle state inversion
*For any* current showAllEdges state value, clicking the toggle button should result in the opposite boolean value
**Validates: Requirements 2.1**

Property 10: Single node selection state
*For any* node selection event with exactly one node, selectedNodeId should equal that node's ID
**Validates: Requirements 3.1**

Property 11: Multi-selection or deselection state
*For any* node selection event with zero nodes OR more than one node, selectedNodeId should be null
**Validates: Requirements 3.2**

Property 12: System edge pulse override
*For any* SystemEdge component where isPulsing is true, the rendered group element should have opacity 1 or undefined (allowing override)
**Validates: Requirements 5.3**

Property 13: Tooltip text correctness
*For any* showAllEdges state value, the toggle button's title attribute should be "Hide edges" when true and "Show all edges" when false
**Validates: Requirements 2.5**

## Error Handling

### Edge Cases

1. **Undefined Edge Type**: When an edge has no type specified, default to 'journey' type styling
2. **Concurrent Traversals**: Multiple entities traversing the same edge should maintain visibility (handled by useEdgeTraversal hook)
3. **Rapid Toggle Clicks**: State updates are batched by React, preventing race conditions
4. **Missing Edge IDs**: Skip edges without valid IDs in visibility calculations
5. **Null Canvas ID**: useEdgeTraversal returns empty Map when canvasId is undefined

### Error States

- **Supabase Connection Loss**: SystemEdge pulse events may be missed, but edge will still be visible during traversal
- **Invalid Node Selection**: If selectedNodeId doesn't match any edge source/target, no edges become visible (expected behavior)
- **Malformed Edge Data**: Edge rendering falls back to default journey styling

### Validation

- Edge IDs must be non-empty strings
- Node IDs must be non-empty strings
- Opacity values are clamped between 0 and 1 by CSS
- Transition timing is validated by CSS parser

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **Initial Render State**: Verify canvas renders with all edges hidden when no visibility conditions are met
2. **Toggle Button Rendering**: Verify button displays correct text and styling for both on/off states
3. **Edge Type Defaulting**: Verify edges without explicit type default to 'journey' styling
4. **Null Selection Handling**: Verify selecting zero or multiple nodes sets selectedNodeId to null

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript property testing library):

Each property test will run a minimum of 100 iterations with randomly generated inputs.

**Property 1: Default hidden state**
- Generate: Random canvas states with showAllEdges=false, empty traversingEdges, null selectedNodeId
- Verify: All edges have opacity 0

**Property 2: Toggle override visibility**
- Generate: Random edge configurations with showAllEdges=true
- Verify: All edges have opacity 1

**Property 3: Selected node edge visibility**
- Generate: Random node IDs and edge configurations
- Verify: Edges connected to selected node have opacity 1

**Property 4: Traversing edge visibility and animation**
- Generate: Random edge IDs in traversingEdges map
- Verify: Those edges have opacity 1 and animated=true

**Property 5: Journey edge styling**
- Generate: Random edges with type='journey' or undefined
- Verify: Correct stroke color, width, and no dash array

**Property 6: System edge styling**
- Generate: Random edges with type='system'
- Verify: Correct stroke color, width, and dash array

**Property 7: Hidden edge interaction prevention**
- Generate: Random edges with opacity 0
- Verify: pointerEvents='none'

**Property 8: Consistent transition timing**
- Generate: Random edge configurations
- Verify: All have same transition property

**Property 9: Toggle state inversion**
- Generate: Random boolean values for showAllEdges
- Verify: Toggle action produces opposite value

**Property 10: Single node selection state**
- Generate: Random single-node selection events
- Verify: selectedNodeId equals the node's ID

**Property 11: Multi-selection or deselection state**
- Generate: Random multi-node or empty selection events
- Verify: selectedNodeId is null

**Property 12: System edge pulse override**
- Generate: Random SystemEdge states with isPulsing=true
- Verify: Rendered opacity is 1 or undefined

**Property 13: Tooltip text correctness**
- Generate: Random showAllEdges boolean values
- Verify: Title attribute matches expected text

### Integration Testing

Integration tests will verify the complete user experience:

1. **Entity Traversal Flow**: Start entity movement, verify edge becomes visible, verify edge hides after completion
2. **Node Selection Flow**: Select node, verify connected edges appear, deselect, verify edges disappear
3. **Toggle Interaction**: Click toggle, verify all edges appear, click again, verify edges return to contextual visibility
4. **System Edge Firing**: Trigger system edge fire event, verify pulse animation and visibility

### Testing Configuration

- **Skip tests**

## Implementation Notes

### Performance Considerations

1. **Memoization**: Edge array is memoized with proper dependencies to prevent unnecessary recalculations
2. **CSS Transitions**: Hardware-accelerated opacity transitions for smooth performance
3. **Event Throttling**: React Flow handles selection events efficiently
4. **Realtime Subscriptions**: Single channel per canvas, cleaned up on unmount

### Accessibility

1. **Keyboard Navigation**: Toggle button is keyboard accessible
2. **Screen Readers**: Button has descriptive title attribute
3. **Focus Indicators**: Button shows focus state with Tailwind focus utilities
4. **Color Contrast**: Cyan and slate colors meet WCAG AA standards

### Browser Compatibility

- CSS opacity transitions: Supported in all modern browsers
- SVG opacity inheritance: Supported in all modern browsers
- CSS pointer-events: Supported in all modern browsers
- React Flow: Requires modern browser with ES6 support

### Migration Path

No migration required. This is a pure frontend enhancement with no database changes. Existing canvases will automatically benefit from the new visibility controls.

## Future Enhancements

### Phase 2 Possibilities

1. **Financial Edges**: Third edge type for money flow visualization
2. **Edge Hover Preview**: Show edge on hover without selecting node
3. **Visibility Persistence**: Remember user's toggle preference in localStorage
4. **Edge Filtering**: Filter edges by type (show only journey, only system, etc.)
5. **Animation Speed Control**: User-adjustable transition timing
6. **Edge Highlighting**: Highlight critical path or most-used edges
7. **Minimap Edge Visibility**: Sync edge visibility with minimap display

### Performance Optimizations

1. **Virtual Edges**: Only render visible edges in very large graphs
2. **Debounced Visibility**: Debounce rapid visibility changes
3. **Web Workers**: Offload visibility calculations for massive graphs

## Dependencies

### Existing Dependencies (No Changes)
- @xyflow/react: ^12.x (React Flow library)
- react: ^18.x
- supabase-js: ^2.x
- tailwindcss: ^4.x

### New Dependencies
None required. All functionality uses existing libraries.

## Deployment Considerations

1. **No Database Changes**: Pure frontend update, no migrations needed
2. **No API Changes**: No backend modifications required
3. **No Breaking Changes**: Existing functionality remains unchanged
4. **Backward Compatible**: Works with all existing canvas data
5. **Rollback Safe**: Can be reverted without data loss

## Success Metrics

### User Experience Metrics
- Reduced visual clutter: Fewer visible edges in default view
- Improved focus: Users can see relevant connections when needed
- Faster comprehension: Cleaner canvas aids understanding

### Technical Metrics
- No performance regression: Edge rendering time remains constant
- Smooth transitions: 60fps opacity animations
- Memory stable: No memory leaks from event subscriptions

### Validation Criteria
- No console errors or warnings
- Accessibility audit passes
