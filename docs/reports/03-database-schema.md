# Database Schema: Complete Data Model

## Overview

Stitch uses Supabase (PostgreSQL) as its single source of truth. The schema is designed for:
- **Hierarchical canvases** (BMC → Workflows → Sub-workflows)
- **Entity tracking** (customers/leads moving through workflows)
- **Webhook integration** (external services triggering workflows)
- **Journey analytics** (complete history of entity movements)
- **Real-time updates** (Supabase Realtime for live UI)

## Core Tables

### stitch_flows

Stores all canvas definitions (BMC, workflows, detail views).

```sql
CREATE TABLE stitch_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  graph JSONB NOT NULL,
  canvas_type TEXT DEFAULT 'workflow',
  parent_id UUID REFERENCES stitch_flows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stitch_flows_canvas_type ON stitch_flows(canvas_type);
CREATE INDEX idx_stitch_flows_parent_id ON stitch_flows(parent_id);
```

**Graph JSONB Structure**:
```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "Worker",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "Generate Scenes",
        "webhookUrl": "https://worker.example.com/claude",
        "workerType": "claude"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2"
    }
  ]
}
```

**Canvas Types**:
- `bmc`: Top-level Business Model Canvas
- `workflow`: Executable workflow graph
- `detail`: Detail view for specific sections

### stitch_runs

Stores execution state for workflow runs.

```sql
CREATE TABLE stitch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES stitch_entities(id) ON DELETE SET NULL,
  node_states JSONB NOT NULL,
  trigger JSONB NOT NULL DEFAULT '{"type":"manual","source":null,"event_id":null}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stitch_runs_flow_id ON stitch_runs(flow_id);
CREATE INDEX idx_stitch_runs_entity_id ON stitch_runs(entity_id);
CREATE INDEX idx_stitch_runs_created_at ON stitch_runs(created_at DESC);
```

**Node States JSONB Structure**:
```json
{
  "node-1": {
    "status": "completed",
    "output": { "scenes": [...] }
  },
  "node-2": {
    "status": "running"
  },
  "splitter-1": {
    "status": "completed",
    "output": ["A", "B", "C"]
  },
  "worker-1_0": {
    "status": "completed",
    "output": "Result A"
  },
  "worker-1_1": {
    "status": "running"
  }
}
```

**Trigger JSONB Structure**:
```json
{
  "type": "webhook",
  "source": "stripe",
  "event_id": "evt_abc123",
  "timestamp": "2024-12-03T10:30:00Z"
}
```

### Atomic State Update Function

Prevents race conditions when multiple workers complete simultaneously:

```sql
CREATE OR REPLACE FUNCTION update_node_state(
  p_run_id UUID,
  p_node_id TEXT,
  p_status TEXT,
  p_output JSONB,
  p_error TEXT
) RETURNS SETOF stitch_runs AS $$
BEGIN
  RETURN QUERY
  UPDATE stitch_runs
  SET 
    node_states = jsonb_set(
      node_states,
      ARRAY[p_node_id],
      jsonb_build_object(
        'status', p_status,
        'output', COALESCE(p_output, 'null'::jsonb),
        'error', p_error
      )
    ),
    updated_at = NOW()
  WHERE id = p_run_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

## Entity Tracking Tables

### stitch_entities

Tracks individual customers/leads through the canvas.

```sql
CREATE TABLE stitch_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  entity_type TEXT NOT NULL,
  
  -- Position tracking (mutually exclusive)
  current_node_id TEXT,
  current_edge_id TEXT,
  edge_progress NUMERIC(3,2),
  
  -- Journey and metadata
  journey JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_edge_progress_range 
    CHECK (edge_progress IS NULL OR (edge_progress >= 0.0 AND edge_progress <= 1.0)),
  
  CONSTRAINT check_position_exclusivity
    CHECK (
      (current_node_id IS NOT NULL AND current_edge_id IS NULL AND edge_progress IS NULL) OR
      (current_node_id IS NULL AND current_edge_id IS NOT NULL AND edge_progress IS NOT NULL) OR
      (current_node_id IS NULL AND current_edge_id IS NULL AND edge_progress IS NULL)
    )
);

