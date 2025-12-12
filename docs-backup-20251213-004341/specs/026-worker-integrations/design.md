# Design Document: Worker Integrations

## Overview

This design implements a worker adapter system that integrates four external APIs (Claude, MiniMax, ElevenLabs, Shotstack) into the Stitch execution engine. The system follows the Stitch Protocol for standardized communication and supports three execution patterns: synchronous workers (Claude), asynchronous workers (MiniMax, Shotstack), and pseudo-asynchronous workers (ElevenLabs).

The worker system is designed as a pluggable architecture where new workers can be added without modifying the core engine. A centralized Worker Registry maps node types to worker implementations, enabling dynamic routing of execution requests.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Stitch Engine                            │
│  ┌──────────────┐         ┌─────────────────┐              │
│  │ Edge Walker  │────────▶│ Worker Registry │              │
│  └──────────────┘         └────────┬────────┘              │
│                                     │                        │
│                                     ▼                        │
│                          ┌──────────────────┐               │
│                          │  Worker Factory  │               │
│                          └────────┬─────────┘               │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │Claude Worker │ │MiniMax Worker│ │ElevenLabs    │
            │   (Sync)     │ │   (Async)    │ │Worker (P-A)  │
            └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                   │                │                 │
                   ▼                ▼                 ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │Anthropic API │ │ MiniMax API  │ │ElevenLabs API│
            └──────────────┘ └──────────────┘ └──────────────┘
```

### Execution Patterns

**Synchronous Pattern (Claude)**:
1. Engine calls worker.execute()
2. Worker makes API call and waits for response
3. Worker immediately triggers callback with results
4. Engine continues edge-walking

**Asynchronous Pattern (MiniMax, Shotstack)**:
1. Engine calls worker.execute()
2. Worker initiates API request with callback URL
3. Worker returns immediately (node marked "running")
4. External service processes request
5. External service POSTs to callback URL
6. Callback handler updates node state and resumes edge-walking

**Pseudo-Asynchronous Pattern (ElevenLabs)**:
1. Engine calls worker.execute()
2. Worker makes API call and awaits response
3. Worker uploads result to Supabase Storage
4. Worker triggers callback with storage URL
5. Engine continues edge-walking

## Components and Interfaces

### Base Worker Interface

```typescript
interface IWorker {
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

### Worker Registry

```typescript
interface IWorkerRegistry {
  /**
   * Registers a worker type with its implementation
   * @param type - The worker type identifier
   * @param workerClass - The worker class constructor
   */
  register(type: string, workerClass: new () => IWorker): void;
  
  /**
   * Retrieves a worker instance for a given type
   * @param type - The worker type identifier
   * @returns Worker instance
   * @throws Error if type is not registered
   */
  getWorker(type: string): IWorker;
  
  /**
   * Checks if a worker type is registered
   * @param type - The worker type identifier
   * @returns true if registered, false otherwise
   */
  hasWorker(type: string): boolean;
}
```

### Worker Configuration

Each worker reads its configuration from environment variables and node config:

**Claude Worker**:
- `ANTHROPIC_API_KEY` - API authentication key
- `config.model` - Claude model to use (default: "claude-3-5-sonnet-20241022")
- `config.maxTokens` - Maximum tokens for response (default: 4096)

**MiniMax Worker**:
- `MINIMAX_API_KEY` - API authentication key
- `MINIMAX_GROUP_ID` - MiniMax group identifier
- `config.model` - Model identifier (default: "video-01")

**ElevenLabs Worker**:
- `ELEVENLABS_API_KEY` - API authentication key
- `config.voiceId` - Voice identifier for TTS
- `config.modelId` - Model identifier (default: "eleven_multilingual_v2")

**Shotstack Worker**:
- `SHOTSTACK_API_KEY` - API authentication key
- `config.resolution` - Output resolution (default: "sd")
- `config.format` - Output format (default: "mp4")
- `config.fps` - Frames per second (default: 25)

## Data Models

### Scene Structure

Used by Claude (output) and consumed by MiniMax/ElevenLabs:

```typescript
interface Scene {
  visual_prompt: string;  // Text description for video generation
  voice_text: string;     // Text for voice narration
  duration?: number;      // Optional duration in seconds
}
```

### Timeline Structure

Used by Shotstack for video assembly:

```typescript
interface ShotstackTimeline {
  background: string;  // Background color (e.g., "#000000")
  tracks: ShotstackTrack[];
}

interface ShotstackTrack {
  clips: ShotstackClip[];
}

interface ShotstackClip {
  asset: {
    type: 'video' | 'audio';
    src: string;  // URL to the asset
  };
  start: number;  // Start time in seconds
  length: number; // Duration in seconds
}

interface ShotstackPayload {
  timeline: ShotstackTimeline;
  output: {
    format: string;      // e.g., "mp4"
    resolution: string;  // e.g., "sd", "hd", "1080"
  };
  callback: string;  // Callback URL
}
```

### Worker Callback Structure

Standardized callback format (from Stitch Protocol):

```typescript
interface WorkerCallback {
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
}
```

### API Response Structures

**Claude Response**:
```typescript
interface ClaudeResponse {
  scenes: Scene[];
}
```

**MiniMax Response** (to callback):
```typescript
interface MiniMaxCallback {
  status: 'completed' | 'failed';
  output: {
    videoUrl: string;
  };
  error?: string;
}
```

**ElevenLabs Response**:
```typescript
// Returns ArrayBuffer directly
type ElevenLabsResponse = ArrayBuffer;
```

**Shotstack Response** (to callback):
```typescript
interface ShotstackCallback {
  status: 'completed' | 'failed';
  output: {
    videoUrl: string;
  };
  error?: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Worker interface consistency
*For any* registered worker type, the worker instance should expose an execute method that accepts (runId, nodeId, config, input) parameters and returns a Promise<void>
**Validates: Requirements 1.1, 1.2**

### Property 2: Callback URL format compliance
*For any* runId and nodeId combination, the constructed callback URL should match the pattern `${baseUrl}/api/stitch/callback/${runId}/${nodeId}` and be included in all worker payloads
**Validates: Requirements 1.3, 3.3**

### Property 3: Success callback structure
*For any* worker that completes successfully, the callback should have status "completed" and include output data
**Validates: Requirements 1.4**

### Property 4: Error callback structure
*For any* worker that encounters an error, the callback should have status "failed" and include an error message
**Validates: Requirements 1.5**

### Property 5: Input data flow to API
*For any* worker execution, the input data provided to the execute method should be correctly passed to the external API call (prompt for Claude, visual_prompt for MiniMax, voice_text for ElevenLabs)
**Validates: Requirements 2.2, 3.2, 4.2**

### Property 6: Scene validation
*For any* response from Claude, each scene in the output array should contain both visual_prompt and voice_text fields
**Validates: Requirements 2.4**

### Property 7: Authentication header inclusion
*For any* API request made by a worker, the request should include the appropriate API key in the Authorization header
**Validates: Requirements 3.4, 7.3**

### Property 8: Async execution pattern
*For any* async worker (MiniMax, Shotstack), the execute method should return immediately after initiating the API request, without waiting for the external service to complete
**Validates: Requirements 3.5, 5.6**

### Property 9: Configuration usage
*For any* worker that requires configuration (voiceId for ElevenLabs, model for Claude), the config values should be correctly used in API requests
**Validates: Requirements 4.3**

### Property 10: Storage upload and URL retrieval
*For any* successful ElevenLabs execution, the audio ArrayBuffer should be uploaded to Supabase Storage and a public URL should be returned in the callback output
**Validates: Requirements 4.5, 4.6, 4.7**

### Property 11: Timeline structure correctness
*For any* array of scenes provided to Shotstack worker, the generated timeline should have exactly two tracks (video and audio) with clips ordered sequentially
**Validates: Requirements 5.2, 5.3**

### Property 12: Clip timing calculation
*For any* array of scenes with durations, the start time of each clip in the timeline should equal the sum of all previous clip durations
**Validates: Requirements 5.4**

### Property 13: Shotstack payload completeness
*For any* Shotstack API request, the payload should include timeline, output format, resolution, and callback URL
**Validates: Requirements 5.5**

### Property 14: Registry lookup for registered types
*For any* registered worker type, calling getWorker with that type should return a valid worker instance
**Validates: Requirements 6.2, 6.3**

### Property 15: Registry error for unregistered types
*For any* unregistered worker type, calling getWorker should throw an error indicating the type is not supported
**Validates: Requirements 6.4**

### Property 16: Environment variable validation
*For any* worker that requires API credentials, attempting to initialize without the required environment variables should throw an error
**Validates: Requirements 7.1, 7.2**

### Property 17: Logging completeness
*For any* worker execution, log entries should be created for execution start (with runId and nodeId), API calls (with sanitized details), responses (with status), errors (with stack traces), and completion (with duration)
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 18: Sensitive data exclusion from logs
*For any* log entry created by a worker, the log should not contain API keys, authentication tokens, or other sensitive credentials
**Validates: Requirements 8.2**

## Error Handling

### Worker-Level Error Handling

Each worker implements comprehensive error handling:

1. **Configuration Errors**: Thrown during worker initialization if required environment variables are missing
2. **API Errors**: Caught during API calls and converted to failed callbacks with descriptive error messages
3. **Network Errors**: Timeout and connection failures are caught and reported via failed callbacks
4. **Validation Errors**: Invalid responses or data structures trigger failed callbacks
5. **Storage Errors**: Upload failures in ElevenLabs worker trigger failed callbacks

### Error Callback Format

All errors follow the standardized callback format:

```typescript
{
  status: 'failed',
  error: 'Descriptive error message including context'
}
```

### Error Recovery

- Workers do not retry failed operations automatically
- Failed nodes can be retried via the existing retry API endpoint
- Errors are logged with full context for debugging
- Node state is updated to 'failed' to prevent downstream execution

### Timeout Handling

- Synchronous workers (Claude, ElevenLabs) use API client timeouts
- Asynchronous workers (MiniMax, Shotstack) rely on external service callbacks
- If async callbacks never arrive, nodes remain in 'running' state (manual intervention required)

## Testing Strategy

### Unit Testing

Unit tests will cover:

1. **Worker Initialization**: Test that workers correctly load configuration from environment variables
2. **Callback URL Construction**: Verify URL format matches the Stitch Protocol
3. **Payload Building**: Test that worker payloads include all required fields
4. **Error Handling**: Test specific error scenarios (missing config, API failures, invalid responses)
5. **Timeline Building**: Test Shotstack timeline construction with various scene arrays
6. **Registry Operations**: Test registration, lookup, and error cases

### Property-Based Testing

Property-based tests will use **fast-check** library (TypeScript/JavaScript PBT framework) with a minimum of 100 iterations per property.

Each property test will:
1. Generate random valid inputs (runIds, nodeIds, configs, scene arrays)
2. Execute the worker or registry operation
3. Verify the property holds for all generated inputs
4. Report any counterexamples that violate the property

Property tests will be tagged with comments referencing the design document:
```typescript
// Feature: worker-integrations, Property 1: Worker interface consistency
```

### Integration Testing

Integration tests will verify:

1. **End-to-End Worker Execution**: Test complete worker flows with mocked external APIs
2. **Callback Handling**: Test that callbacks correctly update node state and trigger edge-walking
3. **Multi-Worker Workflows**: Test flows that chain multiple workers (Claude → Splitter → MiniMax/ElevenLabs → Collector → Shotstack)
4. **Error Propagation**: Test that worker failures are correctly handled by the engine

### Test Doubles

- **External APIs**: Mocked using fetch mocks or nock library
- **Supabase Storage**: Mocked to avoid actual uploads during tests
- **Database**: Use test database or in-memory state for integration tests
- **Environment Variables**: Injected via test setup

### Testing Execution Patterns

Each execution pattern requires specific testing:

**Synchronous (Claude)**:
- Verify execute() waits for API response
- Verify callback is triggered immediately after response
- Test error handling for API failures

**Asynchronous (MiniMax, Shotstack)**:
- Verify execute() returns immediately
- Verify node is marked 'running'
- Test callback endpoint receives and processes responses

**Pseudo-Asynchronous (ElevenLabs)**:
- Verify execute() waits for API response and upload
- Verify storage upload completes before callback
- Test error handling at each step (API, upload, URL retrieval)

## Implementation Notes

### Directory Structure

```
src/lib/workers/
├── index.ts                 # Worker registry and exports
├── base.ts                  # Base worker interface and utilities
├── claude.ts                # Claude worker implementation
├── minimax.ts               # MiniMax worker implementation
├── elevenlabs.ts            # ElevenLabs worker implementation
├── shotstack.ts             # Shotstack worker implementation
└── __tests__/
    ├── claude.test.ts
    ├── claude.property.test.ts
    ├── minimax.test.ts
    ├── minimax.property.test.ts
    ├── elevenlabs.test.ts
    ├── elevenlabs.property.test.ts
    ├── shotstack.test.ts
    ├── shotstack.property.test.ts
    ├── registry.test.ts
    └── registry.property.test.ts
```

### Integration with Existing Engine

The worker system integrates with the existing engine through the Worker node handler:

1. **Current**: `fireWorkerNode()` sends HTTP POST to `config.webhookUrl`
2. **Enhanced**: `fireWorkerNode()` checks if `config.workerType` is set
   - If set: Use Worker Registry to get worker instance and call `execute()`
   - If not set: Fall back to existing webhook behavior (backward compatibility)

This allows gradual migration from webhook-based workers to integrated workers.

### Environment Variables

Required environment variables (add to `.env.example` and `.env.local`):

```bash
# Claude
ANTHROPIC_API_KEY=sk-ant-...

# MiniMax
MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...

# ElevenLabs
ELEVENLABS_API_KEY=...

# Shotstack
SHOTSTACK_API_KEY=...
```

### Logging Strategy

Use structured logging with consistent format:

```typescript
logger.info('Worker execution started', {
  worker: 'claude',
  runId,
  nodeId,
  timestamp: new Date().toISOString()
});
```

Sensitive data (API keys, tokens) should be redacted from logs using a sanitization utility.

### Performance Considerations

1. **Parallel Execution**: Multiple workers can execute in parallel (handled by Splitter nodes)
2. **Timeout Configuration**: Each worker should have configurable timeouts
3. **Rate Limiting**: Workers should respect API rate limits (implement retry with backoff if needed)
4. **Resource Cleanup**: Ensure proper cleanup of resources (file handles, network connections)

### Future Extensibility

The worker system is designed for easy extension:

1. **Adding New Workers**: Implement `IWorker` interface and register in registry
2. **Custom Workers**: Users can add custom workers without modifying core code
3. **Worker Plugins**: Future support for loading workers from external packages
4. **Worker Composition**: Workers can be composed to create complex behaviors
