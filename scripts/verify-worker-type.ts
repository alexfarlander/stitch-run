#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

async function main() {
  const { getAdminClient } = await import('../src/lib/supabase/client');
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_flows')
    .select('graph')
    .eq('name', 'Video Factory V2')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  const loadWireframesNode = data.graph.nodes.find((n: any) => n.id === 'load-wireframes');
  
  if (!loadWireframesNode) {
    console.error('❌ Load Wireframes node not found');
    process.exit(1);
  }

  console.log('✅ Load Wireframes node found');
  console.log('   Worker Type:', loadWireframesNode.data.workerType);
  console.log('   Config:', JSON.stringify(loadWireframesNode.data.config, null, 2));
  
  if (loadWireframesNode.data.workerType === 'media-library') {
    console.log('\n✅ Correct worker type configured!');
    process.exit(0);
  } else {
    console.log('\n❌ Incorrect worker type:', loadWireframesNode.data.workerType);
    process.exit(1);
  }
}

main();
