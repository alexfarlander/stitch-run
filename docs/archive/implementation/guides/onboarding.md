# Developer Onboarding Guide

## Welcome to Stitch

Welcome to the Stitch development team! This guide will help you get up to speed with the codebase, understand the core concepts, and start contributing effectively.

Stitch is a **Living Business Model Canvas** orchestration platform that executes workflows and tracks entities (customers, leads, churned users) as they move through visual canvases in real-time.

## Quick Start

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Supabase Account**: For database and real-time features
- **Git**: For version control

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd stitch-run
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Base URL (for worker callbacks)
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   
   # External Service API Keys (optional for development)
   ANTHROPIC_API_KEY=your-claude-key
   MINIMAX_API_KEY=your-minimax-key
   ELEVENLABS_API_KEY=your-elevenlabs-key
   SHOTSTACK_API_KEY=your-shotstack-key
   ```

4. **Set Up Database**
   
   Run Supabase migrations:
   ```bash
   npx supabase db push
   ```
   
   Or if using local Supabase:
   ```bash
   npx supabase start
   npx supabase db reset
   ```

5. **Seed Demo Data (Optional)**
   
   Load example workflows:
   ```bash
   npm run seed:demo
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verify Installation

1. Navigate to the home page - you should see the Business Model Canvas
2. Click on a section to drill down into workflows
3. Try running a simple workflow to verify execution engine works

## Core Concepts

### The Fractal Canvas

Everything in Stitch is a canvas:

- **Top Level**: 12-section Business Model Canvas (Marketing, Sales, Data, Revenue, etc.)
- **Mid Level**: Each section contains Items (visual representations of tools/processes)
- **Execution Level**: Items link to Workflows (detailed process flows)

**Navigation Pattern**: BMC → Section → Item → Workflow

### Visual-First Philosophy

**If it's not on the canvas, it doesn't exist.**

All business logic is visible in the graph structure. There's no hidden configuration or code that executes outside the visual workflow.

### Entity Tracking

Stitch tracks individual entities (customers, leads, churned users) as they move through workflows:

- Entities appear as dots on the canvas
- Movement is triggered by workflow completion
- Journey history is recorded for analytics
- Real-time visualization shows entity positions

### Database as Source of Truth

Supabase is the single source of truth for all state:

- **No in-memory state management**
- All state changes persisted immediately
- Workflows can resume after server restart
- Real-time UI updates via database subscriptions

### Edge-Walking Execution Model

Workflows execute by "walking" edges from completed nodes:

1. Node completes → Update database
2. Read outbound edges → Find downstream nodes
3. Check dependencies → Verify all upstream nodes completed
4. Fire ready nodes → Execute nodes whose dependencies are satisfied
5. Repeat recursively → Each completion triggers the next wave

**Key Insight**: Execution is event-driven and recursive, not scheduled or polled.

### Async Worker Pattern

All workers are treated as asynchronous to handle long-running operations:

1. **Fire**: Send HTTP POST to worker → Mark node "running" → End process
2. **Resume**: Receive callback → Mark node "completed" → Continue edge-walking

This pattern enables:
- Long-running operations (video generation, AI processing)
- Horizontal scaling (workers can be separate services)
- Fault tolerance (workers can retry independently)

### Parallel Execution (M-Shape)

Stitch supports fan-out/fan-in patterns:

- **Splitter Nodes**: Take array input → Fire multiple parallel paths
- **Collector Nodes**: Wait for all upstream paths → Merge outputs → Continue

Example: Process array of video scenes in parallel, then assemble final video.

## Architecture Overview

### High-Level System Diagram

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

### Major Subsystems

1. **Execution Engine** (`src/lib/engine/`)
   - Edge-walker orchestration
   - Node handlers (Worker, UX, Splitter, Collector)
   - Status transitions and validation

2. **Database Layer** (`src/lib/db/`)
   - CRUD operations for flows, runs, entities
   - Atomic updates and race condition prevention
   - Version management

3. **Worker System** (`src/lib/workers/`)
   - Worker registry and base interface
   - Integrated workers (Claude, MiniMax, ElevenLabs, Shotstack)
   - Worker definitions and schemas

4. **Canvas System** (`src/lib/canvas/`)
   - Version management
   - OEG (Optimized Execution Graph) compilation
   - Graph validation
   - Mermaid import/export

