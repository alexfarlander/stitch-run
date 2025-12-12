# Stitch Platform — Implementation Gaps (GPT‑5.2 Delta Review)

**Review date:** 2025-12-12  
**Baseline:** `docs/code-review.md` (Claude, 2025-12-05)  
**Review mode:** Delta/validation of baseline against current workspace  
**Priority axes:** Correctness/Data Integrity + Maintainability

---

## Executive summary

The codebase contains strong architectural intent (ExecutionGraph + edge-walking + atomic node-state update RPC), but the current workspace shows **systemic implementation drift** that likely prevents reliable builds/runs:

- **P0 correctness blocker (FIXED):** Widespread “underscore rename” mismatches (e.g., `const _supabase = …` then using `supabase`, `catch (_error)` then using `error`). These have been removed repo-wide.
- **P0 correctness blocker (FIXED):** **Node status transition state machine vs call sites mismatch** (retry uses `failed -> pending`, UX completion uses `waiting_for_user -> completed`). `src/lib/engine/status-transitions.ts` now matches actual call-site semantics and supports idempotent updates.
- **P0 architecture drift (FIXED for webhooks):** Webhook-triggered execution no longer starts via deprecated legacy graph path (`fireNode(flow, run)`); it uses **versioned** `FlowVersion.execution_graph` via `run.flow_version_id`.

Before addressing “nice-to-haves”, the most leverage is to **stabilize compilation/runtime invariants**, then tighten concurrency/graph semantics.

---

## Fixed since this report

- **Underscore-prefix fallout removed**: underscore-prefixed locals/catch params were eliminated to prevent name mismatches (`_supabase` vs `supabase`, `_error` vs `error`) and associated runtime/TS failures.
- **Status transition mismatch resolved**: transition table updated and validator made idempotent (`from === to` allowed), plus tests added.
- **Webhook execution made versioned**: webhooks start from `run.flow_version_id` graphs (never `flow.graph`), and webhook processor tests were updated and now pass.
- **Production typecheck is now scoped (tests/dev tooling excluded)**:
  - Added/updated `tsconfig.typecheck.json` to exclude `**/__tests__/**`, `*.test.*`, `*.spec.*`, and dev-only code (`src/lib/seeds/**`, `src/lib/verification/**`, `src/app/api/seed/**`).
  - `npm run typecheck` now reflects “real app code” instead of failing on Vitest globals or seed scripts.
- **Callback route payload typing + safe output merge**:
  - `src/app/api/stitch/callback/[runId]/[nodeId]/route.ts` now validates payload as a record and only merges outputs when both sides are plain objects; otherwise it stores structured `{ input, output }`.
- **AI manager API route typing hardened**:
  - `src/app/api/ai-manager/route.ts` now passes correctly typed handlers to `executeAction()` (no `as unknown`) and maps action-executor errors to valid `ErrorCode`s.
- **Canvas API “unknown” fixes**:
  - Narrowed `flow.current_version.visual_graph` accesses and cleaned up JSON/unknown usage in multiple canvas API routes under `src/app/api/canvas/**`.
- **Journey event model aligned with UI/tests**:
  - Added `node_failure` to journey event unions and narrowed metadata error fields where required.
