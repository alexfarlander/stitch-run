-- Atomic bulk update function for node states
-- Merges a dictionary of node updates into the existing node_states JSONB
CREATE OR REPLACE FUNCTION update_node_states(
  p_run_id UUID,
  p_updates JSONB
)
RETURNS TABLE(
  id UUID,
  flow_id UUID,
  flow_version_id UUID,
  entity_id UUID,
  node_states JSONB,
  trigger JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atomically merge the updates into node_states
  -- The || operator on JSONB performs a top-level merge
  -- Since p_updates is a map of nodeId -> NodeState, this updates those specific keys
  -- without overwriting other nodes.
  RETURN QUERY
  UPDATE stitch_runs AS sr
  SET
    node_states = sr.node_states || p_updates,
    updated_at = NOW()
  WHERE sr.id = p_run_id
  RETURNING
    sr.id,
    sr.flow_id,
    sr.flow_version_id,
    sr.entity_id,
    sr.node_states,
    sr.trigger,
    sr.created_at,
    sr.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION update_node_states TO authenticated, service_role, anon;
