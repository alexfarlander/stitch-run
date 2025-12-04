/**
 * Workflow Creation Type Definitions
 * 
 * Defines the structure for workflow creation requests supporting multiple input formats.
 * This enables flexible workflow creation through:
 * - Mermaid syntax (quick structure sketching)
 * - Full visual graph JSON (detailed configuration)
 * - Hybrid approach (Mermaid + configs for best of both worlds)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * Related: canvas-schema.ts (visual graph types), execution-graph.ts (runtime types)
 */

import { VisualGraph, EdgeMapping, EntityMovementConfig } from './canvas-schema';

// ============================================================================
// Node Configuration Types
// ============================================================================

/**
 * Node configuration for enhancing Mermaid-based workflows
 * Provides detailed configuration for nodes when using Mermaid syntax
 * 
 * This allows a hybrid approach:
 * - Use Mermaid for quick structure definition
 * - Use nodeConfigs for detailed worker configuration
 * 
 * Example:
 * {
 *   "scriptGen": {
 *     workerType: "claude",
 *     config: { model: "claude-3-sonnet-20240229" },
 *     entityMovement: { onSuccess: { targetSectionId: "production", completeAs: "success" } }
 *   }
 * }
 */
export interface NodeConfig {
  /**
   * Worker type for worker nodes
   * Examples: "claude", "minimax", "elevenlabs", "shotstack"
   */
  workerType?: string;
  
  /**
   * Worker-specific configuration
   * Examples: { model: "...", endpoint: "...", temperature: 0.7 }
   */
  config?: Record<string, any>;
  
  /**
   * Entity movement configuration for worker nodes
   * Defines how entities move between sections based on worker outcomes
   */
  entityMovement?: EntityMovementConfig;
}

// ============================================================================
// Workflow Creation Request Types
// ============================================================================

/**
 * Workflow creation request supporting multiple input formats
 * 
 * This interface supports three creation modes:
 * 
 * 1. Mermaid-only (quick sketch):
 *    { mermaid: "flowchart LR\n  A[Start] --> B[Process]" }
 * 
 * 2. Full graph (detailed):
 *    { graph: { nodes: [...], edges: [...] } }
 * 
 * 3. Hybrid (Mermaid + configs):
 *    {
 *      mermaid: "flowchart LR\n  A --> B",
 *      nodeConfigs: { "A": { workerType: "claude", config: {...} } },
 *      edgeMappings: { "A->B": { prompt: "output.text" } }
 *    }
 * 
 * Requirements:
 * - 7.1: Support Mermaid-only workflow creation with inference
 * - 7.2: Support Mermaid + nodeConfigs for detailed configuration
 * - 7.3: Support Mermaid + edgeMappings for data flow specification
 * - 7.4: Support full JSON graph for complete control
 */
export interface WorkflowCreationRequest {
  /**
   * Mermaid flowchart syntax for quick structure definition
   * 
   * When provided alone, the system will:
   * - Parse nodes and edges from Mermaid syntax
   * - Infer node types from labels (ux, worker, splitter, collector)
   * - Infer worker types from labels (claude, minimax, elevenlabs)
   * - Apply default configurations
   * - Auto-generate node positions
   * 
   * Example:
   * ```
   * flowchart LR
   *   Start[User Input] --> Claude[Generate Script]
   *   Claude --> Video[Create Video]
   * ```
   * 
   * Requirement: 7.1
   */
  mermaid?: string;
  
  /**
   * Full visual graph with complete node and edge definitions
   * 
   * When provided, this takes precedence over Mermaid.
   * Use this for complete control over the workflow structure,
   * including exact positions, styles, and configurations.
   * 
   * Example:
   * {
   *   nodes: [
   *     { id: "start", type: "ux", position: { x: 0, y: 0 }, data: { label: "Start" } },
   *     { id: "worker1", type: "worker", position: { x: 300, y: 0 }, data: { label: "Process", worker_type: "claude" } }
   *   ],
   *   edges: [
   *     { id: "e1", source: "start", target: "worker1", data: { mapping: { prompt: "input.text" } } }
   *   ]
   * }
   * 
   * Requirement: 7.4
   */
  graph?: VisualGraph;
  
  /**
   * Node configurations to enhance Mermaid-based workflows
   * 
   * Maps node IDs to detailed configurations.
   * This allows using Mermaid for structure while providing
   * detailed worker configurations separately.
   * 
   * Example:
   * {
   *   "scriptGen": {
   *     workerType: "claude",
   *     config: { model: "claude-3-sonnet-20240229", temperature: 0.7 },
   *     entityMovement: {
   *       onSuccess: { targetSectionId: "production", completeAs: "success" }
   *     }
   *   },
   *   "videoGen": {
   *     workerType: "minimax",
   *     config: { duration: 5 }
   *   }
   * }
   * 
   * Requirement: 7.2
   */
  nodeConfigs?: {
    [nodeId: string]: NodeConfig;
  };
  
  /**
   * Edge mappings to define data flow between nodes
   * 
   * Maps edge keys (format: "sourceId->targetId") to data mappings.
   * This allows specifying how data flows from source outputs to target inputs.
   * 
   * Example:
   * {
   *   "scriptGen->videoGen": {
   *     prompt: "output.script.scenes[0].description",
   *     duration: "5"
   *   },
   *   "videoGen->assemble": {
   *     clips: "output.videoUrl"
   *   }
   * }
   * 
   * Requirement: 7.3
   */
  edgeMappings?: {
    [edgeKey: string]: EdgeMapping;  // "A->B": { targetInput: "sourceOutputPath" }
  };
}