- **Production typecheck is now green** (`npm run typecheck` passes):
  - **OEG compiler** (`src/lib/canvas/compile-oeg.ts`): Fixed `edgeData` typing to `Record<string, EdgeMapping>`.
  - **Graph validation** (`src/lib/canvas/validate-graph.ts`): Replaced `includes(... as unknown)` with proper type guards for `completeAs`/`setEntityType` validation.
  - **Engine edge-walker** (`src/lib/engine/edge-walker.ts`, `src/lib/engine/index.ts`): Fixed `unknown` object indexing in merge logic; merged inputs now typed as `Record<string, unknown>`.
  - **Engine handlers** (`src/lib/engine/handlers/splitter.ts`, `src/lib/engine/handlers/worker.ts`): Added type guards before indexing into `unknown` config/input objects.
  - **Webhook adapters** (`src/lib/webhooks/adapters/*.ts`): Fixed direct `unknown` payload indexing in `calendly`, `n8n`, `stripe`, `generic`, `typeform` adapters.
  - **Webhook json-path** (`src/lib/webhooks/json-path.ts`): Added type narrowing before property access in path resolution.
  - **Media service** (`src/lib/media/media-service.ts`): Fixed Blob-like `size`/`type` property access with proper type guards.
  - **Worker boundary typing** (`src/lib/workers/*.ts`): Loosened `NodeConfig` index signature to `any` and worker `input` parameter to `any` at interface boundaries (reflects real JSON blobs); internal logic remains guarded.
  - **AI module** (`src/lib/ai/*.ts`): Fixed `isolatedModules` compliance (`export type` for type-only re-exports) and added type guards in validators.
  - **Core utilities** (`src/lib/canvas/version-manager.ts`, `src/types/journey-event.ts`, `src/lib/api/error-handler.ts`): Added type guards for safe object indexing in `deepEqual`, `normalizeJourneyEvent`, and MermaidParseError handling.

## New gaps found from Opus comparison (not previously called out here)

### A) Webhook signature verification inconsistent / not timing-safe in some adapters ✅

**Evidence pointers**
- Typeform adapter uses direct string equality for computed signature:
  - `src/lib/webhooks/adapters/typeform.ts` (`expected === computed`)
- Calendly adapter uses direct string equality:
  - `src/lib/webhooks/adapters/calendly.ts` (`computed === parts.v1`)
- n8n adapter uses direct string equality for token auth:
  - `src/lib/webhooks/adapters/n8n.ts` (`incomingSecret === secret`)

**Impact**
- Inconsistent security posture across sources; avoidable exposure to timing attacks (especially for HMAC-based sources).

**Recommended fix**
- Standardize comparisons to `crypto.timingSafeEqual` (with length checks to avoid throwing), ideally via a shared helper used by all adapters.

---

### B) Replay protection missing (timestamp tolerance) ✅

**Evidence pointers**
- Stripe signature format includes `t=...` but adapter does not enforce a freshness window:
  - `src/lib/webhooks/adapters/stripe.ts`
- Calendly signature format includes `t=...` but adapter does not enforce a freshness window:
  - `src/lib/webhooks/adapters/calendly.ts`

**Impact**
- Signed payloads can be replayed indefinitely if captured; signature will still validate.

**Recommended fix**
- Enforce a timestamp tolerance window (e.g., 5 minutes) and reject stale timestamps.
- Optional hardening: store processed webhook event IDs / hashes to prevent replays per source.

---

### C) Rate limiting gaps on unauthenticated webhook-like routes ✅

**Evidence pointers**
- Main webhook endpoint is rate-limited:
  - `src/app/api/webhooks/[endpoint_slug]/route.ts`
- Other unauthenticated webhook-like routes are not rate-limited:
  - `src/app/api/webhooks/node/[nodeId]/route.ts`
  - `src/app/api/webhooks/clockwork/[source]/route.ts`

**Impact**
- Easy DoS surface + DB write amplification on endpoints that accept arbitrary payloads.

**Recommended fix**
- Apply the same `RateLimiters.*` + `applyRateLimitHeaders(...)` pattern to `/webhooks/node/*` and `/webhooks/clockwork/*`.

---

### D) Type definition duplication (drives `unknown` propagation and drift)

**Evidence pointers**
- Multiple overlapping types exist across `src/types/*` (e.g., `JourneyEvent`, `NodeConfig`, `StitchEntity` variants).

**Impact**
- Increases accidental incompatibilities and pushes runtime boundaries toward `any`/`unknown`, making correctness regressions easier.

**Recommended fix**
- Consolidate to single sources of truth per type (re-export where needed), then tighten API route inputs/outputs to eliminate `unknown` in hot paths.

