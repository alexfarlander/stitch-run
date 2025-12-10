#!/usr/bin/env tsx
/**
 * Verification Script: Demo Scheduling Workflow
 * 
 * Verifies that the Demo Scheduling workflow was created correctly:
 * - Workflow exists in database
 * - Has correct parent_id link to 'item-demo-call'
 * - Contains all required nodes (Send Email, Wait for Booking, Pre-Demo Prep)
 * - Contains all required edges
 * - Nodes have correct worker types and configurations
 * 
 * Usage:
 *   tsx scripts/verify-demo-scheduling-workflow.ts
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

interface VerificationResult {
  check: string;
  passed: boolean;
  details?: string;
}

async function verifyDemoSchedulingWorkflow(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  
  console.log('🔍 Verifying Demo Scheduling Workflow...\n');
  
  // Check 1: Workflow exists
  console.log('📋 Check 1: Workflow exists in database');
  const { data: workflow, error: workflowError } = await _supabase
    .from('stitch_flows')
    .select('*')
    .eq('name', 'Demo Scheduling Logic')
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
  console.log(`✅ Workflow exists (ID: ${workflow.id})\n`);
  
  // Check 2: Parent ID links to BMC canvas
  console.log('📋 Check 2: Parent ID links to BMC canvas');
  const { data: bmc, error: bmcError } = await _supabase
    .from('stitch_flows')
    .select('id')
    .eq('canvas_type', 'bmc')
    .limit(1)
    .maybeSingle();
  
  if (bmcError || !bmc) {
    results.push({
      check: 'Parent ID links to BMC',
      passed: false,
      details: 'BMC canvas not found',
    });
  } else if (workflow.parent_id !== bmc.id) {
    results.push({
      check: 'Parent ID links to BMC',
      passed: false,
      details: `Expected parent_id: ${bmc.id}, got: ${workflow.parent_id}`,
    });
  } else {
    results.push({
      check: 'Parent ID links to BMC',
      passed: true,
      details: `Correctly linked to BMC canvas: ${bmc.id}`,
    });
    console.log(`✅ Parent ID correctly links to BMC canvas\n`);
  }
  
  // Check 3: Verify parent item node exists
  console.log('📋 Check 3: Parent item node exists in BMC');
  const { data: bmcFull, error: bmcFullError } = await _supabase
    .from('stitch_flows')
    .select('graph')
    .eq('canvas_type', 'bmc')
    .limit(1)
    .maybeSingle();
  
  if (bmcFullError || !bmcFull) {
    results.push({
      check: 'Parent item node exists',
      passed: false,
      details: 'Could not fetch BMC graph',
    });
  } else {
    const parentNode = bmcFull.graph.nodes.find((n: any) => n.id === 'item-demo-call');
    if (!parentNode) {
      results.push({
        check: 'Parent item node exists',
        passed: false,
        details: 'Parent node "item-demo-call" not found in BMC',
      });
    } else {
      results.push({
        check: 'Parent item node exists',
        passed: true,
        details: 'Parent node "item-demo-call" found in BMC',
      });
      console.log(`✅ Parent item node "item-demo-call" exists in BMC\n`);
    }
  }
  
  // Check 4: Required nodes exist
  console.log('📋 Check 4: Required nodes exist');
  const requiredNodes = [
    { id: 'send-email', label: 'Send Email', workerType: 'webhook-trigger' },
    { id: 'wait-for-booking', label: 'Wait for Booking', workerType: 'webhook-listener' },
    { id: 'pre-demo-prep', label: 'Pre-Demo Prep', workerType: 'data-transform' },
  ];
  
  const graph = workflow.graph as { nodes: unknown[]; edges: unknown[] };
  let allNodesExist = true;
  const nodeDetails: string[] = [];
  
  for (const required of requiredNodes) {
    const node = graph.nodes.find((n: any) => n.id === required.id);
    if (!node) {
      allNodesExist = false;
      nodeDetails.push(`❌ Missing node: ${required.id}`);
    } else if (node.data.label !== required.label) {
      allNodesExist = false;
      nodeDetails.push(`❌ Node ${required.id} has wrong label: ${node.data.label}`);
    } else if (node.data.workerType !== required.workerType) {
      allNodesExist = false;
      nodeDetails.push(`❌ Node ${required.id} has wrong workerType: ${node.data.workerType}`);
    } else {
      nodeDetails.push(`✅ ${required.label} (${required.workerType})`);
    }
  }
  
  results.push({
    check: 'Required nodes exist',
    passed: allNodesExist,
    details: nodeDetails.join('\n   '),
  });
  
  if (allNodesExist) {
    console.log(`✅ All 3 required nodes exist with correct configuration\n`);
  } else {
    console.log(`❌ Some nodes are missing or misconfigured\n`);
  }
  
  // Check 5: Required edges exist
  console.log('📋 Check 5: Required edges exist');
  const requiredEdges = [
    { source: 'send-email', target: 'wait-for-booking' },
    { source: 'wait-for-booking', target: 'pre-demo-prep' },
  ];
  
  let allEdgesExist = true;
  const edgeDetails: string[] = [];
  
  for (const required of requiredEdges) {
    const edge = graph.edges.find(
      (e: any) => e.source === required.source && e.target === required.target
    );
    if (!edge) {
      allEdgesExist = false;
      edgeDetails.push(`❌ Missing edge: ${required.source} → ${required.target}`);
    } else {
      edgeDetails.push(`✅ ${required.source} → ${required.target}`);
    }
  }
  
  results.push({
    check: 'Required edges exist',
    passed: allEdgesExist,
    details: edgeDetails.join('\n   '),
  });
  
  if (allEdgesExist) {
    console.log(`✅ All 2 required edges exist\n`);
  } else {
    console.log(`❌ Some edges are missing\n`);
  }
  
  // Check 6: Node configurations
  console.log('📋 Check 6: Node configurations are valid');
  const configChecks: string[] = [];
  let allConfigsValid = true;
  
  // Check Send Email node
  const sendEmailNode = graph.nodes.find((n: any) => n.id === 'send-email');
  if (sendEmailNode) {
    if (!sendEmailNode.data.config?.url) {
      allConfigsValid = false;
      configChecks.push('❌ Send Email missing URL config');
    } else {
      configChecks.push('✅ Send Email has URL config');
    }
  }
  
  // Check Wait for Booking node
  const waitNode = graph.nodes.find((n: any) => n.id === 'wait-for-booking');
  if (waitNode) {
    if (!waitNode.data.config?.webhookSource) {
      allConfigsValid = false;
      configChecks.push('❌ Wait for Booking missing webhookSource config');
    } else {
      configChecks.push('✅ Wait for Booking has webhookSource config');
    }
  }
  
  // Check Pre-Demo Prep node
  const prepNode = graph.nodes.find((n: any) => n.id === 'pre-demo-prep');
  if (prepNode) {
    if (!prepNode.data.config?.tasks || !Array.isArray(prepNode.data.config.tasks)) {
      allConfigsValid = false;
      configChecks.push('❌ Pre-Demo Prep missing tasks array');
    } else {
      configChecks.push('✅ Pre-Demo Prep has tasks array');
    }
  }
  
  results.push({
    check: 'Node configurations valid',
    passed: allConfigsValid,
    details: configChecks.join('\n   '),
  });
  
  if (allConfigsValid) {
    console.log(`✅ All node configurations are valid\n`);
  } else {
    console.log(`❌ Some node configurations are invalid\n`);
  }
  
  return results;
}

async function main() {
  console.log('🚀 Starting Demo Scheduling Workflow Verification\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    const results = await verifyDemoSchedulingWorkflow();
    
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('📊 Verification Results:');
    console.log('=' .repeat(60));
    console.log('\n');
    
    let allPassed = true;
    for (const result of results) {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.check}`);
      if (result.details) {
        console.log(`   ${result.details.replace(/\n/g, '\n   ')}`);
      }
      console.log('');
      
      if (!result.passed) {
        allPassed = false;
      }
    }
    
    console.log('=' .repeat(60));
    if (allPassed) {
      console.log('✅ All checks passed! Demo Scheduling workflow is correctly configured.');
    } else {
      console.log('❌ Some checks failed. Please review the details above.');
    }
    console.log('=' .repeat(60));
    
    process.exit(allPassed ? 0 : 1);
  } catch (_error) {
    console.error('\n');
    console.error('=' .repeat(60));
    console.error('❌ Verification failed with error!');
    console.error('=' .repeat(60));
    console.error(_error);
    process.exit(1);
  }
}

main();
