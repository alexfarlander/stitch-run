# Stitch Frontend Roadmap: The "Wow" Factor

## 1. Current Status & The Gap
**Backend (99% Done):** The "Edge-Walker" engine (`src/lib/engine/edge-walker.ts`) is robust. It handles parallel execution, webhooks, and state management via Supabase.
**Frontend (Gaps):** The frontend is static. The "Living BMC" promise is unfulfilled.

## 2. The Goal: "It's Alive"
Make the canvas a **real-time visualization of the backend state**.

---

## 3. Directions to "Wow" (Detailed Implementation)

---

### Direction 1: Visualize the "Edge-Walk"

> **User Visible Result:** When an entity moves from Node A to Node B, a glowing "pulse" travels along the edge connecting them. The entity "dot" slides smoothly along the path.

#### Task 1.1: Add `isTraversing` prop to `JourneyEdge`
*   **File:** `src/components/canvas/edges/JourneyEdge.tsx`
*   **Instructions:**
    1.  Add a new prop `isTraversing: boolean` to the `JourneyEdgeData` interface (line 6).
    2.  In the component, if `isTraversing` is true, add a second `<path>` element that uses an SVG `linearGradient` to animate a "light pulse" traveling from source to target.
    3.  Use `strokeDashoffset` animation with a short duration (e.g., 500ms) to create the pulse effect.
*   **Visible Result:** When `isTraversing` is true, a bright cyan pulse travels along the edge once.

#### Task 1.2: Create `useEdgeTraversal` hook
*   **File:** Create `src/hooks/useEdgeTraversal.ts`
*   **Instructions:**
    1.  Subscribe to Supabase Realtime channel for `stitch_journey_events` table using `useRealtimeSubscription`.
    2.  Filter for `event_type = 'edge_start'` events.
    3.  When an event is received, return the `edge_id` and set a timeout to clear it after 500ms.
    4.  Return a `Map<string, boolean>` where the key is `edge_id` and value is `true` if currently traversing.
*   **Visible Result:** None directly. This hook provides data.

#### Task 1.3: Wire `useEdgeTraversal` into `BMCCanvas` and `WorkflowCanvas`
*   **Files:** `src/components/canvas/BMCCanvas.tsx`, `src/components/canvas/WorkflowCanvas.tsx`
*   **Instructions:**
    1.  Import and call `useEdgeTraversal(canvasId)`.
    2.  In the `edges` memo (line ~169 in BMCCanvas), add `data: { ...edge.data, isTraversing: traversingEdges.get(edge.id) || false }`.
*   **Visible Result:** Edges now pulse when entities traverse them.

---

### Direction 2: The "Pulse" of Execution (Worker Feedback)

> **User Visible Result:** When a worker node is "running", it has a pulsing amber glow. When it completes, it flashes bright green for 1 second, then settles. Failed nodes flash red.

#### Task 2.1: Enhance `BaseNode` with animated status transitions
*   **File:** `src/components/canvas/nodes/BaseNode.tsx`
*   **Instructions:**
    1.  Current `getStatusStyles` (line 57) uses `animate-pulse` which is an opacity animation. **Replace it with a box-shadow keyframe animation.**
    2.  Add to `globals.css`:
        ```css
        @keyframes pulse-running {
          0%, 100% { box-shadow: 0 0 10px rgba(251,191,36,0.5); }
          50% { box-shadow: 0 0 30px rgba(251,191,36,0.9); }
        }
        @keyframes flash-completed {
          0% { box-shadow: 0 0 50px rgba(0,255,153,1); }
          100% { box-shadow: 0 0 15px rgba(0,255,153,0.4); }
        }
        @keyframes flash-failed {
          0% { box-shadow: 0 0 50px rgba(239,68,68,1); }
          100% { box-shadow: 0 0 15px rgba(239,68,68,0.4); }
        }
        ```
    3.  In `getStatusStyles`, apply these animations:
        *   `running`: `animate-[pulse-running_1.5s_ease-in-out_infinite]`
        *   `completed`: `animate-[flash-completed_1s_ease-out_forwards]`
        *   `failed`: `animate-[flash-failed_1s_ease-out_forwards]`
*   **Visible Result:** Nodes now "breathe" with glowing animations based on their status.

---

### Direction 3: Interactive Control Center (Node Config UI)

> **User Visible Result:** Clicking on a node opens a right-side panel showing its configuration. Users can edit worker type, input mappings, and save changes.

