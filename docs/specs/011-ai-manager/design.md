# AI Manager Design Document

## Overview

The AI Manager feature enables programmatic control of Stitch workflows through a REST API and an LLM-powered service that interprets natural language requests. This system allows developers, CLI tools, and AI agents to create, modify, and execute workflows without manual canvas editing.

The design follows three core principles:

1. **Canvas as Data**: Workflows are JSON structures that LLMs naturally understand
2. **Simple REST API**: Universal access through standard HTTP endpoints
3. **AI-Powered Management**: Natural language translates to canvas operations

The system consists of three main components:

- **Canvas Management API**: REST endpoints for CRUD operations on canvases
- **AI Manager Service**: LLM-powered service that interprets natural language and executes canvas operations
- **Mermaid Integration**: Text-based workflow representation that LLMs can generate

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  (CLI Tools, Web UI, AI Agents, External Services)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Canvas Management API                     │
│  /api/canvas - CRUD operations                              │
│  /api/canvas/[id]/run - Workflow execution                  │
│  /api/canvas/[id]/status - Status monitoring                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │
        ┌────────────────┴────────────────┐
        │                                  │
┌───────▼──────────┐            ┌─────────▼────────────┐
│   AI Manager     │            │  Canvas Compiler     │
│   Service        │            │  (OEG)               │
│                  │            │                      │
│ - LLM Client     │            │ - Validation         │
│ - Prompt Builder │            │ - Optimization       │
│ - Action Executor│            │ - Stripping          │
└───────┬──────────┘            └─────────┬────────────┘
        │                                  │
        │                                  │
┌───────▼──────────────────────────────────▼────────────┐
│              Supabase Database                        │
│  - stitch_flows (canvas metadata)                     │
│  - stitch_flow_versions (version snapshots)           │
│  - stitch_runs (execution instances)                  │
│  - stitch_node_states (runtime state)                 │
└───────────────────────────────────────────────────────┘
```

### Data Flow

**Canvas Creation Flow:**
```
User Request → API Endpoint → Parse/Validate → Store in DB → Return Canvas ID
```

**AI Manager Flow:**
```
Natural Language → AI Manager → Build Context → LLM → Parse Response → Execute Action → Return Result
```

**Workflow Execution Flow:**
```
Run Request → Create Version → Compile to OEG → Start Execution → Update States → Return Status
```

## Components and Interfaces

### Canvas Management API

#### API Endpoints

**Canvas CRUD Operations:**

```typescript
// GET /api/canvas
// List all canvases
interface ListCanvasesResponse {
  canvases: Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    node_count: number;
    edge_count: number;
  }>;
}

// POST /api/canvas
// Create new canvas from JSON or Mermaid
interface CreateCanvasRequest {
  name: string;
  format: 'json' | 'mermaid';
  content: string | VisualGraph;
}

interface CreateCanvasResponse {
  id: string;
  canvas: VisualGraph;
}

// GET /api/canvas/[id]
// Get canvas by ID
interface GetCanvasResponse {
  id: string;
  name: string;
  canvas: VisualGraph;
  created_at: string;
  updated_at: string;
}

// PUT /api/canvas/[id]
// Update canvas
interface UpdateCanvasRequest {
  name?: string;
  canvas: VisualGraph;
}

interface UpdateCanvasResponse {
  id: string;
  canvas: VisualGraph;
  updated_at: string;
}

// DELETE /api/canvas/[id]
// Delete canvas
interface DeleteCanvasResponse {
  success: boolean;
  id: string;
}
```

**Workflow Execution Operations:**

```typescript
// POST /api/canvas/[id]/run
// Start workflow execution
interface RunWorkflowRequest {
  input: Record<string, any>;
  entityId?: string;  // Optional: entity to move through workflow
}

interface RunWorkflowResponse {
  runId: string;
  versionId: string;  // Auto-created version snapshot
  status: 'pending' | 'running';
  statusUrl: string;  // HATEOAS: URL to poll for status updates
}

// GET /api/canvas/[id]/status
// Get execution status (also available at /api/runs/[runId]/status)
interface GetStatusResponse {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  nodes: Record<string, {
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: any;
    error?: string;
  }>;
  finalOutputs?: Record<string, any>;  // Outputs from terminal nodes
  statusUrl: string;  // HATEOAS: URL to poll for continued status updates
}
```

### AI Manager Service

#### Core Interface

```typescript
interface AIManager {
  /**
   * Process a natural language request
   * @param request - Natural language description of desired action
   * @param canvasId - Optional canvas ID for modification requests
   * @returns AI Manager response with action and payload
   */
  processRequest(
    request: string,
    canvasId?: string
  ): Promise<AIManagerResponse>;
}

interface AIManagerResponse {
  action: 'CREATE_WORKFLOW' | 'MODIFY_WORKFLOW' | 'RUN_WORKFLOW' | 'GET_STATUS';
  payload: any;
  error?: string;
}
```

#### AI Manager Actions

```typescript
// CREATE_WORKFLOW action
interface CreateWorkflowPayload {
  name: string;
  canvas: VisualGraph;
  mermaid?: string;  // Optional Mermaid representation
}

// MODIFY_WORKFLOW action
interface ModifyWorkflowPayload {
  canvasId: string;
  canvas: VisualGraph;
  changes: string[];  // Description of changes made
}

// RUN_WORKFLOW action
interface RunWorkflowPayload {
  canvasId: string;
  runId: string;
  input: Record<string, any>;
}

// GET_STATUS action
interface GetStatusPayload {
  runId: string;
  status: string;
  nodes: Record<string, any>;
}
```

#### LLM Client Interface

```typescript
interface LLMClient {
  /**
   * Complete a prompt with the LLM
   * @param prompt - The prompt to send to the LLM
   * @returns LLM response text
   */
  complete(prompt: string): Promise<string>;
}

// Implementation for Anthropic Claude
class ClaudeLLMClient implements LLMClient {
  private apiKey: string;
  private model: string = 'claude-sonnet-4-20250514';
  
  async complete(prompt: string): Promise<string> {
    // Call Anthropic API
    // Return response text
  }
}
```

### Mermaid Integration

#### Parser Interface

```typescript
interface MermaidParser {
  /**
   * Parse Mermaid flowchart syntax to Visual Graph
   * @param mermaid - Mermaid flowchart string
   * @returns Visual Graph or error
   */
  parse(mermaid: string): ParseResult;
}

interface ParseResult {
  success: boolean;
  graph?: VisualGraph;
  errors?: string[];
}
```

#### Generator Interface

```typescript
interface MermaidGenerator {
  /**
   * Generate Mermaid flowchart from Visual Graph
   * @param graph - Visual Graph to convert
   * @returns Mermaid flowchart string
   */
  generate(graph: VisualGraph): string;
}
```

## Data Models

### Canvas Storage

```typescript
// stitch_flows table (existing)
interface StitchFlow {
  id: string;
  name: string;
  canvas_data: VisualGraph;  // Full visual graph with UI properties
  created_at: string;
  updated_at: string;
}

// stitch_flow_versions table (existing)
interface StitchFlowVersion {
  id: string;
  flow_id: string;
  version_number: number;
  canvas_data: VisualGraph;
  created_at: string;
  created_by_run_id?: string;  // Auto-created on run
}
```

### AI Manager Context

```typescript
// Context provided to LLM
interface AIManagerContext {
  workers: WorkerDefinition[];  // Available worker types
  currentCanvas?: ExecutionGraph;  // Stripped canvas (no UI properties)
  request: string;  // User's natural language request
}

// Stripped canvas for LLM context (reduces tokens)
interface StrippedCanvas {
  nodes: Array<{
    id: string;
    type: string;
    worker_type?: string;
    config?: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    mapping?: EdgeMapping;
  }>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Canvas CRUD operations preserve data integrity

*For any* canvas with nodes and edges, performing a create-read-update-delete cycle should maintain data integrity at each step: created canvases should be retrievable, updated canvases should reflect changes, and deleted canvases should not be retrievable.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Workflow execution creates version snapshots

*For any* canvas, when a workflow execution starts, the system should automatically create a version snapshot, and that version should contain an identical copy of the canvas at execution time.

**Validates: Requirements 2.3**

### Property 3: Workflow execution persists results

*For any* completed workflow execution, all node outputs and final status should be persisted to the database and retrievable via the status endpoint.

**Validates: Requirements 2.1, 2.2, 2.4, 2.5**

### Property 4: Mermaid round-trip preserves structure

*For any* valid Visual Graph, converting to Mermaid and parsing back should produce a graph with equivalent structure (same nodes, same edges, same connections).

**Validates: Requirements 3.1, 3.4**

### Property 5: Mermaid parser extracts node types correctly

*For any* Mermaid flowchart with node type annotations, parsing should extract the correct node type for each node based on labels or syntax.

**Validates: Requirements 3.2**

### Property 6: Mermaid parser creates all edges

*For any* Mermaid flowchart with edge definitions, parsing should create corresponding edges in the Visual Graph for all edge connections.

**Validates: Requirements 3.3**

### Property 7: Invalid Mermaid produces descriptive errors

*For any* invalid Mermaid syntax, the parser should return error messages that describe the specific syntax issue encountered.

**Validates: Requirements 3.5**

### Property 8: AI-generated workflows are valid

*For any* natural language workflow description, the AI Manager should generate a canvas that passes validation (no cycles, no disconnected nodes, valid worker types).

**Validates: Requirements 4.1**

### Property 9: AI Manager includes splitter/collector pairs

*For any* natural language request for parallel workflows, the AI Manager should generate canvases with matching Splitter and Collector nodes where the collector's expected_count equals the splitter's split_count.

**Validates: Requirements 4.3**

### Property 10: AI-generated worker nodes have entity movement

*For any* worker node generated by the AI Manager, the node should include entity movement configuration with onSuccess and onFailure behaviors.

**Validates: Requirements 4.4, 10.1, 10.2, 10.3**

### Property 11: AI-generated canvases have required properties

*For any* canvas generated by the AI Manager, all nodes should have required properties (id, type, data with label), and all edges should reference existing nodes.

**Validates: Requirements 4.5**

### Property 12: AI modifications preserve unchanged node IDs

*For any* workflow modification request, nodes that are not modified should retain their original IDs in the updated canvas.

**Validates: Requirements 5.2**

### Property 13: AI modifications generate unique node IDs

*For any* workflow modification that adds nodes, all new node IDs should be unique and not conflict with existing node IDs.

**Validates: Requirements 5.3**

### Property 14: Node removal removes associated edges

*For any* workflow modification that removes nodes, all edges that reference the removed nodes (as source or target) should also be removed.

**Validates: Requirements 5.4**

### Property 15: AI modifications validate resulting graph

*For any* workflow modification, the resulting canvas should pass validation checks for cycles and disconnected nodes.

**Validates: Requirements 5.5**

### Property 16: LLM context strips UI properties

*For any* canvas provided to the LLM as context, UI-only properties (position, style, width, height, parentNode, extent) should be removed to reduce token usage.

**Validates: Requirements 5.6**

### Property 17: AI modifications validate edge integrity

*For any* workflow modification, all edges in the resulting canvas should reference nodes that exist in the canvas.

**Validates: Requirements 5.7**

### Property 18: Workflow execution returns run ID

*For any* workflow execution request via AI Manager, the response should include a valid run identifier that can be used for status tracking.

**Validates: Requirements 6.1**

### Property 19: Status includes all node states

*For any* workflow status request, the response should include the current state for every node in the workflow.

**Validates: Requirements 6.2**

### Property 20: Status includes completed node outputs

*For any* workflow status request where nodes have completed, the response should include the output data for those completed nodes.

**Validates: Requirements 6.3**

### Property 21: Failed workflows report error details

*For any* failed workflow execution, the AI Manager should receive error details that include the failed node ID and error message.

**Validates: Requirements 6.4**

### Property 22: Completed workflows return terminal outputs

*For any* completed workflow execution, the AI Manager should receive the final outputs from all terminal nodes.

**Validates: Requirements 6.5**

### Property 23: AI-generated workers have correct types

*For any* worker node generated by the AI Manager, the worker_type field should be set to a valid worker type from the worker registry.

**Validates: Requirements 7.3**

### Property 24: AI-generated workers have required config

*For any* worker node generated by the AI Manager, the node should include all required configuration fields for that worker type.

**Validates: Requirements 7.4**

### Property 25: AI Manager responses are valid JSON

*For any* AI Manager request, the response should be valid, parseable JSON with an action field and payload field.

**Validates: Requirements 8.1, 8.5**

### Property 26: Create workflow responses include canvas

*For any* CREATE_WORKFLOW action, the response payload should include the complete canvas structure with all nodes and edges.

**Validates: Requirements 8.2**

### Property 27: Execute workflow responses include run ID

*For any* RUN_WORKFLOW action, the response payload should include the run identifier.

**Validates: Requirements 8.3**

### Property 28: Error responses include error field

*For any* AI Manager request that encounters an error, the response should include an error field with a descriptive message.

**Validates: Requirements 8.4**

### Property 29: Entity movement validates target nodes

*For any* entity movement configuration with a targetSectionId, the target node should exist in the canvas.

**Validates: Requirements 10.4**

### Property 30: Entity type conversion includes completeAs

*For any* entity movement configuration that converts entity types, the configuration should include the completeAs field with a valid entity type value.

**Validates: Requirements 10.5**

## Error Handling

### API Error Responses

All API endpoints follow a consistent error response format:

```typescript
interface ErrorResponse {
  error: string;
  details?: string[];
  code: string;
}
```

**Error Codes:**

- `400 BAD_REQUEST`: Invalid input (malformed JSON, invalid Mermaid, validation failures)
- `404 NOT_FOUND`: Canvas or run not found
- `500 INTERNAL_ERROR`: Database errors, unexpected failures

### Validation Errors

```typescript
interface ValidationError {
  type: 'cycle' | 'disconnected' | 'invalid_worker' | 'invalid_mapping' | 'missing_input';
  message: string;
  nodeId?: string;
  edgeId?: string;
}
```

### AI Manager Error Handling

The AI Manager handles errors at multiple levels:

1. **LLM Errors**: Retry with exponential backoff, fallback to simpler prompts
2. **Parsing Errors**: Return structured error with details about what failed
3. **Validation Errors**: Include validation errors in response for user correction
4. **Execution Errors**: Capture and return error state with failed node information

## Testing Strategy

### Unit Testing

Unit tests verify specific functionality of individual components:

- **API Endpoints**: Test each endpoint with valid and invalid inputs
- **Mermaid Parser**: Test parsing of various Mermaid syntaxes
- **Mermaid Generator**: Test generation from various graph structures
- **AI Manager**: Test action execution with mocked LLM responses
- **Context Builder**: Test stripping of UI properties
- **Validation**: Test cycle detection, disconnected nodes, invalid workers

### Property-Based Testing

Property-based tests verify universal properties across all inputs using fast-check library. Each test runs a minimum of 100 iterations with randomly generated inputs.

**Property Test Configuration:**

```typescript
import fc from 'fast-check';

// Configure all property tests to run 100+ iterations
const propertyTestConfig = { numRuns: 100 };
```

**Key Property Tests:**

1. **Canvas CRUD Integrity** (Property 1)
   - Generate random canvases
   - Perform CRUD operations
   - Verify data integrity at each step

2. **Mermaid Round-Trip** (Property 4)
   - Generate random Visual Graphs
   - Convert to Mermaid and back
   - Verify structural equivalence

3. **AI Workflow Validation** (Property 8)
   - Generate random workflow descriptions
   - Create workflows via AI Manager
   - Verify all pass validation

4. **Node ID Preservation** (Property 12)
   - Generate random canvases
   - Request random modifications
   - Verify unchanged nodes keep IDs

5. **Edge Integrity** (Property 17)
   - Generate random modifications
   - Apply to canvases
   - Verify all edges reference existing nodes

6. **UI Property Stripping** (Property 16)
   - Generate random canvases with UI properties
   - Build LLM context
   - Verify no UI properties in context

### Integration Testing

Integration tests verify end-to-end workflows:

- **Canvas Creation to Execution**: Create canvas via API, run workflow, verify completion
- **AI Manager to Execution**: Create workflow via natural language, execute, verify results
- **Mermaid to Execution**: Create canvas from Mermaid, run workflow, verify completion
- **Version Snapshots**: Start multiple runs, verify each has unique version snapshot

### Test Data Generators

Property-based tests use custom generators for domain objects:

```typescript
// Generate random Visual Graphs
const visualGraphArbitrary = fc.record({
  nodes: fc.array(visualNodeArbitrary, { minLength: 1, maxLength: 10 }),
  edges: fc.array(visualEdgeArbitrary)
});

// Generate random worker types
const workerTypeArbitrary = fc.constantFrom(
  'claude', 'minimax', 'elevenlabs', 'shotstack'
);

// Generate random Mermaid flowcharts
const mermaidArbitrary = fc.string().map(generateValidMermaid);
```

## Implementation Notes

### AI Manager Prompt Template

The AI Manager uses a structured prompt template that includes:

1. **System Role**: Define the AI as a Stitch workflow manager
2. **Available Workers**: List all worker definitions with schemas
3. **Current Context**: Include current canvas state (if modifying)
4. **Entity Movement Rules**: Explain how entities move through workflows
5. **Output Format**: Specify JSON response structure
6. **Examples**: Provide example requests and responses

**Prompt Structure:**

```markdown
# Stitch AI Manager

You are an AI that manages Stitch canvases. You can create, modify, and execute workflows.

## Available Workers

{worker_definitions_json}

## Current Canvas State

{stripped_canvas_json}

## Entity Movement Rules

Entities move through the canvas when workflows complete. Configure entityMovement on worker nodes:

```json
{
  "entityMovement": {
    "onSuccess": { "targetSectionId": "next-section", "completeAs": "success" },
    "onFailure": { "targetSectionId": "error-section", "completeAs": "failure" }
  }
}
```

## Commands

- CREATE_WORKFLOW: Generate a new workflow
- MODIFY_WORKFLOW: Update an existing workflow
- RUN_WORKFLOW: Execute a workflow
- GET_STATUS: Check execution status

## Output Format

Respond with valid JSON:
{
  "action": "CREATE_WORKFLOW" | "MODIFY_WORKFLOW" | "RUN_WORKFLOW" | "GET_STATUS",
  "payload": { ... }
}

## User Request

{user_request}
```

### Context Optimization

To reduce LLM token usage, the system strips UI properties when building context:

```typescript
function stripUIProperties(canvas: VisualGraph): StrippedCanvas {
  return {
    nodes: canvas.nodes.map(node => ({
      id: node.id,
      type: node.type,
      worker_type: node.data.worker_type,
      config: node.data.config
    })),
    edges: canvas.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      mapping: edge.data?.mapping
    }))
  };
}
```

### Automatic Versioning

When a workflow execution starts, the system automatically creates a version snapshot:

```typescript
async function startWorkflowExecution(canvasId: string, input: any): Promise<string> {
  // 1. Load current canvas
  const canvas = await getCanvas(canvasId);
  
  // 2. Create version snapshot
  const version = await createVersion(canvasId, canvas);
  
  // 3. Compile to execution graph
  const oeg = compileToOEG(canvas);
  
  // 4. Create run record
  const runId = await createRun(canvasId, version.id, input);
  
  // 5. Start execution
  await startExecution(runId, oeg, input);
  
  return runId;
}
```

### Worker Selection Logic

The AI Manager selects workers based on task keywords:

- **Text generation**: claude
- **Video generation**: minimax
- **Voice/audio generation**: elevenlabs
- **Video assembly/editing**: shotstack

This logic is embedded in the prompt template with examples.

### Validation Pipeline

All canvases go through validation before storage or execution:

```typescript
function validateCanvas(canvas: VisualGraph): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for cycles
  errors.push(...detectCycles(canvas));
  
  // Check for disconnected nodes
  errors.push(...detectDisconnectedNodes(canvas));
  
  // Check for invalid worker types
  errors.push(...validateWorkerTypes(canvas));
  
  // Check for invalid edge mappings
  errors.push(...validateEdgeMappings(canvas));
  
  // Check entity movement targets
  errors.push(...validateEntityMovement(canvas));
  
  return errors;
}
```

## Security Considerations

### API Authentication

All API endpoints require authentication:

```typescript
// Middleware for API routes
async function requireAuth(req: Request): Promise<User> {
  const token = req.headers.get('Authorization');
  if (!token) {
    throw new Error('Unauthorized');
  }
  return verifyToken(token);
}
```

### Input Validation

All user inputs are validated before processing:

- JSON payloads validated against schemas
- Mermaid syntax validated before parsing
- Canvas structures validated before storage
- Worker configurations validated against schemas

### Rate Limiting

API endpoints implement rate limiting to prevent abuse:

```typescript
const rateLimiter = new RateLimiter({
  windowMs: 60000,  // 1 minute
  maxRequests: 100   // 100 requests per minute
});
```

### LLM Safety

AI Manager responses are validated before execution:

- Parse JSON responses with error handling
- Validate action types against allowed values
- Validate generated canvases before storage
- Sanitize user inputs in prompts

## Performance Considerations

### Database Queries

- Use indexes on frequently queried fields (canvas ID, run ID)
- Batch operations where possible
- Use connection pooling for database access

### LLM Calls

- Cache common worker definitions
- Strip UI properties to reduce token usage
- Implement timeout and retry logic
- Use streaming responses for large outputs

### Canvas Compilation

- Cache compiled execution graphs
- Invalidate cache on canvas updates
- Use efficient data structures (adjacency maps)

## Deployment

### Environment Variables

```bash
# Existing Stitch variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=

# AI Manager specific
ANTHROPIC_API_KEY=  # For Claude LLM client
AI_MANAGER_MODEL=claude-sonnet-4-20250514
AI_MANAGER_MAX_TOKENS=4096
```

### API Deployment

The Canvas Management API is deployed as Next.js API routes:

- `/api/canvas/*` - Canvas CRUD operations
- `/api/ai-manager` - AI Manager endpoint

### Database Migrations

No new tables required - uses existing stitch_flows and stitch_flow_versions tables.

## Future Enhancements

### CLI Tool

A command-line interface for managing canvases:

```bash
stitch list
stitch create <name> --from <file>
stitch run <id> --input <json>
stitch ai "create a video generation workflow"
```

### MCP Server

Model Context Protocol server for Kiro integration:

```typescript
const tools = [
  {
    name: 'stitch_create_workflow',
    description: 'Create a Stitch workflow',
    handler: async (params) => { /* ... */ }
  }
];
```

### Workflow Templates

Pre-built workflow templates for common use cases:

- Video generation pipeline
- Content creation workflow
- Data processing pipeline
- Customer journey automation

### Visual Execution Monitoring

Real-time visualization of workflow execution:

- Node status animations
- Edge data flow visualization
- Entity movement tracking
- Performance metrics
