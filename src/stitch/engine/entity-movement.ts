import { StitchRun, StitchEntity } from '@/types/stitch';
import { getAdminClient } from '@/lib/supabase/client';
import { startJourney, moveEntityToSection, createJourneyEvent } from '@/lib/db/entities';
import { getFlowAdmin } from '@/lib/db/flows';

export interface MovementResult {
  moved: boolean;
  from?: { type: 'node' | 'edge', id: string };
  to?: { type: 'node' | 'edge', id: string };
  newEntityType?: string;
}

/**
 * Evaluates entity movement rules upon node completion.
 */
export async function handleNodeCompletion(
  run: StitchRun,
  completedNodeId: string,
  nodeOutput: any,
  success: boolean
): Promise<MovementResult | null> {
  // 1. Check if run has attached entity
  if (!run.entity_id) return null;

  // 2. Get the flow and node config (Admin client to bypass RLS)
  const _flow = await getFlowAdmin(run.flow_id);
  if (!flow) return null;

  const node = flow.graph.nodes.find(n => n.id === completedNodeId);
  if (!node || !node.data.entityMovement) return null;

  // 3. Determine action (Success vs Failure)
  const action = success 
    ? node.data.entityMovement.onSuccess 
    : node.data.entityMovement.onFailure;
  
  if (!action) return null;

  const _supabase = getAdminClient();
  const result: MovementResult = { moved: false };

  // Fetch current entity state to know where we are
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('id', run.entity_id)
    .single();

  if (!entity) return null;

  // 4. Handle Entity Type Change (e.g. 'lead' -> 'customer')
  if (action.setEntityType && action.setEntityType !== entity.entity_type) {
    await supabase
      .from('stitch_entities')
      .update({ entity_type: action.setEntityType })
      .eq('id', run.entity_id);
    
    result.newEntityType = action.setEntityType;
  }

  // 5. Handle Movement (Travel to Target Section)
  if (action.targetSectionId) {
    const currentSectionId = entity.current_node_id;

    // Try to find a visual edge on the BMC canvas to travel along
    let journeyEdgeId: string | null = null;

    if (currentSectionId) {
      // We need to fetch the BMC Canvas (Parent of the workflow, or the canvas the entity is on)
      const bmcFlow = await getFlowAdmin(entity.canvas_id);
      
      if (bmcFlow) {
        // Look for an edge connecting Current Section -> Target Section
        const edge = bmcFlow.graph.edges.find(
          e => e.source === currentSectionId && e.target === action.targetSectionId
        );
        
        if (edge) journeyEdgeId = edge.id;
      }
    }

    if (journeyEdgeId) {
      // SCENARIO A: Visual Path Exists
      // Put entity on the edge (starts animation)
      await startJourney(entity.id, journeyEdgeId);
      
      result.moved = true;
      result.from = { type: 'node', id: currentSectionId! };
      result.to = { type: 'edge', id: journeyEdgeId };

      // Note: The client-side animation or a separate "Arrival" trigger 
      // will handle the final move from Edge -> Node.
    } else {
      // SCENARIO B: No Visual Path (Teleport)
      // Just move them to the section directly
      await moveEntityToSection(
        entity.id,
        action.targetSectionId,
        action.completeAs || (success ? 'success' : 'failure'),
        {
          trigger_run_id: run.id,
          trigger_node_id: completedNodeId
        }
      );

      result.moved = true;
      result.from = { type: 'node', id: currentSectionId || 'unknown' };
      result.to = { type: 'node', id: action.targetSectionId };
    }
  }

  return result;
}
