/**
 * Lead Capture Logic Workflow Seed
 * 
 * Seeds the database with a lead capture workflow that:
 * 1. Validates lead data (email, company name)
 * 2. Scores lead quality using Claude AI
 * 3. Syncs lead to CRM (HubSpot)
 * 4. Assigns lead to appropriate SDR
 * 
 * This workflow is triggered when a new lead enters from Marketing channels
 * (LinkedIn Ads, YouTube Channel, SEO Content)
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'Lead Capture Logic';

/**
 * Creates the Lead Capture workflow
 * 
 * Workflow structure:
 * Validate Lead → Score Lead → CRM Sync → Assign SDR
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-linkedin-ads')
 * @returns Workflow definition object
 */
export function createLeadCaptureWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Validate Lead (Worker)
    {
      id: 'validate-lead',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Validate Lead',
        workerType: 'data-transform',
        description: 'Validates lead data including email format and required fields',
        config: {
          validations: ['email', 'company_name'],
          requiredFields: ['name', 'email'],
        },
      },
    },
    
    // 2. Score Lead (Worker)
    {
      id: 'score-lead',
      type: 'Worker',
      position: { x: 300, y: 100 },
      data: {
        label: 'Score Lead',
        workerType: 'claude',
        description: 'Analyzes lead quality and assigns a score using Claude AI',
        config: {
          prompt: 'Analyze lead quality based on: {{input}}. Provide a score from 0-100 and categorize as hot/warm/cold.',
          model: 'claude-3-5-sonnet-20241022',
        },
      },
    },
    
    // 3. CRM Sync (Worker)
    {
      id: 'crm-sync',
      type: 'Worker',
      position: { x: 500, y: 100 },
      data: {
        label: 'CRM Sync',
        workerType: 'webhook-trigger',
        description: 'Syncs lead data to HubSpot CRM',
        config: {
          url: 'https://api.hubspot.com/contacts',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      },
    },
    
    // 4. Assign SDR (Worker)
    {
      id: 'assign-sdr',
      type: 'Worker',
      position: { x: 700, y: 100 },
      data: {
        label: 'Assign SDR',
        workerType: 'data-transform',
        description: 'Assigns lead to appropriate Sales Development Representative based on score and territory',
        config: {
          assignmentRules: {
            hot: 'senior-sdr',
            warm: 'mid-sdr',
            cold: 'junior-sdr',
          },
        },
      },
    },
  ];
  
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'validate-lead', target: 'score-lead' },
    { id: 'e2', source: 'score-lead', target: 'crm-sync' },
    { id: 'e3', source: 'crm-sync', target: 'assign-sdr' },
  ];
  
  return {
    name: WORKFLOW_NAME,
    parent_id: parentItemId,
    canvas_type: 'workflow' as const,
    graph: { nodes, edges },
  };
}

/**
 * Seeds the Lead Capture workflow into the database
 * Links to the 'item-linkedin-ads' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedLeadCaptureWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding Lead Capture Logic Workflow...\n');
  
  // Use provided client or global admin client
  if (!supabase) {
    supabase = (global as unknown).supabaseAdminClient;
  }
  
  if (!supabase) {
    // Lazy import to avoid loading before env vars are set
    const { getAdminClient } = await import('../../supabase/client');
    supabase = getAdminClient();
  }
  
  const client = supabase;
  
  try {
    // Step 1: Check if workflow already exists (idempotency)
    console.log('📋 Step 1: Checking for existing workflow...');
    const { data: existing, error: queryError } = await client
      .from('stitch_flows')
      .select('id')
      .eq('name', WORKFLOW_NAME)
      .eq('canvas_type', 'workflow')
      .maybeSingle();
    
    if (queryError) {
      throw new Error(`Failed to query for existing workflow: ${queryError.message}`);
    }
    
    if (existing) {
      console.log(`ℹ️  ${WORKFLOW_NAME} already exists (ID: ${existing.id})`);
      return existing.id;
    }
    
    // Step 2: Get the BMC canvas to link the workflow
    console.log('📋 Step 2: Fetching BMC canvas...');
    const { data: bmc, error: bmcError } = await client
      .from('stitch_flows')
      .select('id, graph')
      .eq('canvas_type', 'bmc')
      .limit(1)
      .maybeSingle();
    
    if (bmcError) {
      throw new Error(`Failed to fetch BMC canvas: ${bmcError.message}`);
    }
    
    if (!bmc) {
      throw new Error('BMC canvas not found. Please run seed-clockwork.ts first.');
    }
    
    console.log(`✅ Found BMC canvas: ${bmc.id}\n`);
    
    // Step 3: Verify parent item node exists
    console.log('📋 Step 3: Verifying parent item node...');
    const parentItemId = 'item-linkedin-ads';
    const parentNode = bmc.graph.nodes.find((n: unknown) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating Lead Capture workflow...');
    const workflowDef = createLeadCaptureWorkflow(parentItemId);
    
    const { data: workflow, error: insertError } = await client
      .from('stitch_flows')
      .insert({
        name: workflowDef.name,
        canvas_type: workflowDef.canvas_type,
        parent_id: bmc.id,
        graph: workflowDef.graph,
      })
      .select('id')
      .single();
    
    if (insertError) {
      throw new Error(`Failed to create workflow: ${insertError.message}`);
    }
    
    if (!workflow) {
      throw new Error('Workflow insertion succeeded but no data returned');
    }
    
    console.log(`✅ Created ${WORKFLOW_NAME} (ID: ${workflow.id})\n`);
    
    console.log('🎉 Lead Capture workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 4 nodes configured:');
    console.log('     1. Validate Lead (data-transform)');
    console.log('     2. Score Lead (claude)');
    console.log('     3. CRM Sync (webhook-trigger)');
    console.log('     4. Assign SDR (data-transform)');
    console.log('   - 3 edges connecting the workflow');
    console.log('\n🚀 Workflow flow:');
    console.log('   Validate Lead → Score Lead → CRM Sync → Assign SDR');
    
    return workflow.id;
    
  } catch (_error) {
    console.error('❌ Lead Capture workflow seed failed:', error);
    throw error;
  }
}
