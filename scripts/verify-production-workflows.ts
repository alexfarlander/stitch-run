#!/usr/bin/env tsx
/**
 * Verify Production System Workflows
 * 
 * Verifies that all four production system workflows exist and are correctly configured:
 * 1. CRM Sync (Validate → Transform → API Call)
 * 2. Analytics Update (Increment Metric)
 * 3. Slack Notify (Format → Post to Channel)
 * 4. Stripe Sync (Create/Update Subscription)
 * 
 * Usage:
 *   tsx scripts/verify-production-workflows.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WorkflowCheck {
  name: string;
  parentNodeId: string;
  expectedNodeCount: number;
  expectedEdgeCount: number;
  nodeLabels: string[];
}

const WORKFLOWS_TO_CHECK: WorkflowCheck[] = [
  {
    name: 'CRM Sync',
    parentNodeId: 'item-crm',
    expectedNodeCount: 3,
    expectedEdgeCount: 2,
    nodeLabels: ['Validate', 'Transform', 'API Call'],
  },
  {
    name: 'Analytics Update',
    parentNodeId: 'item-analytics',
    expectedNodeCount: 1,
    expectedEdgeCount: 0,
    nodeLabels: ['Increment Metric'],
  },
  {
    name: 'Slack Notify',
    parentNodeId: 'item-slack',
    expectedNodeCount: 2,
    expectedEdgeCount: 1,
    nodeLabels: ['Format', 'Post to Channel'],
  },
  {
    name: 'Stripe Sync',
    parentNodeId: 'item-stripe',
    expectedNodeCount: 1,
    expectedEdgeCount: 0,
    nodeLabels: ['Create/Update Subscription'],
  },
];

async function main() {
  console.log('🔍 Verifying Production System Workflows\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  let allPassed = true;
  
  try {
    // Get BMC canvas
    const { data: bmc, error: bmcError } = await supabase
      .from('stitch_flows')
      .select('id, graph')
      .eq('canvas_type', 'bmc')
      .limit(1)
      .maybeSingle();
    
    if (bmcError || !bmc) {
      console.error('❌ Failed to fetch BMC canvas');
      process.exit(1);
    }
    
    console.log(`✅ Found BMC canvas: ${bmc.id}\n`);
    
    // Check each workflow
    for (const check of WORKFLOWS_TO_CHECK) {
      console.log(`📋 Checking: ${check.name}`);
      console.log('-'.repeat(60));
      
      // Verify parent node exists in BMC
      const parentNode = bmc.graph.nodes.find((n: unknown) => n.id === check.parentNodeId);
      if (!parentNode) {
        console.error(`❌ Parent node '${check.parentNodeId}' not found in BMC`);
        allPassed = false;
        console.log('\n');
        continue;
      }
      console.log(`✅ Parent node exists: ${check.parentNodeId}`);
      
      // Fetch workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('stitch_flows')
        .select('id, name, canvas_type, parent_id, graph')
        .eq('name', check.name)
        .eq('canvas_type', 'workflow')
        .maybeSingle();
      
      if (workflowError || !workflow) {
        console.error(`❌ Workflow '${check.name}' not found`);
        allPassed = false;
        console.log('\n');
        continue;
      }
      
      console.log(`✅ Workflow exists: ${workflow.id}`);
      
      // Verify parent_id
      if (workflow.parent_id !== bmc.id) {
        console.error(`❌ Workflow parent_id mismatch. Expected: ${bmc.id}, Got: ${workflow.parent_id}`);
        allPassed = false;
      } else {
        console.log(`✅ Correct parent_id: ${workflow.parent_id}`);
      }
      
      // Verify node count
      const nodeCount = workflow.graph.nodes.length;
      if (nodeCount !== check.expectedNodeCount) {
        console.error(`❌ Node count mismatch. Expected: ${check.expectedNodeCount}, Got: ${nodeCount}`);
        allPassed = false;
      } else {
        console.log(`✅ Correct node count: ${nodeCount}`);
      }
      
      // Verify edge count
      const edgeCount = workflow.graph.edges.length;
      if (edgeCount !== check.expectedEdgeCount) {
        console.error(`❌ Edge count mismatch. Expected: ${check.expectedEdgeCount}, Got: ${edgeCount}`);
        allPassed = false;
      } else {
        console.log(`✅ Correct edge count: ${edgeCount}`);
      }
      
      // Verify node labels
      const actualLabels = workflow.graph.nodes.map((n: unknown) => n.data.label);
      const missingLabels = check.nodeLabels.filter(label => !actualLabels.includes(label));
      if (missingLabels.length > 0) {
        console.error(`❌ Missing node labels: ${missingLabels.join(', ')}`);
        allPassed = false;
      } else {
        console.log(`✅ All expected node labels present`);
      }
      
      // Display node details
      console.log('\n📦 Nodes:');
      workflow.graph.nodes.forEach((node: any, index: number) => {
        console.log(`   ${index + 1}. ${node.data.label} (${node.data.workerType})`);
      });
      
      if (workflow.graph.edges.length > 0) {
        console.log('\n🔗 Edges:');
        workflow.graph.edges.forEach((edge: any, index: number) => {
          const sourceNode = workflow.graph.nodes.find((n: unknown) => n.id === edge.source);
          const targetNode = workflow.graph.nodes.find((n: unknown) => n.id === edge.target);
          console.log(`   ${index + 1}. ${sourceNode?.data.label} → ${targetNode?.data.label}`);
        });
      }
      
      console.log('\n');
    }
    
    // Final summary
    console.log('=' .repeat(60));
    if (allPassed) {
      console.log('✅ All Production System Workflows Verified Successfully!\n');
      console.log('📊 Summary:');
      console.log('   - CRM Sync: ✅ Validated');
      console.log('   - Analytics Update: ✅ Validated');
      console.log('   - Slack Notify: ✅ Validated');
      console.log('   - Stripe Sync: ✅ Validated');
      console.log('\n🎉 All 4 production workflows are correctly configured!');
    } else {
      console.log('❌ Some Production System Workflows Failed Verification\n');
      console.log('Please check the errors above and re-run the seed script.');
      process.exit(1);
    }
    
  } catch (_error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

main();
