# Stitch Roadmap 3: AI Manager, CLI & Living Canvas

**Version:** 3.0
**Focus:** Making the canvas truly alive through AI management and CLI control

---

## Vision

Transform Stitch from a visual workflow tool into an **AI-managed living system** where:
1. An AI Manager can build, modify, and control workflows
2. CLI tools (Kiro CLI, Claude Code) can manage the canvas programmatically
3. The canvas actually runs and produces real outputs

**Core Principle:** Keep it simple. The canvas is just JSON. LLMs are good at JSON.

---

## Part 1: Fix Current Implementation: DONE

---

## Part 2: Canvas as Data (The Simple Foundation)

The key insight: **A canvas is just JSON. LLMs are excellent at generating and modifying JSON.**

### 2.1 Database Schema (Normalized with Versioning)

We normalize flow definitions to save storage and track history.

```sql
-- The Container (Metadata)
CREATE TABLE stitch_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  current_version_id uuid,  -- Points to the latest draft/published version
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- The Data (Immutable Versions)
CREATE TABLE stitch_flow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES stitch_flows(id),
  
  -- Visual graph (for UI rendering)
  visual_graph jsonb NOT NULL,  -- Full React Flow JSON with positions
  
  -- Execution graph (optimized for runtime)
  execution_graph jsonb NOT NULL,  -- OEG: stripped, validated, with adjacency map
  
  commit_message text,  -- Optional: "Added Claude node"
  created_at timestamptz DEFAULT now()
);

-- The Execution (Lightweight Reference)
CREATE TABLE stitch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_version_id uuid REFERENCES stitch_flow_versions(id),  -- Reference specific snapshot
  user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'running',
  node_states jsonb DEFAULT '{}',  -- Only stores execution state, not the graph
  created_at timestamptz DEFAULT now()
);
```

**Benefits:**
- `stitch_runs` is lightweight (no graph duplication)
- Old runs reference old versions (safe history)
- Visual and execution graphs separated (UI vs Runtime)

### 2.1.1 Canvas JSON Schema (Visual Graph)

The visual graph is what React Flow renders and what LLMs generate:

```typescript
// src/types/canvas-schema.ts

interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}

interface VisualNode {
  id: string;
  type: string;  // worker, ux, splitter, collector, section, item
  position: { x: number; y: number };
  data: {
    label: string;
    worker_type?: string;  // For worker nodes: claude, minimax, etc.
    config?: Record<string, any>;  // Worker-specific config
    
    // Input/Output schema (for validation and mapping)
    inputs?: Record<string, { type: string; required: boolean }>;
    outputs?: Record<string, { type: string }>;
  };
  parentNode?: string;
  style?: Record<string, any>;  // UI styling
}

interface VisualEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // For nodes with multiple outputs
  targetHandle?: string;  // For nodes with multiple inputs
  type?: string;  // default, journey, etc.
  
  // THE CRUCIAL PART: Data mapping between nodes
  data?: {
    mapping?: EdgeMapping;  // How to wire outputs to inputs
  };
}

// Edge Logic Map - How data flows between nodes
interface EdgeMapping {
  // Maps target node input params to source node output params
  // { targetInputName: sourceOutputPath }
  [targetInput: string]: string;  // JSONPath or simple key
}
```

**Example - Script to Video Edge:**
```typescript
const edge: VisualEdge = {
  id: 'e-script-video',
  source: 'script-generator',
  target: 'video-gen-1',
  data: {
    mapping: {
      // Video Gen needs "prompt", Script outputs "script.scenes[0].visual_prompt"
      'prompt': 'script.scenes[0].visual_prompt',
      'duration': 'script.scenes[0].duration_seconds'
    }
  }
};
```

### 2.1.2 Execution Graph (Optimized for Runtime)

The execution graph is what the Runner uses - stripped of UI, optimized for lookup:

```typescript
// src/types/execution-graph.ts

interface ExecutionGraph {
  // Nodes indexed by ID for O(1) lookup
  nodes: Record<string, ExecutionNode>;
  
  // Adjacency map for instant edge traversal
  adjacency: Record<string, string[]>;  // { sourceId: [targetId1, targetId2] }
  
  // Edge data indexed by "source->target" for mapping lookup
  edgeData: Record<string, EdgeMapping>;  // { "nodeA->nodeB": { mapping } }
  
  // Entry points (nodes with no incoming edges)
  entryNodes: string[];
  
  // Terminal nodes (nodes with no outgoing edges)
  terminalNodes: string[];
}

interface ExecutionNode {
  id: string;
  type: string;
  worker_type?: string;
  config?: Record<string, any>;
  inputs?: Record<string, { type: string; required: boolean }>;
  outputs?: Record<string, { type: string }>;
}
```

**Example Execution Graph:**
```json
{
  "nodes": {
    "input": { "id": "input", "type": "ux" },
    "script": { "id": "script", "type": "worker", "worker_type": "claude" },
    "video": { "id": "video", "type": "worker", "worker_type": "minimax" }
  },
  "adjacency": {
    "input": ["script"],
    "script": ["video"],
    "video": []
  },
  "edgeData": {
    "input->script": { "topic": "value" },
    "script->video": { "prompt": "script.scenes[0].visual_prompt" }
  },
  "entryNodes": ["input"],
  "terminalNodes": ["video"]
}
```

### 2.2 Mermaid ↔ Canvas Conversion

LLMs naturally think in Mermaid. Provide bidirectional conversion:

**Mermaid Limitations:**

Mermaid captures structure but NOT configuration:
```mermaid
flowchart LR
  A[Topic Input] --> B[Claude Script]
  B --> C[Splitter]
```

This doesn't capture:
- What fields does "Topic Input" show?
- What model does "Claude Script" use?
- What's the split count in "Splitter"?
- Entity movement configuration
- Edge mappings (data flow)

**Solution: Hybrid Approach**

Mermaid for quick sketches, JSON configs for details:

```typescript
// src/types/workflow-creation.ts

interface WorkflowCreationRequest {
  // Structure (quick sketch)
  mermaid?: string;
  
  // OR full graph (detailed)
  graph?: VisualGraph;
  
  // Node configurations (optional, enhances Mermaid)
  nodeConfigs?: {
    [nodeId: string]: {
      workerType?: string;
      config?: Record<string, any>;
      entityMovement?: EntityMovementConfig;
    }
  };
  
  // Edge mappings (optional, enhances Mermaid)
  edgeMappings?: {
    [edgeKey: string]: EdgeMapping;  // "A->B": { prompt: "output.text" }
  };
}
```

**Usage Patterns:**

1. **Quick Sketch (Mermaid only):**
   - AI Manager generates Mermaid
   - System infers worker types from labels
   - Default configs applied

2. **Detailed (Mermaid + Configs):**
   - Mermaid for structure
   - nodeConfigs for worker settings
   - edgeMappings for data flow

3. **Full Control (JSON Graph):**
   - Complete VisualGraph with all details
   - Used for complex workflows

**Mermaid to Canvas:**
```typescript
// src/lib/canvas/mermaid-parser.ts

function mermaidToCanvas(
  mermaid: string, 
  nodeConfigs?: Record<string, any>,
  edgeMappings?: Record<string, EdgeMapping>
): VisualGraph {
  // 1. Parse Mermaid flowchart syntax
  // 2. Extract nodes and edges
  // 3. Infer worker types from labels (e.g., "Claude" → worker_type: "claude")
  // 4. Apply nodeConfigs if provided
  // 5. Apply edgeMappings if provided
  // 6. Generate positions using auto-layout
  // 7. Return VisualGraph
}
```

**Canvas to Mermaid:**
```typescript
// src/lib/canvas/mermaid-generator.ts

function canvasToMermaid(canvas: VisualGraph): string {
  // Convert nodes to Mermaid node definitions
  // Convert edges to Mermaid connections
  // Note: Configs are lost in this conversion (structure only)
  // Return Mermaid string
}
```

### 2.3 Worker Definition Format

Simple JSON format for defining workers:

