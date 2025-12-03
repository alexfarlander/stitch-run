-- Migration 005: Journey Events Table
-- Creates stitch_journey_events table for tracking entity movement history
-- Enables detailed analytics and journey reconstruction

-- ============================================================================
-- PART 1: Create stitch_journey_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  node_id TEXT,
  edge_id TEXT,
  progress NUMERIC(3,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraint with CASCADE delete
  -- When an entity is deleted, all its journey events are deleted
  CONSTRAINT fk_journey_events_entity
    FOREIGN KEY (entity_id) 
    REFERENCES stitch_entities(id) 
    ON DELETE CASCADE
);

-- ============================================================================
-- PART 2: Add indexes for efficient queries
-- ============================================================================

-- Index on entity_id for querying all events for a specific entity
CREATE INDEX IF NOT EXISTS idx_journey_events_entity_id 
ON stitch_journey_events(entity_id);

-- Index on timestamp for chronological ordering and time-based queries
CREATE INDEX IF NOT EXISTS idx_journey_events_timestamp 
ON stitch_journey_events(timestamp);

-- Index on event_type for filtering by event type
CREATE INDEX IF NOT EXISTS idx_journey_events_event_type 
ON stitch_journey_events(event_type);

-- Index on edge_id for querying events related to a specific edge
CREATE INDEX IF NOT EXISTS idx_journey_events_edge_id 
ON stitch_journey_events(edge_id);

-- Index on node_id for querying events related to a specific node
CREATE INDEX IF NOT EXISTS idx_journey_events_node_id 
ON stitch_journey_events(node_id);

-- ============================================================================
-- PART 3: Enable Supabase realtime publication
-- ============================================================================

-- Add stitch_journey_events to the realtime publication for live journey tracking
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_journey_events;

-- ============================================================================
-- PART 4: Row Level Security policies
-- ============================================================================

-- Enable RLS on stitch_journey_events
ALTER TABLE stitch_journey_events ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public Journey Events" ON stitch_journey_events 
FOR ALL 
USING (true) 
WITH CHECK (true);
