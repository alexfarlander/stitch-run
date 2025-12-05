#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

async function main() {
  const { getAdminClient } = await import('../src/lib/supabase/client');
  const _supabase = getAdminClient();

  const { error } = await supabase
    .from('stitch_flows')
    .delete()
    .eq('name', 'Video Factory V2');

  if (error) {
    console.error('❌ Error deleting workflow:', error);
    process.exit(1);
  } else {
    console.log('✅ Deleted existing Video Factory V2 workflow');
    process.exit(0);
  }
}

main();