```typescript
// src/types/worker-definition.ts

interface WorkerDefinition {
  id: string;
  name: string;
  type: 'sync' | 'async';
  
  // What the worker needs
  input: {
    [key: string]: {
      type: 'string' | 'number' | 'object' | 'array';
      required: boolean;
      description: string;
    };
  };
  
  // What the worker produces
  output: {
    [key: string]: {
      type: 'string' | 'number' | 'object' | 'array';
      description: string;
    };
  };
  
  // Configuration
  config?: {
    endpoint?: string;
    model?: string;
    [key: string]: any;
  };
}
```

**Example:**
```json
{
  "id": "claude",
  "name": "Claude Script Generator",
  "type": "sync",
  "input": {
    "prompt": { "type": "string", "required": true, "description": "The prompt to send" },
    "topic": { "type": "string", "required": false, "description": "Topic for script generation" }
  },
  "output": {
    "script": { "type": "object", "description": "Generated script with scenes" }
  },
  "config": {
    "model": "claude-3-sonnet-20240229"
  }
}
```

### 2.4 Flow Versioning Strategy

**The "Save & Run" Lifecycle:**

1. **On Save:**
   - Frontend sends graph JSON to `POST /api/flows/[id]/versions`
   - Backend validates and compiles to OEG (see 2.4.1)
   - Backend inserts new row in `stitch_flow_versions`
   - Backend updates `stitch_flows.current_version_id`

2. **On Run:**
   - Backend creates a run linked to `flow_version_id`
   - **Benefit:** `stitch_runs` is lightweight - no graph duplication
   - **Safety:** Old runs reference old versions. If the AI changes the flow today, yesterday's run visualization remains accurate

3. **Auto-Version on Run:**
   - When user clicks "Run", if there are unsaved changes, automatically create a new version first
   - Then execute that version
   - Ensures the run always matches what was on screen
   - Keeps the "One Click" magic alive

### 2.4.1 The Sanitization Step (Lite Compilation to OEG)

We don't compile to code. We compile to an **Optimized Execution Graph (OEG)**.

**When Creating a Version:**

```typescript
// src/lib/canvas/compile-oeg.ts

interface CompileResult {
  success: boolean;
  executionGraph?: ExecutionGraph;
  errors?: ValidationError[];
}

function compileToOEG(visualGraph: VisualGraph): CompileResult {
  // 1. VALIDATION
  const errors = [];
  
  // Check for cycles (would cause infinite loops)
  if (hasCycles(visualGraph)) {
    errors.push({ type: 'cycle', message: 'Graph contains cycles' });
  }
  
  // Check all required inputs have connections
  for (const node of visualGraph.nodes) {
    const incomingEdges = getIncomingEdges(node.id, visualGraph.edges);
    for (const [inputName, inputDef] of Object.entries(node.data.inputs || {})) {
      if (inputDef.required && !hasMapping(inputName, incomingEdges)) {
        errors.push({ 
          type: 'missing_input', 
          node: node.id, 
          input: inputName,
          message: `Required input "${inputName}" has no connection`
        });
      }
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  // 2. OPTIMIZATION - Convert to adjacency map for O(1) lookup
  const adjacency: Record<string, string[]> = {};
  const edgeData: Record<string, EdgeMapping> = {};
  
  for (const edge of visualGraph.edges) {
    if (!adjacency[edge.source]) adjacency[edge.source] = [];
    adjacency[edge.source].push(edge.target);
    
    if (edge.data?.mapping) {
      edgeData[`${edge.source}->${edge.target}`] = edge.data.mapping;
    }
  }
  
  // 3. STRIPPING - Remove UI properties to save DB space
  const nodes: Record<string, ExecutionNode> = {};
  for (const node of visualGraph.nodes) {
    nodes[node.id] = {
      id: node.id,
      type: node.type,
      worker_type: node.data.worker_type,
      config: node.data.config,
      inputs: node.data.inputs,
      outputs: node.data.outputs
      // NO position, style, label, parentNode
    };
  }
  
  // 4. COMPUTE entry and terminal nodes
  const hasIncoming = new Set(visualGraph.edges.map(e => e.target));
  const hasOutgoing = new Set(visualGraph.edges.map(e => e.source));
  
  const entryNodes = Object.keys(nodes).filter(id => !hasIncoming.has(id));
  const terminalNodes = Object.keys(nodes).filter(id => !hasOutgoing.has(id));
  
  return {
    success: true,
    executionGraph: {
      nodes,
      adjacency,
      edgeData,
      entryNodes,
      terminalNodes
    }
  };
}
```

