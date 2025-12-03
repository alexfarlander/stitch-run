# Demo Journey Seed

This directory contains seed scripts for populating the Stitch database with demo data.

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
   - **Monica Geller** - Completed the full journey, now an active customer
   - **Ross Geller** - Stuck in Sales (Demo Form stage)
   - **Rachel Green** - Currently traveling on an edge (30% progress)

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
      "name": "Phoebe Buffay",
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

### Cleanup

To remove the demo data:

```sql
-- Remove demo entities
DELETE FROM stitch_entities WHERE email IN ('monica@example.com', 'ross@example.com', 'rachel@example.com');

-- Remove webhook config
DELETE FROM stitch_webhook_configs WHERE endpoint_slug = 'linkedin-lead';

-- Remove workflow
DELETE FROM stitch_flows WHERE name = 'Lead Capture Logic';
```

Or simply reset your database and re-run the BMC seed script.
