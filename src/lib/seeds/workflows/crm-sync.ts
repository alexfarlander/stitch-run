/**
 * CRM Sync Production Workflow Seed
 * 
 * Seeds the database with a CRM sync workflow that:
 * 1. Validates incoming data
 * 2. Transforms data to CRM format
 * 3. Makes API call to CRM system
 * 
 * This workflow is triggered by system edges when customer data needs to be synced
 * to the CRM (e.g., HubSpot, Salesforce)
 * 
 * Validates: Requirements 8.1
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'CRM Sync';

/**
 * Creates the CRM Sync workflow
 * 
 * Workflow structure:
 * Validate → Transform → API Call
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-crm')
 * @returns Workflow definition object
 */
export function createCRMSyncWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Validate (Worker)
    {
      id: 'validate-data',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Validate',
        workerType: 'data-transform',
        description: 'Validates incoming data before CRM sync',
        config: {
          validations: ['email', 'name', 'entity_type'],
          requiredFields: ['email'],
        },
      },
    },
    
    // 2. Transform (Worker)
    {
      id: 'transform-data',
      type: 'Worker',
      position: { x: 300, y: 100 },
      data: {
        label: 'Transform',
        workerType: 'data-transform',
        description: 'Transforms entity data to CRM-compatible format',
        config: {
          mapping: {
            email: 'properties.email',
            name: 'properties.firstname',
            entity_type: 'properties.lifecycle_stage',
            metadata: 'properties.custom_fields',
          },
        },
      },
    },
    
    // 3. API Call (Worker)
    {
      id: 'api-call',
      type: 'Worker',
      position: { x: 500, y: 100 },
      data: {
        label: 'API Call',
        workerType: 'webhook-trigger',
        description: 'Sends transformed data to CRM API',
        config: {
          url: 'https://api.hubspot.com/crm/v3/objects/contacts',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      },
    },
  ];
  
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'validate-data', target: 'transform-data' },
    { id: 'e2', source: 'transform-data', target: 'api-call' },
  ];
  
  return {
    name: WORKFLOW_NAME,
    parent_id: parentItemId,
    canvas_type: 'workflow' as const,
    graph: { nodes, edges },
  };
}

/**
 * Seeds the CRM Sync workflow into the database
 * Links to the 'item-crm' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedCRMSyncWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding CRM Sync Workflow...\n');
  
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
    const parentItemId = 'item-crm';
    const parentNode = bmc.graph.nodes.find((n: unknown) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating CRM Sync workflow...');
    const workflowDef = createCRMSyncWorkflow(parentItemId);
    
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
    
    console.log('🎉 CRM Sync workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 3 nodes configured:');
    console.log('     1. Validate (data-transform)');
    console.log('     2. Transform (data-transform)');
    console.log('     3. API Call (webhook-trigger)');
    console.log('   - 2 edges connecting the workflow');
    console.log('\n🚀 Workflow flow:');
    console.log('   Validate → Transform → API Call');
    
    return workflow.id;
    
  } catch (_error) {
    console.error('❌ CRM Sync workflow seed failed:', error);
    throw error;
  }
}
