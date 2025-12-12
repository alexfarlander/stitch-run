# AI Manager API

## Overview

The AI Manager API enables natural language control of Stitch workflows through an LLM-powered service. It accepts plain English requests and translates them into canvas operations, allowing users to create, modify, run, and monitor workflows without writing code.

**Endpoint:** `POST /api/ai-manager`

**Related Files:**
- Implementation: `src/app/api/ai-manager/route.ts`
- LLM Client: `src/lib/ai/llm-client.ts`
- Context Builder: `src/lib/ai/context-builder.ts`
- Action Executor: `src/lib/ai/action-executor.ts`
- Prompt Templates: `src/lib/ai/prompt-template.ts`

## Architecture

The AI Manager follows a pipeline architecture:

```
User Request → Context Builder → LLM Client → Action Executor → Database
```

1. **Context Builder**: Loads worker definitions and strips UI properties from canvases
2. **LLM Client**: Sends structured prompt to Claude and receives JSON response
3. **Action Executor**: Parses, validates, and routes the LLM response to appropriate handlers
4. **Database**: Persists canvas changes and execution state

## Request Format

### Request Body

```typescript
{
  request: string;      // Natural language description of desired action
  canvasId?: string;    // Optional: Canvas ID for modification requests
}
```

### Fields

- **request** (required): A natural language string describing what you want to do
  - Examples: "Create a video generation workflow", "Add voice narration", "Run the workflow"
  - Must be non-empty
  
- **canvasId** (optional): UUID of an existing canvas
  - Required for MODIFY_WORKFLOW actions
  - Optional for other actions (LLM will infer from context)

### Example Requests

```json
// Create a new workflow
{
  "request": "Create a workflow that generates a video from a text prompt using MiniMax"
}

// Modify an existing workflow
{
  "request": "Add voice narration using ElevenLabs after the video generation",
  "canvasId": "550e8400-e29b-41d4-a716-446655440000"
}

// Run a workflow
{
  "request": "Run the video generation workflow with the prompt 'A cat playing piano'"
}

// Check status
{
  "request": "What's the status of run abc-123-def?"
}
```

## Response Format

### Success Response

```typescript
{
  action: 'CREATE_WORKFLOW' | 'MODIFY_WORKFLOW' | 'RUN_WORKFLOW' | 'GET_STATUS';
  result: any;  // Action-specific result (see below)
}
```

### Error Response

```typescript
{
  error: string;        // Human-readable error message
  code: string;         // Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
  details?: string[];   // Optional additional error details
}
```

### HTTP Status Codes

- **200 OK**: Request processed successfully
- **400 Bad Request**: Invalid request format or validation errors
- **401 Unauthorized**: Missing or invalid ANTHROPIC_API_KEY
- **404 Not Found**: Canvas or run not found
- **500 Internal Server Error**: Server or LLM errors

## Action Types

The AI Manager supports four action types, each with its own payload and response format.

### 1. CREATE_WORKFLOW

Creates a new workflow canvas from a natural language description.

**When to Use:**
- "Create a workflow that..."
- "Build a canvas for..."
- "Set up a flow to..."

**LLM Payload:**
```typescript
{
  name: string;           // Workflow name
  canvas: VisualGraph;    // Complete canvas structure
  mermaid?: string;       // Optional Mermaid diagram
}
```

**API Response:**
```typescript
{
  action: "CREATE_WORKFLOW",
  result: {
    canvasId: string;     // UUID of created canvas
    canvas: {
      nodes: Node[];      // All nodes in the workflow
      edges: Edge[];      // All edges connecting nodes
    }
  }
}
```

**Example:**

Request:
```json
{
  "request": "Create a video generation workflow with Claude for script generation and MiniMax for video creation"
}
```

Response:
```json
{
  "action": "CREATE_WORKFLOW",
  "result": {
    "canvasId": "550e8400-e29b-41d4-a716-446655440000",
    "canvas": {
      "nodes": [
        {
          "id": "input-1",
          "type": "ux",
          "data": {
            "label": "Enter Video Topic",
            "inputFields": ["topic"]
          },
          "position": { "x": 100, "y": 100 }
        },
        {
          "id": "generate-script-1",
          "type": "worker",
          "data": {
            "label": "Generate Script",
            "worker_type": "claude",
            "config": {
              "model": "claude-sonnet-4-20250514",
              "max_tokens": 1000
            }
          },
          "position": { "x": 300, "y": 100 }
        },
        {
          "id": "generate-video-1",
          "type": "worker",
          "data": {
            "label": "Generate Video",
            "worker_type": "minimax",
            "config": {
              "duration": 5
            }
          },
          "position": { "x": 500, "y": 100 }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "input-1",
          "target": "generate-script-1",
          "data": {
            "mapping": {
              "prompt": "topic"
            }
          }
        },
        {
          "id": "e2",
          "source": "generate-script-1",
          "target": "generate-video-1",
          "data": {
            "mapping": {
              "visual_prompt": "text"
            }
          }
        }
      ]
    }
  }
}
```

