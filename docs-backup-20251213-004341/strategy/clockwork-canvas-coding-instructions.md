# The Clockwork Canvas: Coding Instructions

> **For:** AI Coding Agent  
> **Purpose:** Step-by-step implementation instructions for The Clockwork Canvas demo  
> **Reference:** See `implementation_plan.md` for context and design rationale

---

## Prerequisites

Before starting, ensure:
1. The dev server runs without errors: `npm run dev`
2. Supabase is accessible and migrations are up to date
3. You have read `src/lib/seeds/default-bmc.ts` and `src/lib/seeds/demo-journey.ts`

---

## Phase 1: Seed Data Overhaul

### Task 1.1: Update BMC Sections and Items

**File:** `src/lib/seeds/default-bmc.ts`

**Goal:** Update the `BMC_SECTIONS` and `BMC_ITEMS` arrays to include all required nodes.

#### Step 1.1.1: Update `BMC_SECTIONS`

The existing 13 sections are correct. No changes needed to the section definitions.

#### Step 1.1.2: Update `BMC_ITEMS`

Replace the `BMC_ITEMS` array with the following expanded list. Ensure all IDs follow the `item-*` pattern.

```typescript
const BMC_ITEMS = [
  // ============================================================
  // MARKETING SECTION
  // ============================================================
  { id: 'item-linkedin-ads', label: 'LinkedIn Ads', icon: 'Linkedin', type: 'worker', section: 'Marketing', position: { x: 20, y: 50 } },
  { id: 'item-youtube-channel', label: 'YouTube Channel', icon: 'Youtube', type: 'worker', section: 'Marketing', position: { x: 140, y: 50 } },
  { id: 'item-seo-content', label: 'SEO Content', icon: 'Search', type: 'worker', section: 'Marketing', position: { x: 80, y: 120 } },

  // ============================================================
  // SALES SECTION
  // ============================================================
  { id: 'item-demo-call', label: 'Demo Call', icon: 'Phone', type: 'worker', section: 'Sales', position: { x: 20, y: 50 } },
  { id: 'item-email-sequence', label: 'Email Sequence', icon: 'Mail', type: 'worker', section: 'Sales', position: { x: 140, y: 50 } },

  // ============================================================
  // OFFERS SECTION
  // ============================================================
  { id: 'item-free-trial', label: 'Free Trial', icon: 'Gift', type: 'product', section: 'Offers', position: { x: 20, y: 50 } },
  { id: 'item-lead-magnet', label: 'Lead Magnet', icon: 'Magnet', type: 'product', section: 'Offers', position: { x: 140, y: 50 } },

  // ============================================================
  // PRODUCTS SECTION
  // ============================================================
  { id: 'item-basic-plan', label: 'Basic Plan', icon: 'Package', type: 'product', section: 'Products', position: { x: 20, y: 50 } },
  { id: 'item-pro-plan', label: 'Pro Plan', icon: 'Star', type: 'product', section: 'Products', position: { x: 140, y: 50 } },
  { id: 'item-enterprise', label: 'Enterprise', icon: 'Building', type: 'product', section: 'Products', position: { x: 80, y: 120 } },

  // ============================================================
  // SUPPORT SECTION
  // ============================================================
  { id: 'item-help-desk', label: 'Help Desk', icon: 'Headphones', type: 'worker', section: 'Support', position: { x: 20, y: 50 } },
  { id: 'item-knowledge-base', label: 'Knowledge Base', icon: 'BookOpen', type: 'asset', section: 'Support', position: { x: 140, y: 50 } },

  // ============================================================
  // RECOMMENDATIONS SECTION
  // ============================================================
  { id: 'item-referral-program', label: 'Referral Program', icon: 'Share2', type: 'worker', section: 'Recommendations', position: { x: 80, y: 50 } },

  // ============================================================
  // PAYING CUSTOMERS SECTION
  // ============================================================
  { id: 'item-active-subscribers', label: 'Active Subscribers', icon: 'Users', type: 'asset', section: 'Paying Customers', position: { x: 80, y: 50 } },

  // ============================================================
  // DATA SECTION
  // ============================================================
  { id: 'item-crm', label: 'CRM', icon: 'Database', type: 'asset', section: 'Data', position: { x: 20, y: 50 } },
  { id: 'item-analytics', label: 'Analytics', icon: 'BarChart2', type: 'asset', section: 'Data', position: { x: 140, y: 50 } },

  // ============================================================
  // PEOPLE SECTION
  // ============================================================
  { id: 'item-team', label: 'Team', icon: 'Users', type: 'asset', section: 'People', position: { x: 20, y: 50 } },
  { id: 'item-sales-reps', label: 'Sales Reps', icon: 'UserCheck', type: 'asset', section: 'People', position: { x: 140, y: 50 } },
  { id: 'item-support-agents', label: 'Support Agents', icon: 'Headphones', type: 'asset', section: 'People', position: { x: 80, y: 120 } },

  // ============================================================
  // INTEGRATIONS SECTION
  // ============================================================
  { id: 'item-stripe', label: 'Stripe', icon: 'CreditCard', type: 'integration', section: 'Integrations', position: { x: 20, y: 50 } },
  { id: 'item-supabase', label: 'Supabase', icon: 'Database', type: 'integration', section: 'Integrations', position: { x: 140, y: 50 } },
  { id: 'item-resend', label: 'Resend', icon: 'Mail', type: 'integration', section: 'Integrations', position: { x: 20, y: 120 } },
  { id: 'item-slack', label: 'Slack', icon: 'MessageSquare', type: 'integration', section: 'Integrations', position: { x: 140, y: 120 } },

  // ============================================================
  // CODE SECTION
  // ============================================================
  { id: 'item-landing-page', label: 'Landing Page', icon: 'Globe', type: 'asset', section: 'Code', position: { x: 20, y: 50 } },
  { id: 'item-api-server', label: 'API Server', icon: 'Server', type: 'asset', section: 'Code', position: { x: 140, y: 50 } },
  { id: 'item-worker-functions', label: 'Worker Functions', icon: 'Zap', type: 'asset', section: 'Code', position: { x: 80, y: 120 } },

  // ============================================================
  // COSTS SECTION
  // ============================================================
  { id: 'item-claude-api-cost', label: 'Claude API', icon: 'Brain', type: 'cost', section: 'Costs', position: { x: 20, y: 50 }, data: { value: 0 } },
  { id: 'item-infrastructure', label: 'Infrastructure', icon: 'Server', type: 'cost', section: 'Costs', position: { x: 140, y: 50 }, data: { value: 0 } },
  { id: 'item-stripe-fees', label: 'Stripe Fees', icon: 'CreditCard', type: 'cost', section: 'Costs', position: { x: 260, y: 50 }, data: { value: 0 } },

  // ============================================================
  // REVENUE SECTION
  // ============================================================
  { id: 'item-mrr', label: 'MRR', icon: 'TrendingUp', type: 'revenue', section: 'Revenue', position: { x: 20, y: 50 }, data: { value: 12450 } },
  { id: 'item-new-arr', label: 'New ARR', icon: 'DollarSign', type: 'revenue', section: 'Revenue', position: { x: 140, y: 50 }, data: { value: 149400 } },
  { id: 'item-referral-bonus', label: 'Referral Bonus', icon: 'Gift', type: 'revenue', section: 'Revenue', position: { x: 260, y: 50 }, data: { value: 240 } },
];
```

