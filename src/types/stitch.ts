/**
 * Core TypeScript type definitions for Stitch orchestration engine
 * Defines all interfaces, types, and enums for flows, runs, nodes, and worker protocol
 */

import React from 'react';

// ============================================================================
// Enums
// ============================================================================

/**
 * Node types supported by the Stitch engine
 */
export type NodeType = 
  | 'Worker' 
  | 'UX' 
  | 'Splitter' 
  | 'Collector' 
  | 'MediaSelect' 
  | 'section' 
  | 'section-item'
  | 'integration-item'
  | 'person-item'
  | 'code-item'
  | 'data-item'
  | 'costs-section'
  | 'revenue-section';

/**
 * Node execution status
 */
export type NodeStatus = 
  | 'pending'       // Node is waiting to be executed
  | 'running'       // Node is currently executing
  | 'completed'     // Node has finished successfully
  | 'failed'        // Node execution failed
  | 'waiting_for_user'; // UX node waiting for human input

// ============================================================================
// Node Configuration
// ============================================================================

/**
 * Node configuration stored in node.data
 * Different node types use different config properties
 */
export interface NodeConfig {
  // Worker node config
  webhookUrl?: string;
  workerType?: string; // Type of integrated worker (e.g., "claude", "minimax", "elevenlabs", "shotstack")
  
  // Splitter node config
  arrayPath?: string; // JSON path to extract array (e.g., "items" or "data.results")
  
  // UX node config
  prompt?: string;
  
  // Common config
  label?: string;
  
  // Allow additional custom configuration
  // NOTE: This is intentionally permissive because node configs are user-defined JSON blobs
  // stored in the DB and vary by worker/node type.
  [key: string]: any;
}

/**
 * Worker node data with entity movement configuration
 * Extends NodeConfig with webhook-specific entity movement behavior
 */
export interface WorkerNodeData extends NodeConfig {
  webhookUrl?: string;
  workerType?: string;
  entityMovement?: EntityMovementConfig;
}

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
  setEntityType?: 'customer' | 'churned' | 'lead';  // Optional: Convert entity type (e.g., lead → customer)
}

// ============================================================================
// Graph Structure
// ============================================================================

/**
 * Node definition in a flow graph
 * Includes React Flow specific properties for nesting and styling
 */
export interface StitchNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeConfig;
  
  // React Flow properties for BMC nesting and layout
  parentId?: string;           // Links an item to its Section (for nested nodes) - React Flow v12+ uses parentId
  extent?: 'parent';           // Keeps item inside the Section when dragging
  style?: React.CSSProperties; // Needed for Section width/height/colors
  width?: number;              // Explicit width for Section boxes
  height?: number;             // Explicit height for Section boxes
}

/**
 * Edge definition connecting nodes in a flow graph
 */
export interface StitchEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string; // e.g., 'journey'
  animated?: boolean;
  style?: React.CSSProperties;
  data?: {
    intensity?: number;
    stats?: JourneyEdgeData;
    [key: string]: unknown;
  };
}

// ============================================================================
// Flow Definition
// ============================================================================

/**
 * Flow definition stored in stitch_flows table
 * Represents a visual workflow graph
 */
export interface StitchFlow {
  id: string;
  name: string;
  graph: {
    nodes: StitchNode[];
    edges: StitchEdge[];
  };
  canvas_type: 'bmc' | 'workflow' | 'detail';
  parent_id: string | null;
  current_version_id: string | null;  // Points to latest version
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Run Execution State
// ============================================================================

/**
 * Node execution state for a specific run
 */
export interface NodeState {
  status: NodeStatus;
  output?: unknown;
  error?: string;
  
  // Collector-specific state tracking (Requirements 1.7, 9.4)
  upstream_completed_count?: number;
  expected_upstream_count?: number;
  upstream_outputs?: Record<string, unknown>;
}

/**
 * Trigger metadata for workflow runs
 * Records what initiated a workflow execution
 */
export interface TriggerMetadata {
  type: 'webhook' | 'manual' | 'scheduled' | 'entity_arrival';
  source: string | null;
  event_id: string | null;
  timestamp: string;
}

/**
 * Run instance stored in stitch_runs table
 * Represents an execution of a flow with its state
 */
export interface StitchRun {
  id: string;
  flow_id: string;
  flow_version_id: string | null;  // Link to specific version (Requirement 1.3, 5.2)
  entity_id: string | null;  // Link to entity
  node_states: Record<string, NodeState>;
  trigger: TriggerMetadata;  // Trigger information
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BMC Architecture Types
// ============================================================================

/**
 * Journey entry tracking entity movement through canvas sections
 */
export interface JourneyEntry {
  node_id: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Entity tracked through the canvas (customer, lead, etc.)
 * Stored in stitch_entities table
 */
export interface StitchEntity {
  id: string;
  canvas_id: string;
  name: string;
  avatar_url: string | null;
  entity_type: string;
  
