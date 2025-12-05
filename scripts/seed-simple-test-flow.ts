/**
 * Standalone Script: Seed Simple Test Flow
 * 
 * Run with: npx tsx scripts/seed-simple-test-flow.ts
 * 
 * This script seeds the database with a minimal test workflow
 * to verify end-to-end execution: Input → Claude → Output
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

async function main() {
  console.log('🌱 Starting Simple Test Flow Seed Script\n');
  
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
  
  try {
    // Import and run seed function
    const { seedSimpleTestFlow } = await import('../src/lib/seeds/simple-test-flow');
    await seedSimpleTestFlow();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (_error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
