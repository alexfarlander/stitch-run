-- Migration 007: Add Missing Entity Fields
-- Adds email, destination_node_id, and completed_at to stitch_entities table

-- ============================================================================
-- PART 1: Add missing columns
-- ============================================================================

-- Add email field for entity identity
ALTER TABLE stitch_entities 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add destination_node_id to track where entity is heading (when on edge)
ALTER TABLE stitch_entities 
ADD COLUMN IF NOT EXISTS destination_node_id TEXT;

-- Add completed_at timestamp for when entity finishes journey
ALTER TABLE stitch_entities 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================================
-- PART 2: Add index for completed entities
-- ============================================================================

-- Add index on completed_at for efficient queries of completed journeys
CREATE INDEX IF NOT EXISTS idx_stitch_entities_completed_at 
ON stitch_entities(completed_at);

-- Add index on email for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stitch_entities_email 
ON stitch_entities(email);
