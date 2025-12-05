/**
 * Clockwork Canvas Webhook Route Handler
 * 
 * Receives webhook events from external services and moves entities through the BMC.
 * This is specifically for the Clockwork Canvas demo system.
 * 
 * POST /api/webhooks/clockwork/[source]
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { mapWebhookSourceToNode } from '@/lib/webhooks/node-map';
import { createJourneyEvent } from '@/lib/db/entities';
import { getAdminClient } from '@/lib/supabase/client';
import { StitchEntity } from '@/types/stitch';

/**
 * Determines entity type based on webhook source
 * 
 * @param source - Webhook source identifier
 * @returns Entity type (lead, customer, or churned)
 */
function determineEntityType(source: string): 'lead' | 'customer' | 'churned' {
  // Churn events mark entities as churned (Requirement 11.6)
  if (source === 'stripe-churn') {
    return 'churned';
  }

  // Subscription events mark entities as customers (Requirement 11.4)
  if (source.startsWith('stripe-subscription')) {
    return 'customer';
  }

  // Trial and demo are still leads
  if (source === 'stripe-trial' || source === 'calendly-demo') {
    return 'lead';
  }

  // Marketing touchpoints create leads (Requirement 11.1)
  if (source.includes('linkedin') || source.includes('youtube') || source.includes('seo')) {
    return 'lead';
  }

  // Support tickets maintain current type
  if (source === 'zendesk-ticket') {
    return 'customer'; // Assume support tickets are from customers
  }

  // Default to lead
  return 'lead';
}

/**
 * Finds an existing entity by email or creates a new one
 * 
 * Validates: Requirement 5.2
 * 
 * @param canvasId - ID of the BMC canvas
 * @param email - Entity email address
 * @param data - Additional entity data
 * @returns Entity (existing or newly created)
 */
