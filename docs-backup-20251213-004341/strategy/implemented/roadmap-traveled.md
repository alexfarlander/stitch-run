# The Roadmap Actually Traveled

**Date:** December 5, 2024
**Status:** Implementation Analysis

This document compares the original strategic vision (Blueprint v2, Roadmap 2, Roadmap 3) against the actual codebase implementation. It serves as a source of truth for what was built, what evolved, and what remains to be done.

---

## 1. Core Architecture: The "Frankenstein" Engine

**Plan:**
- **M-Shape Architecture:** UX Spine (horizontal) + Async Workers (vertical).
- **Edge-Walking:** No central queue; nodes trigger downstream neighbors.
- **Protocol:** Simple webhook contract (`runId`, `nodeId`, `callbackUrl`).

**Implementation:** ✅ **Fully Implemented**
- The execution engine (`src/lib/engine/edge-walker.ts`) faithfully implements the edge-walking pattern.
- The "M-Shape" parallel execution is realized through `Splitter` and `Collector` nodes.
- The worker protocol is standardized and in use by all integrations.

**Evolution:**
- **OEG (Optimized Execution Graph):** The implementation added a compilation step (`compileToOEG`) to separate the visual graph (React Flow) from the execution logic. This was a smart addition for performance and stability not explicitly detailed in the initial blueprint.

---

## 2. Database & State Management

**Plan:**
- **Tables:** `stitch_flows`, `stitch_runs`.
- **V2 Additions:** `stitch_entities` for the "Living Canvas".

**Implementation:** ✅ **Implemented & Extended**
- **Core Tables:** `stitch_flows` and `stitch_runs` are the backbone.
- **Versioning:** Added `stitch_flow_versions` to support immutable history of flow definitions. This is a critical production feature that was added.
- **Entities:** `stitch_entities` and `stitch_journey_events` are implemented to track the "Living Canvas" state.
- **Webhooks:** Added `stitch_webhook_configs` and `stitch_webhook_events` to manage external triggers robustly.

---

## 3. Worker Ecosystem

**Plan:**
- **Core Workers:** Claude (Script), MiniMax (Video), ElevenLabs (Voice), Shotstack (Assembly).

**Implementation:** ✅ **Exceeded Expectations**
- All core workers are implemented.
- **New Workers Added:**
  - `image-to-video`: For static image animation.
  - `scene-parser`: Specialized worker for breaking down scripts.
  - `wireframe-generator`: For UI prototyping flows.
  - `media-library`: For asset management.

---

## 4. The "Living Canvas" (BMC)

**Plan:**
- **Vision:** A Business Model Canvas where entities (leads/customers) visibly travel between sections.
- **Features:** Drill-down navigation, real-time entity overlays.

**Implementation:** ⚠️ **Partially Implemented**
- **Visualization:** `BMCCanvas` and `EntityOverlay` are built. Entities can be rendered on the canvas.
- **Real-time:** Supabase Realtime integration is in place to update positions.
- **Gaps:**
  - **Manual Controls:** The ability to manually drag-and-drop entities or move them via UI is missing (identified in `frontend-gaps.md`).
  - **Detail View:** The "Drill-down" to a detailed node view is a placeholder (`CanvasRouter.tsx`).
  - **Layout:** The BMC layout is implemented as a specific canvas type, but the full flexibility of "any layout" via JSON is supported by the architecture.

---

## 5. AI Manager

**Plan:**
- **Goal:** An AI agent that can build and modify workflows via natural language.
- **Integration:** "Stitch is just JSON, LLMs love JSON."

**Implementation:** ✅ **Implemented**
- **Backend:** `backend/ai-manager.md` confirms the existence of the AI Manager logic.
- **API:** `api/ai-manager-api.md` exposes this functionality.
- **Capabilities:** Can create workflows from descriptions, leveraging the OEG structure.

---

## 6. CLI Tools

**Plan:**
- **Goal:** `stitch-cli` for managing canvases from the terminal.

**Implementation:** ❌ **Not Implemented**
- The `packages/stitch-cli` directory does not exist.
- CLI functionality is currently limited to what can be done via API calls or direct database scripts.
- **Mitigation:** The AI Manager API provides a programmatic way to interact with the system, partially filling this void.

---

## 7. Key Deviations & Discoveries

### What We Added (The "Good" Scope Creep)
1.  **Versioning System:** The `stitch_flow_versions` table was a necessary addition for stability.
2.  **Webhook System:** A dedicated system for managing webhook configurations and events makes the platform much more capable as an integration hub.
3.  **OEG Compilation:** Separating visual concerns from execution logic was a strong architectural decision.

### What We Cut (The "Hard" Decisions)
1.  **CLI:** Dropped to focus on the core web experience and API.
2.  **Advanced UI Controls:** Manual entity movement and visual node configuration editors were deprioritized in favor of getting the execution engine and visualization working.
3.  **Marketplace:** No public workflow sharing yet.

---

## 8. Summary

The implementation is remarkably close to the "Blueprint v2" and the core of "Roadmap 2". The backend is more robust than originally planned (thanks to versioning and OEG), while the frontend has some UX gaps (manual controls, detail views) that are typical for a hackathon timeframe.

**The "Frankenstein" is alive.** It runs, it routes, and it visualizes. The "Living Canvas" concept is proven, even if the manual controls are still coming online.
