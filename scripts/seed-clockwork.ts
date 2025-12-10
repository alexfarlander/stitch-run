/**
 * Clockwork Canvas Master Seed Script
 * 
 * Seeds the complete Clockwork Canvas demo:
 * - Business Model Canvas with 13 sections and item nodes
 * - 13 Halloween-themed entities (monsters) at various journey stages
 * 
 * Implements idempotency - safe to run multiple times without creating duplicates.
 * 
 * Run with: npx tsx scripts/seed-clockwork.ts
 * 
 * Validates: Requirements 13.1, 13.2, 13.3, 13.5, 13.6, 13.7
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { seedDefaultBMC } from '../src/lib/seeds/default-bmc';
import { getClockworkEntitiesWithAvatars } from '../src/lib/seeds/clockwork-entities';
import { seedLeadCaptureWorkflow } from '../src/lib/seeds/workflows/lead-capture';
import { seedDemoSchedulingWorkflow } from '../src/lib/seeds/workflows/demo-scheduling';
import { seedTrialActivationWorkflow } from '../src/lib/seeds/workflows/trial-activation';
import { seedSupportHandlerWorkflow } from '../src/lib/seeds/workflows/support-handler';
import { seedCRMSyncWorkflow } from '../src/lib/seeds/workflows/crm-sync';
import { seedAnalyticsUpdateWorkflow } from '../src/lib/seeds/workflows/analytics-update';
import { seedSlackNotifyWorkflow } from '../src/lib/seeds/workflows/slack-notify';
import { seedStripeSyncWorkflow } from '../src/lib/seeds/workflows/stripe-sync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Seeds the 13 Halloween-themed entities for the Clockwork Canvas
 * Implements idempotency - checks for existing entities by email before inserting
 * 
 * @param canvasId - The BMC canvas ID to seed entities for
 */
async function seedClockworkEntities(canvasId: string): Promise<void> {
  console.log('👻 Seeding Clockwork entities...');
  
  const entities = getClockworkEntitiesWithAvatars();
  
  // Check which entities already exist (idempotency check)
  const { data: existingEntities, error: queryError } = await _supabase
    .from('stitch_entities')
    .select('email, id')
    .eq('canvas_id', canvasId);
  
  if (queryError) {
    throw new Error(`Failed to query existing entities: ${queryError.message}`);
  }
  
  const existingEmails = new Set(existingEntities?.map(e => e.email) || []);
  const clockworkEmails = new Set(entities.map(e => e.email));
  
  // Delete old demo entities (Monica, Ross, Rachel) if they exist
  const oldDemoEntities = existingEntities?.filter(e => !clockworkEmails.has(e.email)) || [];
  if (oldDemoEntities.length > 0) {
    console.log(`   🧹 Removing ${oldDemoEntities.length} old demo entities...`);
    const { error: deleteError } = await _supabase
      .from('stitch_entities')
      .delete()
      .in('id', oldDemoEntities.map(e => e.id));
    
    if (deleteError) {
      throw new Error(`Failed to delete old entities: ${deleteError.message}`);
    }
  }
  
  // Filter out entities that already exist
  const newEntities = entities.filter(e => !existingEmails.has(e.email));
  
  if (newEntities.length === 0) {
    console.log('   ℹ️  All 13 entities already exist (idempotent check passed)');
    return;
  }
  
  // Prepare entities for insertion
  const entitiesToInsert = newEntities.map(entity => ({
    canvas_id: canvasId,
    name: entity.name,
    email: entity.email,
    avatar_url: entity.avatar_url,
    entity_type: entity.entity_type,
    current_node_id: entity.current_node_id || null,
    current_edge_id: entity.current_edge_id || null,
    edge_progress: entity.edge_progress || null,
    destination_node_id: entity.destination_node_id || null,
    journey: [
      {
        type: 'created',
        timestamp: new Date().toISOString(),
        metadata: {
          monster_type: entity.monster_type,
          journey_story: entity.journey_story,
        },
      },
    ],
    metadata: {
      monster_type: entity.monster_type,
      journey_story: entity.journey_story,
    },
  }));
  
  // Insert new entities
  const { error: insertError } = await _supabase
    .from('stitch_entities')
    .insert(entitiesToInsert);
  
  if (insertError) {
    throw new Error(`Failed to insert entities: ${insertError.message}`);
  }
  
  console.log(`   ✅ Seeded ${newEntities.length} new entities`);
  console.log(`   📊 Total entities: ${entities.length}`);
}

