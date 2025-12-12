# Worker API Key Handling

## Overview

All Stitch workers now implement graceful API key handling with automatic fallback to mock mode when API keys are missing. This allows developers to test workflows without requiring all external API credentials.

## Features

### 1. Automatic Mock Mode Fallback

When a worker is initialized without its required API keys, it automatically enters mock mode instead of throwing an error. This allows:

- Testing workflows without external API credentials
- Development without incurring API costs
- Rapid prototyping and debugging

### 2. Clear Logging

Workers log their initialization status, making it easy to see which workers are running in mock mode:

```typescript
// With API key present
{
  "level": "info",
  "message": "Claude worker initialized successfully",
  "worker": "claude",
  "apiKeyPresent": true
}

// Without API key (mock mode)
{
  "level": "warn",
  "message": "Claude worker initialized in MOCK MODE",
  "worker": "claude",
  "reason": "ANTHROPIC_API_KEY environment variable is not set",
  "message": "Worker will return mock data instead of calling the API"
}
```

### 3. Realistic Mock Data

Mock mode returns realistic data that matches the expected output schema:

- **Claude Worker**: Returns 4 sample scenes with visual prompts and voice text
- **MiniMax Worker**: Returns sample video URLs after simulated delay
- **ElevenLabs Worker**: Returns sample audio URLs
- **Shotstack Worker**: Returns sample final video URLs
- **Scene Parser Worker**: Returns parsed scene structure
- **Wireframe Generator**: Returns placeholder images
- **Image-to-Video**: Returns sample video URLs

## Worker-Specific Requirements

### Claude Worker & Scene Parser Worker
- **Required**: `ANTHROPIC_API_KEY`
- **Mock Mode**: Returns sample scene data

### MiniMax Worker
- **Required**: `MINIMAX_API_KEY` and `MINIMAX_GROUP_ID`
- **Mock Mode**: Returns sample video URLs with simulated async callback

### ElevenLabs Worker
- **Required**: `ELEVENLABS_API_KEY`
- **Mock Mode**: Returns sample audio URLs

### Shotstack Worker
- **Required**: `SHOTSTACK_API_KEY`
- **Mock Mode**: Returns sample final video URLs with simulated async callback

### Wireframe Generator Worker
- **Optional Adapters**:
  - Ideogram: `IDEOGRAM_API_KEY`
  - DALL-E: `OPENAI_API_KEY`
- **Configuration**: Set `IMAGE_GENERATION_ADAPTER` to `ideogram`, `dalle`, or `mock` (default)
- **Mock Mode**: Returns placeholder images

### Image-to-Video Worker
- **Optional Adapters**:
  - Runway: `RUNWAY_API_KEY`
  - Pika: `PIKA_API_KEY`
  - Kling: `KLING_API_KEY`
- **Configuration**: Set `VIDEO_GENERATION_ADAPTER` to `runway`, `pika`, `kling`, or `mock` (default)
- **Mock Mode**: Returns sample video URLs

## Usage

### Development Without API Keys

Simply start the application without setting worker API keys. Workers will automatically enter mock mode:

```bash
# Only set required Supabase variables
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-key
export SUPABASE_SERVICE_ROLE_KEY=your-key
export NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Start the app - workers will use mock mode
npm run dev
```

### Production With API Keys

Set all required API keys for production use:

```bash
# Required base configuration
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-key
export SUPABASE_SERVICE_ROLE_KEY=your-key
export NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Worker API keys
export ANTHROPIC_API_KEY=sk-ant-your-key
export MINIMAX_API_KEY=your-key
export MINIMAX_GROUP_ID=your-group-id
export ELEVENLABS_API_KEY=your-key
export SHOTSTACK_API_KEY=your-key

# Optional: Image generation
export IMAGE_GENERATION_ADAPTER=ideogram
export IDEOGRAM_API_KEY=your-key

# Optional: Video generation
export VIDEO_GENERATION_ADAPTER=runway
export RUNWAY_API_KEY=your-key

npm run build
npm start
```

### Testing Individual Workers

Use the `test-worker` script to test individual workers:

```bash
# Test in mock mode (no API key required)
npm run test:worker claude

# Test with real API (requires API key)
export ANTHROPIC_API_KEY=sk-ant-your-key
npm run test:worker claude
```

## Implementation Details

### Worker Constructor Pattern

All workers follow this pattern:

```typescript
export class ExampleWorker implements IWorker {
  private client: ExternalClient | null = null;
  private mockMode: boolean = false;

  constructor() {
    const config = getConfig();
    
    if (!config.workers.exampleApiKey) {
      this.mockMode = true;
      logWorker('warn', 'Example worker initialized in MOCK MODE', {
        worker: 'example',
        reason: 'EXAMPLE_API_KEY environment variable is not set',
        message: 'Worker will return mock data instead of calling the API',
      });
    } else {
      this.client = new ExternalClient({
        apiKey: config.workers.exampleApiKey,
      });
      logWorker('info', 'Example worker initialized successfully', {
        worker: 'example',
        apiKeyPresent: true,
      });
    }
  }

  async execute(runId: string, nodeId: string, config: NodeConfig, input: any): Promise<void> {
    if (this.mockMode) {
      // Return mock data
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: { /* mock data */ },
      });
      return;
    }

    // Real API call
    const result = await this.client!.doWork(input);
    await triggerCallback(runId, nodeId, {
      status: 'completed',
      output: result,
    });
  }
}
```

### Adapter Pattern for Multi-Provider Workers

Workers that support multiple providers (Wireframe Generator, Image-to-Video) use an adapter pattern:

```typescript
export class MultiProviderWorker implements IWorker {
  private adapter: ProviderAdapter;

  constructor() {
    const adapterType = process.env.PROVIDER_ADAPTER || 'mock';
    
    switch (adapterType.toLowerCase()) {
      case 'provider-a':
        if (!process.env.PROVIDER_A_API_KEY) {
          logWorker('warn', 'Falling back to MOCK MODE', {
            reason: 'PROVIDER_A_API_KEY not set',
          });
          this.adapter = new MockAdapter();
        } else {
          this.adapter = new ProviderAAdapter(process.env.PROVIDER_A_API_KEY);
          logWorker('info', 'Initialized with Provider A', {
            apiKeyPresent: true,
          });
        }
        break;
      
      case 'mock':
      default:
        this.adapter = new MockAdapter();
        logWorker('info', 'Initialized in MOCK MODE');
        break;
    }
  }
}
```

## Benefits

1. **Developer Experience**: No need to obtain API keys for initial development
2. **Cost Savings**: Avoid API charges during development and testing
3. **Faster Iteration**: Test workflows without waiting for external APIs
4. **Clear Feedback**: Logs clearly indicate which workers are in mock mode
5. **Production Ready**: Simply add API keys to enable real functionality
6. **Graceful Degradation**: System continues to work even if some API keys are missing

## Migration Notes

This change is **backward compatible**. Existing deployments with API keys will continue to work exactly as before. The only difference is that missing API keys now result in mock mode instead of errors.

## Related Files

- Worker implementations: `src/lib/workers/*.ts`
- Configuration: `src/lib/config.ts`
- Environment template: `.env.example`
- Testing infrastructure: `src/lib/workers/testing.ts`
- Test script: `scripts/test-worker.ts`
