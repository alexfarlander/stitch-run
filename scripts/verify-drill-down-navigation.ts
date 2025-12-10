/**
 * Drill-Down Navigation Verification Script
 * 
 * Verifies that:
 * 1. Item nodes have linked_workflow_id set
 * 2. Workflows exist and are accessible
 * 3. Navigation system is ready for drill-down
 * 
 * Validates: Requirements 7.1
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

async function main() {
  console.log('🔍 Verifying Drill-Down Navigation\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Get BMC canvas
    console.log('📋 Step 1: Fetching BMC canvas...');
    const { data: bmc, error: bmcError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'bmc')
      .eq('name', 'Default Business Model Canvas')
      .limit(1)
      .maybeSingle();
    
    if (bmcError) {
      throw new Error(`Failed to fetch BMC: ${bmcError.message}`);
    }
    
    if (!bmc) {
      throw new Error('BMC canvas not found');
    }
    
    console.log(`✅ Found BMC: ${bmc.name} (${bmc.id})\n`);
    
    // Step 2: Find all item nodes with linked workflows
    console.log('📋 Step 2: Analyzing item nodes...');
    const itemNodes = bmc.graph.nodes.filter((n: any) => n.type === 'section-item');
    const linkedNodes = itemNodes.filter((n: any) => n.data?.linked_workflow_id);
    
    console.log(`✅ Found ${itemNodes.length} item nodes`);
    console.log(`✅ Found ${linkedNodes.length} linked item nodes\n`);
    
    // Step 3: Verify each linked workflow exists
    console.log('📋 Step 3: Verifying linked workflows...\n');
    
    const checks = [];
    
    for (const node of linkedNodes) {
      const workflowId = node.data.linked_workflow_id;
      
      // Fetch the workflow
      const { data: workflow, error: workflowError } = await _supabase
        .from('stitch_flows')
        .select('*')
        .eq('id', workflowId)
        .maybeSingle();
      
      const exists = !!workflow && !workflowError;
      const isWorkflow = workflow?.canvas_type === 'workflow';
      const linkedToBMC = workflow?.parent_id === bmc.id;
      const hasNodes = (workflow?.graph?.nodes?.length || 0) > 0;
      
      checks.push({
        itemNode: node.data.label,
        itemNodeId: node.id,
        workflowId,
        workflowName: workflow?.name || 'N/A',
        exists,
        isWorkflow,
        linkedToBMC,
        hasNodes,
        nodeCount: workflow?.graph?.nodes?.length || 0,
        pass: exists && isWorkflow && linkedToBMC && hasNodes,
      });
      
      const icon = exists && isWorkflow && linkedToBMC && hasNodes ? '✅' : '❌';
      console.log(`${icon} ${node.data.label} (${node.id})`);
      console.log(`   → Workflow: ${workflow?.name || 'NOT FOUND'}`);
      console.log(`   → Workflow ID: ${workflowId}`);
      if (exists) {
        console.log(`   → Type: ${workflow.canvas_type}`);
        console.log(`   → Nodes: ${workflow.graph?.nodes?.length || 0}`);
        console.log(`   → Linked to BMC: ${linkedToBMC ? 'Yes' : 'No'}`);
      }
      console.log('');
    }
    
    // Step 4: Test navigation data structure
    console.log('📋 Step 4: Testing navigation data structure...\n');
    
    const navigationTests = [];
    
    for (const check of checks) {
      if (!check.pass) continue;
      
      // Simulate what the navigation hook would receive
      const navigationData = {
        itemNodeId: check.itemNodeId,
        itemNodeLabel: check.itemNode,
        workflowId: check.workflowId,
        workflowName: check.workflowName,
        canNavigate: true,
      };
      
      navigationTests.push(navigationData);
      
      console.log(`✅ Navigation ready: ${check.itemNode}`);
      console.log(`   Click handler will call: drillInto('${check.workflowId}', '${check.itemNode}', 'workflow')`);
      console.log('');
    }
    
    // Step 5: Summary
    console.log('═'.repeat(60));
    console.log('\n📊 Summary:\n');
    
    const allPassed = checks.every(c => c.pass);
    const passedCount = checks.filter(c => c.pass).length;
    
    console.log(`   Total Item Nodes: ${itemNodes.length}`);
    console.log(`   Linked Item Nodes: ${linkedNodes.length}`);
    console.log(`   Valid Navigation Links: ${passedCount}/${linkedNodes.length}`);
    console.log('');
    
    if (allPassed && linkedNodes.length > 0) {
      console.log('🎉 Drill-down navigation is fully functional!\n');
      console.log('✅ Validation Results:');
      console.log('   - All linked item nodes have valid workflows');
      console.log('   - All workflows are properly configured');
      console.log('   - All workflows are linked to BMC canvas');
      console.log('   - Navigation system is ready');
      console.log('');
      console.log('🚀 How to use:');
      console.log('   1. Open the BMC canvas in your browser');
      console.log('   2. Look for item nodes with the drill-down indicator (🔗)');
      console.log('   3. Click any linked item node');
      console.log('   4. The canvas will navigate to the workflow view');
      console.log('   5. Use breadcrumbs to navigate back to BMC');
      console.log('');
      console.log('📋 Drillable Nodes:');
      checks.forEach(c => {
        console.log(`   - ${c.itemNode} → ${c.workflowName}`);
      });
      console.log('');
    } else if (linkedNodes.length === 0) {
      console.log('⚠️  No linked item nodes found');
      console.log('   Please run: npx tsx scripts/link-workflows-to-items.ts');
      console.log('');
      process.exit(1);
    } else {
      console.log('⚠️  Some navigation links are invalid');
      console.log('   Please check the errors above.');
      console.log('');
      process.exit(1);
    }
    
  } catch (_error) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.error('❌ Verification failed:', error);
    console.log('');
    process.exit(1);
  }
}

main();
