/**
 * Script to apply the BMC architecture migration and seed default BMC
 * Run with: npx tsx scripts/apply-bmc-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { seedDefaultBMC } from '../src/lib/seeds/default-bmc';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying BMC architecture migration...');
  
  const sql = readFileSync(
    join(__dirname, '../supabase/migrations/003_bmc_architecture.sql'),
    'utf-8'
  );

  // Split the SQL into individual statements and execute them
  // This is necessary because Supabase doesn't have a direct SQL execution endpoint
  // We'll use the service role key to execute via the REST API
  const { error } = await _supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    console.log('\nTrying alternative approach: executing statements individually...');
    
    // If exec_sql doesn't exist, we need to apply via Supabase Dashboard or CLI
    console.log('\n⚠️  Please apply the migration manually:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of: supabase/migrations/003_bmc_architecture.sql');
    console.log('4. Run the SQL');
    console.log('\nThen run this script again to seed the BMC.');
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!');
}

async function runSeed() {
  console.log('\n🌱 Seeding default BMC...');
  
  try {
    const bmcId = await seedDefaultBMC();
    console.log(`✅ BMC seeded successfully! Canvas ID: ${bmcId}`);

    // Verify the BMC was created correctly
    const { data: bmc, error } = await _supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', bmcId)
      .single();
    
    if (error) {
      console.error('❌ Failed to verify BMC:', error);
      process.exit(1);
    }
    
    console.log('\n📊 BMC Verification:');
    console.log(`   Name: ${bmc.name}`);
    console.log(`   Canvas Type: ${bmc.canvas_type}`);
    console.log(`   Parent ID: ${bmc.parent_id}`);
    console.log(`   Nodes: ${bmc.graph.nodes.length}`);
    console.log(`   Edges: ${bmc.graph.edges.length}`);
    
    // Verify all 12 sections are present
    const sectionNames = bmc.graph.nodes.map((n: any) => n.data.label).sort();
    console.log(`   Sections: ${sectionNames.join(', ')}`);
    
    if (bmc.graph.nodes.length === 12 && bmc.canvas_type === 'bmc' && bmc.parent_id === null) {
      console.log('\n✅ All verification checks passed!');
    } else {
      console.log('\n⚠️  Verification warnings detected');
    }
    
  } catch (_error) {
    console.error('❌ Seed failed:', _error);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting BMC migration and seed process...\n');
  
  await applyMigration();
  await runSeed();
  
  console.log('\n🎉 Process complete!');
}

main();
