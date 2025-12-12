This visualization is exactly what I needed to see. Now I understand the full vision.

Let me write a comprehensive development plan to get from where we are to this living business model canvas.

---

## **Stitch: End-to-End Development Plan**

### **Current State (Phase 7 Complete)**
- ✅ Workflow engine exists
- ✅ Database schema for flows and runs
- ✅ API routes for start/complete/callback
- ❌ No UI to view/run workflows
- ❌ No BMC canvas view
- ❌ No entity tracking
- ❌ No drill-down navigation
- ❌ No visual design

### **Target State (Hackathon Submission)**
- Living BMC canvas with 12 sections
- Entities (customers) traveling across sections with glowing paths
- Drill-down: Click section → see workflow inside
- Drill-down: Click node → see detail canvas
- Production side (Data, People, Code, Integrations) vs Customer side (Marketing, Sales, Offers, etc.)
- Real-time status updates
- At least one complete customer journey demo
- Frankenstein dark theme with electric/alive aesthetic

---

## **Phase 8: BMC Canvas Foundation**

### **Duration: 3-4 hours**

### **Objective**
Create the top-level BMC canvas with 12 sections arranged in your custom layout.

You're absolutely right. I over-engineered it.

The relational approach creates rigidity where we need flexibility. Every time you want a new section type or layout change, you'd need migrations. That's the opposite of vibe-coding.

Let me rethink this.

---

## **The Simpler Model**

React Flow already thinks in JSON: nodes array + edges array. Everything is a node with a `type`. The canvas renders the right component based on type.

**What we actually need:**

```sql
-- Option 1: Extend existing stitch_flows table
ALTER TABLE stitch_flows ADD COLUMN canvas_type text DEFAULT 'workflow';
-- Values: 'bmc' | 'workflow' | 'detail'

ALTER TABLE stitch_flows ADD COLUMN parent_id uuid REFERENCES stitch_flows(id);
-- For drill-down: which canvas is this inside of?

-- The 'graph' column already exists and stores { nodes: [], edges: [] }
-- We just use different node types

-- Entities need their own table (they move, have history, need real-time)
CREATE TABLE stitch_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid REFERENCES stitch_flows(id),
  name text NOT NULL,
  avatar_url text,
  entity_type text DEFAULT 'lead',
  current_node_id text,  -- References node.id in the graph JSON
  journey jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE stitch_entities;
```

That's it. One column addition, one new table.

---

## **The Graph JSON Structure**

The BMC canvas is just a flow with different node types:

```typescript
// A BMC canvas graph
{
  nodes: [
    // Section nodes (the containers)
    {
      id: "section-marketing",
      type: "section",
      position: { x: 800, y: 0 },
      data: {
        name: "Marketing",
        sectionType: "customer", // customer | production | financial
        icon: "megaphone",
        childCanvasId: "flow-123", // drill-down target
      },
      style: { width: 200, height: 180 }
    },
    {
      id: "section-data",
      type: "section", 
      position: { x: 0, y: 0 },
      data: {
        name: "Data",
        sectionType: "production",
        icon: "database",
        childCanvasId: "flow-456",
      },
      style: { width: 200, height: 180 }
    },
    
    // Items inside sections (nested via parentId or parentNode)
    {
      id: "item-crm",
      type: "section-item",
      position: { x: 20, y: 50 }, // relative to parent
      parentNode: "section-data", // React Flow's grouping
      data: {
        name: "CRM",
        icon: "users",
        status: "active",
        linkedWorkflowId: "flow-789", // optional drill-down
      }
    },
    {
      id: "item-analytics",
      type: "section-item",
      position: { x: 100, y: 50 },
      parentNode: "section-data",
      data: {
        name: "Analytics", 
        icon: "bar-chart",
        status: "active",
      }
    },
    
    // ... more sections and items
  ],
  
  edges: [
    // Edges can represent entity paths or data flow
    {
      id: "edge-marketing-sales",
      source: "section-marketing",
      target: "section-sales",
      type: "journey-path", // custom edge type for glowing paths
      data: {
        entityIds: ["monica", "ross"], // which entities traveled this
      }
    }
  ]
}
```

---

## **What This Enables**

**1. Any Layout**
Your custom BMC layout? Just different positions in the JSON. Classic Osterwalder? Different positions. Lean Canvas? Different positions. No schema change.

**2. New Node Types Without Migrations**
Want to add "AI Agent" as a new item type? Just use `type: "ai-agent"` and create the component. The database doesn't care.

**3. Easy Export/Import**
Entire canvases are portable JSON. Share your BMC template. Import someone else's.

**4. Vibe-Coding Friendly**
"Move the Marketing section to the left" = update position in JSON. No database migration.

**5. Fractal by Default**
A workflow canvas has the same structure. A detail canvas has the same structure. Everything is nodes and edges.

---

## **Why Entities Get Their Own Table**

Entities are different from layout. They're:
- **Dynamic** — constantly moving as workflows run
- **Queryable** — "show me all leads" needs SQL, not JSON parsing  
- **Historical** — journey grows over time
- **Shared** — same entity might appear in multiple views
- **Real-time critical** — every movement broadcasts to clients

So entities = relational table. Everything else = JSON in the graph.

---

## **Revised Type Definitions**

```typescript
// Node types for BMC canvas
type BMCNodeType = 
  | 'section'        // Container for a business area
  | 'section-item'   // Item inside a section (CRM, API, etc.)
  | 'entity-slot'    // Where entities appear (optional)

// Node types for workflow canvas (existing)
type WorkflowNodeType =
  | 'ux'            // Human input required
  | 'worker'        // External API call
  | 'splitter'      // Fan out
  | 'collector'     // Fan in
  | 'logic'         // Conditional routing

// Edge types
type EdgeType =
  | 'default'       // Normal workflow connection
  | 'journey-path'  // Entity travel path (glowing)
  | 'dependency'    // Production side dependencies

// Section types (for styling)
type SectionType = 'customer' | 'production' | 'financial'

// Entity in database
interface StitchEntity {
  id: string
  canvas_id: string
  name: string
  avatar_url?: string
  entity_type: 'lead' | 'customer' | 'churned'
  current_node_id: string  // Which section they're in
  journey: JourneyEvent[]
  metadata: {
    source?: string      // "LinkedIn", "SEO", "Referral"
    cac?: number
    ltv?: number
    plan?: string
    [key: string]: any
  }
}

interface JourneyEvent {
  node_id: string
  timestamp: string
  event: string  // "entered", "converted", "churned"
  workflow_run_id?: string
}
```

---

## **Updated Phase 8 Plan**

### **8.1 Database Update (Minimal)**

**Prompt for Kiro:**
```
Extend the database schema minimally for BMC canvas support.

Migration file should:

1. Add columns to stitch_flows:
   - canvas_type: text DEFAULT 'workflow' 
     (values: 'bmc', 'workflow', 'detail')
   - parent_id: uuid REFERENCES stitch_flows(id)
     (for drill-down navigation)

2. Create stitch_entities table:
   - id: uuid primary key
   - canvas_id: uuid references stitch_flows(id)
   - name: text not null
   - avatar_url: text
   - entity_type: text default 'lead'
   - current_node_id: text (references node id in graph JSON)
   - journey: jsonb default '[]'
   - metadata: jsonb default '{}'
   - created_at, updated_at timestamps

3. Enable realtime on stitch_entities

That's all. The graph JSON in stitch_flows handles everything else.
```

### **8.2 TypeScript Types**

**Prompt for Kiro:**
```
Create TypeScript types for the BMC system at src/types/bmc.ts

Define:
- SectionNodeData - data for section nodes
- SectionItemNodeData - data for items inside sections  
- JourneyEdgeData - data for entity travel paths
- StitchEntity - matches database table
- JourneyEvent - single journey step
- SectionType enum
- EntityType enum

Also update src/types/stitch.ts to include canvas_type and parent_id fields.

Keep it simple. These are just data shapes, not complex class hierarchies.
```

### **8.3 BMC Node Components**

**Prompt for Kiro:**
```
Create React Flow node components for the BMC canvas.

src/components/canvas/nodes/SectionNode.tsx
- Renders a section container (Marketing, Sales, Data, etc.)
- Header with icon and name
- Content area where child nodes appear
- Border glow based on sectionType:
  - customer: cyan/green
  - production: blue/purple  
  - financial: amber/gold
- Double-click triggers drill-down
- Dark theme styling

src/components/canvas/nodes/SectionItemNode.tsx
- Renders an item inside a section
- Icon + name + status dot
- Smaller than section, fits inside
- Click to drill into linked workflow (if exists)
- Hover shows tooltip with details

Register these with React Flow nodeTypes.
```

### **8.4 BMC Canvas Component**

**Prompt for Kiro:**
```
Create the main BMC canvas component at src/components/canvas/BMCCanvas.tsx

This component:
1. Receives a flow with canvas_type='bmc'
2. Renders using React Flow with our custom node types
3. Handles drill-down clicks (via callback prop)
4. Overlays entities on their current sections
5. Renders journey path edges with glow effect

Props:
- flow: StitchFlow (with graph JSON)
- entities: StitchEntity[]
- onDrillDown: (canvasId: string) => void
- onEntityClick: (entityId: string) => void

Use dark background. Apply glow effects to sections.
```

### **8.5 Seed Default BMC**

**Prompt for Kiro:**
```
Create a seed function that generates the default BMC canvas JSON.

File: src/lib/seeds/default-bmc.ts

Function: createDefaultBMCGraph()

Returns a graph with:
- 12 section nodes in the layout:
  Row 1: Data, People, Offers, Sales, Marketing
  Row 2: Integrations, Code, Products, Support, Recommendations
  Row 3: Costs (wide), Revenue (wide)

- Sample items in each section (as child nodes with parentNode set)

- No edges initially (entities create journey edges)

Calculate positions based on a grid:
- Section width: 200px
- Section height: 180px (row 1-2) or 150px (row 3)
- Gap: 20px

Also create: seedDefaultBMC() that inserts this into database.
```

---

## **The Mental Model**

Think of it like a game engine:

- **Graph JSON** = the level design (static layout, where things are)
- **Entities table** = the players (dynamic, moving, have state)
- **Node types** = the tile types (section, item, worker, etc.)
- **Edge types** = connection types (data flow, journey path)

The engine (React Flow) renders the level and the players. The database stores both, but in the appropriate format for each.

---

## **Revised Phase 9: Entity & Path System**

### **9.1 Edge Types & Data**

**Prompt for Kiro:**
```
Extend the edge system for journey tracking.

Update types in src/types/bmc.ts:

interface JourneyEdgeData {
  // Identity
  pathName?: string           // Human name: "LinkedIn to Demo"
  
  // Tracking (for link generation)
  trackingCode?: string       // Unique code for this path
  entryUrl?: string          // Generated tracking URL (if using link gen)
  destinationUrl?: string    // Where tracking link redirects
  
  // Stats
  stats: {
    totalEntered: number      // Entities that started this path
    totalCompleted: number    // Entities that reached target node
    currentlyTraveling: number // Entities on this edge now
    averageDuration?: number  // Average time to traverse (ms)
  }
  
  // Display
  intensity?: number         // 0-1, for glow brightness based on traffic
}

Create a custom edge component: src/components/canvas/edges/JourneyEdge.tsx

This edge:
- Renders as curved path between nodes
- Has animated glow (particles moving along path direction)
- Glow intensity based on data.intensity or data.stats.totalEntered
- Shows entities currently on it (we'll add this in 9.3)
- On hover: shows stats tooltip (conversion rate, traffic)

Use framer-motion for the glow animation.
```

### **9.2 Entity State Machine**

**Prompt for Kiro:**
```
Create entity state management at src/lib/entities/entity-state.ts

An entity can be in these states:
- 'at_node' - Stopped at a node, waiting
- 'traveling' - Moving along an edge
- 'completed' - Finished journey (converted/churned)

State transitions:
- at_node → traveling: When workflow at current node completes successfully
- traveling → at_node: When entity reaches the target node
- at_node → completed: When entity reaches a terminal node or churns

Functions:

startEntityJourney(entityId: string, entryEdgeId: string)
  - Creates entity (or finds existing by email)
  - Places entity at start of edge with progress=0
  - Begins travel animation
  - Records journey event

moveEntityAlongEdge(entityId: string, progress: number)
  - Updates edge_progress (0.0 to 1.0)
  - When progress reaches 1.0, transition to target node

arriveAtNode(entityId: string, nodeId: string)
  - Sets current_node_id, clears edge fields
  - Records journey event
  - May trigger node's workflow

All functions update database and trigger realtime broadcast.
```

### **9.3 Entity Visual Component**

**Prompt for Kiro:**
```
Create entity visualization at src/components/canvas/entities/EntityDot.tsx

This is NOT a React Flow node. It's an overlay rendered on top of the canvas.

Props:
- entity: StitchEntity
- edgePath?: SVGPathElement  // The edge SVG path (for positioning during travel)
- nodePosition?: {x, y}      // Node position (for when at node)

Rendering:
- Small circular avatar (24-32px)
- Glowing ring based on entity_type:
  - lead: cyan
  - customer: green  
  - churned: red/gray
- Name tooltip on hover

Position calculation:
- If entity.current_node_id: position at node (offset to not overlap node center)
- If entity.current_edge_id: position along edge SVG path at entity.edge_progress

Use framer-motion for smooth position transitions.

For edge position, use SVG's getPointAtLength():
  const point = edgePath.getPointAtLength(progress * edgePath.getTotalLength())
```

### **9.4 Entity Overlay Layer**

**Prompt for Kiro:**
```
Create entity overlay at src/components/canvas/entities/EntityOverlay.tsx

This component renders all entities as an overlay on the React Flow canvas.

Props:
- entities: StitchEntity[]
- edges: Edge[]              // React Flow edges (to get SVG paths)
- nodes: Node[]              // React Flow nodes (to get positions)
- viewport: Viewport         // React Flow viewport for coordinate transform

This sits OUTSIDE React Flow but positioned absolutely over it.

It needs to:
1. Transform React Flow coordinates to screen coordinates (using viewport)
2. Get SVG path references for edges (React Flow exposes these)
3. Render EntityDot for each entity at correct position
4. Update positions smoothly when entity state changes

Use React Flow's useReactFlow() hook to get edge/node references.
```

### **9.5 Travel Animation**

