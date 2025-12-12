# Implementation Plan

- [x] 1. Set up worker infrastructure and base interfaces
- [x] 1.1 Create base worker interface and types
  - Define IWorker interface with execute method signature
  - Create Scene, Timeline, and worker-specific types
  - Add worker-related types to existing stitch types
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Implement Worker Registry
  - Create WorkerRegistry class with register, getWorker, and hasWorker methods
  - Implement singleton pattern for global registry access
  - Add error handling for unregistered worker types
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 1.3 Write property test for Worker Registry
  - **Property 14: Registry lookup for registered types**
  - **Property 15: Registry error for unregistered types**
  - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 1.4 Create base worker utilities
  - Implement callback URL construction helper
  - Create callback trigger utility function
  - Add logging utilities with sensitive data sanitization
  - _Requirements: 1.3, 8.1, 8.2_

- [x] 1.5 Write property test for callback URL format
  - **Property 2: Callback URL format compliance**
  - **Validates: Requirements 1.3, 3.3**

- [x] 1.6 Update environment configuration
  - Extend getConfig() to include worker API keys
  - Add validation for ANTHROPIC_API_KEY, MINIMAX_API_KEY, MINIMAX_GROUP_ID, ELEVENLABS_API_KEY, SHOTSTACK_API_KEY
  - Update .env.example with worker environment variables
  - _Requirements: 7.1, 7.2_

- [ ]* 1.7 Write property test for environment variable validation
  - **Property 16: Environment variable validation**
  - **Validates: Requirements 7.1, 7.2**

- [x] 2. Implement Claude Worker (Synchronous)
- [x] 2.1 Create Claude worker class
  - Implement IWorker interface
  - Set up Anthropic SDK client initialization
  - Implement execute method with API call logic
  - Parse API response into Scene array
  - Validate scene structure (visual_prompt and voice_text fields)
  - Trigger callback immediately with results
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.2 Add error handling for Claude worker
  - Handle missing API key errors
  - Handle API call failures
  - Handle invalid response format
  - Trigger failed callbacks with error messages
  - _Requirements: 1.5, 2.6_

- [ ]* 2.3 Write property test for Claude input data flow
  - **Property 5: Input data flow to API**
  - **Validates: Requirements 2.2**

- [x] 2.4 Write property test for scene validation
  - **Property 6: Scene validation**
  - **Validates: Requirements 2.4**

- [ ]* 2.5 Write property test for Claude success callback
  - **Property 3: Success callback structure**
  - **Validates: Requirements 1.4, 2.5**

- [x] 3. Implement MiniMax Worker (Asynchronous)
- [x] 3.1 Create MiniMax worker class
  - Implement IWorker interface
  - Implement execute method with POST to https://api.minimax.io/v1/video/generate
  - Extract visual_prompt from input
  - Include callbackUrl in payload
  - Add API key to Authorization header
  - Mark node as running and return immediately
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.2 Add error handling for MiniMax worker
  - Handle missing API key or group ID
  - Handle network errors and timeouts
  - Handle API rejection responses
  - Trigger failed callbacks appropriately
  - _Requirements: 1.5_

- [ ]* 3.3 Write property test for async execution pattern
  - **Property 8: Async execution pattern**
  - **Validates: Requirements 3.5**

- [ ]* 3.4 Write property test for authentication headers
  - **Property 7: Authentication header inclusion**
  - **Validates: Requirements 3.4**

- [x] 4. Implement ElevenLabs Worker (Pseudo-Asynchronous)
- [x] 4.1 Create ElevenLabs worker class
  - Implement IWorker interface
  - Implement execute method with POST to ElevenLabs TTS API
  - Extract voice_text from input and voice_id from config
  - Receive audio data as ArrayBuffer
  - Upload ArrayBuffer to Supabase Storage
  - Retrieve public URL from Supabase
  - Trigger callback with audio URL in output
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 4.2 Add error handling for ElevenLabs worker
  - Handle API call failures
  - Handle storage upload failures
  - Handle URL retrieval failures
  - Trigger failed callbacks at each error point
  - _Requirements: 1.5, 4.8_

- [ ]* 4.3 Write property test for configuration usage
  - **Property 9: Configuration usage**
  - **Validates: Requirements 4.3**

- [x] 4.4 Write property test for storage upload and URL retrieval
  - **Property 10: Storage upload and URL retrieval**
  - **Validates: Requirements 4.5, 4.6, 4.7**

- [x] 5. Implement Shotstack Worker (Asynchronous - The Assembler)
- [x] 5.1 Create Shotstack worker class
  - Implement IWorker interface
  - Implement execute method to receive scene array from input
  - Build timeline structure with two tracks (video and audio)
  - Iterate through scenes to create clips
  - Calculate start time for each clip based on cumulative duration
  - Construct payload with timeline, output format, resolution, and callback URL
  - Send POST request to Shotstack API
  - Mark node as running and return immediately
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5.2 Add error handling for Shotstack worker
  - Handle missing or invalid scene array
  - Handle API call failures
  - Trigger failed callbacks appropriately
  - _Requirements: 1.5_

- [ ]* 5.3 Write property test for timeline structure
  - **Property 11: Timeline structure correctness**
  - **Validates: Requirements 5.2, 5.3**

- [x] 5.4 Write property test for clip timing calculation
  - **Property 12: Clip timing calculation**
  - **Validates: Requirements 5.4**

- [ ]* 5.5 Write property test for Shotstack payload completeness
  - **Property 13: Shotstack payload completeness**
  - **Validates: Requirements 5.5**

- [x] 6. Integrate workers with existing engine
- [x] 6.1 Update fireWorkerNode handler
  - Check for config.workerType field
  - If workerType is set, use Worker Registry to get worker instance
  - Call worker.execute() instead of sending webhook
  - Maintain backward compatibility with webhook-based workers
  - _Requirements: 1.1, 1.2_

- [x] 6.2 Register all workers in registry
  - Register Claude worker as "claude"
  - Register MiniMax worker as "minimax"
  - Register ElevenLabs worker as "elevenlabs"
  - Register Shotstack worker as "shotstack"
  - Export configured registry from workers module
  - _Requirements: 6.1_

- [ ]* 6.3 Write property test for worker interface consistency
  - **Property 1: Worker interface consistency**
  - **Validates: Requirements 1.1, 1.2**

- [ ] 7. Add comprehensive logging
- [ ] 7.1 Implement logging in all workers
  - Log execution start with runId, nodeId, and worker type
  - Log API calls with sanitized request details
  - Log API responses with status and metadata
  - Log errors with stack traces
  - Log completion with execution duration
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 7.2 Write property test for logging completeness
  - **Property 17: Logging completeness**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ]* 7.3 Write property test for sensitive data exclusion
  - **Property 18: Sensitive data exclusion from logs**
  - **Validates: Requirements 8.2**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Create integration tests for worker workflows
- [ ] 9.1 Create end-to-end worker test suite
  - Test Claude worker with mocked Anthropic API
  - Test MiniMax worker with mocked API and callback
  - Test ElevenLabs worker with mocked API and Supabase Storage
  - Test Shotstack worker with mocked API and callback
  - Test multi-worker workflow (Claude → Splitter → MiniMax/ElevenLabs → Collector → Shotstack)
  - _Requirements: All requirements_

- [ ]* 9.2 Write property test for error callback structure
  - **Property 4: Error callback structure**
  - **Validates: Requirements 1.5**

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
