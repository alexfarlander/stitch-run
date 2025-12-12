# System Architecture Overview

## Introduction

Stitch is a **Living Business Model Canvas** orchestration platform that executes workflows and tracks entities (customers, leads, churned users) as they move through visual canvases. The system combines visual workflow design with real-time execution, entity tracking, and webhook integration to create an interactive business process management tool.

## Core Concept

Stitch operates on a fractal canvas architecture:

- **Top Level**: A 12-section Business Model Canvas (BMC) showing Marketing, Sales, Data, Revenue, etc.
- **Mid Level**: Each section contains Items that link to detailed Workflows
- **Execution Level**: Workflows execute as entities travel across the canvas in real-time

**Visual-First Philosophy**: If it's not on the canvas, it doesn't exist. All business logic is visible and represented in the graph structure.

## Major Subsystems

### 1. Execution Engine

The execution engine implements an **edge-walking execution model** that orchestrates workflow execution through recursive edge traversal.

**Key Components**:
- **Edge Walker** (`src/lib/engine/edge-walker.ts`): Orchestrates workflow execution by walking edges from completed nodes to downstream nodes
- **Node Handlers** (`src/lib/engine/handlers/`): Type-specific execution logic for Worker, UX, Splitter, and Collector nodes
- **Status Transitions** (`src/lib/engine/status-transitions.ts`): Validates state machine transitions for node execution

**Execution Flow**:
1. Start run → Fire entry nodes
2. Node completes → Update database
3. Walk outbound edges → Check dependencies
4. Fire ready downstream nodes → Repeat

**Key Principles**:
- **Event-Driven**: Node completion triggers edge-walking
- **Database as Source of Truth**: All state persisted immediately
- **Async Worker Pattern**: Workers fire webhooks and resume via callbacks
- **Parallel Execution**: Splitter/Collector pattern for fan-out/fan-in

### 2. Database Layer

Supabase PostgreSQL serves as the single source of truth for all system state.

**Key Tables**:
- `stitch_flows`: Flow metadata and graph structure
- `stitch_flow_versions`: Versioned visual and execution graphs
- `stitch_runs`: Workflow execution instances with node states
- `stitch_entities`: Tracked customers/leads with position data
- `stitch_journey_events`: Entity movement audit log
- `stitch_webhook_configs`: Webhook endpoint configurations
- `stitch_webhook_events`: Webhook request audit log

**Key Operations** (`src/lib/db/`):
- `flows.ts`: CRUD operations for flow definitions
- `runs.ts`: Run creation and state management
- `entities.ts`: Entity tracking and movement
- `webhook-configs.ts`: Webhook configuration management
- `webhook-events.ts`: Webhook event logging

**Critical Pattern**: No in-memory state management. If the server restarts, execution resumes from database state.

### 3. Worker System

The worker system provides a registry-based architecture for integrating external services.

**Key Components**:
- **Worker Registry** (`src/lib/workers/registry.ts`): Maps worker types to implementations
- **IWorker Interface** (`src/lib/workers/base.ts`): Standard contract for all workers
- **Worker Implementations** (`src/lib/workers/`):
  - `claude.ts`: Claude AI for script generation
  - `minimax.ts`: MiniMax video generation
  - `elevenlabs.ts`: ElevenLabs voice synthesis
  - `shotstack.ts`: Shotstack video assembly
  - `media-library.ts`: Media asset management

**Worker Protocol** (Immutable Contract):

Outbound (Stitch → Worker):
```json
{
  "runId": "uuid",
  "nodeId": "string",
  "config": { ...staticNodeSettings },
  "input": { ...dataFromUpstream },
  "callbackUrl": "https://{base_url}/api/stitch/callback/{runId}/{nodeId}"
}
```

Inbound (Worker → Stitch):
```json
{
  "status": "completed" | "failed",
  "output": { ...resultData },
  "error": "string (optional)"
}
```

### 4. Canvas System

The canvas system manages visual graphs, versioning, and compilation to optimized execution graphs.

