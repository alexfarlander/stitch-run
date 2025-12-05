/**
 * Demo Journey Seed Script
 * 
 * Seeds the database with "Monica's Journey" scenario to demonstrate
 * entity movement through the BMC canvas with webhooks and workflows.
 * 
 * This creates:
 * - BMC item nodes for the journey
 * - Internal workflows with entity movement configuration
 * - Webhook configurations
 * - Demo entities at various stages of the journey
 */

import { getAdminClient } from '../supabase/client';
import { StitchNode, StitchEdge, EntityMapping } from '@/types/stitch';

/**
 * Ensures required BMC item nodes exist on the canvas
 * Creates them if they don't exist
 */
async function ensureBMCItemNodes(canvasId: string) {
  const _supabase = getAdminClient();
  
  // Get the current BMC canvas
  const { data: canvas, error: canvasError } = await supabase
    .from('stitch_flows')
    .select('*')
    .eq('id', canvasId)
    .single();
  
  if (canvasError || !canvas) {
    throw new Error(`Failed to fetch BMC canvas: ${canvasError?.message}`);
  }
  
  const graph = canvas.graph;
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  
  // Required item nodes for the demo journey
  const requiredItems = [
    {
      id: 'node-linkedin-ad',
      label: 'LinkedIn Ad',
      section: 'Marketing',
      icon: 'Linkedin',
      type: 'worker',
      position: { x: 20, y: 80 }
    },
    {
      id: 'node-demo-form',
      label: 'Demo Form',
      section: 'Sales',
      icon: 'FileText',
      type: 'worker',
      position: { x: 20, y: 120 }
    },
    {
      id: 'node-trial-start',
      label: 'Trial Start',
      section: 'Offers',
      icon: 'Play',
      type: 'product',
      position: { x: 20, y: 120 }
    },
    {
      id: 'node-crm',
      label: 'CRM',
      section: 'Data',
      icon: 'Database',
      type: 'asset',
      position: { x: 20, y: 120 }
    },
    {
      id: 'node-active-customer',
      label: 'Active Customer',
      section: 'Paying Customers',
      icon: 'UserCheck',
      type: 'asset',
      position: { x: 80, y: 120 }
    }
  ];
  
  let modified = false;
  
  // Check and add missing nodes
  for (const item of requiredItems) {
    const exists = nodes.some((n: StitchNode) => n.id === item.id);
    
    if (!exists) {
      // Find the parent section node
      const sectionId = `section-${item.section.toLowerCase().replace(/\s+/g, '-')}`;
      const sectionNode = nodes.find((n: StitchNode) => n.id === sectionId);
      
      if (!sectionNode) {
        console.warn(`⚠️  Section ${item.section} not found, skipping ${item.label}`);
        continue;
      }
      
      // Add the item node
      nodes.push({
        id: item.id,
        type: 'section-item',
        position: item.position,
        data: {
          label: item.label,
          icon: item.icon,
          status: 'idle',
          itemType: item.type,
        },
        parentId: sectionId,
        extent: 'parent' as const,
      });
      
      modified = true;
      console.log(`✅ Added ${item.label} to ${item.section}`);
    }
  }
  
  // Add edges for the journey path if they don't exist
  const requiredEdges = [
    { id: 'edge-marketing-entry', source: 'node-linkedin-ad', target: 'node-demo-form' },
    { id: 'edge-sales-offers', source: 'node-demo-form', target: 'node-trial-start' },
    { id: 'edge-trial-customer', source: 'node-trial-start', target: 'node-active-customer' },
  ];
  
  for (const edge of requiredEdges) {
    const exists = edges.some((e: StitchEdge) => e.id === edge.id);
    
    if (!exists) {
      edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'journey',
      });
      
      modified = true;
      console.log(`✅ Added edge ${edge.id}`);
    }
  }
  
  // Update the canvas if modified
  if (modified) {
    const { error: updateError } = await supabase
      .from('stitch_flows')
      .update({ graph: { nodes, edges } })
      .eq('id', canvasId);
    
    if (updateError) {
      throw new Error(`Failed to update BMC canvas: ${updateError.message}`);
    }
    
    console.log('✅ BMC canvas updated with demo nodes');
  } else {
    console.log('ℹ️  All required nodes already exist');
  }
  
  return { nodes, edges };
}

