# Requirements Document

## Introduction

This document specifies the requirements for implementing worker adapters that integrate external APIs (Claude, MiniMax, ElevenLabs, Shotstack) into the Stitch execution engine. These workers enable Stitch to orchestrate complex workflows by delegating specialized tasks to external services while maintaining the async worker pattern and edge-walking execution model.

## Glossary

- **Worker**: An adapter that executes a specific task by calling an external API and handling the response according to the Stitch Protocol
- **Stitch Protocol**: The standardized JSON contract for communication between Stitch and workers (outbound payload and inbound callback)
- **Worker Registry**: A centralized mapping system that associates node types with their corresponding worker implementations
- **Sync Worker**: A worker that completes execution immediately and returns results in the same request cycle
- **Async Worker**: A worker that initiates a long-running task, returns immediately, and receives results via callback webhook
- **Pseudo-Async Worker**: A worker that performs async operations internally but completes within a single request cycle before triggering downstream nodes
- **Scene**: A data structure containing visual_prompt and voice_text fields used in video generation workflows
- **Timeline**: A Shotstack data structure organizing video and audio clips with precise timing information
- **Callback URL**: The webhook endpoint where async workers send completion notifications

## Requirements

### Requirement 1

**User Story:** As a Stitch orchestrator, I want a standardized worker interface, so that all external service integrations follow consistent patterns.

#### Acceptance Criteria

1. WHEN a worker is instantiated THEN the Worker SHALL expose an execute method that accepts runId, nodeId, config, and input parameters
2. WHEN the execute method is called THEN the Worker SHALL return a Promise that resolves to void
3. WHEN a worker needs to communicate with Stitch THEN the Worker SHALL use the callback URL format specified in the Stitch Protocol
4. WHEN a worker completes successfully THEN the Worker SHALL send a callback with status "completed" and output data
5. WHEN a worker encounters an error THEN the Worker SHALL send a callback with status "failed" and error message

### Requirement 2

**User Story:** As a content generator, I want to use Claude to generate scene descriptions, so that I can create structured video content from text prompts.

#### Acceptance Criteria

1. WHEN the Claude worker executes THEN the Worker SHALL use the Anthropic SDK to call the Claude API
2. WHEN calling the Claude API THEN the Worker SHALL pass the user prompt from the input parameter
3. WHEN the Claude API responds THEN the Worker SHALL parse the response as JSON containing an array of scenes
4. WHEN parsing the response THEN the Worker SHALL validate that each scene contains visual_prompt and voice_text fields
5. WHEN the response is valid THEN the Worker SHALL immediately trigger the callback with the scenes array as output
6. WHEN the API call fails THEN the Worker SHALL trigger the callback with status "failed" and the error message

### Requirement 3

**User Story:** As a video generator, I want to use MiniMax to create video clips from text prompts, so that I can generate visual content asynchronously.

#### Acceptance Criteria

1. WHEN the MiniMax worker executes THEN the Worker SHALL send a POST request to https://api.minimax.io/v1/video/generate
2. WHEN constructing the request THEN the Worker SHALL include the visual_prompt from input in the payload
3. WHEN constructing the request THEN the Worker SHALL include the callbackUrl in the payload
4. WHEN constructing the request THEN the Worker SHALL include the API key in the Authorization header
5. WHEN the API accepts the request THEN the Worker SHALL mark the node as running and return immediately
6. WHEN MiniMax completes generation THEN the MiniMax service SHALL POST to the callback URL with the video URL in the output

### Requirement 4

**User Story:** As an audio generator, I want to use ElevenLabs to create voice narration, so that I can add audio to video scenes.

#### Acceptance Criteria

1. WHEN the ElevenLabs worker executes THEN the Worker SHALL send a POST request to the ElevenLabs text-to-speech API
2. WHEN constructing the request THEN the Worker SHALL include the voice_text from input in the payload
3. WHEN constructing the request THEN the Worker SHALL include the voice_id from config in the request URL
4. WHEN the API responds THEN the Worker SHALL receive the audio data as an ArrayBuffer
5. WHEN audio data is received THEN the Worker SHALL upload the ArrayBuffer to Supabase Storage
6. WHEN the upload completes THEN the Worker SHALL retrieve the public URL from Supabase
7. WHEN the public URL is obtained THEN the Worker SHALL trigger the callback with the audio URL in the output
8. WHEN any step fails THEN the Worker SHALL trigger the callback with status "failed" and the error message

### Requirement 5

**User Story:** As a video assembler, I want to use Shotstack to combine multiple video and audio clips, so that I can create a final composed video.

#### Acceptance Criteria

1. WHEN the Shotstack worker executes THEN the Worker SHALL receive an array of scenes from the Collector node
2. WHEN processing scenes THEN the Worker SHALL iterate through the array to build a timeline structure
3. WHEN building the timeline THEN the Worker SHALL create two tracks: one for video clips and one for audio clips
4. WHEN adding clips to tracks THEN the Worker SHALL calculate the start time for each clip based on cumulative duration
5. WHEN constructing the request THEN the Worker SHALL include the timeline, output format, and callback URL in the payload
6. WHEN the API accepts the request THEN the Worker SHALL mark the node as running and return immediately
7. WHEN Shotstack completes rendering THEN the Shotstack service SHALL POST to the callback URL with the final video URL in the output

### Requirement 6

**User Story:** As a Stitch engine, I want a worker registry, so that I can dynamically route node execution to the correct worker implementation.

#### Acceptance Criteria

1. WHEN the registry is initialized THEN the Registry SHALL create a mapping from node type strings to worker class constructors
2. WHEN a node needs to execute THEN the Registry SHALL provide a method to retrieve the worker for a given node type
3. WHEN a worker is requested for a registered type THEN the Registry SHALL return an instance of the corresponding worker class
4. WHEN a worker is requested for an unregistered type THEN the Registry SHALL throw an error indicating the type is not supported
5. WHEN new workers are added THEN the Registry SHALL allow registration of additional worker types without modifying existing code

### Requirement 7

**User Story:** As a developer, I want workers to handle API authentication securely, so that credentials are not exposed in code.

#### Acceptance Criteria

1. WHEN a worker needs API credentials THEN the Worker SHALL read them from environment variables
2. WHEN environment variables are missing THEN the Worker SHALL throw an error during initialization
3. WHEN making API calls THEN the Worker SHALL include authentication tokens in request headers
4. WHEN authentication fails THEN the Worker SHALL trigger the callback with status "failed" and an authentication error message

### Requirement 8

**User Story:** As a system administrator, I want workers to log their operations, so that I can debug issues and monitor execution.

#### Acceptance Criteria

1. WHEN a worker starts execution THEN the Worker SHALL log the runId, nodeId, and operation type
2. WHEN a worker makes an API call THEN the Worker SHALL log the request details excluding sensitive data
3. WHEN a worker receives a response THEN the Worker SHALL log the response status and relevant metadata
4. WHEN a worker encounters an error THEN the Worker SHALL log the error message and stack trace
5. WHEN a worker completes THEN the Worker SHALL log the completion status and execution duration
