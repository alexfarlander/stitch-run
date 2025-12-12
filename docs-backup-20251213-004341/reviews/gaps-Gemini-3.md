# Stitch Platform — Implementation Gaps (Gemini 3 Review)

**Review Date:** December 12, 2025
**Reviewer:** Gemini (Agentic AI)
**Baseline:** `reviews/gaps-gpt-5-2.md`
**Focus:** Architectural Integrity, Function Duplication, Foundation Landing

---

## Executive Summary

The system foundation (Execution Graph, Edge Walking, Atomic Updates) is solid, but **recent feature implementations (specifically Business Model Canvas - BMC)** have introduced significant architectural drift. New features are "side-stepping" the core engine rather than extending it, leading to logic duplication and potential consistency issues.

**Key Findings:**
1.  **Critical Architecture Drift**: The BMC "System Edges" implementation (`walkParallelEdges`) largely bypasses the optimized `ExecutionGraph` engine, querying the database directly and handling execution with custom logic. This breaks the "Versioned Execution" guarantee.
2.  **Function Duplication**: `BMCCanvas.tsx` duplicates approximately 70% of the visualization and interaction logic from `StitchCanvas.tsx` instead of reusing a shared core.
3.  **Foundation Integrity**: Atomic updates are implemented via RPCs (good), but the "bulk update" RPC migration file was not immediately visible, warranting verification. Legacy code (`fireNode`) remains instated, albeit deprecated.

---

## 1. Architecture Drift: New Code vs. Old Foundation

The primary concern is how `BMC` (Business Model Canvas) features land on the existing foundation.

### 🔴 High Risk: `walkParallelEdges` Bypasses Engine Core
**Location:** `src/lib/engine/edge-walker.ts`

The core Stitch engine relies on `ExecutionGraph`—a pre-computed, versioned, adjacency-list representation of the flow. This ensures O(1) traversal and execution consistency (you run exactly what you saved).

However, the new `walkParallelEdges` function (used for BMC System Edges) **bypasses this entirely**:
*   **Direct DB Query**: It fetches the raw `stitch_flows` row (`await supabase.from('stitch_flows')...`).
*   **No Versioning**: It does not check `flow_version_id` or load a verified snapshot. It runs against the *current* DB state of the canvas, which might differ from the running version.
*   **Custom Traversal**: It manually filters `edge.type === 'system'` from the raw JSON, ignoring the efficient adjacency maps in `ExecutionGraph`.

**Impact**:
*   **Concurrency bugs**: Modifications to the canvas while a run is active will immediately affect the run (violating isolation).
*   **Performance**: Adds unnecessary DB round-trips instead of using the pre-loaded execution graph.
*   **Maintenance**: We now have *two* traversal engines to maintain: `walkEdges` (Core) and `walkParallelEdges` (BMC Sidecar).

**Recommendation**:
*   Integrate "System Edges" into the `ExecutionGraph` schema.
*   Update `compile-oeg.ts` to include system edges in the adjacency map (or a separate `systemAdjacency` map).
*   Refactor `walkParallelEdges` to use the versioned `ExecutionGraph` passed from `startRun`.

---

## 2. Function Duplication

### 🟠 Medium Risk: Canvas Component Forking
**Location:** `src/components/canvas/BMCCanvas.tsx` vs `src/components/canvas/StitchCanvas.tsx`

`BMCCanvas` was created as a copy-paste-modify of `StitchCanvas`. While they serve different "views" (Workflow vs BMC), they share massive amounts of logic:
*   **Graph State**: Both use `useNodesState`, `useEdgesState`.
*   **Rendering**: Both map internal nodes to ReactFlow nodes with similar transforms.
*   **Interaction**: Both handle selection, clearing, and generic node actions similarly.
*   **Styling**: Both define similar background and control implementations.

**Impact**:
*   **Bug Divergence**: Fixes applied to `StitchCanvas` (e.g., the "any" type fixes suggested in previous reviews) are not automatically applied to `BMCCanvas`.
*   **Tech Debt**: Double the surface area for ReactFlow upgrades or API changes.

**Recommendation**:
*   Extract a `BaseCanvas` or `StitchCanvasCore` component that handles the ReactFlow boilerplate, state management, and common node registration.
*   `StitchCanvas` and `BMCCanvas` should only contain their specific logic (e.g., BMC's specific "overlay" vs Stitch's "run controls").

---

## 3. Code Integrity & Missed Errors

### 🟢 Low Risk: Rate Limiting & RPCs
**Location:** `src/app/api/webhooks/node/[nodeId]/route.ts` & `src/lib/db/runs.ts`

-   **Rate Limiting**: Implemented (in-memory `RateLimiters.webhook`).
-   **RPC Migration**: **Verified**. The `update_node_states` (plural) function exists in `supabase/migrations/20251212165556_atomic_bulk_update.sql`. This code path is safe.

### 🟢 Low Risk: Type Safety in Canvas
`StitchCanvas.tsx` still relies on implicit `any` casting via `node.data as unknown as ...` patterns. This matches the previous GPT-5.2 report.

---

## 4. Strategy Moving Forward

To ensure the system remains accurate and scalable:

1.  **Stop "Sidecar" Implementations**: New features (like BMC) must extend the core `ExecutionGraph` and `EdgeWalker`. Do not write parallel execution logic that queries the DB directly for graph structure.
2.  **Unify Canvas**: Refactor `BMCCanvas` and `StitchCanvas` to share a common core.
3.  **Strict RPC Verification**: Ensure all RPC calls in client code have corresponding committed migrations.

## Summary Checklist for Next Steps

- [ ] **Critical**: Refactor `walkParallelEdges` to use `ExecutionGraph` (Versioned).
- [x] **Verified**: `update_node_states` (plural) RPC exists (`20251212165556_atomic_bulk_update.sql`).
- [ ] **Maintenance**: Extract shared logic between `StitchCanvas` and `BMCCanvas`.
- [ ] **Cleanup**: Remove deprecated `fireNode` (legacy) to prevent accidental usage.
