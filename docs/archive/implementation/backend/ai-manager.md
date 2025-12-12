# AI Manager

## Overview

The AI Manager is a natural language interface for Stitch that enables users to create, modify, and execute workflows using conversational requests. It leverages Large Language Models (LLMs) to interpret user intent and generate valid canvas structures with appropriate nodes, edges, and configurations.

**Key Capabilities:**
- Create new workflows from natural language descriptions
- Modify existing workflows based on user feedback
- Execute workflows with specified inputs
- Monitor workflow execution status
- Validate AI-generated canvases for correctness

**Location:** `src/lib/ai/`

## Architecture

The AI Manager consists of four main components that work together in a pipeline:

```
User Request → Context Builder → Prompt Template → LLM Client → Action Executor → Result
```

### Component Flow

1. **Context Builder**: Loads worker definitions and strips UI properties from canvases
2. **Prompt Template**: Generates comprehensive prompts with examples and rules
3. **LLM Client**: Communicates with Claude API with retry logic
4. **Action Executor**: Parses LLM responses and routes to appropriate handlers

## Components

### 1. LLM Client (`llm-client.ts`)

Provides an abstraction layer for interacting with Large Language Models.

**Features:**
- Abstract `LLMClient` interface for multiple LLM providers
- `ClaudeLLMClient` implementation using Anthropic's Claude API
- Exponential backoff retry logic for transient failures
- Timeout handling and rate limit detection
- Comprehensive error handling with error codes

**Configuration:**
```typescript
interface ClaudeLLMClientConfig {
  apiKey: string;
  model?: string;              // Default: 'claude-sonnet-4-20250514'
  maxTokens?: number;          // Default: 4096
  temperature?: number;        // Default: 1.0
  maxRetries?: number;         // Default: 3
  initialRetryDelayMs?: number; // Default: 1000
  maxRetryDelayMs?: number;    // Default: 10000
  timeoutMs?: number;          // Default: 60000
}
```

**Error Handling:**
- `TIMEOUT`: Request exceeded timeout limit (retryable)
- `RATE_LIMIT`: API rate limit exceeded (retryable)
- `INVALID_API_KEY`: Authentication failed (not retryable)
- `INVALID_REQUEST`: Malformed request (not retryable)
- `SERVER_ERROR`: LLM service error (retryable)

**Retry Logic:**
- Exponential backoff: `initialDelay * 2^attempt`
- Jitter: Random 0-25% of delay to prevent thundering herd
- Capped at `maxRetryDelayMs`
- Only retries on transient errors (timeouts, rate limits, server errors)

**Usage:**
```typescript
import { createLLMClient } from '@/lib/ai';

const client = createLLMClient(); // Uses ANTHROPIC_API_KEY from env
const response = await client.complete('Your prompt here');
```

### 2. Context Builder (`context-builder.ts`)

Builds structured context for LLM requests by preparing canvas data and loading worker definitions.

**Key Functions:**

**`stripNodeUIProperties(node: VisualNode): StrippedNode`**
- Removes UI-only properties: `position`, `style`, `width`, `height`, `parentNode`, `extent`
- Preserves execution data: `id`, `type`, `worker_type`, `config`, `inputs`, `outputs`, `entityMovement`
- Reduces token usage by ~60% for large canvases

**`stripEdgeUIProperties(edge: VisualEdge): StrippedEdge`**
- Removes UI properties: `sourceHandle`, `targetHandle`, `type`, `animated`, `style`
- Preserves data flow: `source`, `target`, `mapping`

**`stripCanvasUIProperties(canvas: VisualGraph): StrippedCanvas`**
- Strips all nodes and edges in a canvas
- Returns minimal representation for LLM context

**`loadWorkerDefinitions(): WorkerDefinition[]`**
- Loads all available workers from registry
- Includes input/output schemas and descriptions
- Used to inform LLM about available capabilities

**`buildAIManagerContext(request: string, currentCanvas?: VisualGraph): AIManagerContext`**
- Combines worker definitions with user request
- Optionally includes stripped current canvas for modifications
- Returns complete context object for prompt generation