**Prompt for Kiro:**
```
Create travel animation system at src/lib/entities/travel-animation.ts

When an entity starts traveling an edge:

1. Set entity.current_edge_id and entity.edge_progress = 0
2. Animate progress from 0 to 1 over duration (e.g., 2 seconds for demo)
3. Update database periodically (or just at end)
4. When progress = 1, call arriveAtNode()

Use framer-motion's animate() function:

import { animate } from 'framer-motion'

async function animateTravel(entityId: string, edgeId: string, duration: number) {
  // Update local state for smooth animation
  await animate(0, 1, {
    duration,
    ease: 'easeInOut',
    onUpdate: (progress) => {
      // Update entity position in local state (not DB, too frequent)
      updateEntityProgress(entityId, progress)
    },
    onComplete: () => {
      // Now update DB
      arriveAtNode(entityId, targetNodeId)
    }
  })
}

For real-time sync across clients:
- Only broadcast start and end to database
- Each client animates locally
- This prevents animation jank from network latency
```

### **9.6 Entity Entry Points (Webhooks)**

**Prompt for Kiro:**
```
Create API route for external systems to report entity entry.

src/app/api/stitch/entity/enter/route.ts

POST body:
{
  canvas_id: string,
  edge_id: string,        // Which path they're entering
  entity: {
    name: string,
    email?: string,       // For deduplication
    avatar_url?: string,
    metadata?: object     // UTM params, source, etc.
  }
}

Logic:
1. Check if entity with email already exists (optional dedup)
2. Create entity record with current_edge_id = edge_id, edge_progress = 0
3. Update edge stats (totalEntered++)
4. Trigger realtime broadcast
5. Return { entity_id, tracking_event_id }

This is how landing pages, forms, ad platforms report new leads to Stitch.
```

### **9.7 Demo Seed: Entities on Paths**

**Prompt for Kiro:**
```
Create demo seed with entities at various journey stages.

File: src/lib/seeds/demo-entities.ts

Create BMC canvas edges first (the paths):
- linkedin-ad → demo-registration (Marketing → Sales)
- seo-landing → demo-registration (Marketing → Sales)
- demo-registration → trial-start (Sales → Offers)
- trial-start → paid-basic (Offers → Products)
- trial-start → paid-pro (Offers → Products)
- paid-* → support-ticket (Products → Support)
- support-resolved → referral-program (Support → Recommendations)

Then create entities at various positions:

Monica (customer):
- current_node_id: "referral-program" (in Recommendations)
- journey: full path from linkedin through to referral
- metadata: { cac: 14, ltv: 340, plan: 'pro' }

Ross (lead):
- current_node_id: "trial-start" (in Offers)
- journey: seo → demo → trial
- metadata: { cac: 8, plan: 'basic-trial' }

Rachel (lead):
- current_edge_id: "demo-to-trial" (traveling)
- edge_progress: 0.6
- journey: linkedin → demo → (traveling)

Chandler (churned):
- current_node_id: "churned" (terminal)
- journey: linkedin → demo → trial → churned
- entity_type: 'churned'

Phoebe (new lead):
- current_edge_id: "linkedin-to-demo" (just entered)
- edge_progress: 0.1
```

### **9.8 Edge Statistics Calculation**

**Prompt for Kiro:**
```
Create edge statistics calculator at src/lib/entities/edge-stats.ts

Functions:

calculateEdgeStats(canvasId: string): Promise<Map<edgeId, EdgeStats>>
  - Query all entities for this canvas
  - Group by journey events to count:
    - totalEntered: entities that started this edge
    - totalCompleted: entities that finished this edge  
    - currentlyTraveling: entities with current_edge_id = this edge
  - Calculate conversionRate = totalCompleted / totalEntered
  - Calculate averageDuration from journey timestamps

updateEdgeIntensity(edges: Edge[], stats: Map): Edge[]
  - Normalize traffic counts to 0-1 intensity
  - Higher traffic = brighter glow
  - Returns edges with updated data.intensity

Call this on canvas load and periodically (or after entity movements).

Checkpoint 9 (Revised)

 Journey edges render with animated glow
 Edge intensity reflects traffic volume
 Entities render as dots on edges or at nodes
 Entity position calculated from edge SVG path
 Travel animation smooth (framer-motion)
 Entity entry webhook works
 Demo entities seeded at various journey stages
 Edge stats calculated and displayed


The Big Picture
What you're building is unprecedented:
Traditional analytics: "You had 1,247 visitors, 89 signups, 12 paid conversions."
Stitch: "Watch Monica travel from your LinkedIn ad, through your demo, into your trial, and become a customer. Right now. On a canvas that IS your business model."
It's not just numbers. It's the movie of your business running.


---

## **Phase 9 once again, because some parts of Phase 8 were missing after the implementation:

You're right. The current layout is wrong and sections shouldn't have edges between them. Let me write a comprehensive Phase 9 that fixes the BMC layout AND builds the entity system.

---

## **Phase 9: BMC Layout Polish & Entity System**

### **Duration: 4-5 hours**

### **Overview**

This phase has two parts:
1. **9A: Fix BMC Layout** — Correct grid, remove section edges, add mock nodes
2. **9B: Entity System** — Entities traveling on edges between nodes

---

## **Part 9A: BMC Layout Polish**

### **9A.1 Correct Grid Layout**

The BMC uses an 8-row × 10-column grid. Each cell is approximately 140px × 100px.

```
GRID LAYOUT (8 rows × 10 columns):

     Col1   Col2   Col3   Col4   Col5   Col6   Col7   Col8   Col9   Col10
    ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
R1  │             │             │             │             │             │
    │    DATA     │   PEOPLE    │   OFFERS    │    SALES    │  MARKETING  │
R2  │   (3H×2W)   │   (3H×2W)   │   (3H×2W)   │   (3H×2W)   │   (2H×2W)   │
    │             │             │             │             ├─────────────┤
R3  │             │             │             │             │  RECOMMEND- │
    ├─────────────┼─────────────┼─────────────┼─────────────┤   ATIONS    │
R4  │             │             │             │             │   (2H×2W)   │
    │ INTEGRATIONS│    CODE     │  PRODUCTS   │   SUPPORT   ├─────────────┤
R5  │   (3H×2W)   │   (3H×2W)   │   (3H×2W)   │   (3H×2W)   │   PAYING    │
    │             │             │             │             │  CUSTOMERS  │
R6  │             │             │             │             │   (2H×2W)   │
    ├─────────────┴─────────────┼─────────────┴─────────────┴─────────────┤
R7  │                           │                                         │
    │          COSTS            │                REVENUE                  │
R8  │         (2H×5W)           │                (2H×5W)                  │
    └───────────────────────────┴─────────────────────────────────────────┘
```

**Prompt for Kiro:**
```
Update the BMC seed script to use the correct grid layout.

File: scripts/seed-bmc.ts

Grid specifications:
- Cell size: 140px wide × 100px tall
- Gap between sections: 20px
- Total canvas: ~1540px wide × 900px tall

Section positions and sizes (x, y, width, height):

PRODUCTION SIDE (columns 1-4, rows 1-6):
- Data: x=0, y=0, w=280, h=300 (2 cols × 3 rows)
- People: x=300, y=0, w=280, h=300
- Integrations: x=0, y=320, w=280, h=300
- Code: x=300, y=320, w=280, h=300

CUSTOMER JOURNEY (columns 5-8, rows 1-6):
- Offers: x=600, y=0, w=280, h=300
- Sales: x=900, y=0, w=280, h=300
- Products: x=600, y=320, w=280, h=300
- Support: x=900, y=320, w=280, h=300

RIGHT COLUMN (columns 9-10, rows 1-6):
- Marketing: x=1200, y=0, w=280, h=200 (2 cols × 2 rows)
- Recommendations: x=1200, y=220, w=280, h=200
- Paying Customers: x=1200, y=440, w=280, h=200

FINANCIAL (full width bottom, rows 7-8):
- Costs: x=0, y=640, w=720, h=200 (5 cols × 2 rows)
- Revenue: x=740, y=640, w=740, h=200

Update the BMC_SECTIONS array with these exact positions.
Section type categorization:
- Production: Data, People, Integrations, Code
- Customer: Offers, Sales, Products, Support, Marketing, Recommendations, Paying Customers
- Financial: Costs, Revenue

IMPORTANT: Remove ALL edges from BMC_EDGES. Sections do not connect to each other.
Edges will connect NODES inside sections, not the sections themselves.
```

### **9A.2 Section Node Component Update**

**Prompt for Kiro:**
```
Update the SectionNode component to be a pure background container.

File: src/components/canvas/nodes/SectionNode.tsx

Changes:
1. REMOVE all handles (source/target). Sections don't connect to anything.
2. Section is a visual container only - like a room in a building
3. Keep the glow effect based on category (production/customer/financial)
4. Add "Drop items here" placeholder text when section is empty
5. Section should have lower z-index so nodes inside appear on top

