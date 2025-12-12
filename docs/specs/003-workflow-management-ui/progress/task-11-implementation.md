# Task 11: Email Reply Webhook UI - Implementation Summary

## Overview

Implemented a complete email reply webhook system that allows automatic completion of UX nodes based on customer email responses. The system detects intent from email replies and continues workflow execution automatically.

## Files Created

### 1. Frontend Components

#### `/src/app/settings/webhooks/email-replies/page.tsx`
- Main configuration page for email reply webhooks
- Provider selector with pre-configured field mappings (Resend, SendGrid, Postmark, Custom)
- Canvas and UX node selectors
- Intent keywords configuration (yes/no/default)
- Configuration list with endpoint URLs and management actions
- Active/inactive toggle and delete functionality

### 2. API Endpoints

#### `/src/app/api/email-reply-configs/route.ts`
- POST endpoint for creating email reply configurations
- Generates unique endpoint slugs and secret keys
- Validates required fields and intent configuration
- Returns endpoint URL and secret key (shown once)

#### `/src/app/api/email-replies/[endpoint_slug]/route.ts`
- Webhook receiver for email reply events
- Extracts payload and signature from various providers
- Calls email reply processor
- Returns appropriate HTTP status codes

### 3. Core Logic

#### `/src/lib/webhooks/email-reply-processor.ts`
- Main processing orchestration for email replies
- Signature validation using HMAC-SHA256
- Field mapping extraction using dot notation paths
- Intent detection based on keyword matching
- Run selection logic (finds most recent active run for sender)
- UX node completion with detected intent
- Comprehensive logging for matched and unmatched replies

### 4. Database Migration

#### `/supabase/migrations/017_email_reply_webhooks.sql`
- `stitch_email_reply_configs` table for configurations
- `stitch_email_reply_logs` table for logging all replies
- Indexes for efficient queries
- RLS policies for security
- Realtime publication for live updates

### 5. Documentation

#### `/src/app/settings/webhooks/email-replies/README.md`
- Complete feature documentation
- Provider-specific field mapping examples
- Intent detection configuration guide
- Example workflow walkthrough
- Security considerations
- Troubleshooting guide

## Key Features Implemented

### 1. Provider Support (Requirement 9.1)
- **Resend**: Pre-configured field mapping
- **SendGrid**: Pre-configured field mapping
- **Postmark**: Pre-configured field mapping
- **Custom**: User-defined JSON path mapping

### 2. Intent Detection (Requirements 9.2, 9.5)
- Configurable "yes" keywords (default: yes, sure, interested, definitely, sounds good)
- Configurable "no" keywords (default: no, not interested, unsubscribe, remove me)
- Default intent when no keywords match (yes/no/neutral)
- Case-insensitive keyword matching

### 3. Security (Requirement 9.3)
- HMAC-SHA256 signature validation
- Unique secret key per configuration
- Timing-safe signature comparison
- Required signature validation in production

### 4. Email Parsing (Requirement 9.4)
- Nested object value extraction using dot notation
- Provider-specific field mapping
- Extracts from_email, body, and optional subject

### 5. Run Selection (Requirements 9.6, 9.7, 9.8)
- Finds most recent run for sender email
- Checks for 'waiting_for_user' status on target UX node
- Matches entity email to sender email
- Handles multiple active runs correctly (selects most recent)

### 6. UX Node Completion (Requirement 9.8)
- Updates node state to 'completed'
- Stores intent, email, body, and timestamp in output
- Triggers edge-walking to continue workflow
- Uses existing UX completion mechanism

### 7. Logging (Requirement 9.9)
- Logs all received email replies
- Tracks matched vs unmatched replies
- Stores detected intent and error messages
- Enables debugging and analytics

## Technical Implementation Details

### Intent Detection Algorithm
```typescript
function detectIntent(bodyText, intentConfig) {
  const lowerBody = bodyText.toLowerCase();
  
  // Check yes keywords first
  for (const keyword of intentConfig.yes_keywords) {
    if (lowerBody.includes(keyword.toLowerCase())) {
      return 'yes';
    }
  }
  
  // Check no keywords
  for (const keyword of intentConfig.no_keywords) {
    if (lowerBody.includes(keyword.toLowerCase())) {
      return 'no';
    }
  }
  
  // Use default
  return intentConfig.default_intent;
}
```

### Run Selection Logic
1. Query all runs for the canvas, ordered by created_at DESC
2. For each run:
   - Check if target UX node is in 'waiting_for_user' status
   - If yes, fetch entity and check if email matches sender
   - If match found, use this run (most recent)
