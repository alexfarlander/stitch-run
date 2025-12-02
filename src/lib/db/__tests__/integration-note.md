# Integration Test Note

The tests in this directory are **integration tests** that require a running Supabase instance.

## Current Status

These tests validate the actual database operations and require:
1. Docker running
2. Supabase local instance started (`npx supabase start`)

## Running the Tests

To run these tests:

```bash
# 1. Start Docker Desktop (if not running)

# 2. Start Supabase
cd stitch-run
npx supabase start

# 3. Run tests
npm test

# 4. Stop Supabase when done
npx supabase stop
```

## Why Integration Tests?

These tests validate:
- **Requirement 2.6**: Run initialization sets all nodes to 'pending'
- **Requirement 11.2**: State updates persist to database
- **Requirements 1.3, 1.4**: Flow graph structure validation
- **Requirement 2.4**: Node state structure conformance

The database operations layer is critical infrastructure that must work correctly with the actual database, so integration tests provide the most value here.

## Alternative: Unit Tests with Mocks

If you need tests that run without a database, you could:
1. Mock the Supabase client
2. Test the business logic in isolation

However, this would not validate the actual database interactions, which is the primary purpose of this layer.
