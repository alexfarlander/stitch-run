# Design Document

## Overview

This design outlines the structure and organization of comprehensive implementation documentation for the Stitch orchestration platform. The documentation will be organized into focused, navigable files that map the entire system architecture, identify gaps, and provide clear guidance for frontend developers.

## Architecture

### Documentation Structure

```
/docs/implementation/
├── README.md                          # Master index and navigation
├── architecture/
│   ├── overview.md                    # High-level system architecture
│   ├── execution-model.md             # Edge-walking execution model
│   ├── data-flow.md                   # Data flow through the system
│   └── type-system.md                 # TypeScript type relationships
├── backend/
│   ├── execution-engine.md            # Edge-walker and node handlers
│   ├── database-layer.md              # Database operations and schema
│   ├── worker-system.md               # Worker registry and implementations
│   ├── canvas-system.md               # Version management and OEG compilation
│   ├── webhook-system.md              # Webhook processing and adapters
│   └── ai-manager.md                  # LLM integration and action execution
├── frontend/
│   ├── canvas-components.md           # Canvas rendering components
│   ├── node-components.md             # All node type components
│   ├── entity-visualization.md        # Entity tracking and animations
│   ├── hooks.md                       # React hooks documentation
│   └── real-time.md                   # Supabase subscriptions
├── api/
│   ├── rest-endpoints.md              # All REST API routes
│   ├── canvas-api.md                  # Canvas management endpoints
│   ├── workflow-api.md                # Workflow execution endpoints
│   ├── webhook-api.md                 # Webhook integration endpoints
│   └── ai-manager-api.md              # AI Manager endpoint
├── diagrams/
│   ├── architecture-overview.mmd      # System architecture diagram
│   ├── execution-flow.mmd             # Workflow execution sequence
│   ├── entity-movement.mmd            # Entity movement flow
│   ├── version-management.mmd         # Version creation flow
│   ├── worker-callback.mmd            # Async worker pattern
│   ├── type-relationships.mmd         # TypeScript type diagram
│   └── database-schema.mmd            # Database ERD
├── guides/
│   ├── onboarding.md                  # Developer onboarding guide
│   ├── adding-workers.md              # How to add new workers
│   ├── adding-nodes.md                # How to add new node types
│   ├── entity-features.md             # Building entity features
│   └── testing-guide.md               # Testing patterns and practices
└── gaps/
    ├── frontend-gaps.md               # Missing frontend features
    ├── backend-gaps.md                # Missing backend features
    └── testing-gaps.md                # Areas lacking tests
```

## Components and Interfaces

### Master Index (README.md)

The master index provides:
- Quick navigation to all documentation sections
- Brief description of each section
- Links to key diagrams
- Getting started guide for new developers

### Architecture Documentation

**overview.md**
- System architecture diagram
- Major subsystems and their responsibilities
- Technology stack
- Design principles (edge-walking, database as source of truth, async workers)

**execution-model.md**
- Edge-walking execution model explanation
- Node status state machine
- Parallel execution (Splitter/Collector pattern)
- Execution graph vs visual graph

**data-flow.md**
- Request-to-response flow diagrams
- Database persistence patterns
- Real-time update propagation
- Entity movement through workflows

**type-system.md**
- Core TypeScript interfaces
- Type relationships diagram
- Visual graph vs execution graph types
- Entity and journey types

### Backend Documentation

Each backend module gets its own focused document:

**execution-engine.md**
- Edge-walker orchestration
- Node handler implementations (Worker, Splitter, Collector, UX)
- Status transition validation
- Parallel execution handling

**database-layer.md**
- Database schema overview
- CRUD operations for flows, runs, entities
- Atomic updates and race condition prevention
- Version management database operations

**worker-system.md**
- Worker registry pattern
- IWorker interface
- Integrated worker implementations (Claude, MiniMax, ElevenLabs, Shotstack)
- Worker definitions and schemas

**canvas-system.md**
- Version manager
- OEG compiler
- Graph validation
- Visual graph to execution graph transformation

**webhook-system.md**
- Webhook processor orchestration
- Adapter system for different webhook sources
- Entity extraction and creation
- Workflow triggering from webhooks

**ai-manager.md**
- LLM client integration
- Context builder (stripping UI properties)
- Action executor (parsing LLM responses)
- Workflow creation and modification handlers

### Frontend Documentation

**canvas-components.md**
- CanvasRouter (navigation and view switching)
- BMCCanvas (Business Model Canvas rendering)
- WorkflowCanvas (workflow graph rendering)
- React Flow integration patterns

**node-components.md**
- Node type registry
- BaseNode component
- Worker, Splitter, Collector, UX nodes
- Section and Item nodes for BMC
- Custom node creation guide

**entity-visualization.md**
- EntityOverlay component
- EntityDot rendering
- Journey edge animations
- Entity position calculations
- Real-time entity updates

**hooks.md**
- useFlow (flow data fetching)
- useEntities (entity tracking)
- useRunStatus (execution status)
- useCanvasNavigation (drill-down navigation)
- useRealtimeSubscription (Supabase subscriptions)

**real-time.md**
- Supabase real-time subscription patterns
- Database change propagation
- Optimistic UI updates
- Subscription lifecycle management

### API Documentation

Each API category gets detailed documentation:

**rest-endpoints.md**
- Complete API reference
- Request/response schemas
- Authentication requirements
- Error handling

**canvas-api.md**
- GET /api/canvas (list canvases)
- POST /api/canvas (create canvas)
- Canvas management operations
- Mermaid import/export

**workflow-api.md**
- POST /api/canvas/[id]/run (create run)
- GET /api/runs/[id] (get run status)
- POST /api/stitch/callback/[runId]/[nodeId] (worker callbacks)

**webhook-api.md**
- POST /api/webhooks/[endpoint_slug] (webhook receiver)
- Webhook configuration
- Supported webhook sources (Stripe, Typeform, Calendly, n8n)

**ai-manager-api.md**
- POST /api/ai-manager (natural language requests)
- Action types (CREATE_WORKFLOW, MODIFY_WORKFLOW, RUN_WORKFLOW, GET_STATUS)
- Request/response formats

### Diagrams

All Mermaid diagrams stored as separate .mmd files for reusability:

**architecture-overview.mmd**
- Component dependency diagram
- Shows relationships between major subsystems

**execution-flow.mmd**
- Sequence diagram for workflow execution
- From startRun() through edge-walking to completion

**entity-movement.mmd**
- Entity journey from webhook to section movement
- Visual journey animations

**version-management.mmd**
- Flow from visual graph edit to version creation
- OEG compilation process

**worker-callback.mmd**
- Async worker pattern
- Fire worker → callback → edge-walking

**type-relationships.mmd**
- Class diagram showing TypeScript type hierarchy
- Visual graph, execution graph, entity types

**database-schema.mmd**
- Entity-relationship diagram
- Tables: stitch_flows, stitch_runs, stitch_entities, stitch_flow_versions

### Guides

**onboarding.md**
- Quick start for new developers
- Architecture overview with links
- Common patterns and conventions
- Where to find things

**adding-workers.md**
- Step-by-step guide to create new worker
- Implementing IWorker interface
- Registering in worker registry
- Adding worker definition schema

**adding-nodes.md**
- Creating custom node components
- Registering node types
- Node data structure
- Styling and interactions

**entity-features.md**
- Building entity tracking features
- Entity movement patterns
- Journey event creation
- Animation implementation

**testing-guide.md**
- Testing patterns for Stitch
- Unit testing workers
- Integration testing workflows
- Testing entity movement

### Gap Analysis

**frontend-gaps.md**
- Missing UI components
- Incomplete features
- UX improvements needed
- Entity visualization enhancements

**backend-gaps.md**
- Missing API endpoints
- Incomplete features
- Performance optimizations needed
- Error handling improvements

**testing-gaps.md**
- Areas lacking unit tests
- Missing integration tests
- Property-based testing opportunities
- E2E testing needs

## Data Models

### Documentation Metadata

Each documentation file includes:
- Title and purpose
- Last updated date
- Related files (cross-references)
- Mermaid diagrams (embedded or linked)

### Diagram Format

All diagrams use Mermaid syntax:
- Flowcharts for processes
- Sequence diagrams for interactions
- Class diagrams for types
- ER diagrams for database schema

## Error Handling

Documentation should:
- Clearly mark deprecated features
- Highlight breaking changes
- Document error scenarios
- Provide troubleshooting guides

## Testing Strategy

Documentation quality will be validated by:
- Ensuring all code references are accurate
- Verifying all diagrams render correctly
- Checking all cross-references work
- Confirming examples are runnable