**Stripped Canvas Structure:**
```typescript
interface StrippedCanvas {
  nodes: Array<{
    id: string;
    type: string;
    worker_type?: string;
    config?: Record<string, any>;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    entityMovement?: any;
  }>;
  edges: Array<{
    source: string;
    target: string;
    mapping?: Record<string, string>;
  }>;
}
```

### 3. Prompt Template (`prompt-template.ts`)

Generates comprehensive prompts that guide the LLM to produce valid canvas structures.

**Prompt Sections:**

1. **System Role**: Defines AI's capabilities and responsibilities
2. **Available Workers**: Lists all worker types with input/output schemas
3. **Current Canvas State**: (Optional) Shows canvas being modified
4. **Entity Movement Rules**: Explains how to configure entity tracking
5. **Output Format**: Specifies expected JSON response structure
6. **Examples**: Provides concrete examples of requests and responses
7. **User Request**: The actual user's natural language request

**Worker Definition Format:**
```markdown
### Claude Script Generator (`claude`)

**Type:** sync
**Description:** Generate structured scene descriptions

**Input:**
  - **prompt** (required): The prompt to send to Claude

**Output:**
  - **scenes**: Array of scene objects

**Example Usage:**
```json
{
  "id": "node-1",
  "type": "worker",
  "data": {
    "label": "Generate Script",
    "worker_type": "claude",
    "config": { "prompt": "Generate 3 video scenes" }
  }
}
```
```

**Entity Movement Configuration:**
```json
{
  "entityMovement": {
    "onSuccess": {
      "targetSectionId": "next-section-node-id",
      "completeAs": "success"
    },
    "onFailure": {
      "targetSectionId": "error-handling-node-id",
      "completeAs": "failure"
    }
  }
}
```

**Example Workflows:**
- Simple video generation (single worker)
- Parallel video production (Splitter/Collector pattern)
- Workflow modification (adding voice narration)
- Workflow execution (running with inputs)
- Status checking (monitoring progress)

**Usage:**
```typescript
import { buildAIManagerPrompt } from '@/lib/ai';
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';

const prompt = buildAIManagerPrompt({
  workers: Object.values(WORKER_DEFINITIONS),
  currentCanvas: strippedCanvas, // Optional
  userRequest: 'Create a video generation workflow'
});
```

### 4. Action Executor (`action-executor.ts`)

Parses LLM responses, validates structure, and routes to appropriate handlers.

**Action Types:**
- `CREATE_WORKFLOW`: Generate new workflows from scratch
- `MODIFY_WORKFLOW`: Update existing workflows
- `RUN_WORKFLOW`: Execute workflows with input data
- `GET_STATUS`: Check workflow execution status

**Response Structure:**
```typescript
interface AIManagerResponse {
  action: AIManagerAction;
  payload: any;
  error?: string;
}
```

**Parsing Functions:**

**`parseLLMResponse(responseText: string): any`**
- Handles multiple LLM response formats:
  - Plain JSON: `{ "action": "CREATE_WORKFLOW", ... }`
  - Markdown code blocks: ` ```json\n{ ... }\n``` `
  - JSON embedded in text: `Here's the workflow: { ... }`
- Throws `ActionExecutorError` with details if parsing fails

**`validateResponse(response: any): asserts response is AIManagerResponse`**
- Validates response is an object
- Checks for required `action` field
- Validates action type against allowed values
- Checks for required `payload` field
- Throws descriptive errors with received data

**`validatePayload(action: AIManagerAction, payload: any): void`**
- Routes to action-specific validation
- Validates payload structure and required fields
- Checks canvas structure (nodes array, edges array)
- Validates node and edge properties

**`parseAndValidateResponse(llmResponseText: string): AIManagerResponse`**
- Main entry point for parsing and validation
- Combines parsing and validation steps
- Returns validated response or throws error

**Action Handlers:**

