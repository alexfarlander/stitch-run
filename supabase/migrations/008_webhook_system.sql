-- Migration 008: Webhook System
-- Adds webhook configuration and event logging tables
-- Extends stitch_runs with entity linking and trigger metadata

-- ============================================================================
-- PART 1: Create stitch_webhook_configs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  endpoint_slug TEXT NOT NULL UNIQUE,
  secret TEXT,
  workflow_id UUID NOT NULL,
  entry_edge_id TEXT NOT NULL,
  entity_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints with appropriate CASCADE behavior
ALTER TABLE stitch_webhook_configs
ADD CONSTRAINT fk_webhook_configs_canvas
FOREIGN KEY (canvas_id) 
REFERENCES stitch_flows(id) 
ON DELETE CASCADE;

ALTER TABLE stitch_webhook_configs
ADD CONSTRAINT fk_webhook_configs_workflow
FOREIGN KEY (workflow_id) 
REFERENCES stitch_flows(id) 
ON DELETE CASCADE;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_webhook_configs_endpoint_slug 
ON stitch_webhook_configs(endpoint_slug);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_canvas_id 
ON stitch_webhook_configs(canvas_id);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_workflow_id 
ON stitch_webhook_configs(workflow_id);

-- ============================================================================
-- PART 2: Create stitch_webhook_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  entity_id UUID,
  workflow_run_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  processed_at TIMESTAMPTZ
);

-- Add foreign key constraints with appropriate CASCADE/SET NULL behavior
ALTER TABLE stitch_webhook_events
ADD CONSTRAINT fk_webhook_events_config
FOREIGN KEY (webhook_config_id) 
REFERENCES stitch_webhook_configs(id) 
ON DELETE CASCADE;

ALTER TABLE stitch_webhook_events
ADD CONSTRAINT fk_webhook_events_entity
FOREIGN KEY (entity_id) 
REFERENCES stitch_entities(id) 
ON DELETE SET NULL;

ALTER TABLE stitch_webhook_events
ADD CONSTRAINT fk_webhook_events_run
FOREIGN KEY (workflow_run_id) 
REFERENCES stitch_runs(id) 
ON DELETE SET NULL;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_config_id 
ON stitch_webhook_events(webhook_config_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at 
ON stitch_webhook_events(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status 
ON stitch_webhook_events(status);

-- ============================================================================
-- PART 3: Extend stitch_runs table with entity and trigger tracking
-- ============================================================================

-- Add entity_id column to link runs to entities
ALTER TABLE stitch_runs 
ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Add trigger column to store trigger metadata
ALTER TABLE stitch_runs 
ADD COLUMN IF NOT EXISTS trigger JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add foreign key constraint for entity_id with SET NULL behavior
-- When an entity is deleted, runs preserve their history with entity_id set to NULL
ALTER TABLE stitch_runs
ADD CONSTRAINT fk_stitch_runs_entity
FOREIGN KEY (entity_id) 
REFERENCES stitch_entities(id) 
ON DELETE SET NULL;

-- Add index on entity_id for efficient entity-to-runs queries
CREATE INDEX IF NOT EXISTS idx_stitch_runs_entity_id 
ON stitch_runs(entity_id);

-- ============================================================================
-- PART 4: Add trigger for automatic updated_at updates on webhook_configs
-- ============================================================================

-- Reuse the existing update_updated_at_column function
CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON stitch_webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 5: Enable Row Level Security policies
-- ============================================================================

-- Enable RLS on webhook tables
ALTER TABLE stitch_webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stitch_webhook_events ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public Webhook Configs" ON stitch_webhook_configs 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Public Webhook Events" ON stitch_webhook_events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- PART 6: Add tables to Supabase realtime publication
-- ============================================================================

-- Add webhook tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_webhook_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_webhook_events;
