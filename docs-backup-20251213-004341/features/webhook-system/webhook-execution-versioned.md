# Webhook execution invariant: always use `FlowVersion` graphs (never `flow.graph`)

**Date:** 2025-12-12  
**Status:** Implemented + tested

---

## Invariant

**Webhook-triggered workflow execution MUST always start from the versioned graphs stored on `stitch_flow_versions`**:

- Use `run.flow_version_id → FlowVersion.execution_graph` for execution
- Use `run.flow_version_id → FlowVersion.visual_graph` only for locating configured entry edges (by `entry_edge_id`)

**Webhook execution MUST NOT use `stitch_flows.graph`** (legacy/denormalized), because it can drift from versioned state.

---

## Why this exists (risk it prevents)

Using `stitch_flows.graph` in production execution introduces integrity risk:

- `stitch_flows.graph` may be stale or edited outside the versioning system
- `run.flow_version_id` pins execution to a specific `ExecutionGraph`
- If execution starts from `flow.graph`, you can end up “executing a different graph than the run claims”, breaking reproducibility, debugging, and correctness.

The invariant ensures:
- **Reproducible execution** (run is pinned to a specific version)
- **No drift** between “what you see” (versioned visual graph) and “what executes” (versioned execution graph)
- **Safer refactors** (legacy graph can be deprecated without risking webhooks)

---

## Where it’s enforced

### Primary implementation

File: `src/lib/webhooks/processor.ts`

- After creating the run via `createRunAdmin(...)`, execution is started by:
  1. Loading the run’s pinned version (`getVersionAdmin(workflowRun.flow_version_id)`)
  2. Reading `version.execution_graph` and `version.visual_graph`
  3. If `entry_edge_id` is present:
     - find the edge by ID in `version.visual_graph.edges`
     - start execution via `fireNodeWithGraph(entryEdge.target, version.execution_graph, workflowRun)`

There is **no** dependency on `getFlowAdmin()` or `flow.graph` for execution start.

---

## Related rules

- **Entry edge lookup is versioned**: `entry_edge_id` must exist in the version’s `visual_graph`.
- **Signature enforcement**: signature is only required when a **non-empty secret exists**, consistent with adapter verification semantics.

---

## How to verify (recommended)

### Unit tests

- `src/lib/webhooks/__tests__/processor.test.ts`
  - Tests webhook processing against a **versioned workflow** (`createFlowWithVersion(...)`)
  - Verifies successful runs and error paths (including invalid entry edge)

Run:

```bash
npx --yes vitest --run src/lib/webhooks/__tests__/processor.test.ts
```

### Manual sanity check

- Create a webhook config for a workflow.
- Create a new version of the workflow (change an edge ID or target).
- Confirm the webhook run starts from the graph pinned by `run.flow_version_id`, not whatever is currently in `stitch_flows.graph`.

---

## Future hardening (optional)

- Add a lint rule / forbid-import rule to prevent new webhook execution code from importing legacy `fireNode(...)`.
- Add an integration test that intentionally desynchronizes `stitch_flows.graph` from the latest version and asserts webhooks still execute using the pinned version.




