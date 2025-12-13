# Stitch Platform — Implementation Gaps (Gemini 3 Review)

**Review Date:** December 12, 2025
**Reviewer:** Gemini (Agentic AI)
**Baseline:** `reviews/gaps-gpt-5-2.md`
**Focus:** Architectural Integrity, Function Duplication, Foundation Landing

---

## Executive Summary

The system foundation (Execution Graph, Edge Walking, Atomic Updates) is solid. Previous concerns regarding **architectural drift** and **function duplication** have been addressed. The core engine integrity has been restored by integrating System Edges into the versioned Execution Graph.

**Key Findings:**
1.  **Architecture Drift Fixed**: The BMC "System Edges" implementation (`walkParallelEdges`) now correctly uses the optimized, versioned `ExecutionGraph` engine. It no longer queries the database directly, restoring the "Versioned Execution" guarantee.
2.  **Legacy Canvas Removed**: The legacy `StitchCanvas` component (which duplicated logic from `BMCCanvas`) has been **refactored out** and replaced by `WorkflowCanvas`. This significantly reduces technical debt and unifies the visualization logic.
3.  **Foundation Integrity**: Atomic updates are verified safe. The `update_node_states` (bulk) RPC is implemented and in use.

---

## 1. Architecture Drift: New Code vs. Old Foundation

### ✅ Fixed: `walkParallelEdges` Bypasses Engine Core
**Location:** `src/lib/engine/edge-walker.ts`

**Status**: **RESOLVED**
*   **Fix Implemented**: The `ExecutionGraph` schema was updated to include `outboundEdges` (containing both journey and system edges).
*   **Compiler Updated**: `compileToOEG` now populates `outboundEdges` while keeping `system` edges out of the logical `adjacency` map.
*   **Engine Updated**: `walkParallelEdges` now accepts the `StitchRun` object and uses the versioned `ExecutionGraph` snapshot from memory/cache, ensuring total consistency with the running version.

---

## 2. Function Duplication

### ✅ Fixed: Canvas Component Forking
**Location:** `src/components/canvas/BMCCanvas.tsx` vs `src/legacy/StitchCanvas.tsx`

**Status**: **RESOLVED**
*   **Refactor**: The legacy `StitchCanvas` component was identified as redundant and outdated compared to `WorkflowCanvas`.
*   **Replacement**: All usages of `StitchCanvas` (in `RunViewer` and `CanvasPage`) were replaced with `WorkflowCanvas`.
*   **Cleanup**: The `StitchCanvas` file was moved to `/legacy` and subsequently deleted.

---

## 3. Code Integrity & Missed Errors

### 🟢 Low Risk: Rate Limiting & RPCs
**Location:** `src/app/api/webhooks/node/[nodeId]/route.ts` & `src/lib/db/runs.ts`

-   **Rate Limiting**: Implemented (in-memory `RateLimiters.webhook`).
-   **RPC Migration**: **Verified**. The `update_node_states` (plural) function exists in `supabase/migrations/20251212165556_atomic_bulk_update.sql`. The logic in `runs.ts` correctly calls this RPC for atomic bulk updates.

### 🟢 Low Risk: Type Safety in Canvas
Legacy `StitchCanvas` issues are moot as the component has been deleted. `WorkflowCanvas` adoption brings better type safety patterns.

---

## 4. Strategy Moving Forward

To ensure the system remains accurate and scalable:

1.  **Maintain "System Edge" Separation**: Ensure future "sidecar" features continue to use the `outboundEdges` pattern rather than polluting the logical `adjacency` map.
2.  **Strict RPC Verification**: Continue to ensure all RPC calls in client code have corresponding committed migrations.

## Summary Checklist for Next Steps

- [x] **Fixed**: Refactor `walkParallelEdges` to use `ExecutionGraph` (Versioned).
- [x] **Verified**: `update_node_states` (plural) RPC exists (`20251212165556_atomic_bulk_update.sql`).
- [x] **Fixed**: Refactor Legacy Canvas (Replaced `StitchCanvas` with `WorkflowCanvas` and deleted legacy).
- [ ] **Cleanup**: Remove deprecated `fireNode` (legacy) to prevent accidental usage.
