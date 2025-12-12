# **Stitch — Kiroween Hackathon Roadmap**

**Version:** 3.0 (Battle Plan)  
**Time Budget:** ~96 hours total (~64 working hours after sleep)  
**Deadline:** December 5th  
**Category:** Frankenstein + Bonus: Best Startup Project  

---

## **The Winning Formula**

Based on stream analysis, winners share these traits:
1. **Human element** — Your voice in the demo, not AI narration
2. **Expanded scope** — Push beyond the initial idea
3. **Build what you care about** — Canvas > Chatbox philosophy shows through
4. **Finished product** — Not a prototype, polished and working
5. **Show Kiro mastery** — The `.kiro` folder is part of the submission

---

## **3-Minute Pitch Script (~300 words)**

```
[0:00-0:15] THE STATIC CANVAS
(Screen: Osterwalder's Business Model Canvas, static)

"Millions of entrepreneurs use the Business Model Canvas. 
It's brilliant. It's also... dead. A static image. 
What if your canvas could actually DO something?"

[0:15-0:25] THE TRANSFORMATION  
(Quick cuts: stitching animation, sparks, lightning)
(Transition to dark-themed Stitch canvas)

"STITCH. Make your canvas run."

[0:25-0:45] THE PROOF
(Screen: Stitch canvas with Video Factory flow)

"Watch. I type a topic: 'Explain Stitch in 60 seconds.'
I click Run."

(Claude node lights up, generates script)
"Claude writes the script."

(Split — 4 video nodes pulse simultaneously)
"Four AI video generators fire IN PARALLEL."

(Voice nodes cascade)
"Four voice generators. Real-time. Watch the canvas."

(Collector node glows, assembly fires)
"Everything collects. Assembles. And..."

[0:45-1:15] THE RESULT
(Video plays in the preview panel)

"A finished video. From one click. 
Same factory, different topic tomorrow."

[1:15-2:00] THE ARCHITECTURE (Behind the scenes)
(Screen: Code, .kiro folder, Supabase dashboard)

"Here's what's under the hood.
Stitch is a ROUTING layer, not an execution engine.
Seven technologies — Claude, MiniMax, ElevenLabs, 
Shotstack, Supabase, React Flow, Next.js — 
stitched into one creature.

I built this with Kiro's spec-driven development.
The steering doc kept the architecture pure:
'Stitch is a manager, not a worker.'
Every design decision traces back to that principle."

[2:00-2:30] THE VISION

"This isn't just a video factory.
It's Canvas over Chatbox.

Your AI workflows shouldn't live in chat history.
They should be VISIBLE. REUSABLE. ALIVE.

Draw your logic. Stitch makes it run."

[2:30-3:00] THE CLOSE
(Screen: GitHub repo, npm package)

"Stitch-core. Open source. MIT license.
npm install stitch-core

The Frankenstein category asked for a chimera 
of incompatible technologies made unexpectedly powerful.

Seven technologies. One creature. One click.

It's alive."
```

---

## **Video Strategy**

**NOT full AI-generated video.** Instead:

| Segment | Duration | Content |
|---------|----------|---------|
| AI Intro | 10-15s | Animated: Static BMC → stitching/sparks → dark canvas → "IT'S ALIVE" |
| You talking | 2:30-2:45 | Screen recording + voiceover of you demoing Stitch |
| Closing | 5-10s | Logo, GitHub URL, tagline |

**Why this works:**
- Judges explicitly said human presence matters
- Your authentic enthusiasm for Canvas > Chatbox will show
- The AI intro is *meta* — Stitch made part of its own demo video
- You demonstrate understanding, not just output

---

## **Phase-by-Phase Roadmap with Kiro Mapping**

---

### **PHASE 0: Foundation (2 hours)**

#### Time: Hours 0-2

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Create GitHub repo | — | Manual: `stitch` with MIT license |
| Create Next.js project | **Vibe coding** | Ask Kiro: "Help me set up a Next.js 15 project with TypeScript, Tailwind, App Router" |
| Create steering doc | **Steering docs** | First Kiro interaction — this shapes everything |

#### Steering Doc Prompt (Copy-paste this)