5. **Webhook System** (`src/lib/webhooks/`)
   - Webhook processor
   - Source-specific adapters (Stripe, Typeform, Calendly, n8n)
   - Entity extraction and creation

6. **AI Manager** (`src/lib/ai/`)
   - LLM client integration (Claude)
   - Context builder
   - Action executor
   - Natural language workflow creation

7. **Frontend Components** (`src/components/`)
   - Canvas components (BMCCanvas, WorkflowCanvas, CanvasRouter)
   - Node components (Worker, Splitter, Collector, UX, Section, Item)
   - Entity visualization (EntityOverlay, EntityDot)
   - React hooks (useFlow, useEntities, useRunStatus)

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

## Project Structure

```
stitch-run/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── canvas/         # Canvas management endpoints
│   │   │   ├── stitch/         # Workflow execution endpoints
│   │   │   ├── webhooks/       # Webhook receiver endpoints
│   │   │   └── ai-manager/     # AI Manager endpoint
│   │   ├── canvas/[id]/        # Canvas detail pages
│   │   ├── runs/[runId]/       # Run execution pages
│   │   └── page.tsx            # Home page (BMC)
│   │
│   ├── components/             # React components
│   │   ├── canvas/             # Canvas rendering components
│   │   │   ├── nodes/          # Node type components
│   │   │   ├── entities/       # Entity visualization
│   │   │   └── sections/       # BMC section components
│   │   ├── media/              # Media library components
│   │   └── ui/                 # Reusable UI components
│   │
│   ├── lib/                    # Core business logic
│   │   ├── engine/             # Execution engine
│   │   ├── db/                 # Database operations
│   │   ├── workers/            # Worker implementations
│   │   ├── canvas/             # Canvas system
│   │   ├── webhooks/           # Webhook processing
│   │   ├── ai/                 # AI Manager
│   │   └── entities/           # Entity tracking
│   │
│   ├── hooks/                  # React hooks
│   ├── types/                  # TypeScript type definitions
│   └── stitch/                 # Legacy/migration code
│
├── supabase/                   # Database migrations
│   └── migrations/             # SQL migration files
│
├── docs/                       # Documentation
│   └── implementation/         # Implementation docs (you are here!)
│
├── scripts/                    # Utility scripts
│   ├── seed-*.ts               # Database seeding scripts
│   └── verify-*.ts             # Verification scripts
│
└── public/                     # Static assets
```

## Common Patterns

### Pattern 1: Edge-Walking Execution

The core execution pattern that powers all workflows:

```typescript
// src/lib/engine/edge-walker.ts

export async function walkEdges(
  completedNodeId: string,
  run: StitchRun
): Promise<void> {
  // 1. Load execution graph
  const version = await getVersion(run.flow_version_id);
  const executionGraph = version.execution_graph;
  
  // 2. Check if terminal node
  const staticNodeId = completedNodeId.replace(/_\d+$/, '');
  if (executionGraph.terminalNodes.includes(staticNodeId)) {
    return; // Stop walking
  }
  
  // 3. Get downstream nodes using adjacency map (O(1) lookup)
  const targetNodeIds = executionGraph.adjacency[staticNodeId] || [];
  
  // 4. Fire ready downstream nodes
  for (const targetNodeId of targetNodeIds) {
    if (areUpstreamDependenciesCompleted(targetNodeId, executionGraph, run)) {
      await fireNodeWithGraph(targetNodeId, executionGraph, run);
    }
  }
}
```

**When to use**: This is the core execution loop. You'll interact with it when:
- Adding new node types
- Debugging execution flow
- Implementing custom execution logic

### Pattern 2: Async Worker Pattern

How workers communicate with Stitch:

```typescript
// src/lib/workers/base.ts

export interface IWorker {
  execute(params: WorkerExecuteParams): Promise<WorkerResult>;
}

// Worker implementation
export class ClaudeWorker implements IWorker {
  async execute(params: WorkerExecuteParams): Promise<WorkerResult> {
    // 1. Process the work
    const result = await callClaudeAPI(params.input);
    
    // 2. Return result (will be sent to callback URL)
    return {
      status: 'completed',
      output: result
    };
  }
}

// Callback handler
// POST /api/stitch/callback/:runId/:nodeId
export async function POST(request: Request) {
  const { status, output, error } = await request.json();
  
  // 1. Update node state
  await updateNodeState(runId, nodeId, { status, output, error });
  
  // 2. Resume edge-walking
  if (status === 'completed') {
    await walkEdges(nodeId, run);
  }
}
```

**When to use**: When integrating new external services or workers.

### Pattern 3: Database State Management

All state changes go through the database:

```typescript
// src/lib/db/runs.ts

export async function updateNodeState(
  runId: string,
  nodeId: string,
  updates: Partial<NodeState>
): Promise<void> {
  // 1. Read current state
  const run = await getRun(runId);
  
  // 2. Validate transition (if status change)
  if (updates.status) {
    const currentStatus = run.node_states[nodeId]?.status || 'pending';
    validateTransition(currentStatus, updates.status);
  }
  
  // 3. Update state atomically
  const updatedNodeStates = {
    ...run.node_states,
    [nodeId]: {
      ...run.node_states[nodeId],
      ...updates,
      updated_at: new Date().toISOString()
    }
  };
  
  // 4. Persist to database
  await supabase
    .from('stitch_runs')
    .update({ node_states: updatedNodeStates })
    .eq('id', runId);
}
```

**When to use**: Whenever you need to update execution state, entity positions, or any runtime data.

### Pattern 4: Real-Time UI Updates

Frontend components subscribe to database changes:

```typescript
// src/hooks/useRunStatus.ts

export function useRunStatus(runId: string) {
  const [run, setRun] = useState<StitchRun | null>(null);
  
  useEffect(() => {
    // 1. Initial fetch
    fetchRun(runId).then(setRun);
    
    // 2. Subscribe to changes
    const subscription = supabase
      .channel(`run:${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stitch_runs',
          filter: `id=eq.${runId}`
        },
        (payload) => {
          setRun(payload.new as StitchRun);
        }
      )
      .subscribe();
    
    // 3. Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [runId]);
  
  return run;
}
```

**When to use**: When building UI components that need to reflect real-time execution state.

### Pattern 5: Visual Graph to Execution Graph

Compilation process that optimizes graphs for execution:

```typescript
// src/lib/canvas/compile-oeg.ts

export function compileToExecutionGraph(visualGraph: VisualGraph): ExecutionGraph {
  const executionGraph: ExecutionGraph = {
    nodes: {},
    adjacency: {},
    edgeData: {},
    entryNodes: [],
    terminalNodes: []
  };
  
  // 1. Strip UI properties from nodes
  for (const node of visualGraph.nodes) {
    executionGraph.nodes[node.id] = {
      id: node.id,
      type: node.type,
      config: node.data  // Only keep config, not position/style
    };
  }
  
  // 2. Build adjacency map for O(1) edge lookups
  for (const edge of visualGraph.edges) {
    if (!executionGraph.adjacency[edge.source]) {
      executionGraph.adjacency[edge.source] = [];
    }
    executionGraph.adjacency[edge.source].push(edge.target);
  }
  
  // 3. Identify entry and terminal nodes
  const nodesWithInbound = new Set(visualGraph.edges.map(e => e.target));
  const nodesWithOutbound = new Set(visualGraph.edges.map(e => e.source));
  
  executionGraph.entryNodes = visualGraph.nodes
    .filter(n => !nodesWithInbound.has(n.id))
    .map(n => n.id);
  
  executionGraph.terminalNodes = visualGraph.nodes
    .filter(n => !nodesWithOutbound.has(n.id))
    .map(n => n.id);
  
  return executionGraph;
}
```

**When to use**: When implementing canvas features or modifying graph structure.

### Pattern 6: Entity Movement

Tracking entities as they move through workflows:

```typescript
// src/lib/entities/travel.ts

export async function moveEntityToSection(
  entityId: string,
  targetSectionId: string,
  completeAs: 'success' | 'neutral' | 'failure',
  metadata: { run_id: string; node_id: string },
  setEntityType?: 'customer' | 'lead' | 'churned'
): Promise<void> {
  // 1. Update entity position
  const updates: any = {
    current_section_id: targetSectionId,
    current_node_id: null,
    current_edge_id: null,
    updated_at: new Date().toISOString()
  };
  
  // 2. Optionally convert entity type
  if (setEntityType) {
    updates.entity_type = setEntityType;
  }
  
  await supabase
    .from('stitch_entities')
    .update(updates)
    .eq('id', entityId);
  
  // 3. Record journey event
  await supabase
    .from('stitch_journey_events')
    .insert({
      entity_id: entityId,
      event_type: 'section_arrival',
      section_id: targetSectionId,
      complete_as: completeAs,
      metadata
    });
}
```

**When to use**: When implementing features that track customer journeys or conversion funnels.

## Common Tasks

### Adding a New Worker

1. Create worker implementation in `src/lib/workers/`:
   ```typescript
   // src/lib/workers/my-worker.ts
   export class MyWorker implements IWorker {
     async execute(params: WorkerExecuteParams): Promise<WorkerResult> {
       // Implementation
     }
   }
   ```

2. Register in worker registry:
   ```typescript
   // src/lib/workers/registry.ts
   import { MyWorker } from './my-worker';
   
   export const WORKER_REGISTRY: Record<string, IWorker> = {
     // ...existing workers
     'my-worker': new MyWorker()
   };
   ```

3. Add worker definition schema (for UI configuration)

4. Test with callback pattern

See [Adding Workers Guide](./adding-workers.md) for detailed steps.

### Creating a Custom Node Type

1. Create node component in `src/components/canvas/nodes/`:
   ```typescript
   // src/components/canvas/nodes/MyNode.tsx
   export function MyNode({ data }: NodeProps) {
     return (
       <BaseNode {...data}>
         {/* Custom node UI */}
       </BaseNode>
     );
   }
   ```

2. Register in node type registry

3. Add to canvas palette

4. Implement node handler if needed

See [Adding Nodes Guide](./adding-nodes.md) for detailed steps.

### Debugging Workflow Execution

1. **Check Run State**:
   ```typescript
   const run = await getRun(runId);
   console.log('Node States:', run.node_states);
   ```

2. **Verify Execution Graph**:
   ```typescript
   const version = await getVersion(run.flow_version_id);
   console.log('Adjacency:', version.execution_graph.adjacency);
   console.log('Entry Nodes:', version.execution_graph.entryNodes);
   ```

3. **Trace Edge-Walking**:
   - Add logging to `walkEdges()` function
   - Check which nodes are being fired
   - Verify dependency checking logic

4. **Check Database State**:
   - Query `stitch_runs` table directly
   - Verify `node_states` JSONB column
   - Check for stale "running" nodes

### Testing Entity Movement

1. **Create Test Entity**:
   ```typescript
   const entity = await createEntity({
     name: 'Test Customer',
     email: 'test@example.com',
     entity_type: 'lead',
     current_section_id: 'marketing-section'
   });
   ```

2. **Start Workflow with Entity**:
   ```typescript
   const run = await startRun(flowId, {
     entityId: entity.id,
     trigger: { type: 'manual', source: 'test' }
   });
   ```

3. **Verify Journey Events**:
   ```typescript
   const events = await supabase
     .from('stitch_journey_events')
     .select('*')
     .eq('entity_id', entity.id)
     .order('created_at', { ascending: true });
   ```

## Styling and Design System

### Overview

Stitch uses **Tailwind CSS v4** as its primary styling solution, combined with **Radix UI** primitives for accessible, unstyled components. The design philosophy emphasizes:

- **Utility-first styling**: Compose styles using Tailwind utility classes
- **Component-based design**: Reusable UI components in `src/components/ui/`
- **Accessibility**: Built on Radix UI primitives with ARIA support
- **Consistency**: Shared design tokens via Tailwind configuration
- **Visual clarity**: Clean, modern interface that emphasizes the canvas

### Tailwind CSS Approach

#### Configuration

Tailwind is configured in `tailwind.config.ts` with custom design tokens:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Custom color palette
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... more colors
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};
```

#### CSS Variables

Design tokens are defined as CSS variables in `src/app/globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode values */
  }
}
```

**Why CSS Variables?**
- Easy theme switching (light/dark mode)
- Runtime customization
- Consistent color palette across components

#### Utility-First Styling

Style components by composing Tailwind utility classes:

```tsx
// ✅ GOOD - Utility-first approach
export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
      {children}
    </button>
  );
}

// ❌ AVOID - Custom CSS files
// Don't create separate .css files for component styles
```

#### Responsive Design

Use Tailwind's responsive prefixes:

```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</div>

<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive text sizing */}
</div>
```

#### Common Utility Patterns

**Spacing**:
```tsx
// Padding: p-{size}, px-{size}, py-{size}, pt-{size}, etc.
<div className="p-4 px-6 py-2">

// Margin: m-{size}, mx-{size}, my-{size}, mt-{size}, etc.
<div className="mt-4 mb-8 mx-auto">

// Gap (for flex/grid): gap-{size}
<div className="flex gap-4">
```

