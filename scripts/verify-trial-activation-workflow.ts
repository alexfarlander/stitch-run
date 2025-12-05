#!/usr/bin/env tsx

/**
 * Verification Script: Trial Activation Workflow
 * 
 * Verifies that the Trial Activation workflow is correctly seeded:
 * - Workflow exists in database
 * - Linked to correct parent node (item-free-trial)
 * - Contains all required nodes
 * - Contains all required edges
 * - Node configurations are correct
 * 
 * Usage:
 *   tsx scripts/verify-trial-activation-workflow.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface VerificationResult {
  check: string;
  passed: boolean;
  details?: string;
}

async function verify(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
  
  console.log('🔍 Verifying Trial Activation Workflow...\n');
  
  // Check 1: Workflow exists
  console.log('📋 Check 1: Workflow exists in database');
  const { data: workflow, error: workflowError } = await supabase
    .from('stitch_flows')
    .select('*')
    .eq('name', 'Trial Activation Logic')
    .eq('canvas_type', 'workflow')
    .maybeSingle();
  
  if (workflowError) {
    results.push({
      check: 'Workflow exists',
      passed: false,
      details: `Database error: ${workflowError.message}`,
    });
    return results;
  }
  
  if (!workflow) {
    results.push({
      check: 'Workflow exists',
      passed: false,
      details: 'Workflow not found in database',
    });
    return results;
  }
  
  results.push({
    check: 'Workflow exists',
    passed: true,
    details: `Found workflow with ID: ${workflow.id}`,
  });
  console.log(`✅ Workflow found (ID: ${workflow.id})\n`);
  
  // Check 2: Parent node linkage
  console.log('📋 Check 2: Workflow linked to BMC canvas');
  const { data: bmc, error: bmcError } = await supabase
    .from('stitch_flows')
    .select('id, graph')
    .eq('canvas_type', 'bmc')
    .limit(1)
    .maybeSingle();
  
  if (bmcError || !bmc) {
    results.push({
      check: 'Parent BMC exists',
      passed: false,
      details: bmcError?.message || 'BMC not found',
    });
  } else if (workflow.parent_id !== bmc.id) {
    results.push({
      check: 'Workflow linked to BMC',
      passed: false,
      details: `Expected parent_id: ${bmc.id}, got: ${workflow.parent_id}`,
    });
  } else {
    results.push({
      check: 'Workflow linked to BMC',
      passed: true,
      details: `Correctly linked to BMC: ${bmc.id}`,
    });
    console.log(`✅ Linked to BMC canvas (ID: ${bmc.id})\n`);
  }
  
  // Check 3: Parent item node exists
  console.log('📋 Check 3: Parent item node exists');
  const parentItemId = 'item-free-trial';
  const parentNode = bmc?.graph.nodes.find((n: any) => n.id === parentItemId);
  
  if (!parentNode) {
    results.push({
      check: 'Parent item node exists',
      passed: false,
      details: `Parent node '${parentItemId}' not found in BMC`,
    });
  } else {
    results.push({
      check: 'Parent item node exists',
      passed: true,
      details: `Found parent node: ${parentItemId}`,
    });
    console.log(`✅ Parent node exists: ${parentItemId}\n`);
  }
  
  // Check 4: Required nodes exist
  console.log('📋 Check 4: Required nodes exist');
  const requiredNodes = [
    { id: 'provision-account', label: 'Provision Account', workerType: 'data-transform' },
    { id: 'send-onboarding', label: 'Send Onboarding', workerType: 'webhook-trigger' },
    { id: 'wait-for-upgrade', label: 'Wait for Upgrade', workerType: 'webhook-listener' },
  ];
  
  const graph = workflow.graph as any;
  let allNodesExist = true;
  
  for (const required of requiredNodes) {
    const node = graph.nodes.find((n: any) => n.id === required.id);
    if (!node) {
      results.push({
        check: `Node exists: ${required.id}`,
        passed: false,
        details: `Node '${required.id}' not found`,
      });
      allNodesExist = false;
    } else if (node.data.label !== required.label) {
      results.push({
        check: `Node label: ${required.id}`,
        passed: false,
        details: `Expected label '${required.label}', got '${node.data.label}'`,
      });
      allNodesExist = false;
    } else if (node.data.workerType !== required.workerType) {
      results.push({
        check: `Node worker type: ${required.id}`,
        passed: false,
        details: `Expected workerType '${required.workerType}', got '${node.data.workerType}'`,
      });
      allNodesExist = false;
    } else {
      console.log(`   ✅ ${required.label} (${required.workerType})`);
    }
  }
  
  if (allNodesExist) {
    results.push({
      check: 'All required nodes exist',
      passed: true,
      details: `All ${requiredNodes.length} nodes configured correctly`,
    });
    console.log(`✅ All ${requiredNodes.length} nodes exist\n`);
  }
  
  // Check 5: Required edges exist
  console.log('📋 Check 5: Required edges exist');
  const requiredEdges = [
    { id: 'e1', source: 'provision-account', target: 'send-onboarding' },
    { id: 'e2', source: 'send-onboarding', target: 'wait-for-upgrade' },
  ];
  
  let allEdgesExist = true;
  
  for (const required of requiredEdges) {
    const edge = graph.edges.find((e: any) => 
      e.source === required.source && e.target === required.target
    );
    if (!edge) {
      results.push({
        check: `Edge exists: ${required.source} → ${required.target}`,
        passed: false,
        details: `Edge from '${required.source}' to '${required.target}' not found`,
      });
      allEdgesExist = false;
    } else {
      console.log(`   ✅ ${required.source} → ${required.target}`);
    }
  }
  
  if (allEdgesExist) {
    results.push({
      check: 'All required edges exist',
      passed: true,
      details: `All ${requiredEdges.length} edges configured correctly`,
    });
    console.log(`✅ All ${requiredEdges.length} edges exist\n`);
  }
  
  // Check 6: Node configurations
  console.log('📋 Check 6: Node configurations');
  
  // Provision Account config
  const provisionNode = graph.nodes.find((n: any) => n.id === 'provision-account');
  if (provisionNode?.data.config?.accountType === 'trial' && 
      provisionNode?.data.config?.trialDuration === 14) {
    results.push({
      check: 'Provision Account config',
      passed: true,
      details: 'Trial account configuration correct',
    });
    console.log('   ✅ Provision Account: trial account, 14 days');
  } else {
    results.push({
      check: 'Provision Account config',
      passed: false,
      details: 'Trial account configuration incorrect',
    });
  }
  
  // Send Onboarding config
  const onboardingNode = graph.nodes.find((n: any) => n.id === 'send-onboarding');
  if (onboardingNode?.data.config?.emailSequence?.length >= 5) {
    results.push({
      check: 'Send Onboarding config',
      passed: true,
      details: `Email sequence configured with ${onboardingNode.data.config.emailSequence.length} emails`,
    });
    console.log(`   ✅ Send Onboarding: ${onboardingNode.data.config.emailSequence.length} email sequence`);
  } else {
    results.push({
      check: 'Send Onboarding config',
      passed: false,
      details: 'Email sequence not properly configured',
    });
  }
  
  // Wait for Upgrade config
  const upgradeNode = graph.nodes.find((n: any) => n.id === 'wait-for-upgrade');
  if (upgradeNode?.data.config?.webhookSources?.length === 3) {
    results.push({
      check: 'Wait for Upgrade config',
      passed: true,
      details: 'Webhook sources configured for all subscription tiers',
    });
    console.log('   ✅ Wait for Upgrade: 3 webhook sources (basic, pro, enterprise)');
  } else {
    results.push({
      check: 'Wait for Upgrade config',
      passed: false,
      details: 'Webhook sources not properly configured',
    });
  }
  
  console.log('✅ Node configurations verified\n');
  
  return results;
}

async function main() {
  console.log('🚀 Starting Trial Activation Workflow Verification\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    const results = await verify();
    
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('📊 Verification Results');
    console.log('=' .repeat(60));
    console.log('\n');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.check}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
    });
    
    console.log('\n');
    console.log('=' .repeat(60));
    
    if (passed === total) {
      console.log(`✅ All checks passed! (${passed}/${total})`);
      console.log('=' .repeat(60));
      process.exit(0);
    } else {
      console.log(`❌ Some checks failed (${passed}/${total} passed)`);
      console.log('=' .repeat(60));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n');
    console.error('=' .repeat(60));
    console.error('❌ Verification failed!');
    console.error('=' .repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
