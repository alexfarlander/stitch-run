-- Migration 012: MCP Webhook Events
-- Creates a simple webhook events table for MCP-created nodes
-- This is separate from the existing webhook system (migration 008)
-- and is designed for external assets to send events to specific nodes

-- ============================================================================
-- Create stitch_mcp_webhook_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_mcp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_node_id 
ON stitch_mcp_webhook_events(node_id);

CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_received_at 
ON stitch_mcp_webhook_events(received_at DESC);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE stitch_mcp_webhook_events ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public MCP Webhook Events" ON stitch_mcp_webhook_events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- Add table to Supabase realtime publication
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE stitch_mcp_webhook_events;

-- ============================================================================
-- Create stitch_node_uptime table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_node_uptime (
  node_id TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL,
  status TEXT,
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for efficient queries by last_seen
CREATE INDEX IF NOT EXISTS idx_node_uptime_last_seen 
ON stitch_node_uptime(last_seen DESC);

-- ============================================================================
-- Enable Row Level Security for uptime table
-- ============================================================================

ALTER TABLE stitch_node_uptime ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public Node Uptime" ON stitch_node_uptime 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- Add uptime table to Supabase realtime publication
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE stitch_node_uptime;
