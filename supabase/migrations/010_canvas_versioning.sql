-- Migration 010: Canvas Versioning System
-- Implements versioning for stitch_flows to enable:
-- - Historical tracking of canvas changes
-- - Immutable snapshots of visual and execution graphs
-- - Linking runs to specific versions for reproducibility
-- Requirements: 9.1, 9.2, 9.3, 9.4, 9.5

-- ============================================================================
-- PART 1: Create stitch_flow_versions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL,
  
  -- Visual graph (for UI rendering with positions, styles, etc.)
  visual_graph JSONB NOT NULL,
  
  -- Execution graph (optimized for runtime, stripped of UI properties)
  execution_graph JSONB NOT NULL,
  
  -- Optional commit message for version tracking
  commit_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for flow_id with CASCADE behavior
-- When a flow is deleted, all its versions are deleted
ALTER TABLE stitch_flow_versions
ADD CONSTRAINT fk_stitch_flow_versions_flow
FOREIGN KEY (flow_id) 
REFERENCES stitch_flows(id) 
ON DELETE CASCADE;

-- Add index on flow_id for efficient version queries by flow
CREATE INDEX IF NOT EXISTS idx_flow_versions_flow_id 
ON stitch_flow_versions(flow_id);

-- Add index on created_at for efficient chronological ordering
CREATE INDEX IF NOT EXISTS idx_flow_versions_created_at 
ON stitch_flow_versions(created_at DESC);

-- ============================================================================
-- PART 2: Add current_version_id to stitch_flows
-- ============================================================================

-- Add current_version_id column to track the latest version
ALTER TABLE stitch_flows 
ADD COLUMN IF NOT EXISTS current_version_id UUID;

-- Add foreign key constraint for current_version_id
-- When a version is deleted, set current_version_id to NULL
ALTER TABLE stitch_flows
ADD CONSTRAINT fk_stitch_flows_current_version
FOREIGN KEY (current_version_id) 
REFERENCES stitch_flow_versions(id) 
ON DELETE SET NULL;

-- Add index on current_version_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stitch_flows_current_version_id 
ON stitch_flows(current_version_id);

-- ============================================================================
-- PART 3: Add flow_version_id to stitch_runs
-- ============================================================================

-- Add flow_version_id column to link runs to specific versions
ALTER TABLE stitch_runs 
ADD COLUMN IF NOT EXISTS flow_version_id UUID;

-- Add foreign key constraint for flow_version_id
-- When a version is deleted, set flow_version_id to NULL (preserve historical runs)
ALTER TABLE stitch_runs
ADD CONSTRAINT fk_stitch_runs_flow_version
FOREIGN KEY (flow_version_id) 
REFERENCES stitch_flow_versions(id) 
ON DELETE SET NULL;

-- Add index on flow_version_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_stitch_runs_flow_version_id 
ON stitch_runs(flow_version_id);

-- ============================================================================
-- PART 4: Enable Realtime publication for stitch_flow_versions
-- ============================================================================

-- Add stitch_flow_versions to the realtime publication for live version updates
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_flow_versions;

-- ============================================================================
-- PART 5: Row Level Security policies
-- ============================================================================

-- Enable RLS on stitch_flow_versions
ALTER TABLE stitch_flow_versions ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public Flow Versions" ON stitch_flow_versions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- PART 6: Add helpful comments
-- ============================================================================

COMMENT ON TABLE stitch_flow_versions IS 
'Immutable snapshots of flow canvases. Each version stores both the visual graph (for UI) and execution graph (for runtime).';

COMMENT ON COLUMN stitch_flow_versions.visual_graph IS 
'Complete React Flow JSON structure including UI properties (positions, styles, labels)';

COMMENT ON COLUMN stitch_flow_versions.execution_graph IS 
'Optimized graph for runtime execution with adjacency maps and stripped UI properties';

COMMENT ON COLUMN stitch_flows.current_version_id IS 
'Points to the most recently created version of this flow';

COMMENT ON COLUMN stitch_runs.flow_version_id IS 
'Links this run to the specific version that was executed, enabling historical reproducibility';