#### Task 3.1: Create `NodeConfigPanel` component
*   **File:** Create `src/components/panels/NodeConfigPanel.tsx`
*   **Instructions:**
    1.  Copy the structure from `EntityDetailPanel.tsx` (fixed right panel, header, close button).
    2.  Props: `{ nodeId: string | null; canvasId: string; onClose: () => void; onSave: (nodeId: string, config: NodeConfig) => Promise<void>; }`
    3.  Fetch node data from the canvas graph using `canvasId` and `nodeId`.
    4.  Import `WORKER_DEFINITIONS` from `src/lib/workers/registry.ts`.
    5.  Render a form:
        *   Dropdown for `workerType` (options from `Object.keys(WORKER_DEFINITIONS)`).
        *   For each input field in `WORKER_DEFINITIONS[workerType].input`, render a text input.
    6.  On submit, call `onSave(nodeId, updatedConfig)`.
*   **Visible Result:** A configuration panel appears for the selected node.

#### Task 3.2: Wire `NodeConfigPanel` into `WorkflowCanvas`
*   **File:** `src/components/canvas/WorkflowCanvas.tsx`
*   **Instructions:**
    1.  Add state: `const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);`
    2.  Add `onNodeClick` handler to `<ReactFlow>` that sets `setSelectedNodeId(node.id)`.
    3.  Render `<NodeConfigPanel nodeId={selectedNodeId} canvasId={flow.id} onClose={() => setSelectedNodeId(null)} onSave={handleSaveNodeConfig} />`.
    4.  Implement `handleSaveNodeConfig` to update the node in the database (call a new API endpoint or update via Supabase client).
*   **Visible Result:** Clicking a node in a workflow opens the config panel.

---

### Direction 4: "God Mode" Entity Tracking

> **User Visible Result:** If 50 entities are at the same node, you see a single "50" badge instead of 50 overlapping dots. Clicking it expands to a list.

#### Task 4.1: Add clustering logic to `EntityOverlay`
*   **File:** `src/components/canvas/entities/EntityOverlay.tsx`
*   **Instructions:**
    1.  After computing `entitiesWithPositions`, group entities by `current_node_id`.
    2.  For each group with `count > 5`, render a single "cluster" component instead of individual `EntityDot` components.
    3.  Create a new `EntityCluster.tsx` component:
        *   Props: `{ count: number; position: {x, y}; nodeId: string; onClick: () => void }`
        *   Renders a circle with the count number inside.
    4.  When `EntityCluster` is clicked, show a popover list of entities (use `Popover` from shadcn/ui).
*   **Visible Result:** Large groups of entities are shown as a single badge with a count.

#### Task 4.2: Implement `handleMoveEntity` backend call
*   **File:** `src/components/canvas/entities/EntityOverlay.tsx` and create `src/app/api/entities/[entityId]/move/route.ts`
*   **Instructions:**
    1.  **API Route:** Create a `POST` endpoint that accepts `{ targetNodeId: string }`.
        *   Update `stitch_entities` table: `current_node_id = targetNodeId`, `current_edge_id = null`.
        *   Insert a `stitch_journey_events` record with `event_type = 'manual_move'`.
    2.  **Frontend:** In `handleMoveEntity` (line 48), replace `console.log` with a `fetch` call to the new API.
*   **Visible Result:** Entities can be manually moved via drag-and-drop or a "Move to..." button in `EntityDetailPanel`.

---

### Direction 5: The "Time Travel" Debugger

> **User Visible Result:** A slider at the bottom of the canvas lets the user scrub through the execution history. As they move the slider, node statuses change to reflect the state at that point in time.

#### Task 5.1: Create `TimelineScrubber` component
*   **File:** Create `src/components/canvas/TimelineScrubber.tsx`
*   **Instructions:**
    1.  Props: `{ runId: string; onTimestampChange: (timestamp: string) => void }`
    2.  Fetch all `stitch_journey_events` for the `runId`, ordered by `timestamp`.
    3.  Render a horizontal slider (`<input type="range">` or a shadcn Slider).
    4.  Min value = first event timestamp, max value = last event timestamp.
    5.  On change, call `onTimestampChange` with the selected timestamp.
*   **Visible Result:** A slider appears at the bottom of the workflow view.

#### Task 5.2: Create `useTimelineNodeStates` hook
*   **File:** Create `src/hooks/useTimelineNodeStates.ts`
*   **Instructions:**
    1.  Accept `runId` and `timestamp`.
    2.  Fetch `stitch_journey_events` where `timestamp <= selectedTimestamp`.
    3.  Reconstruct `node_states` by iterating through events:
        *   `node_arrival` -> `status = 'running'`
        *   `node_complete` -> `status = 'completed'`
    4.  Return the reconstructed `node_states` object.
*   **Visible Result:** None directly. This hook provides data.

#### Task 5.3: Wire `TimelineScrubber` into `WorkflowCanvas`
*   **File:** `src/components/canvas/WorkflowCanvas.tsx`
*   **Instructions:**
    1.  Add state: `const [scrubTimestamp, setScrubTimestamp] = useState<string | null>(null);`
    2.  Use `useTimelineNodeStates(runId, scrubTimestamp)` to get historical node states.
    3.  If `scrubTimestamp` is set, use the historical states instead of `run.node_states`.
    4.  Render `<TimelineScrubber runId={runId} onTimestampChange={setScrubTimestamp} />` at the bottom.
