#!/usr/bin/env tsx

/**
 * Seed Script: Trial Activation Workflow
 * 
 * Seeds the Trial Activation workflow into the database.
 * This workflow handles the trial activation process:
 * - Provision Account
 * - Send Onboarding
 * - Wait for Upgrade
 * 
 * Usage:
 *   tsx scripts/seed-trial-activation-workflow.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { seedTrialActivationWorkflow } from '../src/lib/seeds/workflows/trial-activation';

async function main() {
  console.log('🚀 Starting Trial Activation Workflow Seed\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    const workflowId = await seedTrialActivationWorkflow();
    
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('✅ Seed completed successfully!');
    console.log(`   Workflow ID: ${workflowId}`);
    console.log('=' .repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n');
    console.error('=' .repeat(60));
    console.error('❌ Seed failed!');
    console.error('=' .repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
