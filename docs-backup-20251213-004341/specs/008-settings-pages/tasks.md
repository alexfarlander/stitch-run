# Implementation Plan: Settings Pages

## Overview

Convert the settings pages design into a series of implementation tasks that will make existing settings functionality fully accessible and working for users. Each task builds incrementally and focuses on integration rather than creation, since most components and APIs already exist.

## Task List

### Phase 1: Function Registry Integration

- [x] 1. Fix Function Registry Page Integration
  - Wire up AddFunctionModal to "Add Function" button
  - Connect EditFunctionModal to edit buttons in function list
  - Connect TestFunctionModal to test buttons in function list
  - Implement delete functionality with confirmation
  - Add error handling and success feedback
  - Test: User can add, edit, test, and delete functions
  - _Requirements: US-1.1, US-1.2, US-1.3, US-1.4, US-1.5, US-1.6_


- [x] 2. Fix Webhook Configuration Page Integration
  - Wire up AddWebhookModal to "Add Webhook" button
  - Connect EditWebhookModal to edit buttons in webhook list
  - Connect WebhookLogsModal to logs buttons
  - Implement webhook URL generation and one-time display
  - Ensure signature validation defaults to true
  - Add delete functionality with confirmation
  - Test: User can create, edit, view logs, and delete webhooks
  - _Requirements: US-2.1, US-2.2, US-2.3, US-2.4, US-2.5_



### Phase 3: Email Reply Configuration Integration

- [x] 3. Fix Email Reply Configuration Page Integration
  - Wire up provider selector to show provider-specific fields
  - Implement intent keywords configuration interface
  - Connect form submission to API endpoint
  - Add email reply processing logic for run selection
  - Implement unmatched reply logging
  - Test: User can configure email reply handling
  - _Requirements: US-3.1, US-3.2, US-3.3, US-3.4, US-3.5_



### Phase 4: Schedule Management Integration

- [x] 4. Fix Schedule Management Page Integration
  - Wire up AddScheduleModal to "Add Schedule" button
  - Connect EditScheduleModal to edit buttons in schedule list
  - Implement cron expression validation
  - Add enable/disable toggle functionality
  - Display schedule status (last_run_at, next_run_at, last_run_status)
  - Connect to Trigger.dev integration
  - Test: User can create, edit, enable/disable schedules
  - _Requirements: US-4.1, US-4.2, US-4.3, US-4.4, US-4.5_



- [x] 5. Implement Settings Navigation
  - Add navigation menu to all settings pages
  - Implement active section highlighting
  - Add breadcrumb navigation
  - Ensure consistent layout across all settings pages
  - Add success/error toast notifications
  - Test: User can navigate between all settings sections
  - _Requirements: US-5.1, US-5.2, US-5.3, US-5.4_



### Phase 6: Integration Testing and Polish

- [x] 6. Settings Pages Integration Testing
  - Test all settings pages load without errors
  - Test all CRUD operations work end-to-end
  - Test error handling across all forms
  - Test user data isolation (multi-user scenarios)
  - Test real-time updates for schedule status
  - Verify Trigger.dev integration works
  - Test webhook signature validation
  - Document any remaining issues
  - _Requirements: All user stories_



## Task Details

### Task 1: Function Registry Page Integration (5 hours)

**Current State:**
- `/settings/functions/page.tsx` exists but modals not wired up
- `AddFunctionModal`, `EditFunctionModal`, `TestFunctionModal` components exist
- API endpoints exist: `GET/POST /api/function-registry`, `PATCH/DELETE /api/function-registry/[functionId]`
- Function list may not be displaying or refreshing properly

**Actions:**
1. Review current function registry page implementation
2. Wire up "Add Function" button to open AddFunctionModal
3. Wire up "Edit" buttons to open EditFunctionModal with current function data
4. Wire up "Test" buttons to open TestFunctionModal
5. Implement delete functionality with confirmation dialog
6. Add proper error handling for all operations
7. Add success feedback (toasts/notifications)
8. Ensure function list refreshes after operations
9. Test all CRUD operations work end-to-end

**Integration Checklist:**
- [ ] AddFunctionModal opens from "Add Function" button
- [ ] EditFunctionModal opens with correct function data
- [ ] TestFunctionModal sends test payloads and shows results
- [ ] Delete confirmation works and removes functions
- [ ] Function list refreshes after operations
- [ ] Error messages display for failed operations
- [ ] Success messages display for completed operations

### Task 2: Webhook Configuration Page Integration (5 hours)

**Current State:**
- `/settings/webhooks/page.tsx` exists but modals not wired up
- `AddWebhookModal`, `EditWebhookModal`, `WebhookLogsModal` components exist
- API endpoints exist: `GET/POST /api/webhook-configs`
- Webhook URL generation and secret management may not be working

