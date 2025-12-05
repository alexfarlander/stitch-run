/**
 * Clockwork Canvas Entity Seed
 * 
 * Seeds the database with 13 Halloween-themed entities (monsters) that represent
 * customers and leads flowing through the Business Model Canvas.
 * 
 * Each entity has:
 * - A unique monster theme (Frankenstein, Dracula, etc.)
 * - DiceBear avatar with monster seed
 * - Entity type (lead, customer, or churned)
 * - Current position (node or edge)
 * - Journey story narrative
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { EntityType } from '@/types/entity';

export interface ClockworkEntitySeed {
  name: string;
  email: string;
  monster_type: string;
  entity_type: EntityType;
  current_node_id?: string;
  current_edge_id?: string;
  edge_progress?: number;
  destination_node_id?: string;
  journey_story: string;
}

/**
 * 13 Halloween-themed entities for the Clockwork Canvas demo
 * 
 * Positioning strategy:
 * - 11 entities positioned at nodes (various stages of the journey)
 * - 2 entities (Ghost and Goblin) positioned on edges (in-transit state)
 */
export const CLOCKWORK_ENTITIES: ClockworkEntitySeed[] = [
  // ===== CUSTOMER (Completed Journey) =====
  {
    name: 'Frankenstein',
    email: 'frankenstein@monsters.io',
    monster_type: 'frankenstein',
    entity_type: 'customer',
    current_node_id: 'item-active-subscribers',
    journey_story: 'The OG. Completed the full journey. A loyal Pro subscriber who loves the product.',
  },
  
  // ===== LEADS (Various Stages) =====
  {
    name: 'Dracula',
    email: 'dracula@monsters.io',
    monster_type: 'dracula',
    entity_type: 'lead',
    current_node_id: 'item-demo-call',
    journey_story: 'Has booked a demo. Ancient, cautious, needs to be convinced of the value proposition.',
  },
  
  {
    name: 'Witch',
    email: 'witch@monsters.io',
    monster_type: 'witch',
    entity_type: 'lead',
    current_node_id: 'item-free-trial',
    journey_story: 'Currently in free trial. Brewing up a decision about which plan to choose.',
  },
  
  {
    name: 'Werewolf',
    email: 'werewolf@monsters.io',
    monster_type: 'werewolf',
    entity_type: 'lead',
    current_node_id: 'item-linkedin-ads',
    journey_story: 'Just discovered us through LinkedIn. New lead, full moon energy, ready to transform.',
  },
  
  {
    name: 'Mummy',
    email: 'mummy@monsters.io',
    monster_type: 'mummy',
    entity_type: 'lead',
    current_node_id: 'item-help-desk',
    journey_story: 'Wrapped up in a support ticket. Needs help unwrapping the product features.',
  },
  
  {
    name: 'Zombie',
    email: 'zombie@monsters.io',
    monster_type: 'zombie',
    entity_type: 'lead',
    current_node_id: 'item-youtube-channel',
    journey_story: 'Stumbled upon our YouTube channel. Slowly moving through the content, brain hungry for knowledge.',
  },
  
  {
    name: 'Vampire',
    email: 'vampire@monsters.io',
    monster_type: 'vampire',
    entity_type: 'customer',
    current_node_id: 'item-basic-plan',
    journey_story: 'Converted to Basic plan. Night owl who works after dark, loves the product.',
  },
  
  {
    name: 'Skeleton',
    email: 'skeleton@monsters.io',
    monster_type: 'skeleton',
    entity_type: 'lead',
    current_node_id: 'item-seo-content',
    journey_story: 'Found us through organic search. Bare bones approach to research, reading all the content.',
  },
  
  {
    name: 'Banshee',
    email: 'banshee@monsters.io',
    monster_type: 'banshee',
    entity_type: 'customer',
    current_node_id: 'item-pro-plan',
    journey_story: 'Pro subscriber who screams about how great the product is. Our biggest advocate.',
  },
  
  {
    name: 'Phantom',
    email: 'phantom@monsters.io',
    monster_type: 'phantom',
    entity_type: 'lead',
    current_node_id: 'item-lead-magnet',
    journey_story: 'Downloaded our lead magnet. Mysterious presence, hard to pin down but definitely interested.',
  },
  
  {
    name: 'Kraken',
    email: 'kraken@monsters.io',
    monster_type: 'kraken',
    entity_type: 'customer',
    current_node_id: 'item-enterprise',
    journey_story: 'Enterprise customer with tentacles in everything. Massive deal, requires white-glove service.',
  },
  
  // ===== IN-TRANSIT ENTITIES (On Edges) =====
  {
    name: 'Ghost',
    email: 'ghost@monsters.io',
    monster_type: 'ghost',
    entity_type: 'lead',
    current_edge_id: 'e-demo-trial',
    edge_progress: 0.6,
    destination_node_id: 'item-free-trial',
    journey_story: 'Floating between demo and trial. Ethereal presence, moving through the journey like mist.',
  },
  
  {
    name: 'Goblin',
    email: 'goblin@monsters.io',
    monster_type: 'goblin',
    entity_type: 'lead',
    current_edge_id: 'e-linkedin-demo',
    edge_progress: 0.3,
    destination_node_id: 'item-demo-call',
    journey_story: 'Scurrying from LinkedIn to demo booking. Quick, mischievous, but genuinely interested.',
  },
];

/**
 * Generate DiceBear avatar URL with monster seed
 * 
 * Uses the DiceBear API to generate consistent avatars based on monster type.
 * The 'bottts' style works well for monster-themed avatars.
 * 
 * @param monsterType - The monster type to use as seed (e.g., 'frankenstein')
 * @returns DiceBear avatar URL
 */
export function generateMonsterAvatar(monsterType: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${monsterType}`;
}

/**
 * Get all entity seeds with generated avatar URLs
 * 
 * @returns Array of entity seeds with avatar_url populated
 */
export function getClockworkEntitiesWithAvatars() {
  return CLOCKWORK_ENTITIES.map(entity => ({
    ...entity,
    avatar_url: generateMonsterAvatar(entity.monster_type),
  }));
}
