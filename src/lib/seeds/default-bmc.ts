/**
 * BMC Seed Script
 * Generates and seeds the default Business Model Canvas with 13 sections and item nodes
 * Grid specifications: 140px wide × 100px tall cells, 20px gaps
 * Total canvas: ~1540px wide × 900px tall
 */

import { createServerClient } from '../supabase/server';
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
  
  // CODE section
  { id: 'item-landing-page', label: 'Landing Page', icon: 'Globe', type: 'asset', section: 'Code', position: { x: 20, y: 50 } },
  { id: 'item-api-server', label: 'API Server', icon: 'Server', type: 'asset', section: 'Code', position: { x: 140, y: 50 } },
];

/**
 * Edges between NODES (customer journey paths)
 * These connect item nodes, not sections
 */
const BMC_ITEM_EDGES = [
  // Marketing to Sales
  { id: 'e-linkedin-demo', source: 'item-linkedin-ads', target: 'item-demo-call' },
  { id: 'e-youtube-demo', source: 'item-youtube-channel', target: 'item-demo-call' },
  { id: 'e-seo-demo', source: 'item-seo-content', target: 'item-demo-call' },
  
  // Sales to Offers
  { id: 'e-demo-trial', source: 'item-demo-call', target: 'item-free-trial' },
  
  // Offers to Products
  { id: 'e-trial-basic', source: 'item-free-trial', target: 'item-basic-plan' },
  { id: 'e-trial-pro', source: 'item-free-trial', target: 'item-pro-plan' },
  
  // Products to Support
  { id: 'e-basic-support', source: 'item-basic-plan', target: 'item-help-desk' },
  { id: 'e-pro-support', source: 'item-pro-plan', target: 'item-help-desk' },
  
  // Support to Recommendations
  { id: 'e-support-referral', source: 'item-help-desk', target: 'item-referral-program' },
  
  // Recommendations to Paying Customers
  { id: 'e-referral-subscribers', source: 'item-referral-program', target: 'item-active-subscribers' },
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
  const itemNodes = BMC_ITEMS.map((item) => ({
    id: item.id,
    type: 'section-item',
    position: item.position,
    data: {
      label: item.label,
      icon: item.icon,
      status: 'idle',
      itemType: item.type,
    },
    parentId: slugifySection(item.section),
    extent: 'parent' as const,
  }));

  const nodes = [...sectionNodes, ...itemNodes];

  // Edges connect item nodes (not sections)
  const edges: StitchEdge[] = BMC_ITEM_EDGES.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
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
  const client = supabase || createServerClient();
  
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
  const client = supabase || createServerClient();
  
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
  
  // Seed demo entities
  await seedEntities(newBMC.id, client);
  
  return newBMC.id;
}