#### Step 1.1.3: Update `BMC_ITEM_EDGES`

Replace the `BMC_ITEM_EDGES` array with both **Journey Edges** (solid, for entity travel) and **System Edges** (dashed, for background triggers).

```typescript
/**
 * Journey Edges: Solid lines where entities travel
 */
const BMC_JOURNEY_EDGES = [
  // Marketing -> Sales
  { id: 'e-linkedin-demo', source: 'item-linkedin-ads', target: 'item-demo-call', type: 'journey' },
  { id: 'e-youtube-demo', source: 'item-youtube-channel', target: 'item-demo-call', type: 'journey' },
  { id: 'e-seo-demo', source: 'item-seo-content', target: 'item-demo-call', type: 'journey' },

  // Sales -> Offers
  { id: 'e-demo-trial', source: 'item-demo-call', target: 'item-free-trial', type: 'journey' },

  // Offers -> Products
  { id: 'e-trial-basic', source: 'item-free-trial', target: 'item-basic-plan', type: 'journey' },
  { id: 'e-trial-pro', source: 'item-free-trial', target: 'item-pro-plan', type: 'journey' },
  { id: 'e-trial-enterprise', source: 'item-free-trial', target: 'item-enterprise', type: 'journey' },

  // Products -> Support (churn path)
  { id: 'e-basic-support', source: 'item-basic-plan', target: 'item-help-desk', type: 'journey' },
  { id: 'e-pro-support', source: 'item-pro-plan', target: 'item-help-desk', type: 'journey' },

  // Support -> Recommendations (happy path)
  { id: 'e-support-referral', source: 'item-help-desk', target: 'item-referral-program', type: 'journey' },

  // Products -> Paying Customers
  { id: 'e-basic-subscribers', source: 'item-basic-plan', target: 'item-active-subscribers', type: 'journey' },
  { id: 'e-pro-subscribers', source: 'item-pro-plan', target: 'item-active-subscribers', type: 'journey' },
  { id: 'e-enterprise-subscribers', source: 'item-enterprise', target: 'item-active-subscribers', type: 'journey' },

  // Referral -> Marketing (loop back)
  { id: 'e-referral-marketing', source: 'item-referral-program', target: 'item-linkedin-ads', type: 'journey' },
];

/**
 * System Edges: Dashed lines for background triggers (no entity travel)
 */
const BMC_SYSTEM_EDGES = [
  // Marketing -> Production (CRM, Analytics)
  { id: 'sys-linkedin-crm', source: 'item-linkedin-ads', target: 'item-crm', type: 'system', label: 'New Lead' },
  { id: 'sys-linkedin-analytics', source: 'item-linkedin-ads', target: 'item-analytics', type: 'system', label: 'Track' },
  { id: 'sys-youtube-crm', source: 'item-youtube-channel', target: 'item-crm', type: 'system', label: 'New Lead' },
  { id: 'sys-seo-crm', source: 'item-seo-content', target: 'item-crm', type: 'system', label: 'New Lead' },

  // Sales -> Production (Team, Slack)
  { id: 'sys-demo-team', source: 'item-demo-call', target: 'item-sales-reps', type: 'system', label: 'Assign SDR' },
  { id: 'sys-demo-slack', source: 'item-demo-call', target: 'item-slack', type: 'system', label: 'Notify' },

  // Offers -> Production (Stripe, Analytics)
  { id: 'sys-trial-stripe', source: 'item-free-trial', target: 'item-stripe', type: 'system', label: 'Create Trial' },
  { id: 'sys-trial-analytics', source: 'item-free-trial', target: 'item-analytics', type: 'system', label: 'Track' },

  // Products -> Production (Stripe, CRM, Analytics)
  { id: 'sys-basic-stripe', source: 'item-basic-plan', target: 'item-stripe', type: 'system', label: 'Charge $29' },
  { id: 'sys-basic-crm', source: 'item-basic-plan', target: 'item-crm', type: 'system', label: 'Update Status' },
  { id: 'sys-basic-analytics', source: 'item-basic-plan', target: 'item-analytics', type: 'system', label: '+MRR' },
  { id: 'sys-pro-stripe', source: 'item-pro-plan', target: 'item-stripe', type: 'system', label: 'Charge $99' },
  { id: 'sys-pro-analytics', source: 'item-pro-plan', target: 'item-analytics', type: 'system', label: '+MRR' },
  { id: 'sys-enterprise-stripe', source: 'item-enterprise', target: 'item-stripe', type: 'system', label: 'Charge $499' },

  // Support -> Production (Team, Slack, Analytics)
  { id: 'sys-support-agents', source: 'item-help-desk', target: 'item-support-agents', type: 'system', label: 'Assign' },
  { id: 'sys-support-slack', source: 'item-help-desk', target: 'item-slack', type: 'system', label: 'Alert' },
  { id: 'sys-support-analytics', source: 'item-help-desk', target: 'item-analytics', type: 'system', label: 'Track' },
];

// Combine all edges
const BMC_ITEM_EDGES = [...BMC_JOURNEY_EDGES, ...BMC_SYSTEM_EDGES];
```

