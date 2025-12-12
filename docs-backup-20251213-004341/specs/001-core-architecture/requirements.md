# Requirements Document

## Introduction

This document defines the requirements for Stitch's Core Architecture - a visual orchestration engine that executes React Flow canvases as workflows. Stitch acts as a manager that routes data and coordinates execution across external workers (Claude, n8n, edge functions, etc.). The system must be stateless, database-driven, and capable of handling parallel execution patterns with human-in-the-loop gates.

## Glossary

- **Stitch**: The orchestration engine that manages workflow execution
- **Flow**: A visual graph definition stored in the database, consisting of nodes and edges
- **Run**: An execution instance of a Flow with its own state and data
- **Node**: A single unit of work in a Flow (UX gate, Worker, Splitter, Collector)
- **Edge**: A directed connection between nodes that defines execution flow
- **Worker**: An external service that performs actual work and communicates via webhooks
- **Splitter**: A node type that fans out array elements into parallel execution paths
- **Collector**: A node type that fans in parallel execution paths and merges outputs
- **UX Node**: A gate node that pauses execution until human input is provided
- **Worker Node**: A node that delegates work to external services via webhooks
- **Node State**: The execution status and output data for a specific node in a run
- **Callback URL**: The webhook endpoint workers use to report completion
- **Supabase**: The PostgreSQL database service used as the single source of truth
- **Edge-Walking**: The execution pattern of completing a node, then traversing edges to fire downstream nodes

## Requirements

### Requirement 1: Database Schema for Flows

**User Story:** As a system architect, I want to store flow definitions in a structured database table, so that flows can be versioned, queried, and executed reliably.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Supabase database SHALL contain a `stitch_flows` table
2. THE `stitch_flows` table SHALL include a `graph` column of type JSONB that stores nodes and edges
3. THE `graph` JSONB column SHALL contain a `nodes` array where each node has `id`, `type`, `position`, and `data` properties
4. THE `graph` JSONB column SHALL contain an `edges` array where each edge has `id`, `source`, `target`, and optional `sourceHandle` and `targetHandle` properties
5. THE `stitch_flows` table SHALL include standard metadata columns: `id` (UUID primary key), `name` (text), `created_at` (timestamp), and `updated_at` (timestamp)

### Requirement 2: Database Schema for Runs

**User Story:** As a system architect, I want to store run execution state in a database table, so that the system remains stateless and can recover from restarts.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Supabase database SHALL contain a `stitch_runs` table
2. THE `stitch_runs` table SHALL include a `flow_id` column (UUID foreign key) that references `stitch_flows.id`
3. THE `stitch_runs` table SHALL include a `node_states` column of type JSONB that maps nodeId to execution state
4. THE `node_states` JSONB SHALL map each nodeId to an object containing `status` (enum: 'pending', 'running', 'completed', 'failed', 'waiting_for_user') and `output` (any JSON value)
5. THE `stitch_runs` table SHALL include standard metadata columns: `id` (UUID primary key), `created_at` (timestamp), and `updated_at` (timestamp)
6. WHEN a run is created THEN the system SHALL initialize `node_states` with all nodes in 'pending' status

### Requirement 3: TypeScript Type Definitions

**User Story:** As a developer, I want strongly-typed TypeScript interfaces for all core data structures, so that the codebase is type-safe and maintainable.

#### Acceptance Criteria

1. THE system SHALL define a `StitchNode` interface with properties: `id` (string), `type` (enum: 'UX', 'Worker', 'Splitter', 'Collector'), `position` (object with x and y), and `data` (object)
2. THE system SHALL define a `StitchEdge` interface with properties: `id` (string), `source` (string), `target` (string), `sourceHandle` (optional string), and `targetHandle` (optional string)
3. THE system SHALL define a `StitchFlow` interface that matches the `stitch_flows` table structure including `id`, `name`, `graph` (containing nodes and edges), `created_at`, and `updated_at`
4. THE system SHALL define a `NodeState` interface with properties: `status` (enum: 'pending', 'running', 'completed', 'failed', 'waiting_for_user'), `output` (any), and optional `error` (string)
5. THE system SHALL define a `StitchRun` interface that matches the `stitch_runs` table structure including `id`, `flow_id`, `node_states` (Record mapping nodeId to NodeState), `created_at`, and `updated_at`
6. THE system SHALL define a `NodeConfig` type that represents the configuration data stored in `StitchNode.data`

