# Demo Mode API

The Demo Mode API allows you to programmatically spawn demo entities and trigger workflows for demonstrations and testing.

## Endpoints

### POST /api/demo/start

Starts a demo session by spawning entities at specified nodes and optionally triggering workflows.

**Requirements:** 6.1, 6.2, 6.3, 13.1, 13.2, 13.3

#### Request Body

```typescript
{
  canvasId: string;              // Required: ID of the canvas to run demo on
  entities?: Array<{             // Optional: Custom entity configurations
    name: string;                // Entity name (e.g., "Monica")
    startNodeId: string;         // Node ID where entity starts
    avatarUrl?: string;          // Optional avatar URL
    email?: string;              // Optional email
    entityType?: 'lead' | 'customer' | 'churned';  // Optional entity type
  }>;
  staggerDelay?: number;         // Optional: Delay in ms between entity spawns (default: 2000)
}
```

#### Response

```typescript
{
  sessionId: string;             // Unique demo session ID
  status: 'running';             // Demo status
  entities: Array<{              // Spawned entities
    id: string;                  // Entity ID
    name: string;                // Entity name
    nodeId: string;              // Starting node ID
  }>;
  runs: Array<{                  // Triggered workflow runs
    entityId: string;            // Entity ID
    runId: string;               // Run ID
  }>;
}
```

#### Error Responses

- `400 Bad Request`: Missing required `canvasId`
- `404 Not Found`: Canvas not found
- `500 Internal Server Error`: Server error with details

## Usage Examples

### Basic Usage (Default Entities)

Spawns 3 default demo entities (Monica, Ross, Rachel) at predefined nodes:

```bash
curl -X POST http://localhost:3000/api/demo/start \
  -H "Content-Type: application/json" \
  -d '{
    "canvasId": "c62f7ff2-570b-48a6-ae35-d616cdb100fb"
  }'
```

### Custom Entities

Spawn custom entities at specific nodes:

```bash
curl -X POST http://localhost:3000/api/demo/start \
  -H "Content-Type: application/json" \
  -d '{
    "canvasId": "c62f7ff2-570b-48a6-ae35-d616cdb100fb",
    "staggerDelay": 1000,
    "entities": [
      {
        "name": "Chandler",
        "startNodeId": "item-youtube-channel",
        "entityType": "lead"
      },
      {
        "name": "Phoebe",
        "startNodeId": "item-seo-content",
        "entityType": "lead"
      }
    ]
  }'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('/api/demo/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    canvasId: 'c62f7ff2-570b-48a6-ae35-d616cdb100fb',
    staggerDelay: 1500,
    entities: [
      {
        name: 'Monica',
        startNodeId: 'item-linkedin-ads',
        entityType: 'lead',
      },
    ],
  }),
});

const result = await response.json();
console.log('Demo session:', result.sessionId);
console.log('Entities spawned:', result.entities.length);
```

## Default Demo Entities

When no entities are provided, the API spawns these default entities:

1. **Monica**
   - Node: `item-linkedin-ads` (Marketing section)
   - Type: Lead
   - Email: monica@demo.stitch.run

2. **Ross**
   - Node: `item-demo-call` (Sales section)
   - Type: Lead
   - Email: ross@demo.stitch.run

3. **Rachel**
   - Node: `item-free-trial` (Offers section)
   - Type: Lead
   - Email: rachel@demo.stitch.run

## Workflow Triggering

- **BMC Canvases**: Entities are spawned at their starting positions. Workflows are typically triggered when entities move between nodes or through manual triggers.
- **Workflow Canvases**: If the canvas type is 'workflow', the API will automatically trigger workflow execution for each spawned entity.

## Testing

Run the test script to verify the API:

```bash
npx tsx scripts/test-demo-api.ts
```

This will:
1. Find the BMC canvas
2. Call the demo API
3. Verify entities were created in the database
4. Verify workflow runs were created (if applicable)

## Implementation Notes

- Entities are spawned with staggered delays to create a more realistic demo experience
- Each entity gets a journey event recorded at spawn time
- All demo entities are tagged with `source: 'demo'` in their metadata
- The session ID can be used to track and clean up demo entities later
- Entity spawning continues even if individual entities fail to spawn
- Workflow triggering is optional and depends on canvas type

## Related Files

- Implementation: `src/app/api/demo/start/route.ts`
- Test Script: `scripts/test-demo-api.ts`
- Entity Management: `src/lib/db/entities.ts`
- Workflow Execution: `src/lib/engine/edge-walker.ts`
