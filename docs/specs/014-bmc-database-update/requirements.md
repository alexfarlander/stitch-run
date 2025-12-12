# Requirements Document

## Introduction

This specification defines the database schema updates and seed data generation required to support the Business Model Canvas (BMC) architecture in Stitch. The BMC is a "Living Business Model Canvas" that serves as the top-level view of the system, with 12 standard sections (Marketing, Sales, Data, Revenue, etc.) that can drill down into detailed workflows. This feature extends the existing `stitch_flows` table to support hierarchical canvas types and introduces entity tracking to monitor customers/leads as they move through the canvas.

## Glossary

- **BMC (Business Model Canvas)**: A strategic management template with 12 standard sections representing different aspects of a business
- **Canvas**: A visual workspace that can be either a BMC (top-level) or a Workflow (detailed process)
- **Entity**: A tracked individual (customer, lead, etc.) that moves through the canvas sections
- **Workflow**: A detailed process flow represented as a graph of nodes and edges
- **Section**: One of the 12 standard areas in a BMC (e.g., Marketing, Sales, Data)
- **Stitch System**: The orchestration engine that executes workflows and tracks entities
- **Migration**: A database schema change script executed by Supabase
- **Seed Script**: A TypeScript module that generates and inserts initial data into the database
- **React Flow**: The library used to render and interact with canvas graphs
- **Journey**: The historical record of an entity's movement through canvas sections

## Requirements

### Requirement 1

**User Story:** As a system architect, I want to extend the database schema to support hierarchical canvas types, so that the system can distinguish between BMC canvases and workflow canvases.

#### Acceptance Criteria

1. WHEN the migration is applied THEN the Stitch System SHALL add a `canvas_type` column to the `stitch_flows` table with TEXT type and default value 'workflow'
2. WHEN the migration is applied THEN the Stitch System SHALL add a `parent_id` column to the `stitch_flows` table with UUID type allowing NULL values
3. WHEN a flow references a parent THEN the Stitch System SHALL enforce referential integrity through a foreign key constraint from `parent_id` to `stitch_flows.id`
4. WHEN a parent flow is deleted THEN the Stitch System SHALL set child flow `parent_id` values to NULL through CASCADE behavior

### Requirement 2

**User Story:** As a system architect, I want to create an entities table to track customers and leads, so that the system can monitor individual journeys through the canvas.

#### Acceptance Criteria

1. WHEN the migration is applied THEN the Stitch System SHALL create a `stitch_entities` table with columns: id (UUID primary key), canvas_id (UUID), name (TEXT), avatar_url (TEXT nullable), entity_type (TEXT), current_node_id (TEXT nullable), journey (JSONB), metadata (JSONB), created_at (TIMESTAMPTZ), and updated_at (TIMESTAMPTZ)
2. WHEN an entity references a canvas THEN the Stitch System SHALL enforce referential integrity through a foreign key constraint from `canvas_id` to `stitch_flows.id`
3. WHEN a canvas is deleted THEN the Stitch System SHALL delete all associated entities through CASCADE behavior
4. WHEN an entity record is updated THEN the Stitch System SHALL automatically update the `updated_at` timestamp
5. WHEN the migration is applied THEN the Stitch System SHALL create an index on `canvas_id` for efficient entity queries by canvas
6. WHEN the migration is applied THEN the Stitch System SHALL create an index on `entity_type` for efficient entity queries by type

### Requirement 3

**User Story:** As a frontend developer, I want real-time updates for entity movements, so that the UI can display live entity tracking across the canvas.

#### Acceptance Criteria

1. WHEN the migration is applied THEN the Stitch System SHALL enable Supabase Realtime replication for the `stitch_entities` table
2. WHEN an entity is created, updated, or deleted THEN the Stitch System SHALL broadcast the change to all subscribed clients through Realtime

### Requirement 4

**User Story:** As a system administrator, I want appropriate security policies for the entities table, so that data access is controlled during development.

#### Acceptance Criteria

1. WHEN the migration is applied THEN the Stitch System SHALL enable Row Level Security on the `stitch_entities` table
2. WHEN any user attempts to access entities THEN the Stitch System SHALL allow all operations through a public access policy for development purposes

### Requirement 5

**User Story:** As a system developer, I want a seed script that generates a default BMC canvas, so that the system has a valid starting point with the 12 standard sections.

#### Acceptance Criteria

1. WHEN the seed script executes THEN the Stitch System SHALL create a React Flow graph with exactly 12 nodes of type 'section'
2. WHEN the seed script creates nodes THEN the Stitch System SHALL position them in a custom grid layout representing the standard BMC structure
3. WHEN the seed script creates nodes THEN the Stitch System SHALL label each node with one of the 12 standard BMC section names: Data, People, Offers, Sales, Marketing, Integrations, Code, Products, Support, Recommendations, Costs, and Revenue
4. WHEN the seed script creates the graph THEN the Stitch System SHALL include appropriate edges connecting related sections
5. WHEN the seed script completes THEN the Stitch System SHALL insert the BMC graph as a row in `stitch_flows` with `canvas_type` set to 'bmc'
6. WHEN the seed script inserts the BMC THEN the Stitch System SHALL set the `parent_id` to NULL indicating it is a top-level canvas
7. WHEN the seed script generates the graph THEN the Stitch System SHALL produce valid React Flow JSON that can be rendered without errors

### Requirement 6

**User Story:** As a developer, I want the seed script to be idempotent, so that running it multiple times does not create duplicate BMC canvases.

#### Acceptance Criteria

1. WHEN the seed script executes and a BMC canvas already exists THEN the Stitch System SHALL skip creation and return the existing canvas ID
2. WHEN the seed script checks for existing BMC THEN the Stitch System SHALL query for flows where `canvas_type` equals 'bmc' and `name` matches the default BMC name
