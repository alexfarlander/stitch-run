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

## Part 1: Fix Current Implementation

Before adding new features, we need to make what exists actually work.

### 1.1 Debug Seed Scripts

**Problem:** Seeds create data but the canvas doesn't render correctly or workflows don't execute.

**Tasks:**

1. **Verify Database State**
   - Run `scripts/verify-bmc.ts` and fix any failures
   - Run `scripts/verify-video-factory-v2.ts` and fix any failures
   - Check that all foreign key relationships are valid
   - Ensure `canvas_type` values match expected enum

2. **Fix Node Type Mismatches**
   - Seed uses `type: 'section-item'` but components may expect `type: 'item'`
   - Audit all node types in seeds vs registered React Flow nodeTypes
   - Create mapping or normalize to single convention

3. **Fix Parent Node References**
   - Seeds use `parentNode` but some use `parentId`
   - React Flow expects `parentNode` for grouping
   - Standardize across all seeds

4. **Fix Edge References**
   - Ensure all edge source/target IDs exist as node IDs
   - Ross's journey references `e-seo-demo` but that edge doesn't exist in BMC_ITEM_EDGES
   - Add missing edges or fix journey data

**Verification Script:**
```bash
# Create scripts/verify-all.ts
npx tsx scripts/verify-all.ts
```

---

### 1.2 Make Workflows Actually Execute

**Problem:** Worker nodes exist but don't actually call APIs.

**Tasks:**

1. **Test Each Worker Individually**
   ```bash
   # Create scripts/test-worker.ts <worker-name>
   npx tsx scripts/test-worker.ts claude
   npx tsx scripts/test-worker.ts minimax
   npx tsx scripts/test-worker.ts elevenlabs
   npx tsx scripts/test-worker.ts shotstack
   ```

2. **Fix API Key Configuration**
   - Verify all required env vars are documented in `.env.example`
   - Add fallback/mock mode for missing keys
   - Log clear errors when keys are missing

3. **Fix Callback URL Generation**
   - Ensure `NEXT_PUBLIC_BASE_URL` is set correctly
   - Test callback endpoint receives and processes responses
   - Add logging to trace execution flow

4. **Create Simple Test Flow**
   - Single node workflow: `[Input] → [Claude] → [Output]`
   - Verify it runs end-to-end
   - Use this as baseline for debugging

---

### 1.3 Make Canvas Render Correctly

**Problem:** Canvas may not display all nodes/edges or have layout issues.

**Tasks:**

1. **Verify React Flow Node Types**
   - Check `nodeTypes` registration in BMCCanvas
   - Ensure all seed node types have corresponding components
   - Add fallback component for unknown types

2. **Fix Z-Index Issues**
   - Sections should be behind items (zIndex: -1)
   - Items should be interactive (zIndex: 1)
   - Edges should be visible between layers

3. **Fix Entity Overlay**
   - Verify EntityOverlay receives correct viewport transform
   - Test entity dots appear at correct positions
   - Fix any coordinate transformation issues

---

## Part 2: Canvas as Data (The Simple Foundation)

The key insight: **A canvas is just JSON. LLMs are excellent at generating and modifying JSON.**

### 2.1 Canvas JSON Schema

Define a clear, simple schema that both humans and LLMs can understand:

```typescript
// src/types/canvas-schema.ts

interface CanvasSchema {
  name: string;
  canvas_type: 'bmc' | 'workflow' | 'detail';
  graph: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };
}

interface CanvasNode {
  id: string;           // Unique identifier
  type: string;         // Node type (section, item, worker, ux, etc.)
  position: { x: number; y: number };
  data: Record<string, any>;  // Type-specific data
  parentNode?: string;  // For nested nodes
}

interface CanvasEdge {
  id: string;
  source: string;       // Source node ID
  target: string;       // Target node ID
  type?: string;        // Edge type (default, journey, etc.)
}
```

### 2.2 Mermaid ↔ Canvas Conversion

LLMs naturally think in Mermaid. Provide bidirectional conversion:

**Mermaid to Canvas:**
```typescript
// src/lib/canvas/mermaid-parser.ts

function mermaidToCanvas(mermaid: string): CanvasSchema {
  // Parse Mermaid flowchart syntax
  // Extract nodes and edges
  // Generate positions using auto-layout
  // Return CanvasSchema
}

// Example input:
// ```mermaid
// flowchart LR
//   A[Topic Input] --> B[Script Generator]
//   B --> C[Scene Splitter]
//   C --> D1[Video Gen 1]
//   C --> D2[Video Gen 2]
//   D1 --> E[Collector]
//   D2 --> E
// ```
```

**Canvas to Mermaid:**
```typescript
// src/lib/canvas/mermaid-generator.ts

