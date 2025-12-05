# Edge Visibility & Visual Refinement Plan

**Goal:** Reduce visual noise in the BMC view by hiding edges by default, making the canvas feel cleaner and more "magical" when entities travel or interactions occur.

---

## 1. Visibility Logic

Edges should be **hidden by default** (opacity: 0) and only visible when specific conditions are met.

### The Visibility Equation

An edge `E` is visible if:
1. `Global Toggle` is ON
   **OR**
2. `E` is currently being **traversed** by an entity
   **OR**
3. `E` is connected to the currently **selected node** (Source or Target)
   **OR**
4. `E` is a **System Edge** that is currently **firing** (pulsing)

### State Requirements

We need to track the following states in `BMCCanvas`:

| State | Source | Purpose |
|---|---|---|
| `showAllEdges` | Local State (Toggle) | Manual override to see full structure. |
| `selectedNodeId` | React Flow `onSelectionChange` callback | To show context for a specific node. |
| `traversingEdgeIds` | **Already exists:** `useEdgeTraversal(flow.id)` → Line 61 in BMCCanvas.tsx | List of edges currently being traversed. |
| `firingEdgeIds` | Realtime subscription in `SystemEdge.tsx` (already implemented) | List of system edges currently pulsing. |

---

## 2. Visual Separation (Styles)

We need clear visual distinction between the "physical" journey of the customer and the "digital" signals of the system.

### A. Journey Edges (UX/Customer Flow)
*   **Concept:** Physical movement, "The Road".
*   **Style:**
    *   **Line:** Solid, 2px width.
    *   **Color:** Cyan (`#06b6d4`) - already implemented in `JourneyEdge.tsx`
    *   **Animation:** Animated dashes + pulse when `isTraversing` is true (already implemented).
    *   **Visibility:** Hidden by default; fades in when active.

### B. System Edges (Backend/Signals)
*   **Concept:** Data transmission, "The Wire".
*   **Style:**
    *   **Line:** Dashed (`stroke-dasharray: 5 5`), 2px width - already implemented in `SystemEdge.tsx`
    *   **Color:** Slate Gray (`#64748b`) - already implemented
    *   **Animation:** Pulse effect when firing (already implemented via Realtime subscription).
    *   **Visibility:** Hidden by default; fades in when pulsing or connected node is selected.

### C. Financial Edges (Optional - Future Enhancement)
*   **Concept:** Money movement.
*   **Implementation:** Consider as a third edge type connecting to Revenue/Cost nodes.
*   **Deferred:** Not required for the initial implementation.

---

## 3. Existing Codebase Analysis

### Files to Modify

| File | Current Behavior | Change Needed |
|---|---|---|
| `src/components/canvas/BMCCanvas.tsx` | Renders all edges visible | Add node selection tracking + toggle + edge visibility logic |
| `src/components/canvas/edges/JourneyEdge.tsx` | Always visible, animated | Add opacity + transition CSS for fade-in/out |
| `src/components/canvas/edges/SystemEdge.tsx` | Always visible (dashed) | Already handles `isPulsing` state; needs opacity handling |

### Existing Hooks (DO NOT DUPLICATE)

| Hook | File | Purpose | Usage |
|---|---|---|---|
| `useEdgeTraversal` | `src/hooks/useEdgeTraversal.ts` | Returns `Map<string, boolean>` of traversing edges | Already used in `BMCCanvas.tsx` line 61 |
| `useEntities` | `src/hooks/useEntities.ts` | Returns entities with `current_edge_id` and `edge_progress` | Used by `EntityOverlay` |
| `useEntityPosition` | `src/hooks/useEntityPosition.ts` | Calculates entity position on edge based on `edge_progress` | Already handles edge travel |

### Existing Edge Components (DO NOT CREATE NEW FILES)

| Component | File | Status |
|---|---|---|
| `JourneyEdge` | `src/components/canvas/edges/JourneyEdge.tsx` | ✅ Exists, needs opacity handling |
| `SystemEdge` | `src/components/canvas/edges/SystemEdge.tsx` | ✅ Exists, needs opacity handling |

---

## 4. Entity Travel Along Edges (Current Implementation)

### How It Works (Already Implemented)