**Key Components**:
- **Version Manager** (`src/lib/canvas/version-manager.ts`): Creates and retrieves flow versions
- **OEG Compiler** (`src/lib/canvas/compile-oeg.ts`): Compiles visual graphs to Optimized Execution Graphs
- **Graph Validator** (`src/lib/canvas/validate-graph.ts`): Validates graph structure and connections
- **Mermaid Parser/Generator** (`src/lib/canvas/mermaid-parser.ts`, `mermaid-generator.ts`): Import/export Mermaid diagrams

**Visual Graph vs Execution Graph**:
- **Visual Graph**: UI representation with positions, styles, React Flow properties
- **Execution Graph**: Runtime-optimized with O(1) lookup structures (adjacency map, indexed nodes)

**Versioning Flow**:
1. User edits visual graph in UI
2. On save/run → Create version
3. Compile visual graph → Execution graph
4. Store both in `stitch_flow_versions`
5. Update `current_version_id` in flow

### 5. Webhook System

The webhook system processes incoming webhooks, creates entities, and triggers workflows.

**Key Components**:
- **Webhook Processor** (`src/lib/webhooks/processor.ts`): Orchestrates webhook processing flow
- **Adapter System** (`src/lib/webhooks/adapters/`): Source-specific webhook handling
  - `stripe.ts`: Stripe payment webhooks
  - `typeform.ts`: Typeform submission webhooks
  - `calendly.ts`: Calendly booking webhooks
  - `n8n.ts`: n8n workflow webhooks
- **Entity Mapper** (`src/lib/webhooks/entity-mapper.ts`): Maps webhook payloads to entity data
- **Signature Validator** (`src/lib/webhooks/signature.ts`): Validates webhook signatures

**Processing Flow**:
1. Receive webhook → Look up configuration
2. Validate signature → Log event
3. Extract entity data → Create/update entity
4. Place entity on entry edge (visual journey)
5. Create workflow run → Start execution
6. Update event status

### 6. AI Manager

The AI Manager enables natural language workflow creation and modification using Claude AI.

**Key Components**:
- **LLM Client** (`src/lib/ai/llm-client.ts`): Claude API integration with retry logic
- **Context Builder** (`src/lib/ai/context-builder.ts`): Strips UI properties for LLM context
- **Action Executor** (`src/lib/ai/action-executor.ts`): Parses LLM responses and executes actions
- **Prompt Templates** (`src/lib/ai/prompt-template.ts`): Structured prompts for workflow operations

**Supported Actions**:
- `CREATE_WORKFLOW`: Generate new workflow from description
- `MODIFY_WORKFLOW`: Update existing workflow
- `RUN_WORKFLOW`: Execute workflow with parameters
- `GET_STATUS`: Check workflow execution status

### 7. Frontend Components

React-based UI built with Next.js 16 App Router and React Flow for canvas rendering.

**Key Components**:
- **Canvas Router** (`src/components/canvas/CanvasRouter.tsx`): Navigation between BMC/Workflow/Detail views
- **BMC Canvas** (`src/components/canvas/BMCCanvas.tsx`): Business Model Canvas rendering
- **Workflow Canvas** (`src/components/canvas/WorkflowCanvas.tsx`): Workflow graph rendering
- **Node Components** (`src/components/canvas/nodes/`): Type-specific node renderers
- **Entity Visualization** (`src/components/canvas/entities/`): Real-time entity tracking and animations

**Key Hooks**:
- `useFlow`: Flow data fetching and management
- `useEntities`: Entity tracking and position updates
- `useRunStatus`: Real-time execution status
- `useCanvasNavigation`: Drill-down navigation
- `useRealtimeSubscription`: Supabase real-time updates

## Technology Stack

### Backend
- **Framework**: Next.js 16 App Router (TypeScript)
- **Database**: Supabase (PostgreSQL + Real-time)
- **AI**: Anthropic Claude API
- **Runtime**: Node.js

### Frontend
- **Framework**: React 19
- **Canvas**: @xyflow/react (React Flow v12)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **State Management**: React hooks + Supabase subscriptions

### External Integrations
- **Video Generation**: MiniMax API
- **Voice Synthesis**: ElevenLabs API
- **Video Assembly**: Shotstack API
- **Webhooks**: Stripe, Typeform, Calendly, n8n

## Design Principles

### 1. Database as Source of Truth

