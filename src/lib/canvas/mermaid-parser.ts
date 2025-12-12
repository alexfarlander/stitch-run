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
// Mermaid Error Types
// ============================================================================

/**
 * Custom error class for Mermaid parsing errors
 * Includes line numbers and syntax hints for better debugging
 * Requirements: 3.5, 9.4
 */
export class MermaidParseError extends Error {
  constructor(
    message: string,
    public lineNumber?: number,
    public line?: string,
    public hint?: string
  ) {
    super(message);
    this.name = 'MermaidParseError';
  }

  /**
   * Get formatted error message with line number and hint
   */
  getDetailedMessage(): string {
    let msg = this.message;
    
    if (this.lineNumber !== undefined) {
      msg += ` (line ${this.lineNumber})`;
    }
    
    if (this.line) {
      msg += `\n  Line: ${this.line}`;
    }
    
    if (this.hint) {
      msg += `\n  Hint: ${this.hint}`;
    }
    
    return msg;
  }
}

// ============================================================================
// Parsed Mermaid Types
// ============================================================================

interface ParsedNode {
  id: string;
  label: string;
  bracketStyle?: 'square' | 'round' | 'curly';
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
    
    // Infer node type from bracket style first, then label, or use explicit config
    let nodeType: string;
    if (config?.workerType) {
      // If workerType is specified, it's a worker node
      nodeType = 'worker';
    } else if (node.bracketStyle) {
      // Infer from bracket style (most reliable for round-trip)
      nodeType = inferNodeTypeFromBracketStyle(node.bracketStyle, node.label);
    } else {
      // Fall back to label-based inference
      nodeType = inferNodeType(node.label);
    }
    
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
 * @throws MermaidParseError if syntax is invalid
 * 
 * Requirements: 3.5, 9.4
 */
function parseMermaidSyntax(mermaid: string): ParsedMermaid {
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const nodeMap = new Map<string, ParsedNode>();
  
  // Validate input
  if (!mermaid || typeof mermaid !== 'string') {
    throw new MermaidParseError(
      'Invalid Mermaid input: expected non-empty string',
      undefined,
      undefined,
      'Provide a valid Mermaid flowchart string'
    );
  }
  
  // Split into lines and clean
  const lines = mermaid
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('%%'));  // Remove comments
  
  // Check if we have any content
  if (lines.length === 0) {
    throw new MermaidParseError(
      'Empty Mermaid diagram',
      undefined,
      undefined,
      'Add at least a flowchart declaration and one node'
    );
  }
  
  // Check for flowchart declaration
  const firstLine = lines[0];
  if (!firstLine.startsWith('flowchart') && !firstLine.startsWith('graph')) {
    throw new MermaidParseError(
      'Missing flowchart declaration',
      1,
      firstLine,
      'Start with "flowchart LR" or "flowchart TD"'
    );
  }
  
  // Validate flowchart direction
  const directionMatch = firstLine.match(/^(flowchart|graph)\s+(LR|TD|TB|RL|BT)$/);
  if (!directionMatch) {
    throw new MermaidParseError(
      'Invalid flowchart direction',
      1,
      firstLine,
      'Use one of: LR (left-right), TD/TB (top-down), RL (right-left), BT (bottom-top)'
    );
  }
  
  // Parse each line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    try {
      // Parse edges (A --> B or A --> B --> C)
      if (line.includes('-->')) {
        parseEdgeLine(line, nodeMap, edges, lineNumber);
      } else {
        // Parse standalone node definition (no edges)
        const node = parseNodeSegment(line);
        if (node && !nodeMap.has(node.id)) {
          nodeMap.set(node.id, node);
        } else if (!node) {
          throw new MermaidParseError(
            'Invalid node syntax',
            lineNumber,
            line,
            'Use format: NodeId[Label] or NodeId(Label) or NodeId{Label}'
          );
        }
      }
    } catch (error) {
      // Re-throw MermaidParseError with line context if not already set
      if (error instanceof MermaidParseError) {
        if (error.lineNumber === undefined) {
          throw new MermaidParseError(
            error.message,
            lineNumber,
            line,
            error.hint
          );
        }
        throw error;
      }
      // Wrap other errors
      throw new MermaidParseError(
        `Parse error: ${error instanceof Error ? error.message : String(error)}`,
        lineNumber,
        line,
        'Check syntax for typos or invalid characters'
      );
    }
  }
  
  // Validate we have at least one node
  if (nodeMap.size === 0) {
    throw new MermaidParseError(
      'No nodes found in diagram',
      undefined,
      undefined,
      'Add at least one node definition like: A[My Node]'
    );
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
 * @param lineNumber - Line number for error reporting
 * @throws MermaidParseError if edge syntax is invalid
 * 
 * Requirements: 3.5, 9.4
 */
function parseEdgeLine(
  line: string,
  nodeMap: Map<string, ParsedNode>,
  edges: ParsedEdge[],
  lineNumber?: number
): void {
  // Split by arrow to get node segments
  const segments = line.split('-->').map(s => s.trim());
  
  // Validate we have at least 2 segments (source and target)
  if (segments.length < 2) {
    throw new MermaidParseError(
      'Invalid edge definition: missing source or target',
      lineNumber,
      line,
      'Edge syntax requires at least two nodes: A --> B'
    );
  }
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // Validate segment is not empty
    if (!segment) {
      throw new MermaidParseError(
        'Invalid edge definition: empty node segment',
        lineNumber,
        line,
        'Check for extra arrows or missing node definitions'
      );
    }
    
    // Extract node ID and label from segment
    const node = parseNodeSegment(segment);
    
    if (!node) {
      throw new MermaidParseError(
        `Invalid node syntax in edge: "${segment}"`,
        lineNumber,
        line,
        'Use format: NodeId[Label] or NodeId(Label) or NodeId{Label}'
      );
    }
    
    // Add node if not already seen
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
    }
    
    // Create edge to next segment
    if (i < segments.length - 1) {
      const nextSegment = segments[i + 1];
      const nextNode = parseNodeSegment(nextSegment);
      
      if (!nextNode) {
        throw new MermaidParseError(
          `Invalid target node syntax: "${nextSegment}"`,
          lineNumber,
          line,
          'Use format: NodeId[Label] or NodeId(Label) or NodeId{Label}'
        );
      }
      
      edges.push({
        source: node.id,
        target: nextNode.id
      });
    }
  }
}

/**
 * Parse a node segment to extract ID, label, and bracket style
 * 
 * Supported formats:
 * - A[Label] - Rectangle (UX nodes)
 * - A(Label) - Rounded rectangle (Worker nodes)
 * - A{Label} - Diamond (Splitter/Collector nodes)
 * - A - Just ID (label = ID)
 * 
 * @param segment - Node segment string
 * @returns Parsed node with bracket style or null if invalid
 * 
 * Requirements: 3.5, 9.4
 */
interface ParsedNodeWithStyle extends ParsedNode {
  bracketStyle?: 'square' | 'round' | 'curly';
}

function parseNodeSegment(segment: string): ParsedNodeWithStyle | null {
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
      label: bracketMatch[2].trim(),
      bracketStyle: 'square'
    };
  }
  
  if (parenMatch) {
    return {
      id: parenMatch[1],
      label: parenMatch[2].trim(),
      bracketStyle: 'round'
    };
  }
  
  if (braceMatch) {
    return {
      id: braceMatch[1],
      label: braceMatch[2].trim(),
      bracketStyle: 'curly'
    };
  }
  
  // Just an ID without label
  if (/^\w+$/.test(segment)) {
    return {
      id: segment,
      label: segment
    };
  }
  
  // Check for common syntax errors and provide helpful hints
  if (segment.includes('[') && !segment.includes(']')) {
    throw new MermaidParseError(
      `Unclosed bracket in node definition: "${segment}"`,
      undefined,
      segment,
      'Make sure brackets are properly closed: A[Label]'
    );
  }
  
  if (segment.includes('(') && !segment.includes(')')) {
    throw new MermaidParseError(
      `Unclosed parenthesis in node definition: "${segment}"`,
      undefined,
      segment,
      'Make sure parentheses are properly closed: A(Label)'
    );
  }
  
  if (segment.includes('{') && !segment.includes('}')) {
    throw new MermaidParseError(
      `Unclosed brace in node definition: "${segment}"`,
      undefined,
      segment,
      'Make sure braces are properly closed: A{Label}'
    );
  }
  
  if (segment.includes(' ') && !segment.match(/[\[\(\{]/)) {
    throw new MermaidParseError(
      `Invalid node ID with spaces: "${segment}"`,
      undefined,
      segment,
      'Node IDs cannot contain spaces. Use brackets for labels: A[My Label]'
    );
  }
  
  // Generic invalid syntax
  return null;
}

// ============================================================================
// Type Inference Functions
// ============================================================================

/**
 * Infer node type from Mermaid bracket style
 * This is the most reliable method for round-trip conversion
 * 
 * Bracket style mapping:
 * - square [] : UX nodes (user interaction)
 * - round () : Worker nodes (processing)
 * - curly {} : Splitter/Collector nodes (branching/merging)
 * 
 * For curly braces, we use the label to distinguish between splitter and collector.
 * 
 * @param bracketStyle - The bracket style used in Mermaid
 * @param label - The node label (used to distinguish splitter vs collector)
 * @returns Inferred node type
 */
function inferNodeTypeFromBracketStyle(bracketStyle: 'square' | 'round' | 'curly', label: string): string {
  switch (bracketStyle) {
    case 'square':
      return 'ux';
    case 'round':
      return 'worker';
    case 'curly':
      // Use label to distinguish between splitter and collector
      const lower = label.toLowerCase();
      if (
        lower.includes('collect') ||
        lower.includes('merge') ||
        lower.includes('join') ||
        lower.includes('combine') ||
        lower.includes('wait')
      ) {
        return 'collector';
      }
      // Default to splitter for curly braces
      return 'splitter';
    default:
      return 'worker';
  }
}

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
