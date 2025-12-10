import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST before any imports
config({ path: join(__dirname, '../.env.local') });

async function main() {
  const { getAdminClient } = await import('../src/lib/supabase/client');
  const _supabase = getAdminClient();
  const { error } = await _supabase
    .from('stitch_flows')
    .delete()
    .eq('name', 'Simple Test Flow');
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log('✅ Deleted Simple Test Flow');
  process.exit(0);
}

main();
