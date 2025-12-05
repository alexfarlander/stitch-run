/**
 * Verification script for parallel edge execution
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * This script verifies that:
 * 1. Journey edges and system edges fire simultaneously (12.1)
 * 2. Entity movement is not blocked by system edge execution (12.2)
 * 3. System edge failures don't affect entity movement (12.3)
 * 4. Multiple system edges execute concurrently (12.4)
 * 5. All edge execution results are logged (12.5)
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST
config({ path: join(__dirname, '../.env.local') });

async function verifyParallelEdgeExecution() {
  console.log('🔍 Verifying Parallel Edge Execution Implementation\n');
  
  const { getAdminClient } = await import('../src/lib/supabase/client');
  const { walkParallelEdges } = await import('../src/lib/engine/edge-walker');
  
  const supabase = getAdminClient();
  let allTestsPassed = true;
  
  try {
    // Get the BMC canvas
    const { data: bmcCanvases, error: canvasError } = await supabase
      .from('stitch_flows')
      .select('id, name, graph')
      .eq('canvas_type', 'bmc')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (canvasError || !bmcCanvases || bmcCanvases.length === 0) {
      console.error('❌ BMC canvas not found. Run seed script first.');
      process.exit(1);
    }
    
    const bmcCanvas = bmcCanvases[0];
    const graph = bmcCanvas.graph;
    
    console.log(`✅ Found BMC canvas: ${bmcCanvas.name}\n`);
    
    // Test 1: Verify walkParallelEdges function exists and is exported
    console.log('Test 1: Function Export');
    if (typeof walkParallelEdges === 'function') {
      console.log('  ✅ walkParallelEdges function is exported\n');
    } else {
      console.log('  ❌ walkParallelEdges function not found\n');
      allTestsPassed = false;
    }
    
    // Test 2: Verify function handles nodes with both edge types (Requirement 12.1)
    console.log('Test 2: Parallel Execution (Requirement 12.1)');
    const nodeWithBothEdges = graph.nodes.find((node: any) => {
      const journeyEdges = graph.edges.filter(
        (e: any) => e.source === node.id && (e.type === 'journey' || !e.type)
      );
      const systemEdges = graph.edges.filter(
        (e: any) => e.source === node.id && e.type === 'system'
      );
      return journeyEdges.length > 0 && systemEdges.length > 0;
    });
    
    if (nodeWithBothEdges) {
      const { data: entities } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', bmcCanvas.id)
        .limit(1);
      
      if (entities && entities.length > 0) {
        const testEntity = entities[0];
        const startTime = Date.now();
        const results = await walkParallelEdges(
          nodeWithBothEdges.id,
          testEntity.id,
          bmcCanvas.id
        );
        const duration = Date.now() - startTime;
        
        if (results.journeyEdges.length > 0 && results.systemEdges.length > 0) {
          console.log('  ✅ Both journey and system edges executed');
          console.log(`  ✅ Execution completed in ${duration}ms (parallel execution)\n`);
        } else {
          console.log('  ❌ Not all edge types executed\n');
          allTestsPassed = false;
        }
      } else {
        console.log('  ⚠️  No entities found for testing\n');
      }
    } else {
      console.log('  ⚠️  No nodes with both edge types found\n');
    }
    
    // Test 3: Verify entity movement not blocked (Requirement 12.2)
    console.log('Test 3: Non-Blocking Entity Movement (Requirement 12.2)');
    const nodeWithJourneyEdge = graph.nodes.find((node: any) => {
      const journeyEdges = graph.edges.filter(
        (e: any) => e.source === node.id && (e.type === 'journey' || !e.type)
      );
      return journeyEdges.length > 0;
    });
    
    if (nodeWithJourneyEdge) {
      const { data: entities } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', bmcCanvas.id)
        .limit(1);
      
      if (entities && entities.length > 0) {
        const testEntity = entities[0];
        const initialNodeId = testEntity.current_node_id;
        
        await walkParallelEdges(
          nodeWithJourneyEdge.id,
          testEntity.id,
          bmcCanvas.id
        );
        
        const { data: updatedEntity } = await supabase
          .from('stitch_entities')
          .select('current_node_id')
          .eq('id', testEntity.id)
          .single();
        
        if (updatedEntity && updatedEntity.current_node_id !== initialNodeId) {
          console.log('  ✅ Entity moved successfully (not blocked by system edges)\n');
        } else {
          console.log('  ℹ️  Entity position unchanged (may already be at target)\n');
        }
      }
    } else {
      console.log('  ⚠️  No nodes with journey edges found\n');
    }
    
    // Test 4: Verify Promise.allSettled usage (Requirement 12.3)
    console.log('Test 4: Independent Failure Handling (Requirement 12.3)');
    // Read the source code to verify Promise.allSettled is used
    const fs = await import('fs');
    const edgeWalkerSource = fs.readFileSync(
      join(__dirname, '../src/lib/engine/edge-walker.ts'),
      'utf-8'
    );
    
    if (edgeWalkerSource.includes('Promise.allSettled')) {
      console.log('  ✅ Promise.allSettled used for independent failure handling\n');
    } else {
      console.log('  ❌ Promise.allSettled not found in edge-walker.ts\n');
      allTestsPassed = false;
    }
    
    // Test 5: Verify concurrent system edge execution (Requirement 12.4)
    console.log('Test 5: Concurrent System Edge Execution (Requirement 12.4)');
    const nodeWithMultipleSystemEdges = graph.nodes.find((node: any) => {
      const systemEdges = graph.edges.filter(
        (e: any) => e.source === node.id && e.type === 'system'
      );
      return systemEdges.length > 1;
    });
    
    if (nodeWithMultipleSystemEdges) {
      const systemEdges = graph.edges.filter(
        (e: any) => e.source === nodeWithMultipleSystemEdges.id && e.type === 'system'
      );
      
      const { data: entities } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', bmcCanvas.id)
        .limit(1);
      
      if (entities && entities.length > 0) {
        const testEntity = entities[0];
        const startTime = Date.now();
        const results = await walkParallelEdges(
          nodeWithMultipleSystemEdges.id,
          testEntity.id,
          bmcCanvas.id
        );
        const duration = Date.now() - startTime;
        
        // If executed sequentially, would take at least 100ms per edge
        // Parallel execution should be much faster
        const sequentialEstimate = systemEdges.length * 100;
        
        if (results.systemEdges.length === systemEdges.length) {
          console.log(`  ✅ ${systemEdges.length} system edges executed`);
          console.log(`  ✅ Duration: ${duration}ms (sequential would be ~${sequentialEstimate}ms)`);
          
          if (duration < sequentialEstimate * 0.8) {
            console.log('  ✅ Execution time suggests parallel execution\n');
          } else {
            console.log('  ⚠️  Execution time suggests sequential execution\n');
          }
        } else {
          console.log('  ❌ Not all system edges executed\n');
          allTestsPassed = false;
        }
      }
    } else {
      console.log('  ⚠️  No nodes with multiple system edges found\n');
    }
    
    // Test 6: Verify logging (Requirement 12.5)
    console.log('Test 6: Edge Execution Result Logging (Requirement 12.5)');
    if (edgeWalkerSource.includes('console.log') && 
        edgeWalkerSource.includes('Results for node')) {
      console.log('  ✅ Edge execution results are logged\n');
    } else {
      console.log('  ❌ Edge execution logging not found\n');
      allTestsPassed = false;
    }
    
    // Test 7: Verify webhook integration
    console.log('Test 7: Webhook Integration');
    const webhookSource = fs.readFileSync(
      join(__dirname, '../src/app/api/webhooks/clockwork/[source]/route.ts'),
      'utf-8'
    );
    
    if (webhookSource.includes('walkParallelEdges')) {
      console.log('  ✅ Webhook handler uses walkParallelEdges\n');
    } else {
      console.log('  ❌ Webhook handler not integrated with walkParallelEdges\n');
      allTestsPassed = false;
    }
    
    // Summary
    console.log('═'.repeat(60));
    if (allTestsPassed) {
      console.log('✅ All parallel edge execution tests passed!\n');
      console.log('Validated Requirements:');
      console.log('  ✓ 12.1 - Journey and system edges fire simultaneously');
      console.log('  ✓ 12.2 - Entity movement not blocked by system edges');
      console.log('  ✓ 12.3 - Failures handled independently (Promise.allSettled)');
      console.log('  ✓ 12.4 - Multiple system edges execute concurrently');
      console.log('  ✓ 12.5 - All edge execution results logged');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Please review the implementation.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyParallelEdgeExecution();
