# Requirements: Settings Pages

## Overview

Users need access to configuration pages for managing webhooks, functions, schedules, and email reply handling. While the underlying infrastructure exists, the pages need integration work to be fully functional and accessible.

## Glossary

- **Function Registry**: Database of user-provided webhook functions (excludes built-in workers)
- **Webhook Config**: Configuration for incoming webhook endpoints with signature validation
- **Email Reply Config**: Configuration for processing email replies to workflow notifications
- **Schedule**: Automated workflow execution based on cron expressions
- **Signature Validation**: Security feature requiring HMAC signatures on webhook requests
- **Trigger.dev**: External service that reads schedule configurations and executes workflows
- **Active Run**: Workflow execution in `waiting_for_user` status expecting user response

## User Stories

### US-1: Function Registry Management

**As a** workflow builder  
**I want** to register and manage custom webhook functions  
**So that** I can extend workflows with external integrations

**Acceptance Criteria**:

1. **WHEN** a user navigates to /settings/functions **THEN** the system **SHALL** display a list of registered functions
2. **WHEN** a user clicks "Add Function" **THEN** the system **SHALL** open a modal for function registration
3. **WHEN** a user submits valid function details **THEN** the system **SHALL** create the function and refresh the list
4. **WHEN** a user clicks "Edit" on a function **THEN** the system **SHALL** open an edit modal with current values
5. **WHEN** a user clicks "Test" on a function **THEN** the system **SHALL** send a test payload and display results
6. **WHEN** a user clicks "Delete" on a function **THEN** the system **SHALL** remove it after confirmation

### US-2: Webhook Configuration

**As a** workflow builder  
**I want** to configure webhook endpoints with security  
**So that** external systems can trigger my workflows safely

**Acceptance Criteria**:

1. **WHEN** a user navigates to /settings/webhooks **THEN** the system **SHALL** display webhook configurations
2. **WHEN** a user creates a webhook **THEN** the system **SHALL** generate a unique endpoint URL and secret key
3. **WHEN** a webhook is created **THEN** the system **SHALL** enable signature validation by default
4. **WHEN** a user views webhook details **THEN** the system **SHALL** show the endpoint URL once then hide it
5. **WHEN** a user views webhook logs **THEN** the system **SHALL** display execution history from stitch_webhook_events
### US-3: Email Reply Configuration

**As a** workflow builder  
**I want** to configure email reply processing  
**So that** users can respond to workflow notifications via email

**Acceptance Criteria**:

1. **WHEN** a user navigates to /settings/webhooks/email-replies **THEN** the system **SHALL** display email provider options
2. **WHEN** a user selects an email provider **THEN** the system **SHALL** show provider-specific configuration fields
3. **WHEN** a user configures intent keywords **THEN** the system **SHALL** save the keyword mappings
4. **WHEN** an email reply is received **THEN** the system **SHALL** pick the most recent run in waiting_for_user status for the correct node
5. **WHEN** no matching run is found **THEN** the system **SHALL** log the unmatched reply without erroring

### US-4: Schedule Management

**As a** workflow builder  
**I want** to schedule automated workflow executions  
**So that** workflows can run at specified times without manual intervention

**Acceptance Criteria**:

1. **WHEN** a user navigates to /settings/schedules **THEN** the system **SHALL** display existing schedules
2. **WHEN** a user creates a schedule **THEN** the system **SHALL** validate the cron expression format
3. **WHEN** a schedule is enabled **THEN** the system **SHALL** update the stitch_schedules table for Trigger.dev
4. **WHEN** a schedule executes **THEN** the system **SHALL** call POST /api/flows/{flowId}/run and update stitch_schedules status fields
5. **WHEN** viewing schedules **THEN** the system **SHALL** show last_run_at, next_run_at, and last_run_status from stitch_schedules table

### US-5: Settings Navigation

**As a** user  
**I want** to easily navigate between different settings pages  
**So that** I can efficiently manage all configuration aspects

**Acceptance Criteria**:

1. **WHEN** a user accesses any settings page **THEN** the system **SHALL** provide navigation to other settings sections
2. **WHEN** a user is on a settings page **THEN** the system **SHALL** highlight the current section
3. **WHEN** a user completes a configuration **THEN** the system **SHALL** show success feedback
4. **WHEN** an error occurs **THEN** the system **SHALL** display clear error messages with guidance

## Non-Functional Requirements

### Security
- All webhook configurations must default to signature validation enabled
- Secret keys must be displayed only once upon creation
- User access must be scoped to their own configurations

### Performance  
- Settings pages must load within 2 seconds
- Configuration changes must save within 1 second
- Real-time updates for schedule execution status

### Usability
- All forms must provide clear validation feedback
- Error messages must be actionable
- Success states must be clearly indicated

## Implementation Notes

- **Email Reply Run Selection**: Handler must pick the most recent run in `waiting_for_user` status for the specific node that matches the email reply context
- **Trigger.dev Integration**: Verify that external Trigger.dev jobs properly read from and update the `stitch_schedules` table fields (last_run_at, next_run_at, last_run_status)

## Out of Scope

- Built-in worker registration (stays code-registered)
- Trigger.dev job implementation (external service, but integration must be verified)
- Email provider credential storage (handled separately)
- Advanced cron expression builder (basic validation only)