1. **Entity starts travel:** Database sets `current_edge_id` and `edge_progress = 0`
2. **Supabase Realtime:** Broadcasts `edge_start` event (subscribed in `useEdgeTraversal.ts`)
3. **Edge animation:** `JourneyEdge` receives `isTraversing: true` via `traversingEdges.get(edge.id)`
4. **Entity position:** `getEntityEdgePosition()` in `src/lib/entities/position.ts` calculates position along the SVG path
5. **Progress updates:** `edge_progress` increases from 0 to 1
6. **Entity arrives:** `current_edge_id` set to `null`, `current_node_id` set to destination

### Current Entity Travel Files

| File | Purpose |
|---|---|
| `src/lib/entities/travel.ts` | `startEdgeTravel()`, `arriveAtNode()` database operations |
| `src/lib/entities/position.ts` | `getEntityEdgePosition()` - calculates position along SVG path |
| `src/hooks/useEntityPosition.ts` | Hook that calls position calculation, handles viewport transform |
| `src/components/canvas/entities/EntityOverlay.tsx` | Renders `EntityDot` at calculated positions |
| `src/lib/canvas/animation-config.ts` | `ENTITY_TRAVEL_DURATION_MS = 2000` |

### Entity Travel Visual Check

**Current behavior appears correct:**
- `EntityOverlay` uses `useEntityPositions()` which handles entities on edges (line 120-129 in `useEntityPosition.ts`)
- `getEntityEdgePosition()` uses actual SVG path for smooth curved movement (line 74-81 in `position.ts`)
- Animation duration synced at 2 seconds (`ENTITY_TRAVEL_DURATION_MS`)

**Potential improvement needed:**
- Entities traveling on edges may not be visually distinct enough. Consider:
  - Adding a slight bounce/scale animation to the entity while traveling
  - Adding a "trail" effect behind the entity

---

## 5. Detailed Implementation Instructions

### Step 1: Add "Show Edges" Toggle to BMCCanvas

**File:** `src/components/canvas/BMCCanvas.tsx`

**Location:** Add after line 59 (after `const { drillInto } = useCanvasNavigation();`)

```typescript
// Edge visibility toggle state
const [showAllEdges, setShowAllEdges] = useState(false);
```

**Location:** Add UI toggle near the existing controls (around line 235, near DemoModeButton)

```tsx
{/* Edge Visibility Toggle */}
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

### Step 2: Add Node Selection Tracking

**File:** `src/components/canvas/BMCCanvas.tsx`

**Location:** Add after line 59

```typescript
// Track selected node for edge visibility
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

// Handle selection change
const handleSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
  if (nodes.length === 1) {
    setSelectedNodeId(nodes[0].id);
  } else {
    setSelectedNodeId(null);
  }
}, []);
```

**Location:** Add to ReactFlow props (around line 239)

```tsx
<ReactFlow
  // ... existing props
  onSelectionChange={handleSelectionChange}
  // ...