**`handleCreateWorkflow(payload: CreateWorkflowPayload)`**
- Validates all nodes have required properties (`id`, `type`, `data`, `label`)
- Checks worker nodes have valid `worker_type`
- Validates worker configuration exists
- Verifies entity movement configuration (if present)
- Validates all edges reference existing nodes
- Runs graph validation (cycles, disconnected nodes)
- Stores canvas in database with version
- Returns `{ canvasId, canvas }`

**`handleModifyWorkflow(payload: ModifyWorkflowPayload)`**
- Loads current canvas from database
- Preserves existing node IDs where unchanged
- Generates unique IDs for new nodes
- Removes edges for deleted nodes
- Validates modified canvas structure
- Creates new version with changes
- Returns `{ canvasId, canvas }`

**`handleRunWorkflow(payload: RunWorkflowPayload)`**
- Loads canvas by ID
- Creates version snapshot automatically
- Starts workflow execution (fires entry nodes)
- Returns `{ runId, status, statusUrl }`

**`handleGetStatus(payload: GetStatusPayload)`**
- Queries run status from database
- Aggregates node states and outputs
- Determines overall status (pending/running/completed/failed)
- Extracts final outputs from terminal nodes
- Returns `{ runId, status, nodes, finalOutputs, statusUrl }`

**Validation Details:**

Entity Movement Validation:
- `targetSectionId` must reference existing node
- `completeAs` must be one of: `success`, `failure`, `neutral`
- `setEntityType` (optional) must be one of: `customer`, `churned`, `lead`

Node Validation:
- Required fields: `id`, `type`, `data`, `data.label`
- Worker nodes require: `worker_type`, valid worker type from registry
- Worker config must be object (if present)

Edge Validation:
- Required fields: `id`, `source`, `target`
- Source and target must reference existing nodes
- Validates edge integrity after node deletions

**Error Handling:**
```typescript
class ActionExecutorError extends Error {
  code: string;           // Error code for categorization
  details?: any;          // Additional error context
}
```

Error Codes:
- `PARSE_ERROR`: Failed to parse JSON from LLM response
- `VALIDATION_ERROR`: Response structure or payload validation failed
- `NOT_FOUND`: Canvas or run not found in database
- `DATABASE_ERROR`: Database operation failed
- `EXECUTION_ERROR`: Workflow execution failed

## API Endpoint

**Route:** `POST /api/ai-manager`

**Request Body:**
```typescript
{
  request: string;      // Natural language request
  canvasId?: string;    // Optional canvas ID for modifications
}
```

**Response:**
```typescript
{
  action: AIManagerAction;
  result: any;  // Action-specific result
}
```

**Flow:**
1. Parse and validate request body
2. Load current canvas if `canvasId` provided
3. Build AI Manager context (strip UI properties, load workers)
4. Generate prompt from template
5. Call LLM client with retry logic
6. Parse and validate LLM response
7. Execute action with appropriate handler
8. Return structured response

**Error Responses:**
- `400 Bad Request`: Invalid request body or validation error
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Canvas or run not found
- `500 Internal Server Error`: LLM error, database error, or execution error

## Complete Usage Example

```typescript
// 1. Create LLM client
const llmClient = createLLMClient();

// 2. Build context (for modification)
const context = buildAIManagerContext(
  'Add voice narration to each video scene',
  currentCanvas
);

// 3. Generate prompt
const prompt = buildAIManagerPrompt({
  workers: context.workers,
  currentCanvas: context.currentCanvas,
  userRequest: context.request
});

// 4. Get LLM response
const llmResponse = await llmClient.complete(prompt);

// 5. Parse and validate
const parsedResponse = parseAndValidateResponse(llmResponse);

// 6. Execute action
const result = await executeAction(parsedResponse, {
  createWorkflow: handleCreateWorkflow,
  modifyWorkflow: handleModifyWorkflow,
  runWorkflow: handleRunWorkflow,
  getStatus: handleGetStatus
});
```

## Testing

All components have comprehensive test coverage:

**Unit Tests:**
- `llm-client.test.ts`: LLM client functionality and retry logic
- `context-builder.test.ts`: Context building and UI property stripping
- `prompt-template.test.ts`: Prompt generation with all sections
- `action-executor.test.ts`: Action parsing, validation, and routing

