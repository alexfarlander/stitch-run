# Testing Instructions for AI Manager API

## Overview

The AI Manager is a REST API that enables natural language workflow management through Large Language Models (LLMs). It provides four main actions:
- **CREATE_WORKFLOW**: Generate new workflows from natural language descriptions
- **MODIFY_WORKFLOW**: Update existing workflows based on user feedback
- **RUN_WORKFLOW**: Execute workflows with specified inputs
- **GET_STATUS**: Monitor workflow execution status

This implementation includes:
- Canvas Management API (CRUD operations for workflows)
- AI Manager endpoint (POST /api/ai-manager)
- LLM integration with Claude
- Comprehensive validation and error handling
- Automatic versioning on workflow execution

## Prerequisites

### Environment Setup
1. **Required Environment Variables** (add to `.env.local`):
   ```bash
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

2. **Database Setup**:
   - Ensure Supabase is running locally or connected to cloud instance
   - Run migrations: `npm run db:migrate`
   - Verify tables exist: `stitch_flows`, `stitch_flow_versions`, `stitch_runs`

3. **Start Development Server**:
   ```bash
   cd stitch-run
   npm run dev
   ```
   Server should be running at `http://localhost:3000`

### Test Data Requirements
- No pre-existing test data needed
- Tests will create canvases dynamically
- Clean up test canvases after testing if desired


## Step-by-Step Testing Guide

### Test 1: Canvas Management API - List All Canvases

**Purpose**: Verify the GET /api/canvas endpoint returns all canvases with metadata.

1. **Open API Testing Tool** (Postman, Insomnia, or curl)

2. **Send GET Request**:
   ```bash
   curl http://localhost:3000/api/canvas
   ```

3. **Verify Response**:
   - Status code: `200 OK`
   - Response body contains:
     ```json
     {
       "canvases": [
         {
           "id": "uuid-string",
           "name": "Canvas Name",
           "created_at": "2024-01-01T00:00:00Z",
           "updated_at": "2024-01-01T00:00:00Z",
           "node_count": 5,
           "edge_count": 4
         }
       ]
     }
     ```
   - `canvases` is an array (may be empty on first run)
   - Each canvas has `id`, `name`, `created_at`, `updated_at`, `node_count`, `edge_count`

4. **Expected Result**: Successfully retrieves list of all canvases

---

### Test 2: Canvas Management API - Create Canvas from JSON

**Purpose**: Verify POST /api/canvas creates a new canvas from JSON format.

1. **Send POST Request**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Video Workflow",
       "format": "json",
       "content": {
         "nodes": [
           {
             "id": "ux-1",
             "type": "ux",
             "position": { "x": 0, "y": 0 },
             "data": {
               "label": "Enter Video Prompt"
             }
           },
           {
             "id": "worker-1",
             "type": "worker",
             "position": { "x": 300, "y": 0 },
             "data": {
               "label": "Generate Video",
               "worker_type": "minimax"
             }
           }
         ],
         "edges": [
           {
             "id": "e1",
             "source": "ux-1",
             "target": "worker-1"
           }
         ]
       }
     }'
   ```

2. **Verify Response**:
   - Status code: `201 Created`
   - Response contains:
     ```json
     {
       "id": "newly-created-uuid",
       "canvas": {
         "nodes": [...],
         "edges": [...]
       }
     }
     ```
   - Save the `id` value for later tests (referred to as `CANVAS_ID`)

3. **Expected Result**: Canvas created successfully with returned ID


---

### Test 3: Canvas Management API - Create Canvas from Mermaid

**Purpose**: Verify POST /api/canvas creates a canvas from Mermaid flowchart syntax.

1. **Send POST Request**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Mermaid Test Workflow",
       "format": "mermaid",
       "content": "flowchart LR\n  A[Start] --> B(Generate Script)\n  B --> C[End]"
     }'
   ```

2. **Verify Response**:
   - Status code: `201 Created`
   - Response contains `id` and `canvas`
   - Canvas has 3 nodes (A, B, C) and 2 edges
   - Node B should be inferred as type "worker"
   - Save the `id` as `MERMAID_CANVAS_ID`