**Layout**:
```tsx
// Flexbox
<div className="flex items-center justify-between gap-4">

// Grid
<div className="grid grid-cols-3 gap-4">

// Positioning
<div className="relative">
  <div className="absolute top-0 right-0">
```

**Colors**:
```tsx
// Background
<div className="bg-background text-foreground">

// Borders
<div className="border border-border rounded-md">

// Hover states
<button className="bg-primary hover:bg-primary/90">
```

**Typography**:
```tsx
// Text sizing
<h1 className="text-3xl font-bold">
<p className="text-sm text-muted-foreground">

// Text alignment
<div className="text-center md:text-left">
```

### Component Styling Patterns

#### Pattern 1: Base UI Components

Reusable components in `src/components/ui/` follow a consistent pattern:

```tsx
// src/components/ui/button.tsx
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        
        // Variant styles
        {
          "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
          "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
          "border border-input bg-background hover:bg-accent": variant === "outline",
          "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
        },
        
        // Size styles
        {
          "h-10 px-4 py-2": size === "default",
          "h-9 px-3 text-sm": size === "sm",
          "h-11 px-8": size === "lg",
        },
        
        // Allow custom classes
        className
      )}
      {...props}
    />
  );
}
```

**Key Principles**:
- Use `cn()` utility to merge class names
- Support variants and sizes via props
- Allow className override for customization
- Maintain accessibility attributes

#### Pattern 2: Canvas Node Styling

Canvas nodes have specific styling requirements:

```tsx
// src/components/canvas/nodes/WorkerNode.tsx
export function WorkerNode({ data }: NodeProps) {
  const status = data.status || 'pending';
  
  return (
    <div
      className={cn(
        // Base node styles
        "min-w-[200px] rounded-lg border-2 bg-background shadow-md",
        "transition-all duration-200",
        
        // Status-based border colors
        {
          "border-gray-300": status === "pending",
          "border-blue-500 shadow-blue-500/20": status === "running",
          "border-green-500 shadow-green-500/20": status === "completed",
          "border-red-500 shadow-red-500/20": status === "failed",
        }
      )}
    >
      {/* Node header */}
      <div className="px-4 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{data.label}</span>
          <StatusBadge status={status} />
        </div>
      </div>
      
      {/* Node body */}
      <div className="p-4">
        {/* Node content */}
      </div>
      
      {/* React Flow handles */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

**Node Styling Guidelines**:
- Use status-based colors for visual feedback
- Maintain consistent sizing (min-width, padding)
- Add subtle shadows for depth
- Use transitions for smooth state changes
- Keep handles visible and accessible

#### Pattern 3: Entity Visualization

Entity dots and overlays use absolute positioning:

```tsx
// src/components/canvas/entities/EntityDot.tsx
export function EntityDot({ entity, position }: EntityDotProps) {
  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className={cn(
          "w-3 h-3 rounded-full border-2 border-white shadow-lg",
          "transition-all duration-300",
          {
            "bg-blue-500": entity.entity_type === "lead",
            "bg-green-500": entity.entity_type === "customer",
            "bg-red-500": entity.entity_type === "churned",
          }
        )}
      />
      
      {/* Entity label on hover */}
      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <div className="px-2 py-1 bg-black/80 text-white text-xs rounded">
          {entity.name}
        </div>
      </div>
    </div>
  );
}
```

**Entity Styling Guidelines**:
- Use absolute positioning with inline styles (dynamic positions)
- Use Tailwind for colors, borders, shadows
- Add z-index for proper layering
- Use pointer-events-none to avoid blocking canvas interactions
- Animate transitions for smooth movement

#### Pattern 4: Form Components

Forms use Radix UI primitives with Tailwind styling:

```tsx
// Example form component
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function WorkerConfigForm() {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="worker-name">Worker Name</Label>
        <Input
          id="worker-name"
          placeholder="Enter worker name"
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="api-key">API Key</Label>
        <Input
          id="api-key"
          type="password"
          placeholder="Enter API key"
          className="w-full"
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit">
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
```

**Form Styling Guidelines**:
- Use `space-y-{size}` for vertical spacing
- Always include labels for accessibility
- Use semantic HTML (form, label, input)
- Group related fields with consistent spacing
- Align buttons to the right for actions

### Design Tokens

#### Color Palette

**Semantic Colors**:
- `background` / `foreground` - Base page colors
- `primary` / `primary-foreground` - Primary actions, emphasis
- `secondary` / `secondary-foreground` - Secondary actions
- `muted` / `muted-foreground` - Subtle backgrounds, disabled text
- `accent` / `accent-foreground` - Hover states, highlights
- `destructive` / `destructive-foreground` - Errors, dangerous actions
- `border` - Borders, dividers
- `input` - Input borders
- `ring` - Focus rings

**Status Colors** (for nodes and entities):
- `gray` - Pending state
- `blue` - Running/in-progress state
- `green` - Success/completed state
- `red` - Error/failed state
- `yellow` - Warning state

#### Spacing Scale

Tailwind's default spacing scale (1 unit = 0.25rem = 4px):
- `1` = 4px
- `2` = 8px
- `4` = 16px
- `6` = 24px
- `8` = 32px
- `12` = 48px
- `16` = 64px

**Common Spacing Patterns**:
- Component padding: `p-4` (16px)
- Section spacing: `space-y-6` (24px between items)
- Button padding: `px-4 py-2` (16px horizontal, 8px vertical)
- Card padding: `p-6` (24px)

#### Typography Scale

```tsx
// Headings
<h1 className="text-4xl font-bold">      // 36px
<h2 className="text-3xl font-bold">      // 30px
<h3 className="text-2xl font-semibold">  // 24px
<h4 className="text-xl font-semibold">   // 20px

// Body text
<p className="text-base">                // 16px (default)
<p className="text-sm">                  // 14px
<p className="text-xs">                  // 12px

// Muted text
<span className="text-sm text-muted-foreground">
```

#### Border Radius

- `rounded-sm` - Small radius (calc(var(--radius) - 4px))
- `rounded-md` - Medium radius (calc(var(--radius) - 2px))
- `rounded-lg` - Large radius (var(--radius))
- `rounded-full` - Fully rounded (for circles, pills)

### Component Library

Stitch uses a curated set of UI components from `src/components/ui/`:

**Layout Components**:
- `Card` - Container with border and shadow
- `Separator` - Horizontal or vertical divider
- `ScrollArea` - Scrollable container with custom scrollbar

**Form Components**:
- `Button` - Primary action button
- `Input` - Text input field
- `Textarea` - Multi-line text input
- `Select` - Dropdown select
- `Checkbox` - Checkbox input
- `RadioGroup` - Radio button group
- `Switch` - Toggle switch
- `Label` - Form label

**Feedback Components**:
- `Alert` - Informational message
- `Badge` - Status indicator
- `Progress` - Progress bar
- `Spinner` - Loading indicator
- `Toast` - Notification popup (via Sonner)

**Overlay Components**:
- `Dialog` - Modal dialog
- `Sheet` - Slide-out panel
- `Popover` - Floating content
- `Tooltip` - Hover tooltip
- `DropdownMenu` - Dropdown menu
- `ContextMenu` - Right-click menu

**Navigation Components**:
- `Tabs` - Tab navigation
- `Breadcrumb` - Breadcrumb navigation
- `NavigationMenu` - Top navigation

### Best Practices

#### DO ✅

1. **Use semantic color tokens**:
   ```tsx
   <div className="bg-background text-foreground border border-border">
   ```

2. **Compose utilities for variants**:
   ```tsx
   const variants = {
     default: "bg-primary text-primary-foreground",
     outline: "border border-input bg-background",
   };
   ```

3. **Use the `cn()` utility for conditional classes**:
   ```tsx
   import { cn } from "@/lib/utils";
   
   <div className={cn("base-class", condition && "conditional-class")}>
   ```

4. **Maintain accessibility**:
   ```tsx
   <button
     aria-label="Close dialog"
     className="focus-visible:ring-2 focus-visible:ring-ring"
   >
   ```

5. **Use responsive design**:
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
   ```

#### DON'T ❌

1. **Don't create custom CSS files**:
   ```css
   /* ❌ Avoid separate .css files */
   .my-component {
     background: blue;
   }
   ```

2. **Don't use inline styles for static values**:
   ```tsx
   {/* ❌ Use Tailwind instead */}
   <div style={{ padding: '16px', margin: '8px' }}>
   
   {/* ✅ Better */}
   <div className="p-4 m-2">
   ```

3. **Don't hardcode colors**:
   ```tsx
   {/* ❌ Avoid hardcoded colors */}
   <div className="bg-[#3b82f6]">
   
   {/* ✅ Use semantic tokens */}
   <div className="bg-primary">
   ```

4. **Don't ignore dark mode**:
   ```tsx
   {/* ❌ Light mode only */}
   <div className="bg-white text-black">
   
   {/* ✅ Semantic colors work in both modes */}
   <div className="bg-background text-foreground">
   ```

5. **Don't over-nest components**:
   ```tsx
   {/* ❌ Too many wrapper divs */}
   <div><div><div><div>Content</div></div></div></div>
   
   {/* ✅ Flatten when possible */}
   <div className="p-4">Content</div>
   ```

### Canvas-Specific Styling

#### React Flow Customization

Customize React Flow appearance in `globals.css`:

```css
/* React Flow custom styles */
.react-flow__node {
  /* Nodes are styled via component classes */
}

.react-flow__edge-path {
  stroke: hsl(var(--border));
  stroke-width: 2;
}

.react-flow__edge.selected .react-flow__edge-path {
  stroke: hsl(var(--primary));
  stroke-width: 3;
}

.react-flow__handle {
  width: 10px;
  height: 10px;
  background: hsl(var(--primary));
  border: 2px solid hsl(var(--background));
}
```

#### Canvas Background

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  className="bg-muted/30"
>
  <Background
    color="hsl(var(--border))"
    gap={16}
    size={1}
  />
  <Controls />
  <MiniMap />
</ReactFlow>
```

### Dark Mode Support

All components automatically support dark mode via CSS variables:

```tsx
// No special code needed - semantic colors adapt automatically
<div className="bg-background text-foreground">
  <Card className="border-border">
    <Button className="bg-primary text-primary-foreground">
      Click me
    </Button>
  </Card>
</div>
```

To toggle dark mode (if implemented):

```tsx
// Example dark mode toggle
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="outline"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      Toggle Theme
    </Button>
  );
}
```

### Animation and Transitions

Use Tailwind's transition utilities for smooth interactions:

```tsx
// Hover transitions
<button className="bg-primary hover:bg-primary/90 transition-colors">

