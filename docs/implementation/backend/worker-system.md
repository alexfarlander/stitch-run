# Worker System

## Overview

The Worker System is Stitch's extensible execution layer that delegates work to external services (Claude, MiniMax, ElevenLabs, Shotstack, etc.) and internal utilities. Workers implement a standardized interface (`IWorker`) and are managed through a centralized registry pattern, enabling the execution engine to dynamically dispatch work to the appropriate implementation based on node type.

**Key Characteristics:**
- **Standardized Interface**: All workers implement `IWorker` with a single `execute()` method
- **Registry Pattern**: Workers are registered globally and retrieved by type identifier
- **Async-First Design**: Workers support both synchronous and asynchronous execution patterns
- **Schema-Driven**: Worker definitions provide input/output schemas for validation and edge mapping
- **Mock Mode Support**: Workers gracefully degrade when API keys are missing for development/testing

## Architecture

### The IWorker Interface

The `IWorker` interface defines the contract that all worker implementations must follow:

```typescript
export interface IWorker {
  /**
   * Executes the worker logic
   * @param runId - The run identifier
   * @param nodeId - The node identifier
   * @param config - Node configuration from the flow graph
   * @param input - Merged input from upstream nodes
   * @returns Promise that resolves when execution is initiated
   */
  execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void>;
}
```

**Parameters:**
- `runId`: Unique identifier for the workflow execution run
- `nodeId`: Unique identifier for the specific node being executed
- `config`: Static configuration from the node definition (model settings, API endpoints, etc.)
- `input`: Dynamic data merged from all upstream nodes' outputs

**Return Value:**
- Returns `Promise<void>` - the method initiates execution but doesn't return data
- Data flows back through callbacks (async workers) or direct callback triggers (sync workers)

### Worker Registry Pattern

The `WorkerRegistry` class implements a singleton pattern for global worker management:

```typescript
export class WorkerRegistry implements IWorkerRegistry {
  private static instance: WorkerRegistry;
  private workers: Map<string, new () => IWorker>;

  public static getInstance(): WorkerRegistry {
    if (!WorkerRegistry.instance) {
      WorkerRegistry.instance = new WorkerRegistry();
    }
    return WorkerRegistry.instance;
  }

  public register(type: string, workerClass: new () => IWorker): void {
    this.workers.set(type, workerClass);
  }

  public getWorker(type: string): IWorker {
    const WorkerClass = this.workers.get(type);
    if (!WorkerClass) {
      throw new Error(`Worker type "${type}" is not registered`);
    }
    return new WorkerClass();
  }

  public hasWorker(type: string): boolean {
    return this.workers.has(type);
  }
}
```

**Key Methods:**
- `register(type, workerClass)`: Associates a worker type string with its implementation class
- `getWorker(type)`: Creates a new instance of the worker for the given type
- `hasWorker(type)`: Checks if a worker type is registered

**Usage Pattern:**
```typescript
import { workerRegistry, ClaudeWorker } from '@/lib/workers';

// Registration (happens at module load time)
workerRegistry.register('claude', ClaudeWorker);

// Retrieval (happens during execution)
const worker = workerRegistry.getWorker('claude');
await worker.execute(runId, nodeId, config, input);
```

### Worker Definitions (Schema Registry)

Worker definitions provide metadata about each worker type, including input/output schemas and configuration options. These are stored in the `WORKER_DEFINITIONS` object:

```typescript
export const WORKER_DEFINITIONS: Record<string, WorkerDefinition> = {
  claude: {
    id: 'claude',
    name: 'Claude Script Generator',
    type: 'sync',
    description: 'Generate structured scene descriptions using Claude AI',
    input: {
      prompt: {
        type: 'string',
        required: true,
        description: 'The prompt to send to Claude'
      },
      topic: {
        type: 'string',
        required: false,
        description: 'Optional topic for context'
      }
    },
    output: {
      scenes: {
        type: 'array',
        description: 'Array of scene objects'
      }
    },
    config: {
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096
    }
  },
  // ... other worker definitions
};
```

**Helper Functions:**
- `getWorkerDefinition(workerId)`: Retrieves definition for a worker type
- `isValidWorkerType(workerId)`: Checks if a worker type exists
- `getAvailableWorkerTypes()`: Returns array of all registered worker IDs

**Use Cases:**
- **Validation**: Ensure input data matches expected schema before execution
- **Edge Mapping**: Determine which output fields can connect to which input fields
- **UI Generation**: Dynamically generate configuration forms for workers
- **Documentation**: Auto-generate API documentation from schemas

## Worker Execution Patterns

### Synchronous Workers

Synchronous workers complete their work within a single request cycle and trigger callbacks immediately:

**Pattern:**
1. Receive `execute()` call
2. Perform work (API call, computation, etc.)
3. Trigger callback with result via `triggerCallback()`
4. Return from `execute()`

**Example: ClaudeWorker**
```typescript
export class ClaudeWorker implements IWorker {
  async execute(runId: string, nodeId: string, config: NodeConfig, input: any): Promise<void> {
    // 1. Call Claude API
    const response = await this.client.messages.create({...});
    
    // 2. Parse and validate response
    const scenes = parseScenes(response);
    
    // 3. Trigger callback immediately
    await triggerCallback(runId, nodeId, {
      status: 'completed',
      output: { scenes }
    });
    
    // 4. Return (execution complete)
  }
}
```

**Characteristics:**
- Completes in seconds to minutes
- No external callback URL needed
- Triggers callback before returning
- Examples: Claude, Scene Parser

### Asynchronous Workers

Asynchronous workers initiate long-running external processes and return immediately. The external service calls back when complete:

**Pattern:**
1. Receive `execute()` call
2. Build callback URL using `buildCallbackUrl()`
3. Send request to external service with callback URL
4. Store intermediate state in database
5. Return from `execute()` (node marked as "running")
6. External service calls back hours/days later
7. Callback handler triggers edge-walking to continue execution

**Example: MiniMaxWorker**
```typescript
export class MiniMaxWorker implements IWorker {
  async execute(runId: string, nodeId: string, config: NodeConfig, input: any): Promise<void> {
    // 1. Build callback URL
    const callbackUrl = buildCallbackUrl(runId, nodeId);
    
    // 2. Send request to MiniMax API
    await fetch('https://api.minimax.io/v1/video/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: input.visual_prompt,
        callback_url: callbackUrl
      })
    });
    
    // 3. Store intermediate state
    await updateNodeState(runId, nodeId, {
      status: 'running',
      output: input // Preserve input for merging with callback
    });
    
    // 4. Return immediately (node is "running")
    // MiniMax will call back when video is ready
  }
}
```

**Characteristics:**
- Takes minutes to hours to complete
- Requires callback URL for external service
- Returns immediately after initiating work
- Node remains in "running" state until callback
- Examples: MiniMax, Shotstack

### Pseudo-Asynchronous Workers

Some workers perform async operations internally but complete within a single request cycle:

**Pattern:**
1. Receive `execute()` call
2. Perform async operations (API call + file upload)
3. Trigger callback with result
4. Return from `execute()`

**Example: ElevenLabsWorker**
```typescript
export class ElevenLabsWorker implements IWorker {
  async execute(runId: string, nodeId: string, config: NodeConfig, input: any): Promise<void> {
    // 1. Call ElevenLabs TTS API
    const audioBuffer = await fetch(elevenlabsUrl).then(r => r.arrayBuffer());
    
    // 2. Upload to Supabase Storage
    const { data } = await supabase.storage.upload(fileName, audioBuffer);
    
    // 3. Get public URL
    const audioUrl = supabase.storage.getPublicUrl(fileName).publicUrl;
    
    // 4. Trigger callback immediately
    await triggerCallback(runId, nodeId, {
      status: 'completed',
      output: { ...input, audioUrl }
    });
    
    // 5. Return (execution complete)
  }
}
```

**Characteristics:**
- Performs multiple async operations internally
- Completes within request timeout (typically < 30 seconds)
- Triggers callback before returning
- No external callback URL needed
- Examples: ElevenLabs

## Integrated Workers

### Claude Worker

**Type:** Synchronous  
**Purpose:** Generate structured scene descriptions from text prompts using Anthropic's Claude API

**Input:**
- `prompt` (string, required): The prompt to send to Claude
- `topic` (string, optional): Optional topic for context

**Output:**
- `scenes` (array): Array of scene objects with `visual_prompt` and `voice_text`

**Configuration:**
- `model`: Claude model identifier (default: `claude-sonnet-4-20250514`)
- `maxTokens`: Maximum tokens in response (default: 4096)

**Implementation Details:**
- Uses system prompt to enforce JSON output format
- Validates response structure (must contain `scenes` array)
- Validates each scene has required fields
- Cleans markdown code blocks from response before parsing
- Falls back to mock data if `ANTHROPIC_API_KEY` is missing