**Validation:**

The CREATE_WORKFLOW handler performs extensive validation:

1. **Node Validation** (Requirement 4.5):
   - All nodes must have `id`, `type`, `data`, and `data.label`
   - Worker nodes must have valid `worker_type` (Requirement 7.3)
   - Worker nodes must have `config` object (Requirement 7.4)
   - Entity movement configuration must be valid (Requirements 10.1-10.5)

2. **Edge Validation**:
   - All edges must have `id`, `source`, and `target`
   - Source and target must reference existing nodes

3. **Graph Validation** (Requirement 4.1):
   - No cycles (except intentional loops)
   - No disconnected nodes
   - Valid entry and terminal nodes

### 2. MODIFY_WORKFLOW

Modifies an existing workflow based on natural language instructions.

**When to Use:**
- "Add a node to..."
- "Remove the X step from..."
- "Change the configuration of..."
- "Connect X to Y"

**LLM Payload:**
```typescript
{
  canvasId: string;       // Canvas to modify
  canvas: VisualGraph;    // Updated canvas structure
  changes: string[];      // Description of changes made
}
```

**API Response:**
```typescript
{
  action: "MODIFY_WORKFLOW",
  result: {
    canvasId: string;     // UUID of modified canvas (same as input)
    canvas: {
      nodes: Node[];      // Updated nodes
      edges: Edge[];      // Updated edges
    }
  }
}
```

**Example:**

