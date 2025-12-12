# Design: Run Management & Execution Engine

## Overview

This design implements the stitching logic that connects UX flows and system flows into a cohesive execution engine. The focus is on enhancing the existing run system to handle M-Shape architecture where entities travel the UX spine while system paths execute underneath.

## Current State Analysis (Verified from Migrations)

**Existing Tables:**
- `stitch_flows`: Canvas storage with `canvas_type`, `parent_id`, `graph` (JSON), `user_id`
- `stitch_runs`: Run tracking with `flow_id`, `node_states` (JSON), `entity_id`, `trigger` (JSON), `status`, `flow_version_id`
- `stitch_entities`: Entity tracking with `canvas_id`, `current_node_id`, `journey` (JSON)
- `stitch_journey_events`: Movement history with `entity_id`, `event_type`, `node_id`
- `stitch_contacts`: Proto-CRM with `user_id`, `email`, `name`, `company`, `metadata` (JSON)
- `stitch_flow_versions`: Version history with `flow_id`, `graph` (JSON)

**Existing APIs:**
- `POST /api/flows/{flowId}/run` - Start runs
- `POST /api/stitch/callback/{runId}/{nodeId}` - Node completion callbacks
- Webhook system with `stitch_webhook_configs` and `stitch_webhook_events`
- Email reply system with `stitch_email_reply_configs`

**What Actually Needs Building:**
1. UX-System flow mapping (which system flow belongs to which UX node)
2. Enhanced callback logic to handle UX spine progression
3. Entity creation from system events (webhooks, email replies)
4. UX node validation using existing graph JSON

## The Stitching Architecture

### Current Gap: Disconnected Flows

```
❌ CURRENT STATE:
BMC Flow (UX):     [Form] → [Email] → [Demo]
                      ↓       ↓        ↓
System Flows:    [Flow-A] [Flow-B] [Flow-C]
                 (separate runs, no connection)
```

### Target: Stitched Execution

```
✅ TARGET STATE:
BMC Flow (UX):     [Form] → [Email] → [Demo]
                      ↓       ↓        ↓
System Flows:    [Flow-A] [Flow-B] [Flow-C]
                      ↓       ↓        ↓
Entity Movement:  Form → Email → Demo
```

## Core Stitching Logic

### 1. UX-System Flow Mapping

**Problem**: Need to know which system flow executes under each UX node
**Solution**: Simple mapping table using existing flow IDs

```sql
-- Minimal new table - just maps UX nodes to system flows
CREATE TABLE stitch_ux_system_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bmc_flow_id UUID NOT NULL REFERENCES stitch_flows(id),
  ux_node_id TEXT NOT NULL,
  system_flow_id UUID NOT NULL REFERENCES stitch_flows(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ux_system_mapping_lookup ON stitch_ux_system_mapping(bmc_flow_id, ux_node_id);
```

### 2. Enhanced Run Start (Extend Existing API)

**Current**: `POST /api/flows/{flowId}/run`
**Enhancement**: Add UX context when starting system flows

```typescript
// Extend existing run start logic
const startRun = async (flowId: string, options: {
  entity_id?: string;
  ux_node_id?: string;  // NEW: UX context
  trigger_data?: any;
}) => {
  // Use existing stitch_runs table with existing fields
  const run = await createRun({
    flow_id: flowId,
    entity_id: options.entity_id,
    trigger: {
      ...options.trigger_data,
      ux_node_id: options.ux_node_id  // Store UX context in existing trigger JSON
    },
    node_states: {},
    status: 'running'
  });
  
  return run;
};
```

### 3. Enhanced Callback Logic (Extend Existing)

**Current**: `POST /api/stitch/callback/{runId}/{nodeId}`
**Enhancement**: Check for system path completion and trigger UX progression

```typescript
// Extend existing callback handler
const handleCallback = async (runId: string, nodeId: string, data: any) => {
  // Existing callback logic
  await updateRunNodeState(runId, nodeId, data);
  
  // NEW: Check if system path is complete
  const run = await getRun(runId);
  if (isSystemPathComplete(run)) {
    await handleSystemPathCompletion(run);
  }
};

const handleSystemPathCompletion = async (run: Run) => {
  const uxNodeId = run.trigger?.ux_node_id;
  if (!uxNodeId || !run.entity_id) return;
  
  // Find BMC flow (parent of this system flow)
  const systemFlow = await getFlow(run.flow_id);
  const bmcFlow = await getFlow(systemFlow.parent_id);
  
  // Find next UX node in BMC graph JSON
  const nextUXNode = findNextUXNodeInGraph(bmcFlow.graph, uxNodeId);
  
  if (nextUXNode) {
    // Move entity to next UX node (reuse existing entity update)
    await updateEntity(run.entity_id, {
      current_node_id: nextUXNode.id
    });
    
    // Log journey event (reuse existing journey events)
    await createJourneyEvent({
      entity_id: run.entity_id,
      event_type: 'node_arrival',
      node_id: nextUXNode.id
    });
    
    // Start next system flow (if mapped)
    const nextMapping = await getUXSystemMapping(bmcFlow.id, nextUXNode.id);
    if (nextMapping) {
      await startRun(nextMapping.system_flow_id, {
        entity_id: run.entity_id,
        ux_node_id: nextUXNode.id
      });
    }
  }
};
```

### 4. Entity Creation from System Events

**Problem**: Entities should be created by system responses (email replies, form submits), not manual seeding
**Solution**: Enhance existing webhook/email reply handlers

```typescript
// Enhance existing webhook handler
const handleWebhook = async (webhookConfig: any, data: any) => {
  // Existing webhook logic...
  
  // NEW: Create entity from webhook data
  const entity = await createEntity({
    canvas_id: webhookConfig.canvas_id,
    current_node_id: getUXNodeForWebhook(webhookConfig),
    name: data.name || data.email,
    entity_type: 'lead',
    metadata: data
  });
  
  // Start system flow with entity context
  const mapping = await getUXSystemMapping(webhookConfig.canvas_id, entity.current_node_id);
  if (mapping) {
    await startRun(mapping.system_flow_id, {
      entity_id: entity.id,
      ux_node_id: entity.current_node_id,
      trigger_data: data
    });
  }
};

// Enhance existing email reply handler
const handleEmailReply = async (replyConfig: any, emailData: any) => {
  // Create entity from email reply
  const entity = await createEntity({
    canvas_id: replyConfig.canvas_id,
    current_node_id: 'email_reply_ux_node',
    name: emailData.from_name,
    entity_type: 'respondent',
    metadata: { email: emailData.from_email, reply: emailData.body }
  });
  
  // Continue with existing email reply logic...
};
```

### 5. UX Node Validation (Using Existing Graph)

**Problem**: Ensure entities can only be positioned at UX nodes
**Solution**: Validate using existing graph JSON at API layer

```typescript
const validateUXNode = (flowId: string, nodeId: string): boolean => {
  const flow = getFlow(flowId);
  const node = flow.graph.nodes.find(n => n.id === nodeId);
  return node?.type === 'UX';
};

// Enhance existing entity update API
const updateEntity = async (entityId: string, updates: any) => {
  if (updates.current_node_id) {
    const entity = await getEntity(entityId);
    if (!validateUXNode(entity.canvas_id, updates.current_node_id)) {
      throw new Error('Entities can only be positioned at UX nodes');
    }
  }
  
  // Existing entity update logic...
};
```

## Outreach Workflow Example

```typescript
// Outreach system flow pulls contacts and sends emails
const outreachFlow = {
  nodes: [
    { id: 'pull-contacts', type: 'Worker', nodeType: 'contact-puller' },
    { id: 'send-emails', type: 'Worker', nodeType: 'email-sender' }
  ]
};

// Email reply webhook creates entity and starts journey
const onEmailReply = async (emailData: any) => {
  // Create entity from reply
  const entity = await createEntity({
    canvas_id: bmcFlowId,
    current_node_id: 'email_reply_ux_node',
    name: emailData.from_name,
    entity_type: 'respondent'
  });
  
  // Start system flow for email reply processing
  const mapping = await getUXSystemMapping(bmcFlowId, 'email_reply_ux_node');
  if (mapping) {
    await startRun(mapping.system_flow_id, {
      entity_id: entity.id,
      ux_node_id: 'email_reply_ux_node',
      trigger_data: emailData
    });
  }
};
```

## Required Changes (Minimal)

### Database Schema
```sql
-- Only one new table needed
CREATE TABLE stitch_ux_system_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bmc_flow_id UUID NOT NULL REFERENCES stitch_flows(id),
  ux_node_id TEXT NOT NULL,
  system_flow_id UUID NOT NULL REFERENCES stitch_flows(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Extensions
```typescript
// Single new endpoint for mapping management
GET /api/flows/{bmcFlowId}/ux-mapping
POST /api/flows/{bmcFlowId}/ux-mapping
```

### Code Changes
1. Enhance existing callback handler with stitching logic
2. Enhance existing webhook/email handlers to create entities
3. Add UX node validation to existing entity APIs
4. Add helper functions to parse graph JSON for UX nodes

## Implementation Priority

1. **UX-System Mapping**: Create mapping table and management API
2. **Enhanced Callbacks**: Add stitching logic to existing callback handler
3. **Entity Creation**: Enhance webhook/email handlers to create entities
4. **UX Validation**: Add UX node validation to entity APIs
5. **Graph Parsing**: Add utilities to find next UX nodes in graph JSON

## Testing Strategy

### Integration Testing
1. **End-to-End Flow**: Webhook → Entity Creation → System Run → UX Progression
2. **Entity Validation**: Ensure entities can only be at UX nodes
3. **Journey Logging**: Verify journey events are logged correctly
4. **Run Coordination**: Multiple system flows triggered in sequence

This design reuses all existing infrastructure and adds minimal new components to achieve M-Shape stitching.