/**
 * Creates the "Lead Capture Logic" workflow
 */
async function createLeadCaptureWorkflow(canvasId: string) {
  const _supabase = getAdminClient();
  
  // Check if workflow already exists
  const { data: existing } = await supabase
    .from('stitch_flows')
    .select('id')
    .eq('name', 'Lead Capture Logic')
    .eq('canvas_type', 'workflow')
    .single();
  
  if (existing) {
    console.log('ℹ️  Lead Capture Logic workflow already exists');
    return existing.id;
  }
  
  // Create workflow nodes
  const nodes: StitchNode[] = [
    {
      id: 'validate',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Validate Lead',
        workerType: 'validation',
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/workers/validate-lead`
      }
    },
    {
      id: 'score',
      type: 'Worker',
      position: { x: 100, y: 200 },
      data: {
        label: 'Score Lead',
        workerType: 'scoring',
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/workers/score-lead`
      }
    },
    {
      id: 'crm-sync',
      type: 'Worker',
      position: { x: 100, y: 300 },
      data: {
        label: 'CRM Sync',
        workerType: 'integration',
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/workers/crm-sync`,
        // Entity movement configuration - move to Demo Form on success
        entityMovement: {
          onSuccess: {
            targetSectionId: 'node-demo-form',
            completeAs: 'success' as const
          }
        }
      }
    }
  ];
  
  // Create workflow edges
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'validate', target: 'score' },
    { id: 'e2', source: 'score', target: 'crm-sync' }
  ];
  
  // Insert workflow
  const { data: workflow, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: 'Lead Capture Logic',
      canvas_type: 'workflow',
      parent_id: canvasId,
      graph: { nodes, edges }
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create workflow: ${error.message}`);
  }
  
  console.log('✅ Created Lead Capture Logic workflow');
  return workflow.id;
}

/**
 * Creates webhook configuration for LinkedIn leads
 */
