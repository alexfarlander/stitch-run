# Requirements Document

## Introduction

This specification defines the database schema and TypeScript types for the Stitch webhook system. The webhook system enables external services to trigger workflow executions by sending HTTP POST requests to unique endpoints. Each webhook configuration maps incoming payloads to entity data and initiates workflow runs, creating a bridge between external events and the Stitch execution engine.

## Glossary

- **Webhook Configuration**: A persistent record defining how a specific webhook endpoint processes incoming requests
- **Webhook Event**: A log entry recording each received webhook request and its processing outcome
- **Entity**: A customer, lead, or data object that travels through workflows in the Stitch system
- **Workflow Run**: An execution instance of a workflow, tracking state and progress through nodes
- **Entry Edge**: The starting edge in a workflow where webhook-triggered execution begins
- **Entity Mapping**: A JSON configuration defining how webhook payload fields map to entity attributes
- **Trigger Metadata**: Information about what initiated a workflow run (webhook, manual, scheduled, etc.)
- **Endpoint Slug**: A unique URL-safe identifier for a webhook endpoint
- **Stitch System**: The workflow execution engine that processes nodes and manages entity movement

## Requirements

### Requirement 1

**User Story:** As a system architect, I want to store webhook configurations in the database, so that external services can trigger workflows through unique endpoints.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Stitch System SHALL provide a table for storing webhook configurations with unique endpoint identifiers
2. WHEN a webhook configuration is created THEN the Stitch System SHALL enforce uniqueness of the endpoint slug across all configurations
3. WHEN a webhook configuration references a workflow THEN the Stitch System SHALL maintain referential integrity to the canvas and workflow identifiers
4. WHEN a webhook configuration is queried THEN the Stitch System SHALL return all configuration fields including entity mapping rules and active status
5. WHERE a webhook configuration includes a secret THEN the Stitch System SHALL store the secret value for authentication validation

### Requirement 2

**User Story:** As a system administrator, I want to log all webhook events, so that I can audit incoming requests and troubleshoot integration issues.

#### Acceptance Criteria

1. WHEN a webhook request is received THEN the Stitch System SHALL create an event log entry with the complete payload
2. WHEN a webhook event is processed THEN the Stitch System SHALL record the processing status and any error messages
3. WHEN a webhook event creates an entity THEN the Stitch System SHALL link the event to the created entity identifier
4. WHEN a webhook event triggers a workflow THEN the Stitch System SHALL link the event to the workflow run identifier
5. WHEN querying webhook events THEN the Stitch System SHALL return events ordered by received timestamp

### Requirement 3

**User Story:** As a workflow designer, I want workflow runs to track their trigger source, so that I can understand what initiated each execution.

#### Acceptance Criteria

1. WHEN a workflow run is created THEN the Stitch System SHALL store trigger metadata including type and source
2. WHEN a webhook triggers a workflow THEN the Stitch System SHALL record the webhook event identifier in the trigger metadata
3. WHEN a workflow run is associated with an entity THEN the Stitch System SHALL maintain a foreign key reference to the entity
4. WHEN querying a workflow run THEN the Stitch System SHALL return the complete trigger information
5. WHEN a workflow run completes THEN the Stitch System SHALL preserve the trigger metadata for historical analysis

### Requirement 4

**User Story:** As a TypeScript developer, I want strongly-typed interfaces for webhook data structures, so that I can write type-safe code when working with webhooks.

#### Acceptance Criteria

1. WHEN defining webhook configuration types THEN the Stitch System SHALL provide a TypeScript interface matching the database schema
2. WHEN defining webhook event types THEN the Stitch System SHALL provide a TypeScript interface with all event fields
3. WHEN defining workflow run types THEN the Stitch System SHALL include entity identifier and trigger metadata fields
4. WHEN defining worker node data types THEN the Stitch System SHALL include entity movement configuration fields
5. WHEN using webhook types in code THEN the TypeScript compiler SHALL enforce type safety for all webhook-related operations

### Requirement 5

**User Story:** As a workflow designer, I want to configure entity movement behavior on worker nodes, so that entities can transition between canvas sections based on workflow outcomes.

#### Acceptance Criteria

1. WHEN a worker node configuration is defined THEN the Stitch System SHALL support entity movement settings for success outcomes
2. WHEN a worker node configuration is defined THEN the Stitch System SHALL support entity movement settings for failure outcomes
3. WHEN a worker node completes successfully THEN the Stitch System SHALL apply the configured success movement behavior
4. WHEN a worker node fails THEN the Stitch System SHALL apply the configured failure movement behavior
5. WHERE entity movement is configured THEN the Stitch System SHALL specify the target section and completion status

### Requirement 6

**User Story:** As a database administrator, I want proper indexing and constraints on webhook tables, so that queries perform efficiently and data integrity is maintained.

#### Acceptance Criteria

1. WHEN webhook configurations are queried by endpoint slug THEN the Stitch System SHALL use an index for efficient lookup
2. WHEN webhook events are queried by configuration THEN the Stitch System SHALL use an index on the foreign key
3. WHEN webhook events are queried by timestamp THEN the Stitch System SHALL use an index for efficient time-based queries
4. WHEN a canvas is deleted THEN the Stitch System SHALL handle cascade behavior for associated webhook configurations
5. WHEN a workflow run is deleted THEN the Stitch System SHALL preserve webhook event logs for audit purposes

### Requirement 7

**User Story:** As a system integrator, I want source-specific webhook adapters for common services, so that signature verification and entity extraction work correctly for each platform.

#### Acceptance Criteria

1. WHEN a webhook configuration specifies a source THEN the Stitch System SHALL select the appropriate adapter for that source
2. WHEN processing a Stripe webhook THEN the Stitch System SHALL verify the Stripe-Signature header using Stripe's signature format
3. WHEN processing a Typeform webhook THEN the Stitch System SHALL verify the Typeform-Signature header using Typeform's signature format
4. WHEN processing a Calendly webhook THEN the Stitch System SHALL verify the Calendly-Webhook-Signature header using Calendly's signature format
5. WHEN processing an n8n webhook THEN the Stitch System SHALL verify the x-webhook-secret header using simple token comparison
6. WHEN an adapter extracts entity data THEN the Stitch System SHALL use source-specific field mappings before falling back to generic JSONPath mapping
7. WHEN no source-specific adapter exists THEN the Stitch System SHALL use the generic adapter with JSONPath-based entity mapping
8. WHEN an adapter fails signature verification THEN the Stitch System SHALL reject the webhook with appropriate error status
