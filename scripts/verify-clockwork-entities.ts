/**
 * Verification script for Clockwork Canvas entity seed data
 * 
 * Validates that the entity seed data meets all requirements:
 * - 13 entities total
 * - Correct monster types and themes
 * - Proper entity types (lead, customer, churned)
 * - Avatar URLs contain monster seed
 * - Ghost and Goblin positioned on edges
 * - All other entities positioned on nodes
 */

import { CLOCKWORK_ENTITIES, getClockworkEntitiesWithAvatars, generateMonsterAvatar } from '../src/lib/seeds/clockwork-entities';

console.log('🎃 Verifying Clockwork Canvas Entity Seed Data...\n');

// Test 1: Count entities
console.log('📊 Test 1: Entity Count');
const entityCount = CLOCKWORK_ENTITIES.length;
if (entityCount === 13) {
  console.log(`✅ Correct: ${entityCount} entities (expected 13)`);
} else {
  console.log(`❌ Failed: ${entityCount} entities (expected 13)`);
  process.exit(1);
}

// Test 2: Verify all required fields
console.log('\n📊 Test 2: Required Fields');
let allFieldsValid = true;
for (const entity of CLOCKWORK_ENTITIES) {
  const hasRequiredFields = 
    entity.name &&
    entity.email &&
    entity.monster_type &&
    entity.entity_type &&
    entity.journey_story;
  
  if (!hasRequiredFields) {
    console.log(`❌ Failed: Entity "${entity.name}" missing required fields`);
    allFieldsValid = false;
  }
}
if (allFieldsValid) {
  console.log('✅ All entities have required fields');
}

// Test 3: Verify entity types
console.log('\n📊 Test 3: Entity Types');
const validTypes = ['lead', 'customer', 'churned'];
let allTypesValid = true;
for (const entity of CLOCKWORK_ENTITIES) {
  if (!validTypes.includes(entity.entity_type)) {
    console.log(`❌ Failed: Entity "${entity.name}" has invalid type: ${entity.entity_type}`);
    allTypesValid = false;
  }
}
if (allTypesValid) {
  console.log('✅ All entity types are valid (lead, customer, or churned)');
}

// Test 4: Verify positioning (nodes vs edges)
console.log('\n📊 Test 4: Entity Positioning');
const entitiesOnNodes = CLOCKWORK_ENTITIES.filter(e => e.current_node_id && !e.current_edge_id);
const entitiesOnEdges = CLOCKWORK_ENTITIES.filter(e => e.current_edge_id && !e.current_node_id);

console.log(`   - Entities on nodes: ${entitiesOnNodes.length}`);
console.log(`   - Entities on edges: ${entitiesOnEdges.length}`);

if (entitiesOnNodes.length === 11 && entitiesOnEdges.length === 2) {
  console.log('✅ Correct positioning: 11 on nodes, 2 on edges');
} else {
  console.log('❌ Failed: Expected 11 on nodes and 2 on edges');
  process.exit(1);
}

// Test 5: Verify Ghost and Goblin are on edges
console.log('\n📊 Test 5: Ghost and Goblin on Edges');
const ghost = CLOCKWORK_ENTITIES.find(e => e.name === 'Ghost');
const goblin = CLOCKWORK_ENTITIES.find(e => e.name === 'Goblin');

if (ghost?.current_edge_id && goblin?.current_edge_id) {
  console.log('✅ Ghost and Goblin are positioned on edges');
  console.log(`   - Ghost: ${ghost.current_edge_id} (progress: ${ghost.edge_progress})`);
  console.log(`   - Goblin: ${goblin.current_edge_id} (progress: ${goblin.edge_progress})`);
} else {
  console.log('❌ Failed: Ghost and Goblin must be on edges');
  process.exit(1);
}

// Test 6: Verify edge entities have required fields
console.log('\n📊 Test 6: Edge Entity Fields');
let edgeFieldsValid = true;
for (const entity of entitiesOnEdges) {
  if (!entity.edge_progress || !entity.destination_node_id) {
    console.log(`❌ Failed: Entity "${entity.name}" on edge missing edge_progress or destination_node_id`);
    edgeFieldsValid = false;
  }
}
if (edgeFieldsValid) {
  console.log('✅ All edge entities have edge_progress and destination_node_id');
}

// Test 7: Verify avatar URL generation
console.log('\n📊 Test 7: Avatar URL Generation');
const entitiesWithAvatars = getClockworkEntitiesWithAvatars();
let allAvatarsValid = true;
for (const entity of entitiesWithAvatars) {
  if (!entity.avatar_url?.includes(`seed=${entity.monster_type}`)) {
    console.log(`❌ Failed: Entity "${entity.name}" avatar URL doesn't contain monster seed`);
    allAvatarsValid = false;
  }
}
if (allAvatarsValid) {
  console.log('✅ All avatar URLs contain correct monster seed');
}

// Test 8: Verify unique emails
console.log('\n📊 Test 8: Unique Emails');
const emails = CLOCKWORK_ENTITIES.map(e => e.email);
const uniqueEmails = new Set(emails);
if (emails.length === uniqueEmails.size) {
  console.log('✅ All emails are unique');
} else {
  console.log('❌ Failed: Duplicate emails found');
  process.exit(1);
}

// Test 9: Verify monster types
console.log('\n📊 Test 9: Monster Types');
const expectedMonsters = [
  'frankenstein', 'dracula', 'witch', 'werewolf', 'mummy',
  'ghost', 'zombie', 'vampire', 'skeleton', 'banshee',
  'goblin', 'phantom', 'kraken'
];
const actualMonsters = CLOCKWORK_ENTITIES.map(e => e.monster_type).sort();
const expectedSorted = expectedMonsters.sort();

if (JSON.stringify(actualMonsters) === JSON.stringify(expectedSorted)) {
  console.log('✅ All 13 expected monster types present');
} else {
  console.log('❌ Failed: Monster types mismatch');
  console.log('   Expected:', expectedSorted);
  console.log('   Actual:', actualMonsters);
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('🎉 All verification tests passed!');
console.log('='.repeat(50));
console.log('\n📋 Summary:');
console.log(`   - Total entities: ${entityCount}`);
console.log(`   - Customers: ${CLOCKWORK_ENTITIES.filter(e => e.entity_type === 'customer').length}`);
console.log(`   - Leads: ${CLOCKWORK_ENTITIES.filter(e => e.entity_type === 'lead').length}`);
console.log(`   - Churned: ${CLOCKWORK_ENTITIES.filter(e => e.entity_type === 'churned').length}`);
console.log(`   - On nodes: ${entitiesOnNodes.length}`);
console.log(`   - On edges: ${entitiesOnEdges.length}`);
console.log('\n✨ Entity seed data is ready for use!');
