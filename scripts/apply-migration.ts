/**
 * Script to apply the atomic node state update migration
 * Run with: npx tsx scripts/apply-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying atomic node state update migration...');
  
  const sql = readFileSync(
    join(__dirname, '../supabase/migrations/20241202000002_atomic_node_state_update.sql'),
    'utf-8'
  );

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration applied successfully!');
}

applyMigration();
