# AI Manager API Quick Start Guide

## Prerequisites

- Base URL: `https://your-domain.com/api` (or `http://localhost:3000/api` for development)
- Authentication token (if required)
- `ANTHROPIC_API_KEY` environment variable set for AI Manager

## Quick Examples

### 1. List All Canvases

```bash
curl -X GET https://your-domain.com/api/canvas
```

**Response**:
```json
{
  "canvases": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Video Pipeline",
      "created_at": "2024-12-04T10:00:00Z",
      "updated_at": "2024-12-04T10:30:00Z",
      "node_count": 5,
      "edge_count": 4
    }
  ]
}
```

---

### 2. Create Canvas from JSON

```bash
curl -X POST https://your-domain.com/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simple Workflow",
    "format": "json",
    "content": {
      "nodes": [
        {
          "id": "ux-1",
          "type": "ux",
          "position": { "x": 0, "y": 0 },
          "data": {
            "label": "Input",
            "prompt": "Enter your request"
          }
        },
        {
          "id": "worker-1",
          "type": "worker",
          "position": { "x": 200, "y": 0 },
          "data": {
            "label": "Generate Text",
            "worker_type": "claude",
            "config": {
              "model": "claude-sonnet-4-20250514",
              "max_tokens": 1000
            }
          }
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": "ux-1",
          "target": "worker-1"
        }
      ]
    }
  }'
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  }
}
```

---

### 3. Create Canvas from Mermaid

```bash
curl -X POST https://your-domain.com/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mermaid Workflow",
    "format": "mermaid",
    "content": "flowchart LR\n    A[UX: Input] --> B[Worker: claude]\n    B --> C[Worker: minimax]"
  }'
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "canvas": {
    "nodes": [
      {
        "id": "A",
        "type": "ux",
        "data": { "label": "Input" },
        "position": { "x": 0, "y": 0 }
      },
      {
        "id": "B",
        "type": "worker",
        "data": {
          "label": "claude",
          "worker_type": "claude"
        },
        "position": { "x": 200, "y": 0 }
      }
    ],
    "edges": [...]
  }
}
```

---

### 4. Get Canvas by ID

```bash
curl -X GET https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Simple Workflow",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  },
  "created_at": "2024-12-04T10:00:00Z",
  "updated_at": "2024-12-04T10:30:00Z"
}
```

---

### 5. Update Canvas

```bash
curl -X PUT https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Workflow",
    "canvas": {
      "nodes": [...],
      "edges": [...]
    }
  }'
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  },
  "updated_at": "2024-12-04T11:00:00Z"
}
```

---

### 6. Delete Canvas

```bash
curl -X DELETE https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000
```

**Response**:
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 7. Run Workflow

```bash
curl -X POST https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "Generate a video about AI",
      "duration": 30
    },
    "entityId": "customer-123"
  }'
```

**Response**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "versionId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "statusUrl": "https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000/status?runId=660e8400-e29b-41d4-a716-446655440000"
}
```

---

### 8. Get Workflow Status

```bash
curl -X GET "https://your-domain.com/api/canvas/550e8400-e29b-41d4-a716-446655440000/status?runId=660e8400-e29b-41d4-a716-446655440000"
```

**Response (Running)**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "nodes": {
    "ux-1": {
      "status": "completed",
      "output": {
        "prompt": "Generate a video about AI"
      }
    },
    "worker-1": {
      "status": "running"
    }
  },
  "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
}
```

**Response (Completed)**:
```json
{
  "runId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "nodes": {
    "ux-1": {
      "status": "completed",
      "output": {
        "prompt": "Generate a video about AI"
      }
    },
    "worker-1": {
      "status": "completed",
      "output": {
        "video_url": "https://example.com/video.mp4"
      }
    }
  },
  "finalOutputs": {
    "worker-1": {
      "video_url": "https://example.com/video.mp4"
    }
  },
  "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
}
```

---

### 9. AI Manager - Create Workflow

```bash
curl -X POST https://your-domain.com/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Create a workflow that generates a video from text using Claude and Minimax"
  }'
```

