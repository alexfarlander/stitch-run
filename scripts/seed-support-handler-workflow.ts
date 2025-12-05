#!/usr/bin/env tsx

/**
 * Seed script for Support Handler workflow
 * 
 * This script seeds the Support Handler workflow into the database.
 * It can be run standalone or as part of the master seed script.
 * 
 * Usage:
 *   tsx scripts/seed-support-handler-workflow.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { seedSupportHandlerWorkflow } from '../src/lib/seeds/workflows/support-handler';

async function main() {
  console.log('🚀 Starting Support Handler workflow seed...\n');
  
  try {
    const workflowId = await seedSupportHandlerWorkflow();
    
    console.log('\n✅ Seed completed successfully!');
    console.log(`   Workflow ID: ${workflowId}`);
    
    process.exit(0);
  } catch (_error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
