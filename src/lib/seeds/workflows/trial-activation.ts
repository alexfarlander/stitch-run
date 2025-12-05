/**
 * Trial Activation Workflow Seed
 * 
 * Seeds the database with a trial activation workflow that:
 * 1. Provisions a new trial account with demo data
 * 2. Sends onboarding email sequence with product tutorials
 * 3. Waits for upgrade signal (trial conversion)
 * 
 * This workflow is triggered when a prospect starts a free trial
 * through Stripe or other trial activation systems
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'Trial Activation Logic';

/**
 * Creates the Trial Activation workflow
 * 
 * Workflow structure:
 * Provision Account → Send Onboarding → Wait for Upgrade
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-free-trial')
 * @returns Workflow definition object
 */
export function createTrialActivationWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Provision Account (Worker)
    {
      id: 'provision-account',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Provision Account',
        workerType: 'data-transform',
        description: 'Creates trial account with demo data and configures initial settings',
        config: {
          accountType: 'trial',
          trialDuration: 14, // days
          features: ['basic-features', 'demo-data', 'limited-api-access'],
          setupTasks: [
            'create-database',
            'seed-demo-data',
            'configure-permissions',
            'generate-api-keys',
          ],
        },
      },
    },
    
    // 2. Send Onboarding (Worker)
    {
      id: 'send-onboarding',
      type: 'Worker',
      position: { x: 300, y: 100 },
      data: {
        label: 'Send Onboarding',
        workerType: 'webhook-trigger',
        description: 'Sends onboarding email sequence with product tutorials and best practices',
        config: {
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          emailSequence: [
            { day: 0, template: 'welcome-trial' },
            { day: 1, template: 'getting-started' },
            { day: 3, template: 'advanced-features' },
            { day: 7, template: 'trial-midpoint' },
            { day: 12, template: 'trial-ending-soon' },
          ],
        },
      },
    },
    
    // 3. Wait for Upgrade (Worker)
    {
      id: 'wait-for-upgrade',
      type: 'Worker',
      position: { x: 500, y: 100 },
      data: {
        label: 'Wait for Upgrade',
        workerType: 'webhook-listener',
        description: 'Monitors for trial conversion to paid subscription',
        config: {
          webhookSources: [
            'stripe-subscription-basic',
            'stripe-subscription-pro',
            'stripe-subscription-enterprise',
          ],
          timeout: 1209600000, // 14 days in milliseconds
          fallbackAction: 'send-conversion-reminder',
          reminderSchedule: [
            { day: 7, message: 'trial-halfway' },
            { day: 12, message: 'trial-ending' },
            { day: 14, message: 'trial-expired' },
          ],
        },
      },
    },
  ];
  
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'provision-account', target: 'send-onboarding' },
    { id: 'e2', source: 'send-onboarding', target: 'wait-for-upgrade' },
  ];
  
  return {
    name: WORKFLOW_NAME,
    parent_id: parentItemId,
    canvas_type: 'workflow' as const,
    graph: { nodes, edges },
  };
}

/**
 * Seeds the Trial Activation workflow into the database
 * Links to the 'item-free-trial' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedTrialActivationWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding Trial Activation Logic Workflow...\n');
  
  // Use provided client or global admin client
  if (!supabase) {
    supabase = (global as any).supabaseAdminClient;
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
    const parentItemId = 'item-free-trial';
    const parentNode = bmc.graph.nodes.find((n: any) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating Trial Activation workflow...');
    const workflowDef = createTrialActivationWorkflow(parentItemId);
    
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
    
    console.log('🎉 Trial Activation workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 3 nodes configured:');
    console.log('     1. Provision Account (data-transform)');
    console.log('     2. Send Onboarding (webhook-trigger)');
    console.log('     3. Wait for Upgrade (webhook-listener)');
    console.log('   - 2 edges connecting the workflow');
    console.log('\n🚀 Workflow flow:');
    console.log('   Provision Account → Send Onboarding → Wait for Upgrade');
    
    return workflow.id;
    
  } catch (error) {
    console.error('❌ Trial Activation workflow seed failed:', error);
    throw error;
  }
}
