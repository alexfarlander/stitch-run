# Seed Scripts

This directory contains seed scripts for populating the Stitch database with demo data and workflows.

## Available Seeds

1. **BMC Canvas** (`seed-bmc.ts`) - Creates the default Business Model Canvas
2. **Demo Journey** (`demo-journey.ts`) - Creates demo entities and lead capture workflow
3. **Wireframe Generation** (`wireframe-workflow.ts`) - Creates AI-powered wireframe generation workflow
4. **Video Factory V2** (`video-factory-v2.ts`) - Creates video production workflow from wireframes

## Demo Journey: Monica's Journey

The `demo-journey.ts` script creates a complete demo scenario showing entity movement through the BMC canvas.

### What It Creates

1. **BMC Item Nodes** (if they don't exist):
   - `node-linkedin-ad` (Marketing section)
   - `node-demo-form` (Sales section)
   - `node-trial-start` (Offers section)
   - `node-crm` (Data section)
   - `node-active-customer` (Paying Customers section)

2. **Lead Capture Workflow**:
   - A simple 3-node workflow: Validate → Score → CRM Sync
   - The CRM Sync node has entity movement configured to move entities to the Demo Form on success

3. **Webhook Configuration**:
   - Endpoint: `/api/webhooks/linkedin-lead`
   - Source: `linkedin`
   - Maps incoming LinkedIn lead data to entities
   - Triggers the Lead Capture workflow

4. **Demo Entities**:
   - **Monica G** - Completed the full journey, now an active customer
   - **Ross G** - Stuck in Sales (Demo Form stage)
   - **Rachel G** - Currently traveling on an edge (30% progress)

### Usage

#### Option 1: Command Line Script

```bash
npx tsx scripts/seed-demo-journey.ts
```

#### Option 2: API Endpoint

```bash
curl -X POST http://localhost:3000/api/seed/demo
```

Or visit `http://localhost:3000/api/seed/demo` in your browser and use POST.

#### Option 3: Programmatic

```typescript
import { seedDemoJourney } from '@/lib/seeds/demo-journey';

const result = await seedDemoJourney();
console.log(result);
```

### Prerequisites

1. The default BMC canvas must exist (run `npx tsx scripts/seed-bmc.ts` first)
2. Environment variables must be set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_BASE_URL` (defaults to http://localhost:3000)

### Testing the Webhook

After seeding, you can test the webhook by sending a POST request:

```bash
curl -X POST http://localhost:3000/api/webhooks/linkedin-lead \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Phoebe B",
      "email": "phoebe@example.com"
    },
    "source": "linkedin",
    "campaign": "q4-2024",
    "form_id": "lead-gen-form-1"
  }'
```

This will:
1. Create a new entity (Phoebe)
2. Place her on the `edge-marketing-entry` edge
3. Trigger the Lead Capture workflow
4. Move her through the workflow nodes
5. End up at the Demo Form node (via entity movement)

### Idempotency

The seed script is idempotent - it checks if data already exists before creating it:
- If the Lead Capture workflow exists, it reuses it
- If the webhook config exists, it reuses it
- If demo entities exist, it skips creating them
- BMC nodes are only added if they don't exist

You can safely run the script multiple times.

### Troubleshooting

**"Entry edge not found" error when testing webhook:**

The webhook configuration needs to reference an edge that exists in the workflow. If you get this error, update the webhook config:

```sql
-- Find the workflow ID
SELECT id, name FROM stitch_flows WHERE name = 'Lead Capture Logic';

-- Update the webhook config to use the first edge in the workflow
UPDATE stitch_webhook_configs 
SET entry_edge_id = 'e1' 
WHERE endpoint_slug = 'linkedin-lead';
```

### Cleanup

To remove the demo data and start fresh:

```sql
-- Remove demo entities
DELETE FROM stitch_entities WHERE email IN ('monica@example.com', 'ross@example.com', 'rachel@example.com');

-- Remove webhook config
DELETE FROM stitch_webhook_configs WHERE endpoint_slug = 'linkedin-lead';

-- Remove workflow
DELETE FROM stitch_flows WHERE name = 'Lead Capture Logic';
```

Then re-run the seed script to recreate everything with the correct configuration.

Or simply reset your database and re-run both seed scripts:
```bash
# Reset and seed BMC
npx tsx scripts/seed-bmc.ts

# Seed demo journey
npx tsx scripts/seed-demo-journey.ts
```


---

## Video Factory V2 Workflow

The `video-factory-v2.ts` script creates a complete video production workflow that converts wireframes into videos with voice narration and background music.

### What It Creates

A workflow with 11 nodes that:
1. **Select Wireframes** - MediaSelect node filtered to wireframe type
2. **Load Wireframes** - Worker that loads full metadata for selected wireframes
3. **Voice Settings** - UX node for configuring voice narration settings
4. **Scene Splitter** - Splits wireframes array for parallel processing
5. **Generate Video** - Image-to-video worker (parallel)
6. **Generate Voice** - ElevenLabs voice generation worker (parallel)
7. **Mix Scene** - Shotstack worker to combine video + audio (parallel)
8. **Scene Collector** - Waits for all parallel scene processing to complete
9. **Music Selection** - MediaSelect node filtered to audio type
10. **Final Assembly** - Shotstack worker to concatenate all scenes and add music
11. **Final Review** - UX node for reviewing the final video

### Usage

```bash
npx tsx scripts/seed-video-factory-v2.ts
```

### Prerequisites

1. The default BMC canvas must exist (run `npx tsx scripts/seed-bmc.ts` first)
2. Media Library tables must exist (migration 009)
3. Environment variables must be set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VIDEO_GENERATION_ADAPTER` (optional, defaults to 'mock')
   - API keys for video generation services (if not using mock)

### Workflow Features

- **Media Library Integration**: Reads wireframes and music from the centralized Media Library
- **Parallel Processing**: Uses the M-shape pattern (Splitter → Parallel Workers → Collector) for efficient scene processing
- **Multi-Worker Coordination**: Coordinates image-to-video, voice generation, and video mixing workers
- **Final Assembly**: Concatenates all scene videos and adds background music

### Verification

To verify the workflow was created correctly:

```bash
npx tsx scripts/verify-video-factory-v2.ts
```

This will display:
- Workflow name and ID
- Number of nodes and edges
- List of all node types

### Requirements Validated

- **6.1**: Loads wireframe metadata from Media Library
- **6.2**: Generates videos from wireframes using image-to-video API
- **6.3**: Saves videos to Media Library with source image reference
- **6.4**: Generates voiceover audio and saves to Media Library
- **6.5**: Assembles final video by concatenating scene videos

---

## Wireframe Generation Workflow

The `wireframe-workflow.ts` script creates an AI-powered wireframe generation workflow that converts scripts into visual wireframes.

### Usage

```bash
npx tsx scripts/seed-wireframe-workflow.ts
```

See the wireframe-workflow.ts file for detailed documentation.
