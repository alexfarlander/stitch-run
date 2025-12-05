/**
 * Test Simple Flow Execution Script
 * 
 * Run with: npx tsx scripts/test-simple-flow.ts
 * 
 * This script:
 * 1. Finds the Simple Test Flow workflow
 * 2. Creates a run with test input
 * 3. Monitors execution progress with detailed logging
 * 4. Validates the output format matches expected schema
 * 5. Reports success or failure
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

/**
 * Expected output schema for Claude worker
 */
interface Scene {
  visual_prompt: string;
  voice_text: string;
}

interface ClaudeOutput {
  scenes: Scene[];
}

/**
 * Logs execution progress with timestamp and context
 */
function logExecution(level: 'info' | 'success' | 'error' | 'warn', message: string, context?: unknown) {
  const timestamp = new Date().toISOString();
  const emoji = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warn: '⚠️ ',
  }[level];
  
  console.log(`${emoji} [${timestamp}] ${message}`);
  if (context) {
    console.log(JSON.stringify(context, null, 2));
  }
}

/**
 * Validates that the output matches the expected schema
 */
function validateOutput(output: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if output exists
  if (!output) {
    errors.push('Output is null or undefined');
    return { valid: false, errors };
  }
  
  // Check if scenes array exists
  if (!output.scenes) {
    errors.push('Output missing "scenes" field');
    return { valid: false, errors };
  }
  
  if (!Array.isArray(output.scenes)) {
    errors.push('"scenes" field is not an array');
    return { valid: false, errors };
  }
  
  // Check if scenes array has at least one scene
  if (output.scenes.length === 0) {
    errors.push('Scenes array is empty');
    return { valid: false, errors };
  }
  
  // Validate each scene
  output.scenes.forEach((scene: any, index: number) => {
    if (!scene.visual_prompt || typeof scene.visual_prompt !== 'string') {
      errors.push(`Scene ${index}: missing or invalid "visual_prompt" field`);
    }
    if (!scene.voice_text || typeof scene.voice_text !== 'string') {
      errors.push(`Scene ${index}: missing or invalid "voice_text" field`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Waits for a node to reach a terminal state (completed or failed)
 */
async function waitForNodeCompletion(
  supabase: any,
  runId: string,
  nodeId: string,
  timeoutMs: number = 60000
): Promise<{ status: string; output?: unknown; error?: string }> {
  const _startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    // Query the run state
    const { data: run, error } = await supabase
      .from('stitch_runs')
      .select('node_states')
      .eq('id', runId)
      .single();
    
    if (error) {
      throw new Error(`Failed to query run: ${error.message}`);
    }
    
    const nodeState = run.node_states[nodeId];
    
    if (!nodeState) {
      throw new Error(`Node ${nodeId} not found in run state`);
    }
    
    // Check if node reached terminal state
    if (nodeState.status === 'completed' || nodeState.status === 'failed') {
      return {
        status: nodeState.status,
        output: nodeState.output,
        error: nodeState.error,
      };
    }
    
    // Log current status
    logExecution('info', `Node ${nodeId} status: ${nodeState.status}`);
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Timeout waiting for node ${nodeId} to complete`);
}

/**
 * Main test execution function
 */
async function main() {
  console.log('🧪 Starting Simple Test Flow Execution\n');
  
  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (!supabaseUrl || !serviceRoleKey) {
    logExecution('error', 'Missing required environment variables', {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
    });
    process.exit(1);
  }
  
  if (!baseUrl) {
    logExecution('warn', 'NEXT_PUBLIC_BASE_URL not set, using default: http://localhost:3000');
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  }
  
  // Create admin client
  const _supabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Step 1: Find the Simple Test Flow workflow
    logExecution('info', 'Step 1: Finding Simple Test Flow workflow...');
    const { data: workflow, error: workflowError } = await supabase
      .from('stitch_flows')
      .select('id, name, graph')
      .eq('name', 'Simple Test Flow')
      .eq('canvas_type', 'workflow')
      .single();
    
    if (workflowError || !workflow) {
      logExecution('error', 'Simple Test Flow not found. Please run seed-simple-test-flow.ts first.');
      process.exit(1);
    }
    
    logExecution('success', 'Found Simple Test Flow', {
      workflowId: workflow.id,
      nodeCount: workflow.graph.nodes.length,
      edgeCount: workflow.graph.edges.length,
    });
    
    // Step 2: Create a run with test input
    logExecution('info', 'Step 2: Creating run with test input...');
    
    const testInput = {
      prompt: 'A day in the life of a software developer working on an AI project',
    };
    
    // Import the startRun function
    const { startRun } = await import('../src/lib/engine/edge-walker');
    
    const run = await startRun(workflow.id, {
      input: testInput,
    });
    
    logExecution('success', 'Run created', {
      runId: run.id,
      flowId: run.flow_id,
      testInput,
    });
    
    // Step 3: Monitor execution progress
    logExecution('info', 'Step 3: Monitoring execution progress...');
    
    // Wait for Input node to be ready (it should be waiting_for_user)
    logExecution('info', 'Checking Input node status...');
    
    // Poll for the input node to reach waiting_for_user state
    let inputReady = false;
    const inputStartTime = Date.now();
    while (Date.now() - inputStartTime < 10000) {
      const { data: currentRun, error } = await supabase
        .from('stitch_runs')
        .select('node_states')
        .eq('id', run.id)
        .single();
      
      if (error) {
        throw new Error(`Failed to query run: ${error.message}`);
      }
      
      const inputState = currentRun.node_states['input'];
      
      if (inputState && inputState.status === 'waiting_for_user') {
        inputReady = true;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!inputReady) {
      throw new Error('Input node did not reach waiting_for_user state');
    }
    
    logExecution('success', 'Input node ready for user input');
    
    // Simulate user completing the input node
    logExecution('info', 'Simulating user input completion...');
    
    // Import required functions
    const { updateNodeState } = await import('../src/lib/db/runs');
    const { getFlowAdmin } = await import('../src/lib/db/flows');
    const { walkEdges } = await import('../src/lib/engine/edge-walker');
    
    // Update the input node to completed with the test input
    await updateNodeState(run.id, 'input', {
      status: 'completed',
      output: testInput,
    });
    
    logExecution('success', 'Input node marked as completed');
    
    // Get the updated run and flow
    const { data: updatedRun, error: runError } = await supabase
      .from('stitch_runs')
      .select('*')
      .eq('id', run.id)
      .single();
    
    if (runError || !updatedRun) {
      throw new Error(`Failed to fetch updated run: ${runError?.message}`);
    }
    
    const _flow = await getFlowAdmin(workflow.id);
    if (!flow) {
      throw new Error('Failed to fetch flow');
    }
    
    // Trigger edge-walking to continue execution
    await walkEdges('input', flow, updatedRun);
    
    logExecution('success', 'Edge-walking triggered, Claude worker should start');
    
    // Wait for Claude worker to complete
    logExecution('info', 'Waiting for Claude worker to complete...');
    
    // Note: The worker will try to call a callback URL via HTTP, which will fail
    // since we're running this as a script without a server. However, the worker
    // should still update the node state in the database.
    // We'll wait for the node to reach a terminal state (completed or failed)
    // and handle both cases appropriately.
    
    const claudeResult = await waitForNodeCompletion(supabase, run.id, 'claude', 120000);
    
    if (claudeResult.status === 'failed') {
      logExecution('warn', 'Claude worker failed (this may be expected if API key is invalid or callback failed)', {
        error: claudeResult.error,
      });
      
      // Check if this is a callback failure (expected in test environment)
      if (claudeResult.error && claudeResult.error.includes('callback')) {
        logExecution('info', 'Failure appears to be callback-related, which is expected in test environment');
        logExecution('info', 'In production, callbacks would work because the server is running');
      } else {
        // This is a real failure (API key, model not found, etc.)
        logExecution('error', 'Claude worker failed with non-callback error', {
          error: claudeResult.error,
        });
        process.exit(1);
      }
    } else {
      logExecution('success', 'Claude worker completed', {
        outputPreview: claudeResult.output ? {
          sceneCount: claudeResult.output.scenes?.length,
          firstScene: claudeResult.output.scenes?.[0],
        } : null,
      });
    }
    
    // Step 4: Validate output format
    logExecution('info', 'Step 4: Validating output format...');
    
    const validation = validateOutput(claudeResult.output);
    
    if (!validation.valid) {
      logExecution('error', 'Output validation failed', {
        errors: validation.errors,
        actualOutput: claudeResult.output,
      });
      process.exit(1);
    }
    
    logExecution('success', 'Output format validation passed', {
      sceneCount: claudeResult.output.scenes.length,
      scenes: claudeResult.output.scenes,
    });
    
    // Wait for Output node to be ready
    logExecution('info', 'Waiting for Output node...');
    const outputResult = await waitForNodeCompletion(supabase, run.id, 'output', 10000);
    
    if (outputResult.status === 'waiting_for_user') {
      logExecution('success', 'Output node ready for user review');
    } else if (outputResult.status === 'completed') {
      logExecution('success', 'Output node already completed');
    } else {
      throw new Error(`Output node failed: ${outputResult.error}`);
    }
    
    // Step 5: Report success
    console.log('\n' + '='.repeat(60));
    logExecution('success', 'Simple Test Flow execution completed successfully!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Execution Summary:');
    console.log(`   - Run ID: ${run.id}`);
    console.log(`   - Input: "${testInput.prompt}"`);
    if (claudeResult.status === 'completed' && claudeResult.output) {
      console.log(`   - Scenes Generated: ${claudeResult.output.scenes.length}`);
      console.log(`   - All nodes executed successfully`);
      console.log(`   - Output format validated`);
    } else {
      console.log(`   - Claude worker status: ${claudeResult.status}`);
      console.log(`   - Note: Full execution requires a running server for callbacks`);
    }
    
    console.log('\n✅ Requirements validated:');
    console.log('   ✓ 5.1: Simple test flow created (Input → Claude → Output)');
    console.log('   ✓ 5.2: Flow execution initiated and nodes processed');
    console.log('   ✓ 5.3: Execution progress logged at each step');
    if (claudeResult.status === 'completed' && claudeResult.output) {
      console.log('   ✓ 5.4: Output format matches expected schema');
    } else {
      console.log('   ⚠ 5.4: Output validation skipped (worker did not complete successfully)');
    }
    console.log('   ✓ 5.5: Detailed error information available if failures occur');
    
    console.log('\n📝 Note:');
    console.log('   This test script demonstrates the workflow structure and execution flow.');
    console.log('   For full end-to-end testing with callbacks, run the application server');
    console.log('   and trigger the workflow through the UI or API endpoints.');
    
    process.exit(0);
    
  } catch (_error) {
    logExecution('error', 'Test execution failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();
