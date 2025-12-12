# Stitch Implementation Documentation

> **Living Business Model Canvas Orchestration Platform**

Welcome to the comprehensive implementation documentation for Stitch. This guide maps the entire system architecture, from backend execution engines to frontend canvas components, helping you understand and extend the platform.

## 🚀 Quick Start

### For New Developers

1. **Start Here**: Read the [Architecture Overview](architecture/overview.md) to understand the system's core concepts
2. **Understand Execution**: Review the [Execution Model](architecture/execution-model.md) to learn about edge-walking
3. **Explore Components**: Browse [Backend Components](#backend-components) and [Frontend Components](#frontend-components)
4. **Follow a Guide**: Use the [Onboarding Guide](guides/onboarding.md) for step-by-step setup

### Key Concepts

- **Living Business Model Canvas**: A multi-section BMC where entities (customers/leads) travel in real-time
- **Edge-Walking**: Event-driven execution model where completed nodes trigger downstream nodes
- **Async Workers**: All external services (Claude, MiniMax, etc.) communicate via webhooks
- **Database as Source of Truth**: Supabase stores all state; no in-memory state management
- **Visual-First**: If it's not on the canvas, it doesn't exist

## 📚 Documentation Structure

### Architecture Documentation

Core system architecture and design principles:

- **[System Overview](architecture/overview.md)** - High-level architecture, subsystems, and technology stack
- **[Execution Model](architecture/execution-model.md)** - Edge-walking pattern, node status state machine, parallel execution
- **[Data Flow](architecture/data-flow.md)** - Request-to-response flow, database persistence, real-time updates
- **[Type System](architecture/type-system.md)** - TypeScript interfaces, visual vs execution graphs

### Backend Components

Detailed documentation of server-side modules:

- **[Execution Engine](backend/execution-engine.md)** - Edge-walker orchestration, node handlers, status transitions
- **[Database Layer](backend/database-layer.md)** - CRUD operations, schema overview, atomic updates
- **[Worker System](backend/worker-system.md)** - Worker registry, IWorker interface, integrated workers
- **[Canvas System](backend/canvas-system.md)** - Version management, OEG compilation, graph validation
- **[Webhook System](backend/webhook-system.md)** - Webhook processing, adapters, entity creation
- **[AI Manager](backend/ai-manager.md)** - LLM integration, context building, action execution

### Frontend Components

React components and UI architecture:

- **[Canvas Components](frontend/canvas-components.md)** - BMCCanvas, WorkflowCanvas, CanvasRouter
- **[Node Components](frontend/node-components.md)** - All node types (Worker, Splitter, Collector, UX, Section, Item)
- **[Entity Visualization](frontend/entity-visualization.md)** - EntityOverlay, EntityDot, journey animations
- **[React Hooks](frontend/hooks.md)** - useFlow, useEntities, useRunStatus, useCanvasNavigation
- **[Real-Time Features](frontend/real-time.md)** - Supabase subscriptions, state management

### API Documentation

REST endpoints and integration guides:

- **[REST Endpoints Overview](api/rest-endpoints.md)** - Complete API reference with schemas
- **[Canvas API](api/canvas-api.md)** - Canvas management, Mermaid import/export
- **[Workflow API](api/workflow-api.md)** - Run creation, status checking, callbacks
- **[Webhook API](api/webhook-api.md)** - Webhook receiver, configuration, supported sources
- **[AI Manager API](api/ai-manager-api.md)** - Natural language workflow creation

### Visual Diagrams

Mermaid diagrams for visual understanding:

- **[Architecture Overview](diagrams/architecture-overview.mmd)** - Component dependencies and interactions
- **[Execution Flow](diagrams/execution-flow.mmd)** - Workflow execution sequence diagram
- **[Entity Movement](diagrams/entity-movement.mmd)** - Entity journey from webhook to sections
- **[Version Management](diagrams/version-management.mmd)** - Visual graph to execution graph flow
- **[Worker Callback](diagrams/worker-callback.mmd)** - Async worker pattern
- **[Type Relationships](diagrams/type-relationships.mmd)** - TypeScript type hierarchy
- **[Database Schema](diagrams/database-schema.mmd)** - Entity-relationship diagram

### Developer Guides

Step-by-step guides for common tasks:

- **[Onboarding Guide](guides/onboarding.md)** - Setup, architecture overview, common patterns
- **[Adding Workers](guides/adding-workers.md)** - Create and register new worker integrations
- **[Adding Nodes](guides/adding-nodes.md)** - Create custom node components
- **[Entity Features](guides/entity-features.md)** - Build entity tracking and animations
- **[Testing Guide](guides/testing-guide.md)** - Testing patterns and practices
- **[Documentation Maintenance](guides/documentation-maintenance.md)** - How to update and maintain documentation

### Gap Analysis

Current implementation gaps and future work:

- **[Frontend Gaps](gaps/frontend-gaps.md)** - Missing UI components and features
- **[Backend Gaps](gaps/backend-gaps.md)** - Missing API endpoints and features
- **[Testing Gaps](gaps/testing-gaps.md)** - Areas lacking test coverage

## 🏗️ System Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     Stitch Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Frontend   │◄────►│   Next.js    │◄────►│  Supabase │ │
│  │  (React Flow)│      │   API Routes │      │  Database │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                      │                     │       │
│         │                      ▼                     │       │
│         │              ┌──────────────┐              │       │
│         │              │  Execution   │              │       │
│         └─────────────►│   Engine     │◄─────────────┘       │
│                        │ (Edge-Walker)│                      │
│                        └──────────────┘                      │
│                               │                              │
│                               ▼                              │
│                    ┌─────────────────────┐                  │
│                    │  External Workers   │                  │
│                    │ Claude, MiniMax,    │                  │
│                    │ ElevenLabs, etc.    │                  │
│                    └─────────────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Core Patterns

### Edge-Walking Execution

```typescript
// Node completes → Update DB → Read edges → Fire downstream nodes
async function handleNodeCompletion(runId: string, nodeId: string) {
  await updateNodeStatus(runId, nodeId, 'completed');
  const edges = await getOutgoingEdges(nodeId);
  for (const edge of edges) {
    await executeNode(runId, edge.target);
  }
}
```

### Async Worker Pattern

```typescript
// 1. Fire worker (non-blocking)
await fireWorker(nodeId, {
  callbackUrl: `${BASE_URL}/api/stitch/callback/${runId}/${nodeId}`
});

// 2. Worker completes and calls back
// POST /api/stitch/callback/:runId/:nodeId
// { status: 'completed', output: {...} }

// 3. Resume edge-walking
await handleNodeCompletion(runId, nodeId);
```

### Parallel Execution (M-Shape)

```typescript
// Splitter: Fan-out to multiple paths
const items = input.array;
for (const item of items) {
  await executeDownstream(item);
}

// Collector: Fan-in, wait for all upstream
const allCompleted = await checkAllUpstreamComplete(nodeId);
if (allCompleted) {
  await executeNode(nodeId);
}
```

## 🎯 Common Use Cases

### Adding a New Worker Integration

1. Read [Adding Workers Guide](guides/adding-workers.md)
2. Implement `IWorker` interface in `/src/lib/workers/`
3. Register in worker registry
4. Add worker definition schema
5. Test with callback pattern

### Creating a Custom Node Type

1. Read [Adding Nodes Guide](guides/adding-nodes.md)
2. Create component in `/src/components/canvas/nodes/`
3. Extend `BaseNode` component
4. Register in node type registry
5. Add to canvas palette

### Building Entity Features

1. Read [Entity Features Guide](guides/entity-features.md)
2. Understand entity movement patterns
3. Create journey events in database
4. Implement animations in `EntityOverlay`
5. Subscribe to real-time updates

## 📖 Learning Paths

### Backend Developer Path

1. [System Overview](architecture/overview.md)
2. [Execution Model](architecture/execution-model.md)
3. [Execution Engine](backend/execution-engine.md)
4. [Database Layer](backend/database-layer.md)
5. [Worker System](backend/worker-system.md)
6. [Adding Workers Guide](guides/adding-workers.md)

### Frontend Developer Path

1. [System Overview](architecture/overview.md)
2. [Data Flow](architecture/data-flow.md)
3. [Canvas Components](frontend/canvas-components.md)
4. [Node Components](frontend/node-components.md)
5. [Entity Visualization](frontend/entity-visualization.md)
6. [Adding Nodes Guide](guides/adding-nodes.md)

### Full-Stack Developer Path

1. [System Overview](architecture/overview.md)
2. [Execution Model](architecture/execution-model.md)
3. [Data Flow](architecture/data-flow.md)
4. [Type System](architecture/type-system.md)
5. [API Documentation](api/rest-endpoints.md)
6. [Onboarding Guide](guides/onboarding.md)

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Canvas**: @xyflow/react (React Flow)
- **Database**: Supabase (PostgreSQL + Real-time)
- **Workers**: Claude, MiniMax, ElevenLabs, Shotstack, etc.

## 🔍 Finding What You Need

### By Feature

- **Workflow Execution**: [Execution Engine](backend/execution-engine.md), [Execution Flow Diagram](diagrams/execution-flow.mmd)
- **Entity Tracking**: [Entity Visualization](frontend/entity-visualization.md), [Entity Movement Diagram](diagrams/entity-movement.mmd)
- **Canvas Rendering**: [Canvas Components](frontend/canvas-components.md), [Node Components](frontend/node-components.md)
- **Real-Time Updates**: [Real-Time Features](frontend/real-time.md), [Data Flow](architecture/data-flow.md)
- **Worker Integration**: [Worker System](backend/worker-system.md), [Adding Workers Guide](guides/adding-workers.md)
- **Version Management**: [Canvas System](backend/canvas-system.md), [Version Management Diagram](diagrams/version-management.mmd)

### By Component

- **Edge-Walker**: [Execution Engine](backend/execution-engine.md)
- **OEG Compiler**: [Canvas System](backend/canvas-system.md)
- **BMCCanvas**: [Canvas Components](frontend/canvas-components.md)
- **EntityOverlay**: [Entity Visualization](frontend/entity-visualization.md)
- **Worker Registry**: [Worker System](backend/worker-system.md)
- **Webhook Processor**: [Webhook System](backend/webhook-system.md)
- **AI Manager**: [AI Manager](backend/ai-manager.md)

## 📝 Documentation Conventions

### File Naming

- Use kebab-case for file names: `execution-engine.md`
- Diagrams use `.mmd` extension: `architecture-overview.mmd`
- Group related docs in subdirectories

### Cross-References

- Use relative links: `[Execution Model](architecture/execution-model.md)`
- Link to specific sections: `[Edge-Walking](#edge-walking-execution)`
- Reference diagrams: `![Architecture](diagrams/architecture-overview.mmd)`

### Code Examples

- Include TypeScript type annotations
- Show complete, runnable examples
- Reference actual file paths: `/src/lib/engine/edge-walker.ts`

## 🤝 Contributing to Documentation

When updating documentation:

1. Keep files focused on a single topic
2. Update cross-references when moving content
3. Verify all code examples are accurate
4. Test Mermaid diagrams render correctly
5. Update this index when adding new files

## 📞 Getting Help

- **Architecture Questions**: Start with [System Overview](architecture/overview.md)
- **Implementation Questions**: Check relevant [Developer Guide](guides/onboarding.md)
- **API Questions**: See [API Documentation](api/rest-endpoints.md)
- **Gap Analysis**: Review [Gap Analysis](gaps/frontend-gaps.md) for known issues

## 🗺️ Roadmap

See [Gap Analysis](#gap-analysis) section for:
- Planned features
- Known limitations
- Areas needing improvement
- Testing coverage gaps

## ⚡ Quick Reference

### Essential Files

| Component | File Path | Documentation |
|-----------|-----------|---------------|
| Edge-Walker | `/src/lib/engine/edge-walker.ts` | [Execution Engine](backend/execution-engine.md) |
| Node Handlers | `/src/lib/engine/handlers/` | [Execution Engine](backend/execution-engine.md) |
| Worker Registry | `/src/lib/workers/registry.ts` | [Worker System](backend/worker-system.md) |
| OEG Compiler | `/src/lib/canvas/compile-oeg.ts` | [Canvas System](backend/canvas-system.md) |
| Version Manager | `/src/lib/canvas/version-manager.ts` | [Canvas System](backend/canvas-system.md) |
| Graph Validator | `/src/lib/canvas/validate-graph.ts` | [Canvas System](backend/canvas-system.md) |
| Webhook Processor | `/src/lib/webhooks/processor.ts` | [Webhook System](backend/webhook-system.md) |
| Entity Movement | `/src/lib/entities/travel.ts` | [Entity Features](guides/entity-features.md) |
| BMC Canvas | `/src/components/canvas/BMCCanvas.tsx` | [Canvas Components](frontend/canvas-components.md) |
| Workflow Canvas | `/src/components/canvas/WorkflowCanvas.tsx` | [Canvas Components](frontend/canvas-components.md) |
| Canvas Router | `/src/components/canvas/CanvasRouter.tsx` | [Canvas Components](frontend/canvas-components.md) |
| Entity Overlay | `/src/components/canvas/entities/EntityOverlay.tsx` | [Entity Visualization](frontend/entity-visualization.md) |

### Key Database Tables

| Table | Purpose | Documentation |
|-------|---------|---------------|
| `stitch_flows` | Canvas definitions (BMC & workflows) | [Database Layer](backend/database-layer.md) |
| `stitch_flow_versions` | Versioned execution graphs | [Canvas System](backend/canvas-system.md) |
| `stitch_runs` | Workflow execution instances | [Database Layer](backend/database-layer.md) |
| `stitch_entities` | Tracked customers/leads | [Entity Visualization](frontend/entity-visualization.md) |
| `stitch_journey_events` | Entity movement history | [Entity Features](guides/entity-features.md) |
| `stitch_webhook_configs` | Webhook endpoint configurations | [Webhook System](backend/webhook-system.md) |
| `stitch_webhook_events` | Incoming webhook payloads | [Webhook System](backend/webhook-system.md) |

### API Endpoints Quick Reference

| Endpoint | Method | Purpose | Documentation |
|----------|--------|---------|---------------|
| `/api/canvas` | GET | List all canvases | [Canvas API](api/canvas-api.md) |
| `/api/canvas` | POST | Create new canvas | [Canvas API](api/canvas-api.md) |
| `/api/canvas/[id]` | GET | Get canvas by ID | [Canvas API](api/canvas-api.md) |
| `/api/canvas/[id]` | PUT | Update canvas | [Canvas API](api/canvas-api.md) |
| `/api/canvas/[id]/run` | POST | Start workflow execution | [Workflow API](api/workflow-api.md) |
| `/api/runs/[id]` | GET | Get run status | [Workflow API](api/workflow-api.md) |
| `/api/stitch/callback/[runId]/[nodeId]` | POST | Worker callback | [Workflow API](api/workflow-api.md) |
| `/api/webhooks/[endpoint_slug]` | POST | Receive webhook | [Webhook API](api/webhook-api.md) |
| `/api/ai-manager` | POST | Natural language workflow ops | [AI Manager API](api/ai-manager-api.md) |

### Node Types Reference

| Node Type | Purpose | Handler | Documentation |
|-----------|---------|---------|---------------|
| `worker` | External service integration | `WorkerHandler` | [Node Components](frontend/node-components.md) |
| `splitter` | Parallel execution (fan-out) | `SplitterHandler` | [Execution Model](architecture/execution-model.md) |
| `collector` | Parallel join (fan-in) | `CollectorHandler` | [Execution Model](architecture/execution-model.md) |
| `ux` | User interaction point | `UXHandler` | [Node Components](frontend/node-components.md) |
| `section` | BMC section container | N/A | [Canvas Components](frontend/canvas-components.md) |
| `item` | Section item (links to workflow) | N/A | [Canvas Components](frontend/canvas-components.md) |

### Worker Types Reference

| Worker | Service | File | Documentation |
|--------|---------|------|---------------|
| `claude` | Anthropic Claude AI | `/src/lib/workers/claude.ts` | [Worker System](backend/worker-system.md) |
| `minimax` | MiniMax video generation | `/src/lib/workers/minimax.ts` | [Worker System](backend/worker-system.md) |
| `elevenlabs` | ElevenLabs text-to-speech | `/src/lib/workers/elevenlabs.ts` | [Worker System](backend/worker-system.md) |
| `shotstack` | Shotstack video editing | `/src/lib/workers/shotstack.ts` | [Worker System](backend/worker-system.md) |
| `image-to-video` | Image to video conversion | `/src/lib/workers/image-to-video.ts` | [Worker System](backend/worker-system.md) |
| `scene-parser` | Scene parsing | `/src/lib/workers/scene-parser.ts` | [Worker System](backend/worker-system.md) |
| `wireframe-generator` | Wireframe generation | `/src/lib/workers/wireframe-generator.ts` | [Worker System](backend/worker-system.md) |
| `media-library` | Media asset management | `/src/lib/workers/media-library.ts` | [Worker System](backend/worker-system.md) |

### React Hooks Reference

| Hook | Purpose | File | Documentation |
|------|---------|------|---------------|
| `useFlow` | Fetch and manage flow data | `/src/hooks/useFlow.ts` | [React Hooks](frontend/hooks.md) |
| `useEntities` | Track entities in workflow | `/src/hooks/useEntities.ts` | [React Hooks](frontend/hooks.md) |
| `useRunStatus` | Monitor execution status | `/src/hooks/useRunStatus.ts` | [React Hooks](frontend/hooks.md) |
| `useCanvasNavigation` | Handle drill-down navigation | `/src/hooks/useCanvasNavigation.ts` | [React Hooks](frontend/hooks.md) |
| `useRealtimeSubscription` | Supabase real-time updates | `/src/hooks/useRealtimeSubscription.ts` | [React Hooks](frontend/hooks.md) |
| `useEntityMovement` | Entity position tracking | `/src/hooks/useEntityMovement.ts` | [Entity Visualization](frontend/entity-visualization.md) |
| `useJourneyHistory` | Entity journey history | `/src/hooks/useJourneyHistory.ts` | [Entity Features](guides/entity-features.md) |

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_BASE_URL` | Application base URL (for callbacks) | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | For Claude worker |
| `MINIMAX_API_KEY` | MiniMax API key | For MiniMax worker |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | For ElevenLabs worker |
| `SHOTSTACK_API_KEY` | Shotstack API key | For Shotstack worker |

### Common Commands

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server

# Database
npm run db:migrate            # Run Supabase migrations
npm run db:seed               # Seed database with demo data

# Testing
npm run test                  # Run all tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Generate coverage report

# Scripts
npm run script:verify-all     # Verify all system components
npm run script:seed-bmc       # Seed Business Model Canvas
npm run script:seed-demo      # Seed demo journey
```

### Troubleshooting Quick Links

| Issue | Solution | Documentation |
|-------|----------|---------------|
| Node not executing | Check edge-walker logs, verify node status | [Execution Engine](backend/execution-engine.md) |
| Worker callback failing | Verify `NEXT_PUBLIC_BASE_URL` is set | [Worker System](backend/worker-system.md) |
| Entity not moving | Check journey events table | [Entity Features](guides/entity-features.md) |
| Canvas not rendering | Verify OEG compilation | [Canvas System](backend/canvas-system.md) |
| Real-time updates not working | Check Supabase subscription | [Real-Time Features](frontend/real-time.md) |
| Parallel execution stuck | Verify collector node logic | [Execution Model](architecture/execution-model.md) |

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintained By**: Stitch Development Team
