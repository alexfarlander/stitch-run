/**
 * Standalone Script: Seed Demo Journey
 * 
 * Run with: npx tsx scripts/seed-demo-journey.ts
 * 
 * This script seeds the database with Monica's journey scenario,
 * creating workflows, webhooks, and demo entities.
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { seedDemoJourney } from '../src/lib/seeds/demo-journey';

async function main() {
  console.log('🌱 Starting Demo Journey Seed Script\n');
  
  // Verify environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
    await seedDemoJourney();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
