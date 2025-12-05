-- Migration 013: Enhance MCP Webhook Events
-- Adds observability, type safety, and maintenance features to existing tables
-- This migration enhances the tables created in migration 012

-- ============================================================================
-- Enhance stitch_mcp_webhook_events table
-- ============================================================================

-- Add new columns for observability and error tracking
ALTER TABLE stitch_mcp_webhook_events 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add constraint to ensure processed_at is set when processed is true
ALTER TABLE stitch_mcp_webhook_events 
DROP CONSTRAINT IF EXISTS processed_at_required;

ALTER TABLE stitch_mcp_webhook_events 
ADD CONSTRAINT processed_at_required CHECK (
  (processed = FALSE AND processed_at IS NULL) OR
  (processed = TRUE AND processed_at IS NOT NULL)
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

COMMENT ON COLUMN stitch_mcp_webhook_events.retry_count IS 
'Number of times processing has been retried. Used for exponential backoff logic.';

-- Add new indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_node_processed 
ON stitch_mcp_webhook_events(node_id, processed, received_at DESC);

-- Partial index for unprocessed events (more efficient than full index)
CREATE INDEX IF NOT EXISTS idx_mcp_webhook_events_unprocessed 
ON stitch_mcp_webhook_events(received_at) 
WHERE processed = FALSE;

-- ============================================================================
-- Enhance stitch_node_uptime table with type safety
-- ============================================================================

-- Create status enum for type safety
DO $$ BEGIN
  CREATE TYPE node_status AS ENUM ('online', 'offline', 'degraded', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Migrate existing status values to enum
-- First, set any NULL or invalid values to 'unknown'
UPDATE stitch_node_uptime 
SET status = 'unknown' 
WHERE status IS NULL 
   OR status NOT IN ('online', 'offline', 'degraded', 'unknown');

-- Convert column to enum type
ALTER TABLE stitch_node_uptime 
ALTER COLUMN status TYPE node_status 
USING CASE 
  WHEN status = 'online' THEN 'online'::node_status
  WHEN status = 'offline' THEN 'offline'::node_status
  WHEN status = 'degraded' THEN 'degraded'::node_status
  ELSE 'unknown'::node_status
END;

-- Set default value
ALTER TABLE stitch_node_uptime 
ALTER COLUMN status SET DEFAULT 'unknown'::node_status;

-- Add table and column comments
COMMENT ON TABLE stitch_node_uptime IS 
'Tracks last-seen timestamps and status for external nodes to monitor availability. Only stores current state; consider separate history table for trends.';

COMMENT ON COLUMN stitch_node_uptime.status IS 
'Current node status: online (responding), offline (not responding), degraded (slow/errors), unknown (never seen)';

-- Add index for status queries (e.g., find all offline nodes)
CREATE INDEX IF NOT EXISTS idx_node_uptime_status 
ON stitch_node_uptime(status);

-- ============================================================================
-- Add production RLS policies (commented out for hackathon mode)
-- ============================================================================

-- PRODUCTION RLS POLICIES for stitch_mcp_webhook_events (uncomment when ready):
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

-- PRODUCTION RLS POLICIES for stitch_node_uptime (uncomment when ready):
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
'Deletes processed webhook events older than specified retention period. Run periodically via cron or pg_cron. Example: SELECT cleanup_old_mcp_webhook_events(30);';

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
'Marks nodes as offline if they haven''t been seen within the threshold. Run periodically via cron or pg_cron. Example: SELECT mark_stale_nodes_offline(5);';

-- Function to get webhook processing metrics
CREATE OR REPLACE FUNCTION get_webhook_processing_metrics(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
  total_events BIGINT,
  processed_events BIGINT,
  failed_events BIGINT,
  pending_events BIGINT,
  avg_processing_time_seconds NUMERIC,
  max_processing_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_events,
    COUNT(*) FILTER (WHERE processed = TRUE AND processing_error IS NULL)::BIGINT as processed_events,
    COUNT(*) FILTER (WHERE processed = TRUE AND processing_error IS NOT NULL)::BIGINT as failed_events,
    COUNT(*) FILTER (WHERE processed = FALSE)::BIGINT as pending_events,
    ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) FILTER (WHERE processed_at IS NOT NULL), 2) as avg_processing_time_seconds,
    ROUND(MAX(EXTRACT(EPOCH FROM (processed_at - received_at))) FILTER (WHERE processed_at IS NOT NULL), 2) as max_processing_time_seconds
  FROM stitch_mcp_webhook_events
  WHERE received_at > NOW() - (hours_back || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_webhook_processing_metrics IS 
'Returns webhook processing metrics for the specified time period. Example: SELECT * FROM get_webhook_processing_metrics(24);';
