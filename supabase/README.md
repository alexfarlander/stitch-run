# Supabase Setup

This directory contains database migrations for the Stitch orchestration engine.

## Local Development Setup

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase locally**:
   ```bash
   supabase init
   ```

3. **Start local Supabase**:
   ```bash
   supabase start
   ```

4. **Apply migrations**:
   ```bash
   supabase db reset
   ```

5. **Get your local credentials**:
   ```bash
   supabase status
   ```
   
   Copy the API URL and anon key to your `.env.local` file.

## Production Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Get your project credentials from Settings > API

3. Run migrations:
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

4. Add credentials to your production environment variables

## Migrations

Migrations are located in `supabase/migrations/` and are applied in order by timestamp.

### Current Migrations

- `20241202000001_create_stitch_tables.sql`: Creates the core `stitch_flows` and `stitch_runs` tables

## Database Schema

### stitch_flows
Stores flow definitions (the visual graph structure).

- `id`: UUID primary key
- `name`: Flow name
- `graph`: JSONB containing nodes and edges
- `created_at`: Timestamp
- `updated_at`: Timestamp (auto-updated)

### stitch_runs
Stores run execution state.

- `id`: UUID primary key
- `flow_id`: Foreign key to stitch_flows
- `node_states`: JSONB mapping nodeId to execution state
- `created_at`: Timestamp
- `updated_at`: Timestamp (auto-updated)

## Environment Variables

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key (safe for client-side)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only, bypasses RLS)
- `NEXT_PUBLIC_BASE_URL`: Your application base URL for callback URLs