async function findOrCreateEntity(
  canvasId: string,
  email: string,
  data: {
    name?: string;
    entity_type: 'lead' | 'customer' | 'churned';
    metadata: Record<string, unknown>;
  }
): Promise<StitchEntity> {
  const supabase = getAdminClient();

  // Try to find existing entity by email
  const { data: existingEntity, error: findError } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('canvas_id', canvasId)
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to query entity: ${findError.message}`);
  }

  // If entity exists, return it
  if (existingEntity) {
    return existingEntity as StitchEntity;
  }

  // Create new entity
  const { data: newEntity, error: createError } = await supabase
    .from('stitch_entities')
    .insert({
      canvas_id: canvasId,
      name: data.name || email.split('@')[0], // Use email prefix as fallback name
      email: email,
      entity_type: data.entity_type,
      metadata: data.metadata,
      journey: [],
    })
    .select()
    .single();

  if (createError || !newEntity) {
    throw new Error(`Failed to create entity: ${createError?.message}`);
  }

  return newEntity as StitchEntity;
}

/**
 * Moves an entity to a target node
 * 
 * Validates: Requirement 5.3
 * 
 * @param entityId - ID of the entity to move
 * @param nodeId - ID of the target node
 * @param entityType - Optional: Update entity type during move
 */
async function moveEntityToNode(
  entityId: string,
  nodeId: string,
  entityType?: 'lead' | 'customer' | 'churned'
): Promise<void> {
  const supabase = getAdminClient();

  const updateData: unknown = {
    current_node_id: nodeId,
    current_edge_id: null,
    edge_progress: null,
  };

  // Update entity type if specified (for churn events)
  if (entityType) {
    updateData.entity_type = entityType;
  }

  const { error } = await supabase
    .from('stitch_entities')
    .update(updateData)
    .eq('id', entityId);

  if (error) {
    throw new Error(`Failed to move entity to node: ${error.message}`);
  }
}

/**
 * POST handler for webhook events
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  try {
    // Extract source from params (Requirement 5.1)
    const { source } = await params;

    // Parse request payload
    const payload = await request.json();

    // Validate required fields
    if (!payload.email) {
      return NextResponse.json(
        { error: 'Email is required in webhook payload' },
        { status: 400 }
      );
    }

    // 1. Map source to target node (Requirement 5.1)
    const targetNodeId = mapWebhookSourceToNode(source);
    if (!targetNodeId) {
      return NextResponse.json(
        { error: `Unknown webhook source: ${source}` },
        { status: 400 }
      );
    }

    // Get the BMC canvas ID
    // For Clockwork Canvas, we use the most recent BMC canvas
    const supabase = getAdminClient();
    const { data: bmcCanvases, error: canvasError } = await supabase
      .from('stitch_flows')
      .select('id, name, canvas_type, created_at')
      .eq('canvas_type', 'bmc')
      .order('created_at', { ascending: false })
      .limit(1);

    if (canvasError || !bmcCanvases || bmcCanvases.length === 0) {
      return NextResponse.json(
        {
          error: 'BMC canvas not found. Please run the seed script first.',
          debug: {
            canvasError: canvasError?.message,
          }
        },
        { status: 404 }
      );
    }

    const bmcCanvas = bmcCanvases[0];

    const canvasId = bmcCanvas.id;

    // Determine entity type based on source
    const entityType = determineEntityType(source);

    // 2. Find or create entity (Requirement 5.2)
    const entity = await findOrCreateEntity(
      canvasId,
      payload.email,
      {
        name: payload.name,
        entity_type: entityType,
        metadata: {
          source,
          ...payload,
          webhook_received_at: new Date().toISOString(),
        },
      }
    );

    // 3. Move entity to target node (Requirement 5.3)
    await moveEntityToNode(entity.id, targetNodeId, entityType);

    // 3.5 Broadcast node activation event for visual feedback
    // This triggers the green flash on the node
    try {
      const { broadcastToCanvasAsync } = await import('@/lib/supabase/broadcast');
      broadcastToCanvasAsync(canvasId, 'node_activated', {
        nodeId: targetNodeId,
        entityId: entity.id,
        entityName: entity.name,
        activationType: 'arrival',
        timestamp: new Date().toISOString(),
      });
    } catch (broadcastError) {
      console.warn('[Webhook] Failed to broadcast node activation:', broadcastError);
    }

    // 4. Create journey event (Requirement 5.4)
    await createJourneyEvent(
      entity.id,
      'node_arrival',
      targetNodeId,
      null,
      null,
      {
        webhook_source: source,
        payload_summary: {
          name: payload.name,
          email: payload.email,
          plan: payload.plan,
          amount: payload.amount,
        },
      }
    );

    // 5. Walk parallel edges - journey edges and system edges fire simultaneously
    // (Requirements 12.1, 12.2, 12.3, 12.4, 12.5)
    const { walkParallelEdges } = await import('@/lib/engine/edge-walker');
    const edgeResults = await walkParallelEdges(targetNodeId, entity.id, canvasId);

    // Log edge execution results (Requirement 12.5)
    console.log(`[Webhook] Parallel edge execution completed:`, {
      source,
      targetNode: targetNodeId,
      entity: entity.name,
      journeyEdges: edgeResults.journeyEdges.length,
      systemEdges: edgeResults.systemEdges.length,
      journeySuccess: edgeResults.journeyEdges.filter(r => r.success).length,
      systemSuccess: edgeResults.systemEdges.filter(r => r.success).length,
    });

    // 6. Update financial metrics if subscription webhook (Requirement 5.6)
    if (source.startsWith('stripe-subscription')) {
      try {
        const { updateFinancials } = await import('@/lib/metrics/financial-updates');
        await updateFinancials({
          plan: payload.plan,
          amount: payload.amount,
        });

        // Broadcast revenue event
        const { broadcastToCanvasAsync } = await import('@/lib/supabase/broadcast');
        const amountFormatted = `$${((payload.amount || 0) / 100).toFixed(0)}`;
        broadcastToCanvasAsync(canvasId, 'demo_event', {
          description: `💰 +${amountFormatted}/mo MRR from ${entity.name}`,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Financial Update] Failed:', err);
      }
    }

    // 7. Return success response (Requirement 5.7)
    return NextResponse.json(
      {
        success: true,
        entity_id: entity.id,
        target_node: targetNodeId,
        entity_type: entityType,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
