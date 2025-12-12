# Requirements Document

## Introduction

This document defines the requirements for the Workflow Management UI feature in Stitch. The goal is to enable users to create, configure, and manage workflows entirely through the Stitch interface, eliminating the need for seed scripts, API calls, and manual configuration. This feature will allow users to build email outreach workflows and other business process automations visually on the canvas.

## Glossary

- **Stitch System**: The Living Business Model Canvas application that visualizes and executes business workflows
- **Canvas**: A visual workspace that can represent a Business Model Canvas (BMC), a workflow, or a section
- **Workflow Canvas**: A canvas type specifically for building executable workflows with nodes and edges in full-edit mode
- **BMC Canvas**: A Business Model Canvas in read-mostly mode for viewing sections and drilling into workflows
- **Node**: A visual element on the canvas representing a step in a workflow (Worker, UX, Splitter, Collector, or Section Item)
- **Worker Node**: A node type that calls an external webhook to perform an action
- **UX Node**: A node type that waits for external user input before proceeding
- **Edge**: A directional connection between nodes that defines workflow execution flow
- **Entity**: A tracked individual (customer, lead, etc.) that moves through the workflow
- **Run**: An execution instance of a workflow for a specific entity
- **Function Registry**: A catalog of user-added external webhook functions available for Worker nodes (built-in workers remain code-registered)
- **Schedule**: A time-based trigger configuration stored in stitch_schedules table for automatically starting workflow runs
- **Webhook Config**: Configuration stored in stitch_webhook_configs table for receiving external events from third-party services
- **Run Start API**: The POST /api/flows/{flowId}/run endpoint used to initiate workflow execution
- **Entities API**: REST endpoints for CRUD operations on stitch_entities table

## Requirements

### Requirement 1

**User Story:** As a workflow designer, I want to create new workflow canvases through the UI, so that I can build business processes without writing code.

#### Acceptance Criteria

1. WHEN a user clicks a "New Canvas" button THEN the Stitch System SHALL display a canvas creation modal
2. WHEN a user enters a canvas name and selects "Workflow" as the canvas type THEN the Stitch System SHALL create a new workflow canvas with that name in full-edit mode
3. WHEN a new workflow canvas is created THEN the Stitch System SHALL display an empty canvas with helpful prompts to add the first node
4. WHERE a user selects a workflow template THEN the Stitch System SHALL pre-populate the canvas with template nodes and edges
5. WHEN a canvas is created THEN the Stitch System SHALL persist the canvas to the database immediately
6. WHEN a BMC or section canvas is displayed THEN the Stitch System SHALL render it in read-mostly mode without full editing controls

### Requirement 2

**User Story:** As a workflow designer, I want to add and configure nodes on the canvas, so that I can define the steps in my workflow.

#### Acceptance Criteria

1. WHEN a user clicks an "Add Node" button or uses a right-click context menu THEN the Stitch System SHALL display a node type selector
2. WHEN a user selects a node type THEN the Stitch System SHALL create a new node of that type on the canvas
3. WHEN a user selects a Worker node THEN the Stitch System SHALL display a configuration panel with webhook URL input and config fields
4. WHEN a user selects a UX node THEN the Stitch System SHALL display a configuration panel with prompt input and timeout settings
5. WHEN a user modifies node configuration THEN the Stitch System SHALL persist the changes to the canvas graph immediately
6. WHEN a user deletes a node THEN the Stitch System SHALL remove the node and all connected edges from the canvas

### Requirement 3

**User Story:** As a workflow designer, I want to connect nodes with edges, so that I can define the execution flow of my workflow.

#### Acceptance Criteria

1. WHEN a user drags from a node handle to another node THEN the Stitch System SHALL create a directional edge between the nodes
2. WHEN an edge is created THEN the Stitch System SHALL display the edge visually with an arrow showing direction
3. WHEN a user selects an edge and presses delete THEN the Stitch System SHALL remove the edge from the canvas
4. WHEN a user right-clicks an edge THEN the Stitch System SHALL display a context menu with a delete option
5. WHEN edges are modified THEN the Stitch System SHALL persist the changes to the canvas graph immediately

### Requirement 4

**User Story:** As a workflow manager, I want to import entities into my workflow, so that I can process customers and leads through the workflow.

#### Acceptance Criteria