Visual styling:
- Dark semi-transparent background (#0d1117 with 80% opacity)
- Glowing border based on category:
  - Production: purple/blue (#6366f1, #8b5cf6)
  - Customer: cyan/teal (#06b6d4, #14b8a6)
  - Financial: amber/gold (#f59e0b, #eab308)
- Rounded corners (8px)
- Header with icon and name
- Subtle grid pattern or texture inside

The section must NOT be selectable for edge connections.
Set selectable: false and connectable: false in node properties.
```

### **9A.3 Create Item Node Component**

**Prompt for Kiro:**
```
Create a new ItemNode component for workers/assets inside sections.

File: src/components/canvas/nodes/ItemNode.tsx

This is the actual interactive node that can be connected with edges.

Props (via data):
- label: string (e.g., "CRM", "LinkedIn Ads", "Demo Call")
- icon: string (lucide icon name)
- status: 'idle' | 'active' | 'running' | 'error'
- itemType: 'worker' | 'asset' | 'integration' | 'product'

Visual design:
- Small card (120px × 60px approximately)
- Icon on left, label on right
- Status indicator dot (top-right corner):
  - idle: gray
  - active: green
  - running: amber/pulsing
  - error: red
- Dark background with subtle border
- Glow on hover
- HAS handles for edge connections (source on right, target on left)

Register this as 'item' node type in React Flow.
```

### **9A.4 Create Mock Nodes for Demo**

**Prompt for Kiro:**
```
Update the seed script to include mock item nodes inside sections.

Add to seed-bmc.ts:

Mock nodes to create (these are INSIDE sections, not the sections themselves):

MARKETING section:
- "LinkedIn Ads" (icon: linkedin, type: worker)
- "YouTube Channel" (icon: youtube, type: worker)  
- "SEO Content" (icon: search, type: worker)

SALES section:
- "Demo Call" (icon: phone, type: worker)
- "Email Sequence" (icon: mail, type: worker)

OFFERS section:
- "Free Trial" (icon: gift, type: product)
- "Lead Magnet" (icon: magnet, type: product)

PRODUCTS section:
- "Basic Plan" (icon: package, type: product)
- "Pro Plan" (icon: star, type: product)
- "Enterprise" (icon: building, type: product)

SUPPORT section:
- "Help Desk" (icon: headphones, type: worker)
- "Knowledge Base" (icon: book-open, type: asset)

RECOMMENDATIONS section:
- "Referral Program" (icon: share-2, type: worker)

PAYING CUSTOMERS section:
- "Active Subscribers" (icon: users, type: asset)

DATA section:
- "CRM" (icon: database, type: asset)
- "Analytics" (icon: bar-chart-2, type: asset)

PEOPLE section:
- "Team" (icon: users, type: asset)

INTEGRATIONS section:
- "Stripe" (icon: credit-card, type: integration)
- "Supabase" (icon: database, type: integration)

CODE section:
- "Landing Page" (icon: globe, type: asset)
- "API Server" (icon: server, type: asset)

Position nodes inside their parent sections with some padding.
Use parentNode property to group them with sections.

NOW create edges between NODES (not sections):
- "LinkedIn Ads" → "Demo Call" (marketing to sales)
- "YouTube Channel" → "Demo Call"
- "Demo Call" → "Free Trial" (sales to offers)
- "Free Trial" → "Basic Plan" (offers to products)
- "Free Trial" → "Pro Plan"
- "Basic Plan" → "Help Desk" (products to support)
- "Pro Plan" → "Help Desk"
- "Help Desk" → "Referral Program" (support to recommendations)
- "Referral Program" → "Active Subscribers" (recommendations to paying customers)

These edges represent the CUSTOMER JOURNEY paths.
```

### **9A.5 Edge Styling for Journey Paths**

**Prompt for Kiro:**
```
Create a custom edge component for journey paths.

File: src/components/canvas/edges/JourneyEdge.tsx

This edge visualizes the path entities travel.

Visual design:
- Curved bezier path (smoothstep or bezier)
- Glowing cyan/teal color (#06b6d4)
- Animated dashed pattern moving along the path direction
- Glow intensity can vary based on traffic (props.data.intensity)
- On hover: show tooltip with path stats

Animation using CSS:
```css
@keyframes flowAnimation {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}

.journey-edge {
  stroke-dasharray: 8 4;
  animation: flowAnimation 1s linear infinite;
}
```

Props (via data):
- intensity: number (0-1, affects glow brightness)
- label: string (optional path name)
- stats: { totalTraveled, conversionRate } (for tooltip)

Register as 'journey' edge type.
Use this type for all customer journey edges.
```

### **9A.6 Update Canvas to Use New Node Types**

**Prompt for Kiro:**
```
Update BMCCanvas component to register all node and edge types.

File: src/components/canvas/BMCCanvas.tsx

Register nodeTypes:
- 'section': SectionNode (background containers)
- 'item': ItemNode (interactive workers/assets)

Register edgeTypes:
- 'journey': JourneyEdge (animated customer path)
- 'default': default React Flow edge (for other connections)

Ensure sections render BELOW items (z-index).
Section nodes should have: zIndex: -1, selectable: false, draggable: false
Item nodes should have: zIndex: 1, selectable: true, draggable: true

Add minimap in bottom-right corner showing canvas overview.
```

### **Checkpoint 9A**
- [ ] Sections positioned in correct 8×10 grid layout
- [ ] Sections have NO handles (can't connect edges)
- [ ] Item nodes created inside sections
- [ ] Item nodes HAVE handles (can connect edges)
- [ ] Edges connect items, not sections
- [ ] Journey edges have animated glow
- [ ] Mock data shows realistic business model
- [ ] Canvas matches nanobanana reference visually

---

## **Part 9B: Entity System**

### **Core Concept Reminder**

```
Entities travel ON edges, stop AT nodes.

                    ┌─────────────┐
                    │ LinkedIn Ad │ (node)
                    └──────┬──────┘
                           │
                    Entity ●  ← traveling on edge (edge_progress: 0.3)
                           │
                           ▼
                    ┌─────────────┐
                    │  Demo Call  │ (node)
                    └──────┬──────┘
                           │
                      ● Entity  ← stopped at node (current_node_id: "demo-call")
                           │
                           ▼
                    ┌─────────────┐
                    │ Free Trial  │ (node)
                    └─────────────┘
```

### **9B.1 Entity Database Schema**

**Prompt for Kiro:**
```
Create the entity table if not already exists.

File: supabase/migrations/XXX_add_entities.sql

CREATE TABLE IF NOT EXISTS stitch_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid REFERENCES stitch_flows(id) ON DELETE CASCADE,
  
  -- Identity
  name text NOT NULL,
  email text,
  avatar_url text,
  entity_type text DEFAULT 'lead' CHECK (entity_type IN ('lead', 'customer', 'churned')),
  
  -- Position (one of these is set)
  current_node_id text,           -- Stopped at this node
  current_edge_id text,           -- Traveling on this edge
  edge_progress decimal(3,2),     -- 0.00 to 1.00 (position along edge)
  destination_node_id text,       -- Where entity is heading (when on edge)
  
  -- Journey history
  journey jsonb DEFAULT '[]',     -- Array of JourneyEvent
  
  -- Business data
  metadata jsonb DEFAULT '{}',    -- CAC, LTV, source, plan, etc.
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz         -- When entity finished journey
);

-- Index for fast lookups
CREATE INDEX idx_entities_canvas ON stitch_entities(canvas_id);
CREATE INDEX idx_entities_current_node ON stitch_entities(current_node_id);
CREATE INDEX idx_entities_current_edge ON stitch_entities(current_edge_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_entities;

-- Update trigger for updated_at
CREATE TRIGGER update_stitch_entities_updated_at
  BEFORE UPDATE ON stitch_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### **9B.2 Entity TypeScript Types**

**Prompt for Kiro:**
```
Create entity types at src/types/entity.ts

export type EntityType = 'lead' | 'customer' | 'churned';

export interface JourneyEvent {
  timestamp: string;
  type: 'entered_node' | 'left_node' | 'started_edge' | 'completed_edge' | 'converted' | 'churned';
  node_id?: string;
  edge_id?: string;
  from_node_id?: string;
  workflow_run_id?: string;
  note?: string;
}

export interface EntityMetadata {
  source?: string;           // "linkedin", "seo", "referral"
  campaign?: string;         // UTM campaign
  cac?: number;              // Customer acquisition cost
  ltv?: number;              // Lifetime value
  plan?: string;             // Current plan
  [key: string]: any;
}

export interface StitchEntity {
  id: string;
  canvas_id: string;
  
  // Identity
  name: string;
  email?: string;
  avatar_url?: string;
  entity_type: EntityType;
  
  // Position
  current_node_id?: string;
  current_edge_id?: string;
  edge_progress?: number;
  destination_node_id?: string;
  
  // Data
  journey: JourneyEvent[];
  metadata: EntityMetadata;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface EntityPosition {
  x: number;
  y: number;
  type: 'node' | 'edge';
  id: string;
}
```

### **9B.3 Entity Visual Component**

**Prompt for Kiro:**
```
Create the entity dot component.

File: src/components/canvas/entities/EntityDot.tsx

This renders a single entity as a small avatar dot.

Props:
- entity: StitchEntity
- position: { x: number, y: number }
- isSelected: boolean
- onClick: () => void

Visual design:
- Circular avatar (28px diameter)
- If avatar_url: show image
- If no avatar: show initials on colored background
- Glowing ring around avatar:
  - lead: cyan (#06b6d4)
  - customer: green (#10b981)
  - churned: red (#ef4444) with reduced opacity
- Pulse animation when entity is moving
- Name label below (truncated, shows on hover)
- Scale up slightly on hover

Use framer-motion for:
- Position transitions (when entity moves)
- Pulse animation
- Hover effects

```typescript
import { motion } from 'framer-motion';

export function EntityDot({ entity, position, isSelected, onClick }: Props) {
  const glowColor = {
    lead: '#06b6d4',
    customer: '#10b981', 
    churned: '#ef4444'
  }[entity.entity_type];
  
  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{ left: position.x, top: position.y }}
      animate={{ x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      whileHover={{ scale: 1.2 }}
      onClick={onClick}
    >
      <div 
        className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
        style={{ 
          borderColor: glowColor,
          boxShadow: `0 0 12px ${glowColor}`,
          backgroundColor: '#1a1a2e'
        }}
      >
        {entity.avatar_url ? (
          <img src={entity.avatar_url} className="w-full h-full rounded-full" />
        ) : (
          <span className="text-xs font-bold text-white">
            {entity.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </motion.div>
  );
}
```
```

### **9B.4 Entity Position Calculator**

**Prompt for Kiro:**
```
Create position calculation utilities.

File: src/lib/entities/position.ts

Functions to calculate where an entity should appear on canvas.

import { Node, Edge } from '@xyflow/react';

interface Position { x: number; y: number; }

/**
 * Get position for entity at a node
 * Entities cluster at the bottom of their current node
 */
export function getEntityNodePosition(
  node: Node,
  entityIndex: number,
  totalEntitiesAtNode: number
): Position {
  const nodeCenter = {
    x: node.position.x + (node.width || 120) / 2,
    y: node.position.y + (node.height || 60)
  };
  
  // Spread entities horizontally below the node
  const spacing = 35;
  const totalWidth = (totalEntitiesAtNode - 1) * spacing;
  const startX = nodeCenter.x - totalWidth / 2;
  
  return {
    x: startX + entityIndex * spacing - 14, // -14 to center the 28px dot
    y: nodeCenter.y + 10
  };
}

/**
 * Get position for entity traveling on edge
 * Uses SVG path to find point at progress percentage
 */
export function getEntityEdgePosition(
  edge: Edge,
  sourceNode: Node,
  targetNode: Node,
  progress: number // 0.0 to 1.0
): Position {
  // Simple linear interpolation for now
  // TODO: Use actual SVG path for curved edges
  
  const sourcePos = {
    x: sourceNode.position.x + (sourceNode.width || 120) / 2,
    y: sourceNode.position.y + (sourceNode.height || 60)
  };
  
  const targetPos = {
    x: targetNode.position.x + (targetNode.width || 120) / 2,
    y: targetNode.position.y
  };
  
  return {
    x: sourcePos.x + (targetPos.x - sourcePos.x) * progress - 14,
    y: sourcePos.y + (targetPos.y - sourcePos.y) * progress - 14
  };
}

/**
 * Get position using actual SVG path element
 * More accurate for curved edges
 */
export function getEntityEdgePositionFromPath(
  pathElement: SVGPathElement,
  progress: number
): Position {
  const totalLength = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(totalLength * progress);
  
  return {
    x: point.x - 14,
    y: point.y - 14
  };
}
```

### **9B.5 Entity Overlay Component**

**Prompt for Kiro:**
```
Create the entity overlay that renders all entities on the canvas.

File: src/components/canvas/entities/EntityOverlay.tsx

This component sits on top of React Flow and renders all entities.

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { motion } from 'framer-motion';
import { EntityDot } from './EntityDot';
import { StitchEntity } from '@/types/entity';
import { getEntityNodePosition, getEntityEdgePosition } from '@/lib/entities/position';

interface Props {
  entities: StitchEntity[];
  onEntityClick: (entity: StitchEntity) => void;
  selectedEntityId?: string;
}

export function EntityOverlay({ entities, onEntityClick, selectedEntityId }: Props) {
  const { getNodes, getEdges, getNode } = useReactFlow();
  const viewport = useViewport();
  
  const calculatePosition = useCallback((entity: StitchEntity) => {
    const nodes = getNodes();
    const edges = getEdges();
    
    if (entity.current_node_id) {
      // Entity is at a node
      const node = getNode(entity.current_node_id);
      if (!node) return null;
      
      // Count entities at this node for positioning
      const entitiesAtNode = entities.filter(e => e.current_node_id === entity.current_node_id);
      const index = entitiesAtNode.findIndex(e => e.id === entity.id);
      
      return getEntityNodePosition(node, index, entitiesAtNode.length);
    }
    
    if (entity.current_edge_id && entity.edge_progress !== undefined) {
      // Entity is traveling on edge
      const edge = edges.find(e => e.id === entity.current_edge_id);
      if (!edge) return null;
      
      const sourceNode = getNode(edge.source);
      const targetNode = getNode(edge.target);
      if (!sourceNode || !targetNode) return null;
      
      return getEntityEdgePosition(edge, sourceNode, targetNode, entity.edge_progress);
    }
    
    return null;
  }, [getNodes, getEdges, getNode, entities]);
  
  // Transform canvas coordinates to screen coordinates
  const toScreenCoords = (pos: { x: number, y: number }) => ({
    x: pos.x * viewport.zoom + viewport.x,
    y: pos.y * viewport.zoom + viewport.y
  });
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {entities.map(entity => {
        const canvasPos = calculatePosition(entity);
        if (!canvasPos) return null;
        
        const screenPos = toScreenCoords(canvasPos);
        
        return (
          <div key={entity.id} className="pointer-events-auto">
            <EntityDot
              entity={entity}
              position={screenPos}
              isSelected={entity.id === selectedEntityId}
              onClick={() => onEntityClick(entity)}
            />
          </div>
        );
      })}
    </div>
  );
}
```

Include this overlay in BMCCanvas, positioned absolutely over the React Flow canvas.
```

### **9B.6 Entity Travel Animation**

**Prompt for Kiro:**
```
Create the travel animation system.

File: src/lib/entities/travel.ts

This handles animating entities along edges.

```typescript
import { animate } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface TravelConfig {
  entityId: string;
  edgeId: string;
  destinationNodeId: string;
  duration?: number; // seconds, default 2
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

/**
 * Animate entity traveling from current position to destination node
 */
export async function animateEntityTravel({
  entityId,
  edgeId,
  destinationNodeId,
  duration = 2,
  onProgress,
  onComplete
}: TravelConfig): Promise<void> {
  // Start the animation
  await animate(0, 1, {
    duration,
    ease: 'easeInOut',
    onUpdate: (progress) => {
      // Update local state for smooth animation
      onProgress?.(progress);
    },
    onComplete: async () => {
      // Animation finished, update database
      await arriveAtNode(entityId, destinationNodeId);
      onComplete?.();
    }
  });
}

/**
 * Start entity traveling on an edge (called by workflow completion)
 */
export async function startEntityTravel(
  entityId: string,
  edgeId: string,
  destinationNodeId: string
): Promise<void> {
  const { error } = await supabase
    .from('stitch_entities')
    .update({
      current_node_id: null,
      current_edge_id: edgeId,
      edge_progress: 0,
      destination_node_id: destinationNodeId,
      updated_at: new Date().toISOString()
    })
    .eq('id', entityId);
  
  if (error) throw error;
  
  // Also append to journey
  await appendJourneyEvent(entityId, {
    type: 'started_edge',
    edge_id: edgeId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Entity arrives at destination node
 */
export async function arriveAtNode(
  entityId: string,
  nodeId: string
): Promise<void> {
  // Get current entity to record where it came from
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('current_edge_id')
    .eq('id', entityId)
    .single();
  
  const { error } = await supabase
    .from('stitch_entities')
    .update({
      current_node_id: nodeId,
      current_edge_id: null,
      edge_progress: null,
      destination_node_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', entityId);
  
  if (error) throw error;
  
  // Append to journey
  await appendJourneyEvent(entityId, {
    type: 'entered_node',
    node_id: nodeId,
    from_edge_id: entity?.current_edge_id,
    timestamp: new Date().toISOString()
  });
}

async function appendJourneyEvent(entityId: string, event: any): Promise<void> {
  const { data: entity } = await supabase
    .from('stitch_entities')
    .select('journey')
    .eq('id', entityId)
    .single();
  
  const journey = [...(entity?.journey || []), event];
  
  await supabase
    .from('stitch_entities')
    .update({ journey })
    .eq('id', entityId);
}
```
```

### **9B.7 Real-Time Entity Subscription**

**Prompt for Kiro:**
```
Create a hook for real-time entity updates.

File: src/hooks/useEntities.ts

```typescript
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { StitchEntity } from '@/types/entity';
import { animateEntityTravel } from '@/lib/entities/travel';

interface UseEntitiesResult {
  entities: StitchEntity[];
  isLoading: boolean;
  error: Error | null;
  // Local progress state for smooth animations
  entityProgress: Map<string, number>;
}

export function useEntities(canvasId: string): UseEntitiesResult {
  const [entities, setEntities] = useState<StitchEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [entityProgress, setEntityProgress] = useState<Map<string, number>>(new Map());
  
  // Initial fetch
  useEffect(() => {
    async function fetchEntities() {
      const { data, error } = await supabase
        .from('stitch_entities')
        .select('*')
        .eq('canvas_id', canvasId);
      
      if (error) {
        setError(error);
      } else {
        setEntities(data || []);
      }
      setIsLoading(false);
    }
    
    fetchEntities();
  }, [canvasId]);
  
  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`entities:${canvasId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stitch_entities',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEntities(prev => [...prev, payload.new as StitchEntity]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as StitchEntity;
          const old = payload.old as StitchEntity;
          
          setEntities(prev => 
            prev.map(e => e.id === updated.id ? updated : e)
          );
          
          // Detect if entity started traveling
          if (updated.current_edge_id && !old.current_edge_id) {
            // Start local animation
            animateEntityTravel({
              entityId: updated.id,
              edgeId: updated.current_edge_id,
              destinationNodeId: updated.destination_node_id!,
              duration: 2,
              onProgress: (progress) => {
                setEntityProgress(prev => new Map(prev).set(updated.id, progress));
              },
              onComplete: () => {
                setEntityProgress(prev => {
                  const next = new Map(prev);
                  next.delete(updated.id);
                  return next;
                });
              }
            });
          }
        } else if (payload.eventType === 'DELETE') {
          setEntities(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [canvasId]);
  
  return { entities, isLoading, error, entityProgress };
}
```

The entityProgress map holds local animation state that updates more frequently
than the database for smooth 60fps animation.
```

### **9B.8 Seed Demo Entities**

**Prompt for Kiro:**
```
Add demo entities to the seed script.

Update: scripts/seed-bmc.ts

Add function to seed sample entities:

async function seedEntities(canvasId: string) {
  const entities = [
    // Monica - completed full journey, now paying customer
    {
      canvas_id: canvasId,
      name: 'Monica Geller',
      email: 'monica@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=monica',
      entity_type: 'customer',
      current_node_id: 'item-active-subscribers',
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-11-01T10:00:00Z' },
        { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-11-01T10:01:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-11-02T14:00:00Z' },
        { type: 'started_edge', edge_id: 'e-demo-trial', timestamp: '2024-11-02T15:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-11-02T15:01:00Z' },
        { type: 'started_edge', edge_id: 'e-trial-pro', timestamp: '2024-11-10T09:00:00Z' },
        { type: 'entered_node', node_id: 'item-pro-plan', timestamp: '2024-11-10T09:01:00Z' },
        { type: 'converted', timestamp: '2024-11-10T09:01:00Z' }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'q4-2024',
        cac: 14,
        ltv: 340,
        plan: 'pro'
      }
    },
    
    // Ross - in free trial
    {
      canvas_id: canvasId,
      name: 'Ross Geller',
      email: 'ross@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ross',
      entity_type: 'lead',
      current_node_id: 'item-free-trial',
      journey: [
        { type: 'entered_node', node_id: 'item-seo-content', timestamp: '2024-11-15T08:00:00Z' },
        { type: 'started_edge', edge_id: 'e-seo-demo', timestamp: '2024-11-15T08:30:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-11-16T11:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-11-16T12:00:00Z' }
      ],
      metadata: {
        source: 'seo',
        cac: 8,
        plan: 'trial'
      }
    },
    
    // Rachel - currently traveling to demo call
    {
      canvas_id: canvasId,
      name: 'Rachel Green',
      email: 'rachel@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
      entity_type: 'lead',
      current_edge_id: 'e-linkedin-demo',
      edge_progress: 0.4,
      destination_node_id: 'item-demo-call',
      journey: [
        { type: 'entered_node', node_id: 'item-linkedin-ads', timestamp: '2024-11-20T09:00:00Z' },
        { type: 'started_edge', edge_id: 'e-linkedin-demo', timestamp: '2024-11-20T09:05:00Z' }
      ],
      metadata: {
        source: 'linkedin',
        campaign: 'q4-2024'
      }
    },
    
    // Chandler - churned
    {
      canvas_id: canvasId,
      name: 'Chandler Bing',
      email: 'chandler@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chandler',
      entity_type: 'churned',
      current_node_id: 'item-basic-plan',
      completed_at: '2024-10-15T00:00:00Z',
      journey: [
        { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: '2024-09-01T10:00:00Z' },
        { type: 'entered_node', node_id: 'item-demo-call', timestamp: '2024-09-03T14:00:00Z' },
        { type: 'entered_node', node_id: 'item-free-trial', timestamp: '2024-09-03T15:00:00Z' },
        { type: 'entered_node', node_id: 'item-basic-plan', timestamp: '2024-09-15T09:00:00Z' },
        { type: 'churned', timestamp: '2024-10-15T00:00:00Z' }
      ],
      metadata: {
        source: 'youtube',
        cac: 22,
        ltv: 49,
        plan: 'basic',
        churn_reason: 'price'
      }
    },
    
    // Phoebe - just entered from YouTube
    {
      canvas_id: canvasId,
      name: 'Phoebe Buffay',
      email: 'phoebe@example.com',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=phoebe',
      entity_type: 'lead',
      current_node_id: 'item-youtube-channel',
      journey: [
        { type: 'entered_node', node_id: 'item-youtube-channel', timestamp: new Date().toISOString() }
      ],
      metadata: {
        source: 'youtube'
      }
    }
  ];
  
  const { error } = await supabase
    .from('stitch_entities')
    .insert(entities);
  
  if (error) throw error;
  
  console.log(`✅ Seeded ${entities.length} demo entities`);
}

// Call in main():
await seedEntities(bmcId);
```

### **9B.9 Entity Detail Panel**

**Prompt for Kiro:**
```
Create a panel that shows entity details when clicked.

File: src/components/panels/EntityDetailPanel.tsx

Shows when an entity is selected:

- Avatar (large) and name
- Type badge (Lead / Customer / Churned)
- Contact info (email)
- Source (LinkedIn, SEO, YouTube, etc.)
- Business metrics: CAC, LTV, Plan
- Journey timeline:
  - Visual timeline of all journey events
  - Nodes visited with timestamps
  - Current position highlighted
- Actions:
  - "Move to..." button (for demo/manual control)
  - "View journey" expands full history

Style:
- Slide-in panel from right
- Dark theme matching canvas
- Close button

```typescript
interface Props {
  entity: StitchEntity | null;
  onClose: () => void;
  onMoveEntity: (entityId: string, targetNodeId: string) => void;
}
```
```

### **9B.10 Edge Statistics**

**Prompt for Kiro:**
```
Create edge statistics calculation.

File: src/lib/entities/edge-stats.ts

Calculate traffic and conversion stats for each edge.

```typescript
import { supabase } from '@/lib/supabase';

interface EdgeStats {
  edgeId: string;
  totalEntered: number;      // Entities that started this edge
  totalCompleted: number;    // Entities that finished this edge
  currentlyTraveling: number; // Entities on this edge now
  conversionRate: number;    // totalCompleted / totalEntered
  averageDuration?: number;  // Average time to traverse (ms)
}

export async function calculateEdgeStats(canvasId: string): Promise<Map<string, EdgeStats>> {
  const { data: entities } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('canvas_id', canvasId);
  
  if (!entities) return new Map();
  
  const statsMap = new Map<string, EdgeStats>();
  
  // Count currently traveling
  entities.forEach(entity => {
    if (entity.current_edge_id) {
      const existing = statsMap.get(entity.current_edge_id) || createEmptyStats(entity.current_edge_id);
      existing.currentlyTraveling++;
      statsMap.set(entity.current_edge_id, existing);
    }
  });
  
  // Count from journey histories
  entities.forEach(entity => {
    entity.journey.forEach((event: any, index: number) => {
      if (event.type === 'started_edge' && event.edge_id) {
        const existing = statsMap.get(event.edge_id) || createEmptyStats(event.edge_id);
        existing.totalEntered++;
        
        // Check if next event is entered_node (completed the edge)
        const nextEvent = entity.journey[index + 1];
        if (nextEvent?.type === 'entered_node') {
          existing.totalCompleted++;
        }
        
        statsMap.set(event.edge_id, existing);
      }
    });
  });
  
  // Calculate conversion rates
  statsMap.forEach((stats, edgeId) => {
    stats.conversionRate = stats.totalEntered > 0 
      ? stats.totalCompleted / stats.totalEntered 
      : 0;
  });
  
  return statsMap;
}

function createEmptyStats(edgeId: string): EdgeStats {
  return {
    edgeId,
    totalEntered: 0,
    totalCompleted: 0,
    currentlyTraveling: 0,
    conversionRate: 0
  };
}

/**
 * Convert stats to edge intensity (0-1) for visual glow
 */
export function calculateEdgeIntensity(stats: EdgeStats, maxTraffic: number): number {
  const traffic = stats.totalEntered + stats.currentlyTraveling * 2; // Weight current higher
  return Math.min(traffic / maxTraffic, 1);
}
```

Use these stats to set the intensity prop on JourneyEdge components.
Higher traffic edges glow brighter.
```

---

### **Checkpoint 9 (Complete)**

**Part A - Layout:**
- [ ] Sections positioned in correct 8×10 grid
- [ ] Sections have NO edge handles
- [ ] Item nodes created inside sections
- [ ] Item nodes HAVE edge handles
- [ ] Edges connect items (not sections)
- [ ] Journey edges have animated glow
- [ ] Mock nodes show realistic business model
- [ ] Visual matches nanobanana reference

**Part B - Entities:**
- [ ] Entity table created with correct schema
- [ ] EntityDot component renders avatars with glow
- [ ] EntityOverlay positions entities correctly
- [ ] Entities at nodes cluster below the node
- [ ] Entities on edges position along the path
- [ ] Travel animation smooth (framer-motion)
- [ ] Real-time subscription updates entities
- [ ] Demo entities seeded (Monica, Ross, Rachel, Chandler, Phoebe)
- [ ] Entity detail panel shows on click
- [ ] Edge statistics calculate and display

---

This Phase 9 gives you both the polished BMC layout AND the entity system working together. When complete, you'll see the Friends cast traveling through your business model canvas in real-time.


---

## **Phase 10: Drill-Down Navigation**

### **Duration: 3-4 hours**

### **Objective**
Implement the fractal canvas - click to zoom into sections and nodes.

### **10.1 Navigation State Management**

**Prompt for Kiro:**
```
Create navigation state management for drill-down at src/lib/navigation/canvas-navigation.ts

State:
- canvasStack: string[] -- stack of canvas IDs (for back navigation)
- currentCanvasId: string
- breadcrumbs: {id, name, type}[]

Functions:
- drillInto(canvasId, name) -- push to stack, update current
- goBack() -- pop from stack
- goToRoot() -- clear stack, go to BMC
- getBreadcrumbs() -- return current path

Create hook: src/hooks/useCanvasNavigation.ts
- Provides navigation state and functions
- Syncs with URL (optional but nice)
```

### **10.2 Section Click Handler**

**Prompt for Kiro:**
```
Update SectionNode to handle click events for drill-down.

When a section is double-clicked (or has a drill-down button):
1. Check if section has a child_canvas_id
2. If yes, call drillInto(child_canvas_id, section.name)
3. Canvas view switches to the section's workflow canvas

Add a visual indicator that sections are clickable:
- Small expand icon in corner
- Hover effect
- Cursor: pointer on hover
```

### **10.3 Workflow Canvas View**

**Prompt for Kiro:**
```
Create the workflow canvas view at src/components/canvas/WorkflowCanvas.tsx

This shows the workflow inside a section (what we built in Phase 7).

Requirements:
- Renders stitch_flows graph (nodes and edges)
- Uses our existing node types (UX, Worker, Splitter, Collector)
- Shows real-time status during runs
- Back button to return to BMC view

Integrate with our existing:
- useRun hook for run state
- useFlow hook for flow data
- Supabase realtime for status updates

Style the workflow canvas to match the BMC theme (dark, glowing).
```

### **10.4 Breadcrumb Navigation**

**Prompt for Kiro:**
```
Create breadcrumb navigation at src/components/navigation/CanvasBreadcrumbs.tsx

Shows the navigation path:
BMC > Marketing > LinkedIn Outreach Workflow

Each breadcrumb is clickable to jump back to that level.

Style:
- Horizontal layout
- Separator: > or /
- Current level is highlighted
- Previous levels are dimmed but clickable
```

### **10.5 Item Click Handler (Second-Level Drill-Down)**

**Prompt for Kiro:**
```
Update SectionItem to handle clicks for second-level drill-down.

When a section item is clicked:
1. If item has linked_workflow_id, navigate to that workflow
2. If item has linked detail canvas, navigate there
3. Otherwise, show item detail panel

This enables: BMC → Section → Item → Workflow

Example: Click "Email Sequences" in Sales → See the email automation workflow
```

### **10.6 Canvas Type Router**

**Prompt for Kiro:**
```
Create a canvas router component at src/components/canvas/CanvasRouter.tsx

Based on canvas type, renders the appropriate view:
- type: 'bmc' → BMCCanvas
- type: 'workflow' → WorkflowCanvas  
- type: 'section' → SectionDetailCanvas (optional, simplified view)
- type: 'detail' → DetailCanvas (optional, for item details)

This component reads currentCanvasId from navigation hook and fetches the canvas data.
```

### **Checkpoint 10**
- [ ] Double-click section → drills into workflow
- [ ] Breadcrumbs show navigation path
- [ ] Back button returns to previous level
- [ ] Workflow canvas renders inside drill-down
- [ ] Click item → drill into item workflow (if linked)
- [ ] Navigation state persists in URL (optional)

---


---

## **Phase 11 Correction: Entities Are Moved BY Workflows**

### **The Correct Causality**

```
REAL WORLD                    STITCH                         CANVAS
─────────────────────────────────────────────────────────────────────

Monica clicks               →  Webhook fires              →  Entity appears
LinkedIn ad                    (ad platform reports)         on "LinkedIn Ad" node

Monica fills                →  Form handler runs          →  Entity moves to
registration form              (validates, stores)           "Demo Registration" node

Monica attends demo         →  Calendar webhook fires     →  Entity moves to  
                               (Zoom/Calendly reports)       "Demo Completed" node

Monica starts trial         →  Payment webhook fires      →  Entity moves to
                               (Stripe reports)              "Trial" node

Monica upgrades             →  Subscription webhook       →  Entity moves to
                               (Stripe reports)              "Paid" node
```

**The pattern:**
1. Real person does something in the real world
2. Some external system detects it (ad platform, form, payment processor, calendar)
3. That system triggers a Stitch workflow (via webhook)
4. The workflow does business logic (update CRM, send email, etc.)
5. When workflow completes, entity moves to the next node

**Entity movement is a SIDE EFFECT of workflow completion, not the trigger.**

### **Revised Data Model**

```typescript
interface WorkflowNode {
  id: string
  type: 'worker' | 'ux' | 'logic' | 'splitter' | 'collector'
  data: {
    // ... existing fields
    
    // Entity movement configuration
    entityMovement?: {
      onComplete: 'move_to_target' | 'stay' | 'conditional'
      targetNodeId?: string        // Where entity goes on success
      failureNodeId?: string       // Where entity goes on failure
      condition?: string           // For conditional routing
    }
  }
}

interface WorkflowRun {
  id: string
  flow_id: string
  entity_id?: string              // Which entity triggered this run
  trigger: {
    type: 'webhook' | 'manual' | 'schedule' | 'entity_action'
    source?: string               // "stripe", "calendly", "linkedin"
    payload?: any
  }
  // ... existing fields
}
```

### **Revised Flow**

```typescript
// When external webhook arrives
async function handleExternalWebhook(source: string, payload: any) {
  // 1. Find or create entity
  const entity = await findOrCreateEntity({
    email: payload.email,
    name: payload.name,
    metadata: { source }
  })
  
  // 2. Find the workflow to run based on source/event type
  const workflow = await findWorkflowForTrigger(source, payload.event_type)
  
  // 3. Start workflow run with entity attached
  const run = await startRun(workflow.id, {
    entity_id: entity.id,
    trigger: { type: 'webhook', source, payload }
  })
  
  // 4. Workflow runs... (existing logic)
  
  // 5. When workflow completes, move entity
  // This happens in the existing fireDownstream logic
}

// In the engine, when a node completes
async function onNodeComplete(runId: string, nodeId: string, output: any) {
  const run = await getRun(runId)
  const node = await getNode(nodeId)
  
  // Existing logic: fire downstream nodes...
  
  // NEW: If this is a terminal node or has entityMovement config
  if (node.data.entityMovement && run.entity_id) {
    const targetNode = determineTargetNode(node, output)
    await moveEntity(run.entity_id, targetNode)
  }
}
```

### **Why This Matters**

This is closer to reality:
- **Workflows are the business's RESPONSE to customer actions**
- **Entities represent the customer's POSITION in your business**
- **Movement happens when the business has processed the customer's action**

It also means:
- Multiple workflows can affect the same entity
- An entity might trigger workflows in parallel (signs up AND joins waitlist)
- Workflows can run without entities (internal operations)

## **Phase 11: Entity-Workflow Integration (Revised)**

### **Duration: 3-4 hours**

### **Core Concept**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           THE REAL WORLD                                │
│                                                                         │
│   Monica clicks    Monica fills    Monica attends    Monica pays       │
│   LinkedIn ad      demo form       Zoom call         via Stripe        │
│        │                │               │                │             │
└────────┼────────────────┼───────────────┼────────────────┼─────────────┘
         │                │               │                │
         ▼                ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SYSTEMS                                │
│                                                                         │
│   LinkedIn Ads     Typeform/        Calendly/         Stripe           │
│   Platform         Landing Page     Zoom              Webhooks         │
│        │                │               │                │             │
└────────┼────────────────┼───────────────┼────────────────┼─────────────┘
         │                │               │                │
         ▼                ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STITCH WEBHOOKS                                 │
│                                                                         │
│   /api/ingest/     /api/ingest/     /api/ingest/     /api/ingest/      │
│   linkedin         form             calendar          payment          │
│        │                │               │                │             │
└────────┼────────────────┼───────────────┼────────────────┼─────────────┘
         │                │               │                │
         ▼                ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STITCH WORKFLOWS                                │
│                                                                         │
│   "Lead Capture"   "Demo Request"   "Demo Complete"  "Payment Success" │
│   Workflow         Workflow         Workflow         Workflow          │
│        │                │               │                │             │
│   - Validate       - Create CRM     - Update CRM     - Activate sub   │
│   - Score lead     - Schedule call  - Send follow-up - Send welcome   │
│   - Add to CRM     - Send confirm   - Update score   - Provision      │
│        │                │               │                │             │
└────────┼────────────────┼───────────────┼────────────────┼─────────────┘
         │                │               │                │
         ▼                ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ENTITY MOVEMENT                                 │
│                                                                         │
│   Entity created   Entity moves     Entity moves     Entity moves      │
│   at "LinkedIn     to "Demo         to "Trial        to "Paid          │
│   Ad" node         Scheduled"       Start" node      Customer" node    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### **11.1 Webhook Ingestion Schema**

**Prompt for Kiro:**
```
Create the webhook ingestion system for external events.

Add table: stitch_webhook_configs
- id: uuid primary key
- canvas_id: uuid references stitch_flows(id)
- name: text (e.g., "LinkedIn Lead", "Stripe Payment")
- source: text (e.g., "linkedin", "stripe", "typeform", "calendly", "manual")
- endpoint_slug: text unique (generates URL: /api/ingest/{slug})
- secret: text (for webhook verification)
- workflow_id: uuid references stitch_flows(id) -- which workflow to trigger
- entry_edge_id: text -- which edge the entity enters on
- entity_mapping: jsonb -- how to extract entity data from payload
  {
    "name": "$.data.name",           // JSONPath to extract name
    "email": "$.data.email",         // JSONPath to extract email
    "metadata": {
      "source": "linkedin",
      "campaign": "$.data.utm_campaign"
    }
  }
- is_active: boolean default true
- created_at, updated_at

Add table: stitch_webhook_events (for logging/debugging)
- id: uuid primary key
- webhook_config_id: uuid references stitch_webhook_configs(id)
- received_at: timestamptz
- payload: jsonb
- entity_id: uuid references stitch_entities(id)
- workflow_run_id: uuid references stitch_runs(id)
- status: text ('processed', 'failed', 'ignored')
- error: text

Create migration file.
```

### **11.2 Webhook Ingestion Route**

**Prompt for Kiro:**
```
Create the universal webhook ingestion endpoint.

File: src/app/api/ingest/[slug]/route.ts

This single endpoint handles ALL external webhooks based on slug.

POST /api/ingest/{slug}

Logic:
1. Look up webhook_config by endpoint_slug
2. Verify webhook signature if secret is configured (check headers)
3. Log raw payload to stitch_webhook_events
4. Extract entity data using entity_mapping (JSONPath evaluation)
5. Find or create entity:
   - Search by email if provided
   - Create new if not found
   - Update metadata if found
6. Place entity on entry_edge:
   - Set entity.current_edge_id = config.entry_edge_id
   - Set entity.edge_progress = 0
   - Record journey event: { type: 'entered_edge', edge_id, source }
7. Start the configured workflow:
   - Create stitch_run with entity_id attached
   - Set trigger: { type: 'webhook', source: config.source, event_id }
8. Update webhook_event status to 'processed'
9. Return 200 OK (webhooks expect fast response)

Error handling:
- Invalid slug: 404
- Missing required fields: 400
- Processing error: 500, log to webhook_event.error

Use a library like 'jsonpath-plus' for JSONPath extraction.
```

### **11.3 Workflow-Entity Attachment**

**Prompt for Kiro:**
```
Update the workflow run system to track attached entities.

Update stitch_runs table (add columns):
- entity_id: uuid references stitch_entities(id)
- trigger_type: text ('webhook', 'manual', 'schedule', 'workflow')
- trigger_source: text (e.g., 'linkedin', 'stripe')
- trigger_event_id: uuid references stitch_webhook_events(id)

Update src/types/stitch.ts:

interface StitchRun {
  id: string
  flow_id: string
  entity_id?: string
  trigger: {
    type: 'webhook' | 'manual' | 'schedule' | 'workflow'
    source?: string
    event_id?: string
    payload?: any
  }
  status: 'pending' | 'running' | 'waiting_ux' | 'completed' | 'failed'
  nodes: Record<string, NodeState>
  current_ux_node?: string
  created_at: string
  updated_at: string
}

Update startRun function in src/stitch/engine/runner.ts:
- Accept optional entity_id and trigger info
- Store in run record
```

### **11.4 Node-Level Entity Movement Config**

**Prompt for Kiro:**
```
Add entity movement configuration to workflow nodes.

Update node data types in src/types/stitch.ts:

interface WorkerNodeData {
  // ... existing fields
  
  entityMovement?: {
    // What to do with attached entity when this node completes
    onSuccess: 'advance' | 'stay' | 'jump' | 'complete'
    onFailure?: 'stay' | 'jump' | 'drop'
    
    // For 'jump' - specify exact destination
    successNodeId?: string
    failureNodeId?: string
    
    // For 'complete' - entity reaches end state
    completeAs?: 'customer' | 'churned'
  }
}

Default behavior if entityMovement not specified:
- Follow the edge to next node (standard flow)
- On failure: stay at current node

Special node types:
- Terminal nodes (no outgoing edges): auto-complete entity
- UX nodes: entity waits at node until human action
```

### **11.5 Entity Movement Engine**

**Prompt for Kiro:**
```
Create the entity movement engine at src/stitch/engine/entity-movement.ts

This handles moving entities when workflows progress.

Functions:

interface MovementResult {
  moved: boolean
  from: { type: 'node' | 'edge', id: string }
  to: { type: 'node' | 'edge', id: string }
  event: JourneyEvent
}

async function handleNodeCompletion(
  run: StitchRun,
  completedNodeId: string,
  nodeOutput: any,
  success: boolean
): Promise<MovementResult | null> {
  // 1. Check if run has attached entity
  if (!run.entity_id) return null
  
  // 2. Get the completed node's movement config
  const node = await getNode(run.flow_id, completedNodeId)
  const movement = node.data.entityMovement || { onSuccess: 'advance' }
  
  // 3. Determine destination
  let destinationNodeId: string
  
  if (success) {
    switch (movement.onSuccess) {
      case 'advance':
        // Follow outgoing edge to next node
        destinationNodeId = await getNextNode(run.flow_id, completedNodeId)
        break
      case 'jump':
        destinationNodeId = movement.successNodeId
        break
      case 'stay':
        return null // Entity doesn't move
      case 'complete':
        return await completeEntityJourney(run.entity_id, movement.completeAs)
    }
  } else {
    // Handle failure
    switch (movement.onFailure || 'stay') {
      case 'stay':
        return null
      case 'jump':
        destinationNodeId = movement.failureNodeId
        break
      case 'drop':
        return await dropEntity(run.entity_id)
    }
  }
  
  // 4. Find the edge between current and destination
  const edge = await getEdgeBetween(run.flow_id, completedNodeId, destinationNodeId)
  
  // 5. Start entity traveling on that edge
  return await startEntityTravel(run.entity_id, edge.id, destinationNodeId)
}

async function startEntityTravel(
  entityId: string,
  edgeId: string,
  destinationNodeId: string
): Promise<MovementResult> {
  const entity = await getEntity(entityId)
  const previousPosition = {
    type: entity.current_node_id ? 'node' : 'edge',
    id: entity.current_node_id || entity.current_edge_id
  }
  
  // Update entity to traveling state
  await updateEntity(entityId, {
    current_node_id: null,
    current_edge_id: edgeId,
    edge_progress: 0,
    destination_node_id: destinationNodeId
  })
  
  // Record journey event
  const event: JourneyEvent = {
    timestamp: new Date().toISOString(),
    type: 'started_edge',
    edge_id: edgeId,
    from_node_id: previousPosition.type === 'node' ? previousPosition.id : undefined
  }
  await appendJourneyEvent(entityId, event)
  
  // Update edge statistics
  await incrementEdgeStat(edgeId, 'currentlyTraveling')
  
  return {
    moved: true,
    from: previousPosition,
    to: { type: 'edge', id: edgeId },
    event
  }
}

async function arriveAtNode(
  entityId: string,
  nodeId: string
): Promise<MovementResult> {
  const entity = await getEntity(entityId)
  
  // Update entity to at-node state
  await updateEntity(entityId, {
    current_edge_id: null,
    edge_progress: null,
    destination_node_id: null,
    current_node_id: nodeId
  })
  
  // Record journey event
  const event: JourneyEvent = {
    timestamp: new Date().toISOString(),
    type: 'entered_node',
    node_id: nodeId,
    from_edge_id: entity.current_edge_id
  }
  await appendJourneyEvent(entityId, event)
  
  // Update edge statistics
  if (entity.current_edge_id) {
    await decrementEdgeStat(entity.current_edge_id, 'currentlyTraveling')
    await incrementEdgeStat(entity.current_edge_id, 'totalCompleted')
  }
  
  return {
    moved: true,
    from: { type: 'edge', id: entity.current_edge_id },
    to: { type: 'node', id: nodeId },
    event
  }
}

async function completeEntityJourney(
  entityId: string,
  completeAs: 'customer' | 'churned'
): Promise<MovementResult> {
  const entity = await getEntity(entityId)
  
  await updateEntity(entityId, {
    entity_type: completeAs,
    current_edge_id: null,
    edge_progress: null,
    completed_at: new Date().toISOString()
  })
  
  const event: JourneyEvent = {
    timestamp: new Date().toISOString(),
    type: 'completed',
    outcome: completeAs
  }
  await appendJourneyEvent(entityId, event)
  
  return {
    moved: true,
    from: { type: 'node', id: entity.current_node_id },
    to: { type: 'completed', id: completeAs },
    event
  }
}
```

### **11.6 Integrate with Workflow Engine**

**Prompt for Kiro:**
```
Update the workflow engine to trigger entity movement.

Modify src/stitch/engine/runner.ts:

In the fireDownstream function, after marking node complete:

import { handleNodeCompletion } from './entity-movement'

async function onNodeComplete(
  runId: string,
  nodeId: string,
  output: any,
  status: 'done' | 'error'
) {
  const run = await getRun(runId)
  
  // Existing logic: update node state
  await markNodeComplete(runId, nodeId, status, output)
  
  // NEW: Handle entity movement
  if (run.entity_id) {
    const movement = await handleNodeCompletion(
      run,
      nodeId,
      output,
      status === 'done'
    )
    
    if (movement) {
      // Broadcast entity movement to all clients
      await broadcastEntityMovement(run.entity_id, movement)
    }
  }
  
  // Existing logic: fire downstream nodes
  if (status === 'done') {
    await fireDownstream(runId, nodeId, output)
  }
}

The broadcastEntityMovement function uses Supabase realtime
to notify all connected clients that an entity moved.
```

### **11.7 Entity Travel Animation Trigger**

**Prompt for Kiro:**
```
Create client-side entity travel animation handler.

File: src/hooks/useEntityMovement.ts

This hook subscribes to entity movements and triggers animations.

import { useEffect } from 'react'
import { animate } from 'framer-motion'

interface UseEntityMovementProps {
  canvasId: string
  onEntityMove: (entityId: string, from: Position, to: Position) => void
}

export function useEntityMovement({ canvasId, onEntityMove }: UseEntityMovementProps) {
  useEffect(() => {
    // Subscribe to stitch_entities changes for this canvas
    const subscription = supabase
      .channel(`entities:${canvasId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stitch_entities',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        const entity = payload.new as StitchEntity
        const oldEntity = payload.old as StitchEntity
        
        // Detect movement
        if (entity.current_edge_id !== oldEntity.current_edge_id ||
            entity.current_node_id !== oldEntity.current_node_id) {
          handleEntityMovement(entity, oldEntity)
        }
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [canvasId])
  
  function handleEntityMovement(entity: StitchEntity, oldEntity: StitchEntity) {
    // Case 1: Started traveling on edge
    if (entity.current_edge_id && !oldEntity.current_edge_id) {
      animateEdgeTravel(entity.id, entity.current_edge_id, entity.destination_node_id)
    }
    
    // Case 2: Arrived at node (travel complete)
    if (entity.current_node_id && !oldEntity.current_node_id) {
      // Animation already completed, just update position
      onEntityMove(entity.id, 
        getEdgeEndPosition(oldEntity.current_edge_id),
        getNodePosition(entity.current_node_id)
      )
    }
  }
  
  async function animateEdgeTravel(
    entityId: string,
    edgeId: string,
    destinationNodeId: string
  ) {
    const edge = getEdgeElement(edgeId) // Get SVG path
    const duration = 2 // seconds
    
    await animate(0, 1, {
      duration,
      ease: 'easeInOut',
      onUpdate: (progress) => {
        const point = getPointAlongEdge(edge, progress)
        updateEntityVisualPosition(entityId, point)
      },
      onComplete: () => {
        // Entity has visually arrived
        // DB update (arriveAtNode) may have already happened or will happen
      }
    })
  }
}
```

### **11.8 Webhook Configuration UI**

**Prompt for Kiro:**
```
Create a UI for managing webhook configurations.

File: src/app/canvas/[canvasId]/webhooks/page.tsx

This page shows all webhook configs for a canvas and allows creating new ones.

Features:
- List all webhook configs with:
  - Name
  - Source (icon for linkedin, stripe, etc.)
  - Generated endpoint URL (with copy button)
  - Linked workflow
  - Entry edge
  - Active/inactive toggle
  - Recent events count

- Create new webhook:
  - Name input
  - Source dropdown (linkedin, stripe, typeform, calendly, zapier, custom)
  - Select workflow from dropdown
  - Select entry edge from canvas visualization
  - Entity mapping builder:
    - Name field: JSONPath input
    - Email field: JSONPath input
    - Custom metadata fields
  - Generate endpoint button
  
- View recent events:
  - Click webhook to see recent stitch_webhook_events
  - Show payload, entity created, workflow run status

- Test webhook:
  - Send test payload button
  - See result immediately

Style with dark theme, consistent with rest of app.
```

### **11.9 Source-Specific Webhook Adapters**

**Prompt for Kiro:**
```
Create adapters for common webhook sources.

File: src/stitch/webhooks/adapters/index.ts

Each adapter knows how to:
1. Verify the webhook signature (if applicable)
2. Extract standard entity fields from source-specific payload
3. Normalize the data

interface WebhookAdapter {
  source: string
  verifySignature(payload: any, headers: Headers, secret: string): boolean
  extractEntity(payload: any): {
    name?: string
    email?: string
    metadata: Record<string, any>
  }
  getEventType(payload: any): string
}

Create adapters for:

src/stitch/webhooks/adapters/stripe.ts
- Verify: Stripe signature verification
- Extract: customer.email, customer.name from various event types
- Events: checkout.session.completed, customer.subscription.created, etc.

src/stitch/webhooks/adapters/typeform.ts
- Verify: Typeform signature
- Extract: answers to find email/name fields
- Events: form_response

src/stitch/webhooks/adapters/calendly.ts
- Verify: Calendly signature
- Extract: invitee.email, invitee.name
- Events: invitee.created, invitee.canceled

src/stitch/webhooks/adapters/linkedin.ts
- Note: LinkedIn Lead Gen Forms use their own API, not webhooks
- This would be for Zapier/Make integrations that forward LinkedIn data
- Extract from Zapier payload format

src/stitch/webhooks/adapters/generic.ts
- No verification (or basic token)
- Uses JSONPath mapping from config
- Fallback for any source

In the ingestion route, select adapter based on config.source.
```

### **11.10 Demo: Complete Journey Workflow**

**Prompt for Kiro:**
```
Create a complete demo that shows entity traveling through business.

Seed data for "Monica's Journey":

1. Create webhook config: "LinkedIn Lead Capture"
   - source: 'linkedin'
   - workflow_id: (lead-capture-workflow)
   - entry_edge_id: 'edge-linkedin-to-demo'
   
2. Create workflow: "Lead Capture"
   Nodes:
   - "Validate Lead" (Worker) → checks email format
     - entityMovement: { onSuccess: 'advance', onFailure: 'drop' }
   - "Score Lead" (Worker) → AI scoring
     - entityMovement: { onSuccess: 'advance' }
   - "Add to CRM" (Worker) → Supabase insert
     - entityMovement: { onSuccess: 'advance' }
   - "Send Welcome Email" (Worker) → email service
     - entityMovement: { onSuccess: 'advance' }
   - "Complete" (terminal)
     - entityMovement: { onSuccess: 'complete', completeAs: 'customer' }
   
   After workflow: Entity moves from LinkedIn node → Demo Registration node

3. Create workflow: "Demo Scheduling"
   - Triggered by Calendly webhook
   - Moves entity from Demo Registration → Demo Scheduled

4. Create workflow: "Post-Demo Follow-up"  
   - Triggered by Calendly "meeting ended" or manual
   - Moves entity from Demo Scheduled → Trial or Churned

5. Seed Monica as existing customer who completed journey:
   - journey: full history of all movements
   - current_node_id: "paying-customer"
   - entity_type: "customer"

6. Seed Ross as lead currently in demo:
   - journey: linkedin → demo-registration
   - current_node_id: "demo-scheduled"
   - entity_type: "lead"

7. Seed Rachel as brand new lead:
   - journey: just started
   - current_edge_id: "edge-linkedin-to-demo"
   - edge_progress: 0.3
   - entity_type: "lead"

Create test script that simulates webhook arrival:
POST /api/ingest/linkedin-lead with test payload
→ Watch entity appear and workflow run
→ Watch entity travel across canvas
```

### **11.11 Manual Entity Movement (For Demo)**

**Prompt for Kiro:**
```
Create manual controls for moving entities (useful for demo/testing).

File: src/app/api/stitch/entity/move/route.ts

POST body:
{
  entity_id: string,
  target_node_id: string,
  event_note?: string
}

This bypasses workflow and directly moves entity.
Useful for:
- Demo purposes
- Manual intervention
- Testing

Also add to Entity panel UI:
- "Move to..." dropdown
- Select any node in canvas
- Click to move entity there

This helps during demo recording when you want to show movement
without waiting for actual workflows.
```

---

### **Checkpoint 11 (Revised)**

- [ ] Webhook configs table created
- [ ] Webhook ingestion route working
- [ ] Source adapters for Stripe, Typeform, Calendly
- [ ] Entity created on webhook arrival
- [ ] Workflow starts with entity attached
- [ ] Workflow completion triggers entity movement
- [ ] Entity travel animation works (framer-motion)
- [ ] Real-time sync across clients
- [ ] Webhook management UI
- [ ] Demo journey seeded and working
- [ ] Manual move for demo purposes

---

### **Testing the Full Flow**

```bash
# 1. Start the app
npm run dev

# 2. Open canvas in browser - see Monica at "Paying Customer", Ross at "Demo Scheduled"

# 3. Simulate new lead from LinkedIn (in another terminal)
curl -X POST http://localhost:3000/api/ingest/linkedin-lead \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Phoebe Buffay",
      "email": "phoebe@example.com",
      "utm_campaign": "q4-2024"
    }
  }'

# 4. Watch browser:
#    - New entity "Phoebe" appears on LinkedIn Ad node
#    - Workflow "Lead Capture" starts running
#    - Nodes light up as they complete
#    - When workflow finishes, Phoebe travels along edge
#    - Phoebe arrives at Demo Registration node

# 5. Simulate Calendly webhook (Phoebe scheduled demo)
curl -X POST http://localhost:3000/api/ingest/calendly-invite \
  -H "Content-Type: application/json" \
  -d '{
    "event": "invitee.created",
    "payload": {
      "invitee": {
        "email": "phoebe@example.com",
        "name": "Phoebe Buffay"
      }
    }
  }'

# 6. Watch: Phoebe travels from Demo Registration → Demo Scheduled
```

---

This is the complete Phase 11. The key insight is that **the business model canvas becomes a real-time dashboard of customer movement**, driven by actual business events coming through webhooks. 

Every entity on the canvas represents a real person. Every movement represents a real business event. The canvas isn't a planning tool anymore — it's a live view of the business operating.

---

You're right. Let me rewrite Phase 12 with clear separation and correct architecture.

---

## **Phase 12: Media Library & Content Workflows (Revised)**

### **Duration: 3-4 hours**

### **Core Concept**

Two separate systems:

1. **Media Library** — A standalone asset storage system. Any workflow can read from or write to it. Assets are NOT tied to specific canvases.

2. **Content Workflows** — Example workflows that USE the media library. Wireframe generation is one such workflow.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MEDIA LIBRARY                                   │
│                    (Supabase Storage: stitch-assets)                    │
│                                                                         │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│   │ Images  │  │ Videos  │  │ Audio   │  │ Styles  │  │  Docs   │     │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌───────────────────┐
        │ Wireframe Workflow│   │ Video Factory     │
        │                   │   │                   │
        │ Script → Split →  │   │ Wireframes →      │
        │ Generate Images   │   │ Animate → Voice → │
        │       ↓           │   │ Assemble          │
        │ WRITES to Library │   │ READS from Library│
        └───────────────────┘   └───────────────────┘
```

---

## **Part 12A: Media Library System**

### **12A.1 Supabase Storage Setup**

**Prompt for Kiro:**
```
Set up Supabase Storage bucket for media assets.

Manual step in Supabase Dashboard:
1. Go to Storage
2. Create new bucket: "stitch-assets"
3. Make it public (for easy URL access) OR set up signed URLs
4. Set file size limit: 50MB
5. Allowed MIME types: image/*, video/*, audio/*

Then create RLS policies:

-- Allow authenticated users to upload
CREATE POLICY "Users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stitch-assets');

-- Allow authenticated users to read all assets
CREATE POLICY "Users can read assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'stitch-assets');

-- Allow users to delete their own assets
CREATE POLICY "Users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stitch-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### **12A.2 Media Library Database Schema**

**Prompt for Kiro:**
```
Create media library table for asset metadata.

File: supabase/migrations/XXX_add_media_library.sql

-- Media assets (metadata only, files in Supabase Storage)
CREATE TABLE stitch_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name text NOT NULL,
  description text,
  
  -- Type categorization
  media_type text NOT NULL CHECK (media_type IN (
    'image', 'wireframe', 'video', 'audio', 'style_reference', 'document'
  )),
  
  -- Storage references
  storage_path text NOT NULL,        -- Path in stitch-assets bucket
  url text NOT NULL,                  -- Public URL or signed URL
  thumbnail_path text,                -- For videos/large images
  thumbnail_url text,
  
  -- Technical metadata
  file_size integer,                  -- Bytes
  mime_type text,
  duration_seconds numeric,           -- For video/audio
  dimensions jsonb,                   -- { width, height } for images/video
  
  -- Creative metadata
  metadata jsonb DEFAULT '{}',        -- Flexible: prompt, seed, model, scene_index, etc.
  tags text[] DEFAULT '{}',           -- For searchability
  
  -- Relationships (all optional - assets are independent)
  style_reference_id uuid REFERENCES stitch_media(id), -- Which style was used
  source_image_id uuid REFERENCES stitch_media(id),    -- For image-to-video
  
  -- Ownership
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_media_type ON stitch_media(media_type);
CREATE INDEX idx_media_user ON stitch_media(user_id);
CREATE INDEX idx_media_tags ON stitch_media USING GIN(tags);

-- Full-text search on name and description
CREATE INDEX idx_media_search ON stitch_media 
USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Enable RLS
ALTER TABLE stitch_media ENABLE ROW LEVEL SECURITY;

-- Users can see all media (shared library)
CREATE POLICY "Users can view all media"
ON stitch_media FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own media
CREATE POLICY "Users can insert media"
ON stitch_media FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own media
CREATE POLICY "Users can update own media"
ON stitch_media FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own media
CREATE POLICY "Users can delete own media"
ON stitch_media FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### **12A.3 Media Library TypeScript Types**

**Prompt for Kiro:**
```
Create types for the media library.

File: src/types/media.ts

export type MediaType = 
  | 'image' 
  | 'wireframe' 
  | 'video' 
  | 'audio' 
  | 'style_reference' 
  | 'document';

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaMetadata {
  // Generation metadata
  prompt?: string;
  negative_prompt?: string;
  seed?: number;
  model?: string;
  
  // Organizational
  scene_index?: number;
  project_name?: string;
  
  // For style references
  prompt_prefix?: string;
  
  // For audio
  voice_id?: string;
  text?: string;
  
  // Extensible
  [key: string]: any;
}

export interface StitchMedia {
  id: string;
  name: string;
  description?: string;
  media_type: MediaType;
  
  // Storage
  storage_path: string;
  url: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  
  // Technical
  file_size?: number;
  mime_type?: string;
  duration_seconds?: number;
  dimensions?: MediaDimensions;
  
  // Creative
  metadata: MediaMetadata;
  tags: string[];
  
  // Relationships
  style_reference_id?: string;
  source_image_id?: string;
  
  // Ownership
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface MediaUploadInput {
  file: File;
  name: string;
  description?: string;
  media_type: MediaType;
  metadata?: MediaMetadata;
  tags?: string[];
}

export interface MediaFilter {
  media_type?: MediaType;
  tags?: string[];
  search?: string;
  user_id?: string;
}
```

### **12A.4 Media Library Service**

**Prompt for Kiro:**
```
Create the media library service for CRUD operations.

File: src/lib/media/media-service.ts

import { supabase } from '@/lib/supabase';
import { StitchMedia, MediaUploadInput, MediaFilter, MediaType } from '@/types/media';

const BUCKET = 'stitch-assets';

/**
 * Upload a file to storage and create metadata record
 */
export async function uploadMedia(input: MediaUploadInput): Promise<StitchMedia> {
  const { file, name, description, media_type, metadata = {}, tags = [] } = input;
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Generate storage path: {user_id}/{type}/{timestamp}_{filename}
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${user.id}/${media_type}/${timestamp}_${safeName}`;
  
  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false
    });
  
  if (uploadError) throw uploadError;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  
  // Get dimensions for images/videos
  let dimensions: { width: number; height: number } | undefined;
  if (file.type.startsWith('image/')) {
    dimensions = await getImageDimensions(file);
  }
  
  // Create metadata record
  const { data: media, error: insertError } = await supabase
    .from('stitch_media')
    .insert({
      name,
      description,
      media_type,
      storage_path: storagePath,
      url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      dimensions,
      metadata,
      tags,
      user_id: user.id
    })
    .select()
    .single();
  
  if (insertError) throw insertError;
  return media;
}

/**
 * Upload from URL (for AI-generated content)
 */
export async function uploadFromUrl(
  sourceUrl: string,
  name: string,
  media_type: MediaType,
  metadata?: MediaMetadata
): Promise<StitchMedia> {
  // Fetch the file
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  const file = new File([blob], name, { type: blob.type });
  
  return uploadMedia({
    file,
    name,
    media_type,
    metadata
  });
}

/**
 * List media with filters
 */
export async function listMedia(filter: MediaFilter = {}): Promise<StitchMedia[]> {
  let query = supabase
    .from('stitch_media')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filter.media_type) {
    query = query.eq('media_type', filter.media_type);
  }
  
  if (filter.tags && filter.tags.length > 0) {
    query = query.overlaps('tags', filter.tags);
  }
  
  if (filter.search) {
    query = query.textSearch('name', filter.search, { type: 'websearch' });
  }
  
  if (filter.user_id) {
    query = query.eq('user_id', filter.user_id);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get single media item
 */
export async function getMedia(id: string): Promise<StitchMedia | null> {
  const { data, error } = await supabase
    .from('stitch_media')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update media metadata
 */
export async function updateMedia(
  id: string, 
  updates: Partial<Pick<StitchMedia, 'name' | 'description' | 'metadata' | 'tags'>>
): Promise<StitchMedia> {
  const { data, error } = await supabase
    .from('stitch_media')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete media (storage file + metadata)
 */
export async function deleteMedia(id: string): Promise<void> {
  // Get the media to find storage path
  const media = await getMedia(id);
  if (!media) throw new Error('Media not found');
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([media.storage_path]);
  
  if (storageError) console.warn('Storage delete failed:', storageError);
  
  // Delete thumbnail if exists
  if (media.thumbnail_path) {
    await supabase.storage.from(BUCKET).remove([media.thumbnail_path]);
  }
  
  // Delete metadata record
  const { error: dbError } = await supabase
    .from('stitch_media')
    .delete()
    .eq('id', id);
  
  if (dbError) throw dbError;
}

/**
 * Generate signed download URL (for private buckets)
 */
export async function getDownloadUrl(id: string): Promise<string> {
  const media = await getMedia(id);
  if (!media) throw new Error('Media not found');
  
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(media.storage_path, 3600); // 1 hour expiry
  
  if (error) throw error;
  return data.signedUrl;
}

// Helper: Get image dimensions
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

### **12A.5 Media Library UI**

**Prompt for Kiro:**
```
Create the media library page with upload/browse/download.

File: src/app/library/page.tsx

Features:

1. HEADER
   - Title: "Media Library"
   - Upload button (opens upload modal)
   - View toggle: Grid / List

2. FILTERS (sidebar or top bar)
   - Type dropdown: All, Images, Wireframes, Videos, Audio, Style References
   - Search input (searches name, description)
   - Tags filter (multi-select)
   - Sort: Newest, Oldest, Name A-Z

3. GRID VIEW
   - Thumbnail cards
   - Hover shows: name, type badge, duration (if video/audio)
   - Click opens preview modal

4. LIST VIEW
   - Table with columns: Thumbnail, Name, Type, Size, Created, Actions
   - Actions: Preview, Download, Copy URL, Delete

5. UPLOAD MODAL
   - Drag-and-drop zone
   - Or click to select files
   - Multiple file upload support
   - For each file:
     - Name input (pre-filled from filename)
     - Type dropdown (auto-detected from MIME)
     - Description textarea
     - Tags input (comma-separated or chips)
   - Upload progress bar
   - Success/error feedback

6. PREVIEW MODAL
   - Large preview (image/video player/audio player)
   - Metadata display:
     - Dimensions, file size, duration
     - Creation date
     - Tags
     - Generation metadata (prompt, model, etc.)
   - Actions:
     - Download button
     - Copy URL button
     - Edit metadata button
     - Delete button (with confirmation)

Style: Dark theme, consistent with canvas.
Use shadcn/ui components: Dialog, Button, Input, Select, Tabs.
```

### **12A.6 Media Library Components**

**Prompt for Kiro:**
```
Create reusable media library components.

src/components/media/MediaGrid.tsx
- Grid of MediaCard components
- Responsive: 4 cols on desktop, 2 on tablet, 1 on mobile
- Loading skeleton state
- Empty state with upload prompt

src/components/media/MediaCard.tsx
- Thumbnail with aspect ratio preservation
- Type badge (top-left corner)
- Duration badge for video/audio (bottom-right)
- Name below thumbnail (truncated)
- Hover overlay with quick actions

src/components/media/MediaUploader.tsx
- Drag-and-drop zone
- File input fallback
- Shows upload queue with progress
- Handles multiple files
- Emits onUploadComplete with media array

src/components/media/MediaPreview.tsx
- Image: zoomable view
- Video: video player with controls
- Audio: audio player with waveform (optional)
- Document: preview or download link

src/components/media/MediaPicker.tsx
- Embeddable component for selecting media in workflows
- Grid view with selection state
- Filter by type
- Returns selected media item(s)
- Props: mediaType filter, multiple selection, onSelect callback

This MediaPicker will be used by workflow nodes that need to select assets.
```

### **12A.7 useMediaLibrary Hook**

**Prompt for Kiro:**
```
Create a hook for media library operations.

File: src/hooks/useMediaLibrary.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  listMedia, 
  uploadMedia, 
  deleteMedia, 
  updateMedia,
  getDownloadUrl 
} from '@/lib/media/media-service';
import { StitchMedia, MediaFilter, MediaUploadInput } from '@/types/media';

interface UseMediaLibraryResult {
  media: StitchMedia[];
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  upload: (input: MediaUploadInput) => Promise<StitchMedia>;
  remove: (id: string) => Promise<void>;
  update: (id: string, updates: Partial<StitchMedia>) => Promise<void>;
  download: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  
  // Filter state
  filter: MediaFilter;
  setFilter: (filter: MediaFilter) => void;
}

export function useMediaLibrary(initialFilter: MediaFilter = {}): UseMediaLibraryResult {
  const [media, setMedia] = useState<StitchMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<MediaFilter>(initialFilter);
  
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listMedia(filter);
      setMedia(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  const upload = async (input: MediaUploadInput) => {
    const newMedia = await uploadMedia(input);
    setMedia(prev => [newMedia, ...prev]);
    return newMedia;
  };
  
  const remove = async (id: string) => {
    await deleteMedia(id);
    setMedia(prev => prev.filter(m => m.id !== id));
  };
  
  const update = async (id: string, updates: Partial<StitchMedia>) => {
    const updated = await updateMedia(id, updates);
    setMedia(prev => prev.map(m => m.id === id ? updated : m));
  };
  
  const download = async (id: string) => {
    const url = await getDownloadUrl(id);
    const link = document.createElement('a');
    link.href = url;
    link.download = media.find(m => m.id === id)?.name || 'download';
    link.click();
  };
  
  return {
    media,
    isLoading,
    error,
    upload,
    remove,
    update,
    download,
    refresh,
    filter,
    setFilter
  };
}
```

---

## **Part 12B: Media Library Worker Node**

### **12B.1 Media Select Node Type**

**Prompt for Kiro:**
```
Create a workflow node that selects from media library.

File: src/components/canvas/nodes/MediaSelectNode.tsx

This is a workflow node (used in workflow canvases, not BMC).

Node behavior:
- Type: 'media-select'
- When workflow reaches this node, shows MediaPicker panel
- User selects item from library
- Node outputs the selected media

Data:
- label: string
- mediaType?: MediaType filter (e.g., only show 'wireframe')
- allowMultiple?: boolean
- selectedMediaId?: string (persisted selection for re-runs)

Output:
{
  media_id: string,
  url: string,
  name: string,
  metadata: object
}

Visual:
- Thumbnail preview of selected item (if any)
- "Select from Library" button
- Click opens MediaPicker in side panel
```

### **12B.2 Media Library Worker**

**Prompt for Kiro:**
```
Create a worker that retrieves media from library.

File: src/stitch/workers/media-library.ts

This is an async worker that can be used in workflows.

Input options:

1. Direct ID lookup:
{
  mode: 'get',
  media_id: string
}

2. Search/filter:
{
  mode: 'search',
  media_type?: MediaType,
  tags?: string[],
  search?: string,
  limit?: number
}

3. Random selection (useful for variety):
{
  mode: 'random',
  media_type: MediaType,
  tags?: string[]
}

Output:
{
  media: StitchMedia | StitchMedia[],
  url: string | string[]
}

This worker is synchronous (just database lookup), no webhook needed.
Mark as done immediately.
```

---

## **Part 12C: Wireframe Generation Workflow**

### **12C.1 Wireframe Workflow Definition**

**Prompt for Kiro:**
```
Create the wireframe generation workflow as a reusable flow.

This workflow takes a script and generates consistent wireframes.
Output is saved to Media Library.

File: src/lib/seeds/wireframe-workflow.ts

Flow: "Wireframe Generator"

[Script Input] (UX)
  - User pastes or types script with scene descriptions
  - Or receives from upstream node
     ↓
[Parse Scenes] (Worker)
  - Extracts individual scene descriptions
  - Output: { scenes: [{ index, description, duration }] }
     ↓
[Style Setup] (UX)
  - User describes visual style OR
  - Selects existing style reference from library
  - Fields: style prompt, art direction notes
     ↓
[Generate Style Reference] (Worker)
  - Uses style prompt to generate reference image
  - Saves to Media Library as type='style_reference'
  - Output: { style_reference_id, url }
     ↓
[Style Approval] (UX)
  - Shows generated style reference
  - User approves or regenerates
     ↓
[Scene Splitter] (Splitter)
  - Splits scenes array into parallel branches
     ↓
[Wireframe Generator ×N] (Worker, parallel)
  - Input: { scene_description, style_reference_id, scene_index }
  - Generates image using AI (Ideogram, DALL-E, etc.)
  - Saves to Media Library as type='wireframe'
  - Output: { wireframe_id, url }
     ↓
[Scene Collector] (Collector)
  - Waits for all wireframes
  - Output: { wireframes: [...] }
     ↓
[Wireframe Review] (UX)
  - Shows all wireframes in grid
  - User can regenerate individual frames
  - Approve to continue
     ↓
[Complete]
  - Output: { wireframe_ids: [...], style_reference_id }
  - These IDs can be used by downstream workflows (Video Factory)

Create seed function that inserts this workflow.
```

### **12C.2 Wireframe Generator Worker**

**Prompt for Kiro:**
```
Create the wireframe image generation worker.

File: src/stitch/workers/wireframe-generator.ts

This worker generates a single wireframe image.

Input:
{
  scene_description: string,     // What to draw
  style_reference_id?: string,   // For consistency
  scene_index: number,           // For naming
  project_name?: string          // For organization
}

Process:

1. Build prompt:
   - If style_reference_id: fetch from Media Library, prepend prompt_prefix
   - Add scene_description
   - Add quality modifiers: "high quality, detailed, consistent style"

2. Call image generation API:
   
   Option A - Ideogram (recommended, has free tier):
   POST https://api.ideogram.ai/generate
   
   Option B - OpenAI DALL-E:
   POST https://api.openai.com/v1/images/generations
   
   Option C - Mock for demo:
   Return placeholder or pre-uploaded image
   
3. Download generated image

4. Upload to Media Library:
   - media_type: 'wireframe'
   - name: `${project_name}_scene_${scene_index}`
   - metadata: { prompt, scene_index, style_reference_id }
   - tags: ['wireframe', 'ai-generated', project_name]

5. Return:
   {
     wireframe_id: string,
     url: string,
     thumbnail_url: string
   }

Create adapter pattern to switch between providers:

interface ImageGenerator {
  generate(prompt: string, options?: any): Promise<{ url: string }>;
}

class IdeogramGenerator implements ImageGenerator { ... }
class DallEGenerator implements ImageGenerator { ... }
class MockGenerator implements ImageGenerator { ... }
```

### **12C.3 Scene Parser Worker**

**Prompt for Kiro:**
```
Create worker that parses script into scenes.

File: src/stitch/workers/scene-parser.ts

Input:
{
  script: string,          // Full script text
  target_scene_count?: number  // Optional, AI will decide otherwise
}

Process:
- Use Claude to analyze script and extract scenes
- Each scene gets:
  - index (1-based)
  - description (visual description for image generation)
  - voiceover_text (narration for this scene)
  - duration_seconds (estimated)

Prompt to Claude:
```
Analyze this script and break it into scenes for video generation.

Script:
{script}

For each scene, provide:
1. A detailed visual description suitable for AI image generation (describe what should be VISIBLE)
2. The voiceover/narration text for this scene
3. Estimated duration in seconds

Return as JSON:
{
  "scenes": [
    {
      "index": 1,
      "visual_description": "...",
      "voiceover_text": "...",
      "duration_seconds": 5
    }
  ]
}
```

Output:
{
  scenes: Scene[],
  total_duration: number
}

This worker is synchronous (Claude responds fast).
```

---

## **Part 12D: Video Factory V2 (Uses Media Library)**

### **12D.1 Updated Video Factory Workflow**

**Prompt for Kiro:**
```
Create Video Factory V2 that uses Media Library.

File: src/lib/seeds/video-factory-v2.ts

This workflow assumes wireframes already exist in Media Library
(created by Wireframe Generator workflow).

Flow: "Video Factory V2"

[Select Wireframes] (UX + MediaPicker)
  - User selects wireframe images from Media Library
  - Filter: media_type='wireframe'
  - Multiple selection enabled
  - Output: { wireframe_ids: [...] }
     ↓
[Load Wireframes] (Worker)
  - Fetches full metadata for selected wireframes
  - Output: { wireframes: [{ id, url, metadata }] }
     ↓
[Voice Settings] (UX)
  - User selects voice (ElevenLabs voice ID or preset)
  - User can edit voiceover text (from wireframe metadata)
  - Output: { voice_id, scenes: [{ text, wireframe_id }] }
     ↓
[Scene Splitter] (Splitter)
     ↓
[Per Scene - Parallel]:
  
  [Generate Video] (Worker)
    - Input: wireframe image URL, motion prompt
    - Uses image-to-video API (Runway, Pika, Kling)
    - Saves to Media Library as type='video'
    - Output: { video_id, url }
       ↓
  [Generate Voice] (Worker)
    - Input: voiceover_text, voice_id
    - Uses ElevenLabs
    - Saves to Media Library as type='audio'
    - Output: { audio_id, url }
       ↓
  [Mix Scene] (Worker)
    - Input: video_url, audio_url
    - Uses Shotstack or FFmpeg
    - Saves to Media Library
    - Output: { scene_video_id, url }
     ↓
[Scene Collector] (Collector)
  - Output: { scene_videos: [...] }
     ↓
[Music Selection] (UX + MediaPicker)
  - User selects background music from library
  - OR generates new with AI
  - Optional step
     ↓
[Final Assembly] (Worker)
  - Concatenates all scene videos
  - Overlays music
  - Uses Shotstack
  - Saves to Media Library
  - Output: { final_video_id, url }
     ↓
[Final Review] (UX)
  - Video player preview
  - Download button
  - Regenerate option
     ↓
[Complete]
```

### **12D.2 Image-to-Video Worker**

**Prompt for Kiro:**
```
Create image-to-video worker.

File: src/stitch/workers/image-to-video.ts

Input:
{
  image_url: string,           // Source image (wireframe)
  image_id?: string,           // Media Library ID
  motion_prompt?: string,      // "Camera slowly pans right"
  duration_seconds: number     // Target duration
}

Process:

1. Call image-to-video API:

   Option A - Runway Gen-3:
   POST https://api.runwayml.com/v1/image-to-video
   - Supports motion prompts
   - High quality
   
   Option B - Pika:
   POST https://api.pika.art/v1/generate
   - Good free tier
   
   Option C - Kling:
   Via their API
   
   Option D - Mock:
   Return placeholder video URL

2. Poll for completion (these APIs are async)

3. Download result

4. Upload to Media Library:
   - media_type: 'video'
   - source_image_id: image_id
   - metadata: { motion_prompt, duration_seconds, model }

5. Return:
   {
     video_id: string,
     url: string,
     duration_seconds: number
   }

Implement with adapter pattern for provider switching.
```

---

## **Checkpoint 12**

**Part A - Media Library:**
- [ ] Supabase Storage bucket "stitch-assets" created
- [ ] stitch_media table with correct schema (no canvas_id)
- [ ] Media service with upload/download/list/delete
- [ ] Media Library page (/library)
- [ ] Upload modal with drag-and-drop
- [ ] Preview modal with download
- [ ] Grid and list views
- [ ] Filtering by type, tags, search

**Part B - Media Nodes:**
- [ ] MediaSelectNode for workflows
- [ ] MediaPicker component
- [ ] Media Library worker

**Part C - Wireframe Workflow:**
- [ ] Scene parser worker (Claude)
- [ ] Wireframe generator worker (image API)
- [ ] Complete wireframe workflow seeded

**Part D - Video Factory V2:**
- [ ] Image-to-video worker
- [ ] Updated Video Factory workflow
- [ ] Workflow uses Media Library for all assets

---

## **Key Architecture Decisions**

1. **Media is independent** — No canvas_id. Assets are reusable across entire system.

2. **Supabase Storage** — Actual files in bucket, metadata in table. Proper upload/download.

3. **Workflows write to library** — Generation workflows save output to Media Library automatically.

4. **Workflows read from library** — Assembly workflows pick from existing assets.

5. **Adapter pattern** — All AI services (image gen, video gen) use adapters for easy provider switching.


---

## **Phase 13: Production Side Details**

### **Duration: 2 hours**

### **Objective**
Make the production side (Data, People, Code, Integrations) functional and visually distinct.

### **13.1 Integrations Section Items**

**Prompt for Kiro:**
```
Create special items for the Integrations section.

Each integration item shows:
- API name (e.g., "Claude API", "Supabase", "Shotstack")
- Status: connected/disconnected/error
- Last ping time
- Usage indicator (optional)

Create: src/components/canvas/items/IntegrationItem.tsx

Add a health check function that pings each integration and updates status.
This can be a simple API route that checks if API keys are configured.
```

### **13.2 People Section Items**

**Prompt for Kiro:**
```
Create items for the People section.

Show team members and AI agents:
- Avatar
- Name
- Role (e.g., "Founder", "AI Assistant", "Sales Agent")
- Status: online/offline/busy
- Type badge: Human 👤 or AI 🤖

For AI agents, these could link to agent configurations or personas.

Create: src/components/canvas/items/PersonItem.tsx
```

### **13.3 Code Section Items**

**Prompt for Kiro:**
```
Create items for the Code section.

Show deployments and code assets:
- Name (e.g., "Landing Page", "API Server", "Webhook Handler")
- Status: deployed/building/failed
- Last deploy time
- Link to repo/deployment (optional)

Create: src/components/canvas/items/CodeItem.tsx
```

### **13.4 Data Section Items**

**Prompt for Kiro:**
```
Create items for the Data section.

Show data sources:
- Name (e.g., "Leads CRM", "Analytics", "Email List")
- Type icon (database, spreadsheet, chart)
- Record count (e.g., "1,234 leads")
- Last sync time
- Status indicator

Create: src/components/canvas/items/DataItem.tsx
```

### **Checkpoint 13**
- [ ] Integration items show API health status
- [ ] People items show team members and AI agents
- [ ] Code items show deployments
- [ ] Data items show data sources
- [ ] Production side feels distinct from customer side

---

## **Phase 14: Financial Section & Metrics**

### **Duration: 2 hours**

### **Objective**
Make Costs and Revenue sections show real (or simulated) metrics.

### **14.1 Costs Section**

**Prompt for Kiro:**
```
Create the Costs section visualization.

Show:
- Total monthly costs (simulated or calculated)
- Breakdown by category:
  - API costs (sum of integration usage)
  - Infrastructure costs
  - Team costs
- Warning indicator if costs exceed threshold
- Mini chart showing cost trend

Create: src/components/canvas/sections/CostsSection.tsx

For demo, use hardcoded but realistic numbers:
- API costs: $127/month
- Infrastructure: $50/month
- Total: $177/month
```

### **14.2 Revenue Section**

**Prompt for Kiro:**
```
Create the Revenue section visualization.

Show:
- MRR (Monthly Recurring Revenue)
- Number of paying customers
- Revenue breakdown by plan
- Mini chart showing revenue trend
- Growth indicator (up/down arrow with percentage)

Create: src/components/canvas/sections/RevenueSection.tsx

For demo, calculate from entities:
- Count entities with type='customer'
- Sum their LTV or monthly value
- Show growth as simulated trend
```

### **14.3 Entity-Based Calculations**

**Prompt for Kiro:**
```
Create a metrics calculation service at src/lib/metrics/calculations.ts

Functions:
- calculateTotalCAC(entities) -- sum of acquisition costs
- calculateTotalRevenue(entities) -- sum of customer revenue
- calculateMRR(entities) -- monthly recurring revenue
- calculateChurnRate(entities) -- percentage churned
- getCustomersByPlan(entities) -- breakdown by plan

These read from entity metadata (CAC, LTV, plan) and calculate business metrics.
```

### **Checkpoint 14**
- [ ] Costs section shows expenses
- [ ] Revenue section shows MRR and customer count
- [ ] Metrics calculated from entity data
- [ ] Mini charts render (can use recharts or simple SVG)

---

## **Phase 15: Polish & Frankenstein Aesthetic**

### **Duration: 3-4 hours**

### **Objective**
Make it look like the reference image - alive, electric, dramatic.

### **15.1 Glowing Effects**

**Prompt for Kiro:**
```
Add glowing effects throughout the UI.

CSS classes to create:
- .glow-border - glowing border for sections
- .glow-text - subtle glow on text
- .glow-path - animated glow for journey paths
- .pulse-glow - pulsing glow for active items

Color scheme:
- Production side: blue/purple glows (#4f46e5, #7c3aed)
- Customer side: cyan/green glows (#06b6d4, #10b981)  
- Financial: amber/gold glows (#f59e0b, #eab308)
- Entities: based on type (cyan for leads, green for customers)

Create: src/styles/glow-effects.css
Import in global styles.
```

### **15.2 Animation System**

**Prompt for Kiro:**
```
Create animation utilities at src/lib/animations.ts

Animations needed:
- Entity travel animation (smooth movement between sections)
- Path drawing animation (SVG stroke-dasharray animation)
- Node pulse animation (for running workers)
- Status change animation (fade/scale when status changes)
- Hover effects (subtle scale and glow increase)

Use Framer Motion for complex animations.
Use CSS animations for simple effects.
```

### **15.3 Dark Theme Refinement**

**Prompt for Kiro:**
```
Refine the dark theme for Frankenstein aesthetic.

Update tailwind.config.js with custom colors:
- background: deep dark blue (#0a0f1a)
- surface: slightly lighter (#111827)
- border: subtle glow (#1f2937 with box-shadow)
- text-primary: white with slight blue tint
- text-secondary: gray-400

Add texture or grid pattern to background (subtle).

Make it feel like a control room or lab.
```

### **15.4 Section Icons**

**Prompt for Kiro:**
```
Add distinct icons to each section header.

Marketing: megaphone or target
Sales: funnel
Offers: gift
Products: cube or package
Support: headphones or lifebuoy
Recommendations: heart or share
Data: database
People: users
Integrations: plug or api symbol
Code: code brackets
Costs: dollar-sign or credit-card
Revenue: trending-up or chart

Use lucide-react icons. Style them with section glow color.
```

### **15.5 "It's Alive!" Startup Animation**

**Prompt for Kiro:**
```
Create a startup animation for when the canvas first loads.

Sequence:
1. Black screen
2. Stitch logo fades in
3. "It's Alive!" text flickers (like electric sign)
4. Lightning crack effect
5. Canvas fades in with sections appearing one by one
6. Entities fade in at their positions
7. Journey paths draw themselves

Create: src/components/animations/StartupAnimation.tsx

Should only play once per session (use localStorage flag).
Can be skipped by clicking anywhere.
```

### **Checkpoint 15**
- [ ] Glowing effects applied throughout
- [ ] Animations feel smooth and alive
- [ ] Dark theme is consistent
- [ ] Section icons are visible
- [ ] Startup animation plays (optional but impressive)

---

## **Phase 16: Demo Flow & Script**

### **Duration: 2-3 hours**

### **Objective**
Create the complete demo experience for the 3-minute video.

### **16.1 Demo Script Implementation**

**Prompt for Kiro:**
```
Create a demo controller at src/lib/demo/demo-controller.ts

This automates the demo for recording:

async function runDemo() {
  // Phase 1: Show static BMC
  await showStaticBMC();
  await delay(3000);
  
  // Phase 2: Transform to Stitch
  await playTransformAnimation();
  await delay(2000);
  
  // Phase 3: Monica appears in Marketing
  await spawnEntity('monica');
  await delay(1000);
  
  // Phase 4: Trigger Marketing workflow
  await startWorkflow('marketing-capture', 'monica');
  await delay(5000); // Watch workflow run
  
  // Phase 5: Monica moves to Sales
  await moveEntity('monica', 'sales');
  await delay(2000);
  
  // Phase 6: Drill into Sales section
  await drillInto('sales');
  await delay(3000);
  
  // Phase 7: Show workflow running
  await startWorkflow('sales-demo', 'monica');
  await delay(5000);
  
  // Phase 8: Back to BMC, Monica in Offers
  await goBack();
  await moveEntity('monica', 'offers');
  await delay(2000);
  
  // Phase 9: Show multiple entities
  await spawnEntities(['ross', 'rachel']);
  await delay(3000);
  
  // Phase 10: Show Revenue updating
  await updateRevenue();
  await delay(2000);
}

Create controls: play, pause, restart, step-through.
```

### **16.2 Demo Workflows**

**Prompt for Kiro:**
```
Create simplified demo workflows that run quickly (for video recording).

Marketing Capture Workflow:
- Ad Click (instant)
- Form Submit (1 second delay)
- CRM Update (1 second delay)
- Complete → move to Sales

Sales Demo Workflow:
- Demo Scheduled (instant)
- AI Pitch Generated (2 seconds - fake it)
- Demo Completed (instant)
- Complete → move to Offers

These workflows should be visually impressive but not require real API calls.
Use setTimeout to simulate worker completion.
```

### **16.3 Keyboard Shortcuts for Recording**

**Prompt for Kiro:**
```
Add keyboard shortcuts for controlling the demo during recording.

Shortcuts:
- Space: play/pause demo
- R: restart demo
- N: next step (manual mode)
- B: go back (navigation)
- 1-9: jump to demo phase
- D: toggle debug overlay

Create: src/hooks/useDemoKeyboard.ts

Show a small indicator when demo mode is active.
```

### **Checkpoint 16**
- [ ] Demo controller implemented
- [ ] Demo workflows created and seeded
- [ ] Keyboard shortcuts working
- [ ] Full demo runs smoothly
- [ ] Ready to record

---

## **Phase 17: Submission Prep**

### **Duration: 2-3 hours**

### **Objective**
Prepare all submission materials.

### **17.1 Clean Up .kiro Folder**

**Prompt for Kiro:**
```
Review and clean up the .kiro folder for submission.

Ensure it contains:
- steering/stitch-principles.md (updated with BMC concepts)
- specs/ with all specs we created
- hooks/ with our automation hooks

The .kiro folder demonstrates our Kiro usage.
Make sure nothing is in .gitignore.

Add a README inside .kiro/ explaining what's in each folder.
```

### **17.2 Project README**

**Prompt for Kiro:**
```
Create a comprehensive README.md for the project.

Sections:
1. What is Stitch (the living BMC pitch)
2. Why it's different (not just workflows)
3. Features
   - BMC canvas with 12 sections
   - Entity tracking across sections
   - Drill-down navigation
   - Real-time updates
   - Frankenstein aesthetic
4. Tech stack
5. Architecture overview
6. Setup instructions
7. Demo instructions
8. Screenshots (placeholder links)
9. License (MIT)
10. Built for Kiroween Hackathon

Make it impressive. This is what judges see first.
```

### **17.3 Kiro Write-Up**

**Prompt for Kiro:**
```
Update the Kiro usage write-up with everything we did.

Document:
- Steering docs: How stitch-principles.md guided architecture
- Specs: All the specs we created and how they helped
- Vibe coding: BMC layout, animations, visual polish
- Hooks: Type generation, pre-commit quality
- Navigation pattern: How we evolved from workflow to BMC

Include specific examples and quotes from our process.
```

### **17.4 Deploy**

**Manual task:**
```
Deploy to Vercel:
1. Connect GitHub repo
2. Set environment variables
3. Deploy
4. Test on production URL
```

### **17.5 Record Video**

**Manual task:**
```
Record the 3-minute demo video:

Equipment:
- OBS or ScreenFlow
- Good microphone
- 1080p minimum

Script: Follow the pitch script from earlier
- Mix of demo automation and manual voiceover
- Show the BMC first, then workflows underneath
- End with "It's alive!"

Edit:
- Add the AI-generated intro (10-15 seconds)
- Add simple title cards
- Keep it under 3 minutes
```

### **17.6 Submit**

**Manual task:**
```
Submit to kiroween.devpost.com:

- Project name: Stitch
- Tagline: "A Living Business Model Canvas"
- Description: From write-up
- Video: YouTube link
- GitHub: Public repo link
- Demo URL: Vercel link
- Category: Frankenstein
- Bonus: Best Startup Project
```

### **Checkpoint 17**
- [ ] .kiro folder clean and complete
- [ ] README is comprehensive
- [ ] Write-up covers all Kiro features
- [ ] Deployed to Vercel
- [ ] Video recorded and uploaded
- [ ] Submitted on Devpost

---

## **Full Timeline Estimate**

| Phase | Hours | Cumulative |
|-------|-------|------------|
| 8. BMC Canvas Foundation | 4 | 4 |
| 9. Entity System | 4 | 8 |
| 10. Drill-Down Navigation | 4 | 12 |
| 11. Workflow-Entity Connection | 3 | 15 |
| 12. Video Library | 3 | 18 |
| 13. Production Side | 2 | 20 |
| 14. Financial Sections | 2 | 22 |
| 15. Polish & Aesthetic | 4 | 26 |
| 16. Demo Flow | 3 | 29 |
| 17. Submission | 3 | 32 |

**Total: ~32 hours of focused work**

With debugging and iteration buffer, plan for 40-45 hours.

---

## **Priority Order (If Time Runs Short)**

**Must Have (P0):**
1. BMC canvas with sections (Phase 8)
2. Entity visualization (Phase 9 - at least static)
3. One working drill-down (Phase 10 - simplified)
4. Dark theme with glowing effect (Phase 15 - partial)
5. Submission materials (Phase 17)

**Should Have (P1):**
1. Entity movement animation
2. Multiple drill-down levels
3. Video Library worker
4. Financial metrics

**Nice to Have (P2):**
1. Startup animation
2. Demo automation controller
3. Full production side details
4. Entity-workflow connection

---

Ready to start Phase 8?