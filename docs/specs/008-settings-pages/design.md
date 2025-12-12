# Design: Settings Pages

## Architecture Overview

The settings pages leverage existing API infrastructure and components but require integration work to make them fully functional. The architecture follows a standard React pattern with API routes, database tables, and UI components.

## Current State Analysis

### Tables That Exist
- `stitch_function_registry` - User-provided webhook functions (migration 016)
- `stitch_webhook_configs` - Webhook endpoint configurations (migration 008)
- `stitch_webhook_events` - Webhook execution logs (migration 008)
- `stitch_schedules` - Scheduled workflow runs (migration 016)
- `stitch_email_reply_configs` - Email reply processing configs (existing)
- `stitch_email_reply_logs` - Email reply processing logs (existing)

### API Endpoints That Exist
- `GET/POST /api/function-registry` - Function CRUD operations
- `PATCH/DELETE /api/function-registry/[functionId]` - Function management
- `POST /api/function-registry/test` - Function testing
- `GET/POST /api/webhook-configs` - Webhook configuration
- `GET/POST /api/schedules` - Schedule management
- `PATCH/DELETE /api/schedules/[scheduleId]` - Schedule operations
- `POST /api/email-reply-configs` - Email reply configuration

### Components That Exist
- `AddFunctionModal`, `EditFunctionModal`, `TestFunctionModal`
- `AddWebhookModal`, `EditWebhookModal`, `WebhookLogsModal`
- `AddScheduleModal`, `EditScheduleModal`, `ScheduleExecutionLogs`
- `FunctionRegistrySelector`

### Pages That Exist
- `/settings/functions/page.tsx`
- `/settings/webhooks/page.tsx`
- `/settings/webhooks/email-replies/page.tsx`
- `/settings/schedules/page.tsx`

### Integration Gaps
- Modal components not properly wired to buttons
- API calls may not be connected to UI actions
- Error handling and success feedback missing
- Navigation between settings pages incomplete
- Real-time updates not implemented
## Data Models

### Function Registry

```typescript
interface FunctionRegistration {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  config_schema: Record<string, any>;
  created_at: string;
  updated_at: string;
  user_id: string;
}
```

### Webhook Configuration

```typescript
interface WebhookConfig {
  id: string;
  canvas_id: string;
  workflow_id: string;
  endpoint_slug: string;
  secret: string;
  require_signature: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}
```

### Schedule Configuration

```typescript
interface Schedule {
  id: string;
  canvas_id: string;
  name: string;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_run_status: 'success' | 'failed' | 'pending' | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}
```

### Email Reply Configuration

```typescript
interface EmailReplyConfig {
  id: string;
  provider: 'sendgrid' | 'postmark' | 'mailgun';
  intent_keywords: Record<string, string>;
  webhook_url: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}
```

## API Contracts

### Function Registry

**GET /api/function-registry**
```json
{
  "functions": [
    {
      "id": "uuid",
      "name": "Custom Webhook",
      "description": "External integration",
      "webhook_url": "https://example.com/webhook",
      "config_schema": {}
    }
  ]
}
```

**POST /api/function-registry**
```json
{
  "name": "Function Name",
  "description": "Function description",
  "webhook_url": "https://example.com/webhook",
  "config_schema": {}
}
```

### Webhook Configuration

**POST /api/webhook-configs**
```json
{
  "canvas_id": "uuid",
  "workflow_id": "uuid",
  "endpoint_slug": "custom-endpoint"
}
```

**Response:**
```json
{
  "webhook": {
    "id": "uuid",
    "endpoint_url": "https://app.com/api/webhooks/custom-endpoint",
    "secret": "generated-secret-key",
    "require_signature": true
  }
}
```
## Component Architecture

### Function Registry Page

**Purpose**: Manage user-provided webhook functions  
**Components**: 
- `FunctionListTable` - Display registered functions
- `AddFunctionModal` - Create new function registration
- `EditFunctionModal` - Modify existing function
- `TestFunctionModal` - Send test payload to function
**Integration**: Wire modals to buttons, connect API calls, handle state updates