**Why OEG?**
- **Fast Runtime:** Adjacency map = O(1) edge lookup vs O(n) array scan
- **Logic-Focused:** No UI cruft in execution path
- **Storage Efficient:** Stripped graph is ~60% smaller
- **AI-Friendly:** Clean JSON that AI Manager can read/write
- **Validated:** Errors caught at save time, not run time

---

## Part 3: AI Manager

An AI that can build and control workflows through natural language.

### 3.1 Canvas Management API

Simple REST API for canvas operations:

```typescript
// src/app/api/canvas/route.ts

// GET /api/canvas - List all canvases
// POST /api/canvas - Create canvas from JSON or Mermaid
// GET /api/canvas/[id] - Get canvas
// PUT /api/canvas/[id] - Update canvas
// DELETE /api/canvas/[id] - Delete canvas

// POST /api/canvas/[id]/run - Start workflow execution
// GET /api/canvas/[id]/status - Get execution status
```

### 3.2 AI Manager Prompt Template

The AI Manager is just an LLM with a specific system prompt:

```markdown
# Stitch AI Manager

You are an AI that manages Stitch canvases. You can:
1. Create workflows from descriptions
2. Modify existing workflows
3. Start and monitor workflow executions
4. Debug workflow issues

## Available Workers
{worker_definitions_json}

## Current Canvas State
{current_canvas_json}

## Entity Movement Rules (CRITICAL)

Entities are moved BY workflow completion, not vice versa:

1. **Real-world event** → External system detects it (Stripe, Typeform, Calendly)
2. **Webhook fires** → Stitch receives the event
3. **Workflow runs** → Business logic executes
4. **Entity moves** → On workflow completion, entity moves to next node

Worker nodes can have `entityMovement` config:
```json
{
  "entityMovement": {
    "onSuccess": "advance",      // Move to next node via edge
    "onFailure": "stay",         // Stay at current node
    "successNodeId": "node-xyz", // Optional: jump to specific node
    "completeAs": "customer"     // Optional: convert entity type
  }
}
```

When building workflows, always consider:
- "What webhook triggers this workflow?"
- "When this workflow completes, where does the entity go?"
- "What happens on failure?"

## Commands
- CREATE_WORKFLOW: Generate a new workflow from description
- MODIFY_WORKFLOW: Update an existing workflow
- RUN_WORKFLOW: Start workflow execution
- GET_STATUS: Check workflow status

## Output Format
Always respond with valid JSON:
{
  "action": "CREATE_WORKFLOW" | "MODIFY_WORKFLOW" | "RUN_WORKFLOW" | "GET_STATUS",
  "payload": { ... }
}
```

### 3.3 AI Manager Implementation

```typescript
// src/lib/ai-manager/index.ts

class AIManager {
  private llm: LLMClient;  // Claude, GPT, etc.
  
  async processRequest(userRequest: string, canvasId?: string): Promise<AIManagerResponse> {
    // 1. Build context
    const workers = await this.getWorkerDefinitions();
    const canvas = canvasId ? await this.getCanvas(canvasId) : null;
    
    // 2. Build prompt
    const prompt = this.buildPrompt(userRequest, workers, canvas);
    
    // 3. Get LLM response
    const response = await this.llm.complete(prompt);
    
    // 4. Parse and execute action
    const action = JSON.parse(response);
    return this.executeAction(action);
  }
  
  private async executeAction(action: AIManagerAction): Promise<AIManagerResponse> {
    switch (action.action) {
      case 'CREATE_WORKFLOW':
        return this.createWorkflow(action.payload);
      case 'MODIFY_WORKFLOW':
        return this.modifyWorkflow(action.payload);
      case 'RUN_WORKFLOW':
        return this.runWorkflow(action.payload);
      case 'GET_STATUS':
        return this.getStatus(action.payload);
    }
  }
}
```

