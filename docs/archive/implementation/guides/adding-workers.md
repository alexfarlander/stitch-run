# Adding Workers to Stitch

## Overview

This guide provides step-by-step instructions for adding new workers to the Stitch orchestration platform. Workers are the execution layer that delegates work to external services or performs internal computations. By following this guide, you'll learn how to implement the `IWorker` interface, register your worker in the global registry, define input/output schemas, and integrate your worker into the execution pipeline.

**What You'll Learn:**
- How to implement the `IWorker` interface
- How to register workers in the global registry
- How to define worker schemas for validation
- How to handle synchronous vs asynchronous execution patterns
- How to implement error handling and logging
- How to test your worker implementation

**Prerequisites:**
- Familiarity with TypeScript and async/await patterns
- Understanding of the Stitch execution model (see [Execution Model](../architecture/execution-model.md))
- Basic knowledge of the worker system (see [Worker System](../backend/worker-system.md))

## Quick Start

Here's the minimal code needed to create a new worker:

```typescript
// src/lib/workers/my-worker.ts
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
      logWorker('info', 'MyWorker execution started', { worker: 'my-worker', runId, nodeId });
      
      // Your worker logic here
      const result = await doSomething(input);
      
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: { ...input, result }
      });
    } catch (error) {
      await triggerCallback(runId, nodeId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
```


## Step 1: Understand Worker Types

Before implementing your worker, determine which execution pattern fits your use case:

### Synchronous Workers

**When to Use:**
- Work completes within seconds to minutes
- You can wait for the result before returning
- No external callback mechanism needed

**Examples:**
- Claude API calls (text generation)
- Scene parsing
- Data transformations
- Database queries

**Pattern:**
```typescript
async execute(...) {
  // 1. Do work
  const result = await callAPI();
  
  // 2. Trigger callback immediately
  await triggerCallback(runId, nodeId, {
    status: 'completed',
    output: result
  });
  
  // 3. Return (execution complete)
}
```

### Asynchronous Workers

**When to Use:**
- Work takes minutes to hours to complete
- External service provides callback mechanism
- You need to return immediately to avoid timeouts

**Examples:**
- Video generation (MiniMax)
- Video rendering (Shotstack)
- Long-running batch jobs

**Pattern:**
```typescript
async execute(...) {
  // 1. Build callback URL
  const callbackUrl = buildCallbackUrl(runId, nodeId);
  
  // 2. Initiate work with external service
  await fetch(externalAPI, {
    body: JSON.stringify({ callback_url: callbackUrl })
  });
  
  // 3. Store intermediate state
  await updateNodeState(runId, nodeId, {
    status: 'running',
    output: input // Preserve for merging later
  });
  
  // 4. Return immediately (node stays "running")
  // External service will call back when done
}
```

### Pseudo-Asynchronous Workers

**When to Use:**
- Multiple async operations internally
- Completes within request timeout (< 30 seconds)
- No external callback needed

**Examples:**
- ElevenLabs (API call + file upload)
- Image processing with storage upload

**Pattern:**
```typescript
async execute(...) {
  // 1. Call external API
  const data = await fetch(externalAPI);
  
  // 2. Upload result to storage
  const url = await uploadToStorage(data);
  
  // 3. Trigger callback immediately
  await triggerCallback(runId, nodeId, {
    status: 'completed',
    output: { ...input, url }
  });
}
```


## Step 2: Implement the IWorker Interface

Create a new file in `src/lib/workers/` for your worker implementation.

### File Structure

```
src/lib/workers/
├── base.ts                 # IWorker interface definition
├── registry.ts             # Worker registry and definitions
├── utils.ts                # Shared utilities
├── my-worker.ts           # Your new worker (create this)
└── __tests__/
    └── my-worker.test.ts  # Your worker tests (create this)
```

### Basic Implementation Template

