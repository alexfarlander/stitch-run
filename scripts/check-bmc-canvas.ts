/**
 * Quick script to check BMC canvas in database
 */

import { getAdminClient } from '../src/lib/supabase/client';

async function main() {
  const supabase = getAdminClient();
  
  console.log('Checking for BMC canvas...\n');
  
  // Check all flows
  const { data: allFlows, error: allError } = await supabase
    .from('stitch_flows')
    .select('id, name, canvas_type');
  
  if (allError) {
    console.error('Error querying flows:', allError);
    return;
  }
  
  console.log('All flows:');
  console.log(JSON.stringify(allFlows, null, 2));
  
  // Check specifically for BMC
  const { data: bmcCanvas, error: bmcError } = await supabase
    .from('stitch_flows')
    .select('id, name, canvas_type')
    .eq('canvas_type', 'bmc')
    .maybeSingle();
  
  if (bmcError) {
    console.error('\nError querying BMC:', bmcError);
    return;
  }
  
  if (bmcCanvas) {
    console.log('\n✅ BMC canvas found:');
    console.log(JSON.stringify(bmcCanvas, null, 2));
  } else {
    console.log('\n❌ No BMC canvas found');
  }
}

main().catch(console.error);
