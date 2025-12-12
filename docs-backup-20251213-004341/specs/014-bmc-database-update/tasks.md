# Implementation Plan

- [x] 1. Create database migration file
  - Create `stitch-run/supabase/migrations/003_bmc_architecture.sql`
  - Add ALTER TABLE statements for `canvas_type` and `parent_id` columns
  - Add CREATE TABLE statement for `stitch_entities`
  - Add foreign key constraints with CASCADE behavior
  - Add indexes for performance
  - Add trigger for automatic `updated_at` updates
  - Enable Realtime publication for `stitch_entities`
  - Add Row Level Security policies
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 4.1, 4.2_

- [ ]* 1.1 Write property test for canvas type default
  - **Property 1: Canvas type defaults to workflow**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for parent-child referential integrity
  - **Property 2: Parent-child referential integrity**
  - **Validates: Requirements 1.3**

- [ ]* 1.3 Write property test for orphaned children on parent deletion
  - **Property 3: Orphaned children on parent deletion**
  - **Validates: Requirements 1.4**

- [ ]* 1.4 Write property test for entity-canvas referential integrity
  - **Property 4: Entity-canvas referential integrity**
  - **Validates: Requirements 2.2**

- [ ]* 1.5 Write property test for entity cascade deletion
  - **Property 5: Entity cascade deletion**
  - **Validates: Requirements 2.3**

- [ ]* 1.6 Write property test for entity updated_at auto-update
  - **Property 6: Entity updated_at auto-update**
  - **Validates: Requirements 2.4**

- [x] 2. Update TypeScript type definitions
  - Update `stitch-run/src/types/stitch.ts`
  - Add `canvas_type` and `parent_id` fields to `StitchFlow` interface
  - Create `StitchEntity` interface with all required fields
  - Create `JourneyEntry` interface for journey JSONB structure
  - Create `SectionNode` interface extending `StitchNode`
  - Export new types
  - _Requirements: 2.1, 5.1_

- [x] 3. Create BMC seed script
  - Create `stitch-run/src/lib/seeds/default-bmc.ts`
  - Implement `generateBMCGraph()` function to create React Flow structure
  - Define 12 section nodes with correct labels and positions
  - Define edges connecting related sections
  - Implement `seedDefaultBMC()` function with idempotency check
  - Query for existing BMC before insertion
  - Insert BMC with `canvas_type = 'bmc'` and `parent_id = NULL`
  - Return canvas ID
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2_

- [x] 3.1 Write property test for BMC graph structure validity
  - **Property 7: BMC graph structure validity**
  - **Validates: Requirements 5.1, 5.7**

- [x] 3.2 Write property test for BMC section names completeness
  - **Property 8: BMC section names completeness**
  - **Validates: Requirements 5.3**

- [ ]* 3.3 Write property test for BMC node positioning
  - **Property 9: BMC node positioning**
  - **Validates: Requirements 5.2**

- [ ]* 3.4 Write property test for BMC canvas type and parent
  - **Property 10: BMC canvas type and parent**
  - **Validates: Requirements 5.5, 5.6**

- [x] 3.5 Write property test for seed script idempotence
  - **Property 11: Seed script idempotence**
  - **Validates: Requirements 6.1**

- [x] 4. Apply migration and run seed script
  - Apply migration using Supabase CLI or migration script
  - Run seed script to create default BMC
  - Verify BMC appears in database with correct structure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 4.1, 4.2, 5.5, 5.6_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