```typescript
// src/lib/workers/my-worker.ts
import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { triggerCallback, logWorker, extractErrorContext } from './utils';

/**
 * MyWorker implementation
 * Brief description of what this worker does
 */
export class MyWorker implements IWorker {
  private apiKey: string | null = null;
  private mockMode: boolean = false;

  constructor() {
    const config = getConfig();
    
    // Check for required environment variables
    if (!config.workers.myApiKey) {
      this.mockMode = true;
      logWorker('warn', 'MyWorker initialized in MOCK MODE', {
        worker: 'my-worker',
        reason: 'MY_API_KEY environment variable is not set',
        message: 'Worker will return mock data instead of calling the API'
      });
    } else {
      this.apiKey = config.workers.myApiKey;
      logWorker('info', 'MyWorker initialized successfully', {
        worker: 'my-worker',
        apiKeyPresent: true
      });
    }
  }

  /**
   * Executes the worker logic
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    logWorker('info', 'MyWorker execution started', {
      worker: 'my-worker',
      runId,
      nodeId
    });

    try {
      // 1. Extract and validate input
      const requiredField = input?.requiredField;
      if (!requiredField) {
        throw new Error('Missing required field: requiredField');
      }

      // 2. Handle mock mode
      if (this.mockMode) {
        logWorker('info', 'MyWorker running in MOCK MODE', {
          worker: 'my-worker',
          runId,
          nodeId
        });

        // Return mock data
        const mockResult = { result: 'mock-value' };
        
        await triggerCallback(runId, nodeId, {
          status: 'completed',
          output: { ...input, ...mockResult }
        });

        const duration = Date.now() - startTime;
        logWorker('info', 'MyWorker completed (MOCK MODE)', {
          worker: 'my-worker',
          runId,
          nodeId,
          duration
        });

        return;
      }

      // 3. Extract configuration with defaults
      const endpoint = config.endpoint || 'https://api.example.com/v1/process';
      const timeout = config.timeout || 30000;

      // 4. Perform the actual work
      logWorker('info', 'Calling external API', {
        worker: 'my-worker',
        runId,
        nodeId,
        endpoint
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ data: requiredField })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // 5. Validate response
      if (!result.output) {
        throw new Error('Invalid response: missing output field');
      }

      const duration = Date.now() - startTime;
      logWorker('info', 'MyWorker completed successfully', {
        worker: 'my-worker',
        runId,
        nodeId,
        duration
      });

      // 6. Trigger success callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: {
          ...input,           // Pass through all input
          result: result.output  // Add new output
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorContext = extractErrorContext(error);

      logWorker('error', 'MyWorker failed', {
        worker: 'my-worker',
        runId,
        nodeId,
        error: errorMessage,
        ...errorContext,
        duration,
        phase: 'execution'
      });

      // 7. Trigger failure callback
      try {
        await triggerCallback(runId, nodeId, {
          status: 'failed',
          error: errorMessage
        });
      } catch (callbackError) {
        const callbackErrorContext = extractErrorContext(callbackError);
        logWorker('error', 'Failed to trigger failure callback', {
          worker: 'my-worker',
          runId,
          nodeId,
          originalError: errorMessage,
          callbackError: callbackError instanceof Error ? callbackError.message : 'Unknown error',
          ...callbackErrorContext,
          phase: 'callback'
        });
      }
    }
  }
}
```


### Key Implementation Points

#### 1. Constructor Pattern

```typescript
constructor() {
  const config = getConfig();
  
  // Check for required environment variables
  if (!config.workers.myApiKey) {
    this.mockMode = true;
    logWorker('warn', 'Worker initialized in MOCK MODE', {...});
  } else {
    // Initialize API client
    this.apiKey = config.workers.myApiKey;
  }
}
```

**Why?**
- Enables development without API keys
- Provides clear feedback when configuration is missing
- Allows testing without external dependencies

#### 2. Input Validation

```typescript
const requiredField = input?.requiredField;
if (!requiredField) {
  throw new Error('Missing required field: requiredField');
}
```

**Why?**
- Fails fast with clear error messages
- Prevents invalid data from reaching external APIs
- Makes debugging easier

#### 3. Data Pass-Through

```typescript
await triggerCallback(runId, nodeId, {
  status: 'completed',
  output: {
    ...input,        // Pass through ALL input data
    newField: result // Add new output
  }
});
```

**Why?**
- Downstream nodes may need data from multiple upstream nodes
- Ensures data flows through the entire pipeline
- Prevents data loss between nodes

#### 4. Error Handling

```typescript
try {
  // Work
  await triggerCallback(runId, nodeId, { status: 'completed', output });
} catch (error) {
  // Always trigger failure callback
  await triggerCallback(runId, nodeId, { status: 'failed', error: error.message });
}
```

**Why?**
- Ensures execution engine knows about failures
- Allows users to retry failed nodes
- Prevents workflows from hanging

#### 5. Structured Logging

```typescript
logWorker('info', 'Worker execution started', {
  worker: 'my-worker',
  runId,
  nodeId,
  // Additional context
});
```

**Why?**
- Enables debugging in production
- Provides audit trail
- Helps identify performance bottlenecks


## Step 3: Add Worker Definition Schema

Worker definitions provide metadata about your worker's inputs, outputs, and configuration. This enables validation, edge mapping, and UI generation.

### Add to WORKER_DEFINITIONS

Edit `src/lib/workers/registry.ts` and add your worker definition:

```typescript
export const WORKER_DEFINITIONS: Record<string, WorkerDefinition> = {
  // ... existing workers
  
  'my-worker': {
    id: 'my-worker',
    name: 'My Custom Worker',
    type: 'sync', // or 'async'
    description: 'Brief description of what this worker does',
    
    input: {
      requiredField: {
        type: 'string',
        required: true,
        description: 'A required input field'
      },
      optionalField: {
        type: 'number',
        required: false,
        description: 'An optional input field',
        default: 42
      }
    },
    
    output: {
      result: {
        type: 'string',
        description: 'The result of the work'
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata about the result'
      }
    },
    
    config: {
      endpoint: 'https://api.example.com/v1/process',
      timeout: 30000,
      retries: 3
    }
  }
};
```

### Schema Field Types

**Supported Types:**
- `string`: Text data
- `number`: Numeric data
- `boolean`: True/false values
- `array`: Lists of items
- `object`: Complex nested structures

**Field Properties:**
- `type`: The data type (required)
- `required`: Whether the field is mandatory (default: false)
- `description`: Human-readable description (required)
- `default`: Default value if not provided (optional)

### Input Schema Best Practices

1. **Be Specific**: Use clear, descriptive field names
2. **Provide Defaults**: Set sensible defaults for optional fields
3. **Document Thoroughly**: Write clear descriptions for each field
4. **Support Aliases**: Accept multiple field names for compatibility (e.g., `visual_prompt` and `visualPrompt`)

```typescript
input: {
  visual_prompt: {
    type: 'string',
    required: true,
    description: 'Visual description for video generation (photorealistic, cinematic)'
  },
  visualPrompt: {
    type: 'string',
    required: false,
    description: 'Alternative field name for visual_prompt (for compatibility)'
  }
}
```

### Output Schema Best Practices

1. **Document All Outputs**: List every field your worker produces
2. **Include Metadata**: Document additional information like duration, status, etc.
3. **Be Consistent**: Use consistent naming across workers

```typescript
output: {
  videoUrl: {
    type: 'string',
    description: 'URL to the generated video file'
  },
  duration: {
    type: 'number',
    description: 'Video duration in seconds'
  },
  format: {
    type: 'string',
    description: 'Video format (e.g., mp4, webm)'
  }
}
```


## Step 4: Register Your Worker

Register your worker in the global registry so the execution engine can find it.

### Update index.ts

Edit `src/lib/workers/index.ts`:

```typescript
// 1. Import your worker class
import { MyWorker } from './my-worker';

// 2. Export your worker (for direct imports)
export { MyWorker } from './my-worker';

// 3. Register your worker in the global registry
workerRegistry.register('my-worker', MyWorker);
```

**Complete Example:**

```typescript
// src/lib/workers/index.ts

// ... existing imports
import { MyWorker } from './my-worker';

// ... existing exports
export { MyWorker } from './my-worker';

// Register all workers
workerRegistry.register('claude', ClaudeWorker);
workerRegistry.register('minimax', MiniMaxWorker);
workerRegistry.register('elevenlabs', ElevenLabsWorker);
workerRegistry.register('shotstack', ShotstackWorker);
workerRegistry.register('my-worker', MyWorker); // Add this line
```

### Verify Registration

You can verify your worker is registered correctly:

```typescript
import { workerRegistry, isValidWorkerType } from '@/lib/workers';

// Check if worker is registered
console.log(isValidWorkerType('my-worker')); // Should print: true

// Get worker instance
const worker = workerRegistry.getWorker('my-worker');
console.log(worker); // Should print: MyWorker instance
```


## Step 5: Handle Asynchronous Execution (If Applicable)

If your worker is asynchronous (external service calls back), follow this pattern:

### Async Worker Implementation

```typescript
import { buildCallbackUrl, logWorker } from './utils';
import { updateNodeState } from '@/lib/db/runs';

export class MyAsyncWorker implements IWorker {
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    try {
      // 1. Build callback URL
      const callbackUrl = buildCallbackUrl(runId, nodeId);
      
      logWorker('info', 'Building callback URL', {
        worker: 'my-async-worker',
        runId,
        nodeId,
        callbackUrl
      });

      // 2. Send request to external service
      const response = await fetch('https://api.example.com/v1/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          data: input.requiredField,
          callback_url: callbackUrl  // External service will POST here when done
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const responseData = await response.json();
      
      logWorker('info', 'Async work initiated', {
        worker: 'my-async-worker',
        runId,
        nodeId,
        jobId: responseData.jobId
      });

      // 3. Store intermediate state
      // CRITICAL: Store input so it can be merged with callback data
      await updateNodeState(runId, nodeId, {
        status: 'running',
        output: input  // Preserve input for later merging
      });

      // 4. Return immediately
      // Node is now "running" and will stay that way until callback arrives

    } catch (error) {
      // If we failed to initiate the work, trigger failure callback
      // (external service won't call back if we never made the request)
      await triggerCallback(runId, nodeId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
```

### Callback URL Construction

**CRITICAL RULE:** Always use `buildCallbackUrl()` to construct callback URLs:

```typescript
import { buildCallbackUrl } from './utils';

const callbackUrl = buildCallbackUrl(runId, nodeId);
// Returns: https://{NEXT_PUBLIC_BASE_URL}/api/stitch/callback/{runId}/{nodeId}
```

**Why?**
- Uses `NEXT_PUBLIC_BASE_URL` from environment
- Works in development (localhost) and production
- Never hardcode domains

**Example URLs:**
- Development: `http://localhost:3000/api/stitch/callback/run-123/node-456`
- Production: `https://stitch.example.com/api/stitch/callback/run-123/node-456`

### State Preservation

For async workers, you MUST store the input in the node state:

```typescript
await updateNodeState(runId, nodeId, {
  status: 'running',
  output: input  // Store input for merging with callback
});
```

**Why?**
- Callback data needs to be merged with original input
- Downstream nodes may need data from multiple upstream nodes
- Ensures data flows through the entire pipeline

**Example Flow:**
```
1. Input: { visual_prompt: "...", voice_text: "..." }
2. Store in node state: { visual_prompt: "...", voice_text: "..." }
3. Callback arrives: { videoUrl: "https://..." }
4. Merge: { visual_prompt: "...", voice_text: "...", videoUrl: "https://..." }
5. Pass to downstream nodes
```

### Mock Mode for Async Workers

Simulate async behavior in mock mode:

```typescript
if (this.mockMode) {
  // Store state
  await updateNodeState(runId, nodeId, {
    status: 'running',
    output: input
  });

  // Simulate callback after delay
  setTimeout(async () => {
    const { triggerCallback } = await import('./utils');
    await triggerCallback(runId, nodeId, {
      status: 'completed',
      output: {
        ...input,
        result: 'mock-result'
      }
    });
  }, 3000); // 3 second delay

  return; // Return immediately
}
```


## Step 6: Add Environment Variables

If your worker requires API keys or configuration, add them to the environment.

### Update .env.local

```bash
# My Worker Configuration
MY_API_KEY=your-api-key-here
MY_API_ENDPOINT=https://api.example.com/v1
```

### Update config.ts

Edit `src/lib/config.ts` to expose your environment variables:

```typescript
export interface Config {
  // ... existing config
  workers: {
    // ... existing worker config
    myApiKey: string | undefined;
    myApiEndpoint: string | undefined;
  };
}

export function getConfig(): Config {
  return {
    // ... existing config
    workers: {
      // ... existing worker config
      myApiKey: process.env.MY_API_KEY,
      myApiEndpoint: process.env.MY_API_ENDPOINT,
    },
  };
}
```

### Access Configuration in Worker

```typescript
constructor() {
  const config = getConfig();
  
  if (!config.workers.myApiKey) {
    this.mockMode = true;
    logWorker('warn', 'Worker initialized in MOCK MODE', {
      worker: 'my-worker',
      reason: 'MY_API_KEY environment variable is not set'
    });
  } else {
    this.apiKey = config.workers.myApiKey;
    this.endpoint = config.workers.myApiEndpoint || 'https://api.example.com/v1';
  }
}
```

### Environment Variable Best Practices

1. **Provide Defaults**: Use sensible defaults for non-sensitive config
2. **Support Mock Mode**: Allow development without API keys
3. **Document Requirements**: List required variables in README
4. **Validate Early**: Check for required variables in constructor
5. **Never Commit Keys**: Add `.env.local` to `.gitignore`


## Step 7: Write Tests

Create comprehensive tests for your worker to ensure reliability.

### Create Test File

Create `src/lib/workers/__tests__/my-worker.test.ts`:

```typescript
import { MyWorker } from '../my-worker';
import { triggerCallback } from '../utils';

// Mock the triggerCallback function
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  triggerCallback: jest.fn(),
}));

describe('MyWorker', () => {
  let worker: MyWorker;
  const mockTriggerCallback = triggerCallback as jest.MockedFunction<typeof triggerCallback>;

  beforeEach(() => {
    worker = new MyWorker();
    mockTriggerCallback.mockClear();
  });

  describe('execute', () => {
    it('should execute successfully with valid input', async () => {
      const runId = 'test-run-123';
      const nodeId = 'test-node-456';
      const config = {};
      const input = {
        requiredField: 'test-value'
      };

      await worker.execute(runId, nodeId, config, input);

      // Verify callback was triggered with success
      expect(mockTriggerCallback).toHaveBeenCalledWith(
        runId,
        nodeId,
        expect.objectContaining({
          status: 'completed',
          output: expect.objectContaining({
            requiredField: 'test-value',
            result: expect.any(String)
          })
        })
      );
    });

    it('should fail when required field is missing', async () => {
      const runId = 'test-run-123';
      const nodeId = 'test-node-456';
      const config = {};
      const input = {}; // Missing requiredField

      await worker.execute(runId, nodeId, config, input);

      // Verify callback was triggered with failure
      expect(mockTriggerCallback).toHaveBeenCalledWith(
        runId,
        nodeId,
        expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('Missing required field')
        })
      );
    });

    it('should pass through input data', async () => {
      const runId = 'test-run-123';
      const nodeId = 'test-node-456';
      const config = {};
      const input = {
        requiredField: 'test-value',
        extraField: 'should-be-preserved'
      };

      await worker.execute(runId, nodeId, config, input);

      // Verify all input data is passed through
      expect(mockTriggerCallback).toHaveBeenCalledWith(
        runId,
        nodeId,
        expect.objectContaining({
          status: 'completed',
          output: expect.objectContaining({
            requiredField: 'test-value',
            extraField: 'should-be-preserved'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      // Mock fetch to simulate API error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const runId = 'test-run-123';
      const nodeId = 'test-node-456';
      const config = {};
      const input = { requiredField: 'test-value' };

      await worker.execute(runId, nodeId, config, input);

      // Verify failure callback was triggered
      expect(mockTriggerCallback).toHaveBeenCalledWith(
        runId,
        nodeId,
        expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('500')
        })
      );
    });

    it('should work in mock mode when API key is missing', async () => {
      // Create worker without API key (mock mode)
      const mockWorker = new MyWorker();
      
      const runId = 'test-run-123';
      const nodeId = 'test-node-456';
      const config = {};
      const input = { requiredField: 'test-value' };

      await mockWorker.execute(runId, nodeId, config, input);

      // Verify mock data was returned
      expect(mockTriggerCallback).toHaveBeenCalledWith(
        runId,
        nodeId,
        expect.objectContaining({
          status: 'completed',
          output: expect.any(Object)
        })
      );
    });
  });
});
```

### Test Coverage Checklist

- [ ] **Success Path**: Test with valid input
- [ ] **Input Validation**: Test with missing/invalid input
- [ ] **Data Pass-Through**: Verify input data is preserved
- [ ] **Error Handling**: Test API errors and exceptions
- [ ] **Mock Mode**: Test behavior without API keys
- [ ] **Configuration**: Test with different config options
- [ ] **Edge Cases**: Test boundary conditions

### Run Tests

```bash
# Run all worker tests
npm test src/lib/workers/__tests__/

# Run specific worker test
npm test src/lib/workers/__tests__/my-worker.test.ts

# Run with coverage
npm test -- --coverage src/lib/workers/__tests__/my-worker.test.ts
```


## Step 8: Test Your Worker End-to-End

Test your worker in a real workflow to ensure it integrates correctly.

### Create a Test Workflow

Create a simple workflow that uses your worker:

```typescript
// scripts/test-my-worker.ts
import { createClient } from '@supabase/supabase-js';
import { workerRegistry } from '@/lib/workers';

async function testMyWorker() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create a test flow with your worker
  const { data: flow, error: flowError } = await supabase
    .from('stitch_flows')
    .insert({
      name: 'Test My Worker',
      visual_graph: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            data: { label: 'Start' },
            position: { x: 0, y: 0 }
          },
          {
            id: 'my-worker-node',
            type: 'worker',
            data: {
              label: 'My Worker',
              workerType: 'my-worker',
              config: {
                // Your worker config
              }
            },
            position: { x: 200, y: 0 }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start',
            target: 'my-worker-node'
          }
        ]
      }
    })
    .select()
    .single();

  if (flowError) {
    console.error('Failed to create flow:', flowError);
    return;
  }

  console.log('Created test flow:', flow.id);

  // 2. Create a run
  const response = await fetch(`http://localhost:3000/api/canvas/${flow.id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        requiredField: 'test-value'
      }
    })
  });

  const run = await response.json();
  console.log('Created run:', run.id);

  // 3. Monitor run status
  let status = 'running';
  while (status === 'running') {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: runData } = await supabase
      .from('stitch_runs')
      .select('status, nodes')
      .eq('id', run.id)
      .single();

    status = runData?.status || 'unknown';
    console.log('Run status:', status);

    if (status === 'completed') {
      console.log('Run completed successfully!');
      console.log('Node outputs:', runData.nodes);
    } else if (status === 'failed') {
      console.log('Run failed!');
      console.log('Node states:', runData.nodes);
    }
  }
}

testMyWorker().catch(console.error);
```

### Run the Test

```bash
# Make sure your dev server is running
npm run dev

# In another terminal, run the test script
npx tsx scripts/test-my-worker.ts
```

### Verify Results

Check that:
- [ ] Worker executes without errors
- [ ] Output contains expected fields
- [ ] Input data is passed through
- [ ] Downstream nodes receive correct data
- [ ] Run completes successfully


## Step 9: Update Documentation

Document your worker so others can use it.

### Update Worker System Documentation

Add your worker to `docs/implementation/backend/worker-system.md` in the "Integrated Workers" section:

```markdown
### My Worker

**Type:** Synchronous (or Asynchronous)
**Purpose:** Brief description of what the worker does

**Input:**
- `requiredField` (string, required): Description of the field
- `optionalField` (number, optional): Description of the field

**Output:**
- `result` (string): Description of the output
- `metadata` (object): Description of metadata

**Configuration:**
- `endpoint`: API endpoint URL (default: `https://api.example.com/v1`)
- `timeout`: Request timeout in milliseconds (default: 30000)

**Implementation Details:**
- Key implementation notes
- Special behaviors
- Mock mode behavior

**File:** `src/lib/workers/my-worker.ts`
```

### Update README

If your worker requires new environment variables, update the project README:

```markdown
## Environment Variables

### Worker Configuration

- `MY_API_KEY`: API key for My Worker service (required for production)
- `MY_API_ENDPOINT`: Custom API endpoint (optional, defaults to https://api.example.com/v1)
```

### Add Usage Examples

Create examples showing how to use your worker in workflows:

```markdown
## Example: Using My Worker

```json
{
  "nodes": [
    {
      "id": "my-worker-1",
      "type": "worker",
      "data": {
        "workerType": "my-worker",
        "config": {
          "timeout": 60000
        }
      }
    }
  ]
}
```

**Input:**
```json
{
  "requiredField": "example-value"
}
```

**Output:**
```json
{
  "requiredField": "example-value",
  "result": "processed-value",
  "metadata": {
    "processingTime": 1234
  }
}
```
```


## Common Patterns and Best Practices

### Pattern: Field Name Aliases

Support multiple field names for compatibility:

```typescript
// Accept both snake_case and camelCase
const visualPrompt = input?.visual_prompt || input?.visualPrompt;
const voiceText = input?.voice_text || input?.voiceText;
```

### Pattern: Retry Logic

Implement retry logic for transient failures:

```typescript
async function executeWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logWorker('warn', `Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Usage
const result = await executeWithRetry(() => 
  fetch(endpoint, { method: 'POST', body: JSON.stringify(data) })
);
```

### Pattern: Progress Updates

For long-running workers, send progress updates:

```typescript
// Update node state with progress
await updateNodeState(runId, nodeId, {
  status: 'running',
  output: input,
  metadata: {
    progress: 0.5,
    message: 'Processing video frames...'
  }
});
```

### Pattern: File Upload to Storage

Upload generated files to Supabase Storage:

```typescript
import { createClient } from '@supabase/supabase-js';

async function uploadToStorage(
  buffer: ArrayBuffer,
  fileName: string,
  bucket: string = 'worker-outputs'
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: 'application/octet-stream',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

// Usage in worker
const audioBuffer = await fetch(audioUrl).then(r => r.arrayBuffer());
const fileName = `audio/${runId}/${nodeId}.mp3`;
const publicUrl = await uploadToStorage(audioBuffer, fileName);
```

### Pattern: Webhook Signature Verification

Verify webhook signatures for security:

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in async worker callback handler
const isValid = verifyWebhookSignature(
  JSON.stringify(req.body),
  req.headers['x-signature'] as string,
  process.env.WEBHOOK_SECRET!
);

if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

### Pattern: Rate Limiting

Implement rate limiting for API calls:

```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastCallTime = 0;
  private minInterval: number;

  constructor(callsPerSecond: number) {
    this.minInterval = 1000 / callsPerSecond;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;

      if (timeSinceLastCall < this.minInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minInterval - timeSinceLastCall)
        );
      }

      const fn = this.queue.shift();
      if (fn) {
        this.lastCallTime = Date.now();
        await fn();
      }
    }

    this.processing = false;
  }
}

// Usage
const rateLimiter = new RateLimiter(10); // 10 calls per second

await rateLimiter.execute(() => 
  fetch(endpoint, { method: 'POST', body: JSON.stringify(data) })
);
```


## Troubleshooting

### Worker Not Found Error

**Error:** `Worker type "my-worker" is not registered`

**Solution:**
1. Verify you added the registration in `src/lib/workers/index.ts`
2. Check that the worker type string matches exactly
3. Restart your dev server to reload the module

```typescript
// Make sure this line exists in index.ts
workerRegistry.register('my-worker', MyWorker);
```

### Callback Not Triggered

**Symptoms:**
- Node stays in "running" state forever
- No callback is received

**Solutions:**

1. **Check callback URL construction:**
```typescript
// Make sure you're using buildCallbackUrl()
const callbackUrl = buildCallbackUrl(runId, nodeId);
// NOT: const callbackUrl = 'http://localhost:3000/...'
```

2. **Verify NEXT_PUBLIC_BASE_URL is set:**
```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3. **Check external service logs:**
- Did the external service receive the callback URL?
- Did it attempt to call back?
- Were there any errors?

4. **Test callback manually:**
```bash
curl -X POST http://localhost:3000/api/stitch/callback/run-123/node-456 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","output":{"result":"test"}}'
```

### Input Data Not Passed Through

**Symptoms:**
- Downstream nodes missing expected data
- Data lost between nodes

**Solution:**
Always spread input when creating output:

```typescript
// WRONG - loses input data
await triggerCallback(runId, nodeId, {
  status: 'completed',
  output: { result }
});

// CORRECT - preserves input data
await triggerCallback(runId, nodeId, {
  status: 'completed',
  output: { ...input, result }
});
```

### Mock Mode Not Working

**Symptoms:**
- Worker tries to call API even without API key
- Errors about missing credentials

**Solution:**
Check your constructor logic:

```typescript
constructor() {
  const config = getConfig();
  
  // Make sure this check happens BEFORE initializing API client
  if (!config.workers.myApiKey) {
    this.mockMode = true;
    return; // Don't initialize API client
  }
  
  // Only initialize if API key exists
  this.apiClient = new APIClient(config.workers.myApiKey);
}
```

### API Errors

**Symptoms:**
- Worker fails with API error messages
- Timeout errors

**Solutions:**

1. **Check API key validity:**
```typescript
// Test API key manually
const response = await fetch(endpoint, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
console.log('API key valid:', response.ok);
```

2. **Increase timeout:**
```typescript
const response = await fetch(endpoint, {
  signal: AbortSignal.timeout(60000) // 60 second timeout
});
```

3. **Add retry logic:**
```typescript
const result = await executeWithRetry(() => callAPI(), 3);
```

### Memory Leaks

**Symptoms:**
- Memory usage grows over time
- Server becomes slow

**Solutions:**

1. **Clean up resources:**
```typescript
try {
  const response = await fetch(endpoint);
  const data = await response.json();
  // Process data
} finally {
  // Clean up any resources
  response.body?.cancel();
}
```

2. **Avoid storing large objects:**
```typescript
// WRONG - stores entire buffer in memory
this.cachedData = largeBuffer;

// CORRECT - process and discard
await processBuffer(largeBuffer);
```

3. **Use streams for large files:**
```typescript
const response = await fetch(videoUrl);
const stream = response.body;
// Process stream in chunks
```


## Complete Example: Weather Worker

Here's a complete example of a synchronous worker that fetches weather data:

```typescript
// src/lib/workers/weather.ts
import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { triggerCallback, logWorker, extractErrorContext } from './utils';

/**
 * Weather Worker
 * Fetches current weather data for a given location
 */
export class WeatherWorker implements IWorker {
  private apiKey: string | null = null;
  private mockMode: boolean = false;

  constructor() {
    const config = getConfig();
    
    if (!config.workers.weatherApiKey) {
      this.mockMode = true;
      logWorker('warn', 'Weather worker initialized in MOCK MODE', {
        worker: 'weather',
        reason: 'WEATHER_API_KEY environment variable is not set',
        message: 'Worker will return mock weather data'
      });
    } else {
      this.apiKey = config.workers.weatherApiKey;
      logWorker('info', 'Weather worker initialized successfully', {
        worker: 'weather',
        apiKeyPresent: true
      });
    }
  }

  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    logWorker('info', 'Weather worker execution started', {
      worker: 'weather',
      runId,
      nodeId
    });

    try {
      // 1. Extract and validate input
      const location = input?.location;
      if (!location) {
        throw new Error('Missing required field: location');
      }

      // 2. Handle mock mode
      if (this.mockMode) {
        logWorker('info', 'Weather worker running in MOCK MODE', {
          worker: 'weather',
          runId,
          nodeId,
          location
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        const mockWeather = {
          temperature: 72,
          condition: 'Sunny',
          humidity: 45,
          windSpeed: 8
        };

        await triggerCallback(runId, nodeId, {
          status: 'completed',
          output: {
            ...input,
            weather: mockWeather
          }
        });

        const duration = Date.now() - startTime;
        logWorker('info', 'Weather worker completed (MOCK MODE)', {
          worker: 'weather',
          runId,
          nodeId,
          duration
        });

        return;
      }

      // 3. Extract configuration
      const units = config.units || 'imperial';
      const endpoint = config.endpoint || 'https://api.weather.com/v1/current';

      // 4. Call weather API
      logWorker('info', 'Calling weather API', {
        worker: 'weather',
        runId,
        nodeId,
        location,
        units
      });

      const response = await fetch(
        `${endpoint}?location=${encodeURIComponent(location)}&units=${units}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Weather API request failed with status ${response.status}: ${errorText}`);
      }

      const weatherData = await response.json();

      // 5. Validate response
      if (!weatherData.temperature || !weatherData.condition) {
        throw new Error('Invalid weather API response: missing required fields');
      }

      const duration = Date.now() - startTime;
      logWorker('info', 'Weather worker completed successfully', {
        worker: 'weather',
        runId,
        nodeId,
        duration,
        temperature: weatherData.temperature,
        condition: weatherData.condition
      });

      // 6. Trigger success callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: {
          ...input,
          weather: {
            temperature: weatherData.temperature,
            condition: weatherData.condition,
            humidity: weatherData.humidity,
            windSpeed: weatherData.wind_speed
          }
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorContext = extractErrorContext(error);

      logWorker('error', 'Weather worker failed', {
        worker: 'weather',
        runId,
        nodeId,
        error: errorMessage,
        ...errorContext,
        duration,
        phase: 'execution'
      });

      try {
        await triggerCallback(runId, nodeId, {
          status: 'failed',
          error: errorMessage
        });
      } catch (callbackError) {
        const callbackErrorContext = extractErrorContext(callbackError);
        logWorker('error', 'Failed to trigger failure callback', {
          worker: 'weather',
          runId,
          nodeId,
          originalError: errorMessage,
          callbackError: callbackError instanceof Error ? callbackError.message : 'Unknown error',
          ...callbackErrorContext,
          phase: 'callback'
        });
      }
    }
  }
}
```

### Register the Worker

```typescript
// src/lib/workers/index.ts
import { WeatherWorker } from './weather';

export { WeatherWorker } from './weather';

workerRegistry.register('weather', WeatherWorker);
```

### Add Worker Definition

```typescript
// src/lib/workers/registry.ts
export const WORKER_DEFINITIONS: Record<string, WorkerDefinition> = {
  // ... existing workers
  
  weather: {
    id: 'weather',
    name: 'Weather Data Fetcher',
    type: 'sync',
    description: 'Fetch current weather data for a given location',
    input: {
      location: {
        type: 'string',
        required: true,
        description: 'City name or coordinates (e.g., "New York" or "40.7128,-74.0060")'
      }
    },
    output: {
      weather: {
        type: 'object',
        description: 'Weather data including temperature, condition, humidity, and wind speed'
      }
    },
    config: {
      units: 'imperial',
      endpoint: 'https://api.weather.com/v1/current'
    }
  }
};
```

### Add Environment Variable

```typescript
// src/lib/config.ts
export interface Config {
  workers: {
    // ... existing workers
    weatherApiKey: string | undefined;
  };
}

export function getConfig(): Config {
  return {
    workers: {
      // ... existing workers
      weatherApiKey: process.env.WEATHER_API_KEY,
    },
  };
}
```

### Test the Worker

```typescript
// src/lib/workers/__tests__/weather.test.ts
import { WeatherWorker } from '../weather';
import { triggerCallback } from '../utils';

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  triggerCallback: jest.fn(),
}));

describe('WeatherWorker', () => {
  let worker: WeatherWorker;
  const mockTriggerCallback = triggerCallback as jest.MockedFunction<typeof triggerCallback>;

  beforeEach(() => {
    worker = new WeatherWorker();
    mockTriggerCallback.mockClear();
  });

  it('should fetch weather data successfully', async () => {
    const runId = 'test-run-123';
    const nodeId = 'test-node-456';
    const config = { units: 'imperial' };
    const input = { location: 'New York' };

    await worker.execute(runId, nodeId, config, input);

    expect(mockTriggerCallback).toHaveBeenCalledWith(
      runId,
      nodeId,
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          location: 'New York',
          weather: expect.objectContaining({
            temperature: expect.any(Number),
            condition: expect.any(String)
          })
        })
      })
    );
  });

  it('should fail when location is missing', async () => {
    const runId = 'test-run-123';
    const nodeId = 'test-node-456';
    const config = {};
    const input = {};

    await worker.execute(runId, nodeId, config, input);

    expect(mockTriggerCallback).toHaveBeenCalledWith(
      runId,
      nodeId,
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('Missing required field: location')
      })
    );
  });
});
```


## Checklist

Use this checklist to ensure you've completed all steps:

### Implementation
- [ ] Created worker class file in `src/lib/workers/`
- [ ] Implemented `IWorker` interface with `execute()` method
- [ ] Added constructor with API key validation
- [ ] Implemented mock mode for development
- [ ] Added input validation
- [ ] Implemented data pass-through (spread input in output)
- [ ] Added error handling with try-catch
- [ ] Triggered callbacks for both success and failure
- [ ] Added structured logging with `logWorker()`
- [ ] Handled async execution pattern (if applicable)

### Registration
- [ ] Added worker definition to `WORKER_DEFINITIONS` in `registry.ts`
- [ ] Defined input schema with types and descriptions
- [ ] Defined output schema with types and descriptions
- [ ] Added default configuration values
- [ ] Exported worker class from `index.ts`
- [ ] Registered worker in global registry

### Configuration
- [ ] Added environment variables to `.env.local`
- [ ] Updated `config.ts` to expose environment variables
- [ ] Documented required environment variables
- [ ] Provided sensible defaults for optional config

### Testing
- [ ] Created test file in `__tests__/` directory
- [ ] Tested success path with valid input
- [ ] Tested input validation and error cases
- [ ] Tested data pass-through
- [ ] Tested mock mode behavior
- [ ] Tested API error handling
- [ ] All tests passing

### Documentation
- [ ] Added worker to "Integrated Workers" section in `worker-system.md`
- [ ] Documented input/output schemas
- [ ] Documented configuration options
- [ ] Added usage examples
- [ ] Updated README with environment variables
- [ ] Added troubleshooting notes (if applicable)

### Integration Testing
- [ ] Created end-to-end test workflow
- [ ] Verified worker executes in real workflow
- [ ] Verified output is correct
- [ ] Verified data flows to downstream nodes
- [ ] Tested in both development and production environments

## Next Steps

After completing your worker:

1. **Submit for Review**: Create a pull request with your changes
2. **Monitor Production**: Watch logs for any issues after deployment
3. **Gather Feedback**: Ask users if the worker meets their needs
4. **Iterate**: Make improvements based on feedback and usage patterns

## Related Documentation

- [Worker System](../backend/worker-system.md) - Comprehensive worker system documentation
- [Execution Engine](../backend/execution-engine.md) - How workers are invoked
- [Type System](../architecture/type-system.md) - TypeScript types for workers
- [API Documentation](../api/workflow-api.md) - Worker callback endpoints
- [Testing Guide](./testing-guide.md) - General testing patterns

## Getting Help

If you run into issues:

1. **Check Existing Workers**: Look at similar workers for reference
2. **Review Logs**: Check console output for error messages
3. **Test in Isolation**: Create a minimal test case
4. **Ask for Help**: Reach out to the team with specific questions

## File Locations

- **Worker Implementation**: `src/lib/workers/my-worker.ts`
- **Worker Tests**: `src/lib/workers/__tests__/my-worker.test.ts`
- **Worker Registry**: `src/lib/workers/registry.ts`
- **Worker Index**: `src/lib/workers/index.ts`
- **Configuration**: `src/lib/config.ts`
- **Environment Variables**: `.env.local`

---

**Congratulations!** You've successfully added a new worker to Stitch. Your worker is now ready to be used in workflows and can be integrated into the execution pipeline.

