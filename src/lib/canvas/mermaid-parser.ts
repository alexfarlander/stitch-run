/**
 * Mermaid Parser
 * 
 * Parses Mermaid flowchart syntax into visual graphs.
 * Supports node type inference, worker type inference, and optional configurations.
 * 
 * Key Features:
 * - Parses Mermaid flowchart syntax (LR, TD, TB)
 * - Infers node types from labels (ux, worker, splitter, collector)
 * - Infers worker types from labels (claude, minimax, elevenlabs, shotstack)
 * - Applies optional nodeConfigs for detailed configuration
 * - Applies optional edgeMappings for data flow specification
 * - Auto-layouts nodes to prevent overlap
 * 
 * Requirements: 6.1, 6.2, 6.4, 7.1, 7.2, 7.3
 */

import { VisualGraph, VisualNode, VisualEdge, EdgeMapping } from '@/types/canvas-schema';
import { NodeConfig } from '@/types/workflow-creation';
import { autoLayout } from './auto-layout';

// ============================================================================
// Parsed Mermaid Types
// ============================================================================

interface ParsedNode {
  id: string;
  label: string;
}

interface ParsedEdge {
  source: string;
  target: string;
}

interface ParsedMermaid {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parse Mermaid flowchart to visual graph
 * Supports optional node configs and edge mappings
 * 
 * @param mermaid - Mermaid flowchart syntax string
 * @param nodeConfigs - Optional detailed node configurations
 * @param edgeMappings - Optional edge data mappings
 * @returns Visual graph with auto-layouted nodes
 * 
 * Requirements:
 * - 6.1: Parse Mermaid syntax and extract nodes/edges
 * - 6.2: Infer worker types from labels
 * - 6.4: Apply default configs when not provided
 * - 7.1: Support Mermaid-only workflow creation
 * - 7.2: Support Mermaid + nodeConfigs
 * - 7.3: Support Mermaid + edgeMappings
 */
export function mermaidToCanvas(
  mermaid: string,
  nodeConfigs?: Record<string, NodeConfig>,
  edgeMappings?: Record<string, EdgeMapping>
): VisualGraph {
  // 1. Parse Mermaid syntax
  const parsed = parseMermaidSyntax(mermaid);
  
  // 2. Extract nodes with inferred types and configs
  const nodes: VisualNode[] = parsed.nodes.map(node => {
    const config = nodeConfigs?.[node.id];
    
    // Infer node type from label or use explicit config
    const nodeType = config?.workerType 
      ? 'worker'  // If workerType is specified, it's a worker node
      : inferNodeType(node.label);
    
    // Infer worker type from label or use explicit config
    const workerType = config?.workerType || inferWorkerType(node.label);
    
    return {
      id: node.id,
      type: nodeType,
      position: { x: 0, y: 0 },  // Will be set by auto-layout
      data: {
        label: node.label,
        worker_type: workerType,
        config: config?.config || {},
        entityMovement: config?.entityMovement
      }
    };
  });
  
  // 3. Extract edges with optional mappings
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

// ============================================================================
// Mermaid Syntax Parser
// ============================================================================

/**
 * Parse Mermaid flowchart syntax
 * Supports basic flowchart syntax with nodes and edges
 * 
 * Supported syntax:
 * - flowchart LR / TD / TB
 * - Node definitions: A[Label], B(Label), C{Label}
 * - Edge definitions: A --> B, A --> B --> C
 * - Labels with spaces: A[User Input]
 * 
 * @param mermaid - Mermaid syntax string
 * @returns Parsed nodes and edges
 */
function parseMermaidSyntax(mermaid: string): ParsedMermaid {
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const nodeMap = new Map<string, ParsedNode>();
  
  // Split into lines and clean
  const lines = mermaid
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('%%'));  // Remove comments
  
  for (const line of lines) {
    // Skip flowchart declaration
    if (line.startsWith('flowchart') || line.startsWith('graph')) {
      continue;
    }
    
    // Parse edges (A --> B or A --> B --> C)
    if (line.includes('-->')) {
      parseEdgeLine(line, nodeMap, edges);
    }
  }
  
  // Convert node map to array
  nodes.push(...nodeMap.values());
  
  return { nodes, edges };
}

/**
 * Parse a line containing edge definitions
 * Handles chains like: A --> B --> C
 * Extracts node definitions along the way
 * 
 * @param line - Line containing edge syntax
 * @param nodeMap - Map to store discovered nodes
 * @param edges - Array to store discovered edges
 */
function parseEdgeLine(
  line: string,
  nodeMap: Map<string, ParsedNode>,
  edges: ParsedEdge[]
): void {
  // Split by arrow to get node segments
  const segments = line.split('-->').map(s => s.trim());
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // Extract node ID and label from segment
    const node = parseNodeSegment(segment);
    
    if (node) {
      // Add node if not already seen
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
      
      // Create edge to next segment
      if (i < segments.length - 1) {
        const nextSegment = segments[i + 1];
        const nextNode = parseNodeSegment(nextSegment);
        
        if (nextNode) {
          edges.push({
            source: node.id,
            target: nextNode.id
          });
        }
      }
    }
  }
}