#### Step 1.1.4: Update `generateBMCGraph()` function

Modify the edges mapping to include the `type` and optional `label` properties:

```typescript
// Inside generateBMCGraph()
const edges: StitchEdge[] = BMC_ITEM_EDGES.map((edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: edge.type || 'journey', // Default to journey if not specified
  label: edge.label,
  // Add visual styling based on type
  style: edge.type === 'system' ? { strokeDasharray: '5,5', stroke: '#64748b' } : undefined,
  animated: edge.type === 'journey', // Only animate journey edges
}));
```

#### Step 1.1.5: Verify

Run the seed script and check the output:

```bash
npx tsx scripts/seed-bmc.ts
```

Expected output should show:
- 13 Section Nodes
- 33 Item Nodes (updated count)
- ~27 Edges (13 journey + 14 system)

---

### Task 1.2: Create Halloween Entities

**File:** `src/lib/seeds/clockwork-entities.ts` (NEW FILE)

Create a new file with the 13 Halloween-themed entities:

```typescript
/**
 * Clockwork Canvas: Halloween Entities
 * 
 * 13 monster-themed entities for the demo, distributed across the customer journey.
 */

import { getAdminClient } from '@/lib/supabase/client';

export interface ClockworkEntity {
  name: string;
  email: string;
  avatar_url: string;
  entity_type: 'lead' | 'customer' | 'churned';
  current_node_id?: string;
  current_edge_id?: string;
  edge_progress?: number;
  destination_node_id?: string;
  journey: Array<{
    type: string;
    node_id?: string;
    edge_id?: string;
    timestamp: string;
  }>;
  metadata: Record<string, any>;
}

/**
 * Generate DiceBear avatar URL for a monster
 */
function getMonsterAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}`;
}

