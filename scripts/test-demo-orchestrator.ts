/**
 * Test Demo Orchestrator
 * 
 * Comprehensive test of the demo orchestrator system:
 * 1. Test demo reset endpoint
 * 2. Test demo start endpoint
 * 3. Verify entities are in correct positions after reset
 * 4. Verify financial metrics are reset
 */

import { config } from 'dotenv';
import { getAdminClient } from '../src/lib/supabase/client';
import { CLOCKWORK_ENTITIES } from '../src/lib/seeds/clockwork-entities';
import { getFinancialMetrics } from '../src/lib/metrics/financial-updates';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testDemoOrchestrator() {
  console.log('=== Testing Demo Orchestrator System ===\n');
  
  const supabase = getAdminClient();
  
  try {
    // Step 1: Get BMC canvas ID
    console.log('Step 1: Finding BMC canvas...');
    const { data: bmcList, error: bmcError } = await supabase
      .from('stitch_flows')
      .select('id, name')
      .eq('canvas_type', 'bmc')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (bmcError || !bmcList || bmcList.length === 0) {
      console.error('❌ BMC canvas not found');
      process.exit(1);
    }
    
    const canvasId = bmcList[0].id;
    console.log(`✅ Found BMC canvas: ${bmcList[0].name} (${canvasId})\n`);
    
    // Step 2: Test demo reset
    console.log('Step 2: Testing demo reset...');
    const resetResponse = await fetch(`${BASE_URL}/api/demo/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!resetResponse.ok) {
      const errorText = await resetResponse.text();
      console.error('❌ Reset failed:', errorText);
      process.exit(1);
    }
    
    const resetResult = await resetResponse.json();
    console.log('✅ Reset response:', resetResult);
    
    if (!resetResult.success) {
      console.error('❌ Reset did not succeed');
      process.exit(1);
    }
    
    console.log(`✅ Reset ${resetResult.entities_reset} entities\n`);
    
    // Step 3: Verify entities are in correct positions
    console.log('Step 3: Verifying entity positions...');
    let positionErrors = 0;
    
    for (const entitySeed of CLOCKWORK_ENTITIES) {
      const { data: entity, error: entityError } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', canvasId)
        .eq('email', entitySeed.email)
        .single();
      
      if (entityError || !entity) {
        console.error(`❌ Entity not found: ${entitySeed.name}`);
        positionErrors++;
        continue;
      }
      
      // Check position
      const expectedNodeId = entitySeed.current_node_id || null;
      const expectedEdgeId = entitySeed.current_edge_id || null;
      
      if (entity.current_node_id !== expectedNodeId) {
        console.error(`❌ ${entitySeed.name}: Wrong node position`);
        console.error(`   Expected: ${expectedNodeId}`);
        console.error(`   Got: ${entity.current_node_id}`);
        positionErrors++;
      } else if (entity.current_edge_id !== expectedEdgeId) {
        console.error(`❌ ${entitySeed.name}: Wrong edge position`);
        console.error(`   Expected: ${expectedEdgeId}`);
        console.error(`   Got: ${entity.current_edge_id}`);
        positionErrors++;
      } else {
        const position = expectedNodeId || expectedEdgeId || 'unknown';
        console.log(`✅ ${entitySeed.name}: ${position}`);
      }
    }
    
    if (positionErrors > 0) {
      console.error(`\n❌ ${positionErrors} position errors found`);
      process.exit(1);
    }
    
    console.log('\n✅ All entities in correct positions\n');
    
    // Step 4: Verify financial metrics
    console.log('Step 4: Verifying financial metrics...');
    const metrics = await getFinancialMetrics();
    
    const expectedMetrics: Record<string, number> = {
      'item-mrr': 12450,
      'item-arr': 149400,
      'item-ltv': 5000,
      'item-stripe-fees': 361,
      'item-claude-cost': 150,
      'item-elevenlabs-cost': 75,
      'item-minimax-cost': 200,
    };
    
    let metricErrors = 0;
    
    for (const [nodeId, expectedValue] of Object.entries(expectedMetrics)) {
      const actualValue = metrics[nodeId];
      
      if (actualValue === undefined) {
        console.error(`❌ ${nodeId}: Not found`);
        metricErrors++;
      } else if (actualValue !== expectedValue) {
        console.error(`❌ ${nodeId}: Expected ${expectedValue}, got ${actualValue}`);
        metricErrors++;
      } else {
        console.log(`✅ ${nodeId}: ${actualValue}`);
      }
    }
    
    if (metricErrors > 0) {
      console.error(`\n❌ ${metricErrors} metric errors found`);
      process.exit(1);
    }
    
    console.log('\n✅ All financial metrics correct\n');
    
    // Step 5: Test demo start
    console.log('Step 5: Testing demo start...');
    const startResponse = await fetch(`${BASE_URL}/api/demo/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('❌ Start failed:', errorText);
      process.exit(1);
    }
    
    const startResult = await startResponse.json();
    console.log('✅ Start response:', startResult);
    
    if (!startResult.success) {
      console.error('❌ Start did not succeed');
      process.exit(1);
    }
    
    console.log(`✅ Demo started with ${startResult.events} events`);
    console.log(`✅ Duration: ${startResult.duration}ms\n`);
    
    // Summary
    console.log('=== Test Summary ===');
    console.log('✅ Demo reset endpoint working');
    console.log('✅ Demo start endpoint working');
    console.log('✅ Entity positions reset correctly');
    console.log('✅ Financial metrics reset correctly');
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testDemoOrchestrator();