```
I'm building Stitch, a visual routing layer that makes React Flow canvases executable.

Help me create a steering doc that captures these principles:

CORE PHILOSOPHY:
- Stitch is a manager, not a worker. External systems do the work via webhooks.
- Database is the source of truth. No in-memory state.
- Edge-walking architecture: when a node completes, walk edges and fire downstream.
- All workers are async: fire webhook, mark "running", wait for callback.
- Visual-first: if it's not on the canvas, it doesn't exist.

WHAT STITCH DOES:
- Stores visual graphs (React Flow → JSON)
- Triggers external workers via webhooks
- Receives callbacks when workers finish
- Shows real-time status on canvas
- Fan out parallel work (Splitter nodes)
- Collect parallel results (Collector nodes)

WHAT STITCH DOES NOT:
- Execute business logic (workers do that)
- Hold state in memory (database is truth)
- Compete with n8n/Zapier (those are workers, Stitch is the manager)

Tech stack: Next.js 15 App Router, TypeScript strict, Tailwind + shadcn/ui, @xyflow/react, Supabase.

Create a steering doc at .kiro/steering/stitch-principles.md
```

#### Advanced Steering Pattern

Add conditional includes to keep the main file light:

```markdown
## Reference Documents

@include ./docs/protocol-spec.md when discussing webhooks or callbacks
@include ./docs/node-types.md when implementing node handlers
@include ./docs/video-factory-flow.md when working on the demo
```

#### Expected Output

```
.kiro/
└── steering/
    └── stitch-principles.md
```

#### Checkpoint
- [ ] Repo created and cloned
- [ ] Next.js running locally
- [ ] Steering doc committed
- [ ] First git commit: "Initial setup with Kiro steering doc"

---

### **PHASE 1: Architecture Spec (1.5 hours)**

#### Time: Hours 2-3.5

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Create architecture spec | **Spec-driven development** | Use "Generate Spec" flow |
| Define database schema | **Spec → Requirements** | Kiro generates requirements doc |
| Define TypeScript types | **Spec → Design** | Kiro generates design doc |
| Break into tasks | **Spec → Tasks** | Kiro generates task list |

#### Spec Prompt (Copy-paste this)

```
I need to design the core architecture for Stitch. Let me describe what I'm building:

Stitch orchestrates external workers (AI APIs, scrapers, video generators) through 
a visual canvas. Users draw flows in React Flow, and Stitch makes them executable.

KEY CONCEPTS:
- Flows: stored as React Flow JSON (nodes + edges)
- Runs: execution instances of a flow
- Nodes have types: UX (human gates), Worker (async webhooks), Logic (routing), 
  Splitter (fan-out), Collector (fan-in)
- Workers receive a callbackUrl and POST back when done

THE PROTOCOL (minimal contract):
Outbound (Stitch → Worker):
{
  "runId": "uuid",
  "nodeId": "string", 
  "input": { },
  "callbackUrl": "https://app.stitch.run/api/stitch/callback/{runId}/{nodeId}"
}

Inbound (Worker → Stitch):
{
  "status": "done | error",
  "output": { }
}

Help me create a spec for:
1. Database schema (Supabase/Postgres) - two tables: stitch_flows, stitch_runs
2. Core TypeScript types
3. The Stitch protocol types
4. API routes needed (start, complete, callback, status)

Use spec-driven development approach. Generate requirements first, then design.
```

#### After Spec Generation

Ask Kiro to refine:

```
Before generating tasks, I want to add a Q&A phase. 
Ask me clarifying questions about:
- Edge cases in the splitter/collector logic
- Error handling strategy
- What happens if a worker never calls back?

Present trade-offs for each question.
```

This demonstrates **next-level Kiro usage** (customizing spec generation with Q&A).

#### Expected Output

```
.kiro/
├── steering/
│   └── stitch-principles.md
└── specs/
    └── core-architecture/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

#### Checkpoint
- [ ] Spec generated and reviewed
- [ ] Requirements doc has user stories
- [ ] Design doc has architecture diagram
- [ ] Tasks broken down
- [ ] Commit: "Add core architecture spec"

---

### **PHASE 2: Database + Types (1.5 hours)**

#### Time: Hours 3.5-5

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Create Supabase migration | **Spec → Tasks (Task 1)** | Execute from task list |
| Generate TypeScript types | **Spec → Tasks (Task 2)** | Execute from task list |
| Create type generation hook | **Agent hooks** | Automate type regeneration |

#### Hook Creation Prompt

```
Create a Kiro agent hook that regenerates TypeScript types whenever 
I modify files in supabase/migrations/.

