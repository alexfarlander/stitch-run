# Design Document

## Overview

The Canvas as Data feature transforms Stitch from an in-memory workflow system to a robust, versioned, database-backed architecture. This design enables AI management, CLI control, and proper workflow execution with historical tracking by treating canvases as structured JSON data that can be validated, optimized, and versioned.

The key insight is that **a canvas is just JSON, and LLMs are excellent at generating and modifying JSON**. This foundation enables natural language workflow creation, programmatic canvas management, and safe execution with version history.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React Flow   │  │ Canvas Editor│  │ Run Viewer   │      │
│  │ UI           │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Flow CRUD    │  │ Version Mgmt │  │ Run Execution│      │
│  │ /api/flows   │  │ /api/flows/  │  │ /api/flows/  │      │
│  │              │  │ [id]/versions│  │ [id]/run     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Version      │  │ OEG Compiler │  │ Mermaid      │      │
│  │ Manager      │  │ (Validate &  │  │ Parser       │      │
│  │              │  │  Optimize)   │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer (Supabase)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ stitch_flows │  │ stitch_flow_ │  │ stitch_runs  │      │
│  │ (metadata)   │  │ versions     │  │ (execution)  │      │
│  │              │  │ (snapshots)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Save Flow:**
```
User edits canvas → Frontend sends VisualGraph → API validates
→ OEG Compiler validates & optimizes → Create version record
→ Update current_version_id → Return success
```

**Run Flow:**
```
User clicks "Run" → Check for unsaved changes → Auto-create version if needed
→ Create run record with flow_version_id → Load ExecutionGraph from version
→ Initialize node states → Start execution → Edge walker uses OEG
```

**View Historical Run:**
```
User selects old run → Load run.flow_version_id → Load version.visual_graph
→ Render canvas with historical state → Show execution results
```

## Components and Interfaces

### 1. Type Definitions

#### Visual Graph Types

```typescript
// src/types/canvas-schema.ts

/**
 * Visual graph structure for UI rendering
 * Contains all React Flow properties including positions and styles
 */
export interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}

/**
 * Visual node with UI properties
 */
export interface VisualNode {
  id: string;
  type: string;  // worker, ux, splitter, collector, section, item
  position: { x: number; y: number };
  data: {
    label: string;
    worker_type?: string;  // For worker nodes: claude, minimax, etc.
    config?: Record<string, any>;  // Worker-specific config
    
    // Input/Output schema (for validation and mapping)
    inputs?: Record<string, InputSchema>;
    outputs?: Record<string, OutputSchema>;
    
    // Entity movement configuration
    entityMovement?: EntityMovementConfig;
  };
  parentNode?: string;  // For nested nodes (items in sections)
  style?: Record<string, any>;  // UI styling
  width?: number;
  height?: number;
}

/**
 * Input schema definition
 */
export interface InputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  required: boolean;
  description?: string;
  default?: any;
}

/**
 * Output schema definition
 */
export interface OutputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  description?: string;
}

/**
 * Visual edge with data mapping
 */
export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // For nodes with multiple outputs
  targetHandle?: string;  // For nodes with multiple inputs
  type?: string;  // default, journey, etc.
  animated?: boolean;
  style?: Record<string, any>;
  
  // Data mapping between nodes
  data?: {
    mapping?: EdgeMapping;  // How to wire outputs to inputs
    [key: string]: any;
  };
}

/**
 * Edge mapping defines how data flows between nodes
 * Maps target node input parameters to source node output paths
 */
export interface EdgeMapping {
  [targetInput: string]: string;  // JSONPath or simple key
}
```

#### Execution Graph Types

```typescript
// src/types/execution-graph.ts

/**
 * Optimized execution graph for runtime
 * Stripped of UI properties, indexed for O(1) lookup
 */
export interface ExecutionGraph {
  // Nodes indexed by ID for O(1) lookup
  nodes: Record<string, ExecutionNode>;
  
  // Adjacency map for instant edge traversal
  adjacency: Record<string, string[]>;  // { sourceId: [targetId1, targetId2] }
  
  // Edge data indexed by "source->target" for mapping lookup
  edgeData: Record<string, EdgeMapping>;  // { "nodeA->nodeB": { mapping } }
  
  // Entry points (nodes with no incoming edges)
  entryNodes: string[];
  
  // Terminal nodes (nodes with no outgoing edges)
  terminalNodes: string[];
}

/**
 * Execution node (stripped of UI properties)
 */
export interface ExecutionNode {
  id: string;
  type: string;
  worker_type?: string;
  config?: Record<string, any>;
  inputs?: Record<string, InputSchema>;
  outputs?: Record<string, OutputSchema>;
  entityMovement?: EntityMovementConfig;
}
```

