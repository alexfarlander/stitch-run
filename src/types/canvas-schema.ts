/**
 * Canvas Schema Type Definitions
 * 
 * Defines the structure for visual graphs (UI representation) used in the Canvas as Data feature.
 * These types represent the complete React Flow JSON structure including UI properties.
 * 
 * Related: execution-graph.ts (optimized runtime representation)
 */

import React from 'react';

// ============================================================================
// Input/Output Schema Types
// ============================================================================

/**
 * Input schema definition for node inputs
 * Defines the type, requirements, and metadata for a node's input parameter
 */
export interface InputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  required: boolean;
  description?: string;
  default?: any;
}

/**
 * Output schema definition for node outputs
 * Defines the type and metadata for a node's output value
 */
export interface OutputSchema {
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  description?: string;
}

// ============================================================================
// Entity Movement Configuration
// ============================================================================

/**
 * Entity movement configuration for worker nodes
 * Defines how entities should move based on worker outcomes
 */
export interface EntityMovementConfig {
  onSuccess?: EntityMovementAction;
  onFailure?: EntityMovementAction;
}

/**
 * Entity movement action specification
 * Defines target section and completion status for entity movement
 */
export interface EntityMovementAction {
  targetSectionId: string;     // Section node ID to move entity to
  completeAs: 'success' | 'failure' | 'neutral';  // How to mark completion
  setEntityType?: 'customer' | 'churned' | 'lead';  // Optional: Convert entity type
}

// ============================================================================
// Edge Mapping Types
// ============================================================================

/**
 * Edge mapping defines how data flows between nodes
 * Maps target node input parameters to source node output paths
 * 
 * Example:
 * {
 *   "prompt": "output.text",           // Simple path
 *   "scenes": "result.data.scenes",    // Nested path
 *   "duration": "5"                    // Static value
 * }
 */
export interface EdgeMapping {
  [targetInput: string]: string;  // JSONPath or simple key
}

// ============================================================================
// Visual Node Types
// ============================================================================

/**
 * Visual node with UI properties
 * Contains all React Flow properties including positions and styles
 * This is the complete node representation used in the canvas editor
 */
export interface VisualNode {
  id: string;
  type: string;  // worker, ux, splitter, collector, section, item, etc.
  position: { x: number; y: number };
  data: {
    label: string;
    worker_type?: string;  // For worker nodes: claude, minimax, elevenlabs, shotstack, etc.
    config?: Record<string, any>;  // Worker-specific configuration
    
    // Input/Output schema (for validation and mapping)
    inputs?: Record<string, InputSchema>;
    outputs?: Record<string, OutputSchema>;
    
    // Entity movement configuration (for worker nodes)
    entityMovement?: EntityMovementConfig;
    
    // Allow additional custom data
    [key: string]: any;
  };
  
  // React Flow properties for nesting and layout
  parentNode?: string;  // For nested nodes (items in sections) - React Flow v12+ uses parentNode
  extent?: 'parent';    // Keeps item inside the parent when dragging
  style?: React.CSSProperties;  // UI styling
  width?: number;       // Explicit width for section boxes
  height?: number;      // Explicit height for section boxes
}

// ============================================================================
// Visual Edge Types
// ============================================================================

/**
 * Visual edge with data mapping
 * Represents a connection between nodes with optional data flow configuration
 */
export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // For nodes with multiple outputs
  targetHandle?: string;  // For nodes with multiple inputs
  type?: string;          // default, journey, etc.
  animated?: boolean;
  style?: React.CSSProperties;
  
  // Data mapping between nodes
  data?: {
    mapping?: EdgeMapping;  // How to wire outputs to inputs
    [key: string]: any;     // Allow additional custom data
  };
}

// ============================================================================
// Visual Graph Types
// ============================================================================

/**
 * Visual graph structure for UI rendering
 * Contains all React Flow properties including positions and styles
 * This is the complete canvas representation used in the editor
 */
export interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}