## Delta table vs `docs/code-review.md`

Status legend: **Fixed / Partially fixed / Open / Regressed / Unknown**

| Baseline finding | Status | Evidence in current workspace | Notes |
|---|---:|---|---|
| Webhook endpoints lack rate limiting | **Partially fixed** | `src/app/api/webhooks/[endpoint_slug]/route.ts` uses `RateLimiters.webhook` | Current rate limiter is **in-memory** (`src/lib/api/rate-limiter.ts`), not suitable for multi-instance/serverless (no shared state). |
| Webhook signature validation not enforced by default | **Fixed** | `src/lib/webhooks/processor.ts` enforces `require_signature` and production+secret; adapters verify signatures | Still impacted by general correctness issues in processor (see below). |
| Service role key exposure risk | **Fixed** | `src/lib/supabase/client.ts` blocks client-side usage and fails fast in prod | Good hardening present. |
| Potential race conditions in parallel node execution | **Partially fixed** | `supabase/migrations/20241202000002_atomic_node_state_update.sql` + `src/lib/db/runs.ts:updateNodeState()` RPC | Many codepaths still do **read-modify-write** JSON updates (see `updateNodeStates`). Collector logic likely still races in real concurrency. |
| Inefficient graph traversal in legacy paths | **Open** | `src/lib/engine/edge-walker.ts:getUpstreamNodeIds()` scans adjacency entries; `src/components/canvas/StitchCanvas.tsx` uses `JSON.stringify` diff | Runtime and UI both have avoidable \(O(E)\)/serialization hot paths. |
| Legacy execution path still present (`fireNode()`) | **Partially fixed** | `src/lib/engine/edge-walker.ts` still exports deprecated `fireNode()`; **webhooks no longer use it** | Remaining: quarantine/forbid imports of `fireNode()` to prevent reintroduction. |
| Circular dependency risk (entity movement vs edge-walker) | **Fixed** | `src/lib/engine/edge-walker.ts` uses dynamic import for entity-movement | Entity movement does not import edge-walker in current workspace; coupling is still high but cycle risk is mitigated. |
| Webhook processing flow complexity | **Open** | `src/lib/webhooks/processor.ts` remains monolithic; now also contains multiple correctness bugs | Refactor into composable steps still recommended. |
| Type assertions / `any` in canvas conversions | **Open** | `src/components/canvas/StitchCanvas.tsx` uses `(node: any): any` and `currentGraph: any` | Impacts safety and makes regressions easy. |
| Console.log in production code | **Open** | `src/lib/engine/edge-walker.ts` has multiple `console.log` sites | Should route through structured logger and respect log levels. |

---

## Highest-risk correctness gaps (ranked)

### 1) P0: Systemic “underscore rename” mismatches (likely breaks build/runtime)

This pattern appears extensively across the repo:

- **DB modules**: `src/lib/db/runs.ts`, `src/lib/db/flows.ts`, `src/lib/db/webhook-configs.ts` (and many more) frequently declare `const _supabase = …` but then call `supabase.…`.
- **Engine**: `src/lib/engine/handlers/worker.ts` declares `const _config = getConfig()` but uses `config.baseUrl`.
- **API routes**: `src/app/api/stitch/callback/[runId]/[nodeId]/route.ts` declares `const _flow = …` but checks `if (flow)`.
- **Canvas run route**: `src/app/api/canvas/[id]/run/route.ts` uses `_flow`, `_versionId`, etc but references `flow`/`versionId`.
- **Error handling**: multiple files use `catch (_error)` then reference `error` (e.g., `src/lib/config.ts`, `src/lib/navigation/canvas-navigation.ts`, etc.).

**Impact**
- TypeScript compilation errors (`cannot find name 'supabase'`, `cannot find name 'flow'`, etc.)
- Runtime ReferenceErrors if any of these paths execute.
- Makes it impossible to validate other correctness fixes reliably (race-condition work, graph semantics, etc.).

