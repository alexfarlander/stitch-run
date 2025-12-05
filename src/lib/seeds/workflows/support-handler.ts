/**
 * Support Handler Workflow Seed
 * 
 * Seeds the database with a support handler workflow that:
 * 1. Analyzes incoming support ticket using AI
 * 2. Generates AI-powered solution suggestions
 * 3. Escalates to human agent if needed based on complexity
 * 
 * This workflow is triggered when a support ticket is created
 * through Zendesk or other support systems
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { StitchNode, StitchEdge } from '@/types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

const WORKFLOW_NAME = 'Support Handler Logic';

/**
 * Creates the Support Handler workflow
 * 
 * Workflow structure:
 * Analyze Ticket → AI Suggest → Escalate if Needed
 * 
 * @param parentItemId - The ID of the parent BMC item node (e.g., 'item-help-desk')
 * @returns Workflow definition object
 */
export function createSupportHandlerWorkflow(parentItemId: string) {
  const nodes: StitchNode[] = [
    // 1. Analyze Ticket (Worker)
    {
      id: 'analyze-ticket',
      type: 'Worker',
      position: { x: 100, y: 100 },
      data: {
        label: 'Analyze Ticket',
        workerType: 'claude',
        description: 'Analyzes support ticket content, categorizes issue, and determines urgency',
        config: {
          prompt: 'Analyze this support ticket: {{input}}. Categorize the issue type, determine urgency level (low/medium/high/critical), and identify key topics.',
          model: 'claude-3-5-sonnet-20241022',
          outputFormat: {
            category: 'string',
            urgency: 'string',
            topics: 'array',
            sentiment: 'string',
          },
        },
      },
    },
    
    // 2. AI Suggest (Worker)
    {
      id: 'ai-suggest',
      type: 'Worker',
      position: { x: 300, y: 100 },
      data: {
        label: 'AI Suggest',
        workerType: 'claude',
        description: 'Generates AI-powered solution suggestions based on ticket analysis',
        config: {
          prompt: 'Based on this ticket analysis: {{input}}, provide 3 potential solutions with step-by-step instructions. Include relevant documentation links.',
          model: 'claude-3-5-sonnet-20241022',
          outputFormat: {
            solutions: 'array',
            confidence: 'number',
            documentation: 'array',
          },
        },
      },
    },
    
    // 3. Escalate if Needed (Worker)
    {
      id: 'escalate-if-needed',
      type: 'Worker',
      position: { x: 500, y: 100 },
      data: {
        label: 'Escalate if Needed',
        workerType: 'data-transform',
        description: 'Determines if ticket requires human escalation based on complexity and confidence',
        config: {
          escalationRules: {
            critical: true, // Always escalate critical issues
            lowConfidence: 0.7, // Escalate if AI confidence < 70%
            complexTopics: ['billing', 'security', 'data-loss', 'account-deletion'],
          },
          escalationActions: {
            assignToAgent: true,
            notifySlack: true,
            priorityBoost: true,
          },
          autoResolveThreshold: 0.9, // Auto-resolve if confidence > 90%
        },
      },
    },
  ];
  
  const edges: StitchEdge[] = [
    { id: 'e1', source: 'analyze-ticket', target: 'ai-suggest' },
    { id: 'e2', source: 'ai-suggest', target: 'escalate-if-needed' },
  ];
  
  return {
    name: WORKFLOW_NAME,
    parent_id: parentItemId,
    canvas_type: 'workflow' as const,
    graph: { nodes, edges },
  };
}

/**
 * Seeds the Support Handler workflow into the database
 * Links to the 'item-help-desk' parent node by default
 * 
 * @returns Promise resolving to the workflow ID
 * @throws Error if database operations fail
 */
export async function seedSupportHandlerWorkflow(supabase?: SupabaseClient): Promise<string> {
  console.log('🌱 Seeding Support Handler Logic Workflow...\n');
  
  // Use provided client or global admin client
  if (!supabase) {
    supabase = (global as any).supabaseAdminClient;
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
    const parentItemId = 'item-help-desk';
    const parentNode = bmc.graph.nodes.find((n: any) => n.id === parentItemId);
    
    if (!parentNode) {
      throw new Error(`Parent item node '${parentItemId}' not found in BMC canvas`);
    }
    
    console.log(`✅ Found parent node: ${parentItemId}\n`);
    
    // Step 4: Create the workflow
    console.log('📋 Step 4: Creating Support Handler workflow...');
    const workflowDef = createSupportHandlerWorkflow(parentItemId);
    
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
    
    console.log('🎉 Support Handler workflow seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Workflow ID: ${workflow.id}`);
    console.log(`   - Parent Node: ${parentItemId}`);
    console.log('   - 3 nodes configured:');
    console.log('     1. Analyze Ticket (claude)');
    console.log('     2. AI Suggest (claude)');
    console.log('     3. Escalate if Needed (data-transform)');
    console.log('   - 2 edges connecting the workflow');
    console.log('\n🚀 Workflow flow:');
    console.log('   Analyze Ticket → AI Suggest → Escalate if Needed');
    
    return workflow.id;
    
  } catch (error) {
    console.error('❌ Support Handler workflow seed failed:', error);
    throw error;
  }
}
