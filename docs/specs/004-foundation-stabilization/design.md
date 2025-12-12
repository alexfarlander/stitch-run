# Design: Foundation Stabilization (Phase 0)

## Overview

Phase 0 focuses on stabilizing the existing codebase before adding new features. This phase verifies that core pages load, the build succeeds, API routes exist, and database tables are properly configured. The goal is to establish a stable foundation and document what infrastructure is available for future development.

## Architecture

### Verification Strategy

This phase uses a **verification-first approach**:

1. **Page Verification**: Manually test that pages load without crashing
2. **Build Verification**: Run build process to catch TypeScript and import errors
3. **API Verification**: Check that expected API routes exist and understand their contracts
4. **Database Verification**: Query database to verify tables, columns, and policies exist

### No New Features

This phase explicitly does NOT add new features. It only:
- Fixes critical errors that prevent pages from loading
- Removes broken imports
- Documents what exists
- Establishes a stable baseline

## Components

### Pages to Verify

#### Canvas List Page
- **Path**: `/canvases`
- **Component**: `src/app/canvases/page.tsx` and `src/app/canvases/CanvasListClient.tsx`
- **Expected Behavior**: 
  - Page loads without errors
  - Displays list of canvases
  - "Create Canvas" button opens modal
  - Modal can create new canvas

#### Canvas Detail Page
- **Path**: `/canvas/[id]`
- **Component**: `src/app/canvas/[id]/page.tsx` and `src/components/canvas/WorkflowCanvas.tsx`
- **Expected Behavior**:
  - Page loads without crashing
  - Canvas component renders
  - If workflow has nodes/edges, they display (even if not fully functional)

### Build Process

#### TypeScript Compilation
- **Command**: `npm run build`
- **Expected**: Zero TypeScript errors
- **Action on Failure**: Fix errors or remove broken code

#### Next.js Build
- **Command**: `npm run build`
- **Expected**: Successful production build
- **Action on Failure**: Fix import errors, missing dependencies

## API Contracts

### Verified Endpoints

All endpoints should exist and be documented. No new endpoints are created in this phase.

#### Run Management
- **POST /api/flows/{flowId}/run**
  - Starts a workflow run
  - Body: `{ entity_id: string, ... }`
  - Response: `{ run_id: string, status: string }`

#### Entity Management
- **POST /api/entities**
  - Creates a new entity
  - Body: `{ email: string, name: string, canvas_id: string, ... }`
  - Response: `{ id: string, ... }`

- **PATCH /api/entities/[entityId]**
  - Updates an entity
  - Body: `{ field: value, ... }`
  - Response: `{ id: string, ... }`

- **DELETE /api/entities/[entityId]**
  - Deletes an entity
  - Response: `{ success: boolean }`

#### Canvas Node Management
- **POST /api/canvas/[id]/nodes**
  - Creates a new node
  - Body: `{ type: string, position: { x: number, y: number }, data: object }`
  - Response: `{ id: string, ... }`

- **PATCH /api/canvas/[id]/nodes/[nodeId]**
  - Updates a node
  - Body: `{ data: object, position: object, ... }`
  - Response: `{ id: string, ... }`

#### Canvas Edge Management
- **POST /api/canvas/[id]/edges**
  - Creates a new edge
  - Body: `{ source: string, target: string, ... }`
  - Response: `{ id: string, ... }`

- **DELETE /api/canvas/[id]/edges/[edgeId]**
  - Deletes an edge
  - Response: `{ success: boolean }`

#### Additional Endpoints (To Verify)
- **POST /api/function-registry** - Register user webhooks (verify exists)
- **POST /api/schedules** - Create schedules (verify exists; requires stitch_schedules table from migration 016)
- **POST /api/webhook-configs** - Configure webhooks (verify exists)
- **POST /api/integrations/airtable/sync** - Sync from Airtable (verify exists)

**Note**: Email reply handling uses webhook/email-reply handler routes, not a dedicated /api/email-reply-configs endpoint. Document actual email reply route if found.

## Database Schema

### Tables to Verify

#### stitch_entities
**Purpose**: Stores customer/lead entities that travel through workflows

**Expected Columns**:
- `id` (UUID, primary key)
- `email` (TEXT, required)
- `name` (TEXT)
- `entity_type` (TEXT)
- `company` (TEXT) - Added in migration 019
- `metadata` (JSONB)
- `canvas_id` (UUID, foreign key)
- `created_at` (TIMESTAMP)

**Verification**: Verify migration 019 is applied (adds company column)

#### stitch_webhook_configs
**Purpose**: Stores webhook configuration for external integrations

**Expected Columns**:
- `id` (UUID, primary key)
- `canvas_id` (UUID, foreign key)
- `url` (TEXT)
- `secret` (TEXT)
- `require_signature` (BOOLEAN) - Added in migration 015
- `created_at` (TIMESTAMP)

**Verification**: Verify migration 015 is applied (adds require_signature column)

#### stitch_runs
**Purpose**: Tracks workflow execution runs

