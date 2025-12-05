/**
 * Display script for Clockwork Canvas entities
 * 
 * Shows a formatted table of all entities with their details
 */

import { CLOCKWORK_ENTITIES, getClockworkEntitiesWithAvatars } from '../src/lib/seeds/clockwork-entities';

console.log('🎃 Clockwork Canvas Entities\n');
console.log('='.repeat(120));

const entitiesWithAvatars = getClockworkEntitiesWithAvatars();

for (const entity of entitiesWithAvatars) {
  console.log(`\n👻 ${entity.name.toUpperCase()}`);
  console.log('─'.repeat(120));
  console.log(`   Email:        ${entity.email}`);
  console.log(`   Monster Type: ${entity.monster_type}`);
  console.log(`   Entity Type:  ${entity.entity_type}`);
  
  if (entity.current_node_id) {
    console.log(`   Position:     Node: ${entity.current_node_id}`);
  } else if (entity.current_edge_id) {
    console.log(`   Position:     Edge: ${entity.current_edge_id} (${(entity.edge_progress! * 100).toFixed(0)}% → ${entity.destination_node_id})`);
  }
  
  console.log(`   Avatar:       ${entity.avatar_url}`);
  console.log(`   Story:        ${entity.journey_story}`);
}

console.log('\n' + '='.repeat(120));
console.log('\n📊 Statistics:');
console.log(`   Total: ${CLOCKWORK_ENTITIES.length} entities`);
console.log(`   Customers: ${CLOCKWORK_ENTITIES.filter(e => e.entity_type === 'customer').length}`);
console.log(`   Leads: ${CLOCKWORK_ENTITIES.filter(e => e.entity_type === 'lead').length}`);
console.log(`   On Nodes: ${CLOCKWORK_ENTITIES.filter(e => e.current_node_id).length}`);
console.log(`   On Edges: ${CLOCKWORK_ENTITIES.filter(e => e.current_edge_id).length}`);
console.log('');