**Response**:
```json
{
  "action": "CREATE_WORKFLOW",
  "result": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "canvas": {
      "nodes": [
        {
          "id": "ux-1",
          "type": "ux",
          "data": {
            "label": "Input",
            "prompt": "Enter text for video"
          },
          "position": { "x": 0, "y": 0 }
        },
        {
          "id": "worker-1",
          "type": "worker",
          "data": {
            "label": "Generate Script",
            "worker_type": "claude",
            "config": {
              "model": "claude-sonnet-4-20250514",
              "max_tokens": 2000
            }
          },
          "position": { "x": 200, "y": 0 }
        },
        {
          "id": "worker-2",
          "type": "worker",
          "data": {
            "label": "Generate Video",
            "worker_type": "minimax",
            "config": {
              "duration": 30
            }
          },
          "position": { "x": 400, "y": 0 }
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": "ux-1",
          "target": "worker-1"
        },
        {
          "id": "edge-2",
          "source": "worker-1",
          "target": "worker-2"
        }
      ]
    }
  }
}
```

---

### 10. AI Manager - Modify Workflow

```bash
curl -X POST https://your-domain.com/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Add a voice generation step using ElevenLabs after the video",
    "canvasId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response**:
```json
{
  "action": "MODIFY_WORKFLOW",
  "result": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "canvas": {
      "nodes": [...],
      "edges": [...]
    },
    "changes": [
      "Added ElevenLabs voice generation node",
      "Connected video output to voice node"
    ]
  }
}
```

---

### 11. AI Manager - Run Workflow

```bash
curl -X POST https://your-domain.com/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Run the workflow with input: Generate a video about space exploration",
    "canvasId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response**:
```json
{
  "action": "RUN_WORKFLOW",
  "result": {
    "runId": "660e8400-e29b-41d4-a716-446655440000",
    "versionId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "statusUrl": "https://your-domain.com/api/canvas/550e8400/status?runId=660e8400"
  }
}
```

---

### 12. AI Manager - Get Status

```bash
curl -X POST https://your-domain.com/api/ai-manager \
  -H "Content-Type: application/json" \
  -d '{
    "request": "What is the status of run 660e8400-e29b-41d4-a716-446655440000?"
  }'
```

**Response**:
```json
{
  "action": "GET_STATUS",
  "result": {
    "runId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "nodes": {
      "worker-1": {
        "status": "completed",
        "output": {
          "script": "Space exploration has transformed..."
        }
      },
      "worker-2": {
        "status": "completed",
        "output": {
          "video_url": "https://example.com/space-video.mp4"
        }
      }
    },
    "finalOutputs": {
      "worker-2": {
        "video_url": "https://example.com/space-video.mp4"
      }
    }
  }
}
```

---

## Polling for Status

Use this bash script to poll for workflow completion:

```bash
#!/bin/bash

CANVAS_ID="550e8400-e29b-41d4-a716-446655440000"
RUN_ID="660e8400-e29b-41d4-a716-446655440000"
BASE_URL="https://your-domain.com/api"

while true; do
  RESPONSE=$(curl -s "${BASE_URL}/canvas/${CANVAS_ID}/status?runId=${RUN_ID}")
  STATUS=$(echo $RESPONSE | jq -r '.status')
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    echo "Workflow finished!"
    echo $RESPONSE | jq '.'
    break
  fi
  
  sleep 2
done
```

---

## JavaScript/TypeScript Examples

### Using Fetch API

```typescript
// Create canvas
const createCanvas = async () => {
  const response = await fetch('https://your-domain.com/api/canvas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'My Workflow',
      format: 'json',
      content: {
        nodes: [...],
        edges: [...]
      }
    })
  });
  
  const data = await response.json();
  return data.id;
};

// Run workflow
const runWorkflow = async (canvasId: string) => {
  const response = await fetch(`https://your-domain.com/api/canvas/${canvasId}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt: 'Generate a video about AI'
      }
    })
  });
  
  const data = await response.json();
  return data.runId;
};

// Poll for status
const waitForCompletion = async (canvasId: string, runId: string) => {
  while (true) {
    const response = await fetch(
      `https://your-domain.com/api/canvas/${canvasId}/status?runId=${runId}`
    );
    const data = await response.json();
    
    console.log('Status:', data.status);
    
    if (data.status === 'completed' || data.status === 'failed') {
      return data;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

// AI Manager - Create workflow
const createWithAI = async (request: string) => {
  const response = await fetch('https://your-domain.com/api/ai-manager', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request })
  });
  
  const data = await response.json();
  return data.result;
};