1. WHEN a user clicks an "Import Entities" button THEN the Stitch System SHALL display an import source selector with CSV, Airtable, and Manual options
2. WHEN a user selects CSV upload THEN the Stitch System SHALL display a file upload interface with column mapping and preview
3. WHEN a user uploads a CSV file THEN the Stitch System SHALL parse the file and display a preview of entities to be created
4. WHEN a user confirms CSV import THEN the Stitch System SHALL create entities via POST to the Entities API with the mapped fields and place them at the selected entry node
5. WHEN a user selects Airtable import THEN the Stitch System SHALL display inputs for base ID, table name, and field mapping
6. WHEN a user confirms Airtable import THEN the Stitch System SHALL call the sync function and create entities from the Airtable data
7. WHEN a user selects Manual entry THEN the Stitch System SHALL display a form for entering name, email, company, and entity type
8. WHEN entities are imported THEN the Stitch System SHALL set the current_node_id to the selected entry node for all imported entities
9. WHEN the Entities API does not exist THEN the Stitch System SHALL provide GET, POST, PATCH, and DELETE endpoints for stitch_entities with appropriate RLS policies

### Requirement 5

**User Story:** As a workflow manager, I want to start workflow runs for entities, so that I can process them through the workflow steps.

#### Acceptance Criteria

1. WHEN a user selects an entity and clicks "Start Run" THEN the Stitch System SHALL call POST /api/flows/{flowId}/run with the entity_id to create a new run and begin workflow execution
2. WHEN a user selects multiple entities and clicks "Start Runs" THEN the Stitch System SHALL batch call the Run Start API for all selected entities with appropriate rate limiting
3. WHEN a run is started THEN the Stitch System SHALL display a run status indicator on the entity showing running, completed, or failed status
4. WHEN a user clicks on an entity with runs THEN the Stitch System SHALL display a run history panel showing all runs for that entity
5. WHEN a user clicks on a specific run THEN the Stitch System SHALL navigate to the run detail view showing node states and timeline
6. WHEN the Run Start API is called THEN the Stitch System SHALL use the existing workflow-api.md endpoint specification

### Requirement 6

**User Story:** As a workflow designer, I want to register external webhook functions, so that I can use them in Worker nodes without hardcoding URLs.

#### Acceptance Criteria

1. WHEN a user navigates to the Functions section THEN the Stitch System SHALL display a list of user-added registered functions with name, URL, and status
2. WHEN a user clicks "Add Function" THEN the Stitch System SHALL display a form with name, webhook URL, and config schema inputs
3. WHEN a user submits a new function THEN the Stitch System SHALL persist the function to the stitch_function_registry table with appropriate RLS policies and display it in the list
4. WHEN a user clicks "Test Function" on a registered function THEN the Stitch System SHALL send a test payload and display the response
5. WHEN a user creates a Worker node THEN the Stitch System SHALL allow selection of registered functions from the registry
6. WHEN built-in workers are needed THEN the Stitch System SHALL continue to use code-registered workers without requiring registry entries

### Requirement 7

**User Story:** As a workflow manager, I want to configure scheduled execution of workflows, so that entities can be processed automatically at specific times.

#### Acceptance Criteria

1. WHEN a user navigates to the Schedules section THEN the Stitch System SHALL display a list of configured schedules with cron expression, next run time, last run time, and enabled status
2. WHEN a user clicks "Add Schedule" THEN the Stitch System SHALL display a schedule configuration form with cron builder, target node, and limits
3. WHEN a user configures a schedule THEN the Stitch System SHALL persist the schedule configuration to the stitch_schedules table
4. WHEN a user toggles a schedule enabled/disabled THEN the Stitch System SHALL update the enabled field in stitch_schedules immediately
5. WHEN a schedule executes via Trigger.dev or cron THEN the Stitch System SHALL read configuration from stitch_schedules and start runs for entities at the target node respecting the configured limits
6. WHEN a schedule executes THEN the Stitch System SHALL update last_run_at and last_run_result in stitch_schedules with timestamp, entities processed, and any errors
7. WHEN the schedule list is displayed THEN the Stitch System SHALL show execution logs with recent run history and results

### Requirement 8

**User Story:** As a workflow manager, I want to configure webhooks from external services, so that external events can trigger workflow actions.

#### Acceptance Criteria

1. WHEN a user navigates to the Webhooks section THEN the Stitch System SHALL display a list of configured webhooks from stitch_webhook_configs with endpoint URL, source, last received time, and status
2. WHEN a user clicks "Add Webhook" THEN the Stitch System SHALL display a webhook configuration form with source, entity mapping, and target node
3. WHEN a webhook is created THEN the Stitch System SHALL persist the configuration to stitch_webhook_configs, generate a unique endpoint URL, and display it for the user to copy
4. WHEN a webhook is created THEN the Stitch System SHALL generate a secret key for signature validation and store it in stitch_webhook_configs
5. WHEN an external service sends data to the webhook endpoint THEN the Stitch System SHALL validate the signature using the stored secret key before processing
6. WHEN signature validation fails THEN the Stitch System SHALL reject the webhook event and log the failure
7. WHEN a webhook event is received and validated THEN the Stitch System SHALL map the payload fields to entity attributes and move the entity to the target node
8. WHEN webhook events are received THEN the Stitch System SHALL log the events with payload preview, processing status, and any errors

