# Requirements Document

## Introduction

The AI Manager feature transforms Stitch from a visual workflow tool into an AI-managed living system where an AI can build, modify, and control workflows through natural language. This feature enables LLMs (like Claude, GPT) and CLI tools to programmatically manage Stitch canvases by providing a REST API and an AI Manager service that translates natural language requests into canvas operations.

## Glossary

- **Canvas**: A JSON representation of a workflow containing nodes and edges
- **AI Manager**: An LLM-powered service that interprets natural language requests and executes canvas operations
- **Worker**: An asynchronous service that performs specific tasks (e.g., Claude, Minimax, ElevenLabs)
- **Node**: A single unit of work in a workflow (e.g., UX input, Worker task, Splitter, Collector)
- **Edge**: A connection between nodes that defines data flow
- **Execution Graph (OEG)**: The optimized, validated graph used for workflow execution
- **Visual Graph**: The user-facing representation of a workflow with positioning and styling
- **Mermaid**: A text-based diagram format that LLMs can naturally generate
- **Run**: An instance of workflow execution with specific input data
- **Entity Movement**: Configuration that determines how entities move through the canvas when workflows complete

## Requirements

### Requirement 1

**User Story:** As a developer, I want a REST API to manage canvases programmatically, so that I can integrate Stitch with other tools and services.

#### Acceptance Criteria

1. WHEN a client sends a GET request to /api/canvas THEN the System SHALL return a list of all canvases with their metadata
2. WHEN a client sends a POST request to /api/canvas with valid JSON or Mermaid content THEN the System SHALL create a new canvas and return its identifier
3. WHEN a client sends a GET request to /api/canvas/[id] THEN the System SHALL return the complete canvas data including nodes and edges
4. WHEN a client sends a PUT request to /api/canvas/[id] with valid canvas data THEN the System SHALL update the canvas and return the updated version
5. WHEN a client sends a DELETE request to /api/canvas/[id] THEN the System SHALL remove the canvas and return a success confirmation

### Requirement 2

**User Story:** As a developer, I want to execute workflows via API, so that I can trigger canvas runs programmatically.

#### Acceptance Criteria

1. WHEN a client sends a POST request to /api/canvas/[id]/run with input data THEN the System SHALL start workflow execution and return a run identifier
2. WHEN a client sends a GET request to /api/canvas/[id]/status THEN the System SHALL return the current execution status including node states and outputs
3. WHEN a workflow execution starts THEN the System SHALL automatically create a version snapshot of the canvas
4. WHEN a workflow execution completes THEN the System SHALL persist all node outputs and final status to the database
5. WHEN a workflow execution fails THEN the System SHALL record the error state and allow retry of failed nodes

### Requirement 3

**User Story:** As a user, I want to create workflows using Mermaid syntax, so that I can quickly sketch workflow structures in a human-readable format.

#### Acceptance Criteria

1. WHEN the System receives Mermaid content with flowchart syntax THEN the System SHALL parse it into a valid Visual Graph
2. WHEN the System parses Mermaid content THEN the System SHALL extract node types from node labels or syntax
3. WHEN the System parses Mermaid edges THEN the System SHALL create corresponding edge connections in the Visual Graph
4. WHEN the System exports a canvas THEN the System SHALL generate valid Mermaid syntax that represents the workflow structure
5. WHEN Mermaid parsing encounters invalid syntax THEN the System SHALL return descriptive error messages indicating the issue

### Requirement 4

**User Story:** As an AI agent, I want to create workflows from natural language descriptions, so that I can build Stitch workflows without manual canvas editing.

#### Acceptance Criteria

1. WHEN the AI Manager receives a natural language request to create a workflow THEN the System SHALL generate a valid canvas with appropriate nodes and edges
2. WHEN the AI Manager generates a workflow THEN the System SHALL select appropriate worker types based on the task description
3. WHEN the AI Manager creates parallel workflows THEN the System SHALL include Splitter and Collector nodes with correct configuration
4. WHEN the AI Manager creates a workflow THEN the System SHALL configure entity movement rules for worker nodes
5. WHEN the AI Manager generates a workflow THEN the System SHALL return the canvas in JSON format with all required node properties

### Requirement 5

**User Story:** As an AI agent, I want to modify existing workflows, so that I can update canvases based on user feedback or requirements changes.

#### Acceptance Criteria

1. WHEN the AI Manager receives a request to modify a workflow THEN the System SHALL load the current canvas state
2. WHEN the AI Manager modifies a workflow THEN the System SHALL preserve existing node identifiers where possible
3. WHEN the AI Manager adds nodes to a workflow THEN the System SHALL generate unique node identifiers
4. WHEN the AI Manager removes nodes from a workflow THEN the System SHALL also remove associated edges
5. WHEN the AI Manager modifies a workflow THEN the System SHALL validate the resulting graph for cycles and disconnected nodes
6. WHEN providing context to the LLM THEN the System SHALL strip UI-only properties to reduce token usage
7. WHEN applying AI modifications THEN the System SHALL validate referential integrity of all edges

### Requirement 6

**User Story:** As an AI agent, I want to execute workflows and monitor their status, so that I can verify that workflows complete successfully.

#### Acceptance Criteria

1. WHEN the AI Manager starts a workflow execution THEN the System SHALL return a run identifier for status tracking
2. WHEN the AI Manager checks workflow status THEN the System SHALL return the current state of all nodes
3. WHEN the AI Manager checks workflow status THEN the System SHALL include node outputs for completed nodes
4. WHEN a workflow execution fails THEN the AI Manager SHALL receive error details including the failed node and error message
5. WHEN a workflow execution completes THEN the AI Manager SHALL receive the final outputs from terminal nodes

### Requirement 7

**User Story:** As a developer, I want the AI Manager to understand available workers, so that it can select appropriate workers for tasks.

#### Acceptance Criteria

1. WHEN the AI Manager initializes THEN the System SHALL load all available worker definitions with their input and output schemas
2. WHEN the AI Manager receives a task description THEN the System SHALL match the task to appropriate worker types
3. WHEN the AI Manager selects a worker THEN the System SHALL include the worker type in the node configuration
4. WHEN the AI Manager configures a worker node THEN the System SHALL validate that required configuration fields are present
5. WHEN the AI Manager uses an unknown worker type THEN the System SHALL return an error indicating available worker types

### Requirement 8

**User Story:** As a developer, I want the AI Manager to respond in structured JSON format, so that I can programmatically process its responses.

#### Acceptance Criteria

1. WHEN the AI Manager processes a request THEN the System SHALL return a JSON response with an action type and payload
2. WHEN the AI Manager creates a workflow THEN the response SHALL include the complete canvas structure
3. WHEN the AI Manager executes a workflow THEN the response SHALL include the run identifier
4. WHEN the AI Manager encounters an error THEN the response SHALL include an error field with a descriptive message
5. WHEN the AI Manager returns a response THEN the JSON SHALL be valid and parseable

### Requirement 9

**User Story:** As a developer, I want comprehensive error handling in the Canvas API, so that I can understand and fix issues when operations fail.

#### Acceptance Criteria

1. WHEN an API request contains invalid JSON THEN the System SHALL return a 400 status code with a descriptive error message
2. WHEN an API request references a non-existent canvas THEN the System SHALL return a 404 status code
3. WHEN an API request fails due to database errors THEN the System SHALL return a 500 status code and log the error
4. WHEN Mermaid parsing fails THEN the System SHALL return a 400 status code with the parsing error details
5. WHEN workflow validation fails THEN the System SHALL return a 400 status code with validation error details

### Requirement 10

**User Story:** As an AI agent, I want to understand entity movement rules, so that I can configure workflows that properly move entities through the business model canvas.

#### Acceptance Criteria

1. WHEN the AI Manager creates a worker node THEN the System SHALL include entity movement configuration
2. WHEN the AI Manager configures entity movement THEN the System SHALL specify onSuccess behavior
3. WHEN the AI Manager configures entity movement THEN the System SHALL specify onFailure behavior
4. WHEN the AI Manager configures entity movement with a specific target THEN the System SHALL validate that the target node exists
5. WHEN the AI Manager configures entity type conversion THEN the System SHALL include the completeAs field with the target entity type
