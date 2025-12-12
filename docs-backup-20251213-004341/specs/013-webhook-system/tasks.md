# Implementation Plan

- [x] 1. Create database migration for webhook tables
  - Create Supabase migration file `008_webhook_system.sql`
  - Define `stitch_webhook_configs` table with all columns, constraints, and indexes
  - Define `stitch_webhook_events` table with all columns, constraints, and indexes
  - Add `entity_id` and `trigger` columns to `stitch_runs` table
  - Add foreign key constraints with appropriate CASCADE/SET NULL behavior
  - Add unique constraint on `endpoint_slug` in webhook_configs
  - Add indexes for efficient queries (endpoint_slug, webhook_config_id, received_at)
  - Enable RLS policies for both new tables
  - Add tables to Supabase realtime publication
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 1.1 Write property test for endpoint slug uniqueness
  - **Property 1: Endpoint slug uniqueness enforcement**
  - **Validates: Requirements 1.2**

- [ ]* 1.2 Write property test for webhook configuration referential integrity
  - **Property 2: Webhook configuration referential integrity**
  - **Validates: Requirements 1.3**

- [ ]* 1.3 Write property test for webhook configuration round-trip
  - **Property 3: Webhook configuration round-trip consistency**
  - **Validates: Requirements 1.4, 1.5**

- [ ]* 1.4 Write property test for canvas deletion cascade
  - **Property 15: Canvas deletion cascade to webhook configs**
  - **Validates: Requirements 6.4**