### 3.4 Natural Language Examples

**User:** "Create a workflow that takes a topic, generates a script with Claude, then creates 4 videos in parallel"

**AI Manager Response:**
```json
{
  "action": "CREATE_WORKFLOW",
  "payload": {
    "name": "Video Generation Pipeline",
    "mermaid": "flowchart LR\n  A[Topic Input] --> B[Claude Script]\n  B --> C[Splitter]\n  C --> D1[Video 1]\n  C --> D2[Video 2]\n  C --> D3[Video 3]\n  C --> D4[Video 4]\n  D1 --> E[Collector]\n  D2 --> E\n  D3 --> E\n  D4 --> E",
    "nodes": [
      { "id": "A", "type": "ux", "data": { "label": "Topic Input" } },
      { "id": "B", "type": "worker", "data": { "worker_type": "claude", "label": "Claude Script" } },
      { "id": "C", "type": "splitter", "data": { "label": "Splitter", "split_count": 4 } },
      { "id": "D1", "type": "worker", "data": { "worker_type": "minimax", "label": "Video 1" } },
      { "id": "D2", "type": "worker", "data": { "worker_type": "minimax", "label": "Video 2" } },
      { "id": "D3", "type": "worker", "data": { "worker_type": "minimax", "label": "Video 3" } },
      { "id": "D4", "type": "worker", "data": { "worker_type": "minimax", "label": "Video 4" } },
      { "id": "E", "type": "collector", "data": { "label": "Collector", "expected_count": 4 } }
    ]
  }
}
```

---

## Part 4: CLI Integration

Enable CLI tools to manage Stitch canvases.

### 4.1 Stitch CLI

Simple CLI that wraps the Canvas Management API:

```bash
# Install
npm install -g stitch-cli

# Commands
stitch list                          # List all canvases
stitch create <name> --from <file>   # Create from JSON/Mermaid file
stitch show <id>                     # Show canvas details
stitch run <id> --input <json>       # Run workflow
stitch status <id>                   # Check status
stitch export <id> --format mermaid  # Export to Mermaid
stitch ai "<request>"                # Natural language command
```

### 4.2 CLI Implementation

```typescript
// packages/stitch-cli/src/index.ts

#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('stitch')
  .description('CLI for managing Stitch canvases')
  .version('1.0.0');

program
  .command('list')
  .description('List all canvases')
  .action(async () => {
    const response = await fetch(`${API_URL}/api/canvas`);
    const canvases = await response.json();
    console.table(canvases);
  });

program
  .command('create <name>')
  .option('--from <file>', 'Create from JSON or Mermaid file')
  .action(async (name, options) => {
    const content = fs.readFileSync(options.from, 'utf-8');
    const isMermaid = options.from.endsWith('.mmd') || content.includes('flowchart');
    
    const response = await fetch(`${API_URL}/api/canvas`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        format: isMermaid ? 'mermaid' : 'json',
        content
      })
    });
    
    const canvas = await response.json();
    console.log(`Created canvas: ${canvas.id}`);
  });

program
  .command('ai <request>')
  .description('Natural language command')
  .action(async (request) => {
    const response = await fetch(`${API_URL}/api/ai-manager`, {
      method: 'POST',
      body: JSON.stringify({ request })
    });
    
    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
  });

program.parse();
```

### 4.3 Kiro CLI Integration

Enable Kiro to manage Stitch through MCP or direct API calls:

