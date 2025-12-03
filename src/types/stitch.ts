/**
 * Core TypeScript type definitions for Stitch orchestration engine
 * Defines all interfaces, types, and enums for flows, runs, nodes, and worker protocol
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Node types supported by the Stitch engine
 */
export type NodeType = 'Worker' | 'UX' | 'Splitter' | 'Collector';

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
  [key: string]: any;
}

// ============================================================================
// Graph Structure
// ============================================================================

/**
 * Node definition in a flow graph
 */
export interface StitchNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeConfig;
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
  output?: any;
  error?: string;
}

/**
 * Run instance stored in stitch_runs table
 * Represents an execution of a flow with its state
 */
export interface StitchRun {
  id: string;
  flow_id: string;
  node_states: Record<string, NodeState>;
  created_at: string;
  updated_at: string;
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
  input: any;
  callbackUrl: string;
}

/**
 * Callback payload sent from workers back to Stitch
 * Workers send this to report completion or failure
 */
export interface WorkerCallback {
  status: 'completed' | 'failed';
  output?: any;
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
