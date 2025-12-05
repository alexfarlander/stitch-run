/**
 * Test script for MCP webhook endpoint
 * 
 * Tests the /api/webhooks/node/[nodeId] endpoint with various scenarios:
 * - Valid webhook event
 * - Invalid JSON
 * - Empty payload
 * - Non-existent node
 */

import { supabase } from '../src/lib/supabase/client';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testMCPWebhook() {
  console.log('🧪 Testing MCP Webhook Endpoint\n');
  
  // Step 1: Create a test flow with a test node
  console.log('1️⃣ Creating test flow with test node...');
  const testNodeId = 'test-mcp-node-' + Date.now();
  
  const { data: flow, error: flowError } = await supabase
    .from('stitch_flows')
    .insert({
      name: 'MCP Webhook Test Flow',
      graph: {
        nodes: [
          {
            id: testNodeId,
            type: 'asset',
            position: { x: 100, y: 100 },
            data: {
              label: 'Test MCP Node',
              mcp: {
                createdBy: 'mcp',
                createdAt: new Date().toISOString()
              }
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
  
  console.log(`✅ Created test flow with node ID: ${testNodeId}\n`);
  
  // Step 2: Test valid webhook event
  console.log('2️⃣ Testing valid webhook event...');
  const validResponse = await fetch(`${BASE_URL}/api/webhooks/node/${testNodeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'form_submission',
      data: {
        email: 'test@example.com',
        name: 'Test User'
      },
      timestamp: new Date().toISOString()
    })
  });
  
  const validResult = await validResponse.json();
  console.log('Response:', validResponse.status, validResult);
  
  if (validResponse.status === 200 && validResult.success) {
    console.log('✅ Valid webhook event accepted\n');
  } else {
    console.log('❌ Valid webhook event failed\n');
  }
  
  // Step 3: Test invalid JSON
  console.log('3️⃣ Testing invalid JSON...');
  const invalidJsonResponse = await fetch(`${BASE_URL}/api/webhooks/node/${testNodeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: 'invalid json {'
  });
  
  const invalidJsonResult = await invalidJsonResponse.json();
  console.log('Response:', invalidJsonResponse.status, invalidJsonResult);
  
  if (invalidJsonResponse.status === 400) {
    console.log('✅ Invalid JSON rejected correctly\n');
  } else {
    console.log('❌ Invalid JSON not handled correctly\n');
  }
  
  // Step 4: Test empty payload
  console.log('4️⃣ Testing empty payload...');
  const emptyPayloadResponse = await fetch(`${BASE_URL}/api/webhooks/node/${testNodeId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  const emptyPayloadResult = await emptyPayloadResponse.json();
  console.log('Response:', emptyPayloadResponse.status, emptyPayloadResult);
  
  if (emptyPayloadResponse.status === 400) {
    console.log('✅ Empty payload rejected correctly\n');
  } else {
    console.log('❌ Empty payload not handled correctly\n');
  }
  
  // Step 5: Test non-existent node
  console.log('5️⃣ Testing non-existent node...');
  const nonExistentResponse = await fetch(`${BASE_URL}/api/webhooks/node/non-existent-node`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'test',
      data: { test: true }
    })
  });
  
  const nonExistentResult = await nonExistentResponse.json();
  console.log('Response:', nonExistentResponse.status, nonExistentResult);
  
  if (nonExistentResponse.status === 404) {
    console.log('✅ Non-existent node rejected correctly\n');
  } else {
    console.log('❌ Non-existent node not handled correctly\n');
  }
  
  // Step 6: Verify event was stored in database
  console.log('6️⃣ Verifying event storage...');
  const { data: events, error: eventsError } = await supabase
    .from('stitch_mcp_webhook_events')
    .select('*')
    .eq('node_id', testNodeId);
  
  if (eventsError) {
    console.error('❌ Failed to query events:', eventsError);
  } else {
    console.log(`✅ Found ${events?.length || 0} event(s) in database`);
    if (events && events.length > 0) {
      console.log('Event details:', JSON.stringify(events[0], null, 2));
    }
  }
  
  // Step 7: Cleanup
  console.log('\n7️⃣ Cleaning up...');
  await supabase.from('stitch_mcp_webhook_events').delete().eq('node_id', testNodeId);
  await supabase.from('stitch_flows').delete().eq('id', flow.id);
  console.log('✅ Cleanup complete\n');
  
  console.log('🎉 MCP Webhook endpoint tests complete!');
}

// Run the test
testMCPWebhook().catch(console.error);
