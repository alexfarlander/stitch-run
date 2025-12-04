/**
 * Script to seed the default BMC canvas
 * Run with: npx tsx scripts/seed-bmc.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// BMC Generation Logic (inlined to avoid import issues)
// Grid specifications: 140px wide × 100px tall cells, 20px gaps
// Total canvas: ~1540px wide × 900px tall

function slugifySection(name: string): string {
  return `section-${name.toLowerCase().replace(/\s+/g, '-')}`;
}

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

// Mock item nodes inside sections
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

// Edges between NODES (customer journey paths)
const BMC_ITEM_EDGES = [
  // Marketing to Sales
  { id: 'e-linkedin-demo', source: 'item-linkedin-ads', target: 'item-demo-call' },
  { id: 'e-youtube-demo', source: 'item-youtube-channel', target: 'item-demo-call' },
  
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

function generateBMCGraph() {
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
    parentNode: slugifySection(item.section),
    extent: 'parent' as const,
  }));

  const nodes = [...sectionNodes, ...itemNodes];

  // Edges connect item nodes (not sections)
  const edges = BMC_ITEM_EDGES.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'journey',
  }));

  return { nodes, edges };
}

async function seedBMC() {
  // Check if a BMC already exists (idempotency check)
  const { data: existingBMC, error: queryError } = await supabase
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
    console.log('ℹ️  BMC already exists, returning existing canvas ID');
    return existingBMC.id;
  }
  
  // Generate the BMC graph structure
  const graph = generateBMCGraph();
  
  // Insert the new BMC canvas
  const { data: newBMC, error: insertError } = await supabase
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
  
  return newBMC.id;
}

async function seedEntities(canvasId: string) {
  const entities = [
    // Monica - completed full journey, now paying customer
    {
      canvas_id: canvasId,
      name: 'Monica Geller',
      email: 'monica@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=monica',
      entity_type: 'customer',
      current_node_id: 'item-active-subscribers',
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-11-01T10:00:00Z' },
        { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-11-01T10:01:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-11-02T14:00:00Z' },
        { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-11-02T15:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-11-02T15:01:00Z' },
        { type: 'started_edge', edge_id: 'e-trial-pro', timestamp: '2024-11-10T09:00:00Z' },
        { type: 'entered_node', node_id: 'item-pro-plan', timestamp: '2024-11-10T09:01:00Z' },
        { type: 'converted', timestamp: '2024-11-10T09:01:00Z' }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'q4-2024',
        cac: 14,
        ltv: 340,
        plan: 'pro'
      }
    },
    // Ross - in free trial
    {
      canvas_id: canvasId,
      name: 'Ross Geller',
      email: 'ross@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ross',
      entity_type: 'lead',
      current_node_id: 'item-free-trial',
      journey: [
        { type: 'entered_node', node_id: 'item-seo-content', timestamp: '2024-11-15T08:00:00Z' },
        { type: 'started_edge', edge_id: 'e-seo-demo', timestamp: '2024-11-15T08:30:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-11-16T11:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-11-16T12:00:00Z' }
      ],
      metadata: {
        source: 'seo',
        cac: 8,
        plan: 'trial'
      }
    },
    // Rachel - currently traveling to demo call
    {
      canvas_id: canvasId,
      name: 'Rachel Green',
      email: 'rachel@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
      entity_type: 'lead',
      current_edge_id: 'e-linkedin-demo',
      edge_progress: 0.4,
      destination_node_id: 'item-demo-call',
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-11-20T09:00:00Z' },
        { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-11-20T09:05:00Z' }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'q4-2024'
      }
    },
    // Chandler - churned
    {
      canvas_id: canvasId,
      name: 'Chandler Bing',
      email: 'chandler@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chandler',
      entity_type: 'churned',
      current_node_id: 'item-basic-plan',
      completed_at: '2024-10-15T00:00:00Z',
      journey: [
        { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: '2024-09-01T10:00:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-09-03T14:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-09-03T15:00:00Z' },
        { type: 'entered_node', node_id: 'item-basic-plan', timestamp: '2024-09-15T09:00:00Z' },
        { type: 'churned', timestamp: '2024-10-15T00:00:00Z' }
      ],
      metadata: {
        source: 'youtube',
        cac: 22,
        ltv: 49,
        plan: 'basic',
        churn_reason: 'price'
      }
    },
    // Phoebe - just entered from YouTube
    {
      canvas_id: canvasId,
      name: 'Phoebe Buffay',
      email: 'phoebe@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=phoebe',
      entity_type: 'lead',
      current_node_id: 'item-youtube-channel',
      journey: [
        { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: new Date().toISOString() }
      ],
      metadata: {
        source: 'youtube'
      }
    }
  ];

  const { error } = await supabase.from('stitch_entities').insert(entities);
  if (error) throw error;

  console.log(`✅ Seeded ${entities.length} demo entities`);
}

async function main() {
  console.log('🌱 Seeding default BMC...\n');
  
  try {
    const bmcId = await seedBMC();
    console.log(`✅ BMC seeded successfully! Canvas ID: ${bmcId}\n`);
    
    // Seed demo entities
    await seedEntities(bmcId);
    
    // Verify the BMC was created correctly
    console.log('📊 Verifying BMC structure...');
    const { data: bmc, error } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', bmcId)
      .single();
    
    if (error) {
      console.error('❌ Failed to verify BMC:', error);
      process.exit(1);
    }
    
    console.log(`   Name: ${bmc.name}`);
    console.log(`   Canvas Type: ${bmc.canvas_type}`);
    console.log(`   Parent ID: ${bmc.parent_id}`);
    console.log(`   Total Nodes: ${bmc.graph.nodes.length}`);
    console.log(`   Total Edges: ${bmc.graph.edges.length}`);
    
    // Count node types
    const sectionNodes = bmc.graph.nodes.filter((n: any) => n.type === 'section');
    const itemNodes = bmc.graph.nodes.filter((n: any) => n.type === 'section-item');
    
    console.log(`   Section Nodes: ${sectionNodes.length}`);
    console.log(`   Item Nodes: ${itemNodes.length}`);
    
    // Verify all 12 sections are present
    const sectionNames = sectionNodes.map((n: any) => n.data.label).sort();
    console.log(`\n   Sections:`);
    sectionNames.forEach((name: string) => console.log(`     - ${name}`));
    
    console.log(`\n   Sample Items:`);
    itemNodes.slice(0, 5).forEach((n: any) => console.log(`     - ${n.data.label} (${n.data.itemType})`));
    if (itemNodes.length > 5) {
      console.log(`     ... and ${itemNodes.length - 5} more`);
    }
    
    // Validation checks
    const checks = [
      { name: 'Section count is 13', pass: sectionNodes.length === 13 },
      { name: 'Item count is 21', pass: itemNodes.length === 21 },
      { name: 'Edge count is 9', pass: bmc.graph.edges.length === 9 },
      { name: 'Canvas type is "bmc"', pass: bmc.canvas_type === 'bmc' },
      { name: 'Parent ID is null', pass: bmc.parent_id === null },
      { name: 'All items have parentNode', pass: itemNodes.every((n: any) => n.parentNode) },
    ];
    
    console.log('\n   Validation:');
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`     ${icon} ${check.name}`);
    });
    
    const allPassed = checks.every(c => c.pass);
    if (allPassed) {
      console.log('\n🎉 All verification checks passed!');
    } else {
      console.log('\n⚠️  Some verification checks failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
