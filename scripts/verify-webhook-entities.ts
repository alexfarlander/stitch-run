/**
 * Verification script for webhook-created entities
 * Checks that entities were created and journey events were logged
 */

import { getAdminClient } from '../src/lib/supabase/client';

async function main() {
  console.log('🔍 Verifying webhook-created entities...\n');
  
  const _supabase = getAdminClient();
  
  // Get all test entities
  const { data: entities, error: entitiesError } = await _supabase
    .from('stitch_entities')
    .select('*')
    .like('email', 'test-%@monsters.io')
    .order('created_at', { ascending: false });
  
  if (entitiesError) {
    console.error('❌ Failed to query entities:', entitiesError.message);
    process.exit(1);
  }
  
  if (!entities || entities.length === 0) {
    console.log('⚠️  No test entities found');
    return;
  }
  
  console.log(`✅ Found ${entities.length} test entities:\n`);
  
  for (const entity of entities) {
    console.log(`📍 ${entity.name} (${entity.email})`);
    console.log(`   - ID: ${entity.id}`);
    console.log(`   - Type: ${entity.entity_type}`);
    console.log(`   - Current Node: ${entity.current_node_id}`);
    console.log(`   - Metadata:`, JSON.stringify(entity.metadata, null, 2));
    
    // Check journey events
    const { data: events, error: eventsError } = await _supabase
      .from('stitch_journey_events')
      .select('*')
      .eq('entity_id', entity.id)
      .order('timestamp', { ascending: false });
    
    if (eventsError) {
      console.log(`   ⚠️  Failed to query journey events: ${eventsError.message}`);
    } else if (events && events.length > 0) {
      console.log(`   📝 Journey Events (${events.length}):`);
      events.forEach((event, idx) => {
        console.log(`      ${idx + 1}. ${event.event_type} at ${event.node_id || event.edge_id}`);
        console.log(`         Timestamp: ${event.timestamp}`);
        if (event.metadata && Object.keys(event.metadata).length > 0) {
          console.log(`         Metadata:`, JSON.stringify(event.metadata, null, 2));
        }
      });
    } else {
      console.log(`   ⚠️  No journey events found`);
    }
    
    console.log('');
  }
  
  // Cleanup
  console.log('🧹 Cleaning up test entities...');
  const { error: deleteError } = await _supabase
    .from('stitch_entities')
    .delete()
    .like('email', 'test-%@monsters.io');
  
  if (deleteError) {
    console.error('⚠️  Cleanup failed:', deleteError.message);
  } else {
    console.log('✅ Test entities cleaned up');
  }
}

main().catch(console.error);