**Actions:**
1. Review current webhook configuration page implementation
2. Wire up "Add Webhook" button to open AddWebhookModal
3. Implement webhook URL generation and one-time display
4. Ensure signature validation defaults to true for new webhooks
5. Wire up "Edit" buttons to open EditWebhookModal
6. Wire up "Logs" buttons to open WebhookLogsModal
7. Implement delete functionality with confirmation
8. Add proper error handling and success feedback
9. Test webhook creation, editing, and deletion

**Integration Checklist:**
- [ ] AddWebhookModal creates webhooks with unique URLs and secrets
- [ ] Webhook URLs displayed once then hidden for security
- [ ] Signature validation enabled by default
- [ ] EditWebhookModal allows configuration changes
- [ ] WebhookLogsModal displays execution history
- [ ] Delete confirmation works
- [ ] Error and success feedback works

### Task 3: Email Reply Configuration Integration (4 hours)

**Current State:**
- `/settings/webhooks/email-replies/page.tsx` exists
- API endpoint exists: `POST /api/email-reply-configs`
- Provider selection and intent keywords may not be fully implemented

**Actions:**
1. Review current email reply configuration page
2. Implement provider selector with provider-specific fields
3. Create intent keywords configuration interface
4. Wire up form submission to API endpoint
5. Implement email reply processing logic for run selection
6. Add unmatched reply logging functionality
7. Add error handling and success feedback
8. Test email reply configuration workflow

**Integration Checklist:**
- [ ] Provider selector shows correct fields for each provider
- [ ] Intent keywords can be configured and saved
- [ ] Form submission creates email reply configuration
- [ ] Email processing selects correct active runs
- [ ] Unmatched replies are logged without errors
- [ ] Error and success feedback works

### Task 4: Schedule Management Integration (5 hours)

**Current State:**
- `/settings/schedules/page.tsx` exists but modals not wired up
- `AddScheduleModal`, `EditScheduleModal` components exist
- API endpoints exist: `GET/POST /api/schedules`, `PATCH/DELETE /api/schedules/[scheduleId]`
- Cron validation and Trigger.dev integration may not be working

**Actions:**
1. Review current schedule management page implementation
2. Wire up "Add Schedule" button to open AddScheduleModal
3. Implement cron expression validation
4. Wire up "Edit" buttons to open EditScheduleModal
5. Add enable/disable toggle functionality
6. Display schedule status fields (last_run_at, next_run_at, last_run_status)
7. Ensure Trigger.dev integration works (schedules call correct API)
8. Add delete functionality with confirmation
9. Test schedule creation, editing, and execution

**Integration Checklist:**
- [ ] AddScheduleModal validates cron expressions
- [ ] Schedule list displays status information
- [ ] Enable/disable toggle updates database
- [ ] EditScheduleModal allows schedule modifications
- [ ] Schedules trigger correct API endpoints
- [ ] Delete confirmation works
- [ ] Error and success feedback works

### Task 5: Settings Navigation Integration (3 hours)

**Current State:**
- Individual settings pages exist but navigation between them may be incomplete
- No consistent navigation menu or breadcrumbs
- Success/error feedback may be inconsistent

**Actions:**
1. Create consistent navigation menu for all settings pages
2. Add active section highlighting
3. Implement breadcrumb navigation
4. Ensure consistent layout and styling across pages
5. Add toast notification system for success/error feedback
6. Test navigation between all settings sections
7. Ensure consistent user experience

**Integration Checklist:**
- [ ] Navigation menu appears on all settings pages
- [ ] Active section is highlighted correctly
- [ ] Breadcrumbs show current location
- [ ] Layout is consistent across pages
- [ ] Toast notifications work for all operations
- [ ] Navigation between sections works smoothly

### Task 6: Integration Testing (8 hours)

**Actions:**
1. Test all settings pages load without errors
2. Test complete CRUD workflows for each settings type
3. Test error handling across all forms and operations
4. Test user data isolation with multiple test users
5. Test real-time updates for schedule execution status
6. Verify webhook signature validation works
7. Test Trigger.dev integration for schedules
8. Document any bugs or issues found
9. Create bug fix tasks if needed

**Testing Checklist:**
- [ ] All settings pages load successfully
- [ ] Function registry CRUD operations work
- [ ] Webhook configuration CRUD operations work
- [ ] Email reply configuration works
- [ ] Schedule management CRUD operations work
- [ ] Navigation between pages works
- [ ] Error handling works correctly
- [ ] User data isolation is enforced
- [ ] Real-time updates work
- [ ] Security features work (signatures, secrets)

## Success Criteria

### For Each Task
- [ ] Code integrated (not just created)
- [ ] Feature accessible to users
- [ ] Feature works end-to-end
- [ ] Manual testing completed
- [ ] Error handling implemented
- [ ] Success feedback implemented

### For Overall Spec
- [ ] All settings pages fully functional
- [ ] Users can manage functions, webhooks, schedules, email replies
- [ ] Navigation between settings works
- [ ] Security features properly implemented
- [ ] Integration with external services works (Trigger.dev)
- [ ] User data properly isolated
- [ ] Ready for production use