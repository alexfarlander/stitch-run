/**
 * Database operations for entity tracking and movement
 * Handles entity position updates, journey events, and queries
 */

import { getAdminClient } from '../supabase/client';
import { StitchEntity, JourneyEvent } from '@/types/stitch';

/**
 * Start an entity's journey on an edge
 * Sets entity position to edge with progress 0.0
 * Creates journey event with type 'edge_start'
 * Uses atomic RPC to ensure consistency
 * 
 * Requirements: 6.1, 6.2, 3.1
 * 
 * @param entityId - UUID of the entity
 * @param edgeId - ID of the edge to start on
 * @returns Updated entity
 * @throws Error if entity not found or edge invalid
 */
export async function startJourney(
  entityId: string,
  edgeId: string
): Promise<StitchEntity> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc('start_journey', {
    p_entity_id: entityId,
    p_edge_id: edgeId
  });

  if (error) {
    throw new Error(`Failed to start journey: ${error.message}`);
  }

  // RPC returns an array/set, grab the first one
  return (Array.isArray(data) ? data[0] : data) as StitchEntity;
}

/**
 * Update an entity's progress along an edge
 * Progress must be between 0.0 and 1.0
 * Optionally creates journey event for significant progress milestones
 * 
 * Requirements: 6.3, 6.4, 1.4
 * 
 * @param entityId - UUID of the entity
 * @param progress - Normalized progress value (0.0 to 1.0)
 * @returns Updated entity
 * @throws Error if entity not found or not on an edge
 */
export async function moveAlongEdge(
  entityId: string,
  progress: number
): Promise<StitchEntity> {
  const supabase = getAdminClient();

  // Validate progress is between 0.0 and 1.0
  if (progress < 0.0 || progress > 1.0) {
    throw new Error(`Progress must be between 0.0 and 1.0, got: ${progress}`);
  }

  // Validate entity exists and is on an edge
  const { data: entity, error: entityError } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (entityError || !entity) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  if (!entity.current_edge_id) {
    throw new Error('Entity is not on an edge, cannot update progress');
  }

  // Update entity progress
  const { data: updatedEntity, error: updateError } = await supabase
    .from('stitch_entities')
    .update({
      edge_progress: progress,
    })
    .eq('id', entityId)
    .select()
    .single();

  if (updateError || !updatedEntity) {
    throw new Error(`Failed to update entity progress: ${updateError?.message}`);
  }

  return updatedEntity as StitchEntity;
}

/**
 * Move an entity to a node (arrival)
 * Clears edge position fields
 * Sets current_node_id
 * Creates journey event with type 'node_arrival'
 * Uses atomic RPC to ensure consistency
 * 
 * Requirements: 6.5, 6.6, 2.5
 * 
 * @param entityId - UUID of the entity
 * @param nodeId - ID of the destination node
 * @returns Updated entity
 * @throws Error if entity not found or node invalid
 */
export async function arriveAtNode(
  entityId: string,
  nodeId: string
): Promise<StitchEntity> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc('arrive_at_node', {
    p_entity_id: entityId,
    p_node_id: nodeId
  });

  if (error) {
    throw new Error(`Failed to arrive at node: ${error.message}`);
  }

  // RPC returns an array/set, grab the first one
  return (Array.isArray(data) ? data[0] : data) as StitchEntity;
}

/**
 * Query all entities currently at a specific node
 * Scoped by canvas_id to prevent data leakage between canvases
 * 
 * Requirements: 2.3
 * 
 * @param canvasId - ID of the canvas to scope the query
 * @param nodeId - ID of the node
 * @returns Array of entities at the node within the specified canvas
 */
export async function getEntitiesAtNode(
  canvasId: string,
  nodeId: string
): Promise<StitchEntity[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('canvas_id', canvasId)
    .eq('current_node_id', nodeId);

  if (error) {
    throw new Error(`Failed to query entities at node: ${error.message}`);
  }

  return (data || []) as StitchEntity[];
}

/**
 * Query all entities currently on a specific edge
 * Scoped by canvas_id to prevent data leakage between canvases
 * 
 * Requirements: 2.4
 * 
 * @param canvasId - ID of the canvas to scope the query
 * @param edgeId - ID of the edge
 * @returns Array of entities on the edge with their progress values within the specified canvas
 */
export async function getEntitiesOnEdge(
  canvasId: string,
  edgeId: string
): Promise<StitchEntity[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('canvas_id', canvasId)
    .eq('current_edge_id', edgeId);

  if (error) {
    throw new Error(`Failed to query entities on edge: ${error.message}`);
  }

  return (data || []) as StitchEntity[];
}

/**
 * Get complete journey history for an entity
 * 
 * Requirements: 3.4
 * 
 * @param entityId - UUID of the entity
 * @returns Array of journey events ordered chronologically
 */
export async function getJourneyHistory(
  entityId: string
): Promise<JourneyEvent[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_journey_events')
    .select('*')
    .eq('entity_id', entityId)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to query journey history: ${error.message}`);
  }

  return (data || []) as JourneyEvent[];
}
