/**
 * Test script for MCP Uptime Monitoring API
 * 
 * Tests the uptime ping endpoint with various scenarios:
 * 1. Valid uptime ping with status
 * 2. Valid uptime ping without status
 * 3. Invalid node ID (404)
 * 4. Multiple pings to same node (upsert behavior)
 */

import { supabase } from '../src/lib/supabase/client';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testUptimeEndpoint() {
  console.log('🧪 Testing MCP Uptime Monitoring API\n');
  
  // Step 1: Create a test flow with a node
  console.log('📝 Step 1: Creating test flow with node...');
  
  const testNodeId = `test-uptime-node-${Date.now()}`;
  const testFlowId = `test-uptime-flow-${Date.now()}`;
  
  const { data: flow, error: flowError } = await supabase
    .from('stitch_flows')
    .insert({
      id: testFlowId,
      name: 'Test Uptime Flow',
      graph: {
        nodes: [
          {
            id: testNodeId,
            type: 'asset',
            position: { x: 100, y: 100 },
            data: {
              label: 'Test Asset',
              icon: '🌐',
              url: 'https://example.com'
            }
          }
        ],
        edges: []
      }
    })
    .select()
    .single();
  
  if (flowError) {
    console.error('❌ Failed to create test flow:', flowError);
    return;
  }
  
  console.log('✅ Test flow created:', testFlowId);
  console.log('✅ Test node created:', testNodeId);
  
  // Step 2: Test valid uptime ping with status
  console.log('\n📝 Step 2: Testing uptime ping with status...');
  
  const pingWithStatus = await fetch(`${BASE_URL}/api/uptime/ping/${testNodeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'healthy',
      metadata: {
        version: '1.0.0',
        uptime: 3600
      }
    })
  });
  
  const pingWithStatusResult = await pingWithStatus.json();
  console.log('Response:', JSON.stringify(pingWithStatusResult, null, 2));
  
  if (pingWithStatus.ok && pingWithStatusResult.success) {
    console.log('✅ Uptime ping with status successful');
  } else {
    console.error('❌ Uptime ping with status failed');
  }
  
  // Step 3: Verify uptime record in database
  console.log('\n📝 Step 3: Verifying uptime record in database...');
  
  const { data: uptimeRecord, error: uptimeError } = await supabase
    .from('stitch_node_uptime')
    .select('*')
    .eq('node_id', testNodeId)
    .single();
  
  if (uptimeError) {
    console.error('❌ Failed to fetch uptime record:', uptimeError);
  } else {
    console.log('✅ Uptime record found:', JSON.stringify(uptimeRecord, null, 2));
    
    if (uptimeRecord.status === 'healthy') {
      console.log('✅ Status correctly stored');
    } else {
      console.error('❌ Status not correctly stored');
    }
    
    if (uptimeRecord.metadata?.version === '1.0.0') {
      console.log('✅ Metadata correctly stored');
    } else {
      console.error('❌ Metadata not correctly stored');
    }
  }
  
  // Step 4: Test uptime ping without status (minimal ping)
  console.log('\n📝 Step 4: Testing minimal uptime ping...');
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  const minimalPing = await fetch(`${BASE_URL}/api/uptime/ping/${testNodeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  const minimalPingResult = await minimalPing.json();
  console.log('Response:', JSON.stringify(minimalPingResult, null, 2));
  
  if (minimalPing.ok && minimalPingResult.success) {
    console.log('✅ Minimal uptime ping successful');
    
    // Verify timestamp was updated
    const { data: updatedRecord } = await supabase
      .from('stitch_node_uptime')
      .select('last_seen')
      .eq('node_id', testNodeId)
      .single();
    
    if (updatedRecord && updatedRecord.last_seen !== uptimeRecord?.last_seen) {
      console.log('✅ Timestamp was updated (upsert working)');
    } else {
      console.error('❌ Timestamp was not updated');
    }
  } else {
    console.error('❌ Minimal uptime ping failed');
  }
  
  // Step 5: Test with non-existent node (should return 404)
  console.log('\n📝 Step 5: Testing with non-existent node...');
  
  const invalidPing = await fetch(`${BASE_URL}/api/uptime/ping/non-existent-node`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'healthy' })
  });
  
  const invalidPingResult = await invalidPing.json();
  console.log('Response:', JSON.stringify(invalidPingResult, null, 2));
  
  if (invalidPing.status === 404) {
    console.log('✅ Correctly returned 404 for non-existent node');
  } else {
    console.error('❌ Did not return 404 for non-existent node');
  }
  
  // Step 6: Test empty body (should still work)
  console.log('\n📝 Step 6: Testing with empty body...');
  
  const emptyBodyPing = await fetch(`${BASE_URL}/api/uptime/ping/${testNodeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const emptyBodyResult = await emptyBodyPing.json();
  console.log('Response:', JSON.stringify(emptyBodyResult, null, 2));
  
  if (emptyBodyPing.ok && emptyBodyResult.success) {
    console.log('✅ Empty body ping successful');
  } else {
    console.error('❌ Empty body ping failed');
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  
  await supabase.from('stitch_node_uptime').delete().eq('node_id', testNodeId);
  await supabase.from('stitch_flows').delete().eq('id', testFlowId);
  
  console.log('✅ Cleanup complete');
  
  console.log('\n✨ All uptime endpoint tests completed!');
}

// Run the test
testUptimeEndpoint().catch(console.error);