*   **Visible Result:** Moving the slider changes the visual state of all nodes to reflect the past.

---

### Direction 6: The AI Assistant UI

> **User Visible Result:** A chat icon in the bottom-right corner opens a chat panel. Users type "Create a video generation workflow", and the AI creates the nodes and edges on the canvas.

#### Task 6.1: Create `AIAssistantPanel` component
*   **File:** Create `src/components/panels/AIAssistantPanel.tsx`
*   **Instructions:**
    1.  Structure: Fixed bottom-right panel (similar to a chat widget). Toggle button (icon: `MessageSquare` from lucide).
    2.  State: `messages: { role: 'user' | 'assistant'; content: string }[]`, `isLoading: boolean`.
    3.  On submit:
        ```typescript
        const response = await fetch('/api/ai-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request: userInput, canvasId }),
        });
        const data = await response.json();
        // Handle data.action and data.result
        ```
    4.  If `data.action === 'createWorkflow'` or `data.action === 'modifyWorkflow'`, call a callback prop `onGraphUpdate(data.result.graph)` to update the React Flow instance.
*   **Visible Result:** A chat panel where users can talk to the AI.

#### Task 6.2: Wire `AIAssistantPanel` into `BMCCanvas` and `WorkflowCanvas`
*   **Files:** `src/components/canvas/BMCCanvas.tsx`, `src/components/canvas/WorkflowCanvas.tsx`
*   **Instructions:**
    1.  Add state to hold the current graph: `const [nodes, setNodes] = useState(...)`.
    2.  Pass `onGraphUpdate` prop to `AIAssistantPanel` that updates the `nodes` and `edges` state.
    3.  Use `setNodes` and `setEdges` from `useNodesState` / `useEdgesState` hooks from React Flow.
*   **Visible Result:** The AI's changes appear on the canvas immediately.

---

### Direction 7: Visualizing the M-Shape (Drill-Down)

> **User Visible Result:** Double-clicking a section node on the BMC "zooms in" to reveal the workflow inside it, with a smooth animation. A "Back to Surface" button zooms back out.

#### Task 7.1: Implement `DetailCanvas` component
*   **File:** `src/components/canvas/CanvasRouter.tsx` (replace the placeholder at line 85-96)
*   **Instructions:**
    1.  `DetailCanvas` should render `<WorkflowCanvas>` with the child flow.
    2.  Fetch the child flow using `parent_id` from the current canvas.
    3.  Add a "Back to Surface" button (use `goBack()` from `useCanvasNavigation`).
*   **Visible Result:** Drilling down from a BMC section shows its child workflow.

#### Task 7.2: Add "Drill Down" visual cue to Section nodes
*   **File:** `src/components/canvas/nodes/SectionNode.tsx`
*   **Instructions:**
    1.  If `data.child_canvas_id` exists, render a small icon (e.g., `Layers` from lucide) in the corner of the section.
    2.  Add a tooltip: "Double-click to drill down".
*   **Visible Result:** Users can see which sections have workflows "underneath" them.

#### Task 7.3: Enhance the drill-down animation
*   **File:** `src/components/canvas/CanvasRouter.tsx`
*   **Instructions:**
    1.  The `framer-motion` animation (line 154-166) currently uses `scale: 0.98` which is subtle.
    2.  Change to a more dramatic "zoom-in" effect:
        *   When drilling *into* a node: `initial={{ scale: 2, opacity: 0 }}`, `animate={{ scale: 1, opacity: 1 }}`.
        *   When going *back*: `initial={{ scale: 0.5, opacity: 0 }}`, `animate={{ scale: 1, opacity: 1 }}`.
    3.  Store `direction: 'in' | 'out'` in navigation context to determine which animation to use.
*   **Visible Result:** Drilling down feels like "diving into" the node; going back feels like "surfacing".

---

## 4. Priority Order

| Priority | Direction | Impact | Effort |
|----------|-----------|--------|--------|
| 1 | **Direction 2: The Pulse** | High (immediate visual wow) | Low (CSS only) |
| 2 | **Direction 7: M-Shape Drill-Down** | High (core architecture visibility) | Medium |
| 3 | **Direction 6: AI Assistant** | Very High (unlocks hands-free workflow creation) | Medium |
| 4 | **Direction 1: Edge Animation** | Medium (enhances "alive" feel) | Medium |
| 5 | **Direction 3: Node Config** | High (usability essential) | Medium |
| 6 | **Direction 4: Entity Clustering** | Medium (scalability) | Medium |
| 7 | **Direction 5: Time Travel** | Low (debugging, not core) | High |

