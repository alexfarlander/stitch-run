/**
 * Script to apply the canvas versioning migration
 * Run with: npx tsx scripts/apply-versioning-migration.ts
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

async function applyMigration() {
  console.log('Applying canvas versioning migration...');
  
  const sql = readFileSync(
    join(__dirname, '../supabase/migrations/010_canvas_versioning.sql'),
    'utf-8'
  );

  // Split by semicolons and execute each statement separately
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.length === 0) continue;
    
    console.log(`Executing: ${statement.substring(0, 50)}...`);
    
    const { error } = await _supabase.rpc('exec_sql', {
      sql: statement + ';'
    });

    if (error) {
      // Ignore "already exists" errors
      if (error.message.includes('already exists')) {
        console.log('  ↳ Already exists, skipping');
        continue;
      }
      
      console.error('Migration failed:', error);
      console.error('Statement:', statement);
      process.exit(1);
    }
    
    console.log('  ✓ Success');
  }

  console.log('\n✅ Migration applied successfully!');
}

applyMigration();