>
```

### Step 3: Create Edge Visibility Logic

**File:** `src/components/canvas/BMCCanvas.tsx`

**Location:** Replace existing edges memo (lines 180-193) with:

```typescript
// Transform flow edges with traversal state AND visibility
const edges: Edge[] = useMemo(() => {
  return flow.graph.edges.map((edge) => {
    const isTraversing = traversingEdges.get(edge.id) || false;
    const isConnectedToSelected = selectedNodeId && 
      (edge.source === selectedNodeId || edge.target === selectedNodeId);
    
    // Visibility: Show if toggle is on, or traversing, or connected to selected node
    const isVisible = showAllEdges || isTraversing || isConnectedToSelected;
    
    // Determine edge type (default to 'journey' if not specified)
    const edgeType = edge.type || 'journey';
    
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edgeType, // Use actual edge type
      animated: isTraversing, // Animate only when traversing
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

### Step 4: Update Edge Components for Opacity Transitions

**File:** `src/components/canvas/edges/JourneyEdge.tsx`

**No changes needed:** The opacity will be controlled by the parent via the `style` prop. SVG inherits opacity correctly.

**File:** `src/components/canvas/edges/SystemEdge.tsx`

**Location:** Update the main path to inherit opacity (line 70-79). The component already handles `isPulsing` which should override the hidden state. When `isPulsing` is true, the edge should temporarily become visible even if the style opacity is 0.

**Add this logic at the top of the component (after line 36):**

```typescript
// When pulsing, force visibility by overriding opacity
const shouldForceVisible = isPulsing;
```

**Then wrap the render return to apply visibility:**

```typescript
// In the main g element, add conditional opacity override
<g style={{ opacity: shouldForceVisible ? 1 : undefined }}>
  {/* ... existing content ... */}
</g>
```

### Step 5: Handle System Edge Firing Visibility

System edges need special handling because they pulse via Realtime events. The current implementation in `SystemEdge.tsx` (lines 49-65) already:
1. Subscribes to `edge_fired` events
2. Sets `isPulsing = true` for 1 second

**Change needed in `BMCCanvas.tsx`:**

To make system edges visible when they fire, we need to also track firing edges. We have two options:

**Option A (Simpler):** Rely on the component's internal `isPulsing` state to override opacity. This is already partially handled if we add the `shouldForceVisible` logic above.

**Option B (Centralized):** Add a new state `firingEdgeIds` and subscribe to the same Realtime channel in `BMCCanvas`. This is more complex but gives us centralized control.

**Recommendation:** Use Option A for now. The edge component handles its own visibility when pulsing.

---

## 6. User Experience Walkthrough

1.  **Default View:**
    *   Canvas looks clean. Only Nodes are visible.
    *   Entities sit on nodes.
    *   No spaghetti lines.

2.  **Interaction - Selection:**
    *   User clicks "LinkedIn Ads" node.
    *   **Result:** The outgoing edge to "Demo Call" fades in (0.3s transition). Any system edges from that node also fade in (dashed).
    *   User understands: "Ah, this connects to there."

3.  **Interaction - Demo Run:**
    *   Webhook fires → Entity moves from LinkedIn Ads to Demo Call.
    *   **Result:** The journey edge fades in + animates while entity travels (2 seconds).
    *   Werewolf avatar moves along the visible edge.
    *   Werewolf arrives. Edge fades out (0.3s transition).

4.  **Interaction - System Trigger:**
    *   Werewolf arrives at "Demo Call".
    *   **Result:** The system edge to "CRM" flashes/pulses (fades in, animates, fades out over 1 second).
    *   User sees: "Data just moved to the CRM."

5.  **Toggle Override:**
    *   User clicks the "Show Edges" toggle.
    *   **Result:** ALL edges immediately become visible. Good for understanding the full structure.

---

## 7. Implementation Tasks

- [ ] **Task 1:** Add `showAllEdges` state and toggle button to `BMCCanvas.tsx`
- [ ] **Task 2:** Add `selectedNodeId` state and `onSelectionChange` handler to `BMCCanvas.tsx`
- [ ] **Task 3:** Update `edges` useMemo to include visibility logic based on toggle, selection, and traversal
- [ ] **Task 4:** Ensure `SystemEdge.tsx` forces visibility when `isPulsing` is true
- [ ] **Task 5:** Test that entities on edges remain visible and smoothly animated

---

## 8. Files Changed Summary

| File | Action |
|---|---|
| `src/components/canvas/BMCCanvas.tsx` | Add state, toggle UI, selection handler, edge visibility logic |
| `src/components/canvas/edges/SystemEdge.tsx` | Minor: Force visibility when pulsing |
| - | NO new files needed |
| - | DO NOT create new hooks for edge visibility |

---

## 9. Entity Travel Enhancements (Optional - Future)

If entities traveling on edges don't look "good enough", consider these enhancements:

1. **Traveling Entity Highlight:**
   - Add a glowing aura around entities while on an edge
   - File to modify: `src/components/canvas/entities/EntityDot.tsx`
   - Add condition: `if (entity.current_edge_id) { add pulse class }`

2. **Trail Effect:**
   - Draw a fading trail behind the moving entity
   - Would require a new overlay component tracking position history

3. **Curved Path Following:**
   - ✅ Already implemented: `getEntityEdgePosition()` uses `SVGPathElement.getPointAtLength()` for accurate curved paths
   - See `src/lib/entities/position.ts` lines 123-141

**Current entity travel appears to be correctly implemented.** The main issue is edge visibility noise, which this plan addresses.