The hook should:
1. Trigger on file changes in supabase/migrations/
2. Run: npx supabase gen types typescript --local > src/types/database.ts
3. Then run: npm run typecheck to verify

Save to .kiro/hooks/generate-types.md
```

#### Why This Hook Matters

From the streams: *"Every time you write new code, create a unit test. Run the unit test."* Same principle — automate the tedious parts.

#### Supabase Setup (Manual Steps)

1. Create Supabase project
2. Run migration from generated file
3. Enable Realtime on `stitch_runs` table
4. Copy API keys to `.env.local`

#### Expected Output

```
.kiro/
├── steering/
│   └── stitch-principles.md
├── specs/
│   └── core-architecture/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── hooks/
    └── generate-types.md

src/
├── types/
│   ├── stitch.ts
│   └── database.ts
├── lib/
│   └── supabase.ts
supabase/
└── migrations/
    └── 001_initial_schema.sql
```

#### Checkpoint
- [ ] Migration file created
- [ ] Types generated
- [ ] Hook working (test by modifying migration)
- [ ] Supabase project connected
- [ ] Commit: "Add database schema, types, and type generation hook"

---

### **PHASE 3: Core Engine (3 hours)**

#### Time: Hours 5-8

This is the heart of Stitch. **Use spec-driven for all of this.**

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Implement runner.ts | **Spec → Tasks** | Execute tasks sequentially |
| Implement variables.ts | **Spec → Tasks** | Variable resolution logic |
| Implement splitter.ts | **Spec → Tasks** | Fan-out logic |
| Implement collector.ts | **Spec → Tasks** | Fan-in logic |
| Create pre-commit hook | **Agent hooks** | Lint + typecheck before commit |

#### Runner Implementation Prompt

```
Let's implement the core engine. Based on the spec, create src/stitch/engine/runner.ts.

Key function: fireDownstream(runId, completedNodeId, output)

Logic:
1. Get the run and flow graph from Supabase
2. Find outgoing edges from completed node
3. For each target node:
   - If Worker: fire webhook with callbackUrl, mark as "running"
   - If UX: update current_ux_node, return
   - If Splitter: call splitter logic
   - If Collector: call collector logic
   - If Logic: evaluate condition and recurse

Keep it minimal. Target ~80 lines. Remember: Stitch is a manager, not a worker.
```

#### Pre-Commit Hook Prompt

```
Create a Kiro agent hook that runs before I commit:

1. Trigger: pre_commit (or on .git/logs/HEAD change)
2. Actions:
   - Run ESLint with --fix
   - Run Prettier
   - Run TypeScript check (tsc --noEmit)
   - If any fail, show errors

Save to .kiro/hooks/pre-commit-quality.md
```

#### Key Insight for Splitter/Collector

The M-shape architecture:
- **Splitter** creates dynamic node instances: `nodeId_0`, `nodeId_1`, etc.
- **Collector** tracks expected count and collected results
- When collected.length === expected, fire downstream with array

#### Expected Output

```
src/stitch/
├── engine/
│   ├── runner.ts        (~80 lines)
│   ├── variables.ts     (~40 lines)
│   ├── splitter.ts      (~50 lines)
│   └── collector.ts     (~50 lines)
└── index.ts

.kiro/hooks/
├── generate-types.md
└── pre-commit-quality.md
```

#### Checkpoint
- [ ] Engine functions implemented
- [ ] Pre-commit hook working
- [ ] All TypeScript errors resolved
- [ ] Commit: "Implement core engine with splitter/collector"

---

### **PHASE 4: API Routes (2 hours)**

#### Time: Hours 8-10

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Create API routes spec | **Spec-driven** | New spec for routes |
| Implement 4 routes | **Spec → Tasks** | Execute sequentially |
| Add error handling | **Vibe coding** | Iterate on edge cases |

#### Routes Spec Prompt

```
I need 4 API routes for Stitch. Create a spec:

