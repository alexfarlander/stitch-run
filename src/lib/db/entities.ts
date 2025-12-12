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

/**
 * Create a journey event for entity movement
 * Records entity movement through the workflow for analytics and tracking
 * 
 * @param entityId - UUID of the entity
 * @param eventType - Type of journey event
 * @param nodeId - Optional node ID for node-related events
 * @param edgeId - Optional edge ID for edge-related events
 * @param progress - Optional progress value for edge progress events
 * @param metadata - Optional additional metadata
 * @returns Created journey event
 */
export async function createJourneyEvent(
  entityId: string,
  eventType: 'edge_start' | 'edge_progress' | 'node_arrival' | 'node_complete' | 'manual_move',
  nodeId?: string | null,
  edgeId?: string | null,
  progress?: number | null,
  metadata?: Record<string, unknown>
): Promise<JourneyEvent> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_journey_events')
    .insert({
      entity_id: entityId,
      event_type: eventType,
      node_id: nodeId || null,
      edge_id: edgeId || null,
      progress: progress || null,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create journey event: ${error?.message}`);
  }

  return data as JourneyEvent;
}

/**
 * Move entity to a target section (for worker node entity movement)
 * Updates entity's current_node_id and creates a journey event
 * 
 * Requirements: 5.3, 5.4
 * 
 * @param entityId - UUID of the entity
 * @param targetSectionId - ID of the target section node
 * @param completeAs - How to mark the completion (success, failure, neutral)
 * @param metadata - Optional metadata about the movement
 * @param setEntityType - Optional: Convert entity type (e.g., lead → customer)
 * @returns Updated entity
 */
export async function moveEntityToSection(
  entityId: string,
  targetSectionId: string,
  completeAs: 'success' | 'failure' | 'neutral',
  metadata?: Record<string, unknown>,
  setEntityType?: 'customer' | 'churned' | 'lead'
): Promise<StitchEntity> {
  const supabase = getAdminClient();

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    current_node_id: targetSectionId,
    current_edge_id: null,
    edge_progress: null,
  };

  // Add entity_type conversion if specified
  if (setEntityType) {
    updatePayload.entity_type = setEntityType;
  }

  // Update entity's current_node_id to target section
  const { data: updatedEntity, error: updateError } = await supabase
    .from('stitch_entities')
    .update(updatePayload)
    .eq('id', entityId)
    .select()
    .single();

  if (updateError || !updatedEntity) {
    throw new Error(`Failed to move entity to section: ${updateError?.message}`);
  }

  // Create journey event for the movement
  await createJourneyEvent(
    entityId,
    'node_arrival',
    targetSectionId,
    null,
    null,
    {
      ...metadata,
      completion_status: completeAs,
      movement_type: 'worker_entity_movement',
      entity_type_changed: setEntityType ? { to: setEntityType } : undefined,
    }
  );

  return updatedEntity as StitchEntity;
}
