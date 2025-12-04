# AI Module

This module provides the AI Manager functionality for Stitch, enabling LLM-powered workflow management through natural language.

## Components

### LLM Client (`llm-client.ts`)

Provides an interface for interacting with Large Language Models (LLMs).

**Features:**
- Abstract `LLMClient` interface for multiple LLM providers
- `ClaudeLLMClient` implementation using Anthropic's Claude API
- Automatic retry logic with exponential backoff
- Error handling and timeout management

**Usage:**

```typescript
import { createLLMClient } from '@/lib/ai';

const client = createLLMClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
});

const response = await client.complete('Your prompt here');
```

### Context Builder (`context-builder.ts`)

Builds structured context for the AI Manager by stripping UI properties and loading worker definitions.

**Features:**
- Strip UI-only properties from canvases (position, style, width, height)
- Load worker definitions from registry
- Build structured context objects
- Format context as JSON for LLM consumption

**Usage:**

```typescript
import { buildAIManagerContext, stripCanvasUIProperties } from '@/lib/ai';

// Strip UI properties from a canvas
const strippedCanvas = stripCanvasUIProperties(visualGraph);

// Build complete AI Manager context
const context = await buildAIManagerContext({
  currentCanvas: strippedCanvas,
  userRequest: 'Add video generation to this workflow',
});
```

### Action Executor (`action-executor.ts`)

Parses and validates LLM responses, routing them to appropriate handlers.

**Features:**
- Parse JSON from various LLM response formats (plain JSON, markdown code blocks, text with JSON)
- Validate response structure (action type, payload)
- Validate payload fields based on action type
- Route validated responses to action handlers
- Comprehensive error handling with descriptive messages

**Supported Actions:**
- `CREATE_WORKFLOW` - Generate new workflows
- `MODIFY_WORKFLOW` - Update existing workflows
- `RUN_WORKFLOW` - Execute workflows
- `GET_STATUS` - Check workflow status

**Usage:**

```typescript
import { parseAndValidateResponse, executeAction } from '@/lib/ai';

// Parse and validate LLM response
const response = parseAndValidateResponse(llmResponseText);

// Execute action with handlers
const result = await executeAction(response, {
  createWorkflow: async (payload) => {
    // Handle workflow creation
    const canvas = await createCanvas(payload.name, payload.canvas);
    return { canvasId: canvas.id };
  },
  modifyWorkflow: async (payload) => {
    // Handle workflow modification
    const canvas = await updateCanvas(payload.canvasId, payload.canvas);
    return { canvasId: canvas.id };
  },
  runWorkflow: async (payload) => {
    // Handle workflow execution
    const run = await startRun(payload.canvasId, payload.input);
    return { runId: run.id };
  },
  getStatus: async (payload) => {
    // Handle status check
    const status = await getRunStatus(payload.runId);
    return status;
  },
});
```

### Prompt Template (`prompt-template.ts`)

Generates comprehensive prompts for the AI Manager with worker definitions, entity movement rules, and examples.

**Features:**
- System role definition
- Worker definitions with input/output schemas
- Entity movement rules explanation
- Output format specification
- Example requests and responses
- Current canvas context (for modifications)

**Usage:**

```typescript
import { buildAIManagerPrompt } from '@/lib/ai';
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';

const prompt = buildAIManagerPrompt({
  workers: Object.values(WORKER_DEFINITIONS),
  currentCanvas: strippedCanvas, // Optional, for modifications
  userRequest: 'Create a video generation workflow',
});
```

## Complete AI Manager Flow

Here's how all components work together:

```typescript
import {
  createLLMClient,
  buildAIManagerContext,
  buildAIManagerPrompt,
  stripCanvasUIProperties,
} from '@/lib/ai';
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';

async function processAIManagerRequest(
  userRequest: string,
  currentCanvas?: VisualGraph
) {
  // 1. Create LLM client
  const llmClient = createLLMClient({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // 2. Strip UI properties if modifying existing canvas
  const strippedCanvas = currentCanvas
    ? stripCanvasUIProperties(currentCanvas)
    : undefined;

  // 3. Build prompt with context
  const prompt = buildAIManagerPrompt({
    workers: Object.values(WORKER_DEFINITIONS),
    currentCanvas: strippedCanvas,
    userRequest,
  });

  // 4. Get LLM response
  const llmResponseText = await llmClient.complete(prompt);

  // 5. Parse and validate response
  const aiResponse = parseAndValidateResponse(llmResponseText);

  // 6. Execute action with handlers
  return await executeAction(aiResponse, {
    createWorkflow: async (payload) => {
      const canvas = await createCanvas(payload.name, payload.canvas);
      return { canvasId: canvas.id, canvas: canvas.data };
    },
    modifyWorkflow: async (payload) => {
      const canvas = await updateCanvas(payload.canvasId, payload.canvas);
      return { canvasId: canvas.id, canvas: canvas.data };
    },
    runWorkflow: async (payload) => {
      const run = await startRun(payload.canvasId, payload.input);
      return { runId: run.id, status: run.status };
    },
    getStatus: async (payload) => {
      const status = await getRunStatus(payload.runId);
      return status;
    },
  });
}
```

## Prompt Template Structure

The AI Manager prompt includes the following sections:

1. **System Role**: Defines the AI's role and capabilities
2. **Available Workers**: Lists all worker types with input/output schemas
3. **Current Canvas State**: (Optional) Shows the canvas being modified
4. **Entity Movement Rules**: Explains how to configure entity movement
5. **Output Format**: Specifies the expected JSON response structure
6. **Examples**: Provides concrete examples of requests and responses
7. **User Request**: The actual user's natural language request

### Example Prompt Sections

**Worker Definitions:**
```markdown
## Available Workers

### Claude Script Generator (`claude`)

**Type:** sync
**Description:** Generate structured scene descriptions

**Input:**
  - **prompt** (required): The prompt to send to Claude

**Output:**
  - **scenes**: Array of scene objects
```

**Entity Movement Rules:**
```markdown
## Entity Movement Rules

Worker nodes can specify where entities should move after execution:

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

**Output Format:**
```markdown
## Output Format

You MUST respond with valid JSON in this exact format:

{
  "action": "CREATE_WORKFLOW" | "MODIFY_WORKFLOW" | "RUN_WORKFLOW" | "GET_STATUS",
  "payload": { ...action-specific data... }
}
```

## Testing

All components have comprehensive test coverage:

- `llm-client.test.ts`: Tests LLM client functionality and retry logic
- `context-builder.test.ts`: Tests context building and UI property stripping
- `prompt-template.test.ts`: Tests prompt generation with all sections
- `action-executor.test.ts`: Tests action parsing, validation, and routing
- `action-executor.property.test.ts`: Property-based tests for response validation (100+ test cases)

Run tests:

```bash
npm test src/lib/ai/__tests__
```

## Requirements Coverage

This module satisfies the following requirements:

- **4.1**: AI Manager generates valid canvas with appropriate nodes and edges
- **4.2**: AI Manager selects appropriate worker types based on task description
- **4.3**: AI Manager includes Splitter and Collector nodes with correct configuration
- **4.4**: AI Manager configures entity movement rules for worker nodes
- **8.1**: AI Manager returns JSON response with action type and payload
- **8.5**: JSON is valid and parseable
- **10.1**: AI Manager includes entity movement configuration
- **10.2**: AI Manager specifies onSuccess behavior
- **10.3**: AI Manager specifies onFailure behavior

## Environment Variables

```bash
# Required for LLM client
ANTHROPIC_API_KEY=your-api-key-here

# Optional configuration
AI_MANAGER_MODEL=claude-sonnet-4-20250514
AI_MANAGER_MAX_TOKENS=4096
```

## Future Enhancements

- Support for additional LLM providers (OpenAI, Google, etc.)
- Streaming responses for real-time feedback
- Conversation history for multi-turn interactions
- Fine-tuned prompts for specific workflow types
- Automatic validation of AI-generated canvases