1. POST /api/stitch/start/[flowId]
   - Creates a new run from flow
   - Finds first UX node
   - Returns { runId, currentNode }

2. POST /api/stitch/complete/[runId]/[nodeId]  
   - User completes a UX node with input
   - Calls fireDownstream
   - Returns next UX node or completion status

3. POST /api/stitch/callback/[runId]/[nodeId]
   - Worker calls back when done
   - Updates node status
   - Calls fireDownstream
   - Returns 200 OK

4. GET /api/stitch/status/[runId]
   - Returns full run state for canvas display
   - Used by real-time subscription fallback

Each route should use the engine functions. Include proper validation and error responses.
```

#### Error Handling (Vibe Code This)

After routes are generated:

```
Add defensive error handling to all routes:
- What if flowId doesn't exist?
- What if runId is invalid?
- What if the node is already complete?
- What if the callback comes for a non-running node?

Add meaningful error messages that help debugging.
```

#### Expected Output

```
src/app/api/stitch/
├── start/[flowId]/route.ts
├── complete/[runId]/[nodeId]/route.ts
├── callback/[runId]/[nodeId]/route.ts
└── status/[runId]/route.ts

.kiro/specs/
└── api-routes/
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

#### Checkpoint
- [ ] All 4 routes implemented
- [ ] Test with curl/Postman
- [ ] Error handling covers edge cases
- [ ] Commit: "Add API routes with error handling"

---

### **PHASE 5: Canvas UI (3 hours)**

#### Time: Hours 10-13

**This is where VIBE CODING shines.** You can't spec "Frankenstein's lab aesthetic."

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Install dependencies | Manual | npm install @xyflow/react, shadcn |
| Build StitchCanvas | **Vibe coding** | Iterate visually |
| Build custom nodes | **Vibe coding** | Style each node type |
| Add real-time updates | **Vibe coding** | Supabase subscription |
| Add animations | **Vibe coding** | CSS animations for status |

#### Initial Canvas Prompt

```
Let's build the canvas UI. I want to vibe code this part.

Create:
1. A StitchCanvas component using @xyflow/react
2. Custom node components for each type: UX, Worker, Splitter, Collector
3. Dark theme styling (think Frankenstein's lab, dramatic)
4. Node status badges that update in real-time

Start with a basic working canvas, then we'll iterate on visuals.
```

#### Visual Polish Prompt (Iterate)

```
The nodes need more visual feedback for the demo:

- Idle: dark background, subtle border
- Running: pulsing amber/orange glow animation
- Done: green accent, checkmark icon
- Error: red border, warning icon

Also add animated edges that show data flowing (dashed animation moving along the path).

Make it dramatic. This is for a hackathon demo where judges need to SEE the parallel 
workers light up simultaneously.
```

#### Real-Time Integration Prompt

```
Add Supabase Realtime subscription to the canvas.

When the stitch_runs table updates:
1. Parse the nodes JSON
2. Update each node's status in the canvas
3. Trigger the appropriate visual state

The canvas should feel ALIVE — status changes should cascade visually 
as workers complete their tasks.
```

#### Expected Output

```
src/
├── components/
│   ├── canvas/
│   │   ├── StitchCanvas.tsx
│   │   ├── nodes/
│   │   │   ├── UXNode.tsx
│   │   │   ├── WorkerNode.tsx
│   │   │   ├── SplitterNode.tsx
│   │   │   └── CollectorNode.tsx
│   │   ├── AnimatedEdge.tsx
│   │   └── NodeConfigPanel.tsx
│   └── ui/ (shadcn)
├── app/
│   ├── editor/[flowId]/page.tsx
│   ├── flow/[runId]/page.tsx
│   └── page.tsx
└── hooks/
    ├── useFlow.ts
    └── useRun.ts
```

#### Checkpoint
- [ ] Canvas renders with nodes
- [ ] Real-time updates working
- [ ] Animations look impressive
- [ ] Dark theme applied
- [ ] Commit: "Add canvas UI with real-time updates"

---

