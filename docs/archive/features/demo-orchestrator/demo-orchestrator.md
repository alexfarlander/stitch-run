# Demo Orchestrator

The Demo Orchestrator provides API endpoints to control the Clockwork Canvas demonstration, allowing presenters to start scripted sequences of events and reset the canvas to its initial state.

## API Endpoints

### POST /api/demo/start

Starts the demo by executing a scripted sequence of webhook calls with timed delays.

**Request:**
```bash
curl -X POST http://localhost:3000/api/demo/start \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Demo started successfully",
  "events": 7,
  "duration": 35000,
  "script": [
    {
      "delay": 0,
      "description": "🐺 New lead from LinkedIn Ads"
    },
    {
      "delay": 5000,
      "description": "👹 Demo call booked"
    }
    // ... more events
  ]
}
```

**Behavior:**
- Returns immediately while events fire in the background
- Uses setTimeout to schedule webhook calls
- Each event fires at its specified delay time
- Uses the same webhook endpoints as production (Requirement 6.4)

### POST /api/demo/reset

Resets the demo to its initial state by restoring entity positions and financial metrics.

**Request:**
```bash
curl -X POST http://localhost:3000/api/demo/reset \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Demo reset successfully",
  "entities_reset": 13,
  "entities_not_found": 0,
  "total_entities": 13,
  "financial_metrics_reset": true
}
```

**Behavior:**
- Resets all 13 entities to their initial positions from CLOCKWORK_ENTITIES
- Restores financial metrics (MRR, costs) to initial values
- Idempotent - safe to call multiple times

## Demo Script

The demo script is defined in `src/lib/demo/demo-script.ts` and includes 7 events:

1. **[0s]** New lead from LinkedIn (Werewolf)
2. **[5s]** Demo call booked (Goblin)
3. **[10s]** Trial started (Witch)
4. **[15s]** Converted to Pro ($99/mo) (Ghost)
5. **[20s]** Support ticket opened (Mummy)
6. **[25s]** New lead from SEO (Skeleton)
7. **[30s]** Enterprise conversion ($499/mo) (Kraken)

Total duration: ~35 seconds (30s + 5s buffer)

## Testing

### Verification Script
```bash
npx tsx scripts/verify-demo-implementation.ts
```

Verifies that:
- API endpoint files exist
- Required exports are present
- Code structure is correct

### Manual Testing
```bash
# Start the dev server
npm run dev

# In another terminal, test the endpoints
./scripts/test-demo-endpoints.sh
```

### Individual Endpoint Tests
```bash
# Test start endpoint
npx tsx scripts/test-demo-start.ts

# Test reset endpoint
npx tsx scripts/test-demo-reset.ts

# Comprehensive test
npx tsx scripts/test-demo-orchestrator.ts
```

## Requirements Validation

- ✅ **Requirement 6.1**: Execute scripted sequence of webhook calls with timed delays
- ✅ **Requirement 6.3**: Reset all entities to initial positions
- ✅ **Requirement 6.4**: Use same webhook endpoints as production
- ✅ **Requirement 9.5**: Reset financial metrics to initial values

## Implementation Details

### Start Endpoint
- Reads `CLOCKWORK_DEMO_SCRIPT` from demo-script.ts
- Schedules each event using `setTimeout`
- Calls webhook endpoints with proper payloads
- Returns immediately (non-blocking)
- Logs all events to console

### Reset Endpoint
- Queries BMC canvas from database
- Updates each entity's position using email lookup
- Calls `resetFinancialMetrics()` to restore financial values
- Returns summary of reset operations

## Error Handling

Both endpoints include comprehensive error handling:
- Missing environment variables (NEXT_PUBLIC_BASE_URL)
- Database connection failures
- Entity not found scenarios
- Webhook call failures (logged but don't stop demo)

## Next Steps

After implementing the demo orchestrator, the next tasks are:
- Task 12: Create Demo Control Panel component (UI)
- Task 13: Integrate Demo Control Panel into BMC Canvas
- Task 14: Checkpoint - Verify webhook and demo flow
