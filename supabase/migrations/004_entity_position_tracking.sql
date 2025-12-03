-- Migration 004: Entity Position Tracking
-- Adds edge position tracking to stitch_entities table
-- Enables tracking entities at nodes OR on edges with progress

-- ============================================================================
-- PART 1: Add edge position tracking columns to stitch_entities
-- ============================================================================

-- Add current_edge_id to track which edge an entity is traveling on
ALTER TABLE stitch_entities 
ADD COLUMN IF NOT EXISTS current_edge_id TEXT;

-- Add edge_progress to track position along edge (0.0 to 1.0)
ALTER TABLE stitch_entities 
ADD COLUMN IF NOT EXISTS edge_progress NUMERIC(3,2);

-- ============================================================================
-- PART 2: Add constraints for data integrity
-- ============================================================================

-- Ensure progress is between 0.0 and 1.0 when set
ALTER TABLE stitch_entities
ADD CONSTRAINT check_edge_progress_range 
CHECK (edge_progress IS NULL OR (edge_progress >= 0.0 AND edge_progress <= 1.0));

-- Ensure position is either node OR edge, not both (mutual exclusivity)
-- Valid states:
--   1. At node: current_node_id IS NOT NULL, current_edge_id IS NULL, edge_progress IS NULL
--   2. On edge: current_node_id IS NULL, current_edge_id IS NOT NULL, edge_progress IS NOT NULL
--   3. Unpositioned: all three are NULL
ALTER TABLE stitch_entities
ADD CONSTRAINT check_position_exclusivity
CHECK (
  (current_node_id IS NOT NULL AND current_edge_id IS NULL AND edge_progress IS NULL) OR
  (current_node_id IS NULL AND current_edge_id IS NOT NULL AND edge_progress IS NOT NULL) OR
  (current_node_id IS NULL AND current_edge_id IS NULL AND edge_progress IS NULL)
);

-- ============================================================================
-- PART 3: Add index for efficient edge queries
-- ============================================================================

-- Add index on current_edge_id for efficient queries of entities on an edge
CREATE INDEX IF NOT EXISTS idx_stitch_entities_current_edge_id 
ON stitch_entities(current_edge_id);
