/**
 * Script to verify the BMC canvas structure
 * Run with: npx tsx scripts/verify-bmc.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EXPECTED_SECTIONS = [
  'Data', 'People', 'Offers', 'Sales', 'Marketing', 'Integrations',
  'Code', 'Products', 'Support', 'Recommendations', 'Costs', 'Revenue'
];

async function main() {
  console.log('🔍 Verifying BMC database structure...\n');
  
  try {
    // Query for BMC canvas
    const { data: bmc, error } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('canvas_type', 'bmc')
      .eq('name', 'Default Business Model Canvas')
      .single();
    
    if (error) {
      console.error('❌ Failed to query BMC:', error);
      process.exit(1);
    }
    
    if (!bmc) {
      console.error('❌ No BMC found in database');
      process.exit(1);
    }
    
    console.log('✅ BMC found in database\n');
    console.log('📋 BMC Details:');
    console.log(`   ID: ${bmc.id}`);
    console.log(`   Name: ${bmc.name}`);
    console.log(`   Canvas Type: ${bmc.canvas_type}`);
    console.log(`   Parent ID: ${bmc.parent_id}`);
    console.log(`   Created: ${bmc.created_at}`);
    console.log(`   Updated: ${bmc.updated_at}`);
    
    // Verify graph structure
    console.log('\n📊 Graph Structure:');
    console.log(`   Nodes: ${bmc.graph.nodes.length}`);
    console.log(`   Edges: ${bmc.graph.edges.length}`);
    
    // Extract section names
    const sectionNames = bmc.graph.nodes.map((n: any) => n.data.label).sort();
    
    console.log('\n📝 Sections:');
    sectionNames.forEach((name: string) => {
      const node = bmc.graph.nodes.find((n: any) => n.data.label === name);
      console.log(`   - ${name} (${node.data.category}) at (${node.position.x}, ${node.position.y})`);
    });
    
    // Validation checks
    console.log('\n✓ Validation Checks:');
    
    const checks = [
      {
        name: 'Canvas type is "bmc"',
        pass: bmc.canvas_type === 'bmc',
        requirement: '1.1, 5.5'
      },
      {
        name: 'Parent ID is null (top-level canvas)',
        pass: bmc.parent_id === null,
        requirement: '5.6'
      },
      {
        name: 'Exactly 12 nodes',
        pass: bmc.graph.nodes.length === 12,
        requirement: '5.1'
      },
      {
        name: 'All nodes are type "section"',
        pass: bmc.graph.nodes.every((n: any) => n.type === 'section'),
        requirement: '5.1'
      },
      {
        name: 'All 12 standard section names present',
        pass: EXPECTED_SECTIONS.every(name => sectionNames.includes(name)),
        requirement: '5.3'
      },
      {
        name: 'Nodes have correct positioning',
        pass: bmc.graph.nodes.every((n: any) => 
          n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number'
        ),
        requirement: '5.2'
      },
      {
        name: 'Graph has edges connecting sections',
        pass: bmc.graph.edges.length > 0,
        requirement: '5.4'
      },
      {
        name: 'Valid React Flow structure',
        pass: bmc.graph.nodes && bmc.graph.edges && Array.isArray(bmc.graph.nodes) && Array.isArray(bmc.graph.edges),
        requirement: '5.7'
      },
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`   ${icon} ${check.name} (Req ${check.requirement})`);
      if (!check.pass) allPassed = false;
    });
    
    if (allPassed) {
      console.log('\n🎉 All requirements validated successfully!');
      console.log('\n✅ Task 4 Complete: Migration applied and BMC seeded with correct structure');
    } else {
      console.log('\n⚠️  Some validation checks failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

main();
