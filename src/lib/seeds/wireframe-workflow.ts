/**
 * Wireframe Generation Workflow Seed
 * 
 * Seeds the database with a complete wireframe generation workflow that:
 * 1. Takes a script as input
 * 2. Parses it into scenes
 * 3. Generates a style reference
 * 4. Generates wireframes for each scene in parallel
 * 5. Collects all wireframes for review
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { getAdminClient } from '../supabase/client';
import { StitchNode, StitchEdge } from '@/types/stitch';

/**
 * Creates the Wireframe Generation workflow
 * 
 * Workflow structure:
 * Script Input (UX) → Parse Scenes (Worker) → Style Setup (UX) → 
 * Generate Style Reference (Worker) → Style Approval (UX) → 
 * Scene Splitter → Wireframe Generator (parallel) → 
 * Scene Collector → Wireframe Review (UX)
 */
async function createWireframeWorkflow(canvasId: string) {
  const _supabase = getAdminClient();
  
  // Check if workflow already exists
  const { data: existing } = await supabase
    .from('stitch_flows')
    .select('id')
    .eq('name', 'Wireframe Generation')
    .eq('canvas_type', 'workflow')
    .single();
  
  if (existing) {
    console.log('ℹ️  Wireframe Generation workflow already exists');
    return existing.id;
  }
  
  // Create workflow nodes
  const nodes: StitchNode[] = [
    // 1. Script Input (UX)
    {
      id: 'script-input',
      type: 'UX',
      position: { x: 100, y: 50 },
      data: {
        label: 'Script Input',
        prompt: 'Enter your video script. The script will be parsed into individual scenes for wireframe generation.',
        fields: [
          {
            name: 'script',
            type: 'textarea',
            label: 'Video Script',
            placeholder: 'Enter your script here...',
            required: true,
          },
          {
            name: 'project_name',
            type: 'text',
            label: 'Project Name',
            placeholder: 'my-video-project',
            required: true,
          },
          {
            name: 'target_scene_count',
            type: 'number',
            label: 'Target Scene Count',
            placeholder: '4',
            defaultValue: 4,
          },
        ],
      },
    },
    
    // 2. Parse Scenes (Worker)
    {
      id: 'parse-scenes',
      type: 'Worker',
      position: { x: 100, y: 200 },
      data: {
        label: 'Parse Scenes',
        workerType: 'scene-parser',
        description: 'Parses the script into structured scenes using Claude AI',
      },
    },
    
    // 3. Style Setup (UX)
    {
      id: 'style-setup',
      type: 'UX',
      position: { x: 100, y: 350 },
      data: {
        label: 'Style Setup',
        prompt: 'Define the visual style for your wireframes. This will be used to generate a style reference image.',
        fields: [
          {
            name: 'style_description',
            type: 'textarea',
            label: 'Style Description',
            placeholder: 'Minimalist, clean lines, modern UI design, flat colors...',
            required: true,
          },
          {
            name: 'aspect_ratio',
            type: 'select',
            label: 'Aspect Ratio',
            options: [
              { value: 'ASPECT_16_9', label: '16:9 (Widescreen)' },
              { value: 'ASPECT_9_16', label: '9:16 (Portrait)' },
              { value: 'ASPECT_1_1', label: '1:1 (Square)' },
              { value: 'ASPECT_4_3', label: '4:3 (Standard)' },
            ],
            defaultValue: 'ASPECT_16_9',
          },
        ],
      },
    },
    
    // 4. Generate Style Reference (Worker)
    {
      id: 'generate-style-ref',
      type: 'Worker',
      position: { x: 100, y: 500 },
      data: {
        label: 'Generate Style Reference',
        workerType: 'wireframe-generator',
        description: 'Generates a style reference image to maintain visual consistency',
        config: {
          media_type: 'style_reference',
        },
      },
    },
    
    // 5. Style Approval (UX)
    {
      id: 'style-approval',
      type: 'UX',
      position: { x: 100, y: 650 },
      data: {
        label: 'Style Approval',
        prompt: 'Review the generated style reference. This style will be applied to all wireframes.',
        fields: [
          {
            name: 'approved',
            type: 'boolean',
            label: 'Approve Style',
            required: true,
          },
          {
            name: 'style_notes',
            type: 'textarea',
            label: 'Style Notes (optional)',
            placeholder: 'Any adjustments or notes about the style...',
          },
        ],
      },
    },
    
    // 6. Scene Splitter
    {
      id: 'scene-splitter',
      type: 'Splitter',
      position: { x: 100, y: 800 },
      data: {
        label: 'Scene Splitter',
        arrayPath: 'scenes',
        description: 'Splits scenes array for parallel wireframe generation',
      },
    },
    
    // 7. Wireframe Generator (parallel)
    {
      id: 'wireframe-generator',
      type: 'Worker',
      position: { x: 100, y: 950 },
      data: {
        label: 'Generate Wireframe',
        workerType: 'wireframe-generator',
        description: 'Generates wireframe image for each scene',
      },
    },
    
    // 8. Scene Collector
    {
      id: 'scene-collector',
      type: 'Collector',
      position: { x: 100, y: 1100 },
      data: {
        label: 'Scene Collector',
        description: 'Waits for all wireframes to complete',
        collectAs: 'wireframes',
      },
    },
    
    // 9. Wireframe Review (UX)
    {
      id: 'wireframe-review',
      type: 'UX',
      position: { x: 100, y: 1250 },
      data: {
        label: 'Wireframe Review',
        prompt: 'Review all generated wireframes. You can proceed to video generation or regenerate specific scenes.',
        fields: [
          {
            name: 'approved',
            type: 'boolean',
            label: 'Approve All Wireframes',
            required: true,
          },
          {
            name: 'notes',
            type: 'textarea',
            label: 'Review Notes',
            placeholder: 'Any feedback or notes about the wireframes...',
          },
        ],
      },
    },
  ];
  
  // Create workflow edges
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'script-input', target: 'parse-scenes' },
    { id: 'e2', source: 'parse-scenes', target: 'style-setup' },
    { id: 'e3', source: 'style-setup', target: 'generate-style-ref' },
    { id: 'e4', source: 'generate-style-ref', target: 'style-approval' },
    { id: 'e5', source: 'style-approval', target: 'scene-splitter' },
    { id: 'e6', source: 'scene-splitter', target: 'wireframe-generator' },
    { id: 'e7', source: 'wireframe-generator', target: 'scene-collector' },
    { id: 'e8', source: 'scene-collector', target: 'wireframe-review' },
  ];
  
  // Insert workflow
  const { data: workflow, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: 'Wireframe Generation',
      canvas_type: 'workflow',
      parent_id: canvasId,
      graph: { nodes, edges },
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create workflow: ${error.message}`);
  }
  
  console.log('✅ Created Wireframe Generation workflow');
  return workflow.id;
}

/**
 * Main seed function - orchestrates workflow creation
 */
export async function seedWireframeWorkflow() {
  console.log('🌱 Seeding Wireframe Generation Workflow...\n');
  
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
    
    // Step 2: Create Wireframe Generation workflow
    console.log('📋 Step 2: Creating Wireframe Generation workflow...');
    const workflowId = await createWireframeWorkflow(bmc.id);
    console.log('');
    
    console.log('🎉 Wireframe Generation workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Wireframe Generation workflow created');
    console.log('   - 9 nodes configured (UX, Workers, Splitter, Collector)');
    console.log('   - Scene parsing with Claude AI');
    console.log('   - Style reference generation');
    console.log('   - Parallel wireframe generation');
    console.log('\n🚀 Workflow includes:');
    console.log('   1. Script Input → Parse Scenes');
    console.log('   2. Style Setup → Generate Style Reference → Approval');
    console.log('   3. Scene Splitter → Parallel Wireframe Generation');
    console.log('   4. Scene Collector → Wireframe Review');
    
    return {
      success: true,
      canvasId: bmc.id,
      workflowId,
    };
    
  } catch (_error) {
    console.error('❌ Wireframe workflow seed failed:', error);
    throw error;
  }
}