// Transform transitions
<div className="scale-100 hover:scale-105 transition-transform">

// Multiple properties
<div className="transition-all duration-200 ease-in-out">

// Custom timing
<div className="transition-opacity duration-500">
```

**Common Animation Patterns**:
- Button hover: `transition-colors duration-200`
- Modal entrance: `transition-opacity duration-300`
- Entity movement: `transition-all duration-300`
- Node status change: `transition-all duration-200`

### Styling Checklist

When creating new components, ensure:

- [ ] Uses semantic color tokens (not hardcoded colors)
- [ ] Supports dark mode automatically
- [ ] Includes focus states for accessibility
- [ ] Uses responsive design where appropriate
- [ ] Follows spacing conventions (p-4, gap-4, etc.)
- [ ] Uses `cn()` utility for conditional classes
- [ ] Maintains consistent border radius
- [ ] Includes hover/active states for interactive elements
- [ ] Uses appropriate typography scale
- [ ] Avoids custom CSS files

### Resources

- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **Radix UI Documentation**: https://www.radix-ui.com/
- **shadcn/ui Components**: https://ui.shadcn.com/ (inspiration for our UI components)
- **Color Palette Tool**: https://uicolors.app/create

---

## Development Workflow

### Daily Development

1. **Pull Latest Changes**:
   ```bash
   git pull origin main
   npm install  # If dependencies changed
   ```

2. **Run Database Migrations** (if any):
   ```bash
   npx supabase db push
   ```

3. **Start Dev Server**:
   ```bash
   npm run dev
   ```

4. **Run Tests** (before committing):
   ```bash
   npm test
   ```

### Creating a Feature Branch

```bash
git checkout -b feature/my-feature-name
# Make changes
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature-name
# Create pull request
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/engine/edge-walker.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Database Migrations

When you need to modify the database schema:

1. Create migration file:
   ```bash
   npx supabase migration new my_migration_name
   ```

2. Write SQL in `supabase/migrations/XXXXXX_my_migration_name.sql`

3. Apply migration:
   ```bash
   npx supabase db push
   ```

4. Verify migration:
   ```bash
   npx supabase db diff
   ```

## Critical Implementation Details

### Callback URL Construction

