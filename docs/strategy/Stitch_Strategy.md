
---

# **Stitch — Complete System Blueprint v2**

**Version:** 2.0 (Kiroween Build) **Philosophy:** The canvas IS the logic. Stitch manages, workers work. **Tagline:** Make your canvas run.

---

## **1\. What Stitch Is**

Stitch makes your canvas run.

It's a visual routing layer that connects AI services, scrapers, APIs, and human checkpoints into executable flows. You draw the logic. External systems do the work. Stitch commands them and shows you what's happening.

**Stitch does:**

* Store visual graphs (React Flow → JSON)  
* Trigger external workers via webhooks when nodes complete  
* Receive callbacks when workers finish  
* Show real-time status on the canvas  
* Parse Mermaid diagrams into executable graphs  
* Fan out parallel work (Splitter nodes)  
* Collect parallel results (Collector nodes)

**Stitch does NOT:**

* Execute business logic (workers do that)  
* Hold state in memory (database is truth)  
* Compete with n8n/Zapier (those are workers, Stitch is the manager)

---

## **2\. The Frankenstein Thesis**

The hackathon category says: *"Stitch together a chimera of technologies into one app."*

**The Video Factory stitches:**

| Layer | Technology | Role |
| ----- | ----- | ----- |
| Canvas | React Flow | Visual interface |
| State | Supabase Realtime | Live updates |
| Script | Claude API | Reasoning |
| Video | MiniMax Hailuo | Scene generation |
| Voice | ElevenLabs | Narration |
| Music | Kie.ai (Suno) | Background audio |
| Assembly | Shotstack | Final render |

Seven technologies. One creature. The canvas is the operating table.

---

## **3\. Core Architecture: The M-Shape**