### Webhook Configuration Page

**Purpose**: Manage webhook endpoints with security  
**Components**:
- `WebhookListTable` - Display webhook configurations
- `AddWebhookModal` - Create new webhook endpoint
- `EditWebhookModal` - Modify webhook settings
- `WebhookLogsModal` - View execution history
**Integration**: Generate secure endpoints, manage secrets, show logs

### Schedule Management Page

**Purpose**: Manage automated workflow execution  
**Components**:
- `ScheduleListTable` - Display scheduled workflows
- `AddScheduleModal` - Create new schedule
- `EditScheduleModal` - Modify schedule settings
- `ScheduleExecutionLogs` - View execution history
**Integration**: Validate cron expressions, sync with Trigger.dev, show status

### Email Reply Configuration Page

**Purpose**: Configure email response processing  
**Components**:
- `EmailProviderSelector` - Choose email service provider
- `IntentKeywordEditor` - Map keywords to actions
- `EmailReplyTestPanel` - Test configuration
**Integration**: Provider-specific forms, keyword validation, test functionality

## Database Schema

All required tables already exist. Key relationships:

```sql
-- Function registry (user-scoped)
stitch_function_registry.user_id -> auth.users.id

-- Webhook configs (user-scoped, canvas-linked)
stitch_webhook_configs.user_id -> auth.users.id
stitch_webhook_configs.canvas_id -> stitch_flows.id

-- Schedules (user-scoped, canvas-linked)
stitch_schedules.user_id -> auth.users.id
stitch_schedules.canvas_id -> stitch_flows.id

-- Email reply configs (user-scoped)
stitch_email_reply_configs.user_id -> auth.users.id
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Function Registry CRUD Operations
*For any* valid function registration data, creating then reading the function should return equivalent data
**Validates: Requirements US-1.3, US-1.4**

### Property 2: Webhook Security Default
*For any* newly created webhook configuration, the require_signature field should default to true
**Validates: Requirements US-2.3**

### Property 3: Schedule Cron Validation
*For any* schedule creation attempt, invalid cron expressions should be rejected with clear error messages
**Validates: Requirements US-4.2**

### Property 4: Email Reply Run Selection
*For any* email reply processing, the system should select the most recent run in waiting_for_user status for the matching node
**Validates: Requirements US-3.4**

### Property 5: User Data Isolation
*For any* settings page access, users should only see and modify their own configurations
**Validates: Security requirements across all user stories**

## Error Handling

### API Error Responses
- 400: Invalid input data with specific field errors
- 401: Authentication required
- 403: Access denied to resource
- 404: Resource not found
- 500: Internal server error with safe error message

### UI Error States
- Form validation errors with field-specific messages
- Network error handling with retry options
- Loading states during API operations
- Success feedback for completed operations

## Testing Strategy

### Manual Testing Requirements
- Navigate to each settings page and verify it loads
- Test create, read, update, delete operations for each resource type
- Verify error handling for invalid inputs
- Test navigation between settings pages
- Verify user data isolation (create test users)

### Integration Points to Test
- Modal opening/closing from buttons
- API calls triggered by form submissions
- State updates after successful operations
- Error message display for failed operations
- Real-time updates for schedule status

## Trade-offs and Decisions

### Decision 1: Reuse Existing Infrastructure

**Options Considered**:
- Rebuild settings pages from scratch
- Fix and integrate existing components

**Decision**: Fix and integrate existing components

**Rationale**: API endpoints, database tables, and UI components already exist. Integration work is faster than rebuilding, and maintains consistency with existing patterns.

### Decision 2: Default Security Settings

**Options Considered**:
- Signature validation optional by default
- Signature validation required by default

**Decision**: Signature validation required by default

**Rationale**: Security-first approach prevents accidental exposure. Users can disable if needed, but safe defaults protect against common security mistakes.

## Dependencies

- Depends on: Existing API infrastructure (already complete)
- Depends on: Database tables and RLS policies (already complete)
- Depends on: Authentication system (already complete)
- Blocks: Advanced workflow features that require settings configuration