CREATE INDEX idx_stitch_entities_canvas_id ON stitch_entities(canvas_id);
CREATE INDEX idx_stitch_entities_current_node_id ON stitch_entities(current_node_id);
CREATE INDEX idx_stitch_entities_current_edge_id ON stitch_entities(current_edge_id);
CREATE INDEX idx_stitch_entities_entity_type ON stitch_entities(entity_type);

-- Enable realtime for live UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_entities;
```

**Metadata Examples**:
```json
{
  "email": "monica@example.com",
  "plan": "pro",
  "cac": 150.00,
  "ltv": 1200.00,
  "stripe_customer_id": "cus_abc123"
}
```

### stitch_journey_events

Detailed audit log of entity movements.

```sql
CREATE TABLE stitch_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES stitch_entities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  node_id TEXT,
  edge_id TEXT,
  progress NUMERIC(3,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journey_events_entity_id ON stitch_journey_events(entity_id);
CREATE INDEX idx_journey_events_timestamp ON stitch_journey_events(timestamp);
CREATE INDEX idx_journey_events_event_type ON stitch_journey_events(event_type);
CREATE INDEX idx_journey_events_edge_id ON stitch_journey_events(edge_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_journey_events;
```

**Event Types**:
- `edge_start`: Entity begins traveling on an edge
- `edge_progress`: Entity moves along an edge (optional milestone)
- `node_arrival`: Entity arrives at a node
- `node_complete`: Entity completes processing at a node
- `manual_move`: Entity manually moved by operator

### Entity Movement Functions

Atomic operations for entity position updates:

```sql
-- Start journey on an edge
CREATE OR REPLACE FUNCTION start_journey(
  p_entity_id UUID,
  p_edge_id TEXT
) RETURNS SETOF stitch_entities AS $$
BEGIN
  -- Update entity position
  UPDATE stitch_entities
  SET 
    current_node_id = NULL,
    current_edge_id = p_edge_id,
    edge_progress = 0.0,
    updated_at = NOW()
  WHERE id = p_entity_id;
  
  -- Create journey event
  INSERT INTO stitch_journey_events (entity_id, event_type, edge_id)
  VALUES (p_entity_id, 'edge_start', p_edge_id);
  
  -- Return updated entity
  RETURN QUERY SELECT * FROM stitch_entities WHERE id = p_entity_id;
END;
$$ LANGUAGE plpgsql;

-- Arrive at node
CREATE OR REPLACE FUNCTION arrive_at_node(
  p_entity_id UUID,
  p_node_id TEXT
) RETURNS SETOF stitch_entities AS $$
BEGIN
  -- Update entity position
  UPDATE stitch_entities
  SET 
    current_node_id = p_node_id,
    current_edge_id = NULL,
    edge_progress = NULL,
    updated_at = NOW()
  WHERE id = p_entity_id;
  
  -- Create journey event
  INSERT INTO stitch_journey_events (entity_id, event_type, node_id)
  VALUES (p_entity_id, 'node_arrival', p_node_id);
  
  -- Return updated entity
  RETURN QUERY SELECT * FROM stitch_entities WHERE id = p_entity_id;
END;
$$ LANGUAGE plpgsql;
```

## Webhook System Tables

### stitch_webhook_configs

Defines webhook endpoints and their behavior.

```sql
CREATE TABLE stitch_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  endpoint_slug TEXT NOT NULL UNIQUE,
  secret TEXT,
  workflow_id UUID NOT NULL REFERENCES stitch_flows(id) ON DELETE CASCADE,
  entry_edge_id TEXT NOT NULL,
  entity_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_configs_endpoint_slug ON stitch_webhook_configs(endpoint_slug);
CREATE INDEX idx_webhook_configs_canvas_id ON stitch_webhook_configs(canvas_id);
CREATE INDEX idx_webhook_configs_workflow_id ON stitch_webhook_configs(workflow_id);
CREATE INDEX idx_webhook_configs_is_active ON stitch_webhook_configs(is_active);
```

**Entity Mapping JSONB Structure**:
```json
{
  "name": "$.customer.name",
  "email": "$.customer.email",
  "entity_type": "customer",
  "metadata": {
    "plan": "$.subscription.plan",
    "amount": "$.amount_paid"
  }
}
```

### stitch_webhook_events

Audit log for all webhook requests.

```sql
CREATE TABLE stitch_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES stitch_webhook_configs(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  entity_id UUID REFERENCES stitch_entities(id) ON DELETE SET NULL,
  workflow_run_id UUID REFERENCES stitch_runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_events_config_id ON stitch_webhook_events(webhook_config_id);
CREATE INDEX idx_webhook_events_received_at ON stitch_webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_status ON stitch_webhook_events(status);
CREATE INDEX idx_webhook_events_entity_id ON stitch_webhook_events(entity_id);
CREATE INDEX idx_webhook_events_workflow_run_id ON stitch_webhook_events(workflow_run_id);
```

**Status Values**:
- `pending`: Received but not yet processed
- `processing`: Currently being processed
- `completed`: Successfully processed
- `failed`: Processing failed

## Media Library Tables

### stitch_media

Centralized asset storage.

```sql
CREATE TABLE stitch_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration NUMERIC,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stitch_media_user_id ON stitch_media(user_id);
CREATE INDEX idx_stitch_media_media_type ON stitch_media(media_type);
CREATE INDEX idx_stitch_media_tags ON stitch_media USING GIN(tags);
CREATE INDEX idx_stitch_media_created_at ON stitch_media(created_at DESC);
```

**Media Types**:
- `image`: Static images
- `video`: Video files
- `audio`: Audio files
- `wireframe`: AI-generated scene images
- `style_reference`: Style guide images
- `document`: Documents and PDFs

**Metadata Examples**:
```json
{
  "source": "minimax",
  "prompt": "A serene mountain landscape",
  "model": "video-01",
  "scene_index": 0,
  "generation_params": {
    "temperature": 0.7,
    "steps": 50
  }
}
```

## Relationships Diagram

```
stitch_flows (BMC/Workflows)
    ↓ (canvas_id)
stitch_entities (Customers/Leads)
    ↓ (entity_id)
stitch_journey_events (Movement History)

stitch_flows (Workflows)
    ↓ (flow_id)
stitch_runs (Executions)
    ↓ (entity_id)
stitch_entities

stitch_flows (Canvas)
    ↓ (canvas_id)
stitch_webhook_configs
    ↓ (webhook_config_id)
stitch_webhook_events
    ↓ (entity_id, workflow_run_id)
stitch_entities, stitch_runs
```

## Row Level Security (RLS)

All tables have RLS enabled for multi-tenant security:

```sql
-- Example: stitch_flows RLS
ALTER TABLE stitch_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flows"
  ON stitch_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flows"
  ON stitch_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Similar policies for all tables
```

## Storage Buckets

Supabase Storage buckets for media files:

```typescript
// stitch-media bucket
{
  "id": "stitch-media",
  "name": "stitch-media",
  "public": true,
  "file_size_limit": 52428800, // 50MB
  "allowed_mime_types": [
    "image/*",
    "video/*",
    "audio/*",
    "application/pdf"
  ]
}
```

## Migrations

All schema changes are versioned in `supabase/migrations/`:

- `20241202000001_create_stitch_tables.sql` - Initial schema
- `20241202000002_atomic_node_state_update.sql` - RPC functions
- `003_bmc_architecture.sql` - BMC canvas types
- `004_entity_position_tracking.sql` - Entity tracking
- `006_atomic_movements.sql` - Entity movement functions
- `007_add_missing_entity_fields.sql` - Entity metadata
- `008_webhook_system.sql` - Webhook tables
- `009_media_library.sql` - Media storage

## Key Constraints

1. **Position Exclusivity**: Entity can be at node OR edge, not both
2. **Progress Range**: Edge progress must be 0.0-1.0
3. **Endpoint Uniqueness**: Webhook endpoint slugs must be unique
4. **Referential Integrity**: Cascading deletes maintain consistency
5. **Atomic Updates**: RPC functions prevent race conditions

## Performance Considerations

- **Indexes**: All foreign keys and frequently queried fields indexed
- **JSONB**: GIN indexes on JSONB columns for fast queries
- **Partitioning**: Consider partitioning journey_events by timestamp for large datasets
- **Realtime**: Only enabled on tables needing live updates (entities, journey_events)
- **Connection Pooling**: Supabase handles connection pooling automatically
