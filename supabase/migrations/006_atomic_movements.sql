-- Migration 006: Atomic Movement Functions
-- Wraps entity updates and event logging in transactions
-- Ensures data consistency by making update + insert atomic

-- ============================================================================
-- Function 1: Atomic Start Journey
-- ============================================================================

create or replace function start_journey(
  p_entity_id uuid,
  p_edge_id text
)
returns setof stitch_entities
language plpgsql
security definer -- Runs as admin to bypass RLS if needed
as $$
declare
  v_updated_entity stitch_entities;
begin
  -- 1. Update the entity (Clear node, Set edge)
  update stitch_entities
  set 
    current_edge_id = p_edge_id,
    edge_progress = 0.0,
    current_node_id = null,
    updated_at = now()
  where id = p_entity_id
  returning * into v_updated_entity;

  if not found then
    raise exception 'Entity not found: %', p_entity_id;
  end if;

  -- 2. Log the event
  insert into stitch_journey_events (entity_id, event_type, edge_id, progress)
  values (p_entity_id, 'edge_start', p_edge_id, 0.0);

  return next v_updated_entity;
end;
$$;

-- ============================================================================
-- Function 2: Atomic Arrive At Node
-- ============================================================================

create or replace function arrive_at_node(
  p_entity_id uuid,
  p_node_id text
)
returns setof stitch_entities
language plpgsql
security definer
as $$
declare
  v_updated_entity stitch_entities;
begin
  -- 1. Update the entity (Clear edge, Set node)
  update stitch_entities
  set 
    current_node_id = p_node_id,
    current_edge_id = null,
    edge_progress = null,
    updated_at = now()
  where id = p_entity_id
  returning * into v_updated_entity;

  if not found then
    raise exception 'Entity not found: %', p_entity_id;
  end if;

  -- 2. Log the event
  insert into stitch_journey_events (entity_id, event_type, node_id)
  values (p_entity_id, 'node_arrival', p_node_id);

  return next v_updated_entity;
end;
$$;
