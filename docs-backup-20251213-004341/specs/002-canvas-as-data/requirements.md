# Requirements Document

## Introduction

This feature transforms Stitch canvases from in-memory structures to a robust, versioned, database-backed system. The core insight is that a canvas is just JSON, and LLMs are excellent at generating and modifying JSON. This foundation enables AI management, CLI control, and proper workflow execution with historical tracking.

## Glossary

- **Canvas**: A visual workflow representation containing nodes and edges
- **Visual Graph**: The complete React Flow JSON structure including UI properties (positions, styles)
- **Execution Graph (OEG)**: An optimized, stripped version of the visual graph designed for runtime execution
- **Edge Mapping**: Configuration that defines how data flows from source node outputs to target node inputs
- **Flow Version**: An immutable snapshot of a canvas at a specific point in time
- **Worker**: An external service that performs work (Claude, Minimax, etc.)
- **Node**: A single unit of work in a workflow (worker, UX, splitter, collector)
- **Stitch System**: The workflow execution engine and canvas management system

## Requirements

### Requirement 1

**User Story:** As a developer, I want canvases stored in a normalized database schema with versioning, so that I can track changes over time and reference specific versions in workflow runs.

#### Acceptance Criteria

1. WHEN a canvas is saved THEN the Stitch System SHALL create a new row in stitch_flows table with metadata
2. WHEN a canvas version is created THEN the Stitch System SHALL store both visual_graph and execution_graph in stitch_flow_versions table
3. WHEN a workflow run is initiated THEN the Stitch System SHALL reference a specific flow_version_id in the stitch_runs table
4. WHEN querying old runs THEN the Stitch System SHALL retrieve the exact version of the canvas that was executed
5. WHEN a flow is updated THEN the Stitch System SHALL maintain the current_version_id pointer in stitch_flows table

### Requirement 2

**User Story:** As a developer, I want a clear TypeScript schema for visual graphs, so that I can validate canvas structure and ensure type safety.

#### Acceptance Criteria

1. WHEN defining a visual node THEN the Stitch System SHALL include id, type, position, and data properties
2. WHEN defining a visual edge THEN the Stitch System SHALL include id, source, target, and optional data mapping
3. WHEN an edge includes data mapping THEN the Stitch System SHALL define how target inputs map to source outputs
4. WHEN a worker node is defined THEN the Stitch System SHALL include worker_type, config, inputs, and outputs schemas
5. WHEN validating a visual graph THEN the Stitch System SHALL verify all nodes and edges conform to the TypeScript schema

### Requirement 3

**User Story:** As a developer, I want an optimized execution graph compiled from the visual graph, so that workflow execution is fast and efficient.

#### Acceptance Criteria

1. WHEN compiling a visual graph THEN the Stitch System SHALL create an adjacency map for O(1) edge lookup
2. WHEN compiling a visual graph THEN the Stitch System SHALL strip all UI properties (position, style, label)
3. WHEN compiling a visual graph THEN the Stitch System SHALL index nodes by ID for O(1) node lookup
4. WHEN compiling a visual graph THEN the Stitch System SHALL compute entry nodes (no incoming edges)
5. WHEN compiling a visual graph THEN the Stitch System SHALL compute terminal nodes (no outgoing edges)
6. WHEN compiling a visual graph THEN the Stitch System SHALL index edge data by "source->target" key for mapping lookup

### Requirement 4

**User Story:** As a developer, I want graph validation during compilation, so that errors are caught at save time rather than runtime.

#### Acceptance Criteria

1. WHEN a graph contains cycles THEN the Stitch System SHALL reject compilation with a cycle error
2. WHEN a required input has no connection THEN the Stitch System SHALL reject compilation with a missing_input error
3. WHEN a node references an invalid worker type THEN the Stitch System SHALL reject compilation with an invalid_worker error
4. WHEN compilation succeeds THEN the Stitch System SHALL return the execution graph
5. WHEN compilation fails THEN the Stitch System SHALL return a list of validation errors with node and field details

### Requirement 5

**User Story:** As a developer, I want automatic versioning on workflow runs, so that the executed version always matches what was displayed on screen.

#### Acceptance Criteria

1. WHEN a user clicks "Run" with unsaved changes THEN the Stitch System SHALL automatically create a new version before execution
2. WHEN a workflow run is created THEN the Stitch System SHALL link it to the specific flow_version_id
3. WHEN viewing a historical run THEN the Stitch System SHALL display the exact canvas version that was executed
4. WHEN a canvas is modified after a run THEN the Stitch System SHALL not affect the historical run's visualization
5. WHEN creating a version THEN the Stitch System SHALL update the current_version_id in stitch_flows table
6. WHEN running a new unsaved flow THEN the Stitch System SHALL create a parent stitch_flows record first

### Requirement 6

**User Story:** As a developer, I want bidirectional Mermaid conversion, so that LLMs can easily create and modify workflows using a natural format.

#### Acceptance Criteria

1. WHEN parsing Mermaid syntax THEN the Stitch System SHALL extract nodes and edges into a visual graph
2. WHEN parsing Mermaid node labels THEN the Stitch System SHALL infer worker types from label text
3. WHEN generating Mermaid from a canvas THEN the Stitch System SHALL produce valid Mermaid flowchart syntax
4. WHEN Mermaid lacks configuration details THEN the Stitch System SHALL apply default configs for inferred worker types
5. WHEN converting to Mermaid THEN the Stitch System SHALL preserve graph structure but may lose detailed configurations

### Requirement 7

**User Story:** As a developer, I want a hybrid Mermaid + JSON approach, so that I can use Mermaid for structure and JSON for detailed configuration.

#### Acceptance Criteria

1. WHEN creating a workflow with Mermaid only THEN the Stitch System SHALL infer worker types and apply defaults
2. WHEN creating a workflow with Mermaid and nodeConfigs THEN the Stitch System SHALL apply the provided configurations
3. WHEN creating a workflow with Mermaid and edgeMappings THEN the Stitch System SHALL apply the provided data flow mappings
4. WHEN creating a workflow with full JSON THEN the Stitch System SHALL use the complete visual graph as provided
5. WHEN auto-layouting from Mermaid THEN the Stitch System SHALL generate node positions automatically
6. WHEN importing from Mermaid THEN the Stitch System SHALL assign X/Y coordinates to nodes to prevent visual overlap

### Requirement 8

**User Story:** As a developer, I want a standard worker definition format, so that all workers have consistent input/output schemas.

#### Acceptance Criteria

1. WHEN defining a worker THEN the Stitch System SHALL include id, name, type (sync/async), input schema, and output schema
2. WHEN a worker input is defined THEN the Stitch System SHALL specify type, required flag, and description
3. WHEN a worker output is defined THEN the Stitch System SHALL specify type and description
4. WHEN a worker has configuration THEN the Stitch System SHALL include config object with endpoint, model, or other settings
5. WHEN validating edge mappings THEN the Stitch System SHALL verify source outputs match target inputs using worker definitions

### Requirement 9

**User Story:** As a developer, I want database migrations for the new schema, so that the system can store flows, versions, and runs properly.

#### Acceptance Criteria

1. WHEN applying migrations THEN the Stitch System SHALL create stitch_flows table with id, name, user_id, current_version_id
2. WHEN applying migrations THEN the Stitch System SHALL create stitch_flow_versions table with id, flow_id, visual_graph, execution_graph, commit_message
3. WHEN applying migrations THEN the Stitch System SHALL modify stitch_runs table to reference flow_version_id instead of storing graph data
4. WHEN applying migrations THEN the Stitch System SHALL add foreign key constraints between tables
5. WHEN applying migrations THEN the Stitch System SHALL add indexes on frequently queried columns

### Requirement 10

**User Story:** As a developer, I want a version manager module, so that I can create, retrieve, and manage flow versions programmatically.

#### Acceptance Criteria

1. WHEN creating a version THEN the Stitch System SHALL compile the visual graph to an execution graph
2. WHEN creating a version THEN the Stitch System SHALL validate the graph and reject invalid graphs
3. WHEN creating a version THEN the Stitch System SHALL insert both graphs into stitch_flow_versions
4. WHEN retrieving a version THEN the Stitch System SHALL return both visual and execution graphs
5. WHEN listing versions THEN the Stitch System SHALL return all versions for a flow ordered by creation date
