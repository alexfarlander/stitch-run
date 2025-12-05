/**
 * Test script for system edge trigger logic
 * Verifies that system edges can be triggered and executed
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { triggerSystemEdges } from '../src/lib/engine/system-edge-trigger';
import { getAdminClient } from '../src/lib/supabase/client';

async function testSystemEdgeTrigger() {
  console.log('🧪 Testing System Edge Trigger Logic\n');

  const _supabase = getAdminClient();

  try {
    // Find the BMC canvas (get the most recent one)
    const { data: bmcCanvases, error: canvasError } = await supabase
      .from('stitch_flows')
      .select('id, name, graph')
      .eq('canvas_type', 'bmc')
      .order('created_at', { ascending: false })
      .limit(1);

    if (canvasError || !bmcCanvases || bmcCanvases.length === 0) {
      console.error('❌ Failed to find BMC canvas:', canvasError);
      return;
    }

    const bmcCanvas = bmcCanvases[0];

    console.log(`✅ Found BMC canvas: ${bmcCanvas.name} (${bmcCanvas.id})\n`);

    // Count system edges
    const systemEdges = bmcCanvas.graph.edges.filter(
      (edge: unknown) => edge.type === 'system'
    );
    console.log(`📊 Total system edges in BMC: ${systemEdges.length}\n`);

    // Find a test entity
    const { data: testEntity, error: entityError } = await supabase
      .from('stitch_entities')
      .select('id, name, email, current_node_id')
      .eq('canvas_id', bmcCanvas.id)
      .limit(1)
      .single();

    if (entityError || !testEntity) {
      console.error('❌ No test entity found:', entityError);
      return;
    }

    console.log(`✅ Found test entity: ${testEntity.name} (${testEntity.email})`);
    console.log(`   Current node: ${testEntity.current_node_id}\n`);

    // Find system edges for this node
    const nodeSystemEdges = systemEdges.filter(
      (edge: unknown) => edge.source === testEntity.current_node_id
    );

    if (nodeSystemEdges.length === 0) {
      console.log(`ℹ️  No system edges connected to node ${testEntity.current_node_id}`);
      console.log('   This is expected for some nodes.\n');
      
      // Try a node that should have system edges
      const testNodeId = 'item-linkedin-ads';
      const testNodeEdges = systemEdges.filter(
        (edge: unknown) => edge.source === testNodeId
      );
      
      if (testNodeEdges.length > 0) {
        console.log(`🔄 Testing with node ${testNodeId} instead...`);
        console.log(`   System edges: ${testNodeEdges.length}\n`);
        
        console.log('🚀 Triggering system edges...\n');
        await triggerSystemEdges(testNodeId, testEntity.id, bmcCanvas.id);
        console.log('✅ System edges triggered successfully!\n');
        
        console.log('📋 System edges that were triggered:');
        testNodeEdges.forEach((edge: unknown) => {
          console.log(`   - ${edge.id}: ${edge.source} -> ${edge.target} (${edge.data?.systemAction})`);
        });
      } else {
        console.log('⚠️  Could not find a node with system edges to test');
      }
    } else {
      console.log(`🔄 Triggering ${nodeSystemEdges.length} system edge(s)...\n`);
      await triggerSystemEdges(testEntity.current_node_id, testEntity.id, bmcCanvas.id);
      console.log('✅ System edges triggered successfully!\n');
      
      console.log('📋 System edges that were triggered:');
      nodeSystemEdges.forEach((edge: unknown) => {
        console.log(`   - ${edge.id}: ${edge.source} -> ${edge.target} (${edge.data?.systemAction})`);
      });
    }

    console.log('\n✅ Test completed successfully!');
  } catch (_error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSystemEdgeTrigger();
