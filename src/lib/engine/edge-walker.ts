/**
 * Edge-Walking Orchestration
 * Implements the edge-walking execution model
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { StitchFlow, StitchRun, StitchNode } from '@/types/stitch';
import {
  getOutboundEdges,
  getTargetNodes,
  areUpstreamDependenciesCompleted,
  mergeUpstreamOutputs,
  isTerminalNode,
} from './index';
import { fireWorkerNode } from './handlers/worker';
import { fireUXNode } from './handlers/ux';
import { fireSplitterNode } from './handlers/splitter';
import { fireCollectorNode } from './handlers/collector';

/**
 * Walks edges from a completed node and fires downstream nodes
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 * 
 * @param completedNodeId - The ID of the node that just completed
 * @param flow - The flow graph
 * @param run - The current run state
 */
export async function walkEdges(
  completedNodeId: string,
  flow: StitchFlow,
  run: StitchRun
): Promise<void> {
  // Check if this is a terminal node (Requirement 9.7)
  if (isTerminalNode(completedNodeId, flow)) {
    // No outbound edges, stop edge-walking
    return;
  }

  // Get all outbound edges from the completed node (Requirement 9.1)
  const outboundEdges = getOutboundEdges(completedNodeId, flow);

  // Identify all target nodes (Requirement 9.2)
  const targetNodeIds = getTargetNodes(outboundEdges);

  // For each target node, check dependencies and fire if ready
  for (const targetNodeId of targetNodeIds) {
    // Check if all upstream dependencies are completed (Requirement 9.3)
    if (areUpstreamDependenciesCompleted(targetNodeId, flow, run)) {
      // Dependencies satisfied, fire the node (Requirement 9.4)
      await fireNode(targetNodeId, flow, run);
    }
  }
}

/**
 * Fires a node based on its type
 * Handles both static nodes and parallel instances created by Splitters
 * Validates: Requirements 9.4, 9.5, 9.6
 * 
 * @param nodeId - The ID of the node to fire
 * @param flow - The flow graph
 * @param run - The current run state
 */
export async function fireNode(
  nodeId: string,
  flow: StitchFlow,
  run: StitchRun
): Promise<void> {
  // Find the node in the flow
  const node = flow.graph.nodes.find(n => n.id === nodeId);
  if (!node) {
    console.error(`Node not found in flow: ${nodeId}`);
    return;
  }

  // 🔍 PARALLEL CHECK: Does this node have parallel instances in the DB?
  // Splitters create parallel instances like "Worker_0", "Worker_1", etc.
  // We need to fire THOSE instead of the static node
  const parallelKeys = Object.keys(run.node_states).filter(
    key => key.startsWith(`${nodeId}_`) && /_\d+$/.test(key)
  );

  // If parallel instances exist, fire THEM instead of the static node
  if (parallelKeys.length > 0) {
    console.log(`🔥 Firing ${parallelKeys.length} parallel instances for ${nodeId}`);
    
    // Fire all parallel instances concurrently
    await Promise.all(
      parallelKeys.map(async (parallelId) => {
        // The Splitter already seeded the 'output' field with the specific input for this instance
        const state = run.node_states[parallelId];
        const input = state?.output || {};

        // Fire based on node type
        // Note: Currently only Worker and UX nodes are expected in parallel paths
        // Nested splitting (Splitter after Splitter) would need additional logic
        switch (node.type) {
          case 'Worker':
            await fireWorkerNode(run.id, parallelId, node.data, input);
            break;
          case 'UX':
            await fireUXNode(run.id, parallelId, node.data, input);
            break;
          default:
            console.warn(`Parallel execution not implemented for node type: ${node.type}`);
        }
      })
    );
    
    return; // Stop here, don't fire the static node
  }

  // No parallel instances, proceed with standard static node execution
  // Merge upstream outputs to create input (Requirement 9.5)
  const input = mergeUpstreamOutputs(nodeId, flow, run);

  // Fire the node based on its type
  switch (node.type) {
    case 'Worker':
      await fireWorkerNode(run.id, nodeId, node.data, input);
      break;
    case 'UX':
      await fireUXNode(run.id, nodeId, node.data, input);
      break;
    case 'Splitter': {
      // Get downstream node IDs for splitter
      const outboundEdges = getOutboundEdges(nodeId, flow);
      const downstreamNodeIds = getTargetNodes(outboundEdges);
      await fireSplitterNode(run.id, nodeId, node.data, input, downstreamNodeIds);
      break;
    }
    case 'Collector': {
      // Get upstream node IDs for collector
      const inboundEdges = flow.graph.edges.filter(e => e.target === nodeId);
      const upstreamNodeIds = inboundEdges.map(e => e.source);
      await fireCollectorNode(run.id, nodeId, node.data, upstreamNodeIds);
      break;
    }
    default:
      console.error(`Unknown node type: ${node.type}`);
  }
}