Request:
```json
{
  "request": "Add voice narration using ElevenLabs after the video generation",
  "canvasId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response:
```json
{
  "action": "MODIFY_WORKFLOW",
  "result": {
    "canvasId": "550e8400-e29b-41d4-a716-446655440000",
    "canvas": {
      "nodes": [
        // ... existing nodes ...
        {
          "id": "voice-narration-1",
          "type": "worker",
          "data": {
            "label": "Add Voice Narration",
            "worker_type": "elevenlabs",
            "config": {
              "voice_id": "default"
            }
          },
          "position": { "x": 700, "y": 100 }
        }
      ],
      "edges": [
        // ... existing edges ...
        {
          "id": "e3",
          "source": "generate-video-1",
          "target": "voice-narration-1",
          "data": {
            "mapping": {
              "text": "script"
            }
          }
        }
      ]
    }
  }
}
```

**Modification Behavior:**

The MODIFY_WORKFLOW handler implements intelligent node ID management:

1. **Preserve Existing IDs** (Requirement 5.2):
   - Unchanged nodes keep their original IDs
   - Enables stable references and preserves run history

2. **Generate Unique IDs** (Requirement 5.3):
   - New nodes get unique IDs (e.g., `voice-narration-1`)
   - Conflicts are resolved with counters (e.g., `voice-narration-2`)

3. **Remove Orphaned Edges** (Requirement 5.4):
   - Edges referencing deleted nodes are automatically removed
   - Prevents invalid graph state

4. **Validate Result** (Requirement 5.5):
   - Modified canvas undergoes same validation as CREATE_WORKFLOW
   - Ensures graph integrity after modifications

### 3. RUN_WORKFLOW

Executes a workflow with specified input data.

**When to Use:**
- "Run the workflow with..."
- "Execute the canvas using..."
- "Start the flow with input..."

**LLM Payload:**
```typescript
{
  canvasId: string;              // Canvas to execute
  input: Record<string, any>;    // Input data for the workflow
}
```

**API Response:**
```typescript
{
  action: "RUN_WORKFLOW",
  result: {
    runId: string;        // UUID of the created run
    status: string;       // Initial status (usually "running")
    statusUrl: string;    // URL to poll for status updates
  }
}
```

**Example:**

Request:
```json
{
  "request": "Run the video generation workflow with the prompt 'A cat playing piano in a jazz club'"
}
```

Response:
```json
{
  "action": "RUN_WORKFLOW",
  "result": {
    "runId": "abc-123-def-456",
    "status": "running",
    "statusUrl": "https://example.com/api/canvas/550e8400-e29b-41d4-a716-446655440000/status?runId=abc-123-def-456"
  }
}
```

**Execution Flow:**

1. **Load Canvas**: Retrieves canvas by ID from database
2. **Get Current Version**: Loads the latest visual graph
3. **Create Version Snapshot**: Auto-versions the canvas for this run (Requirement 2.3)
4. **Compile to OEG**: Converts visual graph to optimized execution graph
5. **Start Run**: Creates run record and fires entry nodes
6. **Return Run ID**: Provides run ID for status tracking (Requirement 6.1)

**Status Polling:**

Use the returned `statusUrl` to poll for execution progress:

```bash
curl https://example.com/api/canvas/{canvasId}/status?runId={runId}
```

Or use the AI Manager with GET_STATUS action (see below).

### 4. GET_STATUS

Retrieves the current status of a workflow execution.

**When to Use:**
- "What's the status of run X?"
- "Check the progress of..."
- "Is the workflow complete?"

**LLM Payload:**
```typescript
{
  runId: string;    // Run ID to check
}
```

**API Response:**
```typescript
{
  action: "GET_STATUS",
  result: {
    runId: string;                    // Run ID
    status: 'pending' | 'running' | 'completed' | 'failed';
    nodes: Record<string, {           // Node-level status (Requirement 6.2)
      status: string;
      output?: any;                   // Output for completed nodes (Requirement 6.3)
      error?: string;                 // Error for failed nodes (Requirement 6.4)
    }>;
    finalOutputs?: Record<string, any>;  // Terminal node outputs (Requirement 6.5)
    statusUrl: string;                // URL for continued polling
  }
}
```

**Example:**

Request:
```json
{
  "request": "What's the status of run abc-123-def-456?"
}
```

Response (Running):
```json
{
  "action": "GET_STATUS",
  "result": {
    "runId": "abc-123-def-456",
    "status": "running",
    "nodes": {
      "input-1": {
        "status": "completed",
        "output": { "topic": "A cat playing piano in a jazz club" }
      },
      "generate-script-1": {
        "status": "running"
      },
      "generate-video-1": {
        "status": "pending"
      }
    },
    "statusUrl": "https://example.com/api/canvas/550e8400-e29b-41d4-a716-446655440000/status?runId=abc-123-def-456"
  }
}
```

Response (Completed):
```json
{
  "action": "GET_STATUS",
  "result": {
    "runId": "abc-123-def-456",
    "status": "completed",
    "nodes": {
      "input-1": {
        "status": "completed",
        "output": { "topic": "A cat playing piano in a jazz club" }
      },
      "generate-script-1": {
        "status": "completed",
        "output": { "text": "In a dimly lit jazz club..." }
      },
      "generate-video-1": {
        "status": "completed",
        "output": { "videoUrl": "https://cdn.example.com/video-123.mp4" }
      }
    },
    "finalOutputs": {
      "generate-video-1": {
        "videoUrl": "https://cdn.example.com/video-123.mp4"
      }
    },
    "statusUrl": "https://example.com/api/canvas/550e8400-e29b-41d4-a716-446655440000/status?runId=abc-123-def-456"
  }
}
```

Response (Failed):
```json
{
  "action": "GET_STATUS",
  "result": {
    "runId": "abc-123-def-456",
    "status": "failed",
    "nodes": {
      "input-1": {
        "status": "completed",
        "output": { "topic": "A cat playing piano in a jazz club" }
      },
      "generate-script-1": {
        "status": "completed",
        "output": { "text": "In a dimly lit jazz club..." }
      },
      "generate-video-1": {
        "status": "failed",
        "error": "MiniMax API rate limit exceeded"
      }
    },
    "statusUrl": "https://example.com/api/canvas/550e8400-e29b-41d4-a716-446655440000/status?runId=abc-123-def-456"
  }
}
```

**Status Determination:**

The overall status is derived from node states:
- **pending**: All nodes are pending
- **running**: At least one node is running or waiting_for_user
- **completed**: All nodes are completed
- **failed**: At least one node has failed

## Available Workers

The AI Manager can use the following workers in workflows:

| Worker | Type | Description | Key Config |
|--------|------|-------------|------------|
| **claude** | LLM | Text generation and analysis | `model`, `max_tokens`, `temperature` |
| **minimax** | Video | Video generation from text prompts | `duration`, `aspect_ratio` |
| **elevenlabs** | Audio | Voice/audio generation | `voice_id`, `model_id` |
| **shotstack** | Video | Video assembly and editing | `timeline`, `output` |
| **image-to-video** | Video | Convert images to video | `duration`, `motion` |
| **scene-parser** | Utility | Parse scripts into scenes | N/A |
| **wireframe-generator** | Utility | Generate UI wireframes | `style` |

For complete worker definitions and schemas, see `src/lib/workers/registry.ts`.

## Environment Variables

### Required

- **ANTHROPIC_API_KEY**: API key for Claude LLM
  - Get from: https://console.anthropic.com/
  - Used for all AI Manager requests

### Optional

- **AI_MANAGER_MODEL**: Claude model to use
  - Default: `claude-sonnet-4-20250514`
  - Options: Any Claude model from Anthropic

- **AI_MANAGER_MAX_TOKENS**: Maximum tokens for LLM response
  - Default: `4096`
  - Increase for complex workflows

- **NEXT_PUBLIC_BASE_URL**: Base URL for callback URLs
  - Default: `http://localhost:3000` (development)
  - Required for production deployments

