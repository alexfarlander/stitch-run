/**
 * Link Workflows to Item Nodes Script
 * 
 * Updates BMC item nodes with linked_workflow_id references
 * so that drill-down navigation works correctly.
 * 
 * This script:
 * 1. Fetches all workflows linked to the BMC
 * 2. Maps workflows to their parent item nodes
 * 3. Updates the BMC graph to add linked_workflow_id to item nodes
 * 
 * Validates: Requirements 7.1, 7.3
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Mapping of workflow names to their parent item node IDs
 */
const WORKFLOW_TO_ITEM_MAP: Record<string, string> = {
  'Lead Capture Logic': 'item-linkedin-ads',
  'Demo Scheduling Logic': 'item-demo-call',
  'Trial Activation Logic': 'item-free-trial',
  'Support Handler Logic': 'item-help-desk',
  'CRM Sync': 'item-crm',
  'Analytics Update': 'item-analytics',
  'Slack Notify': 'item-slack',
  'Stripe Sync': 'item-stripe',
};

async function main() {
  console.log('🔗 Linking Workflows to Item Nodes\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Get BMC canvas
    console.log('📋 Step 1: Fetching BMC canvas...');
    const { data: bmc, error: bmcError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'bmc')
      .limit(1)
      .maybeSingle();
    
    if (bmcError) {
      throw new Error(`Failed to fetch BMC: ${bmcError.message}`);
    }
    
    if (!bmc) {
      throw new Error('BMC canvas not found. Please run seed-clockwork.ts first.');
    }
    
    console.log(`✅ Found BMC: ${bmc.name} (${bmc.id})\n`);
    
    // Step 2: Get all workflows
    console.log('📋 Step 2: Fetching workflows...');
    const { data: workflows, error: workflowsError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'workflow')
      .eq('parent_id', bmc.id);
    
    if (workflowsError) {
      throw new Error(`Failed to fetch workflows: ${workflowsError.message}`);
    }
    
    if (!workflows || workflows.length === 0) {
      throw new Error('No workflows found. Please run seed-clockwork.ts first.');
    }
    
    console.log(`✅ Found ${workflows.length} workflows\n`);
    
    // Step 3: Update BMC graph with workflow links
    console.log('📋 Step 3: Updating item nodes with workflow links...\n');
    
    const graph = { ...bmc.graph };
    let updatedCount = 0;
    
    for (const workflow of workflows) {
      const itemNodeId = WORKFLOW_TO_ITEM_MAP[workflow.name];
      
      if (!itemNodeId) {
        console.log(`⚠️  No mapping found for workflow: ${workflow.name}`);
        continue;
      }
      
      // Find the item node in the graph
      const nodeIndex = graph.nodes.findIndex((n: unknown) => n.id === itemNodeId);
      
      if (nodeIndex === -1) {
        console.log(`⚠️  Item node not found: ${itemNodeId} for workflow ${workflow.name}`);
        continue;
      }
      
      // Update the node with linked_workflow_id
      graph.nodes[nodeIndex] = {
        ...graph.nodes[nodeIndex],
        data: {
          ...graph.nodes[nodeIndex].data,
          linked_workflow_id: workflow.id,
        },
      };
      
      updatedCount++;
      console.log(`✅ Linked ${workflow.name} → ${itemNodeId}`);
      console.log(`   Workflow ID: ${workflow.id}`);
      console.log('');
    }
    
    // Step 4: Save updated BMC graph
    console.log('📋 Step 4: Saving updated BMC graph...');
    const { error: updateError } = await supabase
      .from('stitch_flows')
      .update({ graph })
      .eq('id', bmc.id);
    
    if (updateError) {
      throw new Error(`Failed to update BMC: ${updateError.message}`);
    }
    
    console.log(`✅ Updated BMC graph with ${updatedCount} workflow links\n`);
    
    // Step 5: Verify the links
    console.log('📋 Step 5: Verifying workflow links...\n');
    
    const { data: updatedBmc, error: verifyError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', bmc.id)
      .single();
    
    if (verifyError) {
      throw new Error(`Failed to verify BMC: ${verifyError.message}`);
    }
    
    const linkedNodes = updatedBmc.graph.nodes.filter(
      (n: unknown) => n.data?.linked_workflow_id
    );
    
    console.log(`✅ Verification complete:`);
    console.log(`   - Total item nodes: ${updatedBmc.graph.nodes.filter((n: unknown) => n.type === 'section-item').length}`);
    console.log(`   - Linked item nodes: ${linkedNodes.length}`);
    console.log('');
    
    linkedNodes.forEach((node: unknown) => {
      console.log(`   ✓ ${node.data.label} (${node.id})`);
      console.log(`     → Workflow ID: ${node.data.linked_workflow_id}`);
    });
    console.log('');
    
    // Summary
    console.log('═'.repeat(60));
    console.log('\n🎉 Workflow linking complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Workflows processed: ${workflows.length}`);
    console.log(`   - Item nodes updated: ${updatedCount}`);
    console.log(`   - Linked nodes verified: ${linkedNodes.length}`);
    console.log('');
    console.log('✅ Drill-down navigation is now ready!');
    console.log('   Click any linked item node to navigate to its workflow.');
    console.log('');
    
  } catch (_error) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.error('❌ Linking failed:', error);
    console.log('');
    process.exit(1);
  }
}

main();
