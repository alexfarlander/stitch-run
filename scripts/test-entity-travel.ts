/**
 * Test Entity Travel Animation
 * 
 * This script tests that entities travel along edges with animation
 * instead of teleporting directly to the target node.
 * 
 * Run with: npx tsx scripts/test-entity-travel.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🧪 Testing Entity Travel Animation\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Get the BMC canvas
    console.log('📊 Step 1: Finding BMC canvas...');
    const { data: bmcCanvas, error: canvasError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'bmc')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (canvasError || !bmcCanvas) {
      console.error('❌ BMC canvas not found. Run seed-clockwork.ts first.');
      process.exit(1);
    }
    
    console.log(`   ✅ Found BMC: ${bmcCanvas.name} (${bmcCanvas.id})\n`);
    
    // Step 2: Get an entity
    console.log('📊 Step 2: Finding test entity...');
    const { data: entities, error: entitiesError } = await _supabase
      .from('stitch_entities')
      .select('*')
      .eq('canvas_id', bmcCanvas.id)
      .limit(1);
    
    if (entitiesError || !entities || entities.length === 0) {
      console.error('❌ No entities found. Run seed-clockwork.ts first.');
      process.exit(1);
    }
    
    const testEntity = entities[0];
    console.log(`   ✅ Found entity: ${testEntity.name} (${testEntity.email})`);
    console.log(`   📍 Current position: ${testEntity.current_node_id || 'none'}\n`);
    
    // Step 3: Find an edge from the current node
    console.log('📊 Step 3: Finding journey edge...');
    const currentNodeId = testEntity.current_node_id;
    
    if (!currentNodeId) {
      console.error('❌ Entity is not at a node. Cannot test edge travel.');
      process.exit(1);
    }
    
    const journeyEdges = bmcCanvas.graph.edges.filter(
      (edge: any) => edge.source === currentNodeId && (edge.type === 'journey' || !edge.type)
    );
    
    if (journeyEdges.length === 0) {
      console.error(`❌ No journey edges from node ${currentNodeId}`);
      process.exit(1);
    }
    
    const testEdge = journeyEdges[0];
    console.log(`   ✅ Found edge: ${testEdge.source} -> ${testEdge.target}`);
    console.log(`   🔗 Edge ID: ${testEdge.id}\n`);
    
    // Step 4: Trigger entity travel
    console.log('📊 Step 4: Starting entity travel...');
    console.log(`   🚀 Moving ${testEntity.name} along edge ${testEdge.id}...\n`);
    
    // Start travel
    const { error: startError } = await _supabase
      .from('stitch_entities')
      .update({
        current_node_id: null,
        current_edge_id: testEdge.id,
        edge_progress: 0,
        destination_node_id: testEdge.target,
        updated_at: new Date().toISOString(),
      })
      .eq('id', testEntity.id);
    
    if (startError) {
      console.error('❌ Failed to start entity travel:', startError);
      process.exit(1);
    }
    
    // Create edge_start event
    const { error: eventError } = await _supabase
      .from('stitch_journey_events')
      .insert({
        entity_id: testEntity.id,
        canvas_id: bmcCanvas.id,
        event_type: 'edge_start',
        edge_id: testEdge.id,
        metadata: {
          source_node: testEdge.source,
          target_node: testEdge.target,
        },
      });
    
    if (eventError) {
      console.warn('⚠️  Failed to create edge_start event:', eventError);
    }
    
    console.log('   ✅ Entity travel started!');
    console.log('   ⏱️  Animation duration: 2 seconds\n');
    
    // Step 5: Check entity state during travel
    console.log('📊 Step 5: Checking entity state during travel...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: travelingEntity, error: checkError } = await _supabase
      .from('stitch_entities')
      .select('*')
      .eq('id', testEntity.id)
      .single();
    
    if (checkError) {
      console.error('❌ Failed to check entity state:', checkError);
      process.exit(1);
    }
    
    console.log('   📍 Entity state:');
    console.log(`      - current_node_id: ${travelingEntity.current_node_id || 'null'}`);
    console.log(`      - current_edge_id: ${travelingEntity.current_edge_id || 'null'}`);
    console.log(`      - edge_progress: ${travelingEntity.edge_progress ?? 'null'}`);
    console.log(`      - destination_node_id: ${travelingEntity.destination_node_id || 'null'}\n`);
    
    // Validation checks
    const checks = [
      { 
        name: 'Entity is on edge (current_edge_id set)', 
        pass: travelingEntity.current_edge_id === testEdge.id 
      },
      { 
        name: 'Entity not at node (current_node_id null)', 
        pass: travelingEntity.current_node_id === null 
      },
      { 
        name: 'Edge progress initialized (0)', 
        pass: travelingEntity.edge_progress === 0 
      },
      { 
        name: 'Destination set', 
        pass: travelingEntity.destination_node_id === testEdge.target 
      },
    ];
    
    console.log('   ✓ Validation Checks:');
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`      ${icon} ${check.name}`);
    });
    console.log('');
    
    const allPassed = checks.every(c => c.pass);
    
    if (!allPassed) {
      console.log('⚠️  Some validation checks failed');
      console.log('   Entity may not be traveling correctly.\n');
      process.exit(1);
    }
    
    // Step 6: Wait for arrival
    console.log('📊 Step 6: Waiting for entity to arrive...');
    console.log('   ⏱️  Waiting 2.5 seconds for animation to complete...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const { data: arrivedEntity, error: arrivalError } = await _supabase
      .from('stitch_entities')
      .select('*')
      .eq('id', testEntity.id)
      .single();
    
    if (arrivalError) {
      console.error('❌ Failed to check arrival state:', arrivalError);
      process.exit(1);
    }
    
    console.log('   📍 Entity state after arrival:');
    console.log(`      - current_node_id: ${arrivedEntity.current_node_id || 'null'}`);
    console.log(`      - current_edge_id: ${arrivedEntity.current_edge_id || 'null'}`);
    console.log(`      - edge_progress: ${arrivedEntity.edge_progress ?? 'null'}`);
    console.log(`      - destination_node_id: ${arrivedEntity.destination_node_id || 'null'}\n`);
    
    // Arrival validation
    const arrivalChecks = [
      { 
        name: 'Entity arrived at destination node', 
        pass: arrivedEntity.current_node_id === testEdge.target 
      },
      { 
        name: 'Entity no longer on edge (current_edge_id null)', 
        pass: arrivedEntity.current_edge_id === null 
      },
      { 
        name: 'Edge progress cleared', 
        pass: arrivedEntity.edge_progress === null 
      },
      { 
        name: 'Destination cleared', 
        pass: arrivedEntity.destination_node_id === null 
      },
    ];
    
    console.log('   ✓ Arrival Validation:');
    arrivalChecks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`      ${icon} ${check.name}`);
    });
    console.log('');
    
    const allArrivalPassed = arrivalChecks.every(c => c.pass);
    
    console.log('═'.repeat(60));
    console.log('');
    
    if (allArrivalPassed) {
      console.log('🎉 Entity travel animation test PASSED!');
      console.log('');
      console.log('✅ Entities now travel along edges with animation');
      console.log('✅ Edge visibility should work correctly');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Start the dev server: npm run dev');
      console.log('  2. Open the BMC canvas in your browser');
      console.log('  3. Click "Play Demo" to see entities travel');
      console.log('  4. Toggle "Show Edges" to test edge visibility');
      console.log('');
    } else {
      console.log('⚠️  Entity travel animation test FAILED');
      console.log('   Entity did not arrive at destination correctly.');
      console.log('');
      process.exit(1);
    }
    
  } catch (_error) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.error('❌ Test failed:', _error);
    console.log('');
    process.exit(1);
  }
}

main();