## Usage Examples

### Using curl

```bash
# Create a workflow
curl -X POST http://localhost:3000/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Create a workflow that generates a video from a text prompt"
  }'

# Modify a workflow
curl -X POST http://localhost:3000/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Add voice narration after video generation",
    "canvasId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Run a workflow
curl -X POST http://localhost:3000/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Run the workflow with prompt: A cat playing piano"
  }'

# Check status
curl -X POST http://localhost:3000/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "What is the status of run abc-123-def-456?"
  }'
```

### Using JavaScript/TypeScript

```typescript
// Helper function
async function aiManager(request: string, canvasId?: string) {
  const response = await fetch('/api/ai-manager', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request, canvasId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI Manager request failed');
  }

  return response.json();
}

// Create a workflow
const createResult = await aiManager(
  'Create a video generation workflow with Claude and MiniMax'
);
console.log('Created canvas:', createResult.result.canvasId);

// Modify the workflow
const modifyResult = await aiManager(
  'Add voice narration using ElevenLabs',
  createResult.result.canvasId
);
console.log('Modified canvas:', modifyResult.result.canvasId);

// Run the workflow
const runResult = await aiManager(
  'Run the workflow with prompt: A cat playing piano'
);
console.log('Run ID:', runResult.result.runId);

// Poll for status
async function waitForCompletion(runId: string) {
  while (true) {
    const statusResult = await aiManager(`What's the status of run ${runId}?`);
    const status = statusResult.result.status;
    
    console.log('Status:', status);
    
    if (status === 'completed' || status === 'failed') {
      return statusResult.result;
    }
    
    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

const finalStatus = await waitForCompletion(runResult.result.runId);
console.log('Final outputs:', finalStatus.finalOutputs);
```

### Using React

```typescript
import { useState } from 'react';

