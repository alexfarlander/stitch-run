/**
 * Analytics Update Production Workflow Seed
 * 
 * Seeds the database with an analytics update workflow that:
 * 1. Increments the appropriate metric
 * 
 * This workflow is triggered by system edges when analytics metrics need to be updated
 * (e.g., tracking conversions, page views, user actions)
 * 
 * Validates: Requirements 8.2
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'Analytics Update';

/**
 * Creates the Analytics Update workflow
 * 
 * Workflow structure:
 * Increment Metric
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-analytics')
 * @returns Workflow definition object
 */
export function createAnalyticsUpdateWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Increment Metric (Worker)
    {
      id: 'increment-metric',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Increment Metric',
        workerType: 'data-transform',
        description: 'Increments the appropriate analytics metric based on event type',
        config: {
          metricMapping: {
            'node_arrival': 'conversions',
            'lead_created': 'leads',
            'demo_booked': 'demos',
            'trial_started': 'trials',
            'subscription_created': 'subscriptions',
          },
          incrementBy: 1,
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
 * Seeds the Analytics Update workflow into the database
 * Links to the 'item-analytics' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedAnalyticsUpdateWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding Analytics Update Workflow...\n');
  
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
    const parentItemId = 'item-analytics';
    const parentNode = bmc.graph.nodes.find((n: unknown) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating Analytics Update workflow...');
    const workflowDef = createAnalyticsUpdateWorkflow(parentItemId);
    
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
    
    console.log('🎉 Analytics Update workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 1 node configured:');
    console.log('     1. Increment Metric (data-transform)');
    console.log('   - 0 edges (single node workflow)');
    console.log('\n🚀 Workflow flow:');
    console.log('   Increment Metric');
    
    return workflow.id;
    
  } catch (_error) {
    console.error('❌ Analytics Update workflow seed failed:', error);
    throw error;
  }
}
