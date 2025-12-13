# Stitch Platform Architecture

> Generated from codebase analysis - December 2025

## Diagrams

Visual Mermaid diagrams are available in the [diagrams/](diagrams/) folder:

| Diagram | Description |
|---------|-------------|
| [system-overview.mmd](diagrams/system-overview.mmd) | High-level system architecture showing all layers |
| [execution-flow.mmd](diagrams/execution-flow.mmd) | Workflow execution from trigger to completion |
| [data-model.mmd](diagrams/data-model.mmd) | Database entity relationships |
| [dual-graph.mmd](diagrams/dual-graph.mmd) | Visual → Execution graph compilation |
| [node-handlers.mmd](diagrams/node-handlers.mmd) | Node types and their execution patterns |
| [entity-movement.mmd](diagrams/entity-movement.mmd) | Entity state machine and position tracking |
| [worker-callback.mmd](diagrams/worker-callback.mmd) | Async worker callback protocol sequence |
| [canvas-navigation.mmd](diagrams/canvas-navigation.mmd) | Drill-down navigation stack |
| [module-dependencies.mmd](diagrams/module-dependencies.mmd) | Source code module dependencies |

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│             PRESENTATION LAYER (React/Next)             │
│  Pages, Components, Hooks, Canvas Editor                │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│              API LAYER (Next.js Routes)                 │
│  Webhooks, Callbacks, Canvas Management, Execution      │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│         BUSINESS LOGIC LAYER (src/lib)                  │
│  Engine, Canvas, AI, Workers, Navigation, Entities      │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│         DATA PERSISTENCE (Supabase)                     │
│  PostgreSQL with Real-time subscriptions                │
└─────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Dual-Graph Architecture** | Visual graph for design-time editing, execution graph for O(1) runtime performance |
| **Database-as-Source-of-Truth** | Enables workflow resumption, real-time sync, and audit trail |
| **Edge-Walking Algorithm** | Event-driven execution with dependency checking for complex workflows |
| **Flow Versioning** | Immutable snapshots allow safe evolution and run integrity |
| **Worker Callback Protocol** | Decoupled async execution with standardized interface |
| **Entity Journey Tracking** | Visual animation + audit log of entity movement through processes |
| **Stack-based Navigation** | Coherent drill-down experience without history fragmentation |

## Core Components

### Execution Engine (`src/lib/engine/`)
- **edge-walker.ts** - Main orchestration using O(1) graph traversal
- **handlers/** - Node-specific execution (worker, ux, splitter, collector)
- **logger.ts** - Structured execution logging

### Canvas Library (`src/lib/canvas/`)
- **compile-oeg.ts** - Visual → Execution graph compilation
- **validate-graph.ts** - Graph validation (cycles, inputs, workers)
- **version-manager.ts** - Flow versioning operations

### Data Layer (`src/lib/db/`)
- **runs.ts** - Run lifecycle management
- **flows.ts** - Flow CRUD operations
- **entities.ts** - Entity movement and journey tracking
- **webhook-configs.ts** - Webhook configuration

### Workers (`src/lib/workers/`)
- Claude LLM, ElevenLabs TTS, Shotstack Video, MiniMax Video
- Standardized `WorkerPayload` → `WorkerCallback` protocol

## Data Model Summary

- **stitch_flows** - Workflow definitions with canvas_type (bmc/workflow/detail)
- **stitch_flow_versions** - Immutable version snapshots (visual_graph + execution_graph)
- **stitch_runs** - Execution instances with node_states
- **stitch_entities** - Business objects with position tracking
- **stitch_journey_events** - Entity movement audit log
- **stitch_webhook_configs** - External trigger configuration
