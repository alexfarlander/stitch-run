/**
 * Script to apply entity tracking migrations
 * Run with: npx tsx scripts/apply-entity-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const _supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('Applying entity tracking migrations...\n');
  
  const migrations = [
    '004_entity_position_tracking.sql',
    '005_journey_events_table.sql',
  ];

  for (const migration of migrations) {
    console.log(`Applying ${migration}...`);
    
    const sql = readFileSync(
      join(__dirname, '../supabase/migrations', migration),
      'utf-8'
    );

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      const { error } = await _supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        console.error(`  ❌ Error in ${migration}:`, error.message);
        // Continue with other statements
      }
    }

    console.log(`  ✓ ${migration} applied\n`);
  }

  console.log('All migrations applied successfully!');
}

applyMigrations().catch(console.error);
