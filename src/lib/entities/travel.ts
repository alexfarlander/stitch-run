import { animate } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

interface TravelConfig {
  entityId: string;
  edgeId: string;
  destinationNodeId: string;
  duration?: number; // seconds, default 2
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

/**
 * Animate entity traveling from current position to destination node
 */
export async function animateEntityTravel({
  entityId,
  edgeId,
  destinationNodeId,
  duration = 2,
  onProgress,
  onComplete
}: TravelConfig): Promise<void> {
  // Start the animation
  await animate(0, 1, {
    duration,
    ease: 'easeInOut',
    onUpdate: (progress) => {
      // Update local state for smooth animation
      onProgress?.(progress);
    },
    onComplete: async () => {
      // Animation finished, update database
      await arriveAtNode(entityId, destinationNodeId);
      onComplete?.();
    }
  });
}

/**
 * Start entity traveling on an edge (called by workflow completion)
 */
export async function startEntityTravel(
  entityId: string,
  edgeId: string,
  destinationNodeId: string
): Promise<void> {
  const { error } = await supabase
    .from('stitch_entities')
    .update({
      current_node_id: null,
      current_edge_id: edgeId,
      edge_progress: 0,
      destination_node_id: destinationNodeId,
      updated_at: new Date().toISOString()
    })
    .eq('id', entityId);

  if (error) throw error;

  // Also append to journey
  await appendJourneyEvent(entityId, {
    type: 'started_edge',
    edge_id: edgeId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Entity arrives at destination node
 */
export async function arriveAtNode(
  entityId: string,
  nodeId: string
): Promise<void> {
  // Get current entity to record where it came from
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('current_edge_id')
    .eq('id', entityId)
    .single();

  const { error } = await supabase
    .from('stitch_entities')
    .update({
      current_node_id: nodeId,
      current_edge_id: null,
      edge_progress: null,
      destination_node_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', entityId);

  if (error) throw error;

  // Append to journey
  await appendJourneyEvent(entityId, {
    type: 'entered_node',
    node_id: nodeId,
    from_edge_id: entity?.current_edge_id,
    timestamp: new Date().toISOString()
  });
}

async function appendJourneyEvent(entityId: string, event: any): Promise<void> {
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('journey')
    .eq('id', entityId)
    .single();

  const journey = [...(entity?.journey || []), event];

  await supabase
    .from('stitch_entities')
    .update({ journey })
    .eq('id', entityId);
}
