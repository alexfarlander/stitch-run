/**
 * Test script for run status indicators
 * Creates a test run and updates node statuses to verify visual indicators
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRunStatus() {
  console.log('🧪 Testing Run Status Indicators...\n');
  
  // Get the BMC canvas
  const { data: canvases, error: canvasError } = await supabase
    .from('stitch_flows')
    .select('*')
    .eq('canvas_type', 'bmc')
    .limit(1);
  
  const canvas = canvases?.[0];
  
  if (canvasError || !canvas) {
    console.error('❌ Failed to find BMC canvas:', canvasError?.message);
    return;
  }
  
  console.log(`✅ Found BMC canvas: ${canvas.name} (${canvas.id})`);
  
  // Initialize node states from graph
  const nodeStates: unknown = {};
  for (const node of canvas.graph.nodes) {
    nodeStates[node.id] = { status: 'pending' };
  }
  
  // Create a test run
  console.log('\n📝 Creating test run...');
  const { data: run, error: runError } = await supabase
    .from('stitch_runs')
    .insert({
      flow_id: canvas.id,
      flow_version_id: canvas.current_version_id || null,
      node_states: nodeStates,
      trigger: {
        type: 'manual',
        source: null,
        event_id: null,
        timestamp: new Date().toISOString(),
      },
    })
    .select()
    .single();
  
  if (runError || !run) {
    console.error('❌ Failed to create run:', runError?.message);
    return;
  }
  
  console.log(`✅ Created run: ${run.id}`);
  
  // Get some node IDs from the canvas
  const nodeIds = canvas.graph.nodes
    .filter((n: unknown) => n.type === 'section')
    .slice(0, 3)
    .map((n: unknown) => n.id);
  
  if (nodeIds.length === 0) {
    console.error('❌ No section nodes found in canvas');
    return;
  }
  
  console.log(`\n🎯 Testing status updates on nodes: ${nodeIds.join(', ')}`);
  
  // Helper function to update node state
  async function updateNode(nodeId: string, status: string, error?: string) {
    await supabase.rpc('update_node_state', {
      p_run_id: run.id,
      p_node_id: nodeId,
      p_status: status,
      p_output: null,
      p_error: error || null,
    });
  }
  
  // Test 1: Set first node to running
  console.log('\n1️⃣ Setting first node to "running"...');
  await updateNode(nodeIds[0], 'running');
  console.log(`✅ Node ${nodeIds[0]} is now running (should show pulsing blue)`);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Set first node to completed, second to running
  console.log('\n2️⃣ Setting first node to "completed", second to "running"...');
  await updateNode(nodeIds[0], 'completed');
  await updateNode(nodeIds[1], 'running');
  console.log(`✅ Node ${nodeIds[0]} completed (should show green glow)`);
  console.log(`✅ Node ${nodeIds[1]} running (should show pulsing blue)`);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Set second node to failed
  console.log('\n3️⃣ Setting second node to "failed"...');
  await updateNode(nodeIds[1], 'failed', 'Test error: Something went wrong!');
  console.log(`✅ Node ${nodeIds[1]} failed (should show red with error icon)`);
  
  // Test 4: Set third node to completed
  if (nodeIds[2]) {
    console.log('\n4️⃣ Setting third node to "completed"...');
    await updateNode(nodeIds[2], 'completed');
    console.log(`✅ Node ${nodeIds[2]} completed (should show green glow)`);
  }
  
  console.log('\n✨ Test complete!');
  console.log(`\n📊 View the run with status indicators at:`);
  console.log(`   🔗 http://localhost:3000/flow/${run.id}`);
  console.log(`\n   Canvas ID: ${canvas.id}`);
  console.log(`   Run ID: ${run.id}`);
  console.log('\n💡 The status indicators are visible on the /flow/[runId] route.');
  console.log('   You should see nodes with colored borders and animations based on their status.');
}

testRunStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
