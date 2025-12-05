/**
 * API endpoint for manual entity movement
 * 
 * POST /api/entities/[entityId]/move
 * 
 * Moves an entity to a target node and records a journey event.
 * 
 * Requirements:
 * - 5.2: Update entity position in database
 * - 5.4: Record journey event with type "manual_move"
 * - 14.1: Verify target node exists
 * - 14.2: Verify edge exists connecting nodes
 * - 14.3: Display error message on validation failure
 * - 14.4: Execute movement on validation success
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/client';
import { createJourneyEvent } from '@/lib/db/entities';

interface MoveEntityRequest {
  targetNodeId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const body: MoveEntityRequest = await request.json();
    const { targetNodeId } = body;

    if (!targetNodeId) {
      return NextResponse.json(
        { error: 'targetNodeId is required' },
        { status: 400 }
      );
    }

    const _supabase = getAdminClient();

    // Fetch the entity
    const { data: entity, error: entityError } = await supabase
      .from('stitch_entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (entityError || !entity) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Requirement 14.1: Verify target node exists
    // We need to check if the target node exists in the canvas
    const { data: canvas, error: canvasError } = await supabase
      .from('stitch_canvases')
      .select('canvas')
      .eq('id', entity.canvas_id)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    const canvasData = canvas.canvas as unknown;
    const targetNode = canvasData.nodes?.find((n: unknown) => n.id === targetNodeId);

    if (!targetNode) {
      return NextResponse.json(
        { error: 'Target node does not exist in canvas' },
        { status: 400 }
      );
    }

    // Requirement 14.2: Verify edge exists if moving between different nodes
    const sourceNodeId = entity.current_node_id;
    if (sourceNodeId && sourceNodeId !== targetNodeId) {
      const edges = canvasData.edges || [];
      const connectingEdge = edges.find(
        (e: unknown) =>
          (e.source === sourceNodeId && e.target === targetNodeId) ||
          (e.source === targetNodeId && e.target === sourceNodeId)
      );

      if (!connectingEdge) {
        return NextResponse.json(
          { error: 'No edge connects the source and target nodes' },
          { status: 400 }
        );
      }
    }

    // Requirement 5.2: Update entity position in database
    const { data: updatedEntity, error: updateError } = await supabase
      .from('stitch_entities')
      .update({
        current_node_id: targetNodeId,
        current_edge_id: null,
        edge_progress: null,
        destination_node_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId)
      .select()
      .single();

    if (updateError || !updatedEntity) {
      return NextResponse.json(
        { error: 'Failed to update entity position' },
        { status: 500 }
      );
    }

    // Requirement 5.4: Record journey event with type "manual_move"
    const journeyEvent = await createJourneyEvent(
      entityId,
      'manual_move',
      targetNodeId,
      null,
      null,
      {
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        movement_type: 'manual',
      }
    );

    return NextResponse.json({
      entity: updatedEntity,
      journeyEvent,
    });
  } catch (_error) {
    console.error('Error moving entity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
