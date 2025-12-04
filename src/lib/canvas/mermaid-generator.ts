/**
 * Mermaid Generator
 * 
 * Converts visual graphs back to Mermaid flowchart syntax.
 * Preserves graph structure (nodes and edges) but may lose detailed configurations.
 * 
 * Key Features:
 * - Converts nodes to Mermaid node definitions
 * - Converts edges to Mermaid connections
 * - Generates valid Mermaid flowchart syntax
 * - Preserves graph structure for round-trip compatibility
 * 
 * Requirements: 6.3, 6.5
 */

import { VisualGraph, VisualNode, VisualEdge } from '@/types/canvas-schema';

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Convert visual graph to Mermaid flowchart syntax
 * 
 * Generates a valid Mermaid flowchart that preserves the graph structure.
 * Node labels and connections are preserved, but detailed configurations
 * (worker configs, entity movement, etc.) are not included in the output.
 * 
 * @param graph - Visual graph to convert
 * @returns Mermaid flowchart syntax string
 * 
 * Requirements:
 * - 6.3: Generate valid Mermaid flowchart syntax
 * - 6.5: Preserve graph structure (nodes and edges)
 */
export function canvasToMermaid(graph: VisualGraph): string {
  const lines: string[] = [];
  
  // 1. Add flowchart declaration
  lines.push('flowchart LR');
  lines.push('');
  
  // 2. Convert nodes to Mermaid definitions
  const nodeDefinitions = generateNodeDefinitions(graph.nodes);
  if (nodeDefinitions.length > 0) {
    lines.push('  %% Nodes');
    lines.push(...nodeDefinitions);
    lines.push('');
  }
  
  // 3. Convert edges to Mermaid connections
  const edgeDefinitions = generateEdgeDefinitions(graph.edges);
  if (edgeDefinitions.length > 0) {
    lines.push('  %% Connections');
    lines.push(...edgeDefinitions);
  }
  
  return lines.join('\n');
}

// ============================================================================
// Node Definition Generator
// ============================================================================

/**
 * Generate Mermaid node definitions from visual nodes
 * 
 * Converts each node to Mermaid syntax with appropriate shape:
 * - UX nodes: [Label] (rectangle)
 * - Splitter/Collector nodes: {Label} (diamond)
 * - Worker nodes: (Label) (rounded rectangle)
 * - Other nodes: [Label] (rectangle, default)
 * 
 * @param nodes - Visual nodes to convert
 * @returns Array of Mermaid node definition strings
 */
function generateNodeDefinitions(nodes: VisualNode[]): string[] {
  const definitions: string[] = [];
  
  for (const node of nodes) {
    const shape = getNodeShape(node);
    const label = sanitizeLabel(node.data.label || node.id);
    const definition = `  ${node.id}${shape.open}${label}${shape.close}`;
    definitions.push(definition);
  }
  
  return definitions;
}

/**
 * Get Mermaid shape delimiters for a node based on its type
 * 
 * Shape mapping:
 * - ux: [Label] - Rectangle (user interaction)
 * - splitter: {Label} - Diamond (decision/branching)
 * - collector: {Label} - Diamond (merging/joining)
 * - worker: (Label) - Rounded rectangle (processing)
 * - default: [Label] - Rectangle
 * 
 * @param node - Visual node
 * @returns Shape delimiters (open and close)
 */
function getNodeShape(node: VisualNode): { open: string; close: string } {
  switch (node.type) {
    case 'ux':
      return { open: '[', close: ']' };
    
    case 'splitter':
    case 'collector':
      return { open: '{', close: '}' };
    
    case 'worker':
      return { open: '(', close: ')' };
    
    default:
      return { open: '[', close: ']' };
  }
}

/**
 * Sanitize label text for Mermaid syntax
 * 
 * Removes or escapes characters that could break Mermaid parsing:
 * - Removes brackets, parentheses, braces
 * - Trims whitespace
 * - Limits length to prevent overly long labels
 * 
 * @param label - Original label text
 * @returns Sanitized label safe for Mermaid
 */
function sanitizeLabel(label: string): string {
  return label
    .replace(/[\[\]\(\)\{\}]/g, '')  // Remove shape delimiters
    .trim()
    .slice(0, 100);  // Limit length
}

// ============================================================================
// Edge Definition Generator
// ============================================================================

/**
 * Generate Mermaid edge definitions from visual edges
 * 
 * Converts each edge to Mermaid arrow syntax: A --> B
 * Groups edges by source node to create chains where possible
 * 
 * @param edges - Visual edges to convert
 * @returns Array of Mermaid edge definition strings
 */
function generateEdgeDefinitions(edges: VisualEdge[]): string[] {
  const definitions: string[] = [];
  
  // Group edges by source for cleaner output
  const edgesBySource = new Map<string, string[]>();
  
  for (const edge of edges) {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source)!.push(edge.target);
  }
  
  // Generate edge definitions
  for (const [source, targets] of edgesBySource.entries()) {
    if (targets.length === 1) {
      // Single edge: A --> B
      definitions.push(`  ${source} --> ${targets[0]}`);
    } else {
      // Multiple edges from same source: separate lines for clarity
      for (const target of targets) {
        definitions.push(`  ${source} --> ${target}`);
      }
    }
  }
  
  return definitions;
}