**Property-Based Tests:**
- `action-executor.property.test.ts`: Response validation across 100+ test cases
- Tests various malformed responses, missing fields, invalid types
- Ensures robust error handling for all edge cases

**Integration Tests:**
- `route.test.ts`: End-to-end API endpoint testing
- Tests complete flow from request to response
- Validates error handling and status codes

Run tests:
```bash
npm test src/lib/ai/__tests__
npm test src/app/api/ai-manager/__tests__
```

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=your-api-key-here

# Optional
AI_MANAGER_MODEL=claude-sonnet-4-20250514
AI_MANAGER_MAX_TOKENS=4096
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Design Principles

### 1. Token Efficiency

The Context Builder strips UI properties to reduce token usage by ~60%:
- Removes: `position`, `style`, `width`, `height`, `parentNode`, `extent`
- Preserves: `id`, `type`, `worker_type`, `config`, `entityMovement`

This allows larger canvases to fit within LLM context windows.

### 2. Robust Parsing

The Action Executor handles multiple LLM response formats:
- Plain JSON
- Markdown code blocks
- JSON embedded in text

This accommodates different LLM behaviors and reduces parsing failures.

### 3. Comprehensive Validation

Multi-stage validation ensures correctness:
1. Response structure validation (action, payload)
2. Payload field validation (required fields, types)
3. Canvas structure validation (nodes, edges)
4. Graph validation (cycles, disconnected nodes)
5. Worker type validation (valid worker from registry)
6. Entity movement validation (valid targets, status values)

### 4. Retry Logic

The LLM Client implements exponential backoff with jitter:
- Retries transient errors (timeouts, rate limits, server errors)
- Does not retry permanent errors (invalid API key, bad requests)
- Adds random jitter to prevent thundering herd
- Caps retry delay at configurable maximum

### 5. Error Context

All errors include detailed context for debugging:
```typescript
throw new ActionExecutorError(
  'Node missing required "id" property',
  'VALIDATION_ERROR',
  { node: invalidNode }
);
```

This helps identify exactly what went wrong and where.

## Requirements Coverage

The AI Manager satisfies the following requirements from the design document:

**Workflow Creation (Requirement 2.6):**
- ✅ Generate valid canvas with appropriate nodes and edges
- ✅ Select appropriate worker types based on task description
- ✅ Include Splitter and Collector nodes with correct configuration
- ✅ Configure entity movement rules for worker nodes

**Workflow Modification (Requirement 2.6):**
- ✅ Load current canvas state from database
- ✅ Preserve existing node identifiers where possible
- ✅ Generate unique node identifiers for new nodes
- ✅ Remove associated edges when nodes are deleted
- ✅ Validate resulting graph for correctness

**Workflow Execution (Requirement 2.6):**
- ✅ Start workflow execution with input data
- ✅ Return run identifier for status tracking
- ✅ Create version snapshot automatically

**Status Monitoring (Requirement 2.6):**
- ✅ Return current state of all nodes
- ✅ Include node outputs for completed nodes
- ✅ Return error details for failed workflows
- ✅ Return final outputs from terminal nodes

## Future Enhancements

1. **Multi-Provider Support**: Add OpenAI, Google, and other LLM providers
2. **Streaming Responses**: Real-time feedback during workflow generation
3. **Conversation History**: Multi-turn interactions for iterative refinement
4. **Fine-Tuned Prompts**: Specialized prompts for specific workflow types
5. **Automatic Validation**: Pre-execution validation of AI-generated canvases
6. **Cost Tracking**: Monitor token usage and API costs
7. **Caching**: Cache common prompts and responses
8. **A/B Testing**: Compare different prompt strategies

## Related Documentation

- [Worker System](./worker-system.md) - Worker registry and definitions
- [Canvas System](./canvas-system.md) - Version management and OEG compilation
- [Execution Engine](./execution-engine.md) - Workflow execution and edge-walking
- [Database Layer](./database-layer.md) - Canvas and run persistence
- [API Documentation](../api/ai-manager-api.md) - AI Manager API endpoint details