/**
 * The 13 Halloween Entities
 */
export const CLOCKWORK_ENTITIES: ClockworkEntity[] = [
  // ============================================================
  // CUSTOMERS (4)
  // ============================================================
  {
    name: 'Frankenstein',
    email: 'frankenstein@stitchrun.com',
    avatar_url: getMonsterAvatar('frankenstein'),
    entity_type: 'customer',
    current_node_id: 'item-active-subscribers',
    journey: [
      { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-10-01T10:00:00Z' },
      { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-10-01T10:05:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-10-02T14:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-10-02T15:00:00Z' },
      { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-10-02T15:01:00Z' },
      { type: 'started_edge', edge_id: 'e-trial-pro', timestamp: '2024-10-10T09:00:00Z' },
      { type: 'entered_node', node_id: 'item-pro-plan', timestamp: '2024-10-10T09:01:00Z' },
      { type: 'started_edge', edge_id: 'e-pro-subscribers', timestamp: '2024-10-10T09:02:00Z' },
      { type: 'entered_node', node_id: 'item-active-subscribers', timestamp: '2024-10-10T09:03:00Z' },
    ],
    metadata: { source: 'linkedin', plan: 'pro', mrr: 99, converted_at: '2024-10-10' },
  },
  {
    name: 'Zombie',
    email: 'zombie@stitchrun.com',
    avatar_url: getMonsterAvatar('zombie'),
    entity_type: 'customer',
    current_node_id: 'item-basic-plan',
    journey: [
      { type: 'entered_node', node_id: 'item-seo-content', timestamp: '2024-10-15T08:00:00Z' },
      { type: 'started_edge', edge_id: 'e-seo-demo', timestamp: '2024-10-15T08:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-10-16T11:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-10-16T12:00:00Z' },
      { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-10-16T12:01:00Z' },
      { type: 'started_edge', edge_id: 'e-trial-basic', timestamp: '2024-10-20T10:00:00Z' },
      { type: 'entered_node', node_id: 'item-basic-plan', timestamp: '2024-10-20T10:01:00Z' },
    ],
    metadata: { source: 'seo', plan: 'basic', mrr: 29 },
  },
  {
    name: 'Phantom',
    email: 'phantom@stitchrun.com',
    avatar_url: getMonsterAvatar('phantom'),
    entity_type: 'customer',
    current_node_id: 'item-pro-plan',
    journey: [
      { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: '2024-10-05T12:00:00Z' },
      { type: 'started_edge', edge_id: 'e-youtube-demo', timestamp: '2024-10-05T12:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-10-06T16:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-10-06T17:00:00Z' },
      { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-10-06T17:01:00Z' },
      { type: 'started_edge', edge_id: 'e-trial-pro', timestamp: '2024-10-12T09:00:00Z' },
      { type: 'entered_node', node_id: 'item-pro-plan', timestamp: '2024-10-12T09:01:00Z' },
    ],
    metadata: { source: 'youtube', plan: 'pro', mrr: 99 },
  },
  {
    name: 'Kraken',
    email: 'kraken@stitchrun.com',
    avatar_url: getMonsterAvatar('kraken'),
    entity_type: 'customer',
    current_node_id: 'item-enterprise',
    journey: [
      { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-09-01T09:00:00Z' },
      { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-09-01T09:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-09-05T10:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-09-05T11:00:00Z' },
      { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-09-05T11:01:00Z' },
      { type: 'started_edge', edge_id: 'e-trial-enterprise', timestamp: '2024-09-15T10:00:00Z' },
      { type: 'entered_node', node_id: 'item-enterprise', timestamp: '2024-09-15T10:01:00Z' },
    ],
    metadata: { source: 'linkedin', plan: 'enterprise', mrr: 499, company: 'Oceanic Corp' },
  },

  // ============================================================
  // LEADS - STATIONARY (5)
  // ============================================================
  {
    name: 'Dracula',
    email: 'dracula@stitchrun.com',
    avatar_url: getMonsterAvatar('dracula'),
    entity_type: 'lead',
    current_node_id: 'item-demo-call',
    journey: [
      { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-10-28T20:00:00Z' },
      { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-10-28T20:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-10-29T21:00:00Z' },
    ],
    metadata: { source: 'linkedin', demo_scheduled: true },
  },
  {
    name: 'Witch',
    email: 'witch@stitchrun.com',
    avatar_url: getMonsterAvatar('witch'),
    entity_type: 'lead',
    current_node_id: 'item-free-trial',
    journey: [
      { type: 'entered_node', node_id: 'item-seo-content', timestamp: '2024-10-25T13:00:00Z' },
      { type: 'started_edge', edge_id: 'e-seo-demo', timestamp: '2024-10-25T13:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-10-26T15:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-10-26T16:00:00Z' },
      { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-10-26T16:01:00Z' },
    ],
    metadata: { source: 'seo', trial_started: '2024-10-26', trial_ends: '2024-11-09' },
  },
  {
    name: 'Werewolf',
    email: 'werewolf@stitchrun.com',
    avatar_url: getMonsterAvatar('werewolf'),
    entity_type: 'lead',
    current_node_id: 'item-linkedin-ads',
    journey: [
      { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: new Date().toISOString() },
    ],
    metadata: { source: 'linkedin', fresh_lead: true },
  },
  {
    name: 'Vampire',
    email: 'vampire@stitchrun.com',
    avatar_url: getMonsterAvatar('vampire'),
    entity_type: 'lead',
    current_node_id: 'item-youtube-channel',
    journey: [
      { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: '2024-10-30T23:00:00Z' },
    ],
    metadata: { source: 'youtube', video_watched: 'intro-to-stitch' },
  },
  {
    name: 'Banshee',
    email: 'banshee@stitchrun.com',
    avatar_url: getMonsterAvatar('banshee'),
    entity_type: 'lead',
    current_node_id: 'item-seo-content',
    journey: [
      { type: 'entered_node', node_id: 'item-seo-content', timestamp: '2024-10-29T03:00:00Z' },
    ],
    metadata: { source: 'seo', search_term: 'business model canvas automation' },
  },

  // ============================================================
  // LEADS - TRAVELING (2)
  // ============================================================
  {
    name: 'Ghost',
    email: 'ghost@stitchrun.com',
    avatar_url: getMonsterAvatar('ghost'),
    entity_type: 'lead',
    current_node_id: undefined, // Traveling, not at a node
    current_edge_id: 'e-demo-trial',
    edge_progress: 0.6,
    destination_node_id: 'item-free-trial',
    journey: [
      { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-10-27T10:00:00Z' },
      { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-10-27T10:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-10-28T14:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-10-28T15:00:00Z' },
    ],
    metadata: { source: 'linkedin', traveling: true },
  },
  {
    name: 'Goblin',
    email: 'goblin@stitchrun.com',
    avatar_url: getMonsterAvatar('goblin'),
    entity_type: 'lead',
    current_node_id: undefined, // Traveling, not at a node
    current_edge_id: 'e-linkedin-demo',
    edge_progress: 0.3,
    destination_node_id: 'item-demo-call',
    journey: [
      { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-10-30T08:00:00Z' },
      { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-10-30T08:30:00Z' },
    ],
    metadata: { source: 'linkedin', traveling: true },
  },

  // ============================================================
  // CHURNED (2)
  // ============================================================
  {
    name: 'Mummy',
    email: 'mummy@stitchrun.com',
    avatar_url: getMonsterAvatar('mummy'),
    entity_type: 'churned',
    current_node_id: 'item-help-desk',
    journey: [
      { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-08-01T10:00:00Z' },
      { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-08-01T10:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-08-02T14:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-08-02T15:00:00Z' },
      { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-08-02T15:01:00Z' },
      { type: 'started_edge', edge_id: 'e-trial-basic', timestamp: '2024-08-10T10:00:00Z' },
      { type: 'entered_node', node_id: 'item-basic-plan', timestamp: '2024-08-10T10:01:00Z' },
      { type: 'started_edge', edge_id: 'e-basic-support', timestamp: '2024-09-15T09:00:00Z' },
      { type: 'entered_node', node_id: 'item-help-desk', timestamp: '2024-09-15T09:01:00Z' },
      { type: 'churned', timestamp: '2024-09-20T10:00:00Z' },
    ],
    metadata: { source: 'linkedin', churn_reason: 'Too complicated', former_plan: 'basic' },
  },
  {
    name: 'Skeleton',
    email: 'skeleton@stitchrun.com',
    avatar_url: getMonsterAvatar('skeleton'),
    entity_type: 'churned',
    current_node_id: 'item-referral-program',
    journey: [
      { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: '2024-07-01T12:00:00Z' },
      { type: 'started_edge', edge_id: 'e-youtube-demo', timestamp: '2024-07-01T12:30:00Z' },
      { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-07-02T16:00:00Z' },
      { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-07-02T17:00:00Z' },
      { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-07-02T17:01:00Z' },
      { type: 'started_edge', edge_id: 'e-trial-pro', timestamp: '2024-07-10T09:00:00Z' },
      { type: 'entered_node', node_id: 'item-pro-plan', timestamp: '2024-07-10T09:01:00Z' },
      { type: 'churned', timestamp: '2024-08-10T10:00:00Z' },
      { type: 'entered_node', node_id: 'item-referral-program', timestamp: '2024-08-15T10:00:00Z' },
    ],
    metadata: { source: 'youtube', churn_reason: 'Budget cuts', former_plan: 'pro', referrals_made: 2 },
  },
];

/**
 * Seeds the Halloween entities into the database
 */
export async function seedClockworkEntities(canvasId: string): Promise<void> {
  const supabase = getAdminClient();

  // Delete existing demo entities
  const demoEmails = CLOCKWORK_ENTITIES.map(e => e.email);
  await supabase
    .from('stitch_entities')
    .delete()
    .eq('canvas_id', canvasId)
    .in('email', demoEmails);

  console.log('🗑️  Cleaned up existing demo entities');

  // Insert new entities
  const entities = CLOCKWORK_ENTITIES.map(entity => ({
    canvas_id: canvasId,
    name: entity.name,
    email: entity.email,
    avatar_url: entity.avatar_url,
    entity_type: entity.entity_type,
    current_node_id: entity.current_node_id,
    current_edge_id: entity.current_edge_id,
    edge_progress: entity.edge_progress,
    destination_node_id: entity.destination_node_id,
    journey: entity.journey,
    metadata: entity.metadata,
  }));

  const { error } = await supabase.from('stitch_entities').insert(entities);

  if (error) {
    throw new Error(`Failed to seed entities: ${error.message}`);
  }

  console.log(`✅ Seeded ${entities.length} Halloween entities`);
}
```

---

### Task 1.3: Update `seedDefaultBMC` to use new entities

**File:** `src/lib/seeds/default-bmc.ts`

Replace the call to the old `seedEntities` function with the new `seedClockworkEntities`:

```typescript
// At the end of seedDefaultBMC():
import { seedClockworkEntities } from './clockwork-entities';

// Replace:
// await seedEntities(newBMC.id, client);

// With:
await seedClockworkEntities(newBMC.id);
```

---

## Phase 2: Create Drill-Down Workflows

### Task 2.1: Create Lead Capture Workflow

**File:** `src/lib/seeds/workflows/lead-capture.ts` (NEW FILE)

```typescript
/**
 * Lead Capture Logic Workflow
 * Triggered when a new lead enters from Marketing
 */

import { getAdminClient } from '@/lib/supabase/client';
import { StitchNode, StitchEdge } from '@/types/stitch';

const WORKFLOW_NAME = 'Lead Capture Logic';

const NODES: StitchNode[] = [
  {
    id: 'validate-lead',
    type: 'Worker',
    position: { x: 100, y: 100 },
    data: {
      label: 'Validate Lead',
      workerType: 'data-transform',
      description: 'Check email format, company name presence',
    },
  },
  {
    id: 'score-lead',
    type: 'Worker',
    position: { x: 100, y: 200 },
    data: {
      label: 'Score Lead',
      workerType: 'claude',
      description: 'AI-based lead scoring (1-100)',
    },
  },
  {
    id: 'crm-sync',
    type: 'Worker',
    position: { x: 100, y: 300 },
    data: {
      label: 'CRM Sync',
      workerType: 'webhook-trigger',
      description: 'Push to HubSpot/Pipedrive',
    },
  },
  {
    id: 'assign-sdr',
    type: 'Worker',
    position: { x: 100, y: 400 },
    data: {
      label: 'Assign SDR',
      workerType: 'slack-notify',
      description: 'Notify sales rep via Slack',
    },
  },
];

const EDGES: StitchEdge[] = [
  { id: 'e1', source: 'validate-lead', target: 'score-lead' },
  { id: 'e2', source: 'score-lead', target: 'crm-sync' },
  { id: 'e3', source: 'crm-sync', target: 'assign-sdr' },
];

export async function seedLeadCaptureWorkflow(parentNodeId: string, bmcCanvasId: string): Promise<string> {
  const supabase = getAdminClient();

  // Check if already exists
  const { data: existing } = await supabase
    .from('stitch_flows')
    .select('id')
    .eq('name', WORKFLOW_NAME)
    .eq('canvas_type', 'workflow')
    .single();

  if (existing) {
    console.log(`ℹ️  ${WORKFLOW_NAME} already exists`);
    return existing.id;
  }

  // Create workflow
  const { data: workflow, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: WORKFLOW_NAME,
      canvas_type: 'workflow',
      parent_id: bmcCanvasId,
      parent_node_id: parentNodeId, // Links to the BMC item node
      graph: { nodes: NODES, edges: EDGES },
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create workflow: ${error.message}`);

  console.log(`✅ Created ${WORKFLOW_NAME}`);
  return workflow.id;
}
```

### Task 2.2: Create Additional Workflows

Create similar files for:
- `src/lib/seeds/workflows/demo-scheduling.ts`
- `src/lib/seeds/workflows/trial-activation.ts`
- `src/lib/seeds/workflows/support-handler.ts`
- `src/lib/seeds/workflows/crm-sync.ts`
- `src/lib/seeds/workflows/analytics-update.ts`
- `src/lib/seeds/workflows/slack-notify.ts`
- `src/lib/seeds/workflows/stripe-sync.ts`

Each follows the same pattern. Use appropriate nodes for each workflow as defined in the implementation plan.

---

## Phase 3: System Edges Visual Styling

### Task 3.1: Update Edge Component

**File:** `src/components/canvas/edges/SystemEdge.tsx` (NEW FILE)

Create a custom edge component for system edges that supports the traversal animation (pulse), similar to `JourneyEdge` but with specific styling (dashed).

```typescript
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export interface SystemEdgeData extends Record<string, unknown> {
  isTraversing?: boolean;
}

export function SystemEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
}: EdgeProps<SystemEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isTraversing = data?.isTraversing;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeDasharray: '5,5',
          stroke: '#64748b', // Slate-500
          strokeWidth: 1.5,
        }}
      />
      
      {/* Animation Layer */}
      {isTraversing && (
        <path
          d={edgePath}
          fill="none"
          stroke="#22d3ee" // Cyan-400
          strokeWidth={3}
          strokeDasharray="5,5"
          className="animate-[edge-pulse_1s_ease-out_infinite]"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.5))',
          }}
        />
      )}

      {label && (
        <text
          x={labelX}
          y={labelY}
          className="fill-slate-500 text-[10px] font-medium"
          textAnchor="middle"
          dominantBaseline="central"
          style={{
             textShadow: '0 1px 2px rgba(0,0,0,0.8)', // Better readability
          }}
        >
          {label}
        </text>
      )}
    </>
  );
}
```

### Task 3.2: Register Edge Type

**File:** `src/components/canvas/BMCCanvas.tsx` (or wherever edge types are registered)

```typescript
const edgeTypes = {
  journey: JourneyEdge,  // Animated, colored
  system: SystemEdge,    // Dashed, gray
};
```

---

## Phase 4: Financial Section Updates

### Task 4.1: Create Financial Update Utility

**File:** `src/lib/canvas/financial-updates.ts` (NEW FILE)

```typescript
import { getAdminClient } from '@/lib/supabase/client';

interface FinancialUpdate {
  nodeId: string;
  delta: number;
}

export async function updateFinancialNode(
  canvasId: string,
  nodeId: string,
  delta: number
): Promise<void> {
  const supabase = getAdminClient();

  // Get current canvas
  const { data: canvas, error: fetchError } = await supabase
    .from('stitch_flows')
    .select('graph')
    .eq('id', canvasId)
    .single();

  if (fetchError) throw fetchError;

  // Find and update the node
  const graph = canvas.graph;
  const node = graph.nodes.find((n: any) => n.id === nodeId);

  if (node && node.data) {
    node.data.value = (node.data.value || 0) + delta;
  }

  // Save updated graph
  const { error: updateError } = await supabase
    .from('stitch_flows')
    .update({ graph })
    .eq('id', canvasId);

  if (updateError) throw updateError;
}

// Predefined financial impacts
export const FINANCIAL_IMPACTS = {
  CLAUDE_CALL: { nodeId: 'item-claude-api-cost', delta: 0.02 },
  BASIC_SUBSCRIPTION: { nodeId: 'item-mrr', delta: 29 },
  PRO_SUBSCRIPTION: { nodeId: 'item-mrr', delta: 99 },
  ENTERPRISE_SUBSCRIPTION: { nodeId: 'item-mrr', delta: 499 },
  STRIPE_FEE_BASIC: { nodeId: 'item-stripe-fees', delta: 3 },
  STRIPE_FEE_PRO: { nodeId: 'item-stripe-fees', delta: 8 },
  STRIPE_FEE_ENTERPRISE: { nodeId: 'item-stripe-fees', delta: 50 },
  REFERRAL_BONUS: { nodeId: 'item-referral-bonus', delta: 20 },
  SUPPORT_TICKET_AI: { nodeId: 'item-claude-api-cost', delta: 0.05 },
};
```

---

## Phase 5: Master Seed Script

### Task 5.1: Create Reset and Seed Script

**File:** `scripts/seed-clockwork.ts` (NEW FILE)

```typescript
/**
 * The Clockwork Canvas: Master Seed Script
 * 
 * Run with: npx tsx scripts/seed-clockwork.ts
 */

import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🎃 The Clockwork Canvas: Seeding Demo...\n');

  try {
    // Step 1: Clear existing demo data
    console.log('Step 1: Clearing existing demo data...');
    await supabase.from('stitch_entities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stitch_flows').delete().eq('canvas_type', 'workflow');
    await supabase.from('stitch_flows').delete().eq('canvas_type', 'bmc');
    console.log('✅ Cleared existing data\n');

    // Step 2: Seed BMC
    console.log('Step 2: Seeding BMC with items and edges...');
    const { seedDefaultBMC } = await import('../src/lib/seeds/default-bmc');
    const bmcId = await seedDefaultBMC(supabase);
    console.log(`✅ BMC created: ${bmcId}\n`);

    // Step 3: Seed Workflows
    console.log('Step 3: Seeding drill-down workflows...');
    const { seedLeadCaptureWorkflow } = await import('../src/lib/seeds/workflows/lead-capture');
    await seedLeadCaptureWorkflow('item-linkedin-ads', bmcId);
    // Add other workflows here...
    console.log('✅ Workflows created\n');

    // Step 4: Verification
    console.log('Step 4: Verifying...');
    const { data: entities } = await supabase
      .from('stitch_entities')
      .select('name, entity_type, current_node_id')
      .eq('canvas_id', bmcId);

    console.log(`   Entities: ${entities?.length || 0}`);
    entities?.forEach(e => console.log(`     - ${e.name} (${e.entity_type}) @ ${e.current_node_id || 'traveling'}`));

    console.log('\n🎃 The Clockwork Canvas is ready!');
    console.log('   Open the BMC at: http://localhost:3000/canvas/' + bmcId);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
```

---

## Verification Checklist

After completing all phases, verify:

1. **Run seed script:**
   ```bash
   npx tsx scripts/seed-clockwork.ts
   ```

2. **Check database:**
   - 13 section nodes
   - 33+ item nodes
   - 27+ edges (journey + system)
   - 13 entities

3. **Visual verification:**
   - Open the BMC canvas in the browser
   - Confirm all 13 sections are visible
   - Confirm entity avatars appear on nodes
   - Confirm traveling entities (Ghost, Goblin) show on edges
   - Confirm system edges are dashed and gray
   - Confirm journey edges are solid and animated

4. **Drill-down test:**
   - Click on a section item (e.g., "LinkedIn Ads")
   - Verify the drill-down workflow appears
   - Navigate back to BMC

5. **Financial section test:**
   - Confirm MRR node shows initial value ($12,450)
   - Confirm Cost nodes show $0

---

## File Summary

| File | Action | Purpose |
|---|---|---|
| `src/lib/seeds/default-bmc.ts` | MODIFY | Add all items and system edges |
| `src/lib/seeds/clockwork-entities.ts` | CREATE | 13 Halloween entities |
| `src/lib/seeds/workflows/lead-capture.ts` | CREATE | Lead capture workflow |
| `src/lib/seeds/workflows/demo-scheduling.ts` | CREATE | Demo scheduling workflow |
| `src/lib/seeds/workflows/trial-activation.ts` | CREATE | Trial activation workflow |
| `src/lib/seeds/workflows/support-handler.ts` | CREATE | Support ticket workflow |
| `src/lib/seeds/workflows/crm-sync.ts` | CREATE | CRM sync mini-workflow |
| `src/lib/seeds/workflows/analytics-update.ts` | CREATE | Analytics update mini-workflow |
| `src/lib/seeds/workflows/slack-notify.ts` | CREATE | Slack notification mini-workflow |
| `src/lib/seeds/workflows/stripe-sync.ts` | CREATE | Stripe sync mini-workflow |
| `src/components/canvas/edges/SystemEdge.tsx` | CREATE | Dashed edge component |
| `src/lib/canvas/financial-updates.ts` | CREATE | Financial node updater |
| `scripts/seed-clockwork.ts` | CREATE | Master seed script |