UX SPINE (human's journey — linear, gates)  
═══════════════════════════════════════════════════════════════════════════  
\[Topic\] → \[Script Review\] → \[Scene Review\] → \[Final Preview\] → \[Export\]  
    │            │                │                 ↑  
    ↓            ↓                ↓                 │  
\[Script AI\]  \[Splitter\]      \[Collector\]───────────┘  
                 │                ↑  
                 ↓                │  
         ┌──────┴──────┐         │  
         ↓      ↓      ↓         │  
      \[Vid1\] \[Vid2\] \[Vid3\]       │  
      \[Vox1\] \[Vox2\] \[Vox3\]       │  
         │      │      │         │  
         ↓      ↓      ↓         │  
      \[Mix1\] \[Mix2\] \[Mix3\]───────┘

WORKERS (perpendicular — async, callback)

**Key insight:** UX and workers run perpendicular.

* **Horizontal spine:** Human's journey. Review gates.  
* **Vertical sticks:** Parallel workers, fire and callback.  
* **Splitter:** One input → many parallel workers.  
* **Collector:** Many inputs → one output (waits for all).

---

## **4\. The Protocol**

Minimal contract for any worker to be Stitch-compatible:

**Outbound (Stitch → Worker):**

{  
  "runId": "uuid",  
  "nodeId": "string",  
  "input": { },  
  "callbackUrl": "https://app.stitch.run/api/stitch/callback/{runId}/{nodeId}"  
}

**Inbound (Worker → Stitch):**

{  
  "status": "done | error",  
  "output": { }  
}

That's it. MiniMax, ElevenLabs, Shotstack — all support this pattern.

---

## **5\. Node Types**

| Type | Behavior | Examples |
| ----- | ----- | ----- |
| **UX** | Stops execution. Human reviews/inputs. | Topic input, script review |
| **Worker** | Fires webhook, waits for callback. | AI calls, video gen |
| **Logic** | Evaluates condition, routes edges. | If/else, switches |
| **Gate** | UX node with `waitFor`. Blocks until ready. | Final preview |
| **Splitter** | Takes array, spawns parallel workers. | Script → scenes |
| **Collector** | Waits for N inputs, combines output. | Scenes → assembly |

---

## **6\. Database Schema**

create table stitch\_flows (  
  id uuid primary key default gen\_random\_uuid(),  
  name text not null,  
  graph jsonb not null,  
  user\_id uuid references auth.users(id),  
  created\_at timestamptz default now(),  
  updated\_at timestamptz default now()  
);

create table stitch\_runs (  
  id uuid primary key default gen\_random\_uuid(),  
  flow\_id uuid references stitch\_flows(id),  
  user\_id uuid references auth.users(id),  
  status text default 'running',  
  nodes jsonb default '{}',  
  current\_ux\_node text,  
  created\_at timestamptz default now(),  
  updated\_at timestamptz default now()  
);

alter publication supabase\_realtime add table stitch\_runs;

---

## **7\. The Demo: Video Factory**

**Input:** "Explain how Stitch works in 60 seconds"

**Output:** Ready-to-post video with narration and music

### **The Flow**

\[Topic Input\] ─────────────────────────────────────────────────────────────  
      │  
      ↓  
\[Script Generator\] ← Claude: "Write a 60-second explainer script   
      │               with 4 scenes, each 15 seconds, include   
      │               visual descriptions and voiceover text"  
      ↓  
\[Script Review\] ← UX gate: human approves/edits  
      │  
      ↓  
\[Scene Splitter\] ← Parses script JSON into scene array  
      │  
      ├─────────────────┬─────────────────┬─────────────────┐  
      ↓                 ↓                 ↓                 ↓  
\[Scene 1 Video\]   \[Scene 2 Video\]   \[Scene 3 Video\]   \[Scene 4 Video\]  
(MiniMax)         (MiniMax)         (MiniMax)         (MiniMax)  
      │                 │                 │                 │  
      ↓                 ↓                 ↓                 ↓  
\[Scene 1 Voice\]   \[Scene 2 Voice\]   \[Scene 3 Voice\]   \[Scene 4 Voice\]  
(ElevenLabs)      (ElevenLabs)      (ElevenLabs)      (ElevenLabs)  
      │                 │                 │                 │  
      ↓                 ↓                 ↓                 ↓  
\[Scene 1 Mix\]     \[Scene 2 Mix\]     \[Scene 3 Mix\]     \[Scene 4 Mix\]  
(Shotstack)       (Shotstack)       (Shotstack)       (Shotstack)  
      │                 │                 │                 │  
      └─────────────────┴─────────────────┴─────────────────┘  
                                  │  
                                  ↓  
                          \[Scene Collector\] ← waits for all 4  
                                  │  
                                  ↓  
                          \[Music Generator\] ← Kie.ai: background track  
                                  │  
                                  ↓  
                          \[Final Assembly\] ← Shotstack: concat \+ music  
                                  │  
                                  ↓  
                          \[Final Preview\] ← UX gate: human reviews  
                                  │  
                                  ↓  
                             \[Export\] ← Cloud upload, return link

### **What Judges See**

1. Topic typed in  
2. Script appears, user approves  
3. Canvas explodes into parallel workers — 4 video nodes, 4 voice nodes light up simultaneously  
4. Real-time status: "running" → "done" cascades across canvas  
5. Scenes collect, music generates, final assembly  
6. Actual video plays in preview  
7. Done. Same factory, different topic tomorrow.

### **The Proof**

"I could ask Claude to make me a video script. But then I'd copy-paste to MiniMax, wait, copy-paste to ElevenLabs, wait, download everything, open Shotstack, upload, configure, wait, download..."

*Shows Stitch canvas*

"Or I click Run."

---

## **8\. Worker Integrations**

### **MiniMax Hailuo (Video)**

* Endpoint: `POST https://api.minimax.io/v1/video/generate`  
* Webhook: ✅ `callback_url` parameter  
* Cost: $0.28/clip (768p, 6s)  
* Latency: 30s-2min

### **ElevenLabs (Voice)**

* Endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`  
* Webhook: ✅ Post-call webhooks  
* Cost: \~$0.30/1000 chars  
* Latency: 80-400ms

### **Kie.ai (Music via Suno)**

* Endpoint: `POST https://api.kie.ai/v1/music/generate`  
* Webhook: Check docs  
* Cost: \~$1-2/track  
* Latency: 30-60s

### **Shotstack (Assembly)**

* Endpoint: `POST https://api.shotstack.io/v1/render`  
* Webhook: ✅ Native async with callback  
* Cost: \~$0.10/min  
* Latency: 30-60s

### **Claude (Script)**

* Endpoint: Anthropic API or Vercel AI SDK  
* Mode: Sync (fast enough)  
* Cost: Minimal

---

## **9\. Tech Stack**

| Layer | Technology |
| ----- | ----- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS \+ shadcn/ui |
| Canvas | @xyflow/react |
| Database | Supabase (Postgres \+ Realtime) |
| Hosting | Vercel |
| AI Script | Claude API |
| Video Gen | MiniMax Hailuo |
| Voice | ElevenLabs |
| Music | Kie.ai |
| Assembly | Shotstack |

---

## **10\. Directory Structure**

src/  
├── app/  
│   ├── api/  
│   │   └── stitch/  
│   │       ├── start/\[flowId\]/route.ts  
│   │       ├── complete/\[runId\]/\[nodeId\]/route.ts  
│   │       ├── callback/\[runId\]/\[nodeId\]/route.ts  
│   │       └── status/\[runId\]/route.ts  
│   ├── flow/  
│   │   └── \[runId\]/\[nodeId\]/page.tsx  
│   ├── editor/  
│   │   └── \[flowId\]/page.tsx  
│   └── page.tsx  
├── components/  
│   ├── canvas/  
│   │   ├── StitchCanvas.tsx  
│   │   ├── StitchNode.tsx  
│   │   ├── SplitterNode.tsx  
│   │   ├── CollectorNode.tsx  
│   │   └── NodeConfigPanel.tsx  
│   └── ui/  
├── stitch/  
│   ├── engine/  
│   │   ├── runner.ts  
│   │   ├── splitter.ts  
│   │   ├── collector.ts  
│   │   └── variables.ts  
│   ├── workers/  
│   │   ├── minimax.ts  
│   │   ├── elevenlabs.ts  
│   │   ├── shotstack.ts  
│   │   └── kie.ts  
│   └── registry.ts  
├── hooks/  
│   ├── useRun.ts  
│   └── useFlow.ts  
└── lib/  
    ├── stitch.ts  
    └── supabase.ts

---

## **11\. The Engine (\~120 lines)**

### **Splitter Logic**

async function handleSplitter(  
  runId: string,  
  nodeId: string,  
  input: { items: any\[\] }  
): Promise\<void\> {  
  const run \= await getRun(runId);  
  const { nodes, edges } \= await getFlowGraph(run.flow\_id);  
    
  // Find downstream worker template  
  const outEdges \= edges.filter(e \=\> e.source \=== nodeId);  
    
  for (let i \= 0; i \< input.items.length; i++) {  
    const item \= input.items\[i\];  
      
    for (const edge of outEdges) {  
      const target \= nodes.find(n \=\> n.id \=== edge.target);  
        
      // Create dynamic node instance  
      const instanceId \= \`${target.id}\_${i}\`;  
        
      await fireWorker(runId, instanceId, {  
        ...target.data,  
        input: item,  
        index: i,  
        total: input.items.length  
      });  
    }  
  }  
}

### **Collector Logic**

async function handleCollectorCallback(  
  runId: string,  
  nodeId: string,  
  instanceIndex: number,  
  output: any  
): Promise\<void\> {  
  const run \= await getRun(runId);  
  const collectorState \= run.nodes\[nodeId\] || { collected: \[\], expected: 0 };  
    
  collectorState.collected\[instanceIndex\] \= output;  
    
  const complete \= collectorState.collected.filter(Boolean).length \=== collectorState.expected;  
    
  if (complete) {  
    await markNode(runId, nodeId, 'done', null, collectorState.collected);  
    await fireDownstream(runId, nodeId, collectorState.collected);  
  } else {  
    await updateNode(runId, nodeId, collectorState);  
  }  
}

---

## **12\. Package: stitch-core**

stitch-core/  
├── src/  
│   ├── index.ts  
│   ├── types.ts  
│   ├── protocol.ts  
│   ├── engine.ts  
│   └── utils.ts  
├── package.json  
├── tsconfig.json  
├── LICENSE (MIT)  
└── README.md

**package.json:**

{  
  "name": "stitch-core",  
  "version": "0.1.0",  
  "description": "Make your canvas run",  
  "main": "dist/index.js",  
  "types": "dist/index.d.ts",  
  "license": "MIT",  
  "keywords": \["workflow", "canvas", "orchestration", "react-flow"\]  
}

---

## **13\. Stretch Goals (If Time)**

### **Polling Mode**

For APIs without webhooks (Veo 2, Kling, Runway):

interface WorkerConfig {  
  mode: 'callback' | 'poll';  
  callbackUrl?: string;  
  pollConfig?: {  
    statusEndpoint: string;  
    interval: number;  
    maxAttempts: number;  
    doneField: string;  
    doneValue: string;  
  };  
}

### **Mermaid Import**

Paste Mermaid → get executable canvas.

### **Pre-built Templates**

* Video Factory  
* Lead Qualifier  
* Content Pipeline

---

## **14\. Hackathon Deliverables**

| Deliverable | Purpose | Priority |
| ----- | ----- | ----- |
| Working Video Factory | Demo that runs end-to-end | P0 |
| GitHub repo with `/.kiro` | Submission requirement | P0 |
| 3-min video | BMC → lightning → IT'S ALIVE | P0 |
| npm `stitch-core` | Differentiation | P1 |
| Write-up | Kiro feature showcase | P0 |
| Blog post | Bonus $100 | P2 |
| Social post | \#hookedonkiro | P2 |

---

## **15\. Kiro Steering Doc**

\# Stitch Development Guidelines

You are helping build Stitch, a visual routing layer for AI workflows.

\#\# Core Principles

1\. \*\*No execution engine.\*\* Stitch fires webhooks and receives callbacks. Workers do the work.

2\. \*\*Database is truth.\*\* All state in \`stitch\_runs\`. No in-memory state.

3\. \*\*Edge-walking, not queues.\*\* Node completes → read edges → fire downstream.

4\. \*\*All workers are async.\*\* Fire webhook, mark "running", wait for callback.

5\. \*\*Splitter/Collector pattern.\*\* Fan out parallel work, collect results.

6\. \*\*Keep it minimal.\*\* Resist complexity.

7\. \*\*Visual-first.\*\* If it's not on the canvas, it doesn't exist.

\#\# Tech Stack  
\- Next.js 16 (App Router)  
\- TypeScript (strict)  
\- Tailwind \+ shadcn/ui  
\- @xyflow/react for canvas  
\- Supabase for state \+ realtime

\#\# File Conventions  
\- API routes: \`src/app/api/stitch/\`  
\- Engine logic: \`src/stitch/engine/\`  
\- Worker integrations: \`src/stitch/workers/\`  
\- React components: \`src/components/canvas/\`

When in doubt: "Does this make Stitch simpler or more complex?" Choose simpler.

---

**End of Stitch Blueprint v2**

*It's alive.* ⚡

---

# **Stitch Development Playbook**

**The Meta-Game:** Judges see your `.kiro` folder. This playbook creates a natural progression that showcases Kiro mastery while arriving at a working Video Factory.

---

## **Phase 0: Project Setup (30 min)**

### **Actions**

1. **Create GitHub repo**

   * Name: `stitch` or `stitch-run`  
   * Add MIT LICENSE  
   * Initialize with README.md

**Create Next.js project**

 npx create-next-app@latest stitch \--typescript \--tailwind \--eslint \--app \--src-dir

cd stitch

2.   
3. **Open in Kiro**

**First Kiro interaction — Steering Doc**

 In Kiro chat:

 I'm building Stitch, a visual routing layer that makes React Flow canvases executable. 

Help me create a steering doc that captures these principles:

\- Stitch is a manager, not a worker. External systems do the work via webhooks.

\- Database is the source of truth. No in-memory state.

\- Edge-walking architecture: when a node completes, walk edges and fire downstream.

\- All workers are async: fire webhook, mark "running", wait for callback.

\- Visual-first: if it's not on the canvas, it doesn't exist.

Tech stack: Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, @xyflow/react, Supabase.

Create a steering doc I can reference throughout development.

4. 

### **Expected .kiro Output**

.kiro/

└── steering/

    └── stitch-principles.md

### **Commit**

git add .

git commit \-m "Initial setup with Kiro steering doc"

---

## **Phase 1: Architecture Spec (45 min)**

### **Actions**

**Create the spec via Kiro**

 In Kiro chat:

 I need to design the core architecture for Stitch. Let me describe what I'm building:

Stitch orchestrates external workers (AI APIs, scrapers, video generators) through a visual canvas. Users draw flows in React Flow, and Stitch makes them executable.

Key concepts:

\- Flows: stored as React Flow JSON (nodes \+ edges)

\- Runs: execution instances of a flow

\- Nodes have types: UX (human gates), Worker (async webhooks), Logic (routing), Splitter (fan-out), Collector (fan-in)

\- Workers receive a callbackUrl and POST back when done

Help me create a spec for:

1\. Database schema (Supabase/Postgres)

2\. Core TypeScript types

3\. The Stitch protocol (webhook contract)

4\. API routes needed

Use spec-driven development approach.

1.   
2. **Kiro creates spec** — review and refine

**Ask Kiro to break into tasks**

 Break this spec into implementation tasks I can work through one by one.

3. 

### **Expected .kiro Output**

.kiro/

├── steering/

│   └── stitch-principles.md

└── specs/

    └── core-architecture/

        ├── spec.md

        └── tasks.md

### **Commit**

git commit \-m "Add core architecture spec"

---

## **Phase 2: Database \+ Types (1 hour)**

### **Actions**

**Install Supabase**

 npm install @supabase/supabase-js

1. 

**Kiro implements from spec**

 Let's implement task 1 from the spec: database schema.

Create the Supabase migration file for stitch\_flows and stitch\_runs tables.

Also create the TypeScript types in src/types/stitch.ts.

2.   
3. **Set up Supabase project** (manual in Supabase dashboard)

   * Create project  
   * Run migration  
   * Enable realtime on stitch\_runs  
   * Get API keys

**Create Supabase client**

 Create the Supabase client setup in src/lib/supabase.ts with proper typing.

4. 

**Set up hook for type generation**

 In Kiro:

 Create a Kiro hook that regenerates Supabase types whenever I modify the database schema.

5. 

### **Expected .kiro Output**

.kiro/

├── steering/

│   └── stitch-principles.md

├── specs/

│   └── core-architecture/

│       ├── spec.md

│       └── tasks.md

└── hooks/

    └── generate-types.md

### **Files Created**

src/

├── types/

│   └── stitch.ts

├── lib/

│   └── supabase.ts

supabase/

└── migrations/

    └── 001\_initial\_schema.sql

### **Commit**

git commit \-m "Add database schema and types"

---

## **Phase 3: The Engine (2 hours)**

### **Actions**

**Implement the runner**

 Let's implement the core engine. Based on the spec, create src/stitch/engine/runner.ts.

Key function: fireDownstream(runId, completedNodeId, output)

\- Gets the run and flow graph

\- Finds outgoing edges from completed node

\- For each target node:

  \- If Worker: fire webhook with callbackUrl, mark as "running"

  \- If UX: return as next UX node

  \- If Logic: evaluate and recurse

Keep it minimal. Target \~80 lines.

1. 

**Implement variable resolution**

 Create src/stitch/engine/variables.ts

Function: resolveVariables(input, nodeResults)

\- Replaces {{ nodeId.path.to.value }} with actual values from completed nodes

\- Used to pass outputs from one node as inputs to another

2. 

**Implement Splitter logic**

 Create src/stitch/engine/splitter.ts

The Splitter node takes an array input and spawns parallel worker instances.

For each item in the array, it fires the downstream worker with that item as input.

Each instance gets a unique ID like "nodeId\_0", "nodeId\_1", etc.

3. 

**Implement Collector logic**

 Create src/stitch/engine/collector.ts

The Collector node waits for N inputs before firing downstream.

It stores partial results in the run's node state.

When all expected inputs arrive, it combines them and continues.

4. 

**Create hook for linting**

 Create a Kiro hook that runs ESLint and TypeScript checks before I commit.

5. 

### **Expected .kiro Output**

.kiro/

├── steering/

│   └── stitch-principles.md

├── specs/

│   └── core-architecture/

│       ├── spec.md

│       └── tasks.md

└── hooks/

    ├── generate-types.md

    └── pre-commit-lint.md

### **Files Created**

src/stitch/

├── engine/

│   ├── runner.ts

│   ├── variables.ts

│   ├── splitter.ts

│   └── collector.ts

└── index.ts

### **Commit**

git commit \-m "Implement core engine with splitter/collector"

---

## **Phase 4: API Routes (1.5 hours)**

### **Actions**

**Create the spec for API routes**

 I need 4 API routes for Stitch. Create a spec:

1\. POST /api/stitch/start/\[flowId\] \- Start a new run

2\. POST /api/stitch/complete/\[runId\]/\[nodeId\] \- User completes a UX node

3\. POST /api/stitch/callback/\[runId\]/\[nodeId\] \- Worker calls back when done

4\. GET /api/stitch/status/\[runId\] \- Get current run status

Each route should use the engine functions we created.

1. 

**Implement routes from spec**

 Implement the 4 API routes based on the spec. Use Next.js 15 App Router conventions.

2. 

**Add error handling**

 Add proper error handling to all routes. Include:

\- Validation of runId/nodeId

\- Graceful handling of missing flows/runs

\- Meaningful error responses

3. 

### **Expected .kiro Output**

.kiro/

└── specs/

    ├── core-architecture/

    └── api-routes/

        ├── spec.md

        └── tasks.md

### **Files Created**

src/app/api/stitch/

├── start/\[flowId\]/route.ts

├── complete/\[runId\]/\[nodeId\]/route.ts

├── callback/\[runId\]/\[nodeId\]/route.ts

└── status/\[runId\]/route.ts

### **Commit**

git commit \-m "Add API routes"

---

## **Phase 5: Canvas UI (2 hours)**

### **Actions**

**Install dependencies**

 npm install @xyflow/react

npx shadcn@latest init

npx shadcn@latest add button card input label textarea

1. 

**Vibe code the canvas** (this is where vibe coding shines)

 Let's build the canvas UI. I want to vibe code this part \- help me create:

1\. A StitchCanvas component using @xyflow/react

2\. Custom node components for each type: UX, Worker, Splitter, Collector

3\. Dark theme styling that looks dramatic (think Frankenstein's lab)

4\. Real-time status updates \- nodes glow/pulse when running

Make it visually impressive. This is for a hackathon demo.

2. 

**Iterate on visuals**

 The nodes need more visual feedback:

\- Idle: dark, subtle

\- Running: pulsing glow (amber/orange)

\- Done: green accent

\- Error: red

Add animated edges that show data flowing.

3. 

**Add the editor page**

 Create the editor page at /editor/\[flowId\] that shows:

\- The canvas with the flow

\- A side panel for configuring selected nodes

\- Save button that persists to Supabase

4. 

**Add the run viewer**

 Create the run page at /flow/\[runId\] that shows:

\- The canvas with real-time status

\- Current UX node rendered below the canvas

\- Live updates via Supabase realtime subscription

5. 

### **Files Created**

src/

├── components/

│   ├── canvas/

│   │   ├── StitchCanvas.tsx

│   │   ├── nodes/

│   │   │   ├── UXNode.tsx

│   │   │   ├── WorkerNode.tsx

│   │   │   ├── SplitterNode.tsx

│   │   │   └── CollectorNode.tsx

│   │   ├── NodeConfigPanel.tsx

│   │   └── AnimatedEdge.tsx

│   └── ui/ (shadcn components)

├── app/

│   ├── editor/\[flowId\]/page.tsx

│   ├── flow/\[runId\]/page.tsx

│   └── page.tsx

└── hooks/

    ├── useFlow.ts

    └── useRun.ts

### **Commit**

git commit \-m "Add canvas UI with real-time updates"

---

## **Phase 6: Worker Integrations (2 hours)**

### **Actions**

**Create worker spec**

 I need to integrate external APIs as Stitch workers. Create a spec for:

1\. MiniMax Hailuo \- video generation (has webhooks)

2\. ElevenLabs \- voice generation (has webhooks)  

3\. Shotstack \- video assembly (has webhooks)

4\. Claude \- script generation (sync, fast enough)

Each worker adapter should:

\- Accept Stitch protocol input

\- Transform to the API's format

\- Include the callbackUrl for async workers

\- Handle the callback response transformation

1. 

**Implement MiniMax adapter**

 Implement src/stitch/workers/minimax.ts based on the spec.

MiniMax API:

\- Endpoint: POST https://api.minimax.io/v1/video/generate

\- Supports callback\_url parameter

\- Returns task\_id, we receive video\_url in callback

2. 

**Implement ElevenLabs adapter**

 Implement src/stitch/workers/elevenlabs.ts

ElevenLabs API:

\- Text-to-speech with webhook callback

\- Returns audio file URL

3. 

**Implement Shotstack adapter**

 Implement src/stitch/workers/shotstack.ts

Shotstack API:

\- POST /render with timeline JSON

\- Supports callback webhook

\- Can combine video \+ audio tracks

\- Can concatenate multiple clips

4. 

**Implement Claude adapter** (sync)

 Implement src/stitch/workers/claude.ts

This one is sync since Claude responses are fast.

Used for script generation.

5. 

**Create worker registry**

 Create src/stitch/registry.ts that maps worker types to their adapters.

The engine uses this to know how to fire each worker type.

6. 

### **Expected .kiro Output**

.kiro/

└── specs/

    └── worker-integrations/

        ├── spec.md

        └── tasks.md

### **Files Created**

src/stitch/workers/

├── minimax.ts

├── elevenlabs.ts

├── shotstack.ts

├── claude.ts

└── index.ts

src/stitch/registry.ts

### **Commit**

git commit \-m "Add worker integrations"

---

## **Phase 7: Video Factory Flow (2 hours)**

### **Actions**

**Create the demo flow**

 Help me create the Video Factory flow as a seed in the database.

The flow:

1\. Topic Input (UX) \- user enters video topic

2\. Script Generator (Worker/Claude) \- generates 4-scene script

3\. Script Review (UX) \- user approves

4\. Scene Splitter (Splitter) \- breaks into 4 scenes

5\. For each scene in parallel:

   \- Video Gen (Worker/MiniMax)

   \- Voice Gen (Worker/ElevenLabs)

   \- Scene Mix (Worker/Shotstack) \- combines video \+ voice

6\. Scene Collector (Collector) \- waits for all 4

7\. Final Assembly (Worker/Shotstack) \- concatenates all

8\. Final Preview (UX) \- user reviews

9\. Export \- done

Create this as a JSON seed file and a migration to insert it.

1. 

**Create script generator prompt**

 Create the prompt template for the Claude script generator node.

It should:

\- Take a topic as input

\- Output structured JSON with 4 scenes

\- Each scene has: visual\_prompt, voiceover\_text, duration\_seconds

\- Total duration should be \~60 seconds

2. 

**Create the Scene Splitter logic**

 The Scene Splitter needs to parse the Claude output and create an array of scene objects.

Each scene object should have everything needed for downstream workers.

3.   
4. **Test the flow end-to-end**

   * Create the flow in database  
   * Start a run  
   * Step through UX nodes  
   * Watch workers fire and callback  
   * Verify final video assembles

### **Files Created**

src/stitch/flows/

└── video-factory.json

supabase/seed.sql

### **Commit**

git commit \-m "Add Video Factory demo flow"

---

## **Phase 8: Polish \+ npm Package (1.5 hours)**

### **Actions**

**Create stitch-core package**

 Help me extract the core engine into a publishable npm package.

Package structure:

\- stitch-core/src/index.ts \- exports

\- stitch-core/src/types.ts \- TypeScript types

\- stitch-core/src/protocol.ts \- the webhook contract

\- stitch-core/src/engine.ts \- core runner logic

Should be framework-agnostic (no Next.js dependencies).

1. 

**Set up package.json**

 Create package.json for stitch-core with:

\- name: "stitch-core"

\- version: "0.1.0"

\- proper exports

\- TypeScript build config

2. 

**Publish to npm**

 cd stitch-core

npm login

npm publish

3. 

**Landing page**

 Update the home page (src/app/page.tsx) to be a landing page:

\- Hero: "Stitch: Make Your Canvas Run"

\- Brief explanation

\- "Try the Video Factory" button

\- Link to GitHub

\- npm install command

Keep the Frankenstein/dark theme.

4. 

**README**

 Create a comprehensive README.md with:

\- What Stitch is

\- The Frankenstein thesis

\- Quick start

\- Architecture diagram

\- API reference

\- Demo link

5. 

### **Files Created**

stitch-core/

├── src/

│   ├── index.ts

│   ├── types.ts

│   ├── protocol.ts

│   └── engine.ts

├── package.json

├── tsconfig.json

└── README.md

README.md (root)

src/app/page.tsx (updated)

### **Commit**

git commit \-m "Add stitch-core npm package and landing page"

---

## **Phase 9: Demo Video \+ Submission (2 hours)**

### **Actions**

**Script the demo** (use our 3-min structure)

 0:00-0:30 \- The Hook

\- Show static Business Model Canvas

\- "Millions use it. But it's static."

\- Thunder/lightning transition

\- "STITCH: IT'S ALIVE"

0:30-1:00 \- The Magic

\- Open Stitch canvas

\- Type topic: "Explain how Stitch works in 60 seconds"

\- Click Run

1:00-2:00 \- The Factory

\- Watch script generate

\- Approve script

\- Canvas explodes into parallel workers

\- Nodes lighting up in real-time

\- Scene by scene completing

\- Final assembly

2:00-2:30 \- The Result

\- Play the generated video

\- "Same factory, different topic tomorrow"

2:30-3:00 \- The Close

\- "Canvas \> Chatbox"

\- Show npm install

\- Show GitHub

\- "It's open source. Stitch together."

1.   
2. **Record the demo**

   * Use OBS or similar  
   * Add Phantom of the Opera organ music at the lightning moment  
   * Clean screen, dark theme visible  
3. **Upload to YouTube**

**Write the submission**

 **How Kiro was used:**

 \#\# Steering Docs

I started by creating a steering doc that captured Stitch's core philosophy: 

"Stitch is a manager, not a worker." This guided every decision Kiro made.

\#\# Spec-Driven Development

The core architecture and API routes were built spec-first. I described 

what I needed, Kiro created structured specs, then implemented task by task.

This gave me a clear roadmap and consistent code.

\#\# Vibe Coding

The canvas UI was vibe-coded. I described the visual feeling I wanted 

("Frankenstein's lab, nodes that pulse when running") and iterated 

with Kiro until it looked right. Spec-driven wouldn't work here — 

I needed to see it to know if it was right.

\#\# Hooks

I set up hooks for:

\- Type generation when schema changes

\- Pre-commit linting

These automated the tedious parts so I could focus on building.

\#\# Key Insight

Spec-driven for architecture, vibe coding for UI. Know which tool 

fits which problem.

4.   
5. **Submit on Devpost**

   * Category: Frankenstein  
   * Bonus: Best Startup Project  
   * Include all required fields  
6. **Bonus: Blog post**

   * Write on dev.to with \#kiro tag  
   * Topic: "Building a Video Factory in 4 Days with Kiro"  
7. **Bonus: Social post**

   * Post on X/LinkedIn  
   * Tag @kirodotdev  
   * Use \#hookedonkiro

---

## **Final .kiro Structure**

.kiro/

├── steering/

│   └── stitch-principles.md

├── specs/

│   ├── core-architecture/

│   │   ├── spec.md

│   │   └── tasks.md

│   ├── api-routes/

│   │   ├── spec.md

│   │   └── tasks.md

│   └── worker-integrations/

│       ├── spec.md

│       └── tasks.md

└── hooks/

    ├── generate-types.md

    └── pre-commit-lint.md

---

## **Time Budget**

| Phase | Time | Cumulative |
| ----- | ----- | ----- |
| 0\. Setup | 0.5h | 0.5h |
| 1\. Architecture Spec | 0.75h | 1.25h |
| 2\. Database \+ Types | 1h | 2.25h |
| 3\. Engine | 2h | 4.25h |
| 4\. API Routes | 1.5h | 5.75h |
| 5\. Canvas UI | 2h | 7.75h |
| 6\. Worker Integrations | 2h | 9.75h |
| 7\. Video Factory Flow | 2h | 11.75h |
| 8\. Polish \+ npm | 1.5h | 13.25h |
| 9\. Demo \+ Submit | 2h | 15.25h |

**Total: \~15 hours of focused work**

Spread across 4 days with buffer for debugging, API issues, and sleep.

---

