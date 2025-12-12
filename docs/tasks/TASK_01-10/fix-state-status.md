# Fix: Node status transition mismatches (state machine vs call sites)

**Date:** 2025-12-12  
**Scope:** Resolve the P0 correctness blocker where real call sites (retry + UX complete) performed transitions not permitted by `src/lib/engine/status-transitions.ts`.

---

## Problem summary

The state machine in `src/lib/engine/status-transitions.ts` did not permit transitions that are required by current API behavior:

- **Retry endpoint** (`src/app/api/stitch/retry/[runId]/[nodeId]/route.ts`) resets a node from `failed → pending`
- **UX complete endpoint** (`src/app/api/stitch/complete/[runId]/[nodeId]/route.ts`) completes a UX gate from `waiting_for_user → completed`

Additionally, the engine writes “progress” updates that keep a node in the same status (notably Collector updates while still `pending`). A strict “no self-transition” rule makes those updates fail transition validation.

Because `updateNodeState()` and `updateNodeStates()` validate transitions (via `validateTransition()`), these mismatches can throw and break execution.

---

## What was changed

### 1) Updated the transition table to match real semantics

File: `src/lib/engine/status-transitions.ts`

- **Retry reset supported:**
  - `failed: ['running', 'pending']`
- **UX completion supported:**
  - `waiting_for_user: ['running', 'completed']`

### 2) Made transition validation idempotent (`from === to` allowed)

File: `src/lib/engine/status-transitions.ts`

- `validateTransition(from, to)` now **returns early** when `from === to`
- `isValidTransition(from, to)` now **returns true** when `from === to`

This supports safe “progress writes” where a node remains in the same status but its metadata changes (e.g., Collector tracking fields).

### 3) Added tests to lock behavior

File: `src/lib/engine/__tests__/status-transitions.test.ts`

Covers:
- idempotent transitions are allowed
- `waiting_for_user → completed` allowed
- `failed → pending` allowed
- still rejects invalid transitions (e.g. `pending → completed`)

---

## Verification performed

- Ran: `npx --yes vitest --run src/lib/engine/__tests__/status-transitions.test.ts`
  - Result: **pass**

---

## Recommendations (future hardening)

### A) Decide on a single “retry semantics” and encode it end-to-end

Right now both are allowed:
- `failed → pending` (reset + re-evaluate deps)
- `failed → running` (immediate retry)

Pick one as the primary model and make the API + engine consistent:
- If you want **immediate retry**, update `/retry` to transition `failed → running` and then always re-fire the node.
- If you want **reset + scheduler semantics**, keep `failed → pending` but ensure a deterministic path that will re-fire it (either direct fire if deps satisfied, or via upstream completion triggers).

### B) Make UX completion more explicit in the data model

Current UX completion marks the UX node as `completed` and stores user input in `output`.

If you want a stricter audit trail:
- Introduce a dedicated `ux_input` field (or a structured `{ input, output }`) so “stored input” is not conflated with “node output”.

### C) Tighten transition validation boundaries

Today validation happens in DB helpers (`updateNodeState(s)`), which is good. To reduce fragility:
- Allow idempotent transitions (already done)
- Consider a “no-op update” short-circuit: if status unchanged and output/error unchanged, skip DB write.

### D) Add API-level tests for transitions (recommended)

Add small tests that exercise:
- `/api/stitch/complete/:runId/:nodeId` from `waiting_for_user` to `completed`
- `/api/stitch/retry/:runId/:nodeId` from `failed` to expected next state

This catches drift between endpoints and the state machine early.

---

## Files changed

- `src/lib/engine/status-transitions.ts`
- `src/lib/engine/__tests__/status-transitions.test.ts`




