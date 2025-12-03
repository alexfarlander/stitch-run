# Making Nodes Clickable in React Flow

## The Problem

React Flow nodes can be tricky to make clickable, especially when:
1. Nodes are set to `selectable: false` or `draggable: false`
2. Nodes have `pointer-events: none` for styling
3. Nodes are background elements with negative z-index
4. Child nodes are nested inside parent nodes

## Solutions

### Solution 1: Use `pointer-events-auto` on Interactive Elements

**For Section Nodes (Background containers):**

```tsx
<div className="pointer-events-none"> {/* Main container */}
  <div className="pointer-events-auto cursor-pointer" onClick={handleClick}>
    {/* This div IS clickable */}
  </div>
</div>
```

**Current Implementation in SectionNode:**
```tsx
<div className="pointer-events-none"> {/* Section background */}
  <div className="pointer-events-auto" onDoubleClick={handleDrillDown}>
    {/* Header with button */}
    <button onClick={handleDrillDown}>
      <ChevronRight />
    </button>
  </div>
</div>
```

✅ **This should work!** The header and button have `pointer-events-auto`.

### Solution 2: Make Nodes Selectable

**In BMCCanvas.tsx:**

```tsx
// Current (sections not selectable)
draggable: !isSection,
selectable: !isSection,

// Alternative (sections selectable but not draggable)
draggable: !isSection,
selectable: true, // Allow selection for click events
```

**Trade-off**: Sections will show selection highlight when clicked.

### Solution 3: Use React Flow's `onNodeClick` Handler

**In BMCCanvas.tsx:**

```tsx
import { useCallback } from 'react';

export function BMCCanvas({ flow }: BMCCanvasProps) {
  const { drillInto } = useCanvasNavigation();
  
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'section') {
      const data = node.data as SectionNodeData;
      if (data.child_canvas_id) {
        drillInto(data.child_canvas_id, data.label, 'workflow');
      }
    }
    
    if (node.type === 'item' || node.type === 'section-item') {
      const data = node.data as ItemNodeData;
      if (data.linked_workflow_id) {
        drillInto(data.linked_workflow_id, data.label, 'workflow');
      }
    }
  }, [drillInto]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={handleNodeClick}
      // ...
    />
  );
}
```

✅ **This works even with `selectable: false`!**

### Solution 4: Use `onNodeDoubleClick` for Sections

```tsx
const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
  if (node.type === 'section') {
    const data = node.data as SectionNodeData;
    if (data.child_canvas_id) {
      drillInto(data.child_canvas_id, data.label, 'workflow');
    }
  }
}, [drillInto]);

<ReactFlow
  onNodeDoubleClick={handleNodeDoubleClick}
  // ...
/>
```

**Benefit**: Prevents accidental navigation when clicking to select.

## Recommended Approach

### For Section Nodes (Background containers)

**Use React Flow's event handlers + pointer-events for buttons:**

```tsx
// In BMCCanvas.tsx
const handleNodeDoubleClick = useCallback((event, node) => {
  if (node.type === 'section' && node.data.child_canvas_id) {
    drillInto(node.data.child_canvas_id, node.data.label, 'workflow');
  }
}, [drillInto]);

<ReactFlow onNodeDoubleClick={handleNodeDoubleClick} />
```

**Keep the button in SectionNode for visual indicator:**
```tsx
<button onClick={handleDrillDown} className="pointer-events-auto">
  <ChevronRight />
</button>
```

**Result**: 
- Double-click anywhere on section → drill down
- Click button → drill down
- Section stays non-draggable and non-selectable

### For Item Nodes (Interactive elements)

**Use click handlers in the node component:**

```tsx
// In ItemNode.tsx
const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (nodeData.linked_workflow_id) {
    drillInto(nodeData.linked_workflow_id, nodeData.label, 'workflow');
  }
};

<div onClick={handleClick} className="cursor-pointer">
  {/* Item content */}
</div>
```

**In BMCCanvas.tsx:**
```tsx
draggable: !isSection,  // Items are draggable
selectable: !isSection, // Items are selectable
```

**Result**: Items are fully interactive and clickable.

## Debugging Checklist

### If clicks aren't working:

1. **Check pointer-events**
   ```tsx
   // ❌ Bad - blocks all clicks
   <div className="pointer-events-none">
     <button onClick={...}>Click me</button>
   </div>
   
   // ✅ Good - button is clickable
   <div className="pointer-events-none">
     <button onClick={...} className="pointer-events-auto">
       Click me
     </button>
   </div>
   ```

2. **Check z-index**
   ```tsx
   // ❌ Bad - negative z-index might be behind other elements
   style={{ zIndex: -1 }}
   
   // ✅ Good - use pointer-events instead
   className="pointer-events-none"
   style={{ zIndex: -1 }}
   // Then add pointer-events-auto to clickable children
   ```

3. **Check event propagation**
   ```tsx
   // ✅ Good - prevents parent handlers from firing
   const handleClick = (e: React.MouseEvent) => {
     e.stopPropagation();
     // Your logic
   };
   ```

4. **Check React Flow props**
   ```tsx
   // If selectable: false, use React Flow event handlers
   <ReactFlow
     onNodeClick={handleNodeClick}
     onNodeDoubleClick={handleNodeDoubleClick}
   />
   ```

5. **Check for overlapping elements**
   - Use browser DevTools to inspect click target
   - Look for transparent overlays blocking clicks
   - Check if EntityOverlay is blocking clicks

## Complete Example

```tsx
// BMCCanvas.tsx
export function BMCCanvas({ flow }: BMCCanvasProps) {
  const { drillInto } = useCanvasNavigation();
  
  // Handle section double-clicks
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'section') {
      const data = node.data as SectionNodeData;
      if (data.child_canvas_id) {
        drillInto(data.child_canvas_id, data.label, 'workflow');
      }
    }
  }, [drillInto]);
  
  // Handle item single clicks
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'item' || node.type === 'section-item') {
      const data = node.data as ItemNodeData;
      if (data.linked_workflow_id) {
        drillInto(data.linked_workflow_id, data.label, 'workflow');
      }
    }
  }, [drillInto]);

  const nodes = useMemo(() => {
    return flow.graph.nodes.map((node) => {
      const isSection = node.type === 'section';
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        draggable: !isSection,
        selectable: !isSection,
        connectable: !isSection,
      };
    });
  }, [flow.graph.nodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onNodeDoubleClick={handleNodeDoubleClick}
    >
      {/* ... */}
    </ReactFlow>
  );
}
```

## Testing Clicks

```tsx
// Add console.log to debug
const handleNodeClick = useCallback((event, node) => {
  console.log('Node clicked:', node.id, node.type, node.data);
  // Your logic
}, []);

// Test in browser console
document.querySelector('.react-flow__node').click();
```

## Common Issues

### Issue 1: "Nothing happens when I click"
**Solution**: Add `onNodeClick` handler to ReactFlow component

### Issue 2: "Button shows but doesn't respond"
**Solution**: Add `pointer-events-auto` to button

### Issue 3: "Section header is clickable but section body isn't"
**Solution**: This is intentional! Use `onNodeDoubleClick` for full section clicks

### Issue 4: "Clicks work in dev but not in production"
**Solution**: Check if event handlers are properly memoized with `useCallback`

### Issue 5: "Child nodes block parent clicks"
**Solution**: Use `pointer-events-none` on parent, `pointer-events-auto` on children