**Option A: MCP Server**
```typescript
// packages/stitch-mcp/src/index.ts

// Expose Stitch operations as MCP tools
const tools = [
  {
    name: 'stitch_list_canvases',
    description: 'List all Stitch canvases',
    handler: async () => { /* ... */ }
  },
  {
    name: 'stitch_create_workflow',
    description: 'Create a new workflow from Mermaid or JSON',
    parameters: {
      name: { type: 'string', required: true },
      content: { type: 'string', required: true },
      format: { type: 'string', enum: ['mermaid', 'json'] }
    },
    handler: async (params) => { /* ... */ }
  },
  {
    name: 'stitch_run_workflow',
    description: 'Execute a workflow',
    parameters: {
      canvas_id: { type: 'string', required: true },
      input: { type: 'object' }
    },
    handler: async (params) => { /* ... */ }
  }
];
```

**Option B: Steering Doc**
```markdown
# .kiro/steering/stitch-integration.md

When working with Stitch workflows:

1. Use the Stitch API at ${STITCH_API_URL}
2. Create workflows using Mermaid format
3. Available workers: claude, minimax, elevenlabs, shotstack
4. Always verify workflow execution with status endpoint

Example workflow creation:
```bash
curl -X POST ${STITCH_API_URL}/api/canvas \
  -H "Content-Type: application/json" \
  -d '{"name": "My Workflow", "format": "mermaid", "content": "..."}'
```
```

---

## Part 5: Living Canvas

Make the canvas actually run and produce outputs.

**Key Differentiator:** This is NOT just workflow execution (n8n/Zapier do that). This is a **Business Model Canvas that executes itself, with customers visible traveling through it.**

### 5.1 BMC View Priority (The Differentiator)

The demo should prioritize the BMC view, not just workflow execution:

**What Makes Stitch Different:**
- n8n/Zapier: Workflow execution ✓
- Stitch: Business Model Canvas that executes itself, with customers visible traveling through it

**Demo Flow:**
1. Show BMC canvas with 12 sections
2. Show entities (Monica, Ross, Rachel) at various positions
3. Drill into a section → see the workflow inside
4. Workflow runs → entity moves on BMC
5. Zoom back out → see entity in new position

**Visual Hierarchy:**
```
BMC Canvas (Top Level)
├── Marketing Section
│   ├── LinkedIn Ads (item)
│   ├── YouTube Channel (item)
│   └── [Monica traveling on edge to Sales]
├── Sales Section
│   ├── Demo Call (item) ← [Ross waiting here]
│   └── Email Sequence (item)
├── ... other sections
└── Revenue Section
    └── [Shows MRR calculated from entities]
```

### 5.2 Execution Visualization

Show workflow execution in real-time:

1. **Node Status Updates**
   - Idle → Running → Complete/Error
   - Pulsing animation for running nodes
   - Green glow for complete, red for error

2. **Edge Animation**
   - Data flowing along edges
   - Particles moving from source to target
   - Intensity based on data volume

3. **Output Preview**
   - Side panel showing node outputs
   - Live updates as nodes complete
   - Preview for media (images, videos, audio)

### 5.3 Entity Movement

Entities move through the canvas as workflows execute:

1. **Workflow Triggers Entity Movement**
   - When workflow completes, move entity to next node
   - Use `entityMovement` config on worker nodes
   - Record journey events

2. **Visual Animation**
   - Smooth travel along edges
   - Entity dots with avatars
   - Trail effect showing path

3. **BMC-Level Movement**
   - Entity moves between sections (not just within workflows)
   - Journey visible at BMC level
   - Financial metrics update as entities convert

### 5.4 Demo Mode

One-click demo that shows the canvas in action:

```typescript
// src/lib/demo/demo-mode.ts

async function runDemo(canvasId: string) {
  // 1. Reset canvas to initial state
  await resetCanvas(canvasId);
  
  // 2. Spawn demo entities at various positions
  await spawnDemoEntities(canvasId);
  // Monica: at Paying Customers
  // Ross: at Free Trial
  // Rachel: traveling on edge
  // Phoebe: just entered from YouTube
  
  // 3. Trigger workflows with delays
  for (const entity of demoEntities) {
    await triggerWorkflow(entity);
    await delay(2000);  // Stagger for visual effect
  }
  
  // 4. Let execution play out
  // Real-time updates via Supabase subscriptions
}
```

