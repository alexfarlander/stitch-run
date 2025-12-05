/**
 * Slack Notify Production Workflow Seed
 * 
 * Seeds the database with a Slack notification workflow that:
 * 1. Formats the message
 * 2. Posts to Slack channel
 * 
 * This workflow is triggered by system edges when notifications need to be sent
 * to Slack (e.g., new lead, demo booked, subscription created)
 * 
 * Validates: Requirements 8.3
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'Slack Notify';

/**
 * Creates the Slack Notify workflow
 * 
 * Workflow structure:
 * Format → Post to Channel
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-slack')
 * @returns Workflow definition object
 */
export function createSlackNotifyWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Format (Worker)
    {
      id: 'format-message',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Format',
        workerType: 'data-transform',
        description: 'Formats entity data into Slack message format',
        config: {
          template: {
            text: '🎉 New event: {{event_type}}',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Entity:* {{entity_name}}\n*Email:* {{entity_email}}\n*Type:* {{entity_type}}',
                },
              },
            ],
          },
        },
      },
    },
    
    // 2. Post to Channel (Worker)
    {
      id: 'post-to-channel',
      type: 'Worker',
      position: { x: 300, y: 100 },
      data: {
        label: 'Post to Channel',
        workerType: 'webhook-trigger',
        description: 'Posts formatted message to Slack channel',
        config: {
          url: 'https://slack.com/api/chat.postMessage',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {{SLACK_BOT_TOKEN}}',
          },
          body: {
            channel: '#clockwork-canvas',
            text: '{{formatted_message}}',
          },
        },
      },
    },
  ];
  
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'format-message', target: 'post-to-channel' },
  ];
  
  return {
    name: WORKFLOW_NAME,
    parent_id: parentItemId,
    canvas_type: 'workflow' as const,
    graph: { nodes, edges },
  };
}

/**
 * Seeds the Slack Notify workflow into the database
 * Links to the 'item-slack' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedSlackNotifyWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding Slack Notify Workflow...\n');
  
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
    const parentItemId = 'item-slack';
    const parentNode = bmc.graph.nodes.find((n: any) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating Slack Notify workflow...');
    const workflowDef = createSlackNotifyWorkflow(parentItemId);
    
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
    
    console.log('🎉 Slack Notify workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 2 nodes configured:');
    console.log('     1. Format (data-transform)');
    console.log('     2. Post to Channel (webhook-trigger)');
    console.log('   - 1 edge connecting the workflow');
    console.log('\n🚀 Workflow flow:');
    console.log('   Format → Post to Channel');
    
    return workflow.id;
    
  } catch (error) {
    console.error('❌ Slack Notify workflow seed failed:', error);
    throw error;
  }
}