3. **Expected Result**: Canvas created from Mermaid syntax with correct node types

---

### Test 4: Canvas Management API - Get Canvas by ID

**Purpose**: Verify GET /api/canvas/[id] retrieves a specific canvas.

1. **Send GET Request** (use `CANVAS_ID` from Test 2):
   ```bash
   curl http://localhost:3000/api/canvas/CANVAS_ID
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "id": "CANVAS_ID",
       "name": "Test Video Workflow",
       "canvas": {
         "nodes": [...],
         "edges": [...]
       },
       "created_at": "timestamp",
       "updated_at": "timestamp"
     }
     ```
   - Canvas structure matches what was created in Test 2

3. **Expected Result**: Successfully retrieves canvas with full details

---

### Test 5: Canvas Management API - Update Canvas

**Purpose**: Verify PUT /api/canvas/[id] updates an existing canvas.

1. **Send PUT Request** (use `CANVAS_ID` from Test 2):
   ```bash
   curl -X PUT http://localhost:3000/api/canvas/CANVAS_ID \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Updated Video Workflow",
       "canvas": {
         "nodes": [
           {
             "id": "ux-1",
             "type": "ux",
             "position": { "x": 0, "y": 0 },
             "data": {
               "label": "Enter Video Prompt"
             }
           },
           {
             "id": "worker-1",
             "type": "worker",
             "position": { "x": 300, "y": 0 },
             "data": {
               "label": "Generate Video",
               "worker_type": "minimax"
             }
           },
           {
             "id": "worker-2",
             "type": "worker",
             "position": { "x": 600, "y": 0 },
             "data": {
               "label": "Generate Audio",
               "worker_type": "elevenlabs"
             }
           }
         ],
         "edges": [
           {
             "id": "e1",
             "source": "ux-1",
             "target": "worker-1"
           },
           {
             "id": "e2",
             "source": "worker-1",
             "target": "worker-2"
           }
         ]
       }
     }'
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains updated canvas with 3 nodes
   - `updated_at` timestamp is newer than `created_at`

3. **Verify Versioning**:
   - A new version was created in `stitch_flow_versions` table
   - The flow's `current_version_id` points to the new version

4. **Expected Result**: Canvas updated successfully with new version created


---

### Test 6: Canvas Management API - Run Workflow

**Purpose**: Verify POST /api/canvas/[id]/run starts workflow execution.

1. **Send POST Request** (use `CANVAS_ID` from Test 2):
   ```bash
   curl -X POST http://localhost:3000/api/canvas/CANVAS_ID/run \
     -H "Content-Type: application/json" \
     -d '{
       "input": {
         "prompt": "A serene mountain landscape at sunset"
       }
     }'
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "runId": "run-uuid",
       "versionId": "version-uuid",
       "status": "running",
       "statusUrl": "http://localhost:3000/api/canvas/CANVAS_ID/status?runId=run-uuid"
     }
     ```
   - Save the `runId` as `RUN_ID` for next test
   - Save the `statusUrl` as `STATUS_URL`

3. **Verify Database**:
   - Check `stitch_runs` table has new record with `RUN_ID`
   - Check `stitch_flow_versions` table has new version (auto-created on run)

4. **Expected Result**: Workflow execution started with run ID returned

---

### Test 7: Canvas Management API - Get Workflow Status

**Purpose**: Verify GET /api/canvas/[id]/status returns execution status.

1. **Send GET Request** (use `STATUS_URL` from Test 6):
   ```bash
   curl "http://localhost:3000/api/canvas/CANVAS_ID/status?runId=RUN_ID"
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "runId": "RUN_ID",
       "status": "running" | "completed" | "failed" | "pending",
       "nodes": {
         "ux-1": {
           "status": "completed",
           "output": {...}
         },
         "worker-1": {
           "status": "running"
         }
       },
       "statusUrl": "http://localhost:3000/api/canvas/CANVAS_ID/status?runId=RUN_ID"
     }
     ```
   - Each node has a status: `pending`, `running`, `completed`, or `failed`
   - Completed nodes may have `output` field
   - Failed nodes may have `error` field

3. **Poll for Completion** (if workflow is still running):
   - Wait 2-3 seconds
   - Send the same GET request again
   - Repeat until `status` is `completed` or `failed`

4. **Verify Completed Status**:
   - When `status` is `completed`, response should include `finalOutputs`:
     ```json
     {
       "runId": "RUN_ID",
       "status": "completed",
       "nodes": {...},
       "finalOutputs": {
         "worker-1": {
           "videoUrl": "https://..."
         }
       },
       "statusUrl": "..."
     }
     ```

5. **Expected Result**: Status endpoint returns current execution state with node details


---

### Test 8: Canvas Management API - Delete Canvas

**Purpose**: Verify DELETE /api/canvas/[id] removes a canvas.

1. **Send DELETE Request** (use `MERMAID_CANVAS_ID` from Test 3):
   ```bash
   curl -X DELETE http://localhost:3000/api/canvas/MERMAID_CANVAS_ID
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "success": true,
       "id": "MERMAID_CANVAS_ID"
     }
     ```

3. **Verify Deletion**:
   - Try to GET the deleted canvas:
     ```bash
     curl http://localhost:3000/api/canvas/MERMAID_CANVAS_ID
     ```
   - Should return `404 Not Found`

4. **Expected Result**: Canvas deleted successfully and no longer accessible

---

### Test 9: AI Manager - CREATE_WORKFLOW Action

**Purpose**: Verify AI Manager can create workflows from natural language.

1. **Send POST Request to AI Manager**:
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Create a workflow that generates a video from a text prompt using MiniMax"
     }'
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "action": "CREATE_WORKFLOW",
       "result": {
         "canvasId": "newly-created-uuid",
         "canvas": {
           "nodes": [
             {
               "id": "...",
               "type": "ux" | "worker",
               "data": {
                 "label": "...",
                 "worker_type": "minimax"
               }
             }
           ],
           "edges": [...]
         }
       }
     }
     ```
   - Canvas should have at least 2 nodes (UX input + MiniMax worker)
   - Worker node should have `worker_type: "minimax"`
   - Save the `canvasId` as `AI_CANVAS_ID`

3. **Verify in Database**:
   - Check `stitch_flows` table has new record with `AI_CANVAS_ID`
   - Check `stitch_flow_versions` table has initial version

4. **Expected Result**: AI Manager creates valid workflow from natural language

---

### Test 10: AI Manager - CREATE_WORKFLOW with Parallel Execution

**Purpose**: Verify AI Manager can create workflows with splitter/collector nodes.

1. **Send POST Request**:
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Create a workflow that generates a script with Claude, then creates 3 video scenes in parallel using MiniMax, and finally assembles them with Shotstack"
     }'
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Canvas should have:
     - Claude worker node (script generation)
     - Splitter node (splits into 3 parallel paths)
     - MiniMax worker node (video generation)
     - Collector node (waits for all 3 videos)
     - Shotstack worker node (assembles final video)
   - Splitter node should have `split_count: 3`
   - Collector node should have `expected_count: 3`
   - Save the `canvasId` as `PARALLEL_CANVAS_ID`

3. **Expected Result**: AI Manager creates workflow with correct parallel structure


---

### Test 11: AI Manager - MODIFY_WORKFLOW Action

**Purpose**: Verify AI Manager can modify existing workflows.

1. **Send POST Request** (use `AI_CANVAS_ID` from Test 9):
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Add voice narration using ElevenLabs after the video generation",
       "canvasId": "AI_CANVAS_ID"
     }'
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "action": "MODIFY_WORKFLOW",
       "result": {
         "canvasId": "AI_CANVAS_ID",
         "canvas": {
           "nodes": [...],
           "edges": [...]
         }
       }
     }
     ```
   - Canvas should now include an ElevenLabs worker node
   - Original nodes should be preserved (same IDs)
   - New edges should connect MiniMax → ElevenLabs

3. **Verify Versioning**:
   - Check `stitch_flow_versions` table
   - Should have a new version with commit message mentioning "AI modifications"
   - Flow's `current_version_id` should point to new version

4. **Expected Result**: AI Manager modifies workflow while preserving existing structure

---

### Test 12: AI Manager - RUN_WORKFLOW Action

**Purpose**: Verify AI Manager can execute workflows.

1. **Send POST Request** (use `AI_CANVAS_ID` from Test 9):
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Run the workflow with the topic: A peaceful forest scene",
       "canvasId": "AI_CANVAS_ID"
     }'
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "action": "RUN_WORKFLOW",
       "result": {
         "runId": "run-uuid",
         "status": "running",
         "statusUrl": "http://localhost:3000/api/canvas/AI_CANVAS_ID/status?runId=run-uuid"
       }
     }
     ```
   - Save the `runId` as `AI_RUN_ID`
   - Save the `statusUrl` as `AI_STATUS_URL`

3. **Verify Database**:
   - Check `stitch_runs` table has new record with `AI_RUN_ID`
   - Run should have `trigger.source: "ai-manager"`

4. **Expected Result**: AI Manager starts workflow execution successfully

---

### Test 13: AI Manager - GET_STATUS Action

**Purpose**: Verify AI Manager can check workflow status.

1. **Send POST Request** (use `AI_RUN_ID` from Test 12):
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "What is the status of the workflow?",
       "runId": "AI_RUN_ID"
     }'
   ```

2. **Verify Response**:
   - Status code: `200 OK`
   - Response contains:
     ```json
     {
       "action": "GET_STATUS",
       "result": {
         "runId": "AI_RUN_ID",
         "status": "running" | "completed" | "failed",
         "nodes": {
           "node-id": {
             "status": "completed",
             "output": {...}
           }
         },
         "statusUrl": "..."
       }
     }
     ```
   - Each node should have a status
   - Completed nodes should have output data

3. **Expected Result**: AI Manager retrieves current workflow status


---

### Test 14: Error Handling - Invalid JSON

**Purpose**: Verify API handles malformed JSON gracefully.

1. **Send POST Request with Invalid JSON**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d 'invalid json {'
   ```

2. **Verify Response**:
   - Status code: `400 Bad Request`
   - Response contains:
     ```json
     {
       "error": "Invalid JSON in request body",
       "code": "BAD_REQUEST"
     }
     ```

3. **Expected Result**: Returns clear error message for invalid JSON

---

### Test 15: Error Handling - Missing Required Fields

**Purpose**: Verify API validates required fields.

1. **Send POST Request Missing Required Field**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Canvas"
     }'
   ```

2. **Verify Response**:
   - Status code: `400 Bad Request`
   - Response contains:
     ```json
     {
       "error": "Missing required fields",
       "code": "BAD_REQUEST",
       "details": [
         "Missing field: format",
         "Missing field: content"
       ]
     }
     ```

3. **Expected Result**: Returns specific missing field names

---

### Test 16: Error Handling - Canvas Not Found

**Purpose**: Verify API handles non-existent resources.

1. **Send GET Request for Non-Existent Canvas**:
   ```bash
   curl http://localhost:3000/api/canvas/00000000-0000-0000-0000-000000000000
   ```

2. **Verify Response**:
   - Status code: `404 Not Found`
   - Response contains:
     ```json
     {
       "error": "Canvas not found: 00000000-0000-0000-0000-000000000000",
       "code": "NOT_FOUND"
     }
     ```

3. **Expected Result**: Returns 404 with clear error message

---

### Test 17: Error Handling - Invalid Mermaid Syntax

**Purpose**: Verify API provides helpful error messages for Mermaid parsing errors.

1. **Send POST Request with Invalid Mermaid**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Invalid Mermaid",
       "format": "mermaid",
       "content": "flowchart INVALID\n  A --> B"
     }'
   ```

2. **Verify Response**:
   - Status code: `400 Bad Request`
   - Response contains:
     ```json
     {
       "error": "Invalid flowchart direction",
       "code": "PARSE_ERROR",
       "details": [
         "Hint: Use one of: LR (left-right), TD/TB (top-down), RL (right-left), BT (bottom-top)"
       ]
     }
     ```

3. **Expected Result**: Returns helpful hint for fixing Mermaid syntax


---

### Test 18: Validation - Invalid Worker Type

**Purpose**: Verify API validates worker types against registry.

1. **Send POST Request with Invalid Worker Type**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Invalid Worker",
       "format": "json",
       "content": {
         "nodes": [
           {
             "id": "worker-1",
             "type": "worker",
             "position": { "x": 0, "y": 0 },
             "data": {
               "label": "Invalid Worker",
               "worker_type": "nonexistent-worker"
             }
           }
         ],
         "edges": []
       }
     }'
   ```

2. **Verify Response**:
   - Status code: `400 Bad Request`
   - Response contains error about invalid worker type
   - Error should mention valid worker types: claude, minimax, elevenlabs, shotstack

3. **Expected Result**: Rejects invalid worker types with helpful message

---

### Test 19: Validation - Entity Movement Configuration

**Purpose**: Verify API validates entity movement rules.

1. **Send POST Request with Invalid Entity Movement**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Invalid Entity Movement",
       "format": "json",
       "content": {
         "nodes": [
           {
             "id": "worker-1",
             "type": "worker",
             "position": { "x": 0, "y": 0 },
             "data": {
               "label": "Worker",
               "worker_type": "claude",
               "entityMovement": {
                 "onSuccess": {
                   "targetSectionId": "non-existent-node",
                   "completeAs": "success"
                 }
               }
             }
           }
         ],
         "edges": []
       }
     }'
   ```

2. **Verify Response**:
   - Status code: `400 Bad Request`
   - Response contains error about non-existent target node
   - Error message should include the invalid node ID

3. **Expected Result**: Validates entity movement references existing nodes

---

### Test 20: Validation - Graph Cycles

**Purpose**: Verify API detects and rejects cyclic graphs.

1. **Send POST Request with Cyclic Graph**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Cyclic Graph",
       "format": "json",
       "content": {
         "nodes": [
           {
             "id": "node-1",
             "type": "worker",
             "position": { "x": 0, "y": 0 },
             "data": { "label": "Node 1", "worker_type": "claude" }
           },
           {
             "id": "node-2",
             "type": "worker",
             "position": { "x": 300, "y": 0 },
             "data": { "label": "Node 2", "worker_type": "claude" }
           }
         ],
         "edges": [
           { "id": "e1", "source": "node-1", "target": "node-2" },
           { "id": "e2", "source": "node-2", "target": "node-1" }
         ]
       }
     }'
   ```

2. **Verify Response**:
   - Status code: `400 Bad Request`
   - Response contains validation error about cycles
   - Error should mention which nodes form the cycle

3. **Expected Result**: Detects and rejects graphs with cycles


---

### Test 21: Versioning - Auto-Version on Run

**Purpose**: Verify workflows are automatically versioned when executed.

1. **Create a Canvas** (if not already done):
   ```bash
   curl -X POST http://localhost:3000/api/canvas \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Version Test Canvas",
       "format": "json",
       "content": {
         "nodes": [
           {
             "id": "ux-1",
             "type": "ux",
             "position": { "x": 0, "y": 0 },
             "data": { "label": "Start" }
           }
         ],
         "edges": []
       }
     }'
   ```
   Save the returned `id` as `VERSION_TEST_ID`

2. **Run the Canvas First Time**:
   ```bash
   curl -X POST http://localhost:3000/api/canvas/VERSION_TEST_ID/run \
     -H "Content-Type: application/json" \
     -d '{ "input": {} }'
   ```
   Save the `versionId` as `VERSION_1`

3. **Run the Canvas Second Time** (without changes):
   ```bash
   curl -X POST http://localhost:3000/api/canvas/VERSION_TEST_ID/run \
     -H "Content-Type: application/json" \
     -d '{ "input": {} }'
   ```
   Save the `versionId` as `VERSION_2`

4. **Verify Version Reuse**:
   - `VERSION_1` should equal `VERSION_2`
   - No duplicate version created for unchanged canvas

5. **Update the Canvas**:
   ```bash
   curl -X PUT http://localhost:3000/api/canvas/VERSION_TEST_ID \
     -H "Content-Type: application/json" \
     -d '{
       "canvas": {
         "nodes": [
           {
             "id": "ux-1",
             "type": "ux",
             "position": { "x": 0, "y": 0 },
             "data": { "label": "Updated Start" }
           }
         ],
         "edges": []
       }
     }'
   ```

6. **Run the Canvas Third Time** (after changes):
   ```bash
   curl -X POST http://localhost:3000/api/canvas/VERSION_TEST_ID/run \
     -H "Content-Type: application/json" \
     -d '{ "input": {} }'
   ```
   Save the `versionId` as `VERSION_3`

7. **Verify New Version Created**:
   - `VERSION_3` should be different from `VERSION_1`
   - New version created because canvas changed

8. **Expected Result**: Versions are created intelligently (only when canvas changes)

---

### Test 22: Integration - Full AI Manager Workflow

**Purpose**: Test complete end-to-end AI Manager workflow.

1. **Create Workflow via AI**:
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Create a simple video generation workflow with MiniMax"
     }'
   ```
   Save the `canvasId` as `INTEGRATION_CANVAS_ID`

2. **Modify Workflow via AI**:
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Add audio generation with ElevenLabs",
       "canvasId": "INTEGRATION_CANVAS_ID"
     }'
   ```

3. **Run Workflow via AI**:
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Run the workflow with input: A sunset over the ocean",
       "canvasId": "INTEGRATION_CANVAS_ID"
     }'
   ```
   Save the `runId` as `INTEGRATION_RUN_ID`

4. **Check Status via AI**:
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Check the status",
       "runId": "INTEGRATION_RUN_ID"
     }'
   ```

5. **Verify Complete Flow**:
   - Canvas was created with correct structure
   - Canvas was modified to include ElevenLabs
   - Workflow execution started
   - Status can be retrieved

6. **Expected Result**: Complete AI-driven workflow lifecycle works end-to-end


---

## Visual Verification Checklist

Since this is a backend API implementation, there are no UI components to verify. However, you should verify the following:

### API Response Structure
- [ ] All responses follow consistent JSON structure
- [ ] Error responses include `error`, `code`, and optional `details` fields
- [ ] Success responses include expected data fields
- [ ] Status codes are appropriate (200, 201, 400, 404, 500)

### Data Integrity
- [ ] Created canvases appear in database (`stitch_flows` table)
- [ ] Versions are created in `stitch_flow_versions` table
- [ ] Runs are recorded in `stitch_runs` table
- [ ] Node states are persisted correctly
- [ ] Foreign key relationships are maintained

### Validation Behavior
- [ ] Invalid worker types are rejected
- [ ] Missing required fields are caught
- [ ] Cyclic graphs are detected
- [ ] Entity movement rules are validated
- [ ] Edge references are verified

### Error Messages
- [ ] Error messages are clear and actionable
- [ ] Mermaid parse errors include helpful hints
- [ ] Validation errors specify which field failed
- [ ] Database errors don't expose sensitive information

### Versioning System
- [ ] Versions are created on canvas updates
- [ ] Versions are created on workflow runs
- [ ] Duplicate versions are not created for unchanged canvases
- [ ] `current_version_id` points to latest version
- [ ] Version history is preserved

---

## Edge Cases to Test

### Edge Case 1: Empty Canvas
**Test**: Create a canvas with no nodes or edges
```bash
curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empty Canvas",
    "format": "json",
    "content": {
      "nodes": [],
      "edges": []
    }
  }'
```
**Expected**: Should succeed (empty canvases are valid)

---

### Edge Case 2: Single Node Canvas
**Test**: Create a canvas with one node and no edges
```bash
curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Single Node",
    "format": "json",
    "content": {
      "nodes": [
        {
          "id": "node-1",
          "type": "ux",
          "position": { "x": 0, "y": 0 },
          "data": { "label": "Lonely Node" }
        }
      ],
      "edges": []
    }
  }'
```
**Expected**: Should succeed

---

### Edge Case 3: Disconnected Nodes
**Test**: Create a canvas with nodes that aren't connected
```bash
curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Disconnected",
    "format": "json",
    "content": {
      "nodes": [
        {
          "id": "node-1",
          "type": "ux",
          "position": { "x": 0, "y": 0 },
          "data": { "label": "Island 1" }
        },
        {
          "id": "node-2",
          "type": "ux",
          "position": { "x": 300, "y": 0 },
          "data": { "label": "Island 2" }
        }
      ],
      "edges": []
    }
  }'
```
**Expected**: Should succeed (disconnected nodes are allowed)

---

### Edge Case 4: Self-Loop Edge
**Test**: Create an edge from a node to itself
```bash
curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Self Loop",
    "format": "json",
    "content": {
      "nodes": [
        {
          "id": "node-1",
          "type": "worker",
          "position": { "x": 0, "y": 0 },
          "data": { "label": "Loop", "worker_type": "claude" }
        }
      ],
      "edges": [
        { "id": "e1", "source": "node-1", "target": "node-1" }
      ]
    }
  }'
```
**Expected**: Should be rejected (creates a cycle)


---

### Edge Case 5: Very Long Node Labels
**Test**: Create nodes with extremely long labels
```bash
curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long Labels",
    "format": "json",
    "content": {
      "nodes": [
        {
          "id": "node-1",
          "type": "ux",
          "position": { "x": 0, "y": 0 },
          "data": { 
            "label": "This is an extremely long label that goes on and on and on and might cause issues with rendering or storage but should still be accepted by the API because there is no explicit length limit defined in the schema"
          }
        }
      ],
      "edges": []
    }
  }'
```
**Expected**: Should succeed (no length limit enforced)

---

### Edge Case 6: Special Characters in Labels
**Test**: Create nodes with special characters
```bash
curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Special Chars",
    "format": "json",
    "content": {
      "nodes": [
        {
          "id": "node-1",
          "type": "ux",
          "position": { "x": 0, "y": 0 },
          "data": { 
            "label": "Node with émojis 🎉 and symbols @#$%^&*()"
          }
        }
      ],
      "edges": []
    }
  }'
```
**Expected**: Should succeed (special characters are allowed)

---

### Edge Case 7: Duplicate Node IDs
**Test**: Create canvas with duplicate node IDs
```bash
curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Duplicate IDs",
    "format": "json",
    "content": {
      "nodes": [
        {
          "id": "node-1",
          "type": "ux",
          "position": { "x": 0, "y": 0 },
          "data": { "label": "First" }
        },
        {
          "id": "node-1",
          "type": "ux",
          "position": { "x": 300, "y": 0 },
          "data": { "label": "Second" }
        }
      ],
      "edges": []
    }
  }'