**ALWAYS** prepend `process.env.NEXT_PUBLIC_BASE_URL` when generating callback URLs:

```typescript
// ✅ CORRECT
const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/stitch/callback/${runId}/${nodeId}`;

// ❌ WRONG - Never hardcode domains
const callbackUrl = `http://localhost:3000/api/stitch/callback/${runId}/${nodeId}`;
```

This ensures callbacks work in all environments (local, staging, production).

### Node ID Consistency

ExecutionNode.id MUST exactly match VisualNode.id:

- Runner logs status updates against these IDs
- Frontend uses these IDs to highlight nodes
- **DO NOT** rename, sanitize, or modify node IDs during compilation

### Parallel Node Instances

Splitter nodes create parallel instances with suffixes:

- Static node: `worker`
- Parallel instances: `worker_0`, `worker_1`, `worker_2`
- Edge-walker checks for parallel instances before firing static node

### Error Handling

- Worker failures mark node as "failed" but don't crash entire run
- Users can retry specific failed nodes
- All errors logged to database for debugging

## Troubleshooting

### Common Issues

**Issue**: Workflow execution stops unexpectedly

**Solution**:
1. Check run state: `SELECT * FROM stitch_runs WHERE id = 'run-id'`
2. Look for nodes stuck in "running" state
3. Check for errors in node_states JSONB
4. Verify callback URLs are reachable

---

**Issue**: Entity not moving through workflow

**Solution**:
1. Verify entity is attached to run: `run.entity_id`
2. Check entity movement configuration in worker nodes
3. Query journey events: `SELECT * FROM stitch_journey_events WHERE entity_id = 'entity-id'`
4. Verify target section exists

---

**Issue**: Real-time updates not working

**Solution**:
1. Check Supabase connection in browser console
2. Verify subscription is active: `subscription.state`
3. Check database permissions for real-time
4. Ensure table has REPLICA IDENTITY FULL

---

**Issue**: Worker callback not received

**Solution**:
1. Verify callback URL is correct and reachable
2. Check worker logs for errors
3. Verify webhook endpoint is accessible from worker
4. Test callback manually with curl/Postman

### Getting Help

- **Architecture Questions**: Read [Architecture Overview](../architecture/overview.md)
- **Execution Questions**: Read [Execution Model](../architecture/execution-model.md)
- **API Questions**: Read [API Documentation](../api/rest-endpoints.md)
- **Component Questions**: Read relevant [Backend](../backend/) or [Frontend](../frontend/) docs

## Next Steps

Now that you're set up, here are recommended learning paths:

### Backend Developer Path

1. Read [System Overview](../architecture/overview.md)
2. Read [Execution Model](../architecture/execution-model.md)
3. Read [Execution Engine](../backend/execution-engine.md)
4. Read [Database Layer](../backend/database-layer.md)
5. Read [Worker System](../backend/worker-system.md)
6. Try [Adding a Worker](./adding-workers.md)

### Frontend Developer Path

1. Read [System Overview](../architecture/overview.md)
2. Read [Data Flow](../architecture/data-flow.md)
3. Read [Canvas Components](../frontend/canvas-components.md)
4. Read [Node Components](../frontend/node-components.md)
5. Read [Entity Visualization](../frontend/entity-visualization.md)
6. Try [Adding a Node](./adding-nodes.md)

### Full-Stack Developer Path

1. Read [System Overview](../architecture/overview.md)
2. Read [Execution Model](../architecture/execution-model.md)
3. Read [Data Flow](../architecture/data-flow.md)
4. Read [Type System](../architecture/type-system.md)
5. Read [API Documentation](../api/rest-endpoints.md)
6. Build a complete feature end-to-end

## Additional Resources

### Documentation

- [Architecture Documentation](../architecture/) - Core system design
- [Backend Components](../backend/) - Server-side modules
- [Frontend Components](../frontend/) - UI components
- [API Documentation](../api/) - REST endpoints
- [Visual Diagrams](../diagrams/) - Mermaid diagrams

### Code Examples

- `scripts/seed-*.ts` - Example workflow definitions
- `src/lib/workers/` - Worker implementation examples
- `src/components/canvas/nodes/` - Node component examples

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Flow Documentation](https://reactflow.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Welcome aboard!** If you have questions, don't hesitate to ask the team or consult the documentation.

**Last Updated**: December 2024  
**Maintained By**: Stitch Development Team