#### Worker Definition Types

```typescript
// src/types/worker-definition.ts

/**
 * Worker definition format
 * Defines inputs, outputs, and configuration for a worker type
 */
export interface WorkerDefinition {
  id: string;
  name: string;
  type: 'sync' | 'async';
  description: string;
  
  // What the worker needs
  input: Record<string, InputSchema>;
  
  // What the worker produces
  output: Record<string, OutputSchema>;
  
  // Configuration options
  config?: {
    endpoint?: string;
    model?: string;
    [key: string]: any;
  };
}
```

#### Workflow Creation Types

```typescript
// src/types/workflow-creation.ts

/**
 * Workflow creation request supporting multiple input formats
 */
export interface WorkflowCreationRequest {
  // Structure (quick sketch)
  mermaid?: string;
  
  // OR full graph (detailed)
  graph?: VisualGraph;
  
  // Node configurations (optional, enhances Mermaid)
  nodeConfigs?: {
    [nodeId: string]: {
      workerType?: string;
      config?: Record<string, any>;
      entityMovement?: EntityMovementConfig;
    }
  };
  
  // Edge mappings (optional, enhances Mermaid)
  edgeMappings?: {
    [edgeKey: string]: EdgeMapping;  // "A->B": { prompt: "output.text" }
  };
}
```

### 2. Database Schema

```sql
-- Flow metadata (container)
CREATE TABLE stitch_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  current_version_id uuid,  -- Points to latest version
  canvas_type text DEFAULT 'workflow',  -- 'bmc', 'workflow', 'detail'
  parent_id uuid REFERENCES stitch_flows(id),  -- For nested canvases
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Flow versions (immutable snapshots)
CREATE TABLE stitch_flow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES stitch_flows(id) ON DELETE CASCADE,
  
  -- Visual graph (for UI rendering)
  visual_graph jsonb NOT NULL,
  
  -- Execution graph (optimized for runtime)
  execution_graph jsonb NOT NULL,
  
  commit_message text,  -- Optional: "Added Claude node"
  created_at timestamptz DEFAULT now()
);

-- Add foreign key for current_version_id
ALTER TABLE stitch_flows
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES stitch_flow_versions(id);

-- Runs (lightweight reference to version)
ALTER TABLE stitch_runs
  ADD COLUMN flow_version_id uuid REFERENCES stitch_flow_versions(id);

-- Indexes for performance
CREATE INDEX idx_flow_versions_flow_id ON stitch_flow_versions(flow_id);
CREATE INDEX idx_flow_versions_created_at ON stitch_flow_versions(created_at DESC);
CREATE INDEX idx_runs_flow_version_id ON stitch_runs(flow_version_id);
```

### 3. OEG Compiler

