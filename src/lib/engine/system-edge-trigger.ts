/**
 * System Edge Trigger Logic
 * Handles firing of system edges (background processes) when nodes complete
 * Validates: Requirements 4.1, 4.3, 4.5, 5.5
 */

import { getAdminClient } from '../supabase/client';
import { StitchEdge } from '@/types/stitch';

/**
 * Triggers all system edges connected to a node
 * System edges represent background processes (CRM sync, analytics, etc.)
 * that fire in parallel without moving entities
 * 
 * Validates: Requirements 4.1, 4.3, 4.5, 5.5
 * 
 * @param nodeId - The ID of the node that completed
 * @param entityId - The ID of the entity (for context in system actions)
 * @param canvasId - The ID of the canvas (BMC) containing the node
 */
export async function triggerSystemEdges(
  nodeId: string,
  entityId: string,
  canvasId: string
): Promise<void> {
  const supabase = getAdminClient();

  try {
    // Find the BMC canvas containing this node
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('graph')
      .eq('id', canvasId)
      .single();

    if (flowError || !flow) {
      console.error('Failed to load canvas for system edge triggering:', flowError);
      return;
    }

    // Find all system edges connected to this node (Requirement 4.1)
    const systemEdges = flow.graph.edges.filter(
      (edge: StitchEdge) =>
        edge.source === nodeId &&
        edge.type === 'system'
    );

    if (systemEdges.length === 0) {
      // No system edges to fire
      return;
    }

    // Execute all system edges in parallel (Requirement 4.1)
    await Promise.all(
      systemEdges.map((edge: StitchEdge) => executeSystemEdge(edge, entityId, canvasId))
    );
  } catch (error) {
    console.error('Error triggering system edges:', error);
    // Don't throw - system edge failures shouldn't block entity movement
  }
}

/**
 * Executes a single system edge
 * Broadcasts pulse animation and executes the system action
 * 
 * Validates: Requirements 4.3, 4.5
 * 
 * @param edge - The system edge to execute
 * @param entityId - The ID of the entity (for context)
 * @param canvasId - The ID of the canvas
 */
async function executeSystemEdge(
  edge: StitchEdge,
  entityId: string,
  canvasId: string
): Promise<void> {
  const supabase = getAdminClient();

  try {
    // Broadcast 'edge_fired' event for pulse animation (Requirement 4.3)
    const channel = supabase.channel(`canvas-${canvasId}`);
    await channel.send({
      type: 'broadcast',
      event: 'edge_fired',
      payload: {
        edge_id: edge.id,
        entity_id: entityId,
        timestamp: new Date().toISOString(),
      },
    });

    // Execute the system action (Requirement 4.5)
    const systemAction = edge.data?.systemAction;
    if (!systemAction) {
      console.warn(`System edge ${edge.id} has no systemAction defined`);
      return;
    }

    switch (systemAction) {
      case 'crm_sync':
        await executeCRMSync(entityId, edge);
        break;
      case 'analytics_update':
        await executeAnalyticsUpdate(entityId, edge);
        break;
      case 'slack_notify':
        await executeSlackNotify(entityId, edge);
        break;
      case 'stripe_sync':
        await executeStripeSync(entityId, edge);
        break;
      default:
        console.warn(`Unknown system action: ${systemAction}`);
    }
  } catch (error) {
    console.error(`Failed to execute system edge ${edge.id}:`, error);
    // Don't throw - individual system edge failures shouldn't block others
  }
}

/**
 * Executes CRM sync action
 * In production, this would sync entity data to HubSpot/Salesforce
 * For demo, this logs the action
 * 
 * @param entityId - The entity to sync
 * @param edge - The system edge
 */
async function executeCRMSync(entityId: string, edge: StitchEdge): Promise<void> {
  const supabase = getAdminClient();

  // Get entity data
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (!entity) {
    console.warn(`Entity ${entityId} not found for CRM sync`);
    return;
  }

  // Log the CRM sync action
  console.log(`[CRM Sync] ${edge.source} -> ${edge.target}:`, {
    entity: entity.name,
    email: entity.email,
    type: entity.entity_type,
    timestamp: new Date().toISOString(),
  });

  // In production, this would call:
  // await hubspotClient.contacts.createOrUpdate(entity);
}

/**
 * Executes analytics update action
 * Increments the appropriate metric counter
 * 
 * @param entityId - The entity triggering the update
 * @param edge - The system edge
 */
async function executeAnalyticsUpdate(entityId: string, edge: StitchEdge): Promise<void> {
  const supabase = getAdminClient();

  // Get entity data for context
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  // Log the analytics update
  console.log(`[Analytics Update] ${edge.source} -> ${edge.target}:`, {
    entity: entity?.name,
    source_node: edge.source,
    timestamp: new Date().toISOString(),
  });

  // In production, this would call:
  // await analyticsClient.track('node_completion', { nodeId: edge.source, entityId });
}

/**
 * Executes Slack notification action
 * Sends a notification to the configured Slack channel
 * 
 * @param entityId - The entity triggering the notification
 * @param edge - The system edge
 */
async function executeSlackNotify(entityId: string, edge: StitchEdge): Promise<void> {
  const supabase = getAdminClient();

  // Get entity data
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (!entity) {
    console.warn(`Entity ${entityId} not found for Slack notification`);
    return;
  }

  // Log the Slack notification
  console.log(`[Slack Notify] ${edge.source} -> ${edge.target}:`, {
    entity: entity.name,
    email: entity.email,
    message: `${entity.name} reached ${edge.source}`,
    timestamp: new Date().toISOString(),
  });

  // In production, this would call:
  // await slackClient.chat.postMessage({
  //   channel: '#sales',
  //   text: `🎉 ${entity.name} just booked a demo!`
  // });
}

/**
 * Executes Stripe sync action
 * Creates or updates a Stripe subscription
 * 
 * @param entityId - The entity to sync
 * @param edge - The system edge
 */
async function executeStripeSync(entityId: string, edge: StitchEdge): Promise<void> {
  const supabase = getAdminClient();

  // Get entity data
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (!entity) {
    console.warn(`Entity ${entityId} not found for Stripe sync`);
    return;
  }

  // Determine plan from source node
  const planMap: Record<string, { name: string; amount: number }> = {
    'item-basic-plan': { name: 'Basic', amount: 29 },
    'item-pro-plan': { name: 'Pro', amount: 99 },
    'item-enterprise': { name: 'Enterprise', amount: 299 },
  };

  const plan = planMap[edge.source];
  if (!plan) {
    console.warn(`Unknown plan for node ${edge.source}`);
    return;
  }

  // Log the Stripe sync action
  console.log(`[Stripe Sync] ${edge.source} -> ${edge.target}:`, {
    entity: entity.name,
    email: entity.email,
    plan: plan.name,
    amount: plan.amount,
    timestamp: new Date().toISOString(),
  });

  // In production, this would call:
  // await stripeClient.subscriptions.create({
  //   customer: entity.metadata.stripe_customer_id,
  //   items: [{ price: plan.priceId }],
  // });
}
