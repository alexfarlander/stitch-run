/**
 * Simple Test Flow Seed
 * 
 * Seeds the database with a minimal test workflow to verify end-to-end execution:
 * Input (UX) → Claude (Worker) → Output (UX)
 * 
 * This flow validates:
 * - UX node execution and user input handling
 * - Worker node execution with Claude API
 * - Callback reception and state updates
 * - Edge-walking between nodes
 * - Output format validation
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { getAdminClient } from '../supabase/client';
import { StitchNode, StitchEdge } from '@/types/stitch';

/**
 * Creates the Simple Test Flow workflow
 * 
 * Workflow structure:
 * Input (UX) → Claude (Worker) → Output (UX)
 */
async function createSimpleTestFlow(canvasId: string) {
  const _supabase = getAdminClient();
  
  // Check if workflow already exists
  const { data: existing } = await supabase
    .from('stitch_flows')
    .select('id')
    .eq('name', 'Simple Test Flow')
    .eq('canvas_type', 'workflow')
    .single();
  
  if (existing) {
    console.log('ℹ️  Simple Test Flow already exists');
    return existing.id;
  }
  
  // Create workflow nodes
  const nodes: StitchNode[] = [
    // 1. Input (UX)
    {
      id: 'input',
      type: 'UX',
      position: { x: 100, y: 50 },
      data: {
        label: 'Input',
        prompt: 'Enter a topic for Claude to generate scene descriptions.',
        fields: [
          {
            name: 'prompt',
            type: 'textarea',
            label: 'Topic',
            placeholder: 'e.g., A day in the life of a software developer',
            required: true,
          },
        ],
      },
    },
    
    // 2. Claude (Worker)
    {
      id: 'claude',
      type: 'Worker',
      position: { x: 100, y: 200 },
      data: {
        label: 'Claude',
        workerType: 'claude',
        description: 'Generates scene descriptions using Claude AI',
        config: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4096,
        },
      },
    },
    
    // 3. Output (UX)
    {
      id: 'output',
      type: 'UX',
      position: { x: 100, y: 350 },
      data: {
        label: 'Output',
        prompt: 'Review the generated scenes from Claude.',
        fields: [
          {
            name: 'approved',
            type: 'boolean',
            label: 'Approve Output',
            defaultValue: true,
          },
          {
            name: 'notes',
            type: 'textarea',
            label: 'Notes',
            placeholder: 'Any feedback about the generated scenes...',
          },
        ],
      },
    },
  ];
  
  // Create workflow edges
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'input', target: 'claude' },
    { id: 'e2', source: 'claude', target: 'output' },
  ];
  
  // Insert workflow
  const { data: workflow, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: 'Simple Test Flow',
      canvas_type: 'workflow',
      parent_id: canvasId,
      graph: { nodes, edges },
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create workflow: ${error.message}`);
  }
  
  console.log('✅ Created Simple Test Flow workflow');
  return workflow.id;
}

/**
 * Main seed function - orchestrates workflow creation
 */
export async function seedSimpleTestFlow() {
  console.log('🌱 Seeding Simple Test Flow...\n');
  
  const _supabase = getAdminClient();
  
  try {
    // Step 1: Get the default BMC canvas
    console.log('📋 Step 1: Fetching default BMC canvas...');
    const { data: bmc, error: bmcError } = await supabase
      .from('stitch_flows')
      .select('id')
      .eq('canvas_type', 'bmc')
      .single();
    
    if (bmcError || !bmc) {
      throw new Error('Default BMC canvas not found. Please run seed-bmc.ts first.');
    }
    
    console.log(`✅ Found BMC canvas: ${bmc.id}\n`);
    
    // Step 2: Create Simple Test Flow workflow
    console.log('📋 Step 2: Creating Simple Test Flow workflow...');
    const workflowId = await createSimpleTestFlow(bmc.id);
    console.log('');
    
    console.log('🎉 Simple Test Flow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Simple Test Flow workflow created');
    console.log('   - 3 nodes configured (Input UX, Claude Worker, Output UX)');
    console.log('   - 2 edges connecting the nodes');
    console.log('\n🚀 Workflow structure:');
    console.log('   Input (UX) → Claude (Worker) → Output (UX)');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the test execution script: npx tsx scripts/test-simple-flow.ts');
    console.log('   2. Provide a test prompt when requested');
    console.log('   3. Verify Claude generates scene descriptions');
    console.log('   4. Check that output format matches expected schema');
    
    return {
      success: true,
      canvasId: bmc.id,
      workflowId,
    };
    
  } catch (_error) {
    console.error('❌ Simple Test Flow seed failed:', error);
    throw error;
  }
}
