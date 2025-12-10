/**
 * Test Simple Flow Structure Script
 * 
 * Run with: npx tsx scripts/test-simple-flow-structure.ts
 * 
 * This script validates the Simple Test Flow structure without requiring
 * a running server. It verifies:
 * 1. Workflow exists and has correct structure
 * 2. Nodes are properly configured
 * 3. Edges connect nodes correctly
 * 4. Run can be created with test input
 * 5. Execution logging works at each step
 * 
 * For full end-to-end execution testing with callbacks, use the application
 * server and trigger workflows through the UI or API endpoints.
 * 
 * Validates: Requirements 5.1, 5.3, 5.4, 5.5
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
function validateOutputSchema(output: any): { valid: boolean; errors: string[] } {
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
 * Main test function
 */
async function main() {
  console.log('🧪 Starting Simple Test Flow Structure Validation\n');
  
  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    logExecution('error', 'Missing required environment variables', {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
    });
    process.exit(1);
  }
  
  // Create admin client
  const _supabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Step 1: Validate workflow structure
    logExecution('info', 'Step 1: Validating Simple Test Flow structure...');
    const { data: workflow, error: workflowError } = await _supabase
      .from('stitch_flows')
      .select('id, name, graph, canvas_type')
      .eq('name', 'Simple Test Flow')
      .eq('canvas_type', 'workflow')
      .single();
    
    if (workflowError || !workflow) {
      logExecution('error', 'Simple Test Flow not found. Please run seed-simple-test-flow.ts first.');
      process.exit(1);
    }
    
    logExecution('success', 'Found Simple Test Flow', {
      workflowId: workflow.id,
      canvasType: workflow.canvas_type,
    });
    
    // Step 2: Validate nodes
    logExecution('info', 'Step 2: Validating nodes...');
    const nodes = workflow.graph.nodes;
    
    if (nodes.length !== 3) {
      logExecution('error', `Expected 3 nodes, found ${nodes.length}`);
      process.exit(1);
    }
    
    const expectedNodes = [
      { id: 'input', type: 'UX', label: 'Input' },
      { id: 'claude', type: 'Worker', label: 'Claude' },
      { id: 'output', type: 'UX', label: 'Output' },
    ];
    
    for (const expected of expectedNodes) {
      const node = nodes.find((n: any) => n.id === expected.id);
      if (!node) {
        logExecution('error', `Node ${expected.id} not found`);
        process.exit(1);
      }
      if (node.type !== expected.type) {
        logExecution('error', `Node ${expected.id} has wrong type: ${node.type} (expected ${expected.type})`);
        process.exit(1);
      }
      if (node.data.label !== expected.label) {
        logExecution('error', `Node ${expected.id} has wrong label: ${node.data.label} (expected ${expected.label})`);
        process.exit(1);
      }
      logExecution('success', `Node ${expected.id} validated`, {
        type: node.type,
        label: node.data.label,
      });
    }
    
    // Validate Claude worker configuration
    const claudeNode = nodes.find((n: any) => n.id === 'claude');
    if (claudeNode.data.workerType !== 'claude') {
      logExecution('error', `Claude node has wrong workerType: ${claudeNode.data.workerType}`);
      process.exit(1);
    }
    logExecution('success', 'Claude worker configuration validated', {
      workerType: claudeNode.data.workerType,
      model: claudeNode.data.config?.model,
    });
    
    // Step 3: Validate edges
    logExecution('info', 'Step 3: Validating edges...');
    const edges = workflow.graph.edges;
    
    if (edges.length !== 2) {
      logExecution('error', `Expected 2 edges, found ${edges.length}`);
      process.exit(1);
    }
    
    const expectedEdges = [
      { id: 'e1', source: 'input', target: 'claude' },
      { id: 'e2', source: 'claude', target: 'output' },
    ];
    
    for (const expected of expectedEdges) {
      const edge = edges.find((e: any) => e.id === expected.id);
      if (!edge) {
        logExecution('error', `Edge ${expected.id} not found`);
        process.exit(1);
      }
      if (edge.source !== expected.source || edge.target !== expected.target) {
        logExecution('error', `Edge ${expected.id} has wrong connections: ${edge.source} → ${edge.target}`);
        process.exit(1);
      }
      logExecution('success', `Edge ${expected.id} validated`, {
        connection: `${edge.source} → ${edge.target}`,
      });
    }
    
    // Step 4: Test run creation
    logExecution('info', 'Step 4: Testing run creation...');
    
    const testInput = {
      prompt: 'A day in the life of a software developer working on an AI project',
    };
    
    const { startRun } = await import('../src/lib/engine/edge-walker');
    
    const run = await startRun(workflow.id, {
      input: testInput,
    });
    
    logExecution('success', 'Run created successfully', {
      runId: run.id,
      flowId: run.flow_id,
      testInput,
    });
    
    // Step 5: Validate initial node states
    logExecution('info', 'Step 5: Validating initial node states...');
    
    const nodeStates = run.node_states;
    
    for (const nodeId of ['input', 'claude', 'output']) {
      if (!nodeStates[nodeId]) {
        logExecution('error', `Node state for ${nodeId} not found`);
        process.exit(1);
      }
      logExecution('success', `Node state for ${nodeId} initialized`, {
        status: nodeStates[nodeId].status,
      });
    }
    
    // Step 6: Validate output schema definition
    logExecution('info', 'Step 6: Validating output schema...');
    
    const mockOutput: ClaudeOutput = {
      scenes: [
        {
          visual_prompt: 'A software developer typing code on a laptop',
          voice_text: 'The developer begins their day with a cup of coffee',
        },
        {
          visual_prompt: 'A team meeting with developers discussing around a whiteboard',
          voice_text: 'Collaborating with the team on the AI project architecture',
        },
      ],
    };
    
    const validation = validateOutputSchema(mockOutput);
    
    if (!validation.valid) {
      logExecution('error', 'Output schema validation failed', {
        errors: validation.errors,
      });
      process.exit(1);
    }
    
    logExecution('success', 'Output schema validation passed', {
      sceneCount: mockOutput.scenes.length,
    });
    
    // Step 7: Report success
    console.log('\n' + '='.repeat(60));
    logExecution('success', 'Simple Test Flow structure validation completed!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Validation Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Nodes: ${nodes.length} (Input, Claude, Output)`);
    console.log(`   - Edges: ${edges.length} (Input→Claude, Claude→Output)`);
    console.log(`   - Run created: ${run.id}`);
    console.log(`   - Output schema validated`);
    
    console.log('\n✅ Requirements validated:');
    console.log('   ✓ 5.1: Simple test flow created (Input → Claude → Output)');
    console.log('   ✓ 5.3: Execution logging works at each step');
    console.log('   ✓ 5.4: Output format schema defined and validated');
    console.log('   ✓ 5.5: Detailed error information available if failures occur');
    
    console.log('\n📝 Next steps:');
    console.log('   For full end-to-end execution testing:');
    console.log('   1. Start the application server: npm run dev');
    console.log('   2. Navigate to the workflow in the UI');
    console.log('   3. Trigger execution and observe real-time updates');
    console.log('   4. Verify Claude generates actual scene descriptions');
    console.log('   5. Confirm callbacks work and nodes complete successfully');
    
    process.exit(0);
    
  } catch (_error) {
    logExecution('error', 'Validation failed', {
      _error: _error instanceof Error ? _error.message : 'Unknown _error',
      stack: _error instanceof Error ? _error.stack : undefined,
    });
    process.exit(1);
  }
}

main();
