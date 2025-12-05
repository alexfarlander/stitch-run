#!/usr/bin/env tsx

/**
 * Verification script for Support Handler workflow
 * 
 * This script verifies that the Support Handler workflow was seeded correctly:
 * 1. Workflow exists in database
 * 2. Has correct parent_id linking to 'item-help-desk'
 * 3. Contains all 3 required nodes
 * 4. Has correct edge connections
 * 5. Node configurations are valid
 * 
 * Usage:
 *   tsx scripts/verify-support-handler-workflow.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE any imports
config({ path: resolve(process.cwd(), '.env.local') });

// Dynamic import to ensure env vars are loaded first
async function getClient() {
  const { getAdminClient } = await import('../src/lib/supabase/client');
  return getAdminClient();
}

const WORKFLOW_NAME = 'Support Handler Logic';
const PARENT_ITEM_ID = 'item-help-desk';

async function verify() {
  console.log('🔍 Verifying Support Handler workflow...\n');
  
  const _supabase = await getClient();
  let hasErrors = false;
  
  try {
    // Step 1: Check if workflow exists
    console.log('📋 Step 1: Checking workflow existence...');
    const { data: workflow, error: workflowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('name', WORKFLOW_NAME)
      .eq('canvas_type', 'workflow')
      .maybeSingle();
    
    if (workflowError) {
      console.error('❌ Error querying workflow:', workflowError.message);
      hasErrors = true;
      return;
    }
    
    if (!workflow) {
      console.error('❌ Workflow not found. Run seed-support-handler-workflow.ts first.');
      hasErrors = true;
      return;
    }
    
    console.log(`✅ Workflow found (ID: ${workflow.id})\n`);
    
    // Step 2: Verify parent_id links to BMC
    console.log('📋 Step 2: Verifying parent canvas link...');
    const { data: bmc, error: bmcError } = await supabase
      .from('stitch_flows')
      .select('id, graph')
      .eq('id', workflow.parent_id)
      .eq('canvas_type', 'bmc')
      .maybeSingle();
    
    if (bmcError || !bmc) {
      console.error('❌ Parent BMC canvas not found');
      hasErrors = true;
    } else {
      console.log(`✅ Linked to BMC canvas (ID: ${bmc.id})\n`);
      
      // Verify parent item node exists in BMC
      const parentNode = bmc.graph.nodes.find((n: unknown) => n.id === PARENT_ITEM_ID);
      if (!parentNode) {
        console.error(`❌ Parent item node '${PARENT_ITEM_ID}' not found in BMC`);
        hasErrors = true;
      } else {
        console.log(`✅ Parent item node '${PARENT_ITEM_ID}' exists in BMC\n`);
      }
    }
    
    // Step 3: Verify workflow structure
    console.log('📋 Step 3: Verifying workflow structure...');
    const { nodes, edges } = workflow.graph;
    
    // Check node count
    if (nodes.length !== 3) {
      console.error(`❌ Expected 3 nodes, found ${nodes.length}`);
      hasErrors = true;
    } else {
      console.log(`✅ Correct node count: 3\n`);
    }
    
    // Check edge count
    if (edges.length !== 2) {
      console.error(`❌ Expected 2 edges, found ${edges.length}`);
      hasErrors = true;
    } else {
      console.log(`✅ Correct edge count: 2\n`);
    }
    
    // Step 4: Verify individual nodes
    console.log('📋 Step 4: Verifying individual nodes...');
    
    const expectedNodes = [
      { id: 'analyze-ticket', label: 'Analyze Ticket', workerType: 'claude' },
      { id: 'ai-suggest', label: 'AI Suggest', workerType: 'claude' },
      { id: 'escalate-if-needed', label: 'Escalate if Needed', workerType: 'data-transform' },
    ];
    
    for (const expected of expectedNodes) {
      const node = nodes.find((n: unknown) => n.id === expected.id);
      
      if (!node) {
        console.error(`❌ Node '${expected.id}' not found`);
        hasErrors = true;
        continue;
      }
      
      if (node.data.label !== expected.label) {
        console.error(`❌ Node '${expected.id}' has wrong label: ${node.data.label}`);
        hasErrors = true;
      }
      
      if (node.data.workerType !== expected.workerType) {
        console.error(`❌ Node '${expected.id}' has wrong workerType: ${node.data.workerType}`);
        hasErrors = true;
      }
      
      if (!node.data.description) {
        console.error(`❌ Node '${expected.id}' missing description`);
        hasErrors = true;
      }
      
      if (!node.data.config) {
        console.error(`❌ Node '${expected.id}' missing config`);
        hasErrors = true;
      }
      
      console.log(`✅ Node '${expected.id}' configured correctly`);
    }
    
    console.log();
    
    // Step 5: Verify edge connections
    console.log('📋 Step 5: Verifying edge connections...');
    
    const expectedEdges = [
      { source: 'analyze-ticket', target: 'ai-suggest' },
      { source: 'ai-suggest', target: 'escalate-if-needed' },
    ];
    
    for (const expected of expectedEdges) {
      const edge = edges.find(
        (e: unknown) => e.source === expected.source && e.target === expected.target
      );
      
      if (!edge) {
        console.error(`❌ Edge ${expected.source} → ${expected.target} not found`);
        hasErrors = true;
      } else {
        console.log(`✅ Edge ${expected.source} → ${expected.target} exists`);
      }
    }
    
    console.log();
    
    // Step 6: Verify specific configurations
    console.log('📋 Step 6: Verifying node configurations...');
    
    const analyzeTicket = nodes.find((n: unknown) => n.id === 'analyze-ticket');
    if (analyzeTicket) {
      if (!analyzeTicket.data.config.prompt) {
        console.error('❌ Analyze Ticket missing prompt');
        hasErrors = true;
      } else {
        console.log('✅ Analyze Ticket has prompt configuration');
      }
      
      if (!analyzeTicket.data.config.model) {
        console.error('❌ Analyze Ticket missing model');
        hasErrors = true;
      } else {
        console.log('✅ Analyze Ticket has model configuration');
      }
    }
    
    const aiSuggest = nodes.find((n: unknown) => n.id === 'ai-suggest');
    if (aiSuggest) {
      if (!aiSuggest.data.config.prompt) {
        console.error('❌ AI Suggest missing prompt');
        hasErrors = true;
      } else {
        console.log('✅ AI Suggest has prompt configuration');
      }
    }
    
    const escalate = nodes.find((n: unknown) => n.id === 'escalate-if-needed');
    if (escalate) {
      if (!escalate.data.config.escalationRules) {
        console.error('❌ Escalate if Needed missing escalation rules');
        hasErrors = true;
      } else {
        console.log('✅ Escalate if Needed has escalation rules');
      }
      
      if (!escalate.data.config.escalationActions) {
        console.error('❌ Escalate if Needed missing escalation actions');
        hasErrors = true;
      } else {
        console.log('✅ Escalate if Needed has escalation actions');
      }
    }
    
    console.log();
    
    // Final summary
    if (hasErrors) {
      console.log('❌ Verification completed with errors\n');
      process.exit(1);
    } else {
      console.log('✅ All verifications passed!\n');
      console.log('📊 Summary:');
      console.log(`   - Workflow: ${WORKFLOW_NAME}`);
      console.log(`   - Workflow ID: ${workflow.id}`);
      console.log(`   - Parent Node: ${PARENT_ITEM_ID}`);
      console.log('   - Nodes: 3 (Analyze Ticket, AI Suggest, Escalate if Needed)');
      console.log('   - Edges: 2 (sequential flow)');
      console.log('   - All configurations valid ✓');
      console.log('\n🎉 Support Handler workflow is ready to use!');
      process.exit(0);
    }
    
  } catch (_error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verify();