```
**Expected**: Behavior depends on implementation (may succeed with last node winning, or may be rejected)

---

### Edge Case 8: Missing ANTHROPIC_API_KEY
**Test**: AI Manager without API key configured
1. Remove or comment out `ANTHROPIC_API_KEY` from `.env.local`
2. Restart the server
3. Send AI Manager request:
   ```bash
   curl -X POST http://localhost:3000/api/ai-manager \
     -H "Content-Type: application/json" \
     -d '{
       "request": "Create a simple workflow"
     }'
   ```
**Expected**: Should return error about missing API key

---

### Edge Case 9: Very Large Canvas
**Test**: Create canvas with many nodes (100+)
```bash
# Generate a large canvas programmatically
node -e "
const nodes = Array.from({length: 100}, (_, i) => ({
  id: \`node-\${i}\`,
  type: 'ux',
  position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
  data: { label: \`Node \${i}\` }
}));
const edges = Array.from({length: 99}, (_, i) => ({
  id: \`e\${i}\`,
  source: \`node-\${i}\`,
  target: \`node-\${i+1}\`
}));
console.log(JSON.stringify({
  name: 'Large Canvas',
  format: 'json',
  content: { nodes, edges }
}));
" | curl -X POST http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d @-
```
**Expected**: Should succeed (no size limit enforced)

---

### Edge Case 10: Concurrent Workflow Runs
**Test**: Start multiple runs of the same canvas simultaneously
1. Create a canvas (save ID as `CONCURRENT_TEST_ID`)
2. Send 5 run requests in quick succession:
   ```bash
   for i in {1..5}; do
     curl -X POST http://localhost:3000/api/canvas/CONCURRENT_TEST_ID/run \
       -H "Content-Type: application/json" \
       -d '{ "input": {} }' &
   done
   wait
   ```
**Expected**: All 5 runs should be created with unique run IDs

---

## Performance Considerations

### Response Time Benchmarks
- **GET /api/canvas**: Should respond in < 100ms
- **POST /api/canvas**: Should respond in < 500ms
- **POST /api/canvas/[id]/run**: Should respond in < 1000ms
- **POST /api/ai-manager**: May take 2-10 seconds (depends on LLM response time)

### Database Query Optimization
- Verify indexes exist on frequently queried fields
- Check that version queries don't cause N+1 problems
- Monitor query performance with large datasets

---

## Troubleshooting Guide

### Issue: "ANTHROPIC_API_KEY environment variable is not set"
**Solution**: 
1. Create `.env.local` file in `stitch-run/` directory
2. Add: `ANTHROPIC_API_KEY=your-key-here`
3. Restart the development server

### Issue: "Canvas not found" errors
**Solution**:
1. Verify the canvas ID is correct (use GET /api/canvas to list all)
2. Check database connection is working
3. Ensure migrations have been run

### Issue: "Failed to parse JSON from code block"
**Solution**:
1. This indicates the LLM returned invalid JSON
2. Check the LLM response in server logs
3. May need to adjust prompt template or retry the request

### Issue: Workflow runs never complete
**Solution**:
1. Check worker webhook callbacks are configured correctly
2. Verify `NEXT_PUBLIC_BASE_URL` is set correctly
3. Check worker services are running and accessible
4. Review node states in `stitch_runs` table

### Issue: Version conflicts or duplicate versions
**Solution**:
1. Check `current_version_id` in `stitch_flows` table
2. Verify version creation logic in `version-manager.ts`
3. May need to manually update `current_version_id` if corrupted

---

## Test Automation

All tests can be automated using the test suite:

```bash
# Run all tests
cd stitch-run
npm test

# Run specific test suites
npm test src/lib/ai/__tests__/
npm test src/app/api/canvas/__tests__/
npm test src/app/api/ai-manager/__tests__/

# Run integration tests only
npm test -- --grep "integration"

# Run with coverage
npm test -- --coverage
```

### Test Coverage Goals
- **Unit Tests**: > 90% coverage
- **Integration Tests**: All API endpoints covered
- **Property Tests**: Edge cases and validation logic
- **End-to-End Tests**: Complete workflows from creation to execution

---

## Success Criteria

The AI Manager implementation is considered successful when:

✅ All 22 manual tests pass without errors
✅ All automated tests pass (unit, integration, property)
✅ Error messages are clear and actionable
✅ Versioning system works correctly
✅ Canvas validation catches all invalid inputs
✅ AI Manager can create, modify, run, and monitor workflows
✅ Database integrity is maintained across all operations
✅ Performance meets benchmarks
✅ Edge cases are handled gracefully

---

## Next Steps After Testing

Once testing is complete:

1. **Document any bugs found** in GitHub issues
2. **Update API documentation** with any discovered behaviors
3. **Add additional test cases** for any edge cases found during manual testing
4. **Performance optimization** if response times exceed benchmarks
5. **Security review** of API endpoints and error messages
6. **Integration with frontend** (if applicable)
7. **Production deployment** checklist and monitoring setup

