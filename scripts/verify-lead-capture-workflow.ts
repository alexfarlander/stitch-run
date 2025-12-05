/**
 * Verification Script: Lead Capture Workflow
 * 
 * Verifies that the Lead Capture workflow is correctly seeded with:
 * - 4 nodes: Validate Lead → Score Lead → CRM Sync → Assign SDR
 * - 3 edges connecting the nodes
 * - Proper parent_id linking to BMC canvas
 * - Correct node types and configurations
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

async function verifyLeadCaptureWorkflow(): Promise<void> {
  console.log('🔍 Verifying Lead Capture Workflow...\n');
  
  const results: VerificationResult[] = [];
  
  try {
    // Check 1: Workflow exists
    console.log('📋 Check 1: Workflow exists in database...');
    const { data: workflow, error: workflowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('name', 'Lead Capture Logic')
      .eq('canvas_type', 'workflow')
      .maybeSingle();
    
    if (workflowError) {
      results.push({
        check: 'Workflow exists',
        passed: false,
        details: `Database error: ${workflowError.message}`,
      });
      throw new Error('Cannot continue verification without workflow');
    }
    
    if (!workflow) {
      results.push({
        check: 'Workflow exists',
        passed: false,
        details: 'Workflow not found in database',
      });
      throw new Error('Workflow not found. Run: tsx scripts/seed-clockwork.ts');
    }
    
    results.push({
      check: 'Workflow exists',
      passed: true,
      details: `Found workflow with ID: ${workflow.id}`,
    });
    console.log(`✅ Workflow found (ID: ${workflow.id})\n`);
    
    // Check 2: Workflow has correct parent_id (links to BMC)
    console.log('📋 Check 2: Workflow links to BMC canvas...');
    const { data: bmc, error: bmcError } = await supabase
      .from('stitch_flows')
      .select('id')
      .eq('canvas_type', 'bmc')
      .limit(1)
      .maybeSingle();
    
    if (bmcError || !bmc) {
      results.push({
        check: 'Workflow parent_id links to BMC',
        passed: false,
        details: 'BMC canvas not found',
      });
    } else if (workflow.parent_id === bmc.id) {
      results.push({
        check: 'Workflow parent_id links to BMC',
        passed: true,
        details: `parent_id: ${workflow.parent_id}`,
      });
      console.log(`✅ Workflow correctly linked to BMC (${bmc.id})\n`);
    } else {
      results.push({
        check: 'Workflow parent_id links to BMC',
        passed: false,
        details: `Expected parent_id: ${bmc.id}, got: ${workflow.parent_id}`,
      });
      console.log(`❌ Workflow parent_id mismatch\n`);
    }
    
    // Check 3: Workflow has 4 nodes
    console.log('📋 Check 3: Workflow has 4 nodes...');
    const nodes = workflow.graph?.nodes || [];
    
    if (nodes.length === 4) {
      results.push({
        check: 'Workflow has 4 nodes',
        passed: true,
        details: `Found ${nodes.length} nodes`,
      });
      console.log(`✅ Workflow has 4 nodes\n`);
    } else {
      results.push({
        check: 'Workflow has 4 nodes',
        passed: false,
        details: `Expected 4 nodes, found ${nodes.length}`,
      });
      console.log(`❌ Expected 4 nodes, found ${nodes.length}\n`);
    }
    
    // Check 4: Nodes have correct IDs and types
    console.log('📋 Check 4: Nodes have correct IDs and types...');
    const expectedNodes = [
      { id: 'validate-lead', type: 'Worker', label: 'Validate Lead' },
      { id: 'score-lead', type: 'Worker', label: 'Score Lead' },
      { id: 'crm-sync', type: 'Worker', label: 'CRM Sync' },
      { id: 'assign-sdr', type: 'Worker', label: 'Assign SDR' },
    ];
    
    let allNodesCorrect = true;
    for (const expected of expectedNodes) {
      const node = nodes.find((n: unknown) => n.id === expected.id);
      if (!node) {
        results.push({
          check: `Node '${expected.id}' exists`,
          passed: false,
          details: 'Node not found',
        });
        console.log(`❌ Node '${expected.id}' not found`);
        allNodesCorrect = false;
      } else if (node.type !== expected.type) {
        results.push({
          check: `Node '${expected.id}' has correct type`,
          passed: false,
          details: `Expected type '${expected.type}', got '${node.type}'`,
        });
        console.log(`❌ Node '${expected.id}' has wrong type: ${node.type}`);
        allNodesCorrect = false;
      } else if (node.data?.label !== expected.label) {
        results.push({
          check: `Node '${expected.id}' has correct label`,
          passed: false,
          details: `Expected label '${expected.label}', got '${node.data?.label}'`,
        });
        console.log(`❌ Node '${expected.id}' has wrong label: ${node.data?.label}`);
        allNodesCorrect = false;
      } else {
        console.log(`✅ Node '${expected.id}' is correct (${expected.type}: ${expected.label})`);
      }
    }
    
    if (allNodesCorrect) {
      results.push({
        check: 'All nodes have correct IDs, types, and labels',
        passed: true,
      });
    }
    console.log('');
    
    // Check 5: Workflow has 3 edges
    console.log('📋 Check 5: Workflow has 3 edges...');
    const edges = workflow.graph?.edges || [];
    
    if (edges.length === 3) {
      results.push({
        check: 'Workflow has 3 edges',
        passed: true,
        details: `Found ${edges.length} edges`,
      });
      console.log(`✅ Workflow has 3 edges\n`);
    } else {
      results.push({
        check: 'Workflow has 3 edges',
        passed: false,
        details: `Expected 3 edges, found ${edges.length}`,
      });
      console.log(`❌ Expected 3 edges, found ${edges.length}\n`);
    }
    
    // Check 6: Edges connect nodes correctly
    console.log('📋 Check 6: Edges connect nodes correctly...');
    const expectedEdges = [
      { source: 'validate-lead', target: 'score-lead' },
      { source: 'score-lead', target: 'crm-sync' },
      { source: 'crm-sync', target: 'assign-sdr' },
    ];
    
    let allEdgesCorrect = true;
    for (const expected of expectedEdges) {
      const edge = edges.find(
        (e: unknown) => e.source === expected.source && e.target === expected.target
      );
      if (!edge) {
        results.push({
          check: `Edge ${expected.source} → ${expected.target}`,
          passed: false,
          details: 'Edge not found',
        });
        console.log(`❌ Edge ${expected.source} → ${expected.target} not found`);
        allEdgesCorrect = false;
      } else {
        console.log(`✅ Edge ${expected.source} → ${expected.target} exists`);
      }
    }
    
    if (allEdgesCorrect) {
      results.push({
        check: 'All edges connect correctly',
        passed: true,
      });
    }
    console.log('');
    
    // Check 7: Node configurations
    console.log('📋 Check 7: Node configurations...');
    
    // Validate Lead node
    const validateNode = nodes.find((n: unknown) => n.id === 'validate-lead');
    if (validateNode?.data?.workerType === 'data-transform') {
      results.push({
        check: 'Validate Lead has correct workerType',
        passed: true,
        details: 'workerType: data-transform',
      });
      console.log(`✅ Validate Lead has workerType: data-transform`);
    } else {
      results.push({
        check: 'Validate Lead has correct workerType',
        passed: false,
        details: `Expected 'data-transform', got '${validateNode?.data?.workerType}'`,
      });
      console.log(`❌ Validate Lead has wrong workerType`);
    }
    
    // Score Lead node
    const scoreNode = nodes.find((n: unknown) => n.id === 'score-lead');
    if (scoreNode?.data?.workerType === 'claude') {
      results.push({
        check: 'Score Lead has correct workerType',
        passed: true,
        details: 'workerType: claude',
      });
      console.log(`✅ Score Lead has workerType: claude`);
    } else {
      results.push({
        check: 'Score Lead has correct workerType',
        passed: false,
        details: `Expected 'claude', got '${scoreNode?.data?.workerType}'`,
      });
      console.log(`❌ Score Lead has wrong workerType`);
    }
    
    // CRM Sync node
    const crmNode = nodes.find((n: unknown) => n.id === 'crm-sync');
    if (crmNode?.data?.workerType === 'webhook-trigger') {
      results.push({
        check: 'CRM Sync has correct workerType',
        passed: true,
        details: 'workerType: webhook-trigger',
      });
      console.log(`✅ CRM Sync has workerType: webhook-trigger`);
    } else {
      results.push({
        check: 'CRM Sync has correct workerType',
        passed: false,
        details: `Expected 'webhook-trigger', got '${crmNode?.data?.workerType}'`,
      });
      console.log(`❌ CRM Sync has wrong workerType`);
    }
    
    // Assign SDR node
    const assignNode = nodes.find((n: unknown) => n.id === 'assign-sdr');
    if (assignNode?.data?.workerType === 'data-transform') {
      results.push({
        check: 'Assign SDR has correct workerType',
        passed: true,
        details: 'workerType: data-transform',
      });
      console.log(`✅ Assign SDR has workerType: data-transform`);
    } else {
      results.push({
        check: 'Assign SDR has correct workerType',
        passed: false,
        details: `Expected 'data-transform', got '${assignNode?.data?.workerType}'`,
      });
      console.log(`❌ Assign SDR has wrong workerType`);
    }
    
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`✅ Passed: ${passed}/${total} checks (${percentage}%)\n`);
    
    if (passed === total) {
      console.log('🎉 All checks passed! Lead Capture workflow is correctly configured.\n');
      console.log('📋 Workflow Structure:');
      console.log('   Validate Lead → Score Lead → CRM Sync → Assign SDR\n');
      console.log('✅ Ready for Requirements 7.1, 7.2, 7.3');
    } else {
      console.log('❌ Some checks failed. Review the details above.\n');
      
      const failed = results.filter(r => !r.passed);
      console.log('Failed checks:');
      failed.forEach(r => {
        console.log(`   - ${r.check}`);
        if (r.details) {
          console.log(`     ${r.details}`);
        }
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    
    process.exit(passed === total ? 0 : 1);
    
  } catch (_error) {
    console.error('\n❌ Verification failed:', error);
    
    if (results.length > 0) {
      console.log('\n📊 Partial Results:');
      results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`${icon} ${r.check}`);
        if (r.details) {
          console.log(`   ${r.details}`);
        }
      });
    }
    
    process.exit(1);
  }
}

// Run verification
verifyLeadCaptureWorkflow();