**File:** `src/lib/workers/claude.ts`

### MiniMax Worker

**Type:** Asynchronous  
**Purpose:** Generate video clips from text prompts using MiniMax AI video generation

**Input:**
- `visual_prompt` or `visualPrompt` (string, required): Visual description for video generation
- `duration` (number, optional): Video duration in seconds (default: 5)

**Output:**
- `videoUrl` (string): URL to the generated video file

**Configuration:**
- `model`: MiniMax model identifier (default: `video-01`)
- `endpoint`: API endpoint URL

**Implementation Details:**
- Builds callback URL for async completion
- Stores original input in node state for merging with callback
- Returns immediately after initiating generation
- MiniMax calls back when video is ready (typically 2-5 minutes)
- Falls back to mock video URL if API keys are missing

**File:** `src/lib/workers/minimax.ts`

### ElevenLabs Worker

**Type:** Pseudo-Asynchronous  
**Purpose:** Generate voice narration from text using ElevenLabs text-to-speech API

**Input:**
- `voice_text` or `voiceText` (string, required): Text to convert to speech
- `voice_id` (string, optional): ElevenLabs voice ID

**Output:**
- `audioUrl` (string): URL to the generated audio file

**Configuration:**
- `voiceId` (string, required): ElevenLabs voice ID to use
- `modelId`: TTS model identifier (default: `eleven_multilingual_v2`)

**Implementation Details:**
- Calls ElevenLabs TTS API to generate audio
- Receives audio as ArrayBuffer
- Uploads audio to Supabase Storage
- Retrieves public URL for the uploaded audio
- Passes through all input fields plus new `audioUrl`
- Falls back to mock audio URL if API key is missing

**File:** `src/lib/workers/elevenlabs.ts`

### Shotstack Worker

**Type:** Asynchronous  
**Purpose:** Assemble multiple video and audio clips into a final composed video

**Input:**
- `scenes` (array, required): Array of scene objects with `videoUrl` and `audioUrl`
- `timeline` (object, optional): Optional Shotstack timeline configuration

**Output:**
- `finalVideoUrl` (string): URL to the final assembled video
- `duration` (number): Total duration of the final video in seconds

**Configuration:**
- `resolution`: Video resolution (default: `sd`)
- `format`: Output format (default: `mp4`)
- `fps`: Frames per second (default: 25)
- `endpoint`: API endpoint URL

**Implementation Details:**
- Builds timeline structure from scenes array
- Creates two tracks: one for video clips, one for audio clips
- Calculates start times based on cumulative duration
- Sends render request to Shotstack API with callback URL
- Returns immediately after initiating render
- Shotstack calls back when rendering is complete (typically 1-10 minutes)
- Falls back to mock video URL if API key is missing

**File:** `src/lib/workers/shotstack.ts`

### Scene Parser Worker

**Type:** Synchronous  
**Purpose:** Parse scripts into structured scene arrays using Claude API

**Input:**
- `script` (string, required): The script text to parse into scenes

**Output:**
- `scenes` (array): Array of scene objects with `visual_description` and `voiceover_text`
- `total_scenes` (number): Total number of scenes parsed

**Configuration:**
- `model`: Claude model identifier (default: `claude-3-5-sonnet-20241022`)
- `maxTokens`: Maximum tokens in response (default: 4096)
- `target_scene_count`: Target number of scenes to generate (default: 4)

**Implementation Details:**
- Uses Claude API to intelligently parse scripts
- Validates scene structure and content
- Ensures non-empty visual descriptions and voiceover text
- Adjusts scene count based on script length and natural breaks
- Falls back to mock scenes if API key is missing

**File:** `src/lib/workers/scene-parser.ts`

### Wireframe Generator Worker

**Type:** Synchronous  
**Purpose:** Generate wireframe designs from product descriptions using Claude API

**Input:**
- `description` (string, required): Product or feature description
- `style` (string, optional): Design style preferences

**Output:**
- `wireframe` (object): Wireframe structure with components and layout

**Configuration:**
- `model`: Claude model identifier
- `maxTokens`: Maximum tokens in response

**File:** `src/lib/workers/wireframe-generator.ts`

### Image to Video Worker

**Type:** Asynchronous  
**Purpose:** Convert static images to video clips with motion effects

**Input:**
- `imageUrl` (string, required): URL to the source image
- `duration` (number, optional): Video duration in seconds

