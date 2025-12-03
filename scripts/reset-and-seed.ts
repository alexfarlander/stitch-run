/**
 * Reset and Seed Script
 * 
 * Clears all data and reseeds the BMC canvas with demo journey
 * Run with: npx tsx scripts/reset-and-seed.ts
 */

import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables FIRST
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetDatabase() {
  console.log('🗑️  Resetting database...\n');
  
  try {
    // Delete in correct order to respect foreign keys
    console.log('   Deleting entities...');
    await supabase.from('stitch_entities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('   Deleting webhook events...');
    await supabase.from('stitch_webhook_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('   Deleting webhook configs...');
    await supabase.from('stitch_webhook_configs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('   Deleting runs...');
    await supabase.from('stitch_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('   Deleting flows...');
    await supabase.from('stitch_flows').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Database reset complete\n');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🌱 Reset and Seed Script\n');
  
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  }
  
  try {
    // Step 1: Reset database
    await resetDatabase();
    
    // Step 2: Seed BMC
    console.log('📋 Seeding BMC canvas...');
    const { execSync } = require('child_process');
    execSync('npx tsx scripts/seed-bmc.ts', { stdio: 'inherit' });
    
    // Step 3: Seed demo journey
    console.log('\n📋 Seeding demo journey...');
    execSync('npx tsx scripts/seed-demo-journey.ts', { stdio: 'inherit' });
    
    console.log('\n✅ Reset and seed complete!');
    console.log('\n🚀 Visit http://localhost:3000 to see your canvas');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