/**
 * Parse a node segment to extract ID and label
 * 
 * Supported formats:
 * - A[Label] - Rectangle
 * - A(Label) - Rounded rectangle
 * - A{Label} - Diamond
 * - A - Just ID (label = ID)
 * 
 * @param segment - Node segment string
 * @returns Parsed node or null if invalid
 */
function parseNodeSegment(segment: string): ParsedNode | null {
  segment = segment.trim();
  
  if (!segment) {
    return null;
  }
  
  // Match patterns: A[Label], A(Label), A{Label}
  const bracketMatch = segment.match(/^(\w+)\[([^\]]+)\]$/);
  const parenMatch = segment.match(/^(\w+)\(([^)]+)\)$/);
  const braceMatch = segment.match(/^(\w+)\{([^}]+)\}$/);
  
  if (bracketMatch) {
    return {
      id: bracketMatch[1],
      label: bracketMatch[2].trim()
    };
  }
  
  if (parenMatch) {
    return {
      id: parenMatch[1],
      label: parenMatch[2].trim()
    };
  }
  
  if (braceMatch) {
    return {
      id: braceMatch[1],
      label: braceMatch[2].trim()
    };
  }
  
  // Just an ID without label
  if (/^\w+$/.test(segment)) {
    return {
      id: segment,
      label: segment
    };
  }
  
  return null;
}

// ============================================================================
// Type Inference Functions
// ============================================================================

/**
 * Infer node type from label
 * Looks for keywords in the label to determine node type
 * 
 * Keywords:
 * - UX: user input, form, button, user interface, ui
 * - Splitter: split, branch, fork, parallel
 * - Collector: collect, merge, join, combine, wait
 * - Worker: (default if no other match)
 * 
 * @param label - Node label text
 * @returns Inferred node type
 * 
 * Requirement: 6.1 - Infer node types from labels
 */
function inferNodeType(label: string): string {
  const lower = label.toLowerCase();
  
  // UX nodes - be more specific to avoid false positives
  if (
    lower.includes('user input') ||
    lower.includes('form') ||
    lower.includes('button') ||
    lower.includes('user interface') ||
    lower.match(/\bui\b/) ||  // Match "ui" as whole word
    lower.includes('interface')
  ) {
    return 'ux';
  }
  
  // Splitter nodes
  if (
    lower.includes('split') ||
    lower.includes('branch') ||
    lower.includes('fork') ||
    lower.includes('parallel')
  ) {
    return 'splitter';
  }
  
  // Collector nodes
  if (
    lower.includes('collect') ||
    lower.includes('merge') ||
    lower.includes('join') ||
    lower.includes('combine') ||
    lower.includes('wait')
  ) {
    return 'collector';
  }
  
  // Default to worker
  return 'worker';
}

/**
 * Infer worker type from label
 * Looks for worker-specific keywords in the label
 * 
 * Supported workers:
 * - claude: claude, gpt, ai, script, text
 * - shotstack: shotstack, assemble, edit, compose (check before minimax)
 * - minimax: minimax, video, visual
 * - elevenlabs: elevenlabs, audio, voice, speech, sound
 * 
 * @param label - Node label text
 * @returns Inferred worker type or undefined
 * 
 * Requirement: 6.2 - Infer worker types from labels
 */
function inferWorkerType(label: string): string | undefined {
  const lower = label.toLowerCase();
  
  // Claude (text generation)
  if (
    lower.includes('claude') ||
    lower.includes('gpt') ||
    lower.includes('ai') ||
    lower.includes('script') ||
    lower.includes('generate text')
  ) {
    return 'claude';
  }
  
  // Shotstack (video assembly) - check before minimax to avoid "video" match
  if (
    lower.includes('shotstack') ||
    lower.includes('assemble') ||
    lower.includes('edit') ||
    lower.includes('compose')
  ) {
    return 'shotstack';
  }
  
  // Minimax (video generation)
  if (
    lower.includes('minimax') ||
    lower.includes('video') ||
    lower.includes('visual')
  ) {
    return 'minimax';
  }
  
  // ElevenLabs (audio generation)
  if (
    lower.includes('elevenlabs') ||
    lower.includes('audio') ||
    lower.includes('voice') ||
    lower.includes('speech') ||
    lower.includes('sound')
  ) {
    return 'elevenlabs';
  }
  
  return undefined;
}
