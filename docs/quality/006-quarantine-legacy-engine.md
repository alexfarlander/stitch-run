# Quarantine Legacy Engine

**Status**: ✅ Completed (2025-12-13)

**Context**:
The execution engine has migrated to a high-performance `ExecutionGraph` (O(1) lookups).
Legacy code that iterates over the visual `StitchFlow` graph (O(E) operations) still exists and should be quarantined to prevent accidental usage and mixing of paradigms.

**Objective**:
Move `fireNode` and its legacy helpers to `src/lib/engine/legacy/` and establish barriers against new usage.

---

## Implementation Report

### Summary
Successfully quarantined legacy O(E) engine functions to prevent mixing with modern ExecutionGraph-based code. All legacy functions now reside in `src/lib/engine/legacy/` with clear deprecation warnings.

### Files Modified

1. **Created**: `src/lib/engine/legacy/index.ts`
   - Moved all O(E) traversal functions from `src/lib/engine/index.ts`:
     - `getOutboundEdges` - O(E) edge filtering
     - `getTargetNodes` - Target extraction
     - `areUpstreamDependenciesCompleted` - O(E) dependency checking
     - `mergeUpstreamOutputs` - O(E) input merging
     - `isTerminalNode` - O(E) terminal check
     - `fireNode` - Legacy node execution
   - Added comprehensive deprecation warning block
   - Fixed imports to use `../logger` instead of broken path

2. **Modified**: `src/lib/engine/edge-walker.ts` (lines 7-24, removed 708-799)
   - Removed legacy imports from `./index`
   - Removed `fireNode` function (96 lines)
   - Now uses only modern ExecutionGraph-based functions

3. **Replaced**: `src/lib/engine/index.ts`
   - Deleted old file with legacy functions (150 lines)
   - Created new minimal entry point (19 lines)
   - Exports only modern functions: `startRun`, `walkEdges`, `walkParallelEdges`, `fireNodeWithGraph`
   - Added clear documentation pointing to legacy module

4. **Updated**: `scripts/tests/engine.property.test.ts` (lines 1-18)
   - Updated imports to use `../../src/lib/engine/legacy`
   - Added deprecation warning to test file
   - Tests now explicitly verify legacy behavior

### Consumer Impact
- **No consumers needed updates**: No code was actively importing from `@/lib/engine` or using `fireNode`
- **Test file updated**: Property tests now explicitly import from legacy module
- **Migration path clear**: Any future code needing legacy functions knows where to find them

### Testing
- ✅ TypeScript typecheck passes with no engine-related errors
- ✅ All legacy functions accessible via `src/lib/engine/legacy`
- ✅ Modern engine exports clean and focused
- ✅ No broken imports or references

### Barriers Established
- **Deprecation warnings**: Clear `@deprecated` tags in JSDoc
- **Separate module**: Legacy code isolated in `legacy/` directory
- **Documentation**: New index.ts points to correct modern entry points
- **Code quarantine**: Prevents accidental mixing of O(1) and O(E) paradigms

---

## 1. Create Legacy Module
**Directory**: `src/lib/engine/legacy/`
**File**: `src/lib/engine/legacy/index.ts`

Content for `src/lib/engine/legacy/index.ts`:
1.  **Move** the deprecated `fireNode` function from `src/lib/engine/edge-walker.ts`.
2.  **Move** the contents of `src/lib/engine/index.ts` (helpers like `getOutboundEdges`, `getTargetNodes`, `mergeUpstreamOutputs`, `areUpstreamDependenciesCompleted`, `isTerminalNode`) into this file.
3.  Ensure all imports (types, db functions) are correctly updated.

---

## 2. Clean Up Modern Engine
**File**: `src/lib/engine/index.ts`
*   Delete the file (since its contents moved to legacy).
*   **Create a new** `src/lib/engine/index.ts` that ONLY exports what is needed by the modern engine (likely nothing, or just re-exports from `edge-walker` if needed for consumers).
    *   *Note*: If `edge-walker.ts` needs to be the entry point, update consumers.

**File**: `src/lib/engine/edge-walker.ts`
*   Remove the `fireNode` function.
*   Remove imports from `./index` (since that file is being deleted/emptied).
*   Ensure `startRun`, `walkEdges`, `walkParallelEdges`, `fireNodeWithGraph` are logically self-contained or import from valid modern sources.

---

## 3. Update Existing Consumers
Search for usages of `fireNode` or imports from `src/lib/engine` (the old helpers).
*   Update imports to point to `src/lib/engine/legacy` if they MUST use the legacy code.
*   Ideally, consumers should be updated to use `edge-walker` functions, but for this task, just strictly moving the code is sufficient.

**Search Query**: `from '@/lib/engine'` or `from '../engine'` or `fireNode`.

---

## 4. Forbid New Imports
**Recommendation**:
Add a lint rule or a `// deprecated` comment block to `src/lib/engine/legacy/index.ts`.

Add to `src/lib/engine/legacy/index.ts`:
```typescript
/**
 * @deprecated LEGACY ENGINE
 * This module contains O(E) graph traversal logic.
 * Do NOT use for new features. Use src/lib/engine/edge-walker.ts (ExecutionGraph) instead.
 */
```

---

## Verification
1.  Run `npx tsc --noEmit` to ensure no broken imports.
2.  Verify `startRun` (modern) still works (check `edge-walker.ts` has no broken references).