### **PHASE 6: Worker Integrations (3 hours)**

#### Time: Hours 13-16

Back to **spec-driven** for the integrations.

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Create worker spec | **Spec-driven** | Define adapter interface |
| Implement Claude adapter | **Spec → Tasks** | Sync worker (script gen) |
| Implement MiniMax adapter | **Spec → Tasks** | Async with callback |
| Implement ElevenLabs adapter | **Spec → Tasks** | Async with callback |
| Implement Shotstack adapter | **Spec → Tasks** | Async with callback |
| Create worker registry | **Spec → Tasks** | Map types to adapters |

#### Worker Spec Prompt

```
I need to integrate external APIs as Stitch workers. Create a spec for:

WORKER INTERFACE:
Each worker adapter must implement:
- fireWorker(runId, nodeId, config, input, callbackUrl) → Promise<void>
- handleCallback(rawResponse) → { status, output }

WORKERS TO IMPLEMENT:

1. Claude (sync) - Script generation
   - Endpoint: Anthropic API
   - Mode: Sync (response is fast enough)
   - Input: { prompt, topic }
   - Output: { script: { scenes: [...] } }

2. MiniMax Hailuo (async) - Video generation
   - Endpoint: POST https://api.minimax.io/v1/video/generate
   - Supports callback_url parameter
   - Input: { prompt, duration }
   - Output: { video_url }

3. ElevenLabs (async) - Voice generation
   - Text-to-speech with webhook
   - Input: { text, voice_id }
   - Output: { audio_url }

4. Shotstack (async) - Video assembly
   - POST /render with timeline JSON
   - Supports callback webhook
   - Input: { clips: [...], audio?: string }
   - Output: { video_url }

Create the spec, then break into implementation tasks.
```

#### MCP Usage (Fetch API Docs)

If you have the Fetch MCP server enabled:

```
Before implementing the MiniMax adapter, fetch the current API documentation 
from their docs site to verify the callback_url parameter format.
```

This demonstrates **MCP usage** for the write-up.

#### Expected Output

```
src/stitch/
├── workers/
│   ├── claude.ts
│   ├── minimax.ts
│   ├── elevenlabs.ts
│   ├── shotstack.ts
│   └── index.ts
└── registry.ts

.kiro/specs/
└── worker-integrations/
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

#### Checkpoint
- [ ] All 4 adapters implemented
- [ ] Registry maps worker types
- [ ] Test Claude adapter (sync)
- [ ] Commit: "Add worker integrations"

---

### **PHASE 7: Video Factory Flow (2 hours)**

#### Time: Hours 16-18

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Create demo flow JSON | **Vibe coding** | Build the M-shape flow |
| Create script prompt | **Vibe coding** | Craft Claude prompt |
| Seed database | Manual | Insert flow via migration |
| Test end-to-end | Manual | Run through full flow |

#### Video Factory Flow Prompt

```
Create the Video Factory flow as a JSON seed for the database.

THE FLOW (M-Shape):

Horizontal UX Spine:
[Topic Input] → [Script Review] → [Final Preview] → [Export]

Vertical Workers (fire from spine):

After Topic Input:
→ [Script Generator] (Claude) → feeds into Script Review

After Script Review:
→ [Scene Splitter] → fans out to 4 parallel lanes:

Each lane (x4):
→ [Video Gen] (MiniMax) → [Voice Gen] (ElevenLabs) → [Scene Mix] (Shotstack)

All 4 lanes feed into:
→ [Scene Collector] → [Music Gen] (optional) → [Final Assembly] (Shotstack) → Final Preview

Create this as:
1. A JSON file at src/stitch/flows/video-factory.json
2. A Supabase seed migration to insert it
```

#### Script Generator Prompt Template

```
Create the Claude prompt template for the script generator node.

Requirements:
- Input: topic string
- Output: JSON with exactly 4 scenes
- Each scene: { visual_prompt, voiceover_text, duration_seconds }
- Total duration: ~60 seconds (15 seconds per scene)
- Visual prompts should be detailed enough for AI video generation
- Voiceover text should be natural, conversational

