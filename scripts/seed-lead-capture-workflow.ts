/**
 * Seed Script: Lead Capture Workflow
 * 
 * Seeds the Lead Capture workflow into the database.
 * This is a standalone script for testing Task 15.
 * 
 * Run with: npx tsx scripts/seed-lead-capture-workflow.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { seedLeadCaptureWorkflow } from '../src/lib/seeds/workflows/lead-capture';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Set up admin client for the seed function
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Make the admin client available globally for the seed function
(global as any).supabaseAdminClient = supabase;

async function main() {
  console.log('🌱 Lead Capture Workflow Seed Script\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  try {
    const workflowId = await seedLeadCaptureWorkflow();
    
    console.log('\n═'.repeat(60));
    console.log('\n🎉 Seed completed successfully!');
    console.log(`\n📋 Workflow ID: ${workflowId}`);
    console.log('\nNext steps:');
    console.log('  1. Run verification: npx tsx scripts/verify-lead-capture-workflow.ts');
    console.log('  2. View workflow in the database');
    console.log('  3. Test drill-down navigation from BMC canvas\n');
    
  } catch (error) {
    console.log('\n═'.repeat(60));
    console.log('\n❌ Seed failed:', error);
    console.log('');
    process.exit(1);
  }
}

main();
