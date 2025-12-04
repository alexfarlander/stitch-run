# AI Manager API

The AI Manager API enables natural language control of Stitch workflows through an LLM-powered service.

## Endpoint

```
POST /api/ai-manager
```

## Request Format

```typescript
{
  request: string;      // Natural language description of desired action
  canvasId?: string;    // Optional: Canvas ID for modification requests
}
```

## Response Format

```typescript
{
  action: 'CREATE_WORKFLOW' | 'MODIFY_WORKFLOW' | 'RUN_WORKFLOW' | 'GET_STATUS';
  result: any;  // Action-specific result
}
```

## Actions

### CREATE_WORKFLOW

Creates a new workflow from a natural language description.

**Example Request:**
```json
{
  "request": "Create a video generation workflow that takes a text prompt and generates a video using MiniMax"
}
```

**Example Response:**
```json
{
  "action": "CREATE_WORKFLOW",
  "result": {
    "canvasId": "canvas-abc-123",
    "canvas": {
      "nodes": [
        {
          "id": "input-1",
          "type": "ux",
          "data": {
            "label": "Enter Video Prompt",
            "inputFields": ["prompt"]
          }
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
          }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "input-1",
          "target": "generate-video-1",
          "data": {
            "mapping": {
              "visual_prompt": "prompt"
            }
          }
        }
      ]
    }
  }
}
```

### MODIFY_WORKFLOW

Modifies an existing workflow based on natural language instructions.

**Example Request:**
```json
{
  "request": "Add voice narration using ElevenLabs after the video generation",
  "canvasId": "canvas-abc-123"
}
```

**Example Response:**
```json
{
  "action": "MODIFY_WORKFLOW",
  "result": {
    "canvasId": "canvas-abc-123",
    "canvas": {
      "nodes": [
        // Updated nodes including new voice generation node
      ],
      "edges": [
        // Updated edges
      ]
    }
  }
}
```

### RUN_WORKFLOW

Executes a workflow with specified input data.

**Example Request:**
```json
{
  "request": "Run the video generation workflow with the prompt 'A cat playing piano'"
}
```

**Example Response:**
```json
{
  "action": "RUN_WORKFLOW",
  "result": {
    "runId": "run-xyz-789",
    "status": "running",
    "statusUrl": "https://example.com/api/canvas/canvas-abc-123/status?runId=run-xyz-789"
  }
}
```

### GET_STATUS

Checks the status of a running workflow.

**Example Request:**
```json
{
  "request": "What's the status of run run-xyz-789?"
}
```

**Example Response:**
```json
{
  "action": "GET_STATUS",
  "result": {
    "runId": "run-xyz-789",
    "status": "completed",
    "nodes": {
      "input-1": {
        "status": "completed",
        "output": { "prompt": "A cat playing piano" }
      },
      "generate-video-1": {
        "status": "completed",
        "output": { "videoUrl": "https://..." }
      }
    },
    "finalOutputs": {
      "generate-video-1": { "videoUrl": "https://..." }
    },
    "statusUrl": "https://example.com/api/canvas/canvas-abc-123/status?runId=run-xyz-789"
  }
}
```

## Error Handling

The API returns standard HTTP error codes:

- `400 Bad Request`: Invalid request format or validation errors
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Canvas or run not found
- `500 Internal Server Error`: Server or LLM errors

**Error Response Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["Additional details"]
}
```

## Environment Variables

Required:
- `ANTHROPIC_API_KEY`: API key for Claude LLM

Optional:
- `AI_MANAGER_MODEL`: Claude model to use (default: claude-sonnet-4-20250514)
- `AI_MANAGER_MAX_TOKENS`: Maximum tokens for LLM response (default: 4096)
- `NEXT_PUBLIC_BASE_URL`: Base URL for callback URLs

## Examples

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
    "canvasId": "canvas-abc-123"
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
    "request": "What is the status of run run-xyz-789?"
  }'
```

### Using JavaScript/TypeScript

```typescript
async function createWorkflow(description: string) {
  const response = await fetch('/api/ai-manager', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request: description
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
}

// Usage
const result = await createWorkflow(
  'Create a video generation workflow with Claude script generation and MiniMax video generation'
);

console.log('Created canvas:', result.result.canvasId);
```

## Available Workers

The AI Manager can use the following workers in workflows:

- **claude**: Text generation and analysis
- **minimax**: Video generation from text prompts
- **elevenlabs**: Voice/audio generation
- **shotstack**: Video assembly and editing

## Tips for Natural Language Requests

1. **Be specific**: "Create a workflow with Claude for script generation and MiniMax for video generation"
2. **Use worker names**: Reference specific workers (Claude, MiniMax, ElevenLabs, Shotstack)
3. **Describe data flow**: "Connect the output of Claude to the input of MiniMax"
4. **Mention parallelization**: "Generate 3 videos in parallel and then combine them"
5. **Reference existing canvases**: Include `canvasId` when modifying workflows

## Limitations

- The AI Manager requires an active internet connection to call the LLM
- Complex workflows may require multiple iterations to get right
- The LLM may occasionally generate invalid workflows (validation errors will be returned)
- Rate limits apply based on your Anthropic API plan

## Testing

Run the unit tests:
```bash
npm test src/app/api/ai-manager/__tests__/route.test.ts
```

Run the integration tests (requires ANTHROPIC_API_KEY):
```bash
npm test src/app/api/ai-manager/__tests__/integration.test.ts
```
