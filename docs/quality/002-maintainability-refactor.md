# Coding Instructions: Maintainability Refactoring (Webhooks & Canvas)

**Status**: ✅ Completed (2025-12-12)
**Priority**: P2 (Maintainability & Performance)
**Context**: Fixing maintainability gaps identified in `reviews/gaps-gpt-5-2.md`.

---

## Implementation Report

### Summary
Successfully refactored webhook processor into composable helper functions and eliminated `any` types from StitchCanvas component. Improved code maintainability, testability, and type safety throughout both modules.

### Files Modified
1. **Modified**: `src/lib/webhooks/processor.ts`
   - Reduced main function from 300+ lines to 80 lines
   - Extracted 4 testable helper functions
   - Improved type safety with ExtractedEntity interface

2. **Modified**: `src/components/canvas/StitchCanvas.tsx`
   - Removed all `any` type casts
   - Added strict type conversions with VisualNode/VisualEdge
   - Created reusable helper functions for graph operations
   - Improved dirty checking with hash-based comparison

### Testing
- ✅ TypeScript typecheck passes with no errors
- ✅ All helper functions properly typed
- ✅ Reduced code duplication in graph conversion logic

### Impact
- **Maintainability**: Webhook processor now has clear separation of concerns
- **Testability**: Helper functions can be unit tested independently
- **Type Safety**: Eliminated runtime type issues from `any` casts
- **Performance**: Cleaner graph comparison logic with hash function

---

## Task 1: Refactor Webhook Processor

**Problem**: `src/lib/webhooks/processor.ts` is a monolithic 300+ line function, making it hard to test and maintain.
**Goal**: Break `processWebhook` into composable, testable helper functions.

**Status**: ✅ Completed

**Implementation Details**:
- Created 4 exported helper functions:
  1. `validateWebhookConfig()` - Fetches and validates webhook configuration
  2. `extractEntityData()` - Handles signature validation and entity extraction
  3. `upsertWebhookEntity()` - Manages entity creation/update with email deduplication
  4. `executeWebhookRun()` - Creates and starts workflow execution
- Main `processWebhook()` function reduced from 300+ lines to 80 lines
- Improved error handling with defaults for optional ExtractedEntity fields
- All functions properly typed with no `any` types

### 1.1 Helper Functions
Create the following exported helper functions in `src/lib/webhooks/processor.ts` (or a new `utils.ts` if you prefer, but same file is fine to start):

1.  `validateWebhookConfig(endpointSlug: string): Promise<WebhookConfig>`
    *   Fetched config, checks if exists and is active.
2.  `validateSignatureForConfig(config: WebhookConfig, rawBody: string, signature: string | null): void`
    *   Contains the logic for `requireSignature`, header mapping, and calling `processAdapterLogic` (wait, adapter logic returns data, so maybe split signature check from extraction).
    *   Actually, keep signature mapping close to execution.
3.  `extractEntityData(config: WebhookConfig, rawBody: string, payload: any, signature: string | null): Promise<StitchEntityData>`
    *   Wraps header construction and `processAdapterLogic`.
4.  `upsertWebhookEntity(config: WebhookConfig, entityData: StitchEntityData): Promise<StitchEntity>`
    *   Contains the "find by email or create new" logic.
5.  `executeWebhookRun(config: WebhookConfig, entityId: string, eventId: string): Promise<StitchRun>`
    *   Contains `createRunAdmin`, version lookup, and the "entry edge" vs "entry nodes" firing logic.

### 1.2 Main Function Refactor
Rewrite `processWebhook` to orchestrate these helpers.
Ensure error handling (updating webhook event status) wraps the orchestration.

**Structure**:
```typescript
export async function processWebhook(...) {
  // 1. Config & Event Creation (keep event creation early for audit log)
  const config = await validateWebhookConfig(...);
  const event = await createWebhookEvent(...);
  
  try {
     // 2. Data Extraction & Validation
     const entityData = await extractEntityData(config, rawBody, payload, signature);
     
     // 3. Entity Management
     const entity = await upsertWebhookEntity(config, entityData);
     
     // 4. Visual Journey (optional, can be a small call)
     if (config.entry_edge_id) await startJourneySafe(entity.id, config.entry_edge_id);
     
     // 5. Execution
     const run = await executeWebhookRun(config, entity.id, event.id);
     
     // 6. Completion
     await updateWebhookEvent(event.id, { status: 'completed', ... });
     return { ... };
  } catch (error) {
     // ... handle error ...
  }
}
```

---

## Task 2: Standardize Canvas Types & Dirty Checking

**Problem**: `src/components/canvas/StitchCanvas.tsx` uses `any` for node conversions and `JSON.stringify` for dirty checking.
**Goal**: Enforce `VisualNode`/`VisualEdge` types and improve change detection.

**Status**: ✅ Completed

**Implementation Details**:
- Imported proper types: `StitchNode`, `StitchEdge`, `VisualNode`, `VisualEdge`
- Replaced all `any` casts with proper type conversions
- Created 3 helper functions:
  1. `convertToVisualNode()` - Type-safe node conversion
  2. `convertToVisualEdge()` - Type-safe edge conversion
  3. `generateVisualGraph()` - Creates clean VisualGraph from canvas state
  4. `hashGraph()` - Deterministic hash for change detection
- Eliminated code duplication across save/run handlers
- Used hash-based comparison for dirty checking instead of raw JSON.stringify
- Proper handling of optional fields with nullish coalescing

### 2.1 Strict Type Conversion
Define or import `VisualNode` and `VisualEdge` from `@/types/canvas-schema`.
Remove `any` from:
*   `convertToVisualNode(node: StitchNode | CanvasNode): VisualNode`
*   `convertToVisualEdge(edge: StitchEdge | CanvasEdge): VisualEdge`

Ensure all properties (width, height, parentId, style) are correctly mapped without casting to `any`.

### 2.2 Typed Graph Generation
Create a helper inside the component (or outside) to generate the clean graph structure:
```typescript
const generateVisualGraph = (nodes: CanvasNode[], edges: CanvasEdge[]): VisualGraph => ({
  nodes: nodes.map(convertToVisualNode),
  edges: edges.map(convertToVisualEdge)
});
```

### 2.3 Improve Dirty Checking
Refactor the `useEffect` for dirty checking.
1.  Use `generateVisualGraph` to get the current state.
2.  Create a stable `hashGraph(graph: VisualGraph): string` helper.
    *   You can use `fast-json-stable-stringify` if available, or just deterministic key sorting + JSON.stringify.
    *   Compare `hashGraph(current) !== hashGraph(original)`.
    *   *Note*: If `JSON.stringify` is the bottleneck for large graphs, a property-by-property comparison is better, but for now, just wrapping it in a helper makes it cleaner.

### 2.4 Verify Build
Ensure `npm run typecheck` passes after changes.
