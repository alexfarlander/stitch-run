/**
 * Video Factory V2 Workflow Seed
 * 
 * Seeds the database with a complete video production workflow that:
 * 1. Selects wireframes from the Media Library
 * 2. Loads wireframe metadata
 * 3. Configures voice settings
 * 4. Processes each scene in parallel (video + voice + mix)
 * 5. Selects background music
 * 6. Assembles final video
 * 7. Reviews final output
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { getAdminClient } from '../supabase/client';
import { StitchNode, StitchEdge } from '@/types/stitch';

/**
 * Creates the Video Factory V2 workflow
 * 
 * Workflow structure:
 * Select Wireframes (MediaSelect) → Load Wireframes (Worker) → 
 * Voice Settings (UX) → Scene Splitter → 
 * [Generate Video (Worker) + Generate Voice (Worker) + Mix Scene (Worker)] (parallel) → 
 * Scene Collector → Music Selection (MediaSelect) → 
 * Final Assembly (Worker) → Final Review (UX)
 */
async function createVideoFactoryV2Workflow(canvasId: string) {
  const supabase = getAdminClient();
  
  // Check if workflow already exists
  const { data: existing } = await supabase
    .from('stitch_flows')
    .select('id')
    .eq('name', 'Video Factory V2')
    .eq('canvas_type', 'workflow')
    .single();
  
  if (existing) {
    console.log('ℹ️  Video Factory V2 workflow already exists');
    return existing.id;
  }
  
  // Create workflow nodes
  const nodes: StitchNode[] = [
    // 1. Select Wireframes (MediaSelect)
    {
      id: 'select-wireframes',
      type: 'MediaSelect',
      position: { x: 100, y: 50 },
      data: {
        label: 'Select Wireframes',
        mediaType: 'wireframe',
        allowMultiple: true,
        description: 'Select wireframe images from the Media Library to convert into videos',
      },
    },
    
    // 2. Load Wireframes (Worker)
    {
      id: 'load-wireframes',
      type: 'Worker',
      position: { x: 100, y: 200 },
      data: {
        label: 'Load Wireframes',
        workerType: 'media-library',
        description: 'Loads full metadata for selected wireframes',
        config: {
          operation: 'load-metadata',
        },
      },
    },
    
    // 3. Voice Settings (UX)
    {
      id: 'voice-settings',
      type: 'UX',
      position: { x: 100, y: 350 },
      data: {
        label: 'Voice Settings',
        prompt: 'Configure voice narration settings for all scenes.',
        fields: [
          {
            name: 'voice_id',
            type: 'text',
            label: 'Voice ID',
            placeholder: 'Enter ElevenLabs voice ID',
            required: true,
          },
          {
            name: 'model_id',
            type: 'select',
            label: 'Voice Model',
            options: [
              { value: 'eleven_multilingual_v2', label: 'Multilingual V2' },
              { value: 'eleven_monolingual_v1', label: 'Monolingual V1' },
              { value: 'eleven_turbo_v2', label: 'Turbo V2 (Fastest)' },
            ],
            defaultValue: 'eleven_multilingual_v2',
          },
          {
            name: 'motion_prompt',
            type: 'textarea',
            label: 'Default Motion Prompt',
            placeholder: 'smooth camera movement, cinematic...',
            defaultValue: 'smooth camera movement',
          },
        ],
      },
    },
    
    // 4. Scene Splitter
    {
      id: 'scene-splitter',
      type: 'Splitter',
      position: { x: 100, y: 500 },
      data: {
        label: 'Scene Splitter',
        arrayPath: 'wireframes',
        description: 'Splits wireframes array for parallel scene processing',
      },
    },
    
    // 5. Generate Video (Worker) - Parallel
    {
      id: 'generate-video',
      type: 'Worker',
      position: { x: 50, y: 650 },
      data: {
        label: 'Generate Video',
        workerType: 'image-to-video',
        description: 'Converts wireframe to animated video',
      },
    },
    
    // 6. Generate Voice (Worker) - Parallel
    {
      id: 'generate-voice',
      type: 'Worker',
      position: { x: 200, y: 650 },
      data: {
        label: 'Generate Voice',
        workerType: 'elevenlabs',
        description: 'Generates voice narration from scene text',
      },
    },
    
    // 7. Mix Scene (Worker) - Parallel
    {
      id: 'mix-scene',
      type: 'Worker',
      position: { x: 350, y: 650 },
      data: {
        label: 'Mix Scene',
        workerType: 'shotstack',
        description: 'Combines video and audio for single scene',
        config: {
          resolution: 'hd',
          format: 'mp4',
        },
      },
    },
    
    // 8. Scene Collector
    {
      id: 'scene-collector',
      type: 'Collector',
      position: { x: 100, y: 800 },
      data: {
        label: 'Scene Collector',
        description: 'Waits for all scene processing to complete',
        collectAs: 'processed_scenes',
      },
    },
    
    // 9. Music Selection (MediaSelect)
    {
      id: 'music-selection',
      type: 'MediaSelect',
      position: { x: 100, y: 950 },
      data: {
        label: 'Music Selection',
        mediaType: 'audio',
        allowMultiple: false,
        description: 'Select background music from the Media Library',
      },
    },
    
    // 10. Final Assembly (Worker)
    {
      id: 'final-assembly',
      type: 'Worker',
      position: { x: 100, y: 1100 },
      data: {
        label: 'Final Assembly',
        workerType: 'shotstack',
        description: 'Concatenates all scene videos and adds background music',
        config: {
          resolution: 'hd',
          format: 'mp4',
          fps: 30,
        },
      },
    },
    
    // 11. Final Review (UX)
    {
      id: 'final-review',
      type: 'UX',
      position: { x: 100, y: 1250 },
      data: {
        label: 'Final Review',
        prompt: 'Review the final assembled video. Download or share as needed.',
        fields: [
          {
            name: 'approved',
            type: 'boolean',
            label: 'Approve Final Video',
            required: true,
          },
          {
            name: 'notes',
            type: 'textarea',
            label: 'Review Notes',
            placeholder: 'Any feedback or notes about the final video...',
          },
        ],
      },
    },
  ];
  
  // Create workflow edges
  const edges: StitchEdge[] = [
    // Main flow
    { id: 'e1', source: 'select-wireframes', target: 'load-wireframes' },
    { id: 'e2', source: 'load-wireframes', target: 'voice-settings' },
    { id: 'e3', source: 'voice-settings', target: 'scene-splitter' },
    
    // Parallel processing (M-shape)
    { id: 'e4', source: 'scene-splitter', target: 'generate-video' },
    { id: 'e5', source: 'scene-splitter', target: 'generate-voice' },
    { id: 'e6', source: 'generate-video', target: 'mix-scene' },
    { id: 'e7', source: 'generate-voice', target: 'mix-scene' },
    { id: 'e8', source: 'mix-scene', target: 'scene-collector' },
    
    // Final assembly
    { id: 'e9', source: 'scene-collector', target: 'music-selection' },
    { id: 'e10', source: 'music-selection', target: 'final-assembly' },
    { id: 'e11', source: 'final-assembly', target: 'final-review' },
  ];
  
  // Insert workflow
  const { data: workflow, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: 'Video Factory V2',
      canvas_type: 'workflow',
      parent_id: canvasId,
      graph: { nodes, edges },
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create workflow: ${error.message}`);
  }
  
  console.log('✅ Created Video Factory V2 workflow');
  return workflow.id;
}

/**
 * Main seed function - orchestrates workflow creation
 */
export async function seedVideoFactoryV2() {
  console.log('🌱 Seeding Video Factory V2 Workflow...\n');
  
  const supabase = getAdminClient();
  
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
    
    // Step 2: Create Video Factory V2 workflow
    console.log('📋 Step 2: Creating Video Factory V2 workflow...');
    const workflowId = await createVideoFactoryV2Workflow(bmc.id);
    console.log('');
    
    console.log('🎉 Video Factory V2 workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Video Factory V2 workflow created');
    console.log('   - 11 nodes configured (MediaSelect, UX, Workers, Splitter, Collector)');
    console.log('   - Media Library integration for wireframes and music');
    console.log('   - Parallel scene processing (video + voice + mix)');
    console.log('   - Final video assembly with background music');
    console.log('\n🚀 Workflow includes:');
    console.log('   1. Select Wireframes → Load Metadata');
    console.log('   2. Voice Settings → Scene Splitter');
    console.log('   3. Parallel: Generate Video + Generate Voice → Mix Scene');
    console.log('   4. Scene Collector → Music Selection');
    console.log('   5. Final Assembly → Final Review');
    
    return {
      success: true,
      canvasId: bmc.id,
      workflowId,
    };
    
  } catch (error) {
    console.error('❌ Video Factory V2 workflow seed failed:', error);
    throw error;
  }
}