All state changes are persisted immediately to Supabase. No in-memory state management. This ensures:
- Workflows can resume after server restart
- Multiple instances can coordinate
- Complete audit trail of all operations

### 2. Edge-Walking Execution Model

Workflows execute by walking edges from completed nodes:
- **Event-Driven**: Node completion triggers downstream execution
- **Recursive**: Edge-walking continues until terminal nodes
- **Dependency-Aware**: Nodes only fire when all upstream dependencies complete

### 3. Async Worker Pattern

All workers are treated as asynchronous:
- **Fire**: Send webhook → Mark node "running" → End process
- **Resume**: Receive callback → Mark node "completed" → Continue edge-walking

This pattern enables:
- Long-running operations (video generation, AI processing)
- Horizontal scaling (workers can be separate services)
- Fault tolerance (workers can retry independently)

### 4. Parallel Execution (M-Shape)

Support for fan-out/fan-in patterns:
- **Splitter Nodes**: Take array input → Fire multiple parallel paths
- **Collector Nodes**: Wait for all upstream paths → Merge outputs → Continue

Example: Process array of scenes in parallel, then assemble final video.

### 5. Visual-First Philosophy

The canvas is the application:
- All business logic visible in graph structure
- No hidden configuration or code
- What you see is what executes

### 6. Fractal Canvas Architecture

Everything is a canvas:
- BMC is a canvas with 12 sections
- Sections contain Items
- Items link to Workflows (also canvases)
- Drill-down navigation between levels

### 7. Entity Tracking

Individual entities (customers, leads) are tracked as they move:
- Position tracked on nodes or edges
- Journey history recorded
- Real-time visualization of movement
- Conversion metrics calculated

## Data Flow

### Workflow Execution Flow

```
1. User clicks "Run" or webhook received
2. Create run record in database
3. Load execution graph from current version
4. Fire entry nodes
5. For each node completion:
   a. Update node state in database
   b. Walk outbound edges
   c. Check downstream dependencies
   d. Fire ready nodes
   e. Repeat until terminal nodes
```

### Entity Movement Flow

```
1. Webhook received
2. Extract entity data from payload
3. Create/update entity in database
4. Place entity on entry edge (visual journey)
5. Create workflow run with entity_id
6. Execute workflow
7. On node completion:
   a. Check entity movement config
   b. Move entity to target section
   c. Update entity type if specified
   d. Record journey event
```

### Real-Time Update Flow

```
1. Database change occurs (node status, entity position)
2. Supabase broadcasts change via WebSocket
3. Frontend receives update via subscription
4. React state updates
5. UI re-renders with new data
```

## Critical Implementation Details

### Callback URL Construction

Always prepend `process.env.NEXT_PUBLIC_BASE_URL` when generating callback URLs:

```typescript
const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/stitch/callback/${runId}/${nodeId}`;
```

Never hardcode domains or assume localhost.

### Node ID Consistency

ExecutionNode.id MUST exactly match VisualNode.id:
- Runner logs status updates against these IDs
- Frontend uses these IDs to highlight nodes
- DO NOT rename, sanitize, or modify node IDs during compilation

### Parallel Node Instances

Splitter nodes create parallel instances with suffixes:
- Static node: `worker`
- Parallel instances: `worker_0`, `worker_1`, `worker_2`
- Edge-walker checks for parallel instances before firing static node

### Error Handling

- Worker failures mark node as "failed" but don't crash entire run
- Users can retry specific failed nodes
- All errors logged to database for debugging

## Architecture Diagrams

See related diagrams:
- [Architecture Overview Diagram](../diagrams/architecture-overview.mmd)
- [Execution Flow Sequence](../diagrams/execution-flow.mmd)
- [Type Relationships](../diagrams/type-relationships.mmd)
- [Database Schema](../diagrams/database-schema.mmd)

## Related Documentation

- [Execution Model](./execution-model.md) - Detailed edge-walking execution
- [Data Flow](./data-flow.md) - Request-to-response flows
- [Type System](./type-system.md) - TypeScript type relationships
- [Backend Components](../backend/) - Detailed subsystem documentation
- [Frontend Components](../frontend/) - UI component documentation
- [API Documentation](../api/) - REST endpoint reference
