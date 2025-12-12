# Refactor Safety Checklist

**Purpose:** Ensure refactor aligns with existing codebase and architecture

---

## API Endpoint Verification ✅

All referenced endpoints have been verified to exist:

- ✅ `POST /api/flows/{flowId}/run` - Run start (use everywhere, including scheduler)
- ✅ `POST /api/canvas/[id]/nodes` - Create node
- ✅ `PATCH /api/canvas/[id]/nodes/[nodeId]` - Update node
- ✅ `POST /api/canvas/[id]/edges` - Create edge
- ✅ `DELETE /api/canvas/[id]/edges/[edgeId]` - Delete edge
- ✅ `POST /api/entities` - Create entity
- ✅ `PATCH /api/entities/[entityId]` - Update entity
- ✅ `DELETE /api/entities/[entityId]` - Delete entity
- ✅ `POST /api/function-registry` - Register user webhook
- ✅ `POST /api/schedules` - Create schedule
- ✅ `POST /api/webhook-configs` - Create webhook config
- ✅ `POST /api/email-reply-configs` - Create email reply config
- ✅ `POST /api/integrations/airtable/sync` - Sync from Airtable

---

## Architecture Alignment

### Run Start Endpoint
- **Rule:** Always use `POST /api/flows/{flowId}/run`
- **Never use:** `/api/canvas/[id]/run` or other variants
- **Applies to:** Manual runs, bulk runs, scheduled runs, all run triggers

### Entity Data Fetching
- **Rule:** Use existing `useCanvasEntities` hook
- **Never:** Create duplicate fetch logic
- **Why:** Avoid double-fetching and inconsistent state

### Function Registry
- **Rule:** Only for user-provided webhooks
- **Built-in workers:** Stay code-registered (not in registry)
- **Why:** Separation of concerns

### Webhook Configuration
- **Rule:** Reuse `stitch_webhook_configs` table
- **Default:** `require_signature = true` (signature validation ON)
- **Secret display:** Show once on creation, then hide
- **Why:** Security best practice

### Schedules
- **Prerequisite:** `stitch_schedules` table must exist
- **Required columns:** canvas_id, cron_expression, enabled, last_run_at, next_run_at, last_run_status
- **Required indexes:** canvas_id
- **Required RLS:** User access policies
- **Integration:** Trigger.dev must read from this table
- **Run endpoint:** Must use `POST /api/flows/{flowId}/run`

### Email Reply Handling
- **Rule:** Pick correct active run (most recent in `waiting_for_user` for that node)
- **Error handling:** Log unmatched replies, don't error
- **Why:** Multiple runs may be active; need to pick the right one

### Airtable Sync
- **Validation:** Check email field early (before insert)
- **Error handling:** Reject records without email
- **CORS/Auth:** Ensure API route handles properly
- **Why:** Prevent bad data from entering system

### Real-time Updates
- **Options:** Supabase real-time OR polling
- **If polling:** Use reasonable interval (5-10 seconds, not 1 second)
- **Why:** Don't overwhelm server with requests

---

## Database Prerequisites

### Phase 0 (Foundation)
- [x] `stitch_entities` has `company` column (migration 019)
- [x] `stitch_webhook_configs` has `require_signature` column (migration 019)
- [ ] Verify `stitch_runs` table exists
- [ ] Verify `stitch_webhook_events` table exists

### Phase 4 (Settings)
- [ ] `stitch_schedules` table exists (may need to create)
- [ ] `stitch_schedules` has RLS policies
- [ ] `stitch_schedules` has index on canvas_id
- [ ] `stitch_function_registry` table exists
- [ ] Trigger.dev configured to read from `stitch_schedules`

---

## Build Verification

**CRITICAL:** Run `npm run build` at these checkpoints:

1. **After Phase 0:** Verify foundation is stable
2. **After each task:** Catch broken imports immediately
3. **After each phase:** Ensure no accumulated errors
4. **Before moving to next phase:** Don't proceed with broken code

**If build fails:**
- Stop immediately
- Fix the error
- Run build again
- Only proceed when build succeeds

---

## Code Reuse Checklist

### Don't Duplicate These:
- ✅ `useCanvasEntities` - Entity fetching (already exists)
- ✅ `stitch_webhook_configs` - Webhook storage (already exists)
- ✅ `POST /api/flows/{flowId}/run` - Run start (already exists)
- ✅ Node/Edge API routes (already exist)
- ✅ Entity API routes (already exist)

### Create These If Missing:
- [ ] `LeftSidePanel` component (for consistency)
- [ ] `stitch_schedules` table (if doesn't exist)
- [ ] Schedule RLS policies (if table is new)

---

## Integration Requirements

### Every Task Must:
1. **Import** the component/function
2. **Render** it in the UI
3. **Wire up** event handlers
4. **Connect** to API endpoints
5. **Test** manually (can user access it?)
6. **Verify** persistence (refresh page, still works?)
7. **Run build** (no errors?)

### Task Is NOT Done Until:
- [ ] Code is written
- [ ] Code is integrated (imported and rendered)
- [ ] Feature is accessible (user can navigate to it)
- [ ] Feature works (user can complete workflow)
- [ ] Changes persist (refresh page, still works)
- [ ] Build succeeds (no errors)

---

## Security Checklist

### Phase 4 (Settings)
- [ ] Webhook signature validation ON by default
- [ ] Secret keys shown once, then hidden
- [ ] Webhook URLs generated securely
- [ ] Email reply processor validates sender

### Phase 7 (Security)
- [ ] Auth middleware on all API routes
- [ ] Input sanitization on all endpoints
- [ ] RLS policies verified
- [ ] Sensitive data encrypted

---

## Testing Strategy

### During Implementation (Phases 0-6)
- **Manual testing only** - Can user access and use the feature?
- **No automated tests** - Save for Phase 7
- **Build verification** - Run after each task/phase

### Phase 7 (Testing)
- **Integration tests** - Test all workflows end-to-end
- **Error case tests** - Test error handling
- **Edge case tests** - Test boundary conditions
- **Security tests** - Test auth, validation, RLS

---

## Common Pitfalls to Avoid

### ❌ Don't Do This:
1. Reference API endpoints that don't exist
2. Create duplicate fetch logic (use existing hooks)
3. Use wrong run start endpoint
4. Skip build verification
5. Mark task done before integration
6. Create schedules without table/RLS
7. Forget signature validation for webhooks
8. Use aggressive polling intervals (1 second)
9. Error on unmatched email replies
10. Skip email validation in Airtable sync

### ✅ Do This:
1. Verify API routes exist before using
2. Reuse existing hooks and utilities
3. Always use `POST /api/flows/{flowId}/run`
4. Run build after each task/phase
5. Integrate before marking task done
6. Create database tables before UI
7. Default signature validation to ON
8. Use reasonable polling (5-10s) or real-time
9. Log unmatched replies, don't error
10. Validate email early in import flow

---

## Phase-by-Phase Safety Checks

### Phase 0: Foundation
- [ ] Build succeeds
- [ ] Canvas list loads
- [ ] Canvas detail loads
- [ ] API routes verified
- [ ] Database tables verified

### Phase 1: Core Canvas
- [ ] Build succeeds after each task
- [ ] Node palette integrated (not just created)
- [ ] Node config integrated (not just created)
- [ ] Edges work (create and delete)
- [ ] Changes persist to database

### Phase 2: Entities
- [ ] Build succeeds after each task
- [ ] Entity panel uses useCanvasEntities
- [ ] Import modal integrated (not just created)
- [ ] Manual import works
- [ ] CSV import validates email
- [ ] Airtable sync validates email

### Phase 3: Runs
- [ ] Build succeeds after each task
- [ ] Uses correct endpoint: POST /api/flows/{flowId}/run
- [ ] Run status uses reasonable polling or real-time
- [ ] Bulk operations work
- [ ] Error handling works

### Phase 4: Settings
- [ ] Build succeeds after each task
- [ ] stitch_schedules table exists
- [ ] Webhook signature validation ON
- [ ] Email reply picks correct run
- [ ] Function registry only for user webhooks

### Phase 5: Observability
- [ ] Build succeeds after each task
- [ ] Components integrated (not just created)
- [ ] Data fetching works
- [ ] Navigation works

### Phase 6: Polish
- [ ] Build succeeds after each task
- [ ] Design system applied (not just created)
- [ ] Error handling integrated (not just created)
- [ ] Performance optimizations applied (not just created)

### Phase 7: Security & Testing
- [ ] All security measures applied
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Ready for production

---

## Success Criteria

### For Each Task:
- ✅ Code written
- ✅ Code integrated
- ✅ Feature accessible
- ✅ Feature works
- ✅ Changes persist
- ✅ Build succeeds

### For Each Phase:
- ✅ All tasks complete
- ✅ All features accessible
- ✅ All features tested
- ✅ Build succeeds
- ✅ Demo-able to stakeholders

### For Overall Project:
- ✅ All core features work
- ✅ Users can create workflows
- ✅ Users can import entities
- ✅ Users can run workflows
- ✅ Users can monitor results
- ✅ App is stable
- ✅ Ready for production

