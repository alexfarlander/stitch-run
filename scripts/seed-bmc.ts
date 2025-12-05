/**
 * Script to seed the default BMC canvas
 * Run with: npx tsx scripts/seed-bmc.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { seedDefaultBMC, generateBMCGraph } from '../src/lib/seeds/default-bmc';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🌱 Seeding default BMC...\n');
  
  try {
    // Use the centralized seed function from lib/seeds, passing our script's Supabase client
    const bmcId = await seedDefaultBMC(supabase);
    console.log(`✅ BMC seeded successfully! Canvas ID: ${bmcId}\n`);
    
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
    
    // Verify all 13 sections are present
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
      { name: 'Edge count is 10', pass: bmc.graph.edges.length === 10 },
      { name: 'Canvas type is "bmc"', pass: bmc.canvas_type === 'bmc' },
      { name: 'Parent ID is null', pass: bmc.parent_id === null },
      { name: 'All items have parentId', pass: itemNodes.every((n: any) => n.parentId) },
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