```typescript
// src/lib/canvas/compile-oeg.ts

export interface CompileResult {
  success: boolean;
  executionGraph?: ExecutionGraph;
  errors?: ValidationError[];
}

export interface ValidationError {
  type: 'cycle' | 'missing_input' | 'invalid_worker' | 'invalid_mapping';
  node?: string;
  edge?: string;
  field?: string;
  message: string;
}

/**
 * Compile visual graph to optimized execution graph
 * Validates, optimizes, and strips UI properties
 */
export function compileToOEG(visualGraph: VisualGraph): CompileResult {
  const errors: ValidationError[] = [];
  
  // 1. VALIDATION
  
  // Check for cycles
  if (hasCycles(visualGraph)) {
    errors.push({
      type: 'cycle',
      message: 'Graph contains cycles which would cause infinite loops'
    });
  }
  
  // Check all required inputs have connections or defaults
  for (const node of visualGraph.nodes) {
    const incomingEdges = getIncomingEdges(node.id, visualGraph.edges);
    
    for (const [inputName, inputDef] of Object.entries(node.data.inputs || {})) {
      if (inputDef.required && !hasMapping(inputName, incomingEdges) && !inputDef.default) {
        errors.push({
          type: 'missing_input',
          node: node.id,
          field: inputName,
          message: `Required input "${inputName}" has no connection or default value`
        });
      }
    }
  }
  
  // Validate worker types exist
  for (const node of visualGraph.nodes) {
    if (node.type === 'worker' && node.data.worker_type) {
      if (!isValidWorkerType(node.data.worker_type)) {
        errors.push({
          type: 'invalid_worker',
          node: node.id,
          message: `Unknown worker type: ${node.data.worker_type}`
        });
      }
    }
  }
  
  // Validate edge mappings
  for (const edge of visualGraph.edges) {
    if (edge.data?.mapping) {
      const sourceNode = visualGraph.nodes.find(n => n.id === edge.source);
      const targetNode = visualGraph.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const mappingErrors = validateEdgeMapping(
          edge.data.mapping,
          sourceNode.data.outputs || {},
          targetNode.data.inputs || {}
        );
        errors.push(...mappingErrors);
      }
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  // 2. OPTIMIZATION - Build adjacency map
  const adjacency: Record<string, string[]> = {};
  const edgeData: Record<string, EdgeMapping> = {};
  
  for (const edge of visualGraph.edges) {
    if (!adjacency[edge.source]) {
      adjacency[edge.source] = [];
    }
    adjacency[edge.source].push(edge.target);
    
    if (edge.data?.mapping) {
      edgeData[`${edge.source}->${edge.target}`] = edge.data.mapping;
    }
  }
  
  // 3. STRIPPING - Remove UI properties
  // CRITICAL: ExecutionNode.id MUST exactly match VisualNode.id
  // The Runner logs status updates against these IDs
  // The frontend uses these IDs to highlight nodes during execution
  // DO NOT rename, sanitize, or modify node IDs during compilation
  const nodes: Record<string, ExecutionNode> = {};
  for (const node of visualGraph.nodes) {
    nodes[node.id] = {
      id: node.id,  // MUST match VisualNode.id exactly
      type: node.type,
      worker_type: node.data.worker_type,
      config: node.data.config,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
      entityMovement: node.data.entityMovement
    };
  }
  
  // 4. COMPUTE entry and terminal nodes
  const hasIncoming = new Set(visualGraph.edges.map(e => e.target));
  const hasOutgoing = new Set(visualGraph.edges.map(e => e.source));
  
  const entryNodes = Object.keys(nodes).filter(id => !hasIncoming.has(id));
  const terminalNodes = Object.keys(nodes).filter(id => !hasOutgoing.has(id));
  
  return {
    success: true,
    executionGraph: {
      nodes,
      adjacency,
      edgeData,
      entryNodes,
      terminalNodes
    }
  };
}
```

### 4. Version Manager

```typescript
// src/lib/canvas/version-manager.ts

/**
 * Create a new version of a flow
 * Compiles visual graph to execution graph and stores both
 */
export async function createVersion(
  flowId: string,
  visualGraph: VisualGraph,
  commitMessage?: string
): Promise<{ versionId: string; executionGraph: ExecutionGraph }> {
  // Compile to OEG
  const compileResult = compileToOEG(visualGraph);
  
  if (!compileResult.success) {
    throw new ValidationError('Graph validation failed', compileResult.errors);
  }
  
  const supabase = createServerClient();
  
  // Insert version
  const { data: version, error } = await supabase
    .from('stitch_flow_versions')
    .insert({
      flow_id: flowId,
      visual_graph: visualGraph,
      execution_graph: compileResult.executionGraph,
      commit_message: commitMessage
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create version: ${error.message}`);
  }
  
  // Update current_version_id
  await supabase
    .from('stitch_flows')
    .update({ current_version_id: version.id })
    .eq('id', flowId);
  
  return {
    versionId: version.id,
    executionGraph: compileResult.executionGraph!
  };
}

/**
 * Get a specific version
 */
export async function getVersion(versionId: string): Promise<FlowVersion | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('stitch_flow_versions')
    .select('*')
    .eq('id', versionId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get version: ${error.message}`);
  }
  
  return data;
}

/**
 * List all versions for a flow
 */
export async function listVersions(flowId: string): Promise<FlowVersion[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('stitch_flow_versions')
    .select('*')
    .eq('flow_id', flowId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to list versions: ${error.message}`);
  }
  
  return data;
}

/**
 * Auto-version on run
 * If there are unsaved changes, create a version first
 */
