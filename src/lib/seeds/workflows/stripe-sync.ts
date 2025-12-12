/**
 * Stripe Sync Production Workflow Seed
 * 
 * Seeds the database with a Stripe sync workflow that:
 * 1. Creates or updates subscription in Stripe
 * 
 * This workflow is triggered by system edges when subscription operations need to be
 * performed in Stripe (e.g., create subscription, update plan, cancel subscription)
 * 
 * Validates: Requirements 8.4
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'Stripe Sync';

/**
 * Creates the Stripe Sync workflow
 * 
 * Workflow structure:
 * Create/Update Subscription
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-stripe')
 * @returns Workflow definition object
 */
export function createStripeSyncWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Create/Update Subscription (Worker)
    {
      id: 'create-update-subscription',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Create/Update Subscription',
        workerType: 'webhook-trigger',
        description: 'Creates or updates subscription in Stripe based on entity state',
        config: {
          url: 'https://api.stripe.com/v1/subscriptions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer {{STRIPE_SECRET_KEY}}',
          },
          body: {
            customer: '{{customer_id}}',
            items: [
              {
                price: '{{price_id}}',
              },
            ],
            metadata: {
              entity_id: '{{entity_id}}',
              entity_type: '{{entity_type}}',
            },
          },
          operations: {
            create: {
              method: 'POST',
              url: 'https://api.stripe.com/v1/subscriptions',
            },
            update: {
              method: 'POST',
              url: 'https://api.stripe.com/v1/subscriptions/{{subscription_id}}',
            },
            cancel: {
              method: 'DELETE',
              url: 'https://api.stripe.com/v1/subscriptions/{{subscription_id}}',
            },
          },
        },
      },
    },
  ];
  
  const edges: StitchEdge[] = [];
  
  return {
    name: WORKFLOW_NAME,
    parent_id: parentItemId,
    canvas_type: 'workflow' as const,
    graph: { nodes, edges },
  };
}

/**
 * Seeds the Stripe Sync workflow into the database
 * Links to the 'item-stripe' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedStripeSyncWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding Stripe Sync Workflow...\n');
  
  // Use provided client or global admin client
  if (!supabase) {
    supabase = (global as unknown).supabaseAdminClient;
  }
  
  if (!supabase) {
    // Lazy import to avoid loading before env vars are set
    const { getAdminClient } = await import('../../supabase/client');
    supabase = getAdminClient();
  }
  
  const client = supabase;
  
  try {
    // Step 1: Check if workflow already exists (idempotency)
    console.log('📋 Step 1: Checking for existing workflow...');
    const { data: existing, error: queryError } = await client
      .from('stitch_flows')
      .select('id')
      .eq('name', WORKFLOW_NAME)
      .eq('canvas_type', 'workflow')
      .maybeSingle();
    
    if (queryError) {
      throw new Error(`Failed to query for existing workflow: ${queryError.message}`);
    }
    
    if (existing) {
      console.log(`ℹ️  ${WORKFLOW_NAME} already exists (ID: ${existing.id})`);
      return existing.id;
    }
    
    // Step 2: Get the BMC canvas to link the workflow
    console.log('📋 Step 2: Fetching BMC canvas...');
    const { data: bmc, error: bmcError } = await client
      .from('stitch_flows')
      .select('id, graph')
      .eq('canvas_type', 'bmc')
      .limit(1)
      .maybeSingle();
    
    if (bmcError) {
      throw new Error(`Failed to fetch BMC canvas: ${bmcError.message}`);
    }
    
    if (!bmc) {
      throw new Error('BMC canvas not found. Please run seed-clockwork.ts first.');
    }
    
    console.log(`✅ Found BMC canvas: ${bmc.id}\n`);
    
    // Step 3: Verify parent item node exists
    console.log('📋 Step 3: Verifying parent item node...');
    const parentItemId = 'item-stripe';
    const parentNode = bmc.graph.nodes.find((n: unknown) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating Stripe Sync workflow...');
    const workflowDef = createStripeSyncWorkflow(parentItemId);
    
    const { data: workflow, error: insertError } = await client
      .from('stitch_flows')
      .insert({
        name: workflowDef.name,
        canvas_type: workflowDef.canvas_type,
        parent_id: bmc.id,
        graph: workflowDef.graph,
      })
      .select('id')
      .single();
    
    if (insertError) {
      throw new Error(`Failed to create workflow: ${insertError.message}`);
    }
    
    if (!workflow) {
      throw new Error('Workflow insertion succeeded but no data returned');
    }
    
    console.log(`✅ Created ${WORKFLOW_NAME} (ID: ${workflow.id})\n`);
    
    console.log('🎉 Stripe Sync workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 1 node configured:');
    console.log('     1. Create/Update Subscription (webhook-trigger)');
    console.log('   - 0 edges (single node workflow)');
    console.log('\n🚀 Workflow flow:');
    console.log('   Create/Update Subscription');
    
    return workflow.id;
    
  } catch (error) {
    console.error('❌ Stripe Sync workflow seed failed:', error);
    throw error;
  }
}
