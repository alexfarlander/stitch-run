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

## Part 2: Canvas as Data (The Simple Foundation): DONE
 
---

## Part 3: AI Manager: DONE

---

## Part 4: CLI Integration: LATER


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
