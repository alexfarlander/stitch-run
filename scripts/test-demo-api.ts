/**
 * Test script for demo mode API
 * Run with: npx tsx scripts/test-demo-api.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDemoAPI() {
  console.log('🧪 Testing Demo Mode API\n');

  // Step 1: Get BMC canvas ID
  console.log('1️⃣  Finding BMC canvas...');
  const { data: bmc, error: bmcError } = await _supabase
    .from('stitch_flows')
    .select('id, name, canvas_type')
    .eq('canvas_type', 'bmc')
    .limit(1)
    .single();

  if (bmcError || !bmc) {
    console.error('❌ BMC not found:', bmcError);
    console.log('\n💡 Run: npx tsx scripts/seed-bmc.ts');
    process.exit(1);
  }

  console.log(`✅ Found BMC: ${bmc.name} (${bmc.id})\n`);

  // Step 2: Call demo API
  console.log('2️⃣  Calling demo API...');
  const response = await fetch(`${baseUrl}/api/demo/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasId: bmc.id,
      staggerDelay: 1000, // 1 second between spawns
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ API call failed:', error);
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Demo started successfully!\n');
  console.log('📊 Demo Session Info:');
  console.log(`   Session ID: ${result.sessionId}`);
  console.log(`   Status: ${result.status}`);
  console.log(`   Entities spawned: ${result.entities.length}`);
  console.log(`   Workflows triggered: ${result.runs.length}\n`);

  // Step 3: Verify entities were created
  console.log('3️⃣  Verifying entities...');
  for (const entity of result.entities) {
    const { data: dbEntity, error: entityError } = await _supabase
      .from('stitch_entities')
      .select('*')
      .eq('id', entity.id)
      .single();

    if (entityError || !dbEntity) {
      console.error(`❌ Entity ${entity.name} not found in database`);
      continue;
    }

    console.log(`✅ ${entity.name}:`);
    console.log(`   ID: ${dbEntity.id}`);
    console.log(`   Current Node: ${dbEntity.current_node_id}`);
    console.log(`   Type: ${dbEntity.entity_type}`);
    console.log(`   Email: ${dbEntity.email}`);
  }

  // Step 4: Verify runs were created
  console.log('\n4️⃣  Verifying workflow runs...');
  for (const run of result.runs) {
    const { data: dbRun, error: runError } = await _supabase
      .from('stitch_runs')
      .select('*')
      .eq('id', run.runId)
      .single();

    if (runError || !dbRun) {
      console.error(`❌ Run ${run.runId} not found in database`);
      continue;
    }

    console.log(`✅ Run for entity ${run.entityId}:`);
    console.log(`   Run ID: ${dbRun.id}`);
    console.log(`   Flow ID: ${dbRun.flow_id}`);
    console.log(`   Entity ID: ${dbRun.entity_id}`);
    console.log(`   Trigger: ${dbRun.trigger?.type}`);
  }

  console.log('\n🎉 All tests passed!');
}

testDemoAPI().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
