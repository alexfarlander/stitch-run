/**
 * BMC Seed Script
 * Generates and seeds the default Business Model Canvas with 13 sections and item nodes
 * Grid specifications: 140px wide × 100px tall cells, 20px gaps
 * Total canvas: ~1540px wide × 900px tall
 */

import type { StitchEdge } from '../../types/stitch';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Converts a section name to a safe, slugified node ID
 * Prevents collisions with other node types
 */
function slugifySection(name: string): string {
  return `section-${name.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * The 13 standard BMC sections with their categories, positions, and dimensions
 */
const BMC_SECTIONS = [
  // PRODUCTION SIDE (columns 1-4, rows 1-6)
  { name: 'Data', category: 'Production' as const, position: { x: 0, y: 0 }, width: 280, height: 300 },
  { name: 'People', category: 'Production' as const, position: { x: 300, y: 0 }, width: 280, height: 300 },
  { name: 'Integrations', category: 'Production' as const, position: { x: 0, y: 320 }, width: 280, height: 300 },
  { name: 'Code', category: 'Production' as const, position: { x: 300, y: 320 }, width: 280, height: 300 },
  
  // CUSTOMER JOURNEY (columns 5-8, rows 1-6)
  { name: 'Offers', category: 'Customer' as const, position: { x: 600, y: 0 }, width: 280, height: 300 },
  { name: 'Sales', category: 'Customer' as const, position: { x: 900, y: 0 }, width: 280, height: 300 },
  { name: 'Products', category: 'Customer' as const, position: { x: 600, y: 320 }, width: 280, height: 300 },
  { name: 'Support', category: 'Customer' as const, position: { x: 900, y: 320 }, width: 280, height: 300 },
  
  // RIGHT COLUMN (columns 9-10, rows 1-6)
  { name: 'Marketing', category: 'Customer' as const, position: { x: 1200, y: 0 }, width: 280, height: 200 },
  { name: 'Recommendations', category: 'Customer' as const, position: { x: 1200, y: 220 }, width: 280, height: 200 },
  { name: 'Paying Customers', category: 'Customer' as const, position: { x: 1200, y: 440 }, width: 280, height: 200 },
  
  // FINANCIAL (full width bottom, rows 7-8)
  { name: 'Costs', category: 'Financial' as const, position: { x: 0, y: 640 }, width: 720, height: 200 },
  { name: 'Revenue', category: 'Financial' as const, position: { x: 740, y: 640 }, width: 740, height: 200 },
];

/**
 * Mock item nodes inside sections (workers, assets, integrations, products)
 */
const BMC_ITEMS = [
  // MARKETING section
  { id: 'item-linkedin-ads', label: 'LinkedIn Ads', icon: 'Linkedin', type: 'worker', section: 'Marketing', position: { x: 20, y: 50 } },
  { id: 'item-youtube-channel', label: 'YouTube Channel', icon: 'Youtube', type: 'worker', section: 'Marketing', position: { x: 140, y: 50 } },
  { id: 'item-seo-content', label: 'SEO Content', icon: 'Search', type: 'worker', section: 'Marketing', position: { x: 80, y: 120 } },
  
  // SALES section
  { id: 'item-demo-call', label: 'Demo Call', icon: 'Phone', type: 'worker', section: 'Sales', position: { x: 20, y: 50 } },
  { id: 'item-email-sequence', label: 'Email Sequence', icon: 'Mail', type: 'worker', section: 'Sales', position: { x: 140, y: 50 } },
  
  // OFFERS section
  { id: 'item-free-trial', label: 'Free Trial', icon: 'Gift', type: 'product', section: 'Offers', position: { x: 20, y: 50 } },
  { id: 'item-lead-magnet', label: 'Lead Magnet', icon: 'Magnet', type: 'product', section: 'Offers', position: { x: 140, y: 50 } },
  
  // PRODUCTS section
  { id: 'item-basic-plan', label: 'Basic Plan', icon: 'Package', type: 'product', section: 'Products', position: { x: 20, y: 50 } },
  { id: 'item-pro-plan', label: 'Pro Plan', icon: 'Star', type: 'product', section: 'Products', position: { x: 140, y: 50 } },
  { id: 'item-enterprise', label: 'Enterprise', icon: 'Building', type: 'product', section: 'Products', position: { x: 80, y: 150 } },
  
  // SUPPORT section
  { id: 'item-help-desk', label: 'Help Desk', icon: 'Headphones', type: 'worker', section: 'Support', position: { x: 20, y: 50 } },
  { id: 'item-knowledge-base', label: 'Knowledge Base', icon: 'BookOpen', type: 'asset', section: 'Support', position: { x: 140, y: 50 } },
  
  // RECOMMENDATIONS section
  { id: 'item-referral-program', label: 'Referral Program', icon: 'Share2', type: 'worker', section: 'Recommendations', position: { x: 80, y: 50 } },
  
  // PAYING CUSTOMERS section
  { id: 'item-active-subscribers', label: 'Active Subscribers', icon: 'Users', type: 'asset', section: 'Paying Customers', position: { x: 80, y: 50 } },
  
  // DATA section
  { id: 'item-crm', label: 'CRM', icon: 'Database', type: 'asset', section: 'Data', position: { x: 20, y: 50 } },
  { id: 'item-analytics', label: 'Analytics', icon: 'BarChart2', type: 'asset', section: 'Data', position: { x: 140, y: 50 } },
  
  // PEOPLE section
  { id: 'item-team', label: 'Team', icon: 'Users', type: 'asset', section: 'People', position: { x: 80, y: 50 } },
  
  // INTEGRATIONS section
  { id: 'item-stripe', label: 'Stripe', icon: 'CreditCard', type: 'integration', section: 'Integrations', position: { x: 20, y: 50 } },
  { id: 'item-supabase', label: 'Supabase', icon: 'Database', type: 'integration', section: 'Integrations', position: { x: 140, y: 50 } },
  { id: 'item-slack', label: 'Slack', icon: 'MessageSquare', type: 'integration', section: 'Integrations', position: { x: 80, y: 150 } },
  
  // CODE section
  { id: 'item-landing-page', label: 'Landing Page', icon: 'Globe', type: 'asset', section: 'Code', position: { x: 20, y: 50 } },
  { id: 'item-api-server', label: 'API Server', icon: 'Server', type: 'asset', section: 'Code', position: { x: 140, y: 50 } },
  
  // REVENUE section (Financial nodes)
  { id: 'item-mrr', label: 'MRR', icon: 'DollarSign', type: 'financial', section: 'Revenue', position: { x: 50, y: 50 }, value: 12450 },
  { id: 'item-arr', label: 'ARR', icon: 'TrendingUp', type: 'financial', section: 'Revenue', position: { x: 200, y: 50 }, value: 149400 },
  { id: 'item-ltv', label: 'LTV', icon: 'Target', type: 'financial', section: 'Revenue', position: { x: 350, y: 50 }, value: 5000 },
  
  // COSTS section (Financial nodes)
  { id: 'item-stripe-fees', label: 'Stripe Fees', icon: 'CreditCard', type: 'financial', section: 'Costs', position: { x: 50, y: 50 }, value: 361 },
  { id: 'item-claude-cost', label: 'Claude API', icon: 'Cpu', type: 'financial', section: 'Costs', position: { x: 200, y: 50 }, value: 150 },
  { id: 'item-elevenlabs-cost', label: 'ElevenLabs', icon: 'Mic', type: 'financial', section: 'Costs', position: { x: 350, y: 50 }, value: 75 },
  { id: 'item-minimax-cost', label: 'MiniMax', icon: 'Video', type: 'financial', section: 'Costs', position: { x: 500, y: 50 }, value: 200 },
];

/**
 * Edges between NODES (customer journey paths and system connections)
 * Journey edges: solid lines for entity travel
 * System edges: dashed lines for background automation
 */
const BMC_ITEM_EDGES = [
  // ===== JOURNEY EDGES (Customer Journey) =====
  
  // Marketing to Sales
  { id: 'e-linkedin-demo', source: 'item-linkedin-ads', target: 'item-demo-call', type: 'journey' },
  { id: 'e-youtube-demo', source: 'item-youtube-channel', target: 'item-demo-call', type: 'journey' },
  { id: 'e-seo-demo', source: 'item-seo-content', target: 'item-demo-call', type: 'journey' },
  
  // Sales to Offers
  { id: 'e-demo-trial', source: 'item-demo-call', target: 'item-free-trial', type: 'journey' },
  { id: 'e-demo-magnet', source: 'item-demo-call', target: 'item-lead-magnet', type: 'journey' },
  
  // Offers to Products
  { id: 'e-trial-basic', source: 'item-free-trial', target: 'item-basic-plan', type: 'journey' },
  { id: 'e-trial-pro', source: 'item-free-trial', target: 'item-pro-plan', type: 'journey' },
  { id: 'e-trial-enterprise', source: 'item-free-trial', target: 'item-enterprise', type: 'journey' },
  
  // Products to Support
  { id: 'e-basic-support', source: 'item-basic-plan', target: 'item-help-desk', type: 'journey' },
  { id: 'e-pro-support', source: 'item-pro-plan', target: 'item-help-desk', type: 'journey' },
  { id: 'e-enterprise-support', source: 'item-enterprise', target: 'item-help-desk', type: 'journey' },
  
  // Support to Recommendations
  { id: 'e-support-referral', source: 'item-help-desk', target: 'item-referral-program', type: 'journey' },
  
  // Recommendations to Paying Customers
  { id: 'e-referral-subscribers', source: 'item-referral-program', target: 'item-active-subscribers', type: 'journey' },
  
  // Products to Paying Customers (direct conversion)
  { id: 'e-basic-subscribers', source: 'item-basic-plan', target: 'item-active-subscribers', type: 'journey' },
  { id: 'e-pro-subscribers', source: 'item-pro-plan', target: 'item-active-subscribers', type: 'journey' },
  { id: 'e-enterprise-subscribers', source: 'item-enterprise', target: 'item-active-subscribers', type: 'journey' },
  
  // ===== SYSTEM EDGES (Background Automation) =====
  
  // Marketing to Data (CRM sync)
  { id: 'sys-linkedin-crm', source: 'item-linkedin-ads', target: 'item-crm', type: 'system', data: { systemAction: 'crm_sync' } },
  { id: 'sys-youtube-crm', source: 'item-youtube-channel', target: 'item-crm', type: 'system', data: { systemAction: 'crm_sync' } },
  { id: 'sys-seo-crm', source: 'item-seo-content', target: 'item-crm', type: 'system', data: { systemAction: 'crm_sync' } },
  
  // Marketing to Data (Analytics)
  { id: 'sys-linkedin-analytics', source: 'item-linkedin-ads', target: 'item-analytics', type: 'system', data: { systemAction: 'analytics_update' } },
  { id: 'sys-youtube-analytics', source: 'item-youtube-channel', target: 'item-analytics', type: 'system', data: { systemAction: 'analytics_update' } },
  { id: 'sys-seo-analytics', source: 'item-seo-content', target: 'item-analytics', type: 'system', data: { systemAction: 'analytics_update' } },
  
  // Sales to Integrations (Slack notifications)
  { id: 'sys-demo-slack', source: 'item-demo-call', target: 'item-slack', type: 'system', data: { systemAction: 'slack_notify' } },
  
  // Products to Integrations (Stripe sync)
  { id: 'sys-basic-stripe', source: 'item-basic-plan', target: 'item-stripe', type: 'system', data: { systemAction: 'stripe_sync' } },
  { id: 'sys-pro-stripe', source: 'item-pro-plan', target: 'item-stripe', type: 'system', data: { systemAction: 'stripe_sync' } },
  { id: 'sys-enterprise-stripe', source: 'item-enterprise', target: 'item-stripe', type: 'system', data: { systemAction: 'stripe_sync' } },
  
  // Products to Data (Analytics)
  { id: 'sys-basic-analytics', source: 'item-basic-plan', target: 'item-analytics', type: 'system', data: { systemAction: 'analytics_update' } },
  { id: 'sys-pro-analytics', source: 'item-pro-plan', target: 'item-analytics', type: 'system', data: { systemAction: 'analytics_update' } },
  { id: 'sys-enterprise-analytics', source: 'item-enterprise', target: 'item-analytics', type: 'system', data: { systemAction: 'analytics_update' } },
  
  // Support to Integrations (Slack notifications)
  { id: 'sys-support-slack', source: 'item-help-desk', target: 'item-slack', type: 'system', data: { systemAction: 'slack_notify' } },
  
  // Support to Data (CRM sync)
  { id: 'sys-support-crm', source: 'item-help-desk', target: 'item-crm', type: 'system', data: { systemAction: 'crm_sync' } },
];

/**
 * Generates the React Flow graph structure for the default BMC
 * Creates 13 section nodes (background containers) and 21 item nodes (interactive workers/assets)
 * 
 * @returns Graph object with nodes and edges arrays
 */
export function generateBMCGraph(): { nodes: any[]; edges: StitchEdge[] } {
  // Section nodes (background containers)
  const sectionNodes = BMC_SECTIONS.map((section) => ({
    id: slugifySection(section.name),
    type: 'section',
    position: section.position,
    data: {
      label: section.name,
      category: section.category,
    },
    style: {
      width: section.width,
      height: section.height,
      zIndex: -1,
    },
    className: 'stitch-section-node',
  }));

  // Item nodes (interactive workers/assets inside sections)
  const itemNodes = BMC_ITEMS.map((item) => {
    // Use financial-item type for nodes with value property
    const isFinancial = (item as any).value !== undefined;
    
    return {
      id: item.id,
      type: isFinancial ? 'financial-item' : 'section-item',
      position: item.position,
      data: {
        label: item.label,
        icon: item.icon,
        status: 'idle',
        itemType: item.type,
        value: (item as any).value, // Financial nodes have a value property
        currency: (item as any).value !== undefined ? 'USD' : undefined,
        format: (item as any).value !== undefined ? 'currency' : undefined,
      },
      parentId: slugifySection(item.section),
      extent: 'parent' as const,
    };
  });

  const nodes = [...sectionNodes, ...itemNodes];

  // Edges connect item nodes (not sections)
  // Journey edges: solid lines for entity travel
  // System edges: dashed lines for background automation
  const edges: StitchEdge[] = BMC_ITEM_EDGES.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type || 'journey',
    animated: edge.type === 'journey',
    style: edge.type === 'system' ? {
      stroke: '#64748b',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    } : undefined,
    data: edge.data || {},
  }));

  return { nodes, edges };
}

/**
 * Seeds demo entities for the BMC canvas
 * Creates 3 test entities (Monica, Ross, Rachel) at different workflow nodes
 * 
 * @param canvasId - The BMC canvas ID to seed entities for
 * @param supabase - Optional Supabase client (uses createServerClient if not provided)
 * @throws Error if database operations fail
 */
async function seedEntities(canvasId: string, supabase?: SupabaseClient): Promise<void> {
  if (!supabase) {
    const { createServerClient } = await import('../supabase/server');
    supabase = createServerClient();
  }
  const client = supabase;
  
  const entities = [
    // Monica - at LinkedIn Ads (Marketing section)
    {
      canvas_id: canvasId,
      name: 'Monica',
      email: 'monica@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=monica',
      entity_type: 'lead',
      current_node_id: 'item-linkedin-ads',
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: new Date().toISOString() }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'demo-2024'
      }
    },
    // Ross - at Demo Call (Sales section)
    {
      canvas_id: canvasId,
      name: 'Ross',
      email: 'ross@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ross',
      entity_type: 'lead',
      current_node_id: 'item-demo-call',
      journey: [
        { type: 'entered_node', node_id: 'item-seo-content', timestamp: '2024-12-01T08:00:00Z' },
        { type: 'started_edge', edge_id: 'e-seo-demo', timestamp: '2024-12-01T08:30:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: new Date().toISOString() }
      ],
      metadata: {
        source: 'seo'
      }
    },
    // Rachel - at Free Trial (Offers section)
    {
      canvas_id: canvasId,
      name: 'Rachel',
      email: 'rachel@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
      entity_type: 'lead',
      current_node_id: 'item-free-trial',
      journey: [
        { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: '2024-12-02T09:00:00Z' },
        { type: 'started_edge', edge_id: 'e-youtube-demo', timestamp: '2024-12-02T09:05:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-12-03T14:00:00Z' },
        { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-12-03T15:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: new Date().toISOString() }
      ],
      metadata: {
        source: 'youtube',
        campaign: 'demo-2024'
      }
    }
  ];

  const { error } = await client.from('stitch_entities').insert(entities);
  if (error) throw error;
}

/**
 * Seeds the default BMC canvas into the database
 * Implements idempotency - returns existing BMC if one already exists
 * 
 * @param supabase - Optional Supabase client (uses createServerClient if not provided)
 * @returns Promise resolving to the BMC canvas ID
 * @throws Error if database operations fail
 */
export async function seedDefaultBMC(supabase?: SupabaseClient): Promise<string> {
  if (!supabase) {
    const { createServerClient } = await import('../supabase/server');
    supabase = createServerClient();
  }
  const client = supabase;
  
  // Check if a BMC already exists (idempotency check)
  const { data: existingBMC, error: queryError } = await client
    .from('stitch_flows')
    .select('id')
    .eq('canvas_type', 'bmc')
    .eq('name', 'Default Business Model Canvas')
    .single();
  
  if (queryError && queryError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" - that's expected if BMC doesn't exist
    throw new Error(`Failed to query for existing BMC: ${queryError.message}`);
  }
  
  // If BMC already exists, return its ID
  if (existingBMC) {
    return existingBMC.id;
  }
  
  // Generate the BMC graph structure
  const graph = generateBMCGraph();
  
  // Insert the new BMC canvas
  const { data: newBMC, error: insertError } = await client
    .from('stitch_flows')
    .insert({
      name: 'Default Business Model Canvas',
      graph,
      canvas_type: 'bmc',
      parent_id: null,
    })
    .select('id')
    .single();
  
  if (insertError) {
    throw new Error(`Failed to insert BMC: ${insertError.message}`);
  }
  
  if (!newBMC) {
    throw new Error('BMC insertion succeeded but no data returned');
  }
  
  // Note: Demo entities are now seeded separately via seed-clockwork.ts
  // This keeps the BMC seed focused on canvas structure only
  
  return newBMC.id;
}