**Status:** **Fixed** (repo-wide underscore-prefix removals + mismatch cleanup).

**Follow-up recommendation**
- Add a guardrail so this does not regress (CI + lint policy): avoid underscore renames; prefer meaningful names or `catch {}` when unused.

**Suggested test hook**
- CI job: `pnpm typecheck` or `npm run typecheck` (whatever convention you use) that runs `tsc --noEmit`.

---

### 2) P0: Node status transition state machine conflicts with API behavior

**State machine**: `src/lib/engine/status-transitions.ts`

- `waiting_for_user` can only transition to `running`, but UX completion endpoint writes `completed` directly:
  - `src/app/api/stitch/complete/[runId]/[nodeId]/route.ts` sets `waiting_for_user -> completed`
- `failed` can only transition to `running`, but retry endpoint resets to `pending`:
  - `src/app/api/stitch/retry/[runId]/[nodeId]/route.ts` sets `failed -> pending`
- `updateNodeState()` validates transitions by reading current run state:
  - `src/lib/db/runs.ts:updateNodeState()`

**Impact**
- Retry/UX completion are likely to throw `StatusTransitionError` at runtime (or silently fail if errors are swallowed elsewhere).
- “Retry” semantics are ambiguous: should retry be `failed -> running` (and re-fire) or `failed -> pending` (and wait for upstream triggers)?

**Status:** **Fixed**
- `src/lib/engine/status-transitions.ts` now allows:
  - `waiting_for_user → completed`
  - `failed → pending`
  - idempotent updates (`from === to`)
- Added tests: `src/lib/engine/__tests__/status-transitions.test.ts`

---

### 3) P0: Webhook-triggered execution uses deprecated legacy engine path (`fireNode`)

Webhook ingestion:

- Route: `src/app/api/webhooks/[endpoint_slug]/route.ts` (rate limiting + calls `processWebhook`)
- Processor: `src/lib/webhooks/processor.ts`
  - Creates run via `createRunAdmin()` (which initializes node states from ExecutionGraph)
  - Then loads flow and starts execution via legacy `fireNode(entryEdge.target, flow, workflowRun)`

**Impact**
- Bypasses ExecutionGraph invariants (edge mappings, entry/terminal precomputation).
- Integrity risk if `flow.graph` is stale or diverges from `flow.current_version_id` / `run.flow_version_id`.
- Makes webhook execution semantics inconsistent with `/api/flows/[id]/run` and `/api/canvas/[id]/run` which intend to use `startRun()` + ExecutionGraph.

**Status:** **Fixed (webhooks)**
- Webhook processor starts execution using `run.flow_version_id` graphs (ExecutionGraph + versioned VisualGraph edge lookup), not `flow.graph`.
- See doc note: `docs/webhook-execution-versioned.md`

**Remaining recommendation**
- Quarantine/forbid imports of legacy `fireNode()` to prevent other entrypoints from drifting back.

---

### 4) P1: Collector + bulk node-state updates are still non-atomic (race risk remains)

Good:
- `updateNodeState()` uses the `update_node_state` RPC (atomic per-node JSONB update).

Risk:
- `updateNodeStates()` in `src/lib/db/runs.ts` is still **read-modify-write**:
  - Reads run, merges JSON, writes entire `node_states`.
  - This is exactly the “lost update” race the repo documents in `src/lib/db/RACE_CONDITION_FIX.md`.
- `fireCollectorNode()` (`src/lib/engine/handlers/collector.ts`) uses `updateNodeStates()` repeatedly to persist progress fields and final output.

**Impact**
- Under true concurrency (multiple callbacks completing near-simultaneously), collector tracking fields or upstream outputs can be lost or overwritten.
- The included tests (`src/lib/engine/handlers/__tests__/collector-race-condition.test.ts`) do not appear to simulate real concurrent writes and also contain the `_supabase`/`supabase` mismatch pattern.