**Output:**
- `videoUrl` (string): URL to the generated video

**Configuration:**
- `endpoint`: API endpoint for image-to-video service
- `effects`: Motion effects to apply

**File:** `src/lib/workers/image-to-video.ts`

### Media Library Worker

**Type:** Synchronous  
**Purpose:** Retrieve media assets from Supabase Storage based on search criteria

**Input:**
- `query` (string, optional): Search query for media
- `type` (string, optional): Media type filter (image, video, audio)
- `tags` (array, optional): Tags to filter by

**Output:**
- `media` (array): Array of media objects with URLs and metadata

**Configuration:**
- `bucket`: Supabase Storage bucket name
- `limit`: Maximum number of results

**File:** `src/lib/workers/media-library.ts`

## Worker Utilities

### Callback URL Construction

The `buildCallbackUrl()` function constructs fully qualified callback URLs for async workers:

```typescript
export function buildCallbackUrl(runId: string, nodeId: string): string {
  const config = getConfig();
  
  if (!config.baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set');
  }
  
  return `${config.baseUrl}/api/stitch/callback/${runId}/${nodeId}`;
}
```

**Critical Rule:** Always uses `NEXT_PUBLIC_BASE_URL` from environment. Never hardcode domains or assume localhost.

**Example URLs:**
- Development: `http://localhost:3000/api/stitch/callback/run-123/node-456`
- Production: `https://stitch.example.com/api/stitch/callback/run-123/node-456`

### Callback Triggering

The `triggerCallback()` function sends callback payloads to the Stitch engine:

```typescript
export async function triggerCallback(
  runId: string,
  nodeId: string,
  callback: WorkerCallback
): Promise<void> {
  const callbackUrl = buildCallbackUrl(runId, nodeId);
  
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(callback)
  });

  if (!response.ok) {
    throw new Error(`Callback failed with status ${response.status}`);
  }
}
```

**Callback Payload Format:**
```typescript
interface WorkerCallback {
  status: 'completed' | 'failed';
  output?: any;  // Present when status is 'completed'
  error?: string; // Present when status is 'failed'
}
```

### Logging

The `logWorker()` function provides structured logging for worker execution:

```typescript
export function logWorker(
  level: 'info' | 'error' | 'warn',
  message: string,
  context: Record<string, any>
): void {
  const sanitizedContext = sanitizeForLogging(context);
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    component: 'worker',
    ...sanitizedContext
  };
  
  console.log(JSON.stringify(logData));
}
```

**Usage:**
```typescript
logWorker('info', 'Worker execution started', {
  worker: 'claude',
  runId,
  nodeId
});
```

### Data Sanitization

The `sanitizeForLogging()` function removes sensitive data before logging:

```typescript
export function sanitizeForLogging(data: any): any {
  const sensitiveKeys = [
    'apiKey', 'api_key', 'token', 'authorization',
    'password', 'secret', 'credential'
  ];
  
  // Recursively sanitize objects and arrays
  // Replace sensitive values with '[REDACTED]'
}
```

### Error Handling

**Error Categorization:**
```typescript
export function categorizeError(error: unknown): string {
  // Returns: 'api_error', 'auth_error', 'network_error',
  //          'validation_error', 'config_error', 'parse_error',
  //          'storage_error', 'general_error'
}
```

**Error Context Extraction:**
```typescript
export function extractErrorContext(error: unknown): Record<string, any> {
  // Returns: { errorName, errorMessage, errorCategory, stack, cause }
}
```

## Worker Registration

All workers are registered at module load time in `src/lib/workers/index.ts`:

```typescript
import { workerRegistry } from './registry';
import { ClaudeWorker } from './claude';
import { MiniMaxWorker } from './minimax';
// ... other imports

// Register all workers
workerRegistry.register('claude', ClaudeWorker);
workerRegistry.register('minimax', MiniMaxWorker);
workerRegistry.register('elevenlabs', ElevenLabsWorker);
workerRegistry.register('shotstack', ShotstackWorker);
workerRegistry.register('scene-parser', SceneParserWorker);
workerRegistry.register('wireframe-generator', WireframeGeneratorWorker);
workerRegistry.register('image-to-video', ImageToVideoWorker);
workerRegistry.register('media-library', MediaLibraryWorker);
```

**Registration happens automatically** when the module is imported. The execution engine simply calls `workerRegistry.getWorker(type)` to retrieve the appropriate worker instance.

