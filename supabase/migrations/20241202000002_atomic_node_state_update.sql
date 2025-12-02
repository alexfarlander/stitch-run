-- Atomic update function for node states to prevent race conditions
-- This ensures that concurrent worker callbacks don't overwrite each other's updates

CREATE OR REPLACE FUNCTION update_node_state(
  p_run_id UUID,
  p_node_id TEXT,
  p_status TEXT,
  p_output JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  flow_id UUID,
  node_states JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_node_payload JSONB;
BEGIN
  -- Construct the node state object
  -- Remove null fields to keep the JSONB clean
  v_node_payload := jsonb_build_object('status', p_status);
  
  IF p_output IS NOT NULL THEN
    v_node_payload := v_node_payload || jsonb_build_object('output', p_output);
  END IF;
  
  IF p_error IS NOT NULL THEN
    v_node_payload := v_node_payload || jsonb_build_object('error', p_error);
  END IF;

  -- Atomically update the specific node in the JSONB column
  -- This happens in a single database operation, preventing race conditions
  RETURN QUERY
  UPDATE stitch_runs AS sr
  SET 
    node_states = jsonb_set(
      sr.node_states, 
      array[p_node_id], 
      v_node_payload, 
      true -- create if missing (though it should exist from initialization)
    ),
    updated_at = NOW()
  WHERE sr.id = p_run_id
  RETURNING 
    sr.id,
    sr.flow_id,
    sr.node_states,
    sr.created_at,
    sr.updated_at;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION update_node_state TO authenticated, service_role, anon;
