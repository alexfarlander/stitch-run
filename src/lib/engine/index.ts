/**
 * Modern Execution Engine (ExecutionGraph-based)
 *
 * This module exports the modern O(1) execution engine.
 * For legacy O(E) functions, see src/lib/engine/legacy/
 *
 * Main entry points:
 * - startRun: Start a new workflow execution
 * - walkEdges: Process edge traversal after node completion
 * - walkParallelEdges: Process journey + system edges in parallel
 * - fireNodeWithGraph: Fire a node using ExecutionGraph
 */

export {
  startRun,
  walkEdges,
  walkParallelEdges,
  fireNodeWithGraph,
} from './edge-walker';