## Mock Mode

All workers support "mock mode" for development and testing when API keys are missing:

**Behavior:**
- Worker detects missing API keys in constructor
- Sets `this.mockMode = true`
- Logs warning with missing environment variables
- Returns realistic mock data instead of calling external APIs
- Simulates appropriate delays to mimic real API behavior

**Example:**
```typescript
constructor() {
  const config = getConfig();
  
  if (!config.workers.anthropicApiKey) {
    this.mockMode = true;
    logWorker('warn', 'Claude worker initialized in MOCK MODE', {
      worker: 'claude',
      reason: 'ANTHROPIC_API_KEY environment variable is not set'
    });
  } else {
    this.client = new Anthropic({ apiKey: config.workers.anthropicApiKey });
  }
}
```

**Benefits:**
- Enables development without API keys
- Allows testing of workflow logic without external dependencies
- Provides consistent mock data for predictable testing
- Reduces API costs during development

## Data Flow Through Workers

### Input Merging

Workers receive merged input from all upstream nodes:

```typescript
// Node A outputs: { prompt: "Generate video about cats" }
// Node B outputs: { style: "cinematic" }
// Worker receives: { prompt: "Generate video about cats", style: "cinematic" }
```

### Output Passing

Workers should pass through input data plus new outputs:

```typescript
// Input: { visual_prompt: "...", voice_text: "..." }
// MiniMax adds: { videoUrl: "https://..." }
// Output: { visual_prompt: "...", voice_text: "...", videoUrl: "https://..." }

await triggerCallback(runId, nodeId, {
  status: 'completed',
  output: {
    ...input,      // Pass through all input
    videoUrl       // Add new output
  }
});
```

**Why?** Downstream nodes may need data from multiple upstream nodes. Passing through all data ensures nothing is lost in the pipeline.

### State Preservation for Async Workers

Async workers store input in node state before returning:

```typescript
// Store input for later merging with callback
await updateNodeState(runId, nodeId, {
  status: 'running',
  output: input  // Preserve input
});

// When callback arrives, merge with stored input
const storedOutput = await getNodeOutput(runId, nodeId);
const mergedOutput = { ...storedOutput, ...callbackData };
```

## Error Handling Patterns

### Synchronous Worker Errors

```typescript
try {
  // Perform work
  const result = await callExternalAPI();
  
  // Trigger success callback
  await triggerCallback(runId, nodeId, {
    status: 'completed',
    output: result
  });
} catch (error) {
  // Trigger failure callback
  await triggerCallback(runId, nodeId, {
    status: 'failed',
    error: error.message
  });
}
```

### Asynchronous Worker Errors

```typescript
try {
  // Initiate async work
  await fetch(externalAPI, { callback_url: callbackUrl });
  
  // Store state and return
  await updateNodeState(runId, nodeId, { status: 'running' });
} catch (error) {
  // External service won't call back if request failed
  // Must trigger failure callback ourselves
  await triggerCallback(runId, nodeId, {
    status: 'failed',
    error: error.message
  });
}
```

### Callback Failure Handling

```typescript
try {
  await triggerCallback(runId, nodeId, callback);
} catch (callbackError) {
  // Log but don't throw - we've already failed
  logWorker('error', 'Failed to trigger callback', {
    worker: 'claude',
    runId,
    nodeId,
    originalError: error.message,
    callbackError: callbackError.message
  });
}
```

## Testing Workers

### Worker Testing Utilities

The `testing.ts` module provides utilities for testing workers:

```typescript
export interface WorkerTestConfig {
  workerId: string;
  input: any;
  config?: NodeConfig;
  expectedOutputKeys?: string[];
}

export interface WorkerTestResult {
  success: boolean;
  duration: number;
  output?: any;
  error?: string;
}

// Test a single worker
export async function testWorker(config: WorkerTestConfig): Promise<WorkerTestResult>;

// Test all registered workers
export async function testAllWorkers(): Promise<Record<string, WorkerTestResult>>;

// Create a mock worker for testing
export function createMockWorker(output: any): IWorker;

// Check if API key is present
export function checkApiKey(keyName: string): boolean;

// Get required environment variables for a worker
export function getRequiredEnvVars(workerId: string): string[];
```

### Testing Patterns