function AIManagerDemo() {
  const [request, setRequest] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Enter your request..."
          rows={4}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Submit'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}
      
      {result && (
        <div className="result">
          <h3>Action: {result.action}</h3>
          <pre>{JSON.stringify(result.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## Tips for Natural Language Requests

### Be Specific

❌ Bad: "Create a workflow"
✅ Good: "Create a workflow that generates a video from a text prompt using MiniMax"

### Use Worker Names

❌ Bad: "Add text generation"
✅ Good: "Add Claude for script generation"

### Describe Data Flow

❌ Bad: "Connect the nodes"
✅ Good: "Connect the output of Claude to the input of MiniMax"

### Mention Parallelization

❌ Bad: "Generate multiple videos"
✅ Good: "Use a Splitter to generate 3 videos in parallel, then use a Collector to combine them"

### Reference Existing Canvases

❌ Bad: "Modify the workflow" (without canvasId)
✅ Good: Include `canvasId` in the request body

## Error Handling

### Common Errors

#### 400 Bad Request

**Cause**: Invalid request format or validation errors

**Examples**:
- Missing `request` field
- Empty `request` string
- Invalid canvas structure from LLM
- Node validation failures

**Solution**: Check request format and ensure all required fields are present

#### 401 Unauthorized

**Cause**: Missing or invalid ANTHROPIC_API_KEY

**Solution**: Set the environment variable:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

#### 404 Not Found

**Cause**: Canvas or run not found

**Examples**:
- Invalid `canvasId` in MODIFY_WORKFLOW
- Invalid `runId` in GET_STATUS

**Solution**: Verify the ID exists in the database

#### 500 Internal Server Error

**Cause**: Server or LLM errors

**Examples**:
- LLM API rate limits
- Database connection failures
- Unexpected LLM response format

**Solution**: Check server logs and retry

### Error Response Format

```typescript
{
  error: string;        // Human-readable error message
  code: string;         // Error code for programmatic handling
  details?: string[];   // Additional context (optional)
}
```

### Example Error Responses

```json
// Missing request field
{
  "error": "Request must be a non-empty string",
  "code": "BAD_REQUEST"
}

// Canvas not found
{
  "error": "Canvas not found: 550e8400-e29b-41d4-a716-446655440000",
  "code": "NOT_FOUND",
  "details": ["canvasId: 550e8400-e29b-41d4-a716-446655440000"]
}

// Invalid worker type
{
  "error": "AI-generated canvas failed validation",
  "code": "VALIDATION_ERROR",
  "details": [
    "Worker node \"generate-1\" has invalid worker type: \"invalid-worker\""
  ]
}

// LLM parsing error
{
  "error": "Failed to parse LLM response: No valid JSON found in LLM response",
  "code": "VALIDATION_ERROR",
  "details": [
    "PARSE_ERROR",
    "{\"responsePreview\":\"I apologize, but I cannot...\"}"
  ]
}
```

## Limitations

### LLM Limitations

- **Requires Internet**: AI Manager needs active connection to Anthropic API
- **Rate Limits**: Subject to Anthropic API rate limits
- **Occasional Errors**: LLM may generate invalid workflows (validation catches these)
- **Context Window**: Very large canvases may exceed LLM context limits

### Workflow Limitations

- **Complex Modifications**: Multi-step modifications may require multiple requests
- **Ambiguous Requests**: Vague requests may produce unexpected results
- **Worker Availability**: Can only use registered workers (see Available Workers section)

### Performance Considerations

- **LLM Latency**: Requests typically take 2-10 seconds
- **Canvas Size**: Large canvases increase processing time
- **Validation Overhead**: Complex validation adds ~100-500ms

## Testing

### Unit Tests

```bash
# Test the API route
npm test src/app/api/ai-manager/__tests__/route.test.ts

# Test action executor
npm test src/lib/ai/__tests__/action-executor.test.ts

# Test context builder
npm test src/lib/ai/__tests__/context-builder.test.ts
```

### Integration Tests

Requires `ANTHROPIC_API_KEY`:

```bash
# Run integration tests
npm test src/app/api/ai-manager/__tests__/integration.test.ts
```

### Manual Testing

```bash
# Start development server
npm run dev

# Test with curl
curl -X POST http://localhost:3000/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{"request": "Create a simple workflow with one Claude node"}'
```

## Related Documentation

- [REST Endpoints Overview](./rest-endpoints.md)
- [Canvas API](./canvas-api.md)
- [Workflow API](./workflow-api.md)
- [AI Manager Backend](../backend/ai-manager.md)
- [Worker System](../backend/worker-system.md)
- [Execution Engine](../backend/execution-engine.md)

## Requirements Mapping

This API documentation addresses the following requirements:

- **4.1**: Generate valid canvas with appropriate nodes and edges
- **4.2**: Select appropriate worker types based on task description
- **4.3**: Include Splitter and Collector nodes with correct configuration
- **4.4**: Configure entity movement rules for worker nodes
- **4.5**: Return canvas in JSON format with all required node properties
- **5.1**: Load current canvas state for modifications
- **5.2**: Preserve existing node identifiers where possible
- **5.3**: Generate unique node identifiers for new nodes
- **5.4**: Remove associated edges when nodes are deleted
- **5.5**: Validate resulting graph for cycles and disconnected nodes
- **6.1**: Return run identifier for status tracking
- **6.2**: Return current state of all nodes
- **6.3**: Include node outputs for completed nodes
- **6.4**: Return error details for failed workflows
- **6.5**: Return final outputs from terminal nodes
- **7.3**: Check for valid worker types
- **7.4**: Verify worker configuration
- **8.1**: AI Manager SHALL return JSON response with action type and payload
- **8.2**: CREATE_WORKFLOW response SHALL include complete canvas structure
- **8.3**: RUN_WORKFLOW response SHALL include run identifier
- **8.5**: AI Manager SHALL return valid, parseable JSON
- **10.1-10.5**: Verify entity movement configuration on worker nodes
