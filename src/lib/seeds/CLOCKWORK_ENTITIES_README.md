# Clockwork Canvas Entity Seed Data

## Overview

This module provides seed data for 13 Halloween-themed entities (monsters) that represent customers and leads flowing through the Business Model Canvas in the Clockwork Canvas demo.

## Files

- **`clockwork-entities.ts`**: Main seed data file with entity definitions
- **`scripts/verify-clockwork-entities.ts`**: Verification script to validate seed data
- **`scripts/display-clockwork-entities.ts`**: Display script to show entity details

## Entity Structure

Each entity includes:

```typescript
{
  name: string;              // Monster name (e.g., "Frankenstein")
  email: string;             // Unique email (e.g., "frankenstein@monsters.io")
  monster_type: string;      // Monster type for avatar seed
  entity_type: EntityType;   // 'lead', 'customer', or 'churned'
  current_node_id?: string;  // Current BMC node (for entities on nodes)
  current_edge_id?: string;  // Current edge (for entities in transit)
  edge_progress?: number;    // Progress along edge (0-1)
  destination_node_id?: string; // Target node (for entities on edges)
  journey_story: string;     // Narrative description
}
```

## The 13 Entities

### Customers (4)
1. **Frankenstein** - Active subscriber (Pro plan)
2. **Vampire** - Basic plan subscriber
3. **Banshee** - Pro plan subscriber (biggest advocate)
4. **Kraken** - Enterprise customer

### Leads (9)
5. **Dracula** - At demo call stage
6. **Witch** - In free trial
7. **Werewolf** - New lead from LinkedIn
8. **Mummy** - In support (help desk)
9. **Zombie** - Discovered via YouTube
10. **Skeleton** - Found via SEO content
11. **Phantom** - Downloaded lead magnet
12. **Ghost** - In transit (demo → trial) ⚡
13. **Goblin** - In transit (LinkedIn → demo) ⚡

⚡ = Positioned on edges (in-transit state)

## Avatar Generation

Avatars are generated using DiceBear's `bottts` style with the monster type as seed:

```typescript
https://api.dicebear.com/7.x/bottts/svg?seed={monster_type}
```

This ensures consistent, robot/monster-themed avatars that match each entity's theme.

## Usage

### Import the seed data

```typescript
import { CLOCKWORK_ENTITIES, getClockworkEntitiesWithAvatars } from '@/lib/seeds/clockwork-entities';

// Get entities with avatar URLs
const entities = getClockworkEntitiesWithAvatars();
```

### Verify the data

```bash
npx tsx scripts/verify-clockwork-entities.ts
```

### Display the entities

```bash
npx tsx scripts/display-clockwork-entities.ts
```

## Integration with Master Seed Script

This seed data will be used by the master `seed-clockwork.ts` script (Task 3) to populate the database with entities after the BMC canvas is created.

## Requirements Validation

This implementation validates the following requirements:

- **1.1**: 13 entities with Halloween monster themes ✅
- **1.2**: DiceBear avatars matching monster type ✅
- **1.3**: Entity types assigned based on journey stage ✅
- **1.4**: Entities positioned at appropriate nodes ✅
- **1.5**: Ghost and Goblin positioned on edges ✅

## Node ID References

The entities reference the following BMC node IDs (from `default-bmc.ts`):

- `item-linkedin-ads` - Marketing section
- `item-youtube-channel` - Marketing section
- `item-seo-content` - Marketing section
- `item-demo-call` - Sales section
- `item-free-trial` - Offers section
- `item-lead-magnet` - Offers section
- `item-basic-plan` - Products section
- `item-pro-plan` - Products section
- `item-enterprise` - Products section
- `item-help-desk` - Support section
- `item-active-subscribers` - Paying Customers section

## Edge ID References

The in-transit entities reference these edge IDs:

- `e-demo-trial` - Demo Call → Free Trial
- `e-linkedin-demo` - LinkedIn Ads → Demo Call