export async function autoVersionOnRun(
  flowId: string,
  currentVisualGraph: VisualGraph
): Promise<string> {
  const supabase = createServerClient();
  
  // Get current version
  const { data: flow } = await supabase
    .from('stitch_flows')
    .select('current_version_id')
    .eq('id', flowId)
    .single();
  
  if (!flow?.current_version_id) {
    // No version exists, create first version
    const { versionId } = await createVersion(
      flowId,
      currentVisualGraph,
      'Initial version (auto-created on run)'
    );
    return versionId;
  }
  
  // Check if current graph differs from saved version
  const currentVersion = await getVersion(flow.current_version_id);
  
  if (!currentVersion) {
    throw new Error('Current version not found');
  }
  
  const hasChanges = !deepEqual(
    currentVisualGraph,
    currentVersion.visual_graph
  );
  
  if (hasChanges) {
    // Create new version
    const { versionId } = await createVersion(
      flowId,
      currentVisualGraph,
      'Auto-versioned on run'
    );
    return versionId;
  }
  
  // No changes, use current version
  return flow.current_version_id;
}
```

### 5. Mermaid Parser

```typescript
// src/lib/canvas/mermaid-parser.ts

/**
 * Parse Mermaid flowchart to visual graph
 * Supports optional node configs and edge mappings
 */