3. If no match found, log as unmatched reply

### Field Mapping Extraction
Uses dot notation to extract nested values:
```typescript
getNestedValue({ from: { email: 'test@example.com' } }, 'from.email')
// Returns: 'test@example.com'
```

## Database Schema

### stitch_email_reply_configs
```sql
- id: UUID (primary key)
- name: TEXT (configuration name)
- provider: TEXT (resend, sendgrid, postmark, custom)
- canvas_id: UUID (foreign key to stitch_flows)
- target_ux_node_id: TEXT (node to complete)
- endpoint_slug: TEXT (unique endpoint identifier)
- secret: TEXT (HMAC secret key)
- field_mapping: JSONB (provider-specific paths)
- intent_config: JSONB (keywords and default)
- is_active: BOOLEAN (enable/disable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### stitch_email_reply_logs
```sql
- id: UUID (primary key)
- config_id: UUID (foreign key to configs)
- from_email: TEXT (sender email)
- body_text: TEXT (email body)
- detected_intent: TEXT (yes/no/neutral)
- matched: BOOLEAN (found active run?)
- run_id: UUID (foreign key to stitch_runs)
- node_id: TEXT (completed node)
- error: TEXT (error message if failed)
- received_at: TIMESTAMPTZ
```

## Integration Points

### 1. Existing UX Node System
- Uses `updateNodeState()` from `/lib/db/runs`
- Uses `walkWorkflowEdges()` from `/lib/engine/edge-walker`
- Follows same completion pattern as manual UX completion

### 2. Webhook System
- Similar structure to existing webhook configs
- Reuses signature validation patterns
- Consistent error handling and logging

### 3. Supabase Integration
- Uses admin client for database operations
- Implements RLS policies for security
- Enables realtime subscriptions for live updates

## User Workflow

1. **Setup**: User creates email reply webhook configuration
   - Selects email provider
   - Chooses target canvas and UX node
   - Configures intent keywords
   - Receives endpoint URL and secret key

2. **Provider Configuration**: User configures email provider
   - Sets webhook URL to generated endpoint
   - Configures secret key for signature validation

3. **Workflow Execution**: Workflow sends email and waits
   - Worker node sends email to customer
   - UX node pauses workflow in 'waiting_for_user' status

4. **Customer Reply**: Customer responds to email
   - Email provider receives reply
   - Provider sends webhook to Stitch endpoint

5. **Automatic Completion**: System processes reply
   - Validates signature
   - Parses email content
   - Detects intent from keywords
   - Finds active run for sender
   - Completes UX node with intent
   - Workflow continues automatically

## Testing Considerations

### Manual Testing Checklist
- [ ] Create email reply configuration for each provider
- [ ] Test signature validation (valid and invalid)
- [ ] Test intent detection with various keywords
- [ ] Test run selection with multiple active runs
- [ ] Test UX node completion and workflow continuation
- [ ] Test unmatched reply logging
- [ ] Test active/inactive toggle
- [ ] Test configuration deletion
- [ ] Test custom provider field mapping

### Edge Cases Handled
- No active run found for sender → Logged as unmatched
- Multiple active runs → Selects most recent
- Invalid signature → Returns 401 Unauthorized
- Inactive configuration → Returns 404 Not Found
- Missing required fields → Returns 400 Bad Request
- No keyword match → Uses default intent

## Requirements Validation

✅ **9.1**: Provider-specific field mapping with auto-fill  
✅ **9.2**: Intent keywords configuration (yes, no, default)  
✅ **9.3**: Signature validation before processing  
✅ **9.4**: Reply parsing using configured field mapping  
✅ **9.5**: Intent detection based on keywords  
✅ **9.6**: Run selection logic (most recent active run)  
✅ **9.7**: Multiple active runs handling  
✅ **9.8**: UX node completion with detected intent  
✅ **9.9**: Logging for unmatched replies  

## Next Steps

1. **Run Database Migration**: Execute `017_email_reply_webhooks.sql`
2. **Test with Real Providers**: Configure actual email providers
3. **Monitor Logs**: Check `stitch_email_reply_logs` for debugging
4. **Adjust Keywords**: Fine-tune intent keywords based on real replies
5. **Add Analytics**: Build dashboard for reply metrics

## Notes

- Secret keys are only shown once on creation (security best practice)
- Signature validation is enforced in production
- Unmatched replies are logged but don't fail the webhook
- System is designed to be fault-tolerant and debuggable
- All state changes are persisted to database immediately
