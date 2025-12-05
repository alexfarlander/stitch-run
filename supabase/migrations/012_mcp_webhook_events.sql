-- Migration 012: MCP Webhook Events
-- Creates webhook events table for MCP-created nodes and uptime tracking
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
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add constraint to ensure processed_at is set when processed is true
  CONSTRAINT processed_at_required CHECK (
    (processed = FALSE AND processed_at IS NULL) OR
    (processed = TRUE AND processed_at IS NOT NULL)
  )
);

-- Add table and column comments
COMMENT ON TABLE stitch_mcp_webhook_events IS 
'Stores webhook events sent to MCP-created nodes. Events are processed asynchronously by the edge-walker. Consider implementing retention policy (e.g., 30 days).';

COMMENT ON COLUMN stitch_mcp_webhook_events.node_id IS 
'References a node ID in stitch_flows.graph JSONB structure. No FK constraint due to JSONB storage.';

COMMENT ON COLUMN stitch_mcp_webhook_events.payload IS 
'Webhook payload data to be passed to the node for processing';

COMMENT ON COLUMN stitch_mcp_webhook_events.processed_at IS 
'Timestamp when the event was successfully processed. Used for latency metrics.';

COMMENT ON COLUMN stitch_mcp_webhook_events.processing_error IS 
'Error message if processing failed. Useful for debugging and retry logic.';

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_node_id 
ON stitch_mcp_webhook_events(node_id);

CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_received_at 
ON stitch_mcp_webhook_events(received_at DESC);

-- Composite index for common query pattern: unprocessed events for a node
CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_node_processed 
ON stitch_mcp_webhook_events(node_id, processed, received_at DESC);

-- Partial index for unprocessed events (more efficient than full index)
CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_unprocessed 
ON stitch_mcp_webhook_events(received_at) 
WHERE processed = FALSE;

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE stitch_mcp_webhook_events ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public MCP Webhook Events" ON stitch_mcp_webhook_events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- PRODUCTION RLS POLICIES (uncomment when ready):
-- 
-- DROP POLICY IF EXISTS "Public MCP Webhook Events" ON stitch_mcp_webhook_events;
-- 
-- -- Only allow authenticated users to read webhook events
-- CREATE POLICY "Authenticated users can read webhook events" 
-- ON stitch_mcp_webhook_events 
-- FOR SELECT 
-- USING (auth.role() = 'authenticated');
-- 
-- -- Only allow service role to insert/update
-- CREATE POLICY "Service role can manage webhook events" 
-- ON stitch_mcp_webhook_events 
-- FOR ALL 
-- USING (auth.role() = 'service_role');

-- ============================================================================
-- Add table to Supabase realtime publication
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE stitch_mcp_webhook_events;

-- ============================================================================
-- Create stitch_node_uptime table
-- ============================================================================

-- Define status enum for type safety
DO $$ BEGIN
  CREATE TYPE node_status AS ENUM ('online', 'offline', 'degraded', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS stitch_node_uptime (
  node_id TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL,
  status node_status DEFAULT 'unknown',
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table and column comments
COMMENT ON TABLE stitch_node_uptime IS 
'Tracks last-seen timestamps and status for external nodes to monitor availability. Only stores current state; consider separate history table for trends.';

COMMENT ON COLUMN stitch_node_uptime.status IS 
'Current node status: online (responding), offline (not responding), degraded (slow/errors), unknown (never seen)';

-- Add index for efficient queries by last_seen
CREATE INDEX IF NOT EXISTS idx_node_uptime_last_seen 
ON stitch_node_uptime(last_seen DESC);

-- Add index for status queries (e.g., find all offline nodes)
CREATE INDEX IF NOT EXISTS idx_node_uptime_status 
ON stitch_node_uptime(status);

-- ============================================================================
-- Enable Row Level Security for uptime table
-- ============================================================================

ALTER TABLE stitch_node_uptime ENABLE ROW LEVEL SECURITY;

-- HACKATHON MODE: Allow public access for development
CREATE POLICY "Public Node Uptime" ON stitch_node_uptime 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- PRODUCTION RLS POLICIES (uncomment when ready):
-- 
-- DROP POLICY IF EXISTS "Public Node Uptime" ON stitch_node_uptime;
-- 
-- -- Allow authenticated users to read uptime data
-- CREATE POLICY "Authenticated users can read uptime" 
-- ON stitch_node_uptime 
-- FOR SELECT 
-- USING (auth.role() = 'authenticated');
-- 
-- -- Only service role can update uptime
-- CREATE POLICY "Service role can manage uptime" 
-- ON stitch_node_uptime 
-- FOR ALL 
-- USING (auth.role() = 'service_role');

-- ============================================================================
-- Add uptime table to Supabase realtime publication
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE stitch_node_uptime;

-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function to clean up old processed webhook events
CREATE OR REPLACE FUNCTION cleanup_old_mcp_webhook_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM stitch_mcp_webhook_events
  WHERE received_at < NOW() - (retention_days || ' days')::INTERVAL
  AND processed = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_mcp_webhook_events IS 
'Deletes processed webhook events older than specified retention period. Run periodically via cron or pg_cron.';

-- Function to mark stale nodes as offline
CREATE OR REPLACE FUNCTION mark_stale_nodes_offline(stale_threshold_minutes INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE stitch_node_uptime
  SET status = 'offline'::node_status,
      updated_at = NOW()
  WHERE last_seen < NOW() - (stale_threshold_minutes || ' minutes')::INTERVAL
  AND status != 'offline'::node_status;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_stale_nodes_offline IS 
'Marks nodes as offline if they haven''t been seen within the threshold. Run periodically via cron or pg_cron.';