export function mermaidToCanvas(
  mermaid: string,
  nodeConfigs?: Record<string, any>,
  edgeMappings?: Record<string, EdgeMapping>
): VisualGraph {
  // 1. Parse Mermaid syntax
  const parsed = parseMermaidSyntax(mermaid);
  
  // 2. Extract nodes
  const nodes: VisualNode[] = parsed.nodes.map(node => {
    const config = nodeConfigs?.[node.id] || {};
    
    return {
      id: node.id,
      type: inferNodeType(node.label, config.workerType),
      position: { x: 0, y: 0 },  // Will be set by auto-layout
      data: {
        label: node.label,
        worker_type: config.workerType || inferWorkerType(node.label),
        config: config.config || {},
        entityMovement: config.entityMovement
      }
    };
  });
  
  // 3. Extract edges
  const edges: VisualEdge[] = parsed.edges.map(edge => {
    const edgeKey = `${edge.source}->${edge.target}`;
    const mapping = edgeMappings?.[edgeKey];
    
    return {
      id: `e-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      data: mapping ? { mapping } : undefined
    };
  });
  
  // 4. Auto-layout positions
  const layoutedNodes = autoLayout(nodes, edges);
  
  return {
    nodes: layoutedNodes,
    edges
  };
}

/**
 * Infer node type from label
 */
function inferNodeType(label: string, explicitType?: string): string {
  if (explicitType) return explicitType;
  
  const lower = label.toLowerCase();
  
  if (lower.includes('input') || lower.includes('form')) return 'ux';
  if (lower.includes('split')) return 'splitter';
  if (lower.includes('collect') || lower.includes('merge')) return 'collector';
  if (lower.includes('claude') || lower.includes('gpt')) return 'worker';
  if (lower.includes('video') || lower.includes('audio')) return 'worker';
  
  return 'worker';  // Default
}

/**
 * Infer worker type from label
 */
function inferWorkerType(label: string): string | undefined {
  const lower = label.toLowerCase();
  
  if (lower.includes('claude')) return 'claude';
  if (lower.includes('minimax') || lower.includes('video')) return 'minimax';
  if (lower.includes('elevenlabs') || lower.includes('audio')) return 'elevenlabs';
  if (lower.includes('shotstack')) return 'shotstack';
  
  return undefined;
}
```

### 6. Auto-Layout

```typescript
// src/lib/canvas/auto-layout.ts

/**
 * Auto-layout nodes to prevent overlap
 * Uses hierarchical layout algorithm
 */
export function autoLayout(
  nodes: VisualNode[],
  edges: VisualEdge[]
): VisualNode[] {
  // Build adjacency for topological sort
  const adjacency = buildAdjacency(edges);
  
  // Compute levels (topological layers)
  const levels = computeLevels(nodes, adjacency);
  
  // Position nodes
  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 150;
  
  const positioned = nodes.map(node => {
    const level = levels[node.id];
    const nodesInLevel = Object.entries(levels)
      .filter(([_, l]) => l === level)
      .map(([id]) => id);
    
    const indexInLevel = nodesInLevel.indexOf(node.id);
    
    return {
      ...node,
      position: {
        x: level * HORIZONTAL_SPACING,
        y: indexInLevel * VERTICAL_SPACING
      }
    };
  });
  
  return positioned;
}

/**
 * Compute topological levels for hierarchical layout using Longest Path Layering
 * This handles DAGs correctly by ensuring a node's level is max(parent_levels) + 1
 * 
 * Note: This is NOT a simple BFS. In DAGs, a node may have multiple parents.
 * We must wait until ALL parents are visited before assigning the node's level.
 */
function computeLevels(
  nodes: VisualNode[],
  adjacency: Record<string, string[]>
): Record<string, number> {
  const levels: Record<string, number> = {};
  
  // Build reverse adjacency (child -> parents)
  const reverseAdj: Record<string, string[]> = {};
  for (const node of nodes) {
    reverseAdj[node.id] = [];
  }
  for (const [source, targets] of Object.entries(adjacency)) {
    for (const target of targets) {
      reverseAdj[target].push(source);
    }
  }
  
  // Find entry nodes (no incoming edges)
  const entryNodes = nodes
    .filter(node => reverseAdj[node.id].length === 0)
    .map(node => node.id);
  
  // Initialize entry nodes at level 0
  for (const id of entryNodes) {
    levels[id] = 0;
  }
  
  // Process nodes using a queue, but only assign level when ALL parents are visited
  const queue: string[] = [...entryNodes];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const id = queue.shift()!;
    
    if (visited.has(id)) continue;
    
    // Check if all parents have been assigned levels
    const parents = reverseAdj[id];
    const allParentsVisited = parents.every(parentId => levels[parentId] !== undefined);
    
    if (!allParentsVisited) {
      // Put back in queue and try later
      queue.push(id);
      continue;
    }
    
    // Assign level as max(parent_levels) + 1
    if (parents.length > 0) {
      levels[id] = Math.max(...parents.map(parentId => levels[parentId])) + 1;
    }
    
    visited.add(id);
    
    // Add children to queue
    const children = adjacency[id] || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }
  
  return levels;
}
```

## Data Models

### Flow Version Model

```typescript
export interface FlowVersion {
  id: string;
  flow_id: string;
  visual_graph: VisualGraph;
  execution_graph: ExecutionGraph;
  commit_message: string | null;
  created_at: string;
}
```

### Worker Registry

```typescript
// src/lib/workers/registry.ts

export const WORKER_DEFINITIONS: Record<string, WorkerDefinition> = {
  claude: {
    id: 'claude',
    name: 'Claude Script Generator',
    type: 'sync',
    description: 'Generate scripts using Claude AI',
    input: {
      prompt: {
        type: 'string',
        required: true,
        description: 'The prompt to send to Claude'
      },
      topic: {
        type: 'string',
        required: false,
        description: 'Topic for script generation'
      }
    },
    output: {
      script: {
        type: 'object',
        description: 'Generated script with scenes'
      }
    },
    config: {
      model: 'claude-3-sonnet-20240229'
    }
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax Video Generator',
    type: 'async',
    description: 'Generate videos from text prompts',
    input: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Visual description for video generation'
      },
      duration: {
        type: 'number',
        required: false,
        description: 'Video duration in seconds',
        default: 5
      }
    },
    output: {
      videoUrl: {
        type: 'string',
        description: 'URL to generated video'
      }
    }
  },
  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs Voice Generator',
    type: 'async',
    description: 'Generate voice audio from text',
    input: {
      text: {
        type: 'string',
        required: true,
        description: 'Text to convert to speech'
      },
      voice_id: {
        type: 'string',
        required: false,
        description: 'Voice ID to use'
      }
    },
    output: {
      audioUrl: {
        type: 'string',
        description: 'URL to generated audio'
      }
    }
  },
  shotstack: {
    id: 'shotstack',
    name: 'Shotstack Video Assembler',
    type: 'async',
    description: 'Assemble videos from clips',
    input: {
      timeline: {
        type: 'object',
        required: true,
        description: 'Shotstack timeline configuration'
      }
    },
    output: {
      videoUrl: {
        type: 'string',
        description: 'URL to assembled video'
      }
    }
  }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Flow creation stores metadata
*For any* canvas save operation, creating a flow should result in a new row in stitch_flows table with the provided name and metadata
**Validates: Requirements 1.1**

### Property 2: Version creation stores both graphs
*For any* visual graph, creating a version should store both the visual_graph and execution_graph in stitch_flow_versions table
**Validates: Requirements 1.2, 10.3**

### Property 3: Run references specific version
*For any* workflow run, the stitch_runs record should contain a flow_version_id that references a valid version
**Validates: Requirements 1.3, 5.2**

### Property 4: Historical runs preserve version
*For any* completed run, querying the run after modifying the canvas should return the original version that was executed, not the current version
**Validates: Requirements 1.4, 5.3**

### Property 5: Current version pointer updates
*For any* flow with multiple versions, the current_version_id in stitch_flows should always point to the most recently created version
**Validates: Requirements 1.5, 5.5**

### Property 6: New flow creation order
*For any* new unsaved flow being run, the system should create the parent stitch_flows record before creating the version
**Validates: Requirements 1.6, 5.6**

### Property 7: Visual node structure validation
*For any* visual node, it should contain id, type, position, and data properties with correct types
**Validates: Requirements 2.1**

### Property 8: Visual edge structure validation
*For any* visual edge, it should contain id, source, target properties, and optionally a data.mapping property
**Validates: Requirements 2.2**

### Property 9: Edge mapping structure
*For any* edge with data mapping, the mapping should be a record where keys are target input names and values are source output paths
**Validates: Requirements 2.3**

### Property 10: Worker node completeness
*For any* worker node, it should include worker_type, config, inputs, and outputs properties
**Validates: Requirements 2.4**

### Property 11: Graph schema validation
*For any* visual graph, validation should verify all nodes and edges conform to the defined TypeScript schemas
**Validates: Requirements 2.5**

### Property 12: Adjacency map creation
*For any* visual graph compilation, the resulting execution graph should contain an adjacency map indexed by source node ID
**Validates: Requirements 3.1**

### Property 13: UI property stripping
*For any* visual graph compilation, the execution graph nodes should not contain position, style, label, width, or height properties
**Validates: Requirements 3.2**

### Property 14: Node indexing by ID
*For any* visual graph compilation, the execution graph should have nodes indexed as a record with node IDs as keys
**Validates: Requirements 3.3**

### Property 15: Entry node computation
*For any* visual graph, the execution graph should correctly identify all nodes with no incoming edges as entry nodes
**Validates: Requirements 3.4**

### Property 16: Terminal node computation
*For any* visual graph, the execution graph should correctly identify all nodes with no outgoing edges as terminal nodes
**Validates: Requirements 3.5**

### Property 17: Edge data indexing
*For any* visual graph with edge mappings, the execution graph should index edge data by "source->target" keys
**Validates: Requirements 3.6**

### Property 18: Cycle detection
*For any* visual graph containing a cycle, compilation should fail with a cycle error
**Validates: Requirements 4.1**

### Property 19: Required input validation
*For any* node with a required input that has no connection and no default value, compilation should fail with a missing_input error
**Validates: Requirements 4.2**

### Property 20: Worker type validation
*For any* worker node with an invalid worker_type, compilation should fail with an invalid_worker error
**Validates: Requirements 4.3**

### Property 21: Successful compilation returns execution graph
*For any* valid visual graph, compilation should succeed and return an execution graph
**Validates: Requirements 4.4**

### Property 22: Compilation errors include details
*For any* invalid visual graph, compilation should return errors with node, field, and message details
**Validates: Requirements 4.5**

### Property 23: Auto-versioning on unsaved changes
*For any* canvas with unsaved changes, clicking "Run" should automatically create a new version before execution
**Validates: Requirements 5.1**

### Property 24: Version immutability
*For any* run, modifying the canvas after the run should not affect the run's visualization or execution graph
**Validates: Requirements 5.4**

### Property 25: Mermaid parsing extracts structure
*For any* valid Mermaid flowchart string, parsing should extract all nodes and edges into a visual graph
**Validates: Requirements 6.1**

### Property 26: Worker type inference
*For any* Mermaid node with a label containing worker keywords (claude, minimax, etc.), the parser should infer the correct worker type
**Validates: Requirements 6.2**

### Property 27: Mermaid generation round-trip
*For any* visual graph, converting to Mermaid and parsing back should preserve the graph structure (nodes and edges)
**Validates: Requirements 6.3**

### Property 28: Default config application
*For any* Mermaid input without explicit configs, the parser should apply default configurations for inferred worker types
**Validates: Requirements 6.4**

### Property 29: Structure preservation in Mermaid conversion
*For any* visual graph, converting to Mermaid should preserve all nodes and edges even if detailed configs are lost
**Validates: Requirements 6.5**

### Property 30: Mermaid-only workflow creation
*For any* Mermaid input without nodeConfigs or edgeMappings, the system should infer worker types and apply defaults
**Validates: Requirements 7.1**

### Property 31: Explicit config application
*For any* Mermaid input with nodeConfigs, the resulting graph should use the provided configurations instead of defaults
**Validates: Requirements 7.2**

### Property 32: Edge mapping application
*For any* Mermaid input with edgeMappings, the resulting graph edges should contain the provided data mappings
**Validates: Requirements 7.3**

### Property 33: Direct JSON input
*For any* complete visual graph provided as JSON, the system should use it as-is without modification
**Validates: Requirements 7.4**

### Property 34: Auto-layout generates positions
*For any* Mermaid input, auto-layout should assign non-zero x and y coordinates to all nodes
**Validates: Requirements 7.5**

### Property 35: Overlap prevention
*For any* Mermaid input, auto-layout should ensure no two nodes have identical positions
**Validates: Requirements 7.6**

### Property 36: Worker definition completeness
*For any* worker definition, it should include id, name, type, input schema, and output schema
**Validates: Requirements 8.1**

### Property 37: Input schema structure
*For any* worker input definition, it should specify type, required flag, and description
**Validates: Requirements 8.2**

### Property 38: Output schema structure
*For any* worker output definition, it should specify type and description
**Validates: Requirements 8.3**

### Property 39: Worker config structure
*For any* worker with configuration, the config object should be present and contain relevant settings
**Validates: Requirements 8.4**

### Property 40: Edge mapping type validation
*For any* edge mapping, validation should verify that source output types are compatible with target input types using worker definitions
**Validates: Requirements 8.5**

### Property 41: Version compilation
*For any* version creation, the system should compile the visual graph to an execution graph before storing
**Validates: Requirements 10.1**

### Property 42: Version validation
*For any* invalid visual graph, attempting to create a version should fail with validation errors
**Validates: Requirements 10.2**

### Property 43: Version retrieval completeness
*For any* version ID, retrieving the version should return both visual_graph and execution_graph
**Validates: Requirements 10.4**

### Property 44: Version listing order
*For any* flow with multiple versions, listing versions should return them ordered by creation date descending (newest first)
**Validates: Requirements 10.5**

## Error Handling

### Validation Errors

All validation errors follow a consistent structure:

```typescript
interface ValidationError {
  type: 'cycle' | 'missing_input' | 'invalid_worker' | 'invalid_mapping';
  node?: string;
  edge?: string;
  field?: string;
  message: string;
}
```

**Error Types:**

1. **Cycle Error**: Graph contains cycles that would cause infinite loops
   - Detected during compilation
   - Includes list of nodes involved in cycle
   - Prevents version creation

2. **Missing Input Error**: Required input has no connection or default
   - Detected during compilation
   - Includes node ID and input field name
   - Prevents version creation

3. **Invalid Worker Error**: Worker type doesn't exist in registry
   - Detected during compilation
   - Includes node ID and invalid worker type
   - Prevents version creation

4. **Invalid Mapping Error**: Edge mapping references non-existent fields
   - Detected during compilation
   - Includes edge ID and problematic mapping
   - Prevents version creation

### Database Errors

Database operations handle errors gracefully:

1. **Foreign Key Violations**: Attempting to reference non-existent flow or version
   - Return clear error message
   - Suggest checking if referenced entity exists

2. **Unique Constraint Violations**: Attempting to create duplicate records
   - Return clear error message
   - Suggest using update instead

3. **Not Found Errors**: Querying non-existent records
   - Return null instead of throwing
   - Allow caller to handle missing data

### Compilation Errors

Compilation errors are collected and returned together:

```typescript
const result = compileToOEG(visualGraph);

if (!result.success) {
  // result.errors contains all validation errors
  console.error('Compilation failed:', result.errors);
  // Display errors to user
  // Prevent version creation
}
```

## Testing Strategy

### Unit Tests

Unit tests verify specific functionality:

1. **Type Validation Tests**
   - Test that visual nodes conform to schema
   - Test that visual edges conform to schema
   - Test that execution graphs conform to schema

2. **Compilation Tests**
   - Test adjacency map creation
   - Test UI property stripping
   - Test entry/terminal node computation
   - Test edge data indexing

3. **Validation Tests**
   - Test cycle detection with known cyclic graphs
   - Test missing input detection
   - Test invalid worker type detection
   - Test edge mapping validation

4. **Mermaid Tests**
   - Test parsing various Mermaid syntaxes
   - Test worker type inference
   - Test Mermaid generation
   - Test round-trip conversion

5. **Auto-Layout Tests**
   - Test position generation
   - Test overlap prevention
   - Test hierarchical layout

6. **Version Manager Tests**
   - Test version creation
   - Test version retrieval
   - Test version listing
   - Test auto-versioning logic

### Property-Based Tests

Property-based tests verify universal properties across many inputs:

1. **Graph Structure Properties**
   - Property 7-11: Node and edge structure validation
   - Property 12-17: Execution graph structure
   - Property 15-16: Entry and terminal node computation

2. **Compilation Properties**
   - Property 13: UI property stripping
   - Property 18-22: Validation and error handling
   - Property 21: Successful compilation

3. **Versioning Properties**
   - Property 1-6: Flow and version creation
   - Property 23-24: Auto-versioning and immutability
   - Property 41-44: Version management

4. **Mermaid Properties**
   - Property 25-29: Mermaid parsing and generation
   - Property 27: Round-trip preservation
   - Property 30-35: Workflow creation modes

5. **Worker Definition Properties**
   - Property 36-40: Worker schema validation
   - Property 40: Type compatibility checking

### Integration Tests

Integration tests verify end-to-end workflows:

1. **Save and Run Workflow**
   - Create canvas → Save → Run → Verify version created
   - Verify run references correct version
   - Verify execution uses OEG

2. **Version History Workflow**
   - Create canvas → Save → Run → Modify → Run again
   - Verify two versions exist
   - Verify old run still shows original version

3. **Mermaid Import Workflow**
   - Import Mermaid → Verify graph created
   - Verify auto-layout applied
   - Verify compilation succeeds
   - Run workflow → Verify execution works

4. **Error Recovery Workflow**
   - Create invalid graph → Attempt save
   - Verify validation errors returned
   - Fix errors → Save successfully
   - Verify version created

### Test Configuration

- Property-based tests should run minimum 100 iterations
- Use fast-check library for TypeScript property testing
- Tag each property test with the design document property number
- Example: `// Feature: canvas-as-data, Property 1: Flow creation stores metadata`

## Implementation Notes

### Migration Strategy

1. **Phase 1: Add New Tables**
   - Create stitch_flows table (if not exists)
   - Create stitch_flow_versions table
   - Add flow_version_id to stitch_runs

2. **Phase 2: Migrate Existing Data**
   - For each existing flow, attempt to create initial version
   - **Migration Safety**: If compilation fails for existing data (invalid graph structure):
     - Set current_version_id to NULL
     - Log the flow ID and error
     - Force user to "Save to Version" on next load
     - Do NOT attempt to auto-fix broken graphs during migration
   - Update runs to reference versions (only for successfully migrated flows)
   - Backfill current_version_id (only for valid flows)

3. **Phase 3: Update Code**
   - Update flow CRUD operations
   - Update run creation to use versions
   - Update execution engine to use OEG

4. **Phase 4: Deprecate Old Schema**
   - Remove graph column from stitch_flows (if exists)
   - Remove graph column from stitch_runs (if exists)

### Performance Considerations

1. **Execution Graph Size**
   - OEG is ~60% smaller than visual graph
   - Reduces database storage
   - Faster to load and parse

2. **Adjacency Map Lookup**
   - O(1) edge lookup vs O(n) array scan
   - Significant speedup for large graphs
   - Critical for real-time execution

3. **Version Storage**
   - Versions are immutable (no updates)
   - Can be cached aggressively
   - Consider compression for large graphs

4. **Database Indexes**
   - Index flow_version_id in stitch_runs
   - Index flow_id in stitch_flow_versions
   - Index created_at for version listing

### Security Considerations

1. **Row Level Security**
   - Flows should be scoped to user_id
   - Versions inherit flow permissions
   - Runs inherit flow permissions

2. **Validation**
   - Always validate graphs before storing
   - Prevent malicious graph structures
   - Limit graph size to prevent DoS

3. **API Authentication**
   - All endpoints require authentication
   - Use Supabase RLS for authorization
   - Validate user owns flow before operations

### Future Enhancements

1. **Graph Diffing**
   - Show visual diff between versions
   - Highlight changed nodes and edges
   - Support version comparison UI

2. **Version Branching**
   - Support multiple version branches
   - Allow experimental changes
   - Merge branches back to main

3. **Collaborative Editing**
   - Real-time collaboration on canvases
   - Conflict resolution
   - Operational transforms

4. **Graph Analytics**
   - Analyze execution patterns
   - Identify bottlenecks
   - Suggest optimizations