The prompt should be stored in the node's config.prompt field.
```

#### End-to-End Test Checklist

1. [ ] Start run with test topic
2. [ ] Script generates correctly
3. [ ] Script Review UX node appears
4. [ ] After approval, Splitter fires 4 parallel workers
5. [ ] All workers call back
6. [ ] Collector combines results
7. [ ] Final Assembly produces video
8. [ ] Final Preview shows the video

#### Demo Risk Mitigation

**MiniMax latency (30s-2min) is your biggest risk.**

Options:
1. **Pre-render one flow** — Have a completed run ready as backup
2. **Shorter clips** — Use 3-second clips instead of 6-second
3. **Fake the slowest step** — If MiniMax times out, have pre-generated videos ready

#### Checkpoint
- [ ] Flow JSON created
- [ ] Database seeded
- [ ] Full flow runs end-to-end
- [ ] Backup plan for demo
- [ ] Commit: "Add Video Factory demo flow"

---

### **PHASE 8: Polish + npm Package (2 hours)**

#### Time: Hours 18-20

#### Actions & Kiro Features

| Action | Kiro Feature | How to Use |
|--------|--------------|------------|
| Extract stitch-core | **Spec-driven** | Define package API |
| Create landing page | **Vibe coding** | Dark theme, dramatic |
| Write README | **Vibe coding** | Quick start, architecture |
| Clean up .kiro folder | Manual | Ensure it's submission-ready |

#### Package Extraction Prompt

```
Help me extract the core Stitch engine into a publishable npm package.

Package: stitch-core

Structure:
- src/index.ts - exports
- src/types.ts - TypeScript types (StitchFlow, StitchRun, StitchNode, etc.)
- src/protocol.ts - the webhook contract types
- src/engine.ts - core runner logic (framework-agnostic)

Requirements:
- No Next.js dependencies
- No Supabase dependencies (pass in your own DB adapter)
- Export types for consumers
- MIT license

Create package.json with proper exports and TypeScript config.
```

#### Landing Page Prompt

```
Create a landing page for Stitch at src/app/page.tsx.

Design:
- Dark theme, dramatic (Frankenstein aesthetic)
- Hero: "Stitch: Make Your Canvas Run"
- Tagline: "Your AI workflows shouldn't live in chat history"
- Brief explanation of what Stitch does
- "Try the Video Factory" button → links to demo
- npm install command: npm install stitch-core
- GitHub link
- MIT license badge

Keep the spooky Kiroween vibe but professional enough for Best Startup Project.
```

#### .kiro Folder Cleanup

Ensure your `.kiro` folder is **submission-ready**:

```
.kiro/
├── steering/
│   └── stitch-principles.md          ← Core philosophy
├── specs/
│   ├── core-architecture/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   ├── api-routes/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── worker-integrations/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── hooks/
    ├── generate-types.md             ← Type generation automation
    └── pre-commit-quality.md         ← Code quality automation
```

**DO NOT add .kiro to .gitignore** — it's part of the submission!

#### Checkpoint
- [ ] stitch-core package created
- [ ] Landing page looks impressive
- [ ] README is comprehensive
- [ ] .kiro folder is clean and complete
- [ ] Commit: "Add stitch-core package and landing page"

---

### **PHASE 9: Demo Video + Submission (4 hours)**

#### Time: Hours 20-24

#### Video Production Plan

| Segment | Duration | Content | How to Create |
|---------|----------|---------|---------------|
| AI Intro | 10-15s | BMC → Stitch transformation | Use Stitch itself! |
| Demo | 2:00-2:15 | You walking through Video Factory | Screen record + voice |
| Architecture | 30s | Quick tour of .kiro, code | Screen record |
| Close | 15s | Tagline, GitHub, npm | Simple title cards |

#### Creating the AI Intro (Meta!)

Use Stitch to create part of its own demo:

1. Create a simple 2-node flow: [Prompt] → [Video Gen]
2. Prompt: "Animated transformation: static business model canvas morphing into a dark, electric, living interface. Frankenstein's lab aesthetic. Lightning. The text 'IT'S ALIVE' appears."
3. Export the 10-15 second clip
4. This is PROOF that Stitch works

#### Screen Recording Tips

- Use OBS or similar
- 1080p minimum
- Show the terminal + browser side by side
- Highlight mouse clicks
- Keep energy up in voiceover

#### Your Demo Script (for recording)

```
"Let me show you what's happening under the hood.