// Complete workflow
const main = async () => {
  // Create canvas with AI
  const createResult = await createWithAI(
    'Create a workflow that generates a video from text using Claude and Minimax'
  );
  const canvasId = createResult.id;
  
  // Run workflow
  const runId = await runWorkflow(canvasId);
  
  // Wait for completion
  const result = await waitForCompletion(canvasId, runId);
  
  console.log('Final outputs:', result.finalOutputs);
};
```

---

## Python Examples

```python
import requests
import time
import json

BASE_URL = "https://your-domain.com/api"

# Create canvas
def create_canvas(name, canvas_data):
    response = requests.post(
        f"{BASE_URL}/canvas",
        json={
            "name": name,
            "format": "json",
            "content": canvas_data
        }
    )
    return response.json()["id"]

# Run workflow
def run_workflow(canvas_id, input_data):
    response = requests.post(
        f"{BASE_URL}/canvas/{canvas_id}/run",
        json={"input": input_data}
    )
    return response.json()["runId"]

# Get status
def get_status(canvas_id, run_id):
    response = requests.get(
        f"{BASE_URL}/canvas/{canvas_id}/status",
        params={"runId": run_id}
    )
    return response.json()

# Wait for completion
def wait_for_completion(canvas_id, run_id):
    while True:
        status = get_status(canvas_id, run_id)
        print(f"Status: {status['status']}")
        
        if status["status"] in ["completed", "failed"]:
            return status
        
        time.sleep(2)

# AI Manager - Create workflow
def create_with_ai(request):
    response = requests.post(
        f"{BASE_URL}/ai-manager",
        json={"request": request}
    )
    return response.json()["result"]

# Complete workflow
if __name__ == "__main__":
    # Create canvas with AI
    result = create_with_ai(
        "Create a workflow that generates a video from text using Claude and Minimax"
    )
    canvas_id = result["id"]
    
    # Run workflow
    run_id = run_workflow(canvas_id, {
        "prompt": "Generate a video about AI"
    })
    
    # Wait for completion
    final_result = wait_for_completion(canvas_id, run_id)
    
    print("Final outputs:", json.dumps(final_result["finalOutputs"], indent=2))
```

---

## Error Handling

Always check for error responses:

```typescript
const response = await fetch('https://your-domain.com/api/canvas', {
  method: 'POST',
  body: JSON.stringify(request)
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${error.code}: ${error.error}`);
  
  if (error.details) {
    console.error('Details:', error.details);
  }
  
  throw new Error(error.error);
}

const data = await response.json();
```

---

## Common Error Codes

| Code | Status | Description | Solution |
|------|--------|-------------|----------|
| `BAD_REQUEST` | 400 | Invalid input | Check request format and required fields |
| `NOT_FOUND` | 404 | Resource not found | Verify canvas/run ID exists |
| `VALIDATION_ERROR` | 400 | Canvas validation failed | Check for cycles, disconnected nodes, invalid workers |
| `PARSE_ERROR` | 400 | Mermaid parsing failed | Verify Mermaid syntax |
| `LLM_ERROR` | 401/500 | LLM API error | Check `ANTHROPIC_API_KEY` environment variable |
| `INTERNAL_ERROR` | 500 | Server error | Check server logs |

---

## Environment Variables

Required for AI Manager:

```bash
# Anthropic API key for Claude LLM
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Customize LLM model
AI_MANAGER_MODEL=claude-sonnet-4-20250514

# Optional: Customize max tokens
AI_MANAGER_MAX_TOKENS=4096

# Base URL for callback URLs
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

---

## Next Steps

1. **Explore the full API documentation**: See `AI_MANAGER_API.md` for detailed endpoint documentation
2. **Review OpenAPI spec**: Import `openapi.yaml` into Swagger UI or Postman
3. **Try natural language examples**: Experiment with different AI Manager requests
4. **Build integrations**: Use the API in your applications, CLI tools, or automation scripts

---

## Support

For issues or questions:
- Review error messages and codes
- Check environment variables
- Verify canvas structure
- Consult the full API documentation