function canvasToMermaid(canvas: CanvasSchema): string {
  // Convert nodes to Mermaid node definitions
  // Convert edges to Mermaid connections
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

### 5.1 Execution Visualization

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

### 5.2 Entity Movement

Entities move through the canvas as workflows execute:

1. **Workflow Triggers Entity Movement**
   - When workflow completes, move entity to next node
   - Use `entityMovement` config on worker nodes
   - Record journey events

2. **Visual Animation**
   - Smooth travel along edges
   - Entity dots with avatars
   - Trail effect showing path

### 5.3 Demo Mode

One-click demo that shows the canvas in action:

```typescript
// src/lib/demo/demo-mode.ts

async function runDemo(canvasId: string) {
  // 1. Reset canvas to initial state
  await resetCanvas(canvasId);
  
  // 2. Spawn demo entities
  await spawnDemoEntities(canvasId);
  
  // 3. Trigger workflows with delays
  for (const entity of demoEntities) {
    await triggerWorkflow(entity);
    await delay(2000);  // Stagger for visual effect
  }
  
  // 4. Let execution play out
  // Real-time updates via Supabase subscriptions
}
```

---

## Implementation Order

### Phase A: Fix What Exists (Priority 1)
1. Debug and fix seed scripts
2. Verify all node types match
3. Test each worker individually
4. Make one simple workflow run end-to-end

### Phase B: Canvas as Data (Priority 2)
1. Define and document CanvasSchema
2. Implement Mermaid parser
3. Implement Mermaid generator
4. Create worker definition format

### Phase C: Canvas Management API (Priority 3)
1. Implement REST API for canvas CRUD
2. Add Mermaid input support
3. Add workflow execution endpoints
4. Add status/monitoring endpoints

### Phase D: AI Manager (Priority 4)
1. Create AI Manager prompt template
2. Implement AIManager class
3. Test with simple workflow creation
4. Add to API as `/api/ai-manager`

### Phase E: CLI (Priority 5)
1. Create stitch-cli package
2. Implement basic commands
3. Add `ai` command for natural language
4. Publish to npm

### Phase F: Living Canvas (Priority 6)
1. Add execution visualization
2. Implement entity movement
3. Create demo mode
4. Polish animations

---

## Key Design Decisions

### Why Mermaid?
- LLMs naturally generate Mermaid
- Human-readable and editable
- Standard format, well-documented
- Easy to convert to/from JSON

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

---

## Success Criteria

### Phase A Complete When:
- [ ] `npx tsx scripts/verify-all.ts` passes
- [ ] Simple Claude workflow runs end-to-end
- [ ] Canvas renders all nodes correctly
- [ ] Entity dots appear at correct positions

### Phase B Complete When:
- [ ] Can create canvas from Mermaid string
- [ ] Can export canvas to Mermaid
- [ ] Worker definitions documented
- [ ] Schema validated with Zod

### Phase C Complete When:
- [ ] All CRUD endpoints work
- [ ] Can run workflow via API
- [ ] Can check status via API
- [ ] Swagger/OpenAPI docs generated

### Phase D Complete When:
- [ ] AI Manager creates valid workflows
- [ ] AI Manager modifies existing workflows
- [ ] AI Manager runs workflows
- [ ] Natural language works for common tasks

### Phase E Complete When:
- [ ] `stitch list` works
- [ ] `stitch create` works with Mermaid
- [ ] `stitch run` executes workflow
- [ ] `stitch ai` processes natural language

### Phase F Complete When:
- [ ] Nodes animate during execution
- [ ] Entities move along edges
- [ ] Demo mode runs automatically
- [ ] Looks impressive in recording

---

## Files to Create/Modify

### New Files
```
src/types/canvas-schema.ts          # Canvas JSON schema
src/lib/canvas/mermaid-parser.ts    # Mermaid → Canvas
src/lib/canvas/mermaid-generator.ts # Canvas → Mermaid
src/lib/canvas/auto-layout.ts       # Position nodes automatically
src/lib/ai-manager/index.ts         # AI Manager class
src/lib/ai-manager/prompts.ts       # Prompt templates
src/app/api/canvas/route.ts         # Canvas CRUD API
src/app/api/canvas/[id]/route.ts    # Single canvas API
src/app/api/canvas/[id]/run/route.ts # Run workflow API
src/app/api/ai-manager/route.ts     # AI Manager API
packages/stitch-cli/                # CLI package
packages/stitch-mcp/                # MCP server (optional)
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
