/**
 * Test Fallback Node Script
 * 
 * Creates a test flow with an unknown node type to verify the fallback component
 * displays correctly in the canvas.
 * 
 * Validates: Requirements 6.2
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { StitchNode, StitchEdge } from '@/types/stitch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFallbackTestFlow() {
  
  console.log('🧪 Creating Fallback Node Test Flow...\n');
  
  try {
    // Step 1: Get the default BMC canvas
    console.log('📋 Step 1: Fetching default BMC canvas...');
    const { data: bmc, error: bmcError } = await _supabase
      .from('stitch_flows')
      .select('id')
      .eq('canvas_type', 'bmc')
      .single();
    
    if (bmcError || !bmc) {
      throw new Error('Default BMC canvas not found. Please run seed-bmc.ts first.');
    }
    
    console.log(`✅ Found BMC canvas: ${bmc.id}\n`);
    
    // Step 2: Check if test flow already exists
    console.log('📋 Step 2: Checking for existing test flow...');
    const { data: existing } = await _supabase
      .from('stitch_flows')
      .select('id')
      .eq('name', 'Fallback Node Test')
      .eq('canvas_type', 'workflow')
      .single();
    
    if (existing) {
      console.log('ℹ️  Fallback Node Test flow already exists');
      console.log(`   Flow ID: ${existing.id}`);
      console.log('\n🎯 To view the test:');
      console.log(`   1. Start the dev server: npm run dev`);
      console.log(`   2. Navigate to: http://localhost:3000/canvas/${existing.id}`);
      console.log('   3. Look for the yellow "Unknown Node Type" component');
      return existing.id;
    }
    
    // Step 3: Create test flow with unknown node types
    console.log('📋 Step 3: Creating test flow with unknown node types...');
    
    const nodes: StitchNode[] = [
      // Known node type
      {
        id: 'input',
        type: 'UX',
        position: { x: 100, y: 50 },
        data: {
          label: 'Input (Known Type)',
          prompt: 'This is a known UX node type.',
        },
      },
      
      // Unknown node type 1
      {
        id: 'unknown-1',
        type: 'CustomWorker' as any,
        position: { x: 100, y: 200 },
        data: {
          label: 'Custom Worker (Unknown)',
          description: 'This node type is not registered',
        },
      },
      
      // Unknown node type 2
      {
        id: 'unknown-2',
        type: 'MagicProcessor',
        position: { x: 100, y: 350 },
        data: {
          label: 'Magic Processor (Unknown)',
          description: 'Another unregistered node type',
        },
      },
      
      // Known node type
      {
        id: 'output',
        type: 'UX',
        position: { x: 100, y: 500 },
        data: {
          label: 'Output (Known Type)',
          prompt: 'This is another known UX node type.',
        },
      },
    ];
    
    const edges: StitchEdge[] = [
      { id: 'e1', source: 'input', target: 'unknown-1' },
      { id: 'e2', source: 'unknown-1', target: 'unknown-2' },
      { id: 'e3', source: 'unknown-2', target: 'output' },
    ];
    
    const { data: workflow, error } = await _supabase
      .from('stitch_flows')
      .insert({
        name: 'Fallback Node Test',
        canvas_type: 'workflow',
        parent_id: bmc.id,
        graph: { nodes, edges },
      })
      .select('id')
      .single();
    
    if (error) {
      throw new Error(`Failed to create test flow: ${error.message}`);
    }
    
    console.log('✅ Created Fallback Node Test flow');
    console.log(`   Flow ID: ${workflow.id}\n`);
    
    console.log('🎉 Fallback Node Test flow created successfully!\n');
    console.log('📊 Summary:');
    console.log('   - 4 nodes created (2 known UX, 2 unknown types)');
    console.log('   - 3 edges connecting the nodes');
    console.log('   - Unknown types: CustomWorker, MagicProcessor\n');
    console.log('🎯 To view the test:');
    console.log(`   1. Start the dev server: npm run dev`);
    console.log(`   2. Navigate to: http://localhost:3000/canvas/${workflow.id}`);
    console.log('   3. Look for the yellow "Unknown Node Type" components');
    console.log('   4. Verify they display:');
    console.log('      - Node ID');
    console.log('      - Original node type');
    console.log('      - Label (if present)');
    console.log('      - Warning icon\n');
    
    return workflow.id;
    
  } catch (_error) {
    console.error('❌ Fallback Node Test flow creation failed:', _error);
    throw _error;
  }
}

// Run the script
createFallbackTestFlow()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