### 5.5 The Meta-Demo Opportunity

**"Watch Stitch build the demo video... using Stitch."**

This is "Stitch by Stitch" — the system demonstrating itself:

1. AI Manager creates the Video Factory workflow
2. AI Manager runs it with topic: "Explain Stitch in 60 seconds"
3. Video Factory produces the demo video
4. The demo video shows Stitch creating itself

**Why This Matters:**
- Memorable for judges
- Proves the system actually works
- Meta-demonstration is impressive
- Shows AI Manager + Workflow Execution together

**Implementation:**
```typescript
// The meta-demo script
async function metaDemo() {
  // 1. AI Manager creates Video Factory
  const workflow = await aiManager.processRequest(
    "Create a workflow that generates a 60-second explainer video about Stitch"
  );
  
  // 2. Run the workflow
  const run = await startRun(workflow.id, {
    input: { topic: "Stitch: The Living Business Model Canvas" }
  });
  
  // 3. Wait for completion
  await waitForCompletion(run.id);
  
  // 4. The output IS the demo video
  const video = await getRunOutput(run.id);
  return video.url;
}
```

---

## Implementation Order

### Phase A: Fix What Exists (Priority 1)
1. Debug and fix seed scripts
2. Verify all node types match
3. Test each worker individually
4. Make one simple workflow run end-to-end

### Phase B: Schema & Versioning (Priority 2)
1. Define VisualGraph and ExecutionGraph types
2. Implement EdgeMapping for data flow
3. Implement OEG compiler (validate, optimize, strip)
4. Add stitch_flow_versions table
5. Implement version manager (auto-version on run)

### Phase C: Mermaid & Worker Definitions (Priority 3)
1. Implement Mermaid parser with edge mapping support
2. Implement Mermaid generator
3. Create worker definition format
4. Document all workers with input/output schemas

### Phase D: Canvas Management API (Priority 4)
1. Implement REST API for flow CRUD
2. Add version endpoints
3. Add Mermaid input support
4. Add workflow execution endpoints (uses OEG)

### Phase E: AI Manager (Priority 5)
1. Create AI Manager prompt template
2. Implement AIManager class
3. Test with simple workflow creation
4. Add to API as `/api/ai-manager`

### Phase F: CLI (Priority 6)
1. Create stitch-cli package
2. Implement basic commands
3. Add `ai` command for natural language
4. Publish to npm

### Phase G: Living Canvas (Priority 7)
1. Add execution visualization
2. Implement entity movement
3. Create demo mode
4. Polish animations

---

## Key Design Decisions

### Why BMC First, Workflows Second?
The hackathon differentiator is NOT workflow execution (n8n/Zapier do that).

**The differentiator is:**
- A Business Model Canvas that executes itself
- Customers visible traveling through the business
- Real-time metrics calculated from entity positions
- Drill-down from BMC → Workflow → Back to BMC

**Demo Priority:**
1. BMC canvas with entities
2. Entity movement between sections
3. Drill-down to see workflow
4. Workflow execution
5. Entity arrives at new position

### Why Mermaid?
- LLMs naturally generate Mermaid
- Human-readable and editable
- Standard format, well-documented
- Easy to convert to/from JSON
- **Limitation:** Structure only, not config (use hybrid approach)

### Why Hybrid Mermaid + JSON?
- Mermaid for quick sketches (structure)
- JSON configs for details (worker settings, entity movement)
- Best of both worlds
- AI Manager can use either based on complexity

### Why Simple JSON Schema?
- LLMs are excellent at JSON
- Easy to validate
- Easy to diff/merge
- No complex abstractions

### Why REST API?
- Universal access (CLI, web, LLMs)
- Stateless, scalable
- Easy to test and debug
- Works with any client

### Why Not GraphQL/tRPC?
- Adds complexity
- REST is sufficient for CRUD
- LLMs understand REST better
- Simpler to implement

### Why Versioning?
- Runs reference specific versions (safe history)
- Lightweight runs (no graph duplication)
- AI can modify flows without breaking old runs
- Auto-version on run keeps "one click" magic