**Unit Testing a Worker:**
```typescript
import { ClaudeWorker } from '@/lib/workers/claude';

describe('ClaudeWorker', () => {
  it('should generate scenes from prompt', async () => {
    const worker = new ClaudeWorker();
    const mockCallback = jest.fn();
    
    await worker.execute('run-123', 'node-456', {
      model: 'claude-sonnet-4-20250514'
    }, {
      prompt: 'Generate a video about space exploration'
    });
    
    // Assert callback was triggered with scenes
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          scenes: expect.any(Array)
        })
      })
    );
  });
});
```

**Integration Testing:**
```typescript
import { testWorker } from '@/lib/workers/testing';

describe('Worker Integration', () => {
  it('should execute Claude worker end-to-end', async () => {
    const result = await testWorker({
      workerId: 'claude',
      input: { prompt: 'Test prompt' },
      expectedOutputKeys: ['scenes']
    });
    
    expect(result.success).toBe(true);
    expect(result.output.scenes).toHaveLength(4);
  });
});
```

## Adding New Workers

### Step-by-Step Guide

1. **Create Worker Class**

Create a new file in `src/lib/workers/` (e.g., `my-worker.ts`):

```typescript
import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { triggerCallback, logWorker } from './utils';

export class MyWorker implements IWorker {
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    try {
      // 1. Extract and validate input
      const requiredField = input?.requiredField;
      if (!requiredField) {
        throw new Error('Missing required field');
      }
      
      // 2. Perform work
      const result = await doWork(requiredField);
      
      // 3. Trigger callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: { ...input, result }
      });
    } catch (error) {
      await triggerCallback(runId, nodeId, {
        status: 'failed',
        error: error.message
      });
    }
  }
}
```

2. **Add Worker Definition**

Add to `WORKER_DEFINITIONS` in `src/lib/workers/registry.ts`:

```typescript
export const WORKER_DEFINITIONS: Record<string, WorkerDefinition> = {
  // ... existing workers
  'my-worker': {
    id: 'my-worker',
    name: 'My Custom Worker',
    type: 'sync', // or 'async'
    description: 'Does something useful',
    input: {
      requiredField: {
        type: 'string',
        required: true,
        description: 'A required input field'
      }
    },
    output: {
      result: {
        type: 'string',
        description: 'The result of the work'
      }
    },
    config: {
      // Optional default configuration
    }
  }
};
```

3. **Register Worker**

Add to `src/lib/workers/index.ts`:

```typescript
import { MyWorker } from './my-worker';

// Export the worker
export { MyWorker } from './my-worker';

// Register the worker
workerRegistry.register('my-worker', MyWorker);
```

4. **Add Tests**

Create `src/lib/workers/__tests__/my-worker.test.ts`:

```typescript
import { MyWorker } from '../my-worker';

describe('MyWorker', () => {
  it('should execute successfully', async () => {
    const worker = new MyWorker();
    // Add test assertions
  });
});
```

5. **Update Documentation**

Add worker to this document's "Integrated Workers" section.

## Best Practices

### Configuration Management

- Use `getConfig()` to access environment variables
- Validate required configuration in constructor
- Provide sensible defaults for optional configuration
- Support mock mode when API keys are missing

### Error Handling

- Always wrap execution in try-catch
- Trigger failure callbacks for all errors
- Log errors with structured context
- Handle callback failures gracefully (log but don't throw)

### Data Flow

- Pass through all input data plus new outputs
- Store input in node state for async workers
- Merge callback data with stored input
- Validate output structure before triggering callback

### Logging

- Log at execution start, API calls, and completion
- Include runId, nodeId, and worker type in all logs
- Sanitize sensitive data (API keys, tokens)
- Use structured logging format (JSON)

### Testing

- Support mock mode for development
- Provide realistic mock data
- Test both success and failure paths
- Test input validation
- Test output structure

## Related Documentation

- [Execution Engine](./execution-engine.md) - How workers are invoked during workflow execution
- [Database Layer](./database-layer.md) - How worker state is persisted
- [API Documentation](../api/workflow-api.md) - Worker callback endpoints
- [Type System](../architecture/type-system.md) - Worker-related TypeScript types

## File Locations

- **Worker Interface**: `src/lib/workers/base.ts`
- **Worker Registry**: `src/lib/workers/registry.ts`
- **Worker Utilities**: `src/lib/workers/utils.ts`
- **Worker Implementations**: `src/lib/workers/*.ts`
- **Worker Tests**: `src/lib/workers/__tests__/*.test.ts`
- **Worker Types**: `src/types/worker-definition.ts`