[Show Stitch canvas]
This is the Video Factory. Seven technologies wired together.

[Click Run, type topic]
I enter: 'Explain how Stitch works.'

[Point to Script node lighting up]
Claude generates the script. Four scenes, 60 seconds total.

[Point to Splitter fanning out]
Now watch — the Splitter fires four video generators IN PARALLEL.
Each one is calling MiniMax, ElevenLabs, and Shotstack.

[Point to cascading status updates]
See how the canvas is alive? Real-time updates via Supabase.
Every node shows its state.

[Point to Collector]
The Collector waits until all four scenes are done, 
then fires the Final Assembly.

[Video plays in preview]
And there it is. A real video. From one canvas. One click.

[Show .kiro folder]
Built entirely with Kiro's spec-driven development.
The steering doc, the specs, the hooks — they're all here.
The .kiro folder IS part of the submission.

[Show GitHub]
Open source. MIT license. npm install stitch-core.

Canvas over Chatbox. It's alive."
```

#### Submission Checklist

- [ ] Video uploaded to YouTube (public or unlisted)
- [ ] GitHub repo public with MIT license
- [ ] `.kiro` folder visible (NOT in .gitignore)
- [ ] Functional app URL
- [ ] Category: Frankenstein
- [ ] Bonus: Best Startup Project
- [ ] Write-up completed (use the pre-written template from earlier)

#### Write-Up Reminder

Include all sections:
- Vibe coding: Canvas UI, animations
- Agent hooks: Type generation, pre-commit quality
- Spec-driven: Core architecture, API routes, worker integrations
- Steering docs: stitch-principles.md, conditional includes
- MCP: Fetch for API docs (if used)

---

## **Time Summary**

| Phase | Hours | Cumulative |
|-------|-------|------------|
| 0. Foundation | 2 | 2 |
| 1. Architecture Spec | 1.5 | 3.5 |
| 2. Database + Types | 1.5 | 5 |
| 3. Core Engine | 3 | 8 |
| 4. API Routes | 2 | 10 |
| 5. Canvas UI | 3 | 13 |
| 6. Worker Integrations | 3 | 16 |
| 7. Video Factory Flow | 2 | 18 |
| 8. Polish + npm | 2 | 20 |
| 9. Demo + Submission | 4 | 24 |

**Total focused work: ~24 hours**

With 64 working hours available, you have **40 hours of buffer** for:
- Debugging
- API issues
- Iteration
- Sleep interruptions
- The inevitable "it worked yesterday" moments

---

## **Risk Mitigation**

| Risk | Probability | Mitigation |
|------|-------------|------------|
| MiniMax API slow/down | High | Pre-render backup flow; have static videos ready |
| ElevenLabs rate limits | Medium | Cache voice generations; use fewer characters |
| Shotstack complexity | Medium | Test assembly logic early with sample files |
| Supabase Realtime issues | Low | Fallback to polling via status endpoint |
| Running out of time | Medium | Prioritize P0 deliverables; cut npm package if needed |

---

## **Daily Schedule (Suggested)**

### Day 1 (Friday): Foundation + Architecture
- Phases 0, 1, 2, 3
- End with: Working engine, database, types

### Day 2 (Saturday): Core Features
- Phases 4, 5
- End with: Working API routes, visual canvas

### Day 3 (Sunday): Integration + Flow
- Phases 6, 7
- End with: Video Factory running end-to-end

### Day 4 (Monday): Polish + Submit
- Phases 8, 9
- End with: Submitted!

---

## **The Meta-Game**

Remember what judges said:

> "Don't build the project you think we want to see. Build what you think matters."

You genuinely believe in Canvas > Chatbox. That passion will show.

> "Being prepared to take a risk and build something bigger than what you might have initially thought."

Seven technologies stitched together IS bigger. The M-shape architecture IS ambitious.

> "Human element matters."

Your voice in the demo. Your enthusiasm. Your two decades of journey design showing through in how you think about orchestrating experiences.

---

**It's alive.** ⚡

Now go build it.
