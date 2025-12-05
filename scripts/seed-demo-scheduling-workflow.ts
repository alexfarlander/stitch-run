#!/usr/bin/env tsx
/**
 * Seed Script: Demo Scheduling Workflow
 * 
 * Seeds the Demo Scheduling workflow into the database.
 * This workflow handles the demo booking process:
 * Send Email → Wait for Booking → Pre-Demo Prep
 * 
 * Usage:
 *   tsx scripts/seed-demo-scheduling-workflow.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { seedDemoSchedulingWorkflow } from '../src/lib/seeds/workflows/demo-scheduling';

async function main() {
  console.log('🚀 Starting Demo Scheduling Workflow Seed\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    const workflowId = await seedDemoSchedulingWorkflow();
    
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('✅ Demo Scheduling workflow seed completed successfully!');
    console.log(`   Workflow ID: ${workflowId}`);
    console.log('=' .repeat(60));
    
    process.exit(0);
  } catch (_error) {
    console.error('\n');
    console.error('=' .repeat(60));
    console.error('❌ Demo Scheduling workflow seed failed!');
    console.error('=' .repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