  // Position tracking (mutually exclusive)
  current_node_id: string | null;      // At a station
  current_edge_id: string | null;      // On a path
  edge_progress: number | null;        // 0.0 to 1.0 when on edge
  
  journey: JourneyEntry[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Journey event tracking entity movement through the workflow
 * Stored in stitch_journey_events table
 */
export interface JourneyEvent {
  id: string;
  entity_id: string;
  event_type:
    | 'edge_start'
    | 'edge_progress'
    | 'node_arrival'
    | 'node_complete'
    | 'node_failure'
    | 'manual_move';
  node_id: string | null;
  edge_id: string | null;
  progress: number | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/**
 * Edge statistics for tracking entity traffic and conversion
 */
export interface JourneyEdgeData {
  edge_id: string;
  current_entity_count: number;      // Entities currently on this edge
  total_entity_count: number;        // Total entities that have traversed
  conversion_rate: number | null;    // Ratio of completions to starts
  average_duration_ms: number | null; // Average time to traverse
}

/**
 * Section node used in BMC canvases
 * Extends StitchNode with BMC-specific data
 */
export interface SectionNode extends StitchNode {
  type: 'section';
  data: NodeConfig & {
    label: string;
    category: 'Production' | 'Customer' | 'Financial';
  };
}

// ============================================================================
// Webhook System Types
// ============================================================================

/**
 * Entity mapping configuration for webhooks
 * Defines how webhook payload fields map to entity attributes
 */
export interface EntityMapping {
  name: string;              // JSON path or static value
  email?: string;            // JSON path or static value
  entity_type: string;       // JSON path or static value
  avatar_url?: string;       // JSON path or static value
  metadata?: Record<string, string>; // Map of field name to JSON path
}

/**
 * Webhook configuration stored in stitch_webhook_configs table
 * Defines how a webhook endpoint processes incoming requests
 */
export interface WebhookConfig {
  id: string;
  canvas_id: string;
  name: string;
  source: string;
  endpoint_slug: string;
  secret: string | null;
  require_signature: boolean;  // When true, webhooks without valid signatures are rejected
  workflow_id: string;
  entry_edge_id: string;
  entity_mapping: EntityMapping;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Webhook event stored in stitch_webhook_events table
 * Audit log for all received webhook requests
 */
export interface WebhookEvent {
  id: string;
  webhook_config_id: string;
  received_at: string;
  payload: Record<string, unknown>;
  entity_id: string | null;
  workflow_run_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  processed_at: string | null;
}

// ============================================================================
// Worker Protocol
// ============================================================================

/**
 * Payload sent from Stitch to external workers
 * Workers receive this when a Worker node is fired
 */
export interface WorkerPayload {
  runId: string;
  nodeId: string;
  config: NodeConfig;
  input: unknown;
  callbackUrl: string;
}

/**
 * Callback payload sent from workers back to Stitch
 * Workers send this to report completion or failure
 */
export interface WorkerCallback {
  status: 'completed' | 'failed';
  output?: unknown;
  error?: string;
}

// ============================================================================
// Worker Integration Types
// ============================================================================

/**
 * Scene structure used in video generation workflows
 * Output from Claude, consumed by MiniMax and ElevenLabs
 */
export interface Scene {
  visual_prompt: string;  // Text description for video generation
  voice_text: string;     // Text for voice narration
  duration?: number;      // Optional duration in seconds
  videoUrl?: string;      // URL to generated video (from MiniMax)
  audioUrl?: string;      // URL to generated audio (from ElevenLabs)
}

/**
 * Shotstack clip asset definition
 */
export interface ShotstackAsset {
  type: 'video' | 'audio';
  src: string;  // URL to the asset
}

/**
 * Shotstack clip definition
 */
export interface ShotstackClip {
  asset: ShotstackAsset;
  start: number;  // Start time in seconds
  length: number; // Duration in seconds
}

/**
 * Shotstack track definition
 */
export interface ShotstackTrack {
  clips: ShotstackClip[];
}

/**
 * Shotstack timeline structure for video assembly
 */
export interface ShotstackTimeline {
  background: string;  // Background color (e.g., "#000000")
  tracks: ShotstackTrack[];
}

/**
 * Shotstack API payload
 */
export interface ShotstackPayload {
  timeline: ShotstackTimeline;
  output: {
    format: string;      // e.g., "mp4"
    resolution: string;  // e.g., "sd", "hd", "1080"
  };
  callback: string;  // Callback URL
}
