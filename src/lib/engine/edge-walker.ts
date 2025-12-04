/**
 * Edge-Walking Orchestration
 * Implements the edge-walking execution model
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.3
 */

import { StitchFlow, StitchRun, StitchNode, TriggerMetadata } from '@/types/stitch';
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
import { createRun } from '../db/runs';
import { getFlow } from '../db/flows';
import { moveEntityToSection } from '../db/entities';
import { 
  logEdgeWalking, 
  logExecutionError, 
  logNodeExecution,
  logParallelInstanceCreation 
} from './logger';

/**
 * Starts a new workflow execution
 * Validates: Requirement 11.3 (Workflow-Entity Attachment)
 * 
 * @param flowId - The flow to execute
 * @param options - Execution options (entity, trigger, initial input)
 * @returns The created run
 */
export async function startRun(
  flowId: string,
  options: {
    entityId?: string | null;
    trigger?: TriggerMetadata;
    input?: any;
  } = {}
): Promise<StitchRun> {
  // 1. Create the run record (supports entity_id and trigger)
  const run = await createRun(flowId, {
    entity_id: options.entityId,
    trigger: options.trigger,
  });

  // 2. Fetch the flow definition
  const flow = await getFlow(flowId);
  if (!flow) {
    throw new Error(`Flow not found: ${flowId}`);
  }

  // 3. Find entry nodes (nodes with no incoming edges)
  const entryNodes = findEntryNodes(flow);

  // 4. Fire entry nodes
  for (const node of entryNodes) {
    if (node.type === 'UX') {
      // UX nodes start in 'waiting_for_user'
      await fireUXNode(run.id, node.id, node.data, options.input || {});
      
      // If we have an entity, move it to this node immediately
      if (options.entityId) {
        await moveEntityToSection(options.entityId, node.id, 'neutral');
      }
    } else {
      // Fire other nodes (Worker, Splitter, etc.)
      await fireNode(node.id, flow, run);
    }
  }

  return run;
}

/**
 * Helper to find nodes with no incoming edges (entry nodes)
 */
function findEntryNodes(flow: StitchFlow): StitchNode[] {
  const targetIds = new Set(flow.graph.edges.map(e => e.target));
  return flow.graph.nodes.filter(n => !targetIds.has(n.id));
}

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
  // --- Handle Entity Movement ---
  if (run.entity_id) {
    try {
      const { handleNodeCompletion } = await import('../../stitch/engine/entity-movement');
      
      // Get the output of the completed node
      const nodeState = run.node_states[completedNodeId];
      const output = nodeState?.output;
      
      // Check for movement (Success case)
      // Note: walkEdges is only called on success, so success=true
      await handleNodeCompletion(run, completedNodeId, output, true);
    } catch (error) {
      logExecutionError('Failed to handle entity movement', error, {
        runId: run.id,
        completedNodeId,
        entityId: run.entity_id,
      });
      // Continue execution - visual movement failure shouldn't stop workflow
    }
  }
  // -----------------------------------

  // Check if this is a terminal node (Requirement 9.7)
  if (isTerminalNode(completedNodeId, flow)) {
    // No outbound edges, stop edge-walking
    return;
  }

  // Get all outbound edges from the completed node (Requirement 9.1)
  const outboundEdges = getOutboundEdges(completedNodeId, flow);

  // Identify all target nodes (Requirement 9.2)
  const targetNodeIds = getTargetNodes(outboundEdges);

  // Log edge-walking (Requirement 10.4)
  logEdgeWalking(run.id, completedNodeId, targetNodeIds);

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
    logExecutionError('Node not found in flow', new Error(`Node not found: ${nodeId}`), {
      runId: run.id,
      nodeId,
      flowId: flow.id,
    });
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
    logParallelInstanceCreation(run.id, nodeId, parallelKeys);
    
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
            logExecutionError(
              'Parallel execution not implemented for node type',
              new Error(`Unsupported parallel node type: ${node.type}`),
              {
                runId: run.id,
                nodeId: parallelId,
                nodeType: node.type,
              }
            );
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
      logNodeExecution(run.id, nodeId, 'UX', input);
      await fireUXNode(run.id, nodeId, node.data, input);
      break;
    case 'Splitter': {
      logNodeExecution(run.id, nodeId, 'Splitter', input);
      // Get downstream node IDs for splitter
      const outboundEdges = getOutboundEdges(nodeId, flow);
      const downstreamNodeIds = getTargetNodes(outboundEdges);
      await fireSplitterNode(run.id, nodeId, node.data, input, downstreamNodeIds);
      break;
    }
    case 'Collector': {
      logNodeExecution(run.id, nodeId, 'Collector', input);
      // Get upstream node IDs for collector
      const inboundEdges = flow.graph.edges.filter(e => e.target === nodeId);
      const upstreamNodeIds = inboundEdges.map(e => e.source);
      await fireCollectorNode(run.id, nodeId, node.data, upstreamNodeIds);
      break;
    }
    default:
      logExecutionError(
        'Unknown node type',
        new Error(`Unknown node type: ${node.type}`),
        {
          runId: run.id,
          nodeId,
          nodeType: node.type,
        }
      );
  }
}