/**
 * Main seed function
 * Seeds BMC canvas and Clockwork entities with full idempotency
 */
async function main() {
  console.log('🎃 Clockwork Canvas Seed Script\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Seed BMC canvas (idempotent - returns existing if present)
    console.log('📊 Step 1: Seeding Business Model Canvas...');
    const bmcId = await seedDefaultBMC(_supabase);
    console.log(`   ✅ BMC ready! Canvas ID: ${bmcId}\n`);
    
    // Step 2: Seed Clockwork entities (idempotent - skips existing)
    console.log('📊 Step 2: Seeding Clockwork entities...');
    await seedClockworkEntities(bmcId);
    console.log('');
    
    // Step 3: Seed drill-down workflows (idempotent - skips existing)
    console.log('📊 Step 3: Seeding drill-down workflows...\n');
    
    const workflows = [
      { name: 'Lead Capture', seed: () => seedLeadCaptureWorkflow(_supabase) },
      { name: 'Demo Scheduling', seed: () => seedDemoSchedulingWorkflow(_supabase) },
      { name: 'Trial Activation', seed: () => seedTrialActivationWorkflow(_supabase) },
      { name: 'Support Handler', seed: () => seedSupportHandlerWorkflow(_supabase) },
    ];
    
    console.log('   🔧 Seeding customer journey workflows...');
    for (const workflow of workflows) {
      try {
        await workflow.seed();
        console.log(`   ✅ ${workflow.name} workflow ready`);
      } catch (_error) {
        console.error(`   ❌ Failed to seed ${workflow.name}:`, _error);
        throw _error;
      }
    }
    console.log('');
    
    // Step 4: Seed production system workflows (idempotent - skips existing)
    console.log('📊 Step 4: Seeding production system workflows...\n');
    
    const productionWorkflows = [
      { name: 'CRM Sync', seed: () => seedCRMSyncWorkflow(_supabase) },
      { name: 'Analytics Update', seed: () => seedAnalyticsUpdateWorkflow(_supabase) },
      { name: 'Slack Notify', seed: () => seedSlackNotifyWorkflow(_supabase) },
      { name: 'Stripe Sync', seed: () => seedStripeSyncWorkflow(_supabase) },
    ];
    
    console.log('   ⚙️  Seeding production workflows...');
    for (const workflow of productionWorkflows) {
      try {
        await workflow.seed();
        console.log(`   ✅ ${workflow.name} workflow ready`);
      } catch (_error) {
        console.error(`   ❌ Failed to seed ${workflow.name}:`, _error);
        throw _error;
      }
    }
    console.log('');
    
    // Step 4.5: Link workflows to item nodes (enables drill-down navigation)
    console.log('📊 Step 4.5: Linking workflows to item nodes...\n');
    
    // Mapping of workflow names to their parent item node IDs
    const WORKFLOW_TO_ITEM_MAP: Record<string, string> = {
      'Lead Capture Logic': 'item-linkedin-ads',
      'Demo Scheduling Logic': 'item-demo-call',
      'Trial Activation Logic': 'item-free-trial',
      'Support Handler Logic': 'item-help-desk',
      'CRM Sync': 'item-crm',
      'Analytics Update': 'item-analytics',
      'Slack Notify': 'item-slack',
      'Stripe Sync': 'item-stripe',
    };
    
    // Get all workflows
    const { data: allWorkflows, error: fetchWorkflowsError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'workflow')
      .eq('parent_id', bmcId);
    
    if (fetchWorkflowsError) {
      throw new Error(`Failed to fetch workflows: ${fetchWorkflowsError.message}`);
    }
    
    // Get current BMC graph
    const { data: currentBmc, error: fetchBmcError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', bmcId)
      .single();
    
    if (fetchBmcError) {
      throw new Error(`Failed to fetch BMC: ${fetchBmcError.message}`);
    }
    
    // Update BMC graph with workflow links
    const graph = { ...currentBmc.graph };
    let linkedCount = 0;
    
    for (const workflow of allWorkflows || []) {
      const itemNodeId = WORKFLOW_TO_ITEM_MAP[workflow.name];
      
      if (!itemNodeId) continue;
      
      const nodeIndex = graph.nodes.findIndex((n: any) => n.id === itemNodeId);
      
      if (nodeIndex === -1) continue;
      
      // Only update if not already linked
      if (!graph.nodes[nodeIndex].data?.linked_workflow_id) {
        graph.nodes[nodeIndex] = {
          ...graph.nodes[nodeIndex],
          data: {
            ...graph.nodes[nodeIndex].data,
            linked_workflow_id: workflow.id,
          },
        };
        linkedCount++;
        console.log(`   ✅ Linked ${workflow.name} → ${itemNodeId}`);
      }
    }
    
    // Save updated BMC graph if any links were added
    if (linkedCount > 0) {
      const { error: updateError } = await _supabase
        .from('stitch_flows')
        .update({ graph })
        .eq('id', bmcId);
      
      if (updateError) {
        throw new Error(`Failed to update BMC with workflow links: ${updateError.message}`);
      }
      
      console.log(`   ✅ Updated ${linkedCount} item nodes with workflow links`);
    } else {
      console.log('   ℹ️  All item nodes already linked (idempotent check passed)');
    }
    console.log('');
    
    // Step 5: Verify the complete setup
    console.log('📊 Step 5: Verifying complete setup...\n');
    
    // Verify BMC structure
    const { data: bmc, error: bmcError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', bmcId)
      .single();
    
    if (bmcError) {
      throw new Error(`Failed to verify BMC: ${bmcError.message}`);
    }
    
    // Verify entities
    const { data: allEntities, error: entitiesError } = await _supabase
      .from('stitch_entities')
      .select('*')
      .eq('canvas_id', bmcId);
    
    if (entitiesError) {
      throw new Error(`Failed to verify entities: ${entitiesError.message}`);
    }
    
    // Verify workflows
    const { data: verifiedWorkflows, error: workflowsError } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'workflow')
      .eq('parent_id', bmcId);
    
    if (workflowsError) {
      throw new Error(`Failed to verify workflows: ${workflowsError.message}`);
    }
    
    // Count node types
    const sectionNodes = bmc.graph.nodes.filter((n: any) => n.type === 'section');
    const itemNodes = bmc.graph.nodes.filter((n: any) => n.type === 'section-item');
    const journeyEdges = bmc.graph.edges.filter((e: any) => e.type === 'journey');
    const systemEdges = bmc.graph.edges.filter((e: any) => e.type === 'system');
    
    // Count entity positions
    const entitiesOnNodes = allEntities?.filter(e => e.current_node_id) || [];
    const entitiesOnEdges = allEntities?.filter(e => e.current_edge_id) || [];
    
    console.log('   📋 BMC Structure:');
    console.log(`      - Canvas Name: ${bmc.name}`);
    console.log(`      - Canvas Type: ${bmc.canvas_type}`);
    console.log(`      - Section Nodes: ${sectionNodes.length}`);
    console.log(`      - Item Nodes: ${itemNodes.length}`);
    console.log(`      - Journey Edges: ${journeyEdges.length}`);
    console.log(`      - System Edges: ${systemEdges.length}`);
    console.log('');
    
    console.log('   🔧 Drill-Down Workflows:');
    console.log(`      - Total Workflows: ${verifiedWorkflows?.length || 0}`);
    verifiedWorkflows?.forEach((wf: any) => {
      const nodeCount = wf.graph?.nodes?.length || 0;
      console.log(`      - ${wf.name}: ${nodeCount} nodes`);
    });
    console.log('');
    
    console.log('   👻 Entity Distribution:');
    console.log(`      - Total Entities: ${allEntities?.length || 0}`);
    console.log(`      - On Nodes: ${entitiesOnNodes.length}`);
    console.log(`      - On Edges: ${entitiesOnEdges.length}`);
    console.log('');
    
    // Show entity breakdown by type
    const leads = allEntities?.filter(e => e.entity_type === 'lead') || [];
    const customers = allEntities?.filter(e => e.entity_type === 'customer') || [];
    const churned = allEntities?.filter(e => e.entity_type === 'churned') || [];
    
    console.log('   🎭 Entity Types:');
    console.log(`      - Leads: ${leads.length}`);
    console.log(`      - Customers: ${customers.length}`);
    console.log(`      - Churned: ${churned.length}`);
    console.log('');
    
    // Show sample entities
    console.log('   🦇 Sample Entities:');
    allEntities?.slice(0, 5).forEach((entity: any) => {
      const position = entity.current_node_id 
        ? `at node ${entity.current_node_id}`
        : entity.current_edge_id
        ? `on edge ${entity.current_edge_id} (${Math.round((entity.edge_progress || 0) * 100)}%)`
        : 'unpositioned';
      console.log(`      - ${entity.name} (${entity.entity_type}): ${position}`);
    });
    if ((allEntities?.length || 0) > 5) {
      console.log(`      ... and ${(allEntities?.length || 0) - 5} more`);
    }
    console.log('');
    
    // Validation checks
    const checks = [
      { name: 'BMC canvas exists', pass: !!bmc },
      { name: 'Canvas type is "bmc"', pass: bmc.canvas_type === 'bmc' },
      { name: 'Section count is 13', pass: sectionNodes.length === 13 },
      { name: 'Item nodes exist (>= 29)', pass: itemNodes.length >= 29 },
      { name: 'Journey edges exist', pass: journeyEdges.length > 0 },
      { name: 'System edges exist', pass: systemEdges.length > 0 },
      { name: 'Entity count is 13', pass: (allEntities?.length || 0) === 13 },
      { name: 'Entities on nodes (11)', pass: entitiesOnNodes.length === 11 },
      { name: 'Entities on edges (2)', pass: entitiesOnEdges.length === 2 },
      { name: 'All entities have avatars', pass: allEntities?.every(e => e.avatar_url) || false },
      { name: 'All entities have metadata', pass: allEntities?.every(e => e.metadata) || false },
      { name: 'Workflows seeded (8)', pass: (verifiedWorkflows?.length || 0) === 8 },
      { name: 'All workflows linked to BMC', pass: verifiedWorkflows?.every(w => w.parent_id === bmcId) || false },
    ];
    
    console.log('   ✓ Validation Checks:');
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`      ${icon} ${check.name}`);
    });
    console.log('');
    
    const allPassed = checks.every(c => c.pass);
    
    console.log('═'.repeat(60));
    console.log('');
    
    if (allPassed) {
      console.log('🎉 Clockwork Canvas seeded successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Open the canvas in your browser');
      console.log('  2. Click the "Play" button to run the demo');
      console.log('  3. Watch the monsters flow through the business!');
      console.log('');
    } else {
      console.log('⚠️  Some validation checks failed');
      console.log('   Please review the output above for details.');
      console.log('');
      process.exit(1);
    }
    
  } catch (_error) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.error('❌ Seed failed:', _error);
    console.log('');
    process.exit(1);
  }
}

main();