async function createWebhookConfig(canvasId: string, workflowId: string) {
  const _supabase = getAdminClient();
  
  // Check if webhook config already exists
  const { data: existing } = await supabase
    .from('stitch_webhook_configs')
    .select('id')
    .eq('endpoint_slug', 'linkedin-lead')
    .single();
  
  if (existing) {
    console.log('ℹ️  LinkedIn webhook config already exists');
    return existing.id;
  }
  
  // Entity mapping for LinkedIn leads
  const entityMapping: EntityMapping = {
    name: '$.data.name',
    email: '$.data.email',
    entity_type: 'lead',
    metadata: {
      source: '$.source',
      campaign: '$.campaign',
      form_id: '$.form_id'
    }
  };
  
  // Insert webhook config
  // Use the first edge in the workflow (e1: validate -> score)
  const { data: config, error } = await supabase
    .from('stitch_webhook_configs')
    .insert({
      canvas_id: canvasId,
      name: 'LinkedIn Lead Gen',
      source: 'linkedin',
      endpoint_slug: 'linkedin-lead',
      secret: null, // No secret for demo
      workflow_id: workflowId,
      entry_edge_id: 'e1', // First edge in the workflow
      entity_mapping: entityMapping,
      is_active: true
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create webhook config: ${error.message}`);
  }
  
  console.log('✅ Created LinkedIn webhook configuration');
  console.log(`   Webhook URL: ${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/linkedin-lead`);
  return config.id;
}

/**
 * Seeds demo entities at various stages of the journey
 */
async function seedDemoEntities(canvasId: string) {
  const _supabase = getAdminClient();
  
  // Delete existing demo entities to recreate with correct node IDs
  await supabase
    .from('stitch_entities')
    .delete()
    .eq('canvas_id', canvasId)
    .in('email', ['monica@example.com', 'ross@example.com', 'rachel@example.com']);
  
  console.log('🗑️  Cleaned up existing demo entities');
  
  const entities = [
    // Monica - Completed journey, now an active customer
    {
      canvas_id: canvasId,
      name: 'Monica Geller',
      email: 'monica@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=monica',
      entity_type: 'customer',
      current_node_id: 'item-active-subscribers', // Use existing BMC node
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-11-01T10:00:00Z' },
        { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-11-01T10:01:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-11-02T14:00:00Z' },
        { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-11-02T15:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-11-02T15:01:00Z' },
        { type: 'started_edge', edge_id: 'e-trial-pro', timestamp: '2024-11-10T09:00:00Z' },
        { type: 'entered_node', node_id: 'item-active-subscribers', timestamp: '2024-11-10T09:01:00Z' },
        { type: 'converted', timestamp: '2024-11-10T09:01:00Z' }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'q4-2024',
        lead_score: 95,
        converted: true
      }
    },
    // Ross - Stuck in Sales (Demo Form)
    {
      canvas_id: canvasId,
      name: 'Ross Geller',
      email: 'ross@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ross',
      entity_type: 'lead',
      current_node_id: 'item-demo-call', // Use existing BMC node
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-11-15T08:00:00Z' },
        { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-11-15T08:30:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-11-16T11:00:00Z' }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'q4-2024',
        lead_score: 72,
        demo_scheduled: true
      }
    },
    // Rachel - Currently traveling on edge (visual journey)
    {
      canvas_id: canvasId,
      name: 'Rachel Green',
      email: 'rachel@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
      entity_type: 'lead',
      current_edge_id: 'e-linkedin-demo', // Use existing BMC edge
      edge_progress: 0.3,
      destination_node_id: 'item-demo-call', // Use existing BMC node
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-11-20T09:00:00Z' },
        { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-11-20T09:05:00Z' }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'q4-2024',
        lead_score: 68
      }
    }
  ];
  
  const { error } = await supabase
    .from('stitch_entities')
    .insert(entities);
  
  if (error) {
    throw new Error(`Failed to seed entities: ${error.message}`);
  }
  
  console.log(`✅ Seeded ${entities.length} demo entities`);
}

/**
 * Main seed function - orchestrates all seeding steps
 */
export async function seedDemoJourney() {
  console.log('🌱 Seeding Demo Journey...\n');
  
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
    
    // Step 2: Ensure required BMC item nodes exist
    console.log('📋 Step 2: Ensuring required BMC nodes exist...');
    await ensureBMCItemNodes(bmc.id);
    console.log('');
    
    // Step 3: Create Lead Capture workflow
    console.log('📋 Step 3: Creating Lead Capture workflow...');
    const workflowId = await createLeadCaptureWorkflow(bmc.id);
    console.log('');
    
    // Step 4: Create webhook configuration
    console.log('📋 Step 4: Creating webhook configuration...');
    await createWebhookConfig(bmc.id, workflowId);
    console.log('');
    
    // Step 5: Seed demo entities
    console.log('📋 Step 5: Seeding demo entities...');
    await seedDemoEntities(bmc.id);
    console.log('');
    
    console.log('🎉 Demo Journey seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - BMC canvas updated with journey nodes');
    console.log('   - Lead Capture workflow created');
    console.log('   - LinkedIn webhook configured');
    console.log('   - 3 demo entities seeded (Monica, Ross, Rachel)');
    console.log('\n🚀 You can now:');
    console.log('   1. View entities on the BMC canvas');
    console.log('   2. Send test webhooks to trigger entity movement');
    console.log(`   3. POST to: ${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/linkedin-lead`);
    
    return {
      success: true,
      canvasId: bmc.id,
      workflowId
    };
    
  } catch (_error) {
    console.error('❌ Demo Journey seed failed:', error);
    throw error;
  }
}
