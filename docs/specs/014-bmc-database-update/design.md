# Design Document

## Overview

This design extends the Stitch database schema to support a hierarchical Business Model Canvas (BMC) architecture. The system will distinguish between top-level BMC canvases and detailed workflow canvases through a `canvas_type` field, while a `parent_id` field enables drill-down navigation. A new `stitch_entities` table tracks individual customers/leads as they move through canvas sections, with real-time updates enabling live visualization of entity journeys.

The implementation consists of two main components:
1. A Supabase migration that extends the schema with canvas hierarchy and entity tracking
2. A TypeScript seed script that generates a default BMC with 12 standard sections in a custom grid layout

## Architecture

### Database Schema Extensions

The design extends the existing Stitch database schema with minimal changes to support the BMC architecture:

```
stitch_flows (extended)
├── id (UUID, PK) [existing]
├── name (TEXT) [existing]
├── graph (JSONB) [existing]
├── canvas_type (TEXT, default 'workflow') [NEW]
├── parent_id (UUID, FK -> stitch_flows.id, nullable) [NEW]
├── created_at (TIMESTAMPTZ) [existing]
└── updated_at (TIMESTAMPTZ) [existing]

stitch_entities (new table)
├── id (UUID, PK)
├── canvas_id (UUID, FK -> stitch_flows.id)
├── name (TEXT)
├── avatar_url (TEXT, nullable)
├── entity_type (TEXT)
├── current_node_id (TEXT, nullable)
├── journey (JSONB)
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### Canvas Hierarchy Model

The `canvas_type` field distinguishes between:
- **'bmc'**: Top-level Business Model Canvas with 12 section nodes
- **'workflow'**: Detailed process flows with Worker, UX, Splitter, and Collector nodes

The `parent_id` creates a tree structure:
- BMC canvases have `parent_id = NULL`
- Workflow canvases can reference a parent BMC via `parent_id`
- This enables drill-down navigation from BMC sections to detailed workflows

### Entity Tracking Model

Entities represent individuals (customers, leads) moving through the canvas:
- **canvas_id**: Links entity to a specific BMC canvas
- **current_node_id**: Tracks which section/node the entity is currently in
- **journey**: JSONB array storing historical movement through sections
- **metadata**: JSONB object for extensible custom properties
- **entity_type**: Categorizes entities (e.g., 'customer', 'lead', 'prospect')

## Components and Interfaces

### Migration File: `003_bmc_architecture.sql`

Located at: `stitch-run/supabase/migrations/003_bmc_architecture.sql`

This migration file contains:
1. ALTER TABLE statements to add `canvas_type` and `parent_id` to `stitch_flows`
2. CREATE TABLE statement for `stitch_entities`
3. Foreign key constraints with appropriate CASCADE behavior
4. Indexes for query performance
5. Trigger setup for automatic `updated_at` timestamps
6. Realtime publication configuration
7. Row Level Security policies

### Seed Script: `default-bmc.ts`

Located at: `stitch-run/src/lib/seeds/default-bmc.ts`

This TypeScript module exports:
- **`generateBMCGraph()`**: Creates the React Flow graph structure
- **`seedDefaultBMC()`**: Main function that checks for existing BMC and inserts if needed

The script uses the Supabase client to interact with the database and returns the BMC canvas ID.

### BMC Grid Layout

The 12 sections are positioned in a custom "Frankenstein" layout with three categories:

**Production (Left Column)**
- Data (Production) - Position: (100, 100)
- People (Production) - Position: (100, 300)
- Integrations (Production) - Position: (100, 500)
- Code (Production) - Position: (100, 700)

**Customer (Middle Column)**
- Offers (Customer) - Position: (400, 100)
- Sales (Customer) - Position: (400, 300)
- Marketing (Customer) - Position: (400, 500)
- Products (Customer) - Position: (400, 700)
- Support (Customer) - Position: (400, 900)
- Recommendations (Customer) - Position: (400, 1100)

**Financial (Right Column)**
- Costs (Financial) - Position: (700, 100)
- Revenue (Financial) - Position: (700, 300)

## Data Models

### Extended StitchFlow Type

```typescript
export interface StitchFlow {
  id: string;
  name: string;
  graph: {
    nodes: StitchNode[];
    edges: StitchEdge[];
  };
  canvas_type: 'bmc' | 'workflow';  // NEW
  parent_id: string | null;          // NEW
  created_at: string;
  updated_at: string;
}
```

### StitchEntity Type

```typescript
export interface StitchEntity {
  id: string;
  canvas_id: string;
  name: string;
  avatar_url: string | null;
  entity_type: string;
  current_node_id: string | null;
  journey: JourneyEntry[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface JourneyEntry {
  node_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

### Section Node Type

```typescript
export interface SectionNode extends StitchNode {
  type: 'section';
  data: {
    label: string;
    category: 'Production' | 'Customer' | 'Financial';
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Canvas type defaults to workflow

*For any* new flow inserted without specifying `canvas_type`, the database should automatically set `canvas_type` to 'workflow'
**Validates: Requirements 1.1**

### Property 2: Parent-child referential integrity

*For any* flow with a non-null `parent_id`, querying the parent flow by that ID should return a valid flow record
**Validates: Requirements 1.3**

### Property 3: Orphaned children on parent deletion

*For any* flow that is deleted, all child flows referencing it as `parent_id` should have their `parent_id` set to NULL
**Validates: Requirements 1.4**

### Property 4: Entity-canvas referential integrity

*For any* entity with a `canvas_id`, querying the canvas by that ID should return a valid canvas record
**Validates: Requirements 2.2**

### Property 5: Entity cascade deletion

*For any* canvas that is deleted, all entities with `canvas_id` matching that canvas should be deleted
**Validates: Requirements 2.3**

### Property 6: Entity updated_at auto-update

*For any* entity record that is updated, the `updated_at` timestamp should be greater than the previous `updated_at` value
**Validates: Requirements 2.4**

### Property 7: BMC graph structure validity

*For any* BMC graph generated by the seed script, it should contain exactly 12 nodes with type 'section' and valid React Flow structure
**Validates: Requirements 5.1, 5.7**

### Property 8: BMC section names completeness

*For any* BMC graph generated by the seed script, the set of node labels should exactly match the 12 standard section names
**Validates: Requirements 5.3**

### Property 9: BMC node positioning

*For any* BMC graph generated by the seed script, each node should be positioned at the expected coordinates for its section name
**Validates: Requirements 5.2**

### Property 10: BMC canvas type and parent

*For any* BMC inserted by the seed script, the canvas should have `canvas_type` set to 'bmc' and `parent_id` set to NULL
**Validates: Requirements 5.5, 5.6**

### Property 11: Seed script idempotence

*For any* execution of the seed script when a BMC already exists, the script should return the existing BMC ID without creating a duplicate
**Validates: Requirements 6.1**

## Error Handling

### Migration Errors

- **Column already exists**: Migration should use `IF NOT EXISTS` or check for column existence before adding
- **Foreign key violation**: Migration should ensure parent table exists before creating foreign keys
- **Index creation failure**: Migration should handle cases where indexes already exist

### Seed Script Errors

- **Database connection failure**: Script should throw descriptive error with connection details
- **Duplicate BMC detection failure**: Script should handle query errors gracefully
- **Insert failure**: Script should provide clear error message with validation details
- **Invalid graph structure**: Script should validate graph before insertion

### Runtime Errors

- **Invalid canvas_type value**: Application should validate canvas_type is either 'bmc' or 'workflow'
- **Circular parent references**: Application should prevent setting parent_id to create cycles
- **Entity without canvas**: Application should validate canvas_id exists before creating entity
- **Invalid journey JSONB**: Application should validate journey structure before updates

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

- Test that default canvas_type is 'workflow' when not specified
- Test that parent_id can be NULL
- Test that entity creation requires valid canvas_id
- Test that BMC graph has exactly 12 nodes
- Test that all 12 section names are present and correct
- Test seed script returns existing BMC ID when one exists

### Property-Based Tests

Property-based tests will use **fast-check** (TypeScript property testing library) to verify universal properties across many inputs:

Each property-based test should run a minimum of 100 iterations to ensure thorough coverage.

**Property Test 1: Canvas type defaults to workflow**
- Generate random flow data without canvas_type
- Insert into database
- Verify canvas_type is 'workflow'
- **Feature: bmc-database-update, Property 1: Canvas type defaults to workflow**

**Property Test 2: Parent-child referential integrity**
- Generate random parent flow
- Generate random child flow with parent_id
- Insert both
- Verify child's parent_id references valid parent
- **Feature: bmc-database-update, Property 2: Parent-child referential integrity**

**Property Test 3: Orphaned children on parent deletion**
- Generate random parent flow with multiple children
- Delete parent
- Verify all children have parent_id = NULL
- **Feature: bmc-database-update, Property 3: Orphaned children on parent deletion**

**Property Test 4: Entity-canvas referential integrity**
- Generate random canvas
- Generate random entity with canvas_id
- Insert both
- Verify entity's canvas_id references valid canvas
- **Feature: bmc-database-update, Property 4: Entity-canvas referential integrity**

**Property Test 5: Entity cascade deletion**
- Generate random canvas with multiple entities
- Delete canvas
- Verify all entities are deleted
- **Feature: bmc-database-update, Property 5: Entity cascade deletion**

**Property Test 6: Entity updated_at auto-update**
- Generate random entity
- Update entity fields
- Verify updated_at is greater than original
- **Feature: bmc-database-update, Property 6: Entity updated_at auto-update**

**Property Test 7: BMC graph structure validity**
- Generate BMC graph using seed script
- Verify node count is 12
- Verify all nodes have type 'section'
- Verify React Flow structure is valid
- **Feature: bmc-database-update, Property 7: BMC graph structure validity**

**Property Test 8: BMC section names completeness**
- Generate BMC graph using seed script
- Extract all node labels
- Verify set equals expected 12 section names
- **Feature: bmc-database-update, Property 8: BMC section names completeness**

**Property Test 9: BMC node positioning**
- Generate BMC graph using seed script
- For each node, verify position matches expected coordinates
- **Feature: bmc-database-update, Property 9: BMC node positioning**

**Property Test 10: BMC canvas type and parent**
- Run seed script
- Query inserted BMC
- Verify canvas_type is 'bmc' and parent_id is NULL
- **Feature: bmc-database-update, Property 10: BMC canvas type and parent**

**Property Test 11: Seed script idempotence**
- Run seed script multiple times
- Verify only one BMC exists
- Verify same ID returned each time
- **Feature: bmc-database-update, Property 11: Seed script idempotence**

### Integration Tests

Integration tests will verify the complete flow:

- Test migration can be applied to clean database
- Test migration can be applied to database with existing data
- Test seed script can run after migration
- Test entities can be created and tracked through canvas
- Test Realtime updates are broadcast for entity changes
- Test UI can render BMC canvas from seeded data
