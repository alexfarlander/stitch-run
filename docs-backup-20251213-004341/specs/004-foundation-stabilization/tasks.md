# Implementation Plan: Foundation Stabilization (Phase 0)

## Overview

This plan breaks down Phase 0 into discrete, manageable verification and stabilization tasks. Each task focuses on verifying one aspect of the foundation and fixing only critical errors that prevent the application from functioning.

---

## Tasks

- [x] 1. Verify Canvas List Page
  - Navigate to /canvases and verify page loads
  - Test canvas creation modal functionality
  - Fix any critical errors that prevent page load
  - Document current state
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Verify Canvas Detail Page
  - Navigate to /canvas/[id] and verify page loads without crashing
  - Verify canvas component renders
  - Fix any critical errors that prevent page load
  - Document current state (don't worry about full functionality yet)
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Run Build and Fix Critical Errors
  - Execute `npm run build` command
  - Document all TypeScript errors
  - Fix TypeScript compilation errors
  - Fix import errors
  - Fix missing dependency errors
  - Run build again until it succeeds
  - Document any warnings (don't fix, just note)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Verify API Routes Exist
  - Check that POST /api/flows/{flowId}/run exists
  - Check that /api/entities endpoints exist (POST, PATCH, DELETE)
  - Check that /api/canvas/[id]/nodes endpoints exist (POST, PATCH)
  - Check that /api/canvas/[id]/edges endpoints exist (POST, DELETE)
  - Check that /api/function-registry exists
  - Check that /api/schedules exists
  - Check that /api/webhook-configs exists
  - Check that /api/integrations/airtable/sync exists
  - Document webhook/email-reply handler routes (email replies use these, not a dedicated endpoint)
  - Read each route to understand request/response contracts
  - Document findings in verification report
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Verify Database Schema
  - Query stitch_entities table schema
  - Verify company column exists in stitch_entities
  - Query stitch_webhook_configs table schema
  - Verify require_signature column exists in stitch_webhook_configs
  - Check if stitch_schedules table exists (document result)
  - Verify stitch_runs table exists
  - Check RLS policies for user access control
  - Document all findings in verification report
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Create Verification Report
  - Compile all findings from tasks 1-5
  - Document page load status
  - Document build status
  - Document API route inventory
  - Document database schema status
  - Note what infrastructure is missing for future phases
  - Create summary document in summaries/phase-0-verification-report.md
  - _Requirements: All_

---

## Task Details

### Task 1: Verify Canvas List Page (1 hour)

**Objective**: Ensure users can view the canvas list page without errors

**Steps**:
1. Start development server
2. Navigate to http://localhost:3000/canvases
3. Observe if page loads or crashes
4. If crashes, check browser console for errors
5. If crashes, check terminal for server errors
6. Fix any critical errors (broken imports, missing components)
7. Test "Create Canvas" button
8. Verify modal opens
9. Create a test canvas
10. Verify it appears in the list

**Files to Check**:
- `src/app/canvases/page.tsx`
- `src/app/canvases/CanvasListClient.tsx`
- `src/components/canvas/CanvasCreationModal.tsx`

**Success Criteria**:
- Page loads without crashing
- Canvas list displays
- Create button works
- Modal opens and functions

### Task 2: Verify Canvas Detail Page (1 hour)

**Objective**: Ensure users can navigate to a canvas without the app crashing

**Steps**:
1. Navigate to /canvas/[id] (use an existing canvas ID)
2. Observe if page loads or crashes
3. If crashes, check browser console for errors
4. If crashes, check terminal for server errors
5. Fix any critical errors that prevent page load
6. Don't worry about full functionality - just make it load
7. Verify canvas component renders (even if empty)

**Files to Check**:
- `src/app/canvas/[id]/page.tsx`
- `src/components/canvas/WorkflowCanvas.tsx`

**Success Criteria**:
- Page loads without crashing
- Canvas component renders
- No unhandled errors in console

### Task 3: Run Build and Fix Critical Errors (1 hour)

**Objective**: Ensure the application builds successfully

**Steps**:
1. Run `npm run build`
2. Observe output
3. If errors, document each error
4. Fix TypeScript errors:
   - Type mismatches
   - Missing type definitions
   - Incorrect imports
5. Fix import errors:
   - Remove broken imports
   - Fix incorrect paths
   - Add missing dependencies
6. Run build again
7. Repeat until build succeeds
8. Document any warnings (don't fix, just note)

**Success Criteria**:
- `npm run build` completes successfully
- Zero TypeScript errors
- Zero import errors
- Build output shows success message

### Task 4: Verify API Routes Exist (30 minutes)

**Objective**: Document what API infrastructure exists

**Steps**:
1. Check if each API route file exists in the filesystem
2. For each route, read the code to understand:
   - HTTP methods supported
   - Request body format
   - Response format
   - Error handling
3. Document findings in a structured format
4. Note any routes that are referenced but don't exist

**Routes to Check**:
- `src/app/api/flows/[id]/run/route.ts`
- `src/app/api/entities/route.ts`
- `src/app/api/entities/[entityId]/route.ts`
- `src/app/api/canvas/[id]/nodes/route.ts`
- `src/app/api/canvas/[id]/nodes/[nodeId]/route.ts`
- `src/app/api/canvas/[id]/edges/route.ts`
- `src/app/api/canvas/[id]/edges/[edgeId]/route.ts`
- `src/app/api/function-registry/route.ts`
- `src/app/api/schedules/route.ts`
- `src/app/api/webhook-configs/route.ts`
- `src/app/api/integrations/airtable/sync/route.ts`
- Webhook/email-reply handler routes (document actual paths found)

**Success Criteria**:
- All routes documented
- Request/response formats noted
- Missing routes identified

### Task 5: Verify Database Schema (30 minutes)

**Objective**: Document what database infrastructure exists

**Steps**:
1. Open Supabase dashboard or use SQL client
2. Query table schema for stitch_entities
3. Verify company column exists
4. Query table schema for stitch_webhook_configs
5. Verify require_signature column exists
6. Check if stitch_schedules table exists
7. Verify stitch_runs table exists
8. Check RLS policies:
   - Run: `SELECT * FROM pg_policies WHERE tablename LIKE 'stitch_%'`
9. Document all findings

**SQL Queries**:
```sql
-- Check stitch_entities columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stitch_entities';

-- Check stitch_webhook_configs columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stitch_webhook_configs';

-- Check if stitch_schedules exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'stitch_schedules'
);

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'stitch_%';
```

**Success Criteria**:
- All required columns verified
- Table existence documented
- RLS policies documented
- Missing infrastructure noted

### Task 6: Create Verification Report (30 minutes)

**Objective**: Compile all findings into a comprehensive report

**Steps**:
1. Create `summaries/phase-0-verification-report.md`
2. Document page load status from Task 1
3. Document page load status from Task 2
4. Document build status from Task 3
5. Document API routes from Task 4
6. Document database schema from Task 5
7. Create summary of what works
8. Create summary of what needs to be created in future phases
9. Note any critical issues that need immediate attention

**Report Structure**:
```markdown
# Phase 0 Verification Report

## Executive Summary
[Brief overview of findings]

## Page Verification

### Canvas List Page
- Status: [Working / Broken]
- Errors: [List any errors]
- Notes: [Any observations]

### Canvas Detail Page
- Status: [Working / Broken]
- Errors: [List any errors]
- Notes: [Any observations]

## Build Verification
- Status: [Success / Failed]
- Errors Fixed: [List]
- Warnings: [List]

## API Routes
[Table of all routes with status]

## Database Schema
[Table of all tables with column verification]

## Missing Infrastructure
[List what needs to be created]

## Recommendations
[Next steps for Phase 1]
```

**Success Criteria**:
- Report is comprehensive
- All findings documented
- Clear next steps identified
- Report is easy to read

---

## Checkpoint

After completing all tasks:
- [ ] Canvas list page loads
- [ ] Canvas detail page loads
- [ ] Build succeeds
- [ ] API routes documented
- [ ] Database schema documented
- [ ] Verification report created
- [ ] Ready to proceed to Phase 1

---

## Notes

- **Speed over perfection**: This phase should take 3-4 hours total
- **Fix only critical errors**: Don't fix UI issues or add features
- **Document everything**: Future phases depend on this documentation
- **Build success is key**: Must have working build before proceeding
- **No automated tests**: Manual verification only in this phase
