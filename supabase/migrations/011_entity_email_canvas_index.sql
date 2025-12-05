-- Migration 011: Add Composite Index for Entity Email Lookups
-- Adds composite index on (canvas_id, email) for efficient entity lookups within a canvas
-- This optimizes the webhook processor's find-or-create entity operations

-- ============================================================================
-- PART 1: Add composite index for canvas-scoped email lookups
-- ============================================================================

-- Add composite index on (canvas_id, email) for efficient lookups
-- This is more efficient than the single-column email index when querying
-- entities within a specific canvas context
CREATE INDEX IF NOT EXISTS idx_stitch_entities_canvas_email 
ON stitch_entities(canvas_id, email);

-- ============================================================================
-- NOTES
-- ============================================================================
-- This index optimizes queries like:
--   SELECT * FROM stitch_entities WHERE canvas_id = ? AND email = ?
-- 
-- The existing idx_stitch_entities_email index (from migration 007) is still
-- useful for global email lookups across all canvases, so we keep both.
