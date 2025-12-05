# Stitch MCP Integration: Coding Instructions

> **For:** AI Coding Agent
> **Purpose:** Step-by-step implementation instructions for the Stitch Model Context Protocol (MCP) Server
> **Reference:** See `implementation_plan.md` for architecture and design rationale

---

## Prerequisites

1.  **Stitch Repository:** Ensure you are in the root of the `stitch-run` repository.
2.  **Node.js:** Ensure Node.js 20+ is installed.
3.  **Supabase:** Ensure you have access to the `getAdminClient` utility in `src/lib/supabase/client`.

---

## Phase 1: MCP Server Package Setup

### Task 1.1: Initialize Package

**Location:** `packages/stitch-mcp`

1.  Create the directory structure:
    ```bash
    mkdir -p packages/stitch-mcp/src/tools
    mkdir -p packages/stitch-mcp/src/resources
    mkdir -p packages/stitch-mcp/src/lib
    ```

2.  Create `package.json`:
    -   **Name:** `@stitch/mcp`
    -   **Dependencies:** `@modelcontextprotocol/sdk`, `zod`, `dotenv`
    -   **DevDependencies:** `typescript`, `tsx`, `@types/node`
    -   **Scripts:** `build`, `start`, `dev`

3.  Create `tsconfig.json` extending the base config or setting up for NodeNext modules.

### Task 1.2: Server Entry Point

**File:** `packages/stitch-mcp/src/index.ts`

Implement the main server loop using `StdioServerTransport`.

1.  Initialize `Server` from `@modelcontextprotocol/sdk`.
2.  Load environment variables (`STITCH_URL`, `STITCH_API_KEY`).
3.  Import and call `registerTools(server)` and `registerResources(server)`.
4.  Connect using `StdioServerTransport`.

---

## Phase 2: Core Tools Implementation

### Task 2.1: API Helper

**File:** `packages/stitch-mcp/src/lib/api.ts`

Create a helper function `stitchRequest(path, options)` that:
1.  Prepends `process.env.STITCH_URL` to the path.
2.  Adds `Authorization: Bearer <STITCH_API_KEY>` header.
3.  Handles errors and JSON parsing.

### Task 2.2: `stitch_create_node` Tool

**File:** `packages/stitch-mcp/src/tools/create-node.ts`

Implement a tool that allows the agent to create a node on the Stitch canvas.

-   **Name:** `stitch_create_node`
-   **Input Schema:**
    -   `canvasId` (string, required)
    -   `label` (string, required)
    -   `nodeType` (enum: "asset", "worker", "integration")
    -   `icon` (string, optional)
    -   `url` (string, optional - for uptime)
-   **Handler Logic:**
    1.  Construct the node payload.
    2.  Call `POST /api/canvas/{canvasId}/nodes` (Note: You may need to implement this endpoint in Phase 4 if it doesn't exist).
    3.  Return the `nodeId` and `webhookUrl`.

### Task 2.3: `stitch_get_stitching_code` Tool

**File:** `packages/stitch-mcp/src/tools/get-stitching-code.ts`

**CRITICAL:** This tool provides the "glue" code for vibe-coded assets.

-   **Name:** `stitch_get_stitching_code`
-   **Input Schema:**
    -   `nodeId` (string, required)
    -   `framework` (enum: "nextjs", "express", "python-flask")
    -   `assetType` (enum: "landing-page", "api")
-   **Handler Logic:**
    -   Based on the framework, return a markdown string with code blocks.
    -   **Next.js Template:**
        -   `lib/stitch.ts`: Helper to `fetch(WEBHOOK_URL, ...)`
        -   `app/api/health/route.ts`: Endpoint returning `{ status: "ok", nodeId }`
    -   **Instructions:** Tell the agent to install necessary deps (e.g., `node-fetch` if needed, though Next.js has native fetch).

---

## Phase 3: Dictionary & Resources

### Task 3.1: Shared Dictionary

**File:** `src/lib/dictionary/index.ts` (In the MAIN Stitch app, not the MCP package)

Define the `STITCH_DICTIONARY` constant exporting core concepts (Node, Edge, Entity) and node types.

### Task 3.2: Dictionary Resource

**File:** `packages/stitch-mcp/src/resources/dictionary.ts`

Expose `stitch://dictionary/core` that returns the JSON content of `STITCH_DICTIONARY`.

### Task 3.3: Instruction Resources

**File:** `packages/stitch-mcp/src/resources/instructions.ts`

Expose static markdown guides:
-   `stitch://instructions/overview`: High-level "How to Stitch" guide.
-   `stitch://instructions/landing-page`: Specifics for landing pages (forms, analytics).

---

## Phase 4: Stitch Backend Updates

### Task 4.1: Webhook Endpoint

**File:** `src/app/api/webhooks/node/[nodeId]/route.ts`

Implement the receiver for events sent by stitched assets.

1.  Accept `POST` requests.
2.  Extract `nodeId` from params.
3.  Validate payload (optional).
4.  Insert into `stitch_webhook_events` table (or `stitch_events` if you created a new table).
5.  Return `200 OK`.

### Task 4.2: Uptime Monitoring Endpoint

**File:** `src/app/api/uptime/ping/[nodeId]/route.ts`

Implement the endpoint that updates the node's status when *it* calls home (or when we ping it).

*Note: The implementation plan suggests Stitch pings the asset. If so, this endpoint might be for the asset to push heartbeat, or we need a cron job.*

**Revised Approach for V1:** Let's implement a **Passive Heartbeat** first (Asset calls Stitch).
1.  Asset calls `POST /api/uptime/ping/{nodeId}` periodically.
2.  Stitch updates `last_seen` in the database.

### Task 4.3: Node Creation Endpoint

**File:** `src/app/api/canvas/[canvasId]/nodes/route.ts`

If this endpoint doesn't exist, create it to support `stitch_create_node`.
1.  Accept `POST` with node data.
2.  Add node to the canvas graph JSON in Postgres.
3.  Return the new node ID.

---

## Phase 5: Verification

1.  **Build:** Run `npm run build` in `packages/stitch-mcp`.
2.  **Configure:** Add the server to Claude Desktop config:
    ```json
    "stitch": {
      "command": "node",
      "args": ["/path/to/stitch-run/packages/stitch-mcp/dist/index.js"],
      "env": {
        "STITCH_URL": "http://localhost:3000",
        "STITCH_API_KEY": "your-key"
      }
    }
    ```
3.  **Test:** Ask Claude: "Create a node for my new landing page and give me the stitching code."