### Requirement 9

**User Story:** As a workflow manager, I want to configure email reply handling, so that customer responses can automatically complete UX nodes.

#### Acceptance Criteria

1. WHEN a user configures an email reply webhook THEN the Stitch System SHALL display provider-specific field mapping options for Resend, SendGrid, and Postmark
2. WHEN a user configures intent keywords THEN the Stitch System SHALL store keywords for "yes" and "no" intents with a default fallback
3. WHEN an email reply is received THEN the Stitch System SHALL validate the webhook signature before processing
4. WHEN an email reply is received and validated THEN the Stitch System SHALL parse the reply using the configured field mapping
5. WHEN an email reply is received THEN the Stitch System SHALL detect intent based on configured keywords
6. WHEN an email reply is received THEN the Stitch System SHALL find the most recent active run for the sender in running or waiting_for_user status for the target UX node
7. WHEN a matching active run is found THEN the Stitch System SHALL complete the target UX node with the detected intent
8. WHEN multiple active runs exist for the sender THEN the Stitch System SHALL complete only the most recent run to avoid completing the wrong run
9. WHEN a reply cannot be matched to an active run THEN the Stitch System SHALL log the event without failing

### Requirement 10

**User Story:** As a workflow analyst, I want to view entity lists with filtering and search, so that I can manage and monitor entities in the workflow.

#### Acceptance Criteria

1. WHEN a user opens the entity panel THEN the Stitch System SHALL use the useCanvasEntities hook to fetch and display a list of all entities in the current canvas
2. WHEN a user enters text in the search field THEN the Stitch System SHALL filter entities by name or email matching the search text
3. WHEN a user selects a node filter THEN the Stitch System SHALL display only entities currently at that node
4. WHEN a user selects an entity type filter THEN the Stitch System SHALL display only entities of that type (lead, customer, churned)
5. WHEN a user selects multiple entities THEN the Stitch System SHALL enable bulk actions for moving via PATCH to Entities API, deleting via DELETE to Entities API, or starting runs via Run Start API
6. WHEN a user clicks "Add Entity" THEN the Stitch System SHALL display a manual entry form for creating a new entity via POST to Entities API

### Requirement 11

**User Story:** As a workflow analyst, I want to view node outputs and run details, so that I can debug and understand workflow execution.

#### Acceptance Criteria

1. WHEN a user clicks a completed node in RunViewer THEN the Stitch System SHALL display the node output from run.node_states[nodeId].output in a formatted panel
2. WHEN node output is displayed THEN the Stitch System SHALL format JSON output with syntax highlighting and collapsible sections
3. WHEN a user clicks "Copy Output" THEN the Stitch System SHALL copy the output JSON to the clipboard
4. WHEN a user views output history THEN the Stitch System SHALL display outputs from multiple runs for comparison
5. WHEN output data is large THEN the Stitch System SHALL paginate or truncate the display with an option to view full output
6. WHEN extending RunViewer THEN the Stitch System SHALL add the output drawer without creating a new run view component

### Requirement 12

**User Story:** As a workflow analyst, I want to view entity journey timelines, so that I can track the complete path an entity has taken through the workflow.

#### Acceptance Criteria

1. WHEN a user selects an entity THEN the Stitch System SHALL query stitch_journey_events and display a journey timeline in the entity detail panel
2. WHEN the journey timeline is displayed THEN the Stitch System SHALL show events with timestamp, event type, node/edge, and metadata
3. WHEN a user clicks on a journey event THEN the Stitch System SHALL highlight the corresponding node or edge on the canvas via selection
4. WHEN a user views an entity on the canvas THEN the Stitch System SHALL optionally highlight the path the entity has taken using journey events
5. WHEN journey events are numerous THEN the Stitch System SHALL paginate the timeline with infinite scroll or load more

### Requirement 13

**User Story:** As a workflow manager, I want to view workflow metrics and dashboards, so that I can monitor performance and conversion rates.

#### Acceptance Criteria

1. WHEN a user opens the workflow dashboard THEN the Stitch System SHALL query stitch_entities to display total entity count and entities per node in a funnel view
2. WHEN the dashboard is displayed THEN the Stitch System SHALL derive conversion rates from stitch_journey_events to show conversion between sequential nodes
3. WHEN the dashboard is displayed THEN the Stitch System SHALL query stitch_runs to show today's activity including runs started, completed, and failed
4. WHEN a user selects a time range THEN the Stitch System SHALL display time-based charts showing entity flow over time derived from journey events
5. WHEN a user clicks "Export Data" THEN the Stitch System SHALL generate CSV files from stitch_entities, stitch_runs, or stitch_journey_events tables