**Recommendation**
- Introduce DB-side atomic helpers for:
  - “update many JSONB keys” (batch update) OR
  - “update collector state” (append/update a subdocument under collector node key), or
  - Replace collector state tracking fields with separate normalized table if needed.
- At minimum: ensure collector updates do not overwrite non-collector node updates.

---

### 5) P1: VisualGraph validation uses lowercased node types; engine uses capitalized `NodeType`

Type mismatch:
- `src/types/stitch.ts` defines `NodeType` like `'Worker' | 'UX' | 'Splitter' | ...`
- `src/types/canvas-schema.ts` uses `type: string` and documents lowercase (`worker`, `ux`, ...)
- `src/lib/canvas/validate-graph.ts` checks `node.type === 'worker'` (lowercase) for worker-type validation.
- `src/lib/engine/edge-walker.ts` switch cases are `'Worker' | 'UX' | 'Splitter' | 'Collector'`.

**Impact**
- Graph validation may silently skip worker validation if graphs use capitalized types.
- Engine execution may treat lowercase types as unknown and log “Unknown node type”, breaking runs.

**Recommendation**
- Choose one canonical representation and enforce it:
  - Option A: Normalize VisualGraph types to match `stitch.ts` NodeType (capitalized) at serialization boundaries.
  - Option B: Make engine accept lowercase equivalents via normalization map.
- Add property-based tests for “compile + execute” that include both casings (or forbid one casing).

---

### 6) P1: Callback output “pass-through merge” breaks for non-object storedInput

`src/app/api/stitch/callback/[runId]/[nodeId]/route.ts`:
- For completed callbacks, merges `storedInput` (from `run.node_states[nodeId].output`) with `callback.output` using object spread.

**Impact**
- Splitter seeds parallel worker node outputs with primitives (`'A'`, `'B'`, …) (`src/lib/engine/handlers/splitter.ts`), so `storedInput` may be a primitive. Spreading primitives into objects is legal but produces surprising results (indexed keys) and is likely not intended.

**Status:** **Fixed**
- The callback handler now merges only when both `storedInput` and `callback.output` are plain objects; otherwise it persists a structured `{ input: storedInput, output: callback.output }` payload to avoid nonsensical spreads.

---

## Maintainability debt (highest leverage)

### 1) Repo-wide stabilization: eliminate undefined identifiers and signature drift ✅

This is the single highest leverage maintainability fix because it blocks confidence in everything else.

**Deliverable**
- `npm run typecheck` passes (production code only; tests/dev tooling excluded) ✅
- Unit tests compile (even if integration tests are skipped)

---

### 2) Reduce “two engines” problem (legacy flow vs ExecutionGraph)

Current state:
- Both `fireNodeWithGraph()` and deprecated `fireNode()` coexist in `src/lib/engine/edge-walker.ts`.
- Webhook processor uses legacy; other run routes intend to use ExecutionGraph.

**Recommendation**
- Move legacy execution into `src/lib/engine/legacy/*` and forbid new imports.
- Add a codemod or enforced lint rule banning `import { fireNode }`.

---

### 3) Canvas editor type safety + dirty tracking

`src/components/canvas/StitchCanvas.tsx` still has:
- `convertToVisualNode = (node: any): any`
- `const currentGraph: any = …`
- `JSON.stringify` comparisons for “unsaved changes”

**Recommendation**
- Define explicit conversion types between `StitchNode/StitchEdge` and `VisualNode/VisualEdge`.
- Replace JSON stringify dirty-check with:
  - Explicit “dirty” flag on change events, or
  - Stable hashing (e.g., Murmur/xxhash on canonicalized graph) if you need structural compare.

---

### 4) Navigation stack: multiple sources of truth + likely wrong table name

