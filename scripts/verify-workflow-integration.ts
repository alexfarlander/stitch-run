/**
 * Workflow Integration Verification Script
 * 
 * Verifies that all drill-down workflows are properly seeded and linked to the BMC canvas
 * 
 * Validates: Requirements 13.4
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
  console.log('🔍 Verifying Workflow Integration\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Get BMC canvas
    console.log('📋 Step 1: Fetching BMC canvas...');
    const { data: bmc, error: bmcError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'bmc')
      .limit(1)
      .maybeSingle();
    
    if (bmcError) {
      throw new Error(`Failed to fetch BMC: ${bmcError.message}`);
    }
    
    if (!bmc) {
      throw new Error('BMC canvas not found');
    }
    
    console.log(`✅ Found BMC: ${bmc.name} (${bmc.id})\n`);
    
    // Step 2: Get all workflows
    console.log('📋 Step 2: Fetching workflows...');
    const { data: workflows, error: workflowsError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'workflow')
      .eq('parent_id', bmc.id);
    
    if (workflowsError) {
      throw new Error(`Failed to fetch workflows: ${workflowsError.message}`);
    }
    
    console.log(`✅ Found ${workflows?.length || 0} workflows\n`);
    
    // Step 3: Verify expected workflows
    console.log('📋 Step 3: Verifying expected workflows...\n');
    
    const expectedWorkflows = [
      { name: 'Lead Capture Logic', minNodes: 4 },
      { name: 'Demo Scheduling Logic', minNodes: 3 },
      { name: 'Trial Activation Logic', minNodes: 3 },
      { name: 'Support Handler Logic', minNodes: 3 },
      { name: 'CRM Sync', minNodes: 3 },
      { name: 'Analytics Update', minNodes: 1 },
      { name: 'Slack Notify', minNodes: 2 },
      { name: 'Stripe Sync', minNodes: 1 },
    ];
    
    const checks = [];
    
    for (const expected of expectedWorkflows) {
      const workflow = workflows?.find(w => w.name === expected.name);
      const exists = !!workflow;
      const nodeCount = workflow?.graph?.nodes?.length || 0;
      const hasEnoughNodes = nodeCount >= expected.minNodes;
      const linkedToBMC = workflow?.parent_id === bmc.id;
      
      checks.push({
        name: expected.name,
        exists,
        nodeCount,
        hasEnoughNodes,
        linkedToBMC,
        pass: exists && hasEnoughNodes && linkedToBMC,
      });
      
      const icon = exists && hasEnoughNodes && linkedToBMC ? '✅' : '❌';
      console.log(`${icon} ${expected.name}`);
      console.log(`   - Exists: ${exists ? 'Yes' : 'No'}`);
      if (exists) {
        console.log(`   - Nodes: ${nodeCount} (min: ${expected.minNodes})`);
        console.log(`   - Linked to BMC: ${linkedToBMC ? 'Yes' : 'No'}`);
        console.log(`   - ID: ${workflow?.id}`);
      }
      console.log('');
    }
    
    // Step 4: Summary
    console.log('═'.repeat(60));
    console.log('\n📊 Summary:\n');
    
    const allPassed = checks.every(c => c.pass);
    const passedCount = checks.filter(c => c.pass).length;
    
    console.log(`   Total Workflows: ${workflows?.length || 0}`);
    console.log(`   Expected Workflows: ${expectedWorkflows.length}`);
    console.log(`   Passed Checks: ${passedCount}/${expectedWorkflows.length}`);
    console.log('');
    
    if (allPassed) {
      console.log('🎉 All workflows are properly integrated!');
      console.log('');
      console.log('✅ Validation Results:');
      console.log('   - All 8 workflows exist');
      console.log('   - All workflows have required nodes');
      console.log('   - All workflows are linked to BMC canvas');
      console.log('   - Ready for drill-down navigation');
      console.log('');
    } else {
      console.log('⚠️  Some workflows are missing or incomplete');
      console.log('   Please run: npx tsx scripts/seed-clockwork.ts');
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
