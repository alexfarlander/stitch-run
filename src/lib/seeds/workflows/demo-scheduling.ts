/**
 * Demo Scheduling Workflow Seed
 * 
 * Seeds the database with a demo scheduling workflow that:
 * 1. Sends confirmation email to prospect
 * 2. Waits for booking confirmation
 * 3. Prepares demo materials and environment
 * 
 * This workflow is triggered when a prospect books a demo call
 * through Calendly or other scheduling systems
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'Demo Scheduling Logic';

/**
 * Creates the Demo Scheduling workflow
 * 
 * Workflow structure:
 * Send Email → Wait for Booking → Pre-Demo Prep
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-demo-call')
 * @returns Workflow definition object
 */
export function createDemoSchedulingWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Send Email (Worker)
    {
      id: 'send-email',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Send Email',
        workerType: 'webhook-trigger',
        description: 'Sends confirmation email with demo details and calendar invite',
        config: {
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          template: 'demo-confirmation',
        },
      },
    },
    
    // 2. Wait for Booking (Worker)
    {
      id: 'wait-for-booking',
      type: 'Worker',
      position: { x: 300, y: 100 },
      data: {
        label: 'Wait for Booking',
        workerType: 'webhook-listener',
        description: 'Waits for Calendly webhook confirming the demo booking',
        config: {
          webhookSource: 'calendly-demo',
          timeout: 86400000, // 24 hours in milliseconds
          fallbackAction: 'send-reminder',
        },
      },
    },
    
    // 3. Pre-Demo Prep (Worker)
    {
      id: 'pre-demo-prep',
      type: 'Worker',
      position: { x: 500, y: 100 },
      data: {
        label: 'Pre-Demo Prep',
        workerType: 'data-transform',
        description: 'Prepares demo environment, materials, and notifies sales team',
        config: {
          tasks: [
            'create-demo-account',
            'prepare-demo-data',
            'notify-sales-team',
            'generate-meeting-notes',
          ],
          notifications: {
            slack: true,
            email: true,
          },
        },
      },
    },
  ];
  
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'send-email', target: 'wait-for-booking' },
    { id: 'e2', source: 'wait-for-booking', target: 'pre-demo-prep' },
  ];
  
  return {
    name: WORKFLOW_NAME,
    parent_id: parentItemId,
    canvas_type: 'workflow' as const,
    graph: { nodes, edges },
  };
}

/**
 * Seeds the Demo Scheduling workflow into the database
 * Links to the 'item-demo-call' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedDemoSchedulingWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding Demo Scheduling Logic Workflow...\n');
  
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
    const parentItemId = 'item-demo-call';
    const parentNode = bmc.graph.nodes.find((n: unknown) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating Demo Scheduling workflow...');
    const workflowDef = createDemoSchedulingWorkflow(parentItemId);
    
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
    
    console.log('🎉 Demo Scheduling workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 3 nodes configured:');
    console.log('     1. Send Email (webhook-trigger)');
    console.log('     2. Wait for Booking (webhook-listener)');
    console.log('     3. Pre-Demo Prep (data-transform)');
    console.log('   - 2 edges connecting the workflow');
    console.log('\n🚀 Workflow flow:');
    console.log('   Send Email → Wait for Booking → Pre-Demo Prep');
    
    return workflow.id;
    
  } catch (error) {
    console.error('❌ Demo Scheduling workflow seed failed:', error);
    throw error;
  }
}
