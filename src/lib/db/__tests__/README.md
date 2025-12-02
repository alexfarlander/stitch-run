# Database Operations Tests

These tests validate the database operations layer for flows and runs.

## Prerequisites

1. **Docker must be running** - Supabase local development requires Docker
2. **Supabase CLI must be installed** - `npm install -g supabase`

## Running Tests

### 1. Start Supabase locally

```bash
cd stitch-run
npx supabase start
```

This will start a local Supabase instance with:
- PostgreSQL database on port 54321
- Default credentials configured in `.env.test`

### 2. Run the tests

```bash
npm test
```

Or for watch mode:

```bash
npm run test:watch
```

### 3. Stop Supabase when done

```bash
npx supabase stop
```

## Test Coverage

### Flow Operations (`flows.test.ts`)
- ✓ Create flow with valid graph structure (Requirements 1.3, 1.4)
- ✓ Create flow with all node types
- ✓ Retrieve existing flow
- ✓ Handle non-existent flow
- ✓ Update flow name and graph
- ✓ Delete flow

### Run Operations (`runs.test.ts`)
- ✓ Initialize all nodes to pending status (Requirement 2.6)
- ✓ Validate node state structure (Requirement 2.4)
- ✓ Update single node state with persistence (Requirement 11.2)
- ✓ Update multiple node states atomically
- ✓ Handle parallel path node states (splitter scenario)
- ✓ Handle node state with errors
- ✓ Delete run

## Troubleshooting

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running
- Try `docker ps` to verify Docker is accessible

### "Connection refused" errors
- Ensure Supabase is running: `npx supabase status`
- Check that port 54321 is not in use by another service

### "Missing environment variable" errors
- Verify `.env.test` file exists in the project root
- Check that all required variables are set in the test setup