`src/lib/navigation/canvas-navigation.ts`:
- Hydration queries `stitch_canvases` (but most of the app uses `stitch_flows` as canvases).
- Uses sessionStorage persistence; multiple components also manage navigation (e.g., `src/app/canvas/[id]/page.tsx` and `CanvasRouter`).

**Recommendation**
- Consolidate routing responsibilities into `CanvasRouter` + `CanvasNavigation` only.
- Align hydration data model to the canonical table (`stitch_flows` or introduce `stitch_canvases` consistently).

---

## Suggested task list (copy-pastable)

### P0 — Stabilize build/runtime
1. **Fix underscore rename drift repo-wide** ✅
   - **Acceptance**: `tsc --noEmit` passes; no `ReferenceError`-style undefined identifiers in core routes/modules.
2. **Align status transition rules with endpoints** ✅
   - **Acceptance**: Retry and UX complete endpoints succeed and are covered by unit tests for `validateTransition`.
3. **Remove/stop using `fireNode()` in production paths** ✅ (webhooks fixed)
   - **Acceptance**: Webhook processing and retry no longer import `fireNode`; all run starts are ExecutionGraph-based.
4. **Production typecheck green** ✅
   - **Acceptance**: `npm run typecheck` passes with production code (tests/dev tooling excluded); all `unknown` indexing issues resolved.

### P1 — Data integrity under concurrency
4. **Replace `updateNodeStates()` with an atomic alternative** ✅
   - **Acceptance**: Collector progress/output updates cannot overwrite concurrent updates; add a concurrency-focused test (or DB-level test) validating no lost updates.
5. **Fix callback output merge semantics** ✅
   - **Acceptance**: Parallel workers seeded with primitives do not produce corrupted merged output; add test for primitive input + object callback output.

### P2 — Maintainability & performance
6. **Normalize node type casing across VisualGraph, validation, and engine** ✅
   - **Acceptance**: Validation and execution behave consistently for a saved canvas; add test ensuring worker validation runs for your stored graph format.
7. **Refactor webhook processor into composable steps** ✅
   - **Acceptance**: At least 5-7 smaller functions; unit tests can target signature validation, entity upsert, run start independently.
8. **Fix StitchCanvas `any` conversions + JSON stringify dirty check** ✅
   - **Acceptance**: No `any` in conversion helpers; dirty tracking is event-based or hashed; perf improved for large graphs.

### P3 — Technical Debt & Cleanup
9. **Optimize graph traversal in engine**
   - **Acceptance**: `getUpstreamNodeIds` uses an O(1) adjacency lookup instead of scanning all edges; `StitchCanvas` diffing further optimized.
10. **Quarantine legacy engine code**
   - **Acceptance**: Move `fireNode` and related legacy helpers to `src/lib/engine/legacy/`; add lint rule or comment forbidding new imports.
11. **Consolidate navigation stack**
   - **Acceptance**: Single source of truth for canvas navigation (CanvasRouter); remove `stitch_canvases` query if table is unused; remove `sessionStorage` duplication.
12. **Structured logging in engine**
   - **Acceptance**: Replace `console.log` in `edge-walker.ts` with a proper logger (e.g. `pino` or internal helper) that respects log levels.

---

## Appendix: Notable evidence pointers (quick links)

- Engine entrypoints: `src/lib/engine/edge-walker.ts`
- Status machine: `src/lib/engine/status-transitions.ts`
- Callback route: `src/app/api/stitch/callback/[runId]/[nodeId]/route.ts`
- UX complete route: `src/app/api/stitch/complete/[runId]/[nodeId]/route.ts`
- Retry route: `src/app/api/stitch/retry/[runId]/[nodeId]/route.ts`
- Webhook processor: `src/lib/webhooks/processor.ts`
- Atomic node update RPC: `supabase/migrations/20241202000002_atomic_node_state_update.sql`
- Canvas editor: `src/components/canvas/StitchCanvas.tsx`
- Graph validation/compile: `src/lib/canvas/validate-graph.ts`, `src/lib/canvas/compile-oeg.ts`