**Expected Columns**:
- `id` (UUID, primary key)
- `canvas_id` (UUID, foreign key)
- `entity_id` (UUID, foreign key)
- `status` (TEXT) - e.g., 'running', 'completed', 'failed', 'waiting_for_user' (added in migration 016)
- `started_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP)

**Verification**: Verify table exists and status column is present

#### stitch_schedules
**Purpose**: Stores scheduled workflow executions

**Expected Columns** (added in migration 016):
- `id` (UUID, primary key)
- `canvas_id` (UUID, foreign key)
- `cron_expression` (TEXT)
- `enabled` (BOOLEAN)
- `last_run_at` (TIMESTAMP)
- `next_run_at` (TIMESTAMP)
- `last_run_status` (TEXT)

**Verification**: Verify migration 016 is applied (creates stitch_schedules table); if not applied, note for Phase 4

### RLS Policies

**Verification**: Verify that Row Level Security is enabled on core tables with permissive policies from migrations:
- Check RLS is enabled on stitch_canvases, stitch_entities, stitch_runs, stitch_webhook_configs
- Document actual policies found (don't assume user-scoped access)
- Note any tables without RLS policies

## Data Models

### Verification Report

```typescript
interface VerificationReport {
  pages: {
    canvasList: {
      loads: boolean;
      errors: string[];
    };
    canvasDetail: {
      loads: boolean;
      errors: string[];
    };
  };
  build: {
    success: boolean;
    errors: string[];
    warnings: string[];
  };
  apiRoutes: {
    [endpoint: string]: {
      exists: boolean;
      method: string;
      notes: string;
    };
  };
  database: {
    tables: {
      [tableName: string]: {
        exists: boolean;
        columns: string[];
        missingColumns: string[];
      };
    };
    rlsPolicies: {
      verified: boolean;
      notes: string;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Page Load Stability
*For any* verified page (canvas list, canvas detail), navigating to that page should not result in a crash or unhandled error
**Validates: Requirements 1.1, 2.1**

### Property 2: Build Determinism
*For any* state of the codebase, running the build command should produce consistent results (either success or the same set of errors)
**Validates: Requirements 3.1, 3.2**

### Property 3: API Route Existence
*For any* API route in the verified list, making a request to that route should return a valid HTTP response (not 404)
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 4: Database Schema Consistency
*For any* required table column, querying the database schema should confirm that column exists with the correct data type
**Validates: Requirements 5.1, 5.2, 5.4**

## Error Handling

### Page Load Errors
- **Strategy**: Catch and log errors, display user-friendly error message
- **Action**: Fix critical errors that prevent page load
- **Non-Critical**: Document but don't fix non-critical UI issues

### Build Errors
- **Strategy**: Fix all TypeScript errors before proceeding
- **Action**: Remove broken imports, fix type errors
- **Warnings**: Document but don't necessarily fix

### API Route Errors
- **Strategy**: Document which routes exist and which don't
- **Action**: No new routes created in this phase
- **Missing Routes**: Note for future phases

### Database Errors
- **Strategy**: Document schema state
- **Action**: No schema changes in this phase
- **Missing Tables**: Note what needs to be created in future phases

## Testing Strategy

### Manual Testing Only

This phase uses **manual testing only**. No automated tests are written.

#### Page Testing
1. Navigate to /canvases
2. Verify page loads
3. Verify canvas list displays
4. Click "Create Canvas" button
5. Verify modal opens
6. Create a canvas
7. Verify it appears in list
8. Navigate to /canvas/[id]
9. Verify page loads

#### Build Testing
1. Run `npm run build`
2. Verify build completes
3. Document any errors
4. Fix errors
5. Run build again
6. Repeat until build succeeds

#### API Testing
1. Check that each API route file exists
2. Read route code to understand contract
3. Document request/response format
4. Note any missing routes

#### Database Testing
1. Query Supabase for table schema
2. Verify required columns exist
3. Check RLS policies
4. Document findings

### Success Criteria

**Phase 0 is complete when**:
- [ ] Canvas list page loads without errors
- [ ] Canvas detail page loads without crashing
- [ ] `npm run build` succeeds with zero errors
- [ ] All required API routes are verified to exist
- [ ] All required database tables and columns are verified
- [ ] Verification report is documented

## Trade-offs and Decisions

### Decision 1: Manual Testing Only

**Options Considered**:
- Write automated tests for verification
- Use manual testing only

**Decision**: Manual testing only

**Rationale**: 
- Phase 0 is about establishing baseline, not comprehensive testing
- Automated tests will be added in Phase 7
- Manual testing is faster for verification tasks
- Focus is on fixing critical errors, not test coverage

### Decision 2: No New Features

**Options Considered**:
- Fix issues and add small improvements
- Strictly verify only, no additions

**Decision**: Strictly verify only

**Rationale**:
- Adding features risks introducing new bugs
- Need stable baseline before building
- Scope creep is a risk in refactors
- Future phases will add features systematically

### Decision 3: Document Missing Infrastructure

**Options Considered**:
- Create missing tables/routes immediately
- Document what's missing for future phases

**Decision**: Document only

**Rationale**:
- Don't want to create infrastructure that might not be needed
- Future phases will create what they need
- Documentation helps plan future work
- Reduces risk of over-engineering

## Dependencies

### Depends On
- Existing codebase (193 files)
- Supabase database with existing tables
- Next.js 16 App Router
- React Flow library

### Blocks
- Phase 1: Core Canvas View (needs stable foundation)
- Phase 2: Entity Management (needs stable foundation)
- All future phases (need stable foundation)

## Notes

- This phase should take 3-4 hours total
- Focus on speed, not perfection
- Document everything, fix only critical issues
- Build success is the primary goal
- Page load stability is secondary goal
- API/database verification is documentation exercise
