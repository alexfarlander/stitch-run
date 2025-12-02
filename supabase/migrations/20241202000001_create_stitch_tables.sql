-- Create stitch_flows table
CREATE TABLE IF NOT EXISTS stitch_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  graph JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stitch_runs table
CREATE TABLE IF NOT EXISTS stitch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  node_states JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stitch_runs_flow_id ON stitch_runs(flow_id);
CREATE INDEX IF NOT EXISTS idx_stitch_flows_created_at ON stitch_flows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stitch_runs_created_at ON stitch_runs(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updated_at updates
CREATE TRIGGER update_stitch_flows_updated_at
  BEFORE UPDATE ON stitch_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stitch_runs_updated_at
  BEFORE UPDATE ON stitch_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CRITICAL: Add tables to the realtime publication so the Canvas updates live
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_runs;

-- HACKATHON MODE: Enable RLS but allow public access (or disable RLS entirely)
-- This prevents "Permission Denied" errors during development
ALTER TABLE stitch_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE stitch_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Flows" ON stitch_flows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Runs" ON stitch_runs FOR ALL USING (true) WITH CHECK (true);