### Requirement 4: Worker Protocol - Outbound Payload

**User Story:** As a worker service developer, I want to receive a standardized JSON payload from Stitch, so that I can process work and know where to send results.

#### Acceptance Criteria

1. WHEN Stitch fires a Worker node THEN the system SHALL send an HTTP POST request to the worker's configured webhook URL
2. THE outbound payload SHALL be a JSON object containing `runId` (string UUID), `nodeId` (string), `config` (object from node.data), `input` (object from upstream node output), and `callbackUrl` (string)
3. THE `callbackUrl` property SHALL be constructed using the pattern: `${process.env.NEXT_PUBLIC_BASE_URL}/api/stitch/callback/${runId}/${nodeId}`
4. THE system SHALL NOT hardcode domains in callback URLs
5. WHEN the worker webhook URL is invalid or unreachable THEN the system SHALL mark the node state as 'failed' with an appropriate error message

### Requirement 5: Worker Protocol - Inbound Callback

**User Story:** As a worker service, I want to report completion status back to Stitch via a callback endpoint, so that execution can continue.

#### Acceptance Criteria

1. THE system SHALL expose an API endpoint at `/api/stitch/callback/:runId/:nodeId` that accepts POST requests
2. THE callback endpoint SHALL accept a JSON payload containing `status` (enum: 'completed', 'failed'), `output` (any JSON value), and optional `error` (string)
3. WHEN a callback is received with status 'completed' THEN the system SHALL update the node state to 'completed' and store the output
4. WHEN a callback is received with status 'failed' THEN the system SHALL update the node state to 'failed' and store the error message
5. WHEN a node state is updated to 'completed' THEN the system SHALL trigger edge-walking to fire downstream nodes
6. THE callback endpoint SHALL validate that the runId and nodeId exist before processing
7. THE callback endpoint SHALL return HTTP 404 if the run or node does not exist
8. THE callback endpoint SHALL return HTTP 200 on successful processing

### Requirement 6: Splitter Node Execution

**User Story:** As a flow designer, I want to use Splitter nodes to process array elements in parallel, so that I can handle batch operations efficiently.

#### Acceptance Criteria

1. WHEN a Splitter node receives an input containing an array THEN the system SHALL create parallel execution paths for each array element
2. THE system SHALL extract the array from the input using a configured property path in the Splitter node's config
3. WHEN a Splitter node has 3 downstream edges and receives an array `[A, B, C]` THEN the system SHALL fire the downstream node 3 times with inputs `A`, `B`, and `C` respectively
4. THE system SHALL track each parallel execution path by augmenting the nodeId with an index suffix (e.g., `nodeId_0`, `nodeId_1`, `nodeId_2`)
5. THE system SHALL store each parallel path's state independently in the `node_states` JSONB column
6. WHEN a Splitter node receives an empty array THEN the system SHALL mark the Splitter as 'completed' and fire downstream Collector nodes with an empty array

### Requirement 7: Collector Node Execution

**User Story:** As a flow designer, I want to use Collector nodes to merge parallel execution paths, so that I can aggregate results from batch operations.

#### Acceptance Criteria

1. WHEN a Collector node is reached THEN the system SHALL identify all upstream parallel execution paths
2. THE system SHALL wait until ALL upstream parallel paths have status 'completed' before marking the Collector as 'running'
3. WHEN all upstream paths are completed THEN the system SHALL merge their outputs into an array
4. THE merged output array SHALL preserve the order corresponding to the original Splitter's input array indices
5. WHEN the Collector completes merging THEN the system SHALL mark its state as 'completed' with the merged array as output
6. WHEN any upstream parallel path has status 'failed' THEN the Collector SHALL mark itself as 'failed' and SHALL NOT fire downstream nodes

### Requirement 8: UX Node (Human Gate) Execution

**User Story:** As a flow designer, I want to pause execution at specific points for human input, so that I can build human-in-the-loop workflows.

#### Acceptance Criteria

1. WHEN a UX node is fired THEN the system SHALL mark its state as 'waiting_for_user'
2. WHILE a UX node has status 'waiting_for_user' THEN the system SHALL NOT fire downstream nodes
3. THE system SHALL expose an API endpoint at `/api/stitch/complete/:runId/:nodeId` that accepts POST requests with user input
4. WHEN the complete endpoint receives valid input THEN the system SHALL update the UX node state to 'completed' with the provided input as output
5. WHEN a UX node state changes to 'completed' THEN the system SHALL trigger edge-walking to fire downstream nodes

### Requirement 9: Edge-Walking Execution Model

**User Story:** As a system architect, I want execution to flow by walking edges after each node completion, so that the system is event-driven and stateless.

#### Acceptance Criteria

1. WHEN a node state changes to 'completed' THEN the system SHALL read all edges from the flow graph where the completed node is the source
2. THE system SHALL identify all target nodes from the outbound edges
3. WHEN a target node is identified THEN the system SHALL check if all of its upstream dependencies are completed
4. WHEN all upstream dependencies of a target node are completed THEN the system SHALL fire that target node
5. WHEN firing a node THEN the system SHALL construct the input by merging outputs from all upstream nodes
6. THE system SHALL mark the node state as 'running' before firing the node
7. WHEN a node has no outbound edges THEN the system SHALL consider it a terminal node and SHALL NOT attempt further edge-walking

### Requirement 10: Manual Retry for Failed Nodes

**User Story:** As a flow operator, I want to manually retry failed nodes, so that I can recover from transient errors without restarting the entire run.

#### Acceptance Criteria

1. THE system SHALL expose an API endpoint at `/api/stitch/retry/:runId/:nodeId` that accepts POST requests
2. WHEN the retry endpoint is called for a node with status 'failed' THEN the system SHALL reset the node state to 'pending'
3. WHEN a node state is reset to 'pending' THEN the system SHALL re-evaluate if the node can be fired based on upstream dependencies
4. WHEN upstream dependencies are satisfied THEN the system SHALL fire the node again
5. THE retry endpoint SHALL return HTTP 400 if the node status is not 'failed'

### Requirement 11: Database as Single Source of Truth

**User Story:** As a system architect, I want all state to be persisted in the database, so that the system can recover from server restarts without losing execution state.

#### Acceptance Criteria

1. THE system SHALL NOT maintain any in-memory state for run execution
2. WHEN a node state changes THEN the system SHALL immediately persist the change to the `stitch_runs` table
3. WHEN the server restarts THEN the system SHALL be able to resume execution by reading state from the database
4. WHEN edge-walking occurs THEN the system SHALL read the current flow graph and node states from the database
5. THE system SHALL use database transactions to ensure atomic state updates

### Requirement 12: Callback URL Construction

**User Story:** As a deployment engineer, I want callback URLs to use environment-based base URLs, so that the system works across different environments (local, staging, production).

#### Acceptance Criteria

1. WHEN constructing callback URLs THEN the system SHALL read the base URL from `process.env.NEXT_PUBLIC_BASE_URL`
2. THE system SHALL prepend the base URL to all callback paths
3. WHEN the environment variable is not set THEN the system SHALL throw a configuration error at startup
4. THE system SHALL NOT hardcode localhost or any specific domain in callback URL construction
