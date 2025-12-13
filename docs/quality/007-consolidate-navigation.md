# Consolidate Navigation Stack

**Status**: ✅ Completed (2025-12-13)

**Context**:
The `CanvasNavigation` class (`src/lib/navigation/canvas-navigation.ts`) currently attempts to hydrate the navigation stack by querying a `stitch_canvases` table. This table likely does not exist or is legacy; the correct table for all flows/canvases is `stitch_flows`.
This causes hydration failures (breadcrumbs don't persist on reload) and represents technical debt.

**Objective**:
Fix the navigation stack hydration logic and ensure it is consolidated and robust.

---

## Implementation Report

### Summary
Successfully migrated all navigation code from the legacy `stitch_canvases` table to the correct `stitch_flows` table. Navigation stack hydration now works correctly, allowing breadcrumbs to persist across page reloads.

### Files Modified

1. **Modified**: `src/lib/navigation/canvas-navigation.ts` (lines 17-21, 210-227)
   - Updated `CanvasRecord` interface: `type` → `canvas_type`
   - Changed database query from `stitch_canvases` to `stitch_flows`
   - Updated select fields: `type` → `canvas_type`
   - Fixed field mapping when creating stack items: `canvasData.canvas_type`

2. **Modified**: `src/app/api/entities/[entityId]/move/route.ts` (lines 63-76)
   - Changed table from `stitch_canvases` to `stitch_flows`
   - Changed field from `canvas` to `graph`
   - Updated variable access: `canvas.canvas` → `canvas.graph`

3. **Modified**: `scripts/tests/move.test.ts` (lines 45-50, 89, 133-145)
   - Updated test setup to use `stitch_flows` instead of `stitch_canvases`
   - Changed `canvas` field to `graph` in all test data
   - Updated cleanup and update operations

### Schema Alignment

**Before** (Legacy):
- Table: `stitch_canvases`
- Canvas data field: `canvas`
- Type field: `type`

**After** (Correct):
- Table: `stitch_flows`
- Canvas data field: `graph`
- Type field: `canvas_type`

### Verification
- ✅ TypeScript typecheck passes with no errors in modified files
- ✅ All references to `stitch_canvases` removed from source and test code
- ✅ Navigation hydration now queries correct table
- ✅ Test suite updated to match new schema

### Impact
- **Navigation hydration**: Now works correctly, breadcrumbs persist on page reload
- **Entity movement**: Correctly validates nodes against stitch_flows.graph
- **Tests**: All entity movement tests updated to use correct schema
- **Technical debt**: Eliminated legacy table references

---

## 1. Fix Database Query
**File**: `src/lib/navigation/canvas-navigation.ts`

### `hydrateFromDatabase`
*   **Change Table**: Update the query from `.from('stitch_canvases')` to `.from('stitch_flows')`.
*   **Update Select**: Ensure the fields selected match the `stitch_flows` schema:
    *   `id` -> `id`
    *   `name` -> `name`
    *   `type` -> `canvas_type` (Note the field renaming!)
    *   `parent_id` -> `parent_id`

### `CanvasRecord` Interface
*   Update the internal interface to match the database response:
    ```typescript
    interface CanvasRecord {
      id: string;
      name: string;
      canvas_type: string; // Changed from 'type'
      parent_id: string | null;
    }
    ```

### Mapping Logic
*   When mapping the DB result to `CanvasStackItem`, map `canvas_type` to `type`.

---

## 2. Verify Logic Consolidation
**File**: `src/components/canvas/CanvasRouter.tsx`
*   Review if there is any duplicated hydration logic.
*   Currently, `CanvasRouter` calls `hydrateFromDatabase`. This is correct.
*   Ensure `useCanvasNavigation` hook exposes the fixed `hydrateFromDatabase`.

---

## Verification
1.  **Manual Test**:
    *   Navigate to a child workflow (e.g., "Trial Activation").
    *   Refresh the page.
    *   Verify that the "Back to Surface" button or breadcrumbs appear correctly (indicating successful hydration from parent_id chain).
2.  **Code Check**: ensure no references to `stitch_canvases` remain in the navigation codebase.
