/**
 * Standalone Script: Seed Wireframe Workflow
 * 
 * Run with: npx tsx scripts/seed-wireframe-workflow.ts
 * 
 * This script seeds the database with the Wireframe Generation workflow,
 * which includes script parsing, style reference generation, and parallel
 * wireframe generation for video production.
 */

import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

async function main() {
  console.log('🌱 Starting Wireframe Workflow Seed Script\n');
  
  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    console.warn('⚠️  NEXT_PUBLIC_BASE_URL not set, using default: http://localhost:3000');
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  }
  
  // Create admin client
  const _supabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Import and run seed function
    const { seedWireframeWorkflow } = await import('../src/lib/seeds/wireframe-workflow');
    await seedWireframeWorkflow();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (_error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
