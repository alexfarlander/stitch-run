#!/usr/bin/env tsx
/**
 * Seed Production System Workflows
 * 
 * Seeds all four production system workflows:
 * 1. CRM Sync (Validate → Transform → API Call)
 * 2. Analytics Update (Increment Metric)
 * 3. Slack Notify (Format → Post to Channel)
 * 4. Stripe Sync (Create/Update Subscription)
 * 
 * Usage:
 *   tsx scripts/seed-production-workflows.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { seedCRMSyncWorkflow } from '../src/lib/seeds/workflows/crm-sync';
import { seedAnalyticsUpdateWorkflow } from '../src/lib/seeds/workflows/analytics-update';
import { seedSlackNotifyWorkflow } from '../src/lib/seeds/workflows/slack-notify';
import { seedStripeSyncWorkflow } from '../src/lib/seeds/workflows/stripe-sync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🚀 Starting Production System Workflows Seed\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  // Store global reference for workflow functions
  (global as unknown).supabaseAdminClient = supabase;
  
  try {
    // Seed all four production workflows
    const workflowIds: Record<string, string> = {};
    
    // 1. CRM Sync
    console.log('1️⃣  CRM Sync Workflow');
    console.log('-'.repeat(60));
    workflowIds.crmSync = await seedCRMSyncWorkflow(supabase);
    console.log('\n');
    
    // 2. Analytics Update
    console.log('2️⃣  Analytics Update Workflow');
    console.log('-'.repeat(60));
    workflowIds.analyticsUpdate = await seedAnalyticsUpdateWorkflow(supabase);
    console.log('\n');
    
    // 3. Slack Notify
    console.log('3️⃣  Slack Notify Workflow');
    console.log('-'.repeat(60));
    workflowIds.slackNotify = await seedSlackNotifyWorkflow(supabase);
    console.log('\n');
    
    // 4. Stripe Sync
    console.log('4️⃣  Stripe Sync Workflow');
    console.log('-'.repeat(60));
    workflowIds.stripeSync = await seedStripeSyncWorkflow(supabase);
    console.log('\n');
    
    // Summary
    console.log('=' .repeat(60));
    console.log('🎉 All Production System Workflows Seeded Successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - CRM Sync: ${workflowIds.crmSync}`);
    console.log(`   - Analytics Update: ${workflowIds.analyticsUpdate}`);
    console.log(`   - Slack Notify: ${workflowIds.slackNotify}`);
    console.log(`   - Stripe Sync: ${workflowIds.stripeSync}`);
    console.log('\n✅ All 4 production workflows are ready!');
    
  } catch (_error) {
    console.error('\n❌ Production workflows seed failed:', error);
    process.exit(1);
  }
}

main();
