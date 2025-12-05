#!/usr/bin/env tsx

/**
 * Verification Script: Entity Email Index Migration
 * 
 * Verifies that the migration file for the composite index on (canvas_id, email)
 * has been created correctly.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function verifyEntityEmailIndexMigration() {
  console.log('🔍 Verifying Entity Email Index Migration...\n');

  const migrationPath = join(process.cwd(), 'supabase/migrations/011_entity_email_canvas_index.sql');
  
  // Check if migration file exists
  if (!existsSync(migrationPath)) {
    console.error('❌ Migration file not found!');
    console.error(`   Expected: ${migrationPath}`);
    process.exit(1);
  }

  console.log('✅ Migration file exists');
  console.log(`   Location: ${migrationPath}\n`);

  // Read and validate migration content
  const content = readFileSync(migrationPath, 'utf-8');
  
  const checks = [
    {
      name: 'Contains CREATE INDEX statement',
      test: () => content.includes('CREATE INDEX'),
      required: true
    },
    {
      name: 'Uses IF NOT EXISTS clause',
      test: () => content.includes('IF NOT EXISTS'),
      required: true
    },
    {
      name: 'Index name is correct',
      test: () => content.includes('idx_stitch_entities_canvas_email'),
      required: true
    },
    {
      name: 'Targets stitch_entities table',
      test: () => content.includes('ON stitch_entities'),
      required: true
    },
    {
      name: 'Includes canvas_id column',
      test: () => content.includes('canvas_id'),
      required: true
    },
    {
      name: 'Includes email column',
      test: () => content.includes('email'),
      required: true
    },
    {
      name: 'Has proper documentation',
      test: () => content.includes('Migration 011') && content.includes('NOTES'),
      required: false
    }
  ];

  console.log('📋 Migration Content Checks:\n');
  
  let allPassed = true;
  for (const check of checks) {
    const passed = check.test();
    const icon = passed ? '✅' : (check.required ? '❌' : '⚠️');
    console.log(`   ${icon} ${check.name}`);
    
    if (!passed && check.required) {
      allPassed = false;
    }
  }

  console.log('\n📄 Migration Details:');
  console.log('   - Migration Number: 011');
  console.log('   - Index Name: idx_stitch_entities_canvas_email');
  console.log('   - Columns: (canvas_id, email)');
  console.log('   - Purpose: Optimize webhook entity lookups within a canvas');
  console.log('   - Requirement: 5.2 (Webhook entity find-or-create by email)');

  console.log('\n🔧 To apply this migration:');
  console.log('   1. Using Supabase CLI: supabase db push');
  console.log('   2. Using Supabase Dashboard: Copy SQL and run in SQL Editor');
  console.log('   3. The index uses IF NOT EXISTS, so it\'s safe to run multiple times');

  console.log('\n💡 Benefits of this composite index:');
  console.log('   - Faster entity lookups by email within a specific canvas');
  console.log('   - Optimizes webhook processing performance');
  console.log('   - Complements the existing single-column email index');

  if (allPassed) {
    console.log('\n✨ All required checks passed! Migration is ready to apply.');
  } else {
    console.error('\n❌ Some required checks failed. Please review the migration file.');
    process.exit(1);
  }
}

verifyEntityEmailIndexMigration();