- [x] 2. Define TypeScript types for webhook system
  - Add `WebhookConfig` interface to `src/types/stitch.ts`
  - Add `EntityMapping` interface to `src/types/stitch.ts`
  - Add `WebhookEvent` interface to `src/types/stitch.ts`
  - Extend `StitchRun` interface with `entity_id` and `trigger` fields
  - Add `TriggerMetadata` interface to `src/types/stitch.ts`
  - Extend `WorkerNodeData` interface with `entityMovement` field
  - Add `EntityMovementConfig` interface to `src/types/stitch.ts`
  - Add `EntityMovementAction` interface to `src/types/stitch.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Implement JSON path extraction utility
  - Create `src/lib/webhooks/json-path.ts` with `extractValue` function
  - Support basic JSON path syntax ($.field, $.nested.field, $.array[0])
  - Handle missing paths gracefully (return undefined)
  - Handle static string values (non-path values)
  - _Requirements: 1.4_

- [ ]* 3.1 Write unit tests for JSON path extraction
  - Test nested field extraction
  - Test array index extraction
  - Test missing path handling
  - Test static value passthrough
  - _Requirements: 1.4_

- [x] 4. Implement entity mapping transformation
  - Create `src/lib/webhooks/entity-mapper.ts` with `mapPayloadToEntity` function
  - Use JSON path extraction to map payload fields to entity fields
  - Extract name, email, entity_type, avatar_url from payload
  - Extract metadata fields into metadata object
  - Return structured entity data ready for database insertion
  - _Requirements: 1.4_

- [ ]* 4.1 Write unit tests for entity mapping
  - Test mapping with all fields present
  - Test mapping with optional fields missing
  - Test metadata field extraction
  - Test static value handling
  - _Requirements: 1.4_

- [x] 5. Implement webhook signature validation
  - Create `src/lib/webhooks/signature.ts` with `validateSignature` function
  - Support HMAC-SHA256 signature validation
  - Compare computed signature with X-Webhook-Signature header
  - Return boolean indicating validity
  - _Requirements: 1.5_

- [ ]* 5.1 Write unit tests for signature validation
  - Test valid signature acceptance
  - Test invalid signature rejection
  - Test missing signature handling
  - Test missing secret handling
  - _Requirements: 1.5_

- [x] 6. Create database operations for webhook configs
  - Create `src/lib/db/webhook-configs.ts`
  - Implement `createWebhookConfig` function
  - Implement `getWebhookConfigBySlug` function
  - Implement `getWebhookConfigsByCanvas` function
  - Implement `updateWebhookConfig` function
  - Implement `deleteWebhookConfig` function
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 7. Create database operations for webhook events
  - Create `src/lib/db/webhook-events.ts`
  - Implement `createWebhookEvent` function
  - Implement `updateWebhookEvent` function
  - Implement `getWebhookEventsByConfig` function
  - Implement `getWebhookEventById` function
  - Support ordering by received_at timestamp
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7.1 Write property test for webhook event payload preservation
  - **Property 4: Webhook event payload preservation**
  - **Validates: Requirements 2.1**

- [x] 7.2 Write property test for webhook event status tracking
  - **Property 5: Webhook event status tracking**
  - **Validates: Requirements 2.2**

- [ ]* 7.3 Write property test for webhook event linking
  - **Property 6: Webhook event entity and run linking**
  - **Validates: Requirements 2.3, 2.4**

- [ ]* 7.4 Write property test for webhook event ordering
  - **Property 7: Webhook event chronological ordering**
  - **Validates: Requirements 2.5**

- [ ]* 7.5 Write property test for workflow run deletion preserving events
  - **Property 16: Workflow run deletion preserves webhook events**
  - **Validates: Requirements 6.5**

- [x] 8. Update workflow run creation to support trigger metadata
  - Modify `src/lib/db/runs.ts` `createRun` function
  - Add optional `entity_id` parameter
  - Add optional `trigger` parameter with TriggerMetadata structure
  - Store trigger metadata in database
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 8.1 Write property test for trigger metadata round-trip
  - **Property 8: Workflow run trigger metadata round-trip**
  - **Validates: Requirements 3.1, 3.4**

- [ ]* 8.2 Write property test for webhook trigger event linking
  - **Property 9: Webhook trigger event linking**
  - **Validates: Requirements 3.2**

- [ ]* 8.3 Write property test for workflow run entity referential integrity
  - **Property 10: Workflow run entity referential integrity**
  - **Validates: Requirements 3.3**

- [ ]* 8.4 Write property test for trigger metadata immutability
  - **Property 11: Trigger metadata immutability**
  - **Validates: Requirements 3.5**

- [x] 9. Implement webhook processing orchestration
  - Create `src/lib/webhooks/processor.ts` with `processWebhook` function
  - Look up webhook config by endpoint_slug
  - Validate signature if secret is configured
  - Create webhook event record (status: 'pending')
  - Map payload to entity data using entity mapper
  - Create or update entity in stitch_entities
  - Create workflow run with trigger metadata
  - Start execution at entry_edge_id using existing engine
  - Update webhook event (status: 'completed', link entity_id and workflow_run_id)
  - Handle errors and update webhook event status accordingly
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [x] 9.1 Write unit tests for webhook processing
  - Test successful webhook processing flow
  - Test signature validation failure
  - Test inactive webhook rejection
  - Test entity mapping error handling
  - Test workflow execution error handling
  - _Requirements: 2.2_

- [x] 10. Create webhook API endpoint
  - Create `src/app/api/webhooks/[endpoint_slug]/route.ts`
  - Implement POST handler
  - Extract endpoint_slug from URL params
  - Extract payload from request body
  - Extract signature from X-Webhook-Signature header
  - Call webhook processor
  - Return appropriate HTTP status codes (200, 401, 404, 500)
  - _Requirements: 1.2, 1.5, 2.1_

- [x] 10.1 Write integration tests for webhook API endpoint
  - Test successful webhook request
  - Test invalid signature rejection
  - Test unknown endpoint slug
  - Test inactive webhook rejection
  - _Requirements: 1.2, 1.5_

- [x] 11. Implement entity movement for worker nodes
  - Modify `src/lib/engine/handlers/worker.ts`
  - Check for `entityMovement` configuration in node data
  - On successful completion, apply `onSuccess` movement if configured
  - On failure, apply `onFailure` movement if configured
  - Update entity's `current_node_id` to target section
  - Create journey event for entity movement
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 11.1 Write property test for entity movement configuration round-trip
  - **Property 12: Entity movement configuration round-trip**
  - **Validates: Requirements 5.1, 5.2, 5.5**

- [ ]* 11.2 Write property test for success entity movement
  - **Property 13: Success entity movement application**
  - **Validates: Requirements 5.3**

- [ ]*   11.3 Write property test for failure entity movement
  - **Property 14: Failure entity movement application**
  - **Validates: Requirements 5.4**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Create webhook adapter type definitions
  - Create `src/lib/webhooks/adapters/types.ts`
  - Define `ExtractedEntity` interface
  - Define `WebhookAdapter` interface with verifySignature, extractEntity, and getEventType methods
  - _Requirements: 7.1_

- [x] 14. Implement generic webhook adapter
  - Create `src/lib/webhooks/adapters/generic.ts`
  - Implement verifySignature using existing validateSignature utility
  - Implement extractEntity using existing mapPayloadToEntity utility
  - Implement getEventType to extract event type from payload
  - _Requirements: 7.7_

- [ ]* 14.1 Write unit tests for generic adapter
  - Test signature verification with valid and invalid signatures
  - Test entity extraction with various payload structures
  - Test event type extraction
  - _Requirements: 7.7_

- [x] 15. Implement Stripe webhook adapter
  - Create `src/lib/webhooks/adapters/stripe.ts`
  - Implement Stripe-specific signature verification (parse t=timestamp,v1=signature format)
  - Implement HMAC-SHA256 verification with timing-safe comparison
  - Implement entity extraction from Stripe payload structure (customer_details, customer_email)
  - Extract Stripe-specific metadata (customer_id, payment_status, amount, currency)
  - _Requirements: 7.2, 7.6_

- [ ]* 15.1 Write property test for Stripe signature verification
  - **Property 18: Stripe signature verification**
  - **Validates: Requirements 7.2, 7.8**

- [ ]* 15.2 Write unit tests for Stripe entity extraction
  - Test extraction from checkout.session.completed events
  - Test extraction from customer.subscription.created events
  - Test metadata extraction
  - _Requirements: 7.6_

- [x] 16. Implement Typeform webhook adapter
  - Create `src/lib/webhooks/adapters/typeform.ts`
  - Implement Typeform-specific signature verification (sha256=signature format with base64)
  - Implement entity extraction from form_response.answers array
  - Search for email type fields and name fields intelligently
  - Extract Typeform-specific metadata (form_id, submitted_at)
  - _Requirements: 7.3, 7.6_

- [ ]* 16.1 Write property test for Typeform signature verification
  - **Property 19: Typeform signature verification**
  - **Validates: Requirements 7.3, 7.8**

- [ ]* 16.2 Write unit tests for Typeform entity extraction
  - Test extraction from form_response with email and name fields
  - Test handling of various field types
  - Test metadata extraction
  - _Requirements: 7.6_

- [x] 17. Implement Calendly webhook adapter
  - Create `src/lib/webhooks/adapters/calendly.ts`
  - Implement Calendly-specific signature verification (t=timestamp,v1=signature format)
  - Implement entity extraction from payload.invitee object
  - Extract Calendly-specific metadata (event_type, meeting_name, start_time, join_url)
  - _Requirements: 7.4, 7.6_

- [ ]* 17.1 Write property test for Calendly signature verification
  - **Property 20: Calendly signature verification**
  - **Validates: Requirements 7.4, 7.8**

- [ ]* 17.2 Write unit tests for Calendly entity extraction
  - Test extraction from invitee.created events
  - Test extraction from invitee.canceled events
  - Test metadata extraction
  - _Requirements: 7.6_

- [x] 18. Implement n8n webhook adapter
  - Create `src/lib/webhooks/adapters/n8n.ts`
  - Implement n8n-specific token verification (x-webhook-secret or x-auth-token header)
  - Use simple string comparison for token validation
  - Implement entity extraction using generic JSONPath mapping (n8n payloads are dynamic)
  - Extract n8n-specific metadata (execution_id)
  - _Requirements: 7.5, 7.6_

- [ ]* 18.1 Write property test for n8n token verification
  - **Property 21: n8n token verification**
  - **Validates: Requirements 7.5, 7.8**

- [ ]* 18.2 Write unit tests for n8n entity extraction
  - Test extraction with various n8n payload structures
  - Test metadata extraction
  - _Requirements: 7.6_

- [x] 19. Create webhook adapter registry
  - Create `src/lib/webhooks/adapters/index.ts`
  - Register all adapters (stripe, typeform, calendly, n8n, generic)
  - Implement getAdapter function to select adapter by source
  - Implement processAdapterLogic function to orchestrate adapter usage
  - Include fallback logic to generic adapter when source-specific extraction fails
  - _Requirements: 7.1, 7.6, 7.7_

- [ ]* 19.1 Write property test for adapter selection
  - **Property 17: Adapter selection by source**
  - **Validates: Requirements 7.1, 7.7**

- [ ]* 19.2 Write property test for entity extraction with fallback
  - **Property 22: Source-specific entity extraction with fallback**
  - **Validates: Requirements 7.6, 7.7**

- [x] 20. Integrate adapters into webhook processor
  - Update `src/lib/webhooks/processor.ts`
  - Replace manual signature validation with processAdapterLogic call
  - Map signature to appropriate header based on source
  - Use adapter-extracted entity data instead of direct mapPayloadToEntity call
  - Preserve existing error handling and webhook event logging
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ]* 20.1 Update integration tests for webhook API with adapters
  - Test Stripe webhook with valid signature
  - Test Typeform webhook with valid signature
  - Test Calendly webhook with valid signature
  - Test n8n webhook with valid token
  - Test generic webhook with fallback behavior
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

- [x] 21. Final Checkpoint - Ensure all adapter tests pass
  - Ensure all tests pass, ask the user if questions arise.
