#!/usr/bin/env tsx
/**
 * Seed Video Factory V2 Workflow
 * 
 * This script seeds the database with the Video Factory V2 workflow,
 * which enables video production from wireframes with voice narration.
 * 
 * Usage:
 *   npm run seed:video-factory-v2
 *   or
 *   tsx scripts/seed-video-factory-v2.ts
 * 
 * Prerequisites:
 *   - Database must be initialized
 *   - BMC canvas must exist (run seed-bmc.ts first)
 *   - Media Library tables must exist (migration 009)
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

console.log('🚀 Video Factory V2 Workflow Seeder\n');
console.log('📁 Environment:', envPath);
console.log('🔗 Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set');
console.log('');

/**
 * Main execution function
 */
async function main() {
  try {
    // Import and run seed function
    const { seedVideoFactoryV2 } = await import('../src/lib/seeds/video-factory-v2');
    await seedVideoFactoryV2();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (_error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run main function
main();
