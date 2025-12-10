/**
 * Script to verify entities are properly seeded and positioned
 * Run with: npx tsx scripts/verify-entities.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyEntities() {
  console.log('🔍 Verifying entity setup...\n');

  // Get the BMC canvas (use the default one)
  const { data: bmcs, error: bmcError } = await _supabase
    .from('stitch_flows')
    .select('id, name')
    .eq('canvas_type', 'bmc')
    .eq('name', 'Default Business Model Canvas');

  if (bmcError || !bmcs || bmcs.length === 0) {
    console.error('❌ BMC not found:', bmcError);
    process.exit(1);
  }

  const bmc = bmcs[0];

  console.log(`✅ Found BMC: ${bmc.name} (${bmc.id})\n`);

  // Get all entities for this canvas
  const { data: entities, error: entitiesError } = await _supabase
    .from('stitch_entities')
    .select('*')
    .eq('canvas_id', bmc.id);

  if (entitiesError) {
    console.error('❌ Error fetching entities:', entitiesError);
    process.exit(1);
  }

  if (!entities || entities.length === 0) {
    console.log('⚠️  No entities found. Run: npx tsx scripts/seed-bmc.ts');
    process.exit(1);
  }

  console.log(`✅ Found ${entities.length} entities:\n`);

  entities.forEach((entity: unknown) => {
    const typeColor = {
      lead: '🔵',
      customer: '🟢',
      churned: '🔴'
    }[entity.entity_type] || '⚪';

    console.log(`${typeColor} ${entity.name}`);
    console.log(`   Type: ${entity.entity_type}`);
    console.log(`   Email: ${entity.email || 'N/A'}`);
    console.log(`   Current Node: ${entity.current_node_id || 'N/A'}`);
    console.log(`   Current Edge: ${entity.current_edge_id || 'N/A'}`);
    if (entity.current_edge_id) {
      console.log(`   Edge Progress: ${(entity.edge_progress * 100).toFixed(1)}%`);
    }
    console.log(`   Journey Events: ${entity.journey?.length || 0}`);
    console.log('');
  });

  // Verify nodes exist
  const { data: flow, error: flowError } = await _supabase
    .from('stitch_flows')
    .select('graph')
    .eq('id', bmc.id)
    .single();

  if (flowError || !flow) {
    console.error('❌ Error fetching flow graph:', flowError);
    process.exit(1);
  }

  const nodeIds = new Set(flow.graph.nodes.map((n: any) => n.id));
  
  console.log('📊 Validation:\n');
  
  let allValid = true;
  entities.forEach((entity: unknown) => {
    if (entity.current_node_id && !nodeIds.has(entity.current_node_id)) {
      console.log(`❌ ${entity.name}: Invalid node ID "${entity.current_node_id}"`);
      allValid = false;
    } else if (entity.current_node_id) {
      console.log(`✅ ${entity.name}: Valid position at "${entity.current_node_id}"`);
    } else if (entity.current_edge_id) {
      console.log(`✅ ${entity.name}: Traveling on edge "${entity.current_edge_id}"`);
    } else {
      console.log(`⚠️  ${entity.name}: No position set`);
    }
  });

  console.log('');
  
  if (allValid) {
    console.log('🎉 All entities are properly positioned!');
    console.log('\n📍 To view entities on the canvas:');
    console.log(`   Open: http://localhost:3000/canvas/${bmc.id}`);
  } else {
    console.log('⚠️  Some entities have invalid positions');
    process.exit(1);
  }
}

verifyEntities().catch((error) => {
  console.error('❌ Verification failed:', _error);
  process.exit(1);
});
