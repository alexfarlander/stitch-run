#!/usr/bin/env tsx
/**
 * Verify Video Factory V2 Workflow
 * 
 * This script verifies that the Video Factory V2 workflow was created correctly.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

async function main() {
  try {
    const { getAdminClient } = await import('../src/lib/supabase/client');
    
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('stitch_flows')
      .select('id, name, canvas_type, graph')
      .eq('name', 'Video Factory V2')
      .single();

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('✅ Workflow found:', data.name);
    console.log('📊 Nodes:', data.graph.nodes.length);
    console.log('🔗 Edges:', data.graph.edges.length);
    console.log('');
    console.log('Node types:');
    data.graph.nodes.forEach((node: any) => {
      console.log(`  - ${node.data.label} (${node.type})`);
    });
    
    console.log('\n✅ Verification successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

main();
