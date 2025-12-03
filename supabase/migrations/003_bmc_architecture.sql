-- Migration 003: BMC Architecture Support
-- Extends stitch_flows to support hierarchical canvas types (BMC vs Workflow)
-- Adds stitch_entities table for tracking customers/leads through the canvas

-- ============================================================================
-- PART 1: Extend stitch_flows table with canvas hierarchy support
-- ============================================================================

-- Add canvas_type column to distinguish between BMC and Workflow canvases
ALTER TABLE stitch_flows 
ADD COLUMN IF NOT EXISTS canvas_type TEXT DEFAULT 'workflow';

-- Add parent_id column to enable drill-down navigation (BMC -> Workflow)
ALTER TABLE stitch_flows 
ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Add foreign key constraint for parent_id with CASCADE behavior
-- When a parent is deleted, child flows have their parent_id set to NULL
ALTER TABLE stitch_flows
ADD CONSTRAINT fk_stitch_flows_parent
FOREIGN KEY (parent_id) 
REFERENCES stitch_flows(id) 
ON DELETE SET NULL;

-- Add index on parent_id for efficient hierarchy queries
CREATE INDEX IF NOT EXISTS idx_stitch_flows_parent_id ON stitch_flows(parent_id);

-- Add index on canvas_type for efficient filtering by type
CREATE INDEX IF NOT EXISTS idx_stitch_flows_canvas_type ON stitch_flows(canvas_type);

-- ============================================================================
-- PART 2: Create stitch_entities table for entity tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  entity_type TEXT NOT NULL,
  current_node_id TEXT,
  journey JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for canvas_id with CASCADE behavior
-- When a canvas is deleted, all associated entities are deleted
ALTER TABLE stitch_entities
ADD CONSTRAINT fk_stitch_entities_canvas
FOREIGN KEY (canvas_id) 
REFERENCES stitch_flows(id) 
ON DELETE CASCADE;

-- Add indexes for efficient entity queries
CREATE INDEX IF NOT EXISTS idx_stitch_entities_canvas_id ON stitch_entities(canvas_id);
CREATE INDEX IF NOT EXISTS idx_stitch_entities_entity_type ON stitch_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_stitch_entities_current_node_id ON stitch_entities(current_node_id);

-- ============================================================================
-- PART 3: Add trigger for automatic updated_at updates on stitch_entities
-- ============================================================================

-- Reuse the existing update_updated_at_column function
CREATE TRIGGER update_stitch_entities_updated_at
  BEFORE UPDATE ON stitch_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: Enable Realtime publication for stitch_entities
-- ============================================================================

-- Add stitch_entities to the realtime publication for live entity tracking
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_entities;

-- ============================================================================
-- PART 5: Row Level Security policies
-- ============================================================================

-- Enable RLS on stitch_entities
ALTER TABLE stitch_entities ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public Entities" ON stitch_entities 
FOR ALL 
USING (true) 
WITH CHECK (true);