---

## Success Criteria

### Phase A Complete When:
- [ ] `npx tsx scripts/verify-all.ts` passes
- [ ] Simple Claude workflow runs end-to-end
- [ ] Canvas renders all nodes correctly
- [ ] Entity dots appear at correct positions

### Phase B Complete When:
- [ ] VisualGraph and ExecutionGraph types defined
- [ ] EdgeMapping works for data flow between nodes
- [ ] OEG compiler validates and optimizes graphs
- [ ] stitch_flow_versions table created
- [ ] Auto-version on run works

### Phase C Complete When:
- [ ] Can create canvas from Mermaid string
- [ ] Can export canvas to Mermaid
- [ ] Worker definitions documented with input/output schemas
- [ ] Schema validated with Zod

### Phase D Complete When:
- [ ] All CRUD endpoints work
- [ ] Version endpoints work
- [ ] Can run workflow via API (uses OEG)
- [ ] Can check status via API

### Phase E Complete When:
- [ ] AI Manager creates valid workflows
- [ ] AI Manager modifies existing workflows
- [ ] AI Manager runs workflows
- [ ] Natural language works for common tasks

### Phase F Complete When:
- [ ] `stitch list` works
- [ ] `stitch create` works with Mermaid
- [ ] `stitch run` executes workflow
- [ ] `stitch ai` processes natural language

### Phase G Complete When:
- [ ] Nodes animate during execution
- [ ] Entities move along edges
- [ ] Demo mode runs automatically
- [ ] Looks impressive in recording

---

## Files to Create/Modify

### New Files
```
# Schema & Types
src/types/canvas-schema.ts          # VisualGraph, VisualNode, VisualEdge, EdgeMapping
src/types/execution-graph.ts        # ExecutionGraph, ExecutionNode, adjacency types
src/types/worker-definition.ts      # WorkerDefinition interface

# Canvas Compilation
src/lib/canvas/compile-oeg.ts       # Visual → Execution graph compiler
src/lib/canvas/validate-graph.ts    # Cycle detection, input validation
src/lib/canvas/mermaid-parser.ts    # Mermaid → VisualGraph
src/lib/canvas/mermaid-generator.ts # VisualGraph → Mermaid
src/lib/canvas/auto-layout.ts       # Position nodes automatically

# Versioning
src/lib/canvas/version-manager.ts   # Create/get versions, auto-version on run

# AI Manager
src/lib/ai-manager/index.ts         # AIManager class
src/lib/ai-manager/prompts.ts       # Prompt templates

# API Routes
src/app/api/flows/route.ts                    # Flow CRUD (metadata only)
src/app/api/flows/[id]/route.ts               # Single flow
src/app/api/flows/[id]/versions/route.ts      # Create/list versions
src/app/api/flows/[id]/versions/[vid]/route.ts # Get specific version
src/app/api/flows/[id]/run/route.ts           # Run workflow (auto-versions)
src/app/api/ai-manager/route.ts               # AI Manager endpoint

# CLI & MCP
packages/stitch-cli/                # CLI package
packages/stitch-mcp/                # MCP server (optional)

# Scripts
scripts/verify-all.ts               # Comprehensive verification
scripts/test-worker.ts              # Individual worker testing
```

### Files to Fix
```
scripts/seed-bmc.ts                 # Fix node type mismatches
scripts/seed-video-factory-v2.ts    # Fix edge references
src/components/canvas/BMCCanvas.tsx # Verify nodeTypes registration
src/lib/workers/*.ts                # Add error handling, logging
```

---

## The Simple Path Forward

1. **Fix seeds** → Canvas renders correctly
2. **Test workers** → Workflows execute
3. **Add Mermaid** → LLMs can create workflows
4. **Add API** → CLI can manage canvas
5. **Add AI Manager** → Natural language control
6. **Add animations** → Living canvas

Each step builds on the previous. No step requires complex new abstractions. The canvas is JSON. The API is REST. The AI is just an LLM with a good prompt.

**Keep it simple. Make it work. Then make it beautiful.**
