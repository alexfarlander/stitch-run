/**
 * Edge-Walking Orchestration
 * Implements the edge-walking execution model using ExecutionGraph
 * Validates: Requirements 3.1, 3.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.3
 */

import { StitchFlow, StitchRun, StitchNode, TriggerMetadata } from '@/types/stitch';
import { ExecutionGraph, ExecutionNode } from '@/types/execution-graph';
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
import { getVersion } from '../canvas/version-manager';
import { moveEntityToSection } from '../db/entities';
import { 
  logEdgeWalking, 
  logExecutionError, 
  logNodeExecution,
  logParallelInstanceCreation 
} from './logger';

/**
 * Starts a new workflow execution using ExecutionGraph
 * Validates: Requirements 3.1, 11.3 (Workflow-Entity Attachment)
 * 
 * @param flowId - The flow to execute
 * @param options - Execution options (entity, trigger, initial input, version)
 * @returns The created run
 */
export async function startRun(
  flowId: string,
  options: {
    entityId?: string | null;
    trigger?: TriggerMetadata;
    input?: any;
    flow_version_id?: string;
  } = {}
): Promise<StitchRun> {
  // 1. Create the run record (supports entity_id, trigger, and flow_version_id)
  const run = await createRun(flowId, {
    entity_id: options.entityId,
    trigger: options.trigger,
    flow_version_id: options.flow_version_id,
  });

  // 2. Load execution graph from run's flow_version_id (Requirement 3.1)
  if (!run.flow_version_id) {
    throw new Error(`Run has no flow_version_id: ${run.id}`);
  }
  
  const version = await getVersion(run.flow_version_id);
  if (!version) {
    throw new Error(`Flow version not found: ${run.flow_version_id}`);
  }
  
  const executionGraph = version.execution_graph;

  // 3. Use entry nodes from execution graph (pre-computed)
  const entryNodeIds = executionGraph.entryNodes;

  // 4. Fire entry nodes
  for (const nodeId of entryNodeIds) {
    const node = executionGraph.nodes[nodeId];
    if (!node) {
      logExecutionError('Entry node not found in execution graph', new Error(`Node not found: ${nodeId}`), {
        runId: run.id,
        nodeId,
      });
      continue;
    }

    if (node.type === 'UX') {
      // UX nodes start in 'waiting_for_user'
      await fireUXNode(run.id, node.id, node.config || {}, options.input || {});
      
      // If we have an entity, move it to this node immediately
      if (options.entityId) {
        await moveEntityToSection(options.entityId, node.id, 'neutral');
      }
    } else {
      // Fire other nodes (Worker, Splitter, etc.)
      await fireNodeWithGraph(node.id, executionGraph, run);
    }
  }

  return run;
}

/**
 * Walks edges from a completed node and fires downstream nodes using ExecutionGraph
 * Validates: Requirements 3.1, 3.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 * 
 * @param completedNodeId - The ID of the node that just completed
 * @param run - The current run state
 */
export async function walkEdges(
  completedNodeId: string,
  run: StitchRun
): Promise<void> {
  // Load execution graph from run's flow_version_id (Requirement 3.1)
  if (!run.flow_version_id) {
    throw new Error(`Run has no flow_version_id: ${run.id}`);
  }
  
  const version = await getVersion(run.flow_version_id);
  if (!version) {
    throw new Error(`Flow version not found: ${run.flow_version_id}`);
  }
  
  const executionGraph = version.execution_graph;

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

  // Strip parallel suffix to get static node ID
  const staticNodeId = completedNodeId.replace(/_\d+$/, '');

  // Check if this is a terminal node using execution graph (Requirement 9.7)
  if (executionGraph.terminalNodes.includes(staticNodeId)) {
    // No outbound edges, stop edge-walking
    return;
  }

  // Use adjacency map for O(1) edge lookup (Requirements 3.1, 9.1)
  const targetNodeIds = executionGraph.adjacency[staticNodeId] || [];

  // Log edge-walking (Requirement 10.4)
  logEdgeWalking(run.id, completedNodeId, targetNodeIds);

  // For each target node, check dependencies and fire if ready
  for (const targetNodeId of targetNodeIds) {
    // Check if all upstream dependencies are completed (Requirement 9.3)
    if (areUpstreamDependenciesCompletedWithGraph(targetNodeId, executionGraph, run)) {
      // Dependencies satisfied, fire the node (Requirement 9.4)
      await fireNodeWithGraph(targetNodeId, executionGraph, run);
    }
  }
}

/**
 * Fires a node based on its type using ExecutionGraph
 * Handles both static nodes and parallel instances created by Splitters
 * Validates: Requirements 3.1, 3.6, 9.4, 9.5, 9.6
 * 
 * @param nodeId - The ID of the node to fire
 * @param executionGraph - The execution graph
 * @param run - The current run state
 */
export async function fireNodeWithGraph(
  nodeId: string,
  executionGraph: ExecutionGraph,
  run: StitchRun
): Promise<void> {
  // Find the node in the execution graph (O(1) lookup - Requirement 3.1)
  const node = executionGraph.nodes[nodeId];
  if (!node) {
    logExecutionError('Node not found in execution graph', new Error(`Node not found: ${nodeId}`), {
      runId: run.id,
      nodeId,
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
            await fireWorkerNode(run.id, parallelId, node.config || {}, input);
            break;
          case 'UX':
            await fireUXNode(run.id, parallelId, node.config || {}, input);
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
  // Merge upstream outputs to create input using execution graph (Requirements 3.6, 9.5)
  const input = mergeUpstreamOutputsWithGraph(nodeId, executionGraph, run);

  // Fire the node based on its type
  switch (node.type) {
    case 'Worker':
      await fireWorkerNode(run.id, nodeId, node.config || {}, input);
      break;
    case 'UX':
      logNodeExecution(run.id, nodeId, 'UX', input);
      await fireUXNode(run.id, nodeId, node.config || {}, input);
      break;
    case 'Splitter': {
      logNodeExecution(run.id, nodeId, 'Splitter', input);
      // Use adjacency map for O(1) downstream lookup (Requirement 3.1)
      const downstreamNodeIds = executionGraph.adjacency[nodeId] || [];
      await fireSplitterNode(run.id, nodeId, node.config || {}, input, downstreamNodeIds);
      break;
    }
    case 'Collector': {
      logNodeExecution(run.id, nodeId, 'Collector', input);
      // Find upstream nodes by checking adjacency map
      const upstreamNodeIds = getUpstreamNodeIds(nodeId, executionGraph);
      await fireCollectorNode(run.id, nodeId, node.config || {}, upstreamNodeIds);
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

/**
 * Helper function to check if all upstream dependencies are completed using ExecutionGraph
 * Requirement 9.3
 */
function areUpstreamDependenciesCompletedWithGraph(
  nodeId: string,
  executionGraph: ExecutionGraph,
  run: StitchRun
): boolean {
  // Find all upstream nodes by checking adjacency map
  const upstreamNodeIds = getUpstreamNodeIds(nodeId, executionGraph);
  
  // If no upstream nodes, dependencies are satisfied
  if (upstreamNodeIds.length === 0) {
    return true;
  }
  
  // Check if all upstream nodes are completed
  for (const upstreamId of upstreamNodeIds) {
    // Check if there are parallel instances of this upstream node
    const parallelInstances = Object.keys(run.node_states).filter(
      key => key.startsWith(`${upstreamId}_`) && /_\d+$/.test(key)
    );
    
    if (parallelInstances.length > 0) {
      // If parallel instances exist, ALL of them must be in a terminal state
      for (const parallelId of parallelInstances) {
        const state = run.node_states[parallelId];
        if (!state || (state.status !== 'completed' && state.status !== 'failed')) {
          return false;
        }
      }
    } else {
      // No parallel instances, check the static node
      const upstreamState = run.node_states[upstreamId];
      if (!upstreamState || upstreamState.status !== 'completed') {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Helper function to merge upstream outputs using ExecutionGraph
 * Uses edge data map for data mapping (Requirement 3.6)
 */
function mergeUpstreamOutputsWithGraph(
  nodeId: string,
  executionGraph: ExecutionGraph,
  run: StitchRun
): any {
  // Find all upstream nodes
  const upstreamNodeIds = getUpstreamNodeIds(nodeId, executionGraph);
  
  // If no upstream nodes, return empty object
  if (upstreamNodeIds.length === 0) {
    return {};
  }
  
  // Merge all upstream outputs
  const mergedInput: any = {};
  
  for (const upstreamId of upstreamNodeIds) {
    const upstreamState = run.node_states[upstreamId];
    
    // Only merge if upstream has output
    if (upstreamState && upstreamState.output !== undefined) {
      // Check for edge data mapping (Requirement 3.6)
      const edgeKey = `${upstreamId}->${nodeId}`;
      const edgeMapping = executionGraph.edgeData[edgeKey];
      
      if (edgeMapping) {
        // Apply data mapping
        for (const [targetInput, sourcePath] of Object.entries(edgeMapping)) {
          // Simple path resolution (e.g., "output.text" -> upstreamState.output.text)
          const value = resolvePath(upstreamState.output, sourcePath);
          mergedInput[targetInput] = value;
        }
      } else {
        // No mapping, merge output directly
        if (typeof upstreamState.output === 'object' && upstreamState.output !== null && !Array.isArray(upstreamState.output)) {
          Object.assign(mergedInput, upstreamState.output);
        } else {
          mergedInput[upstreamId] = upstreamState.output;
        }
      }
    }
  }
  
  return mergedInput;
}

/**
 * Helper function to get upstream node IDs from ExecutionGraph
 */
function getUpstreamNodeIds(nodeId: string, executionGraph: ExecutionGraph): string[] {
  const upstreamIds: string[] = [];
  
  // Check adjacency map to find nodes that point to this node
  for (const [sourceId, targetIds] of Object.entries(executionGraph.adjacency)) {
    if (targetIds.includes(nodeId)) {
      upstreamIds.push(sourceId);
    }
  }
  
  return upstreamIds;
}

/**
 * Helper function to resolve a path in an object
 * Supports simple dot notation (e.g., "output.text")
 */
function resolvePath(obj: any, path: string): any {
  // If path doesn't contain dots, return the property directly
  if (!path.includes('.')) {
    return obj[path];
  }
  
  // Split path and traverse object
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Legacy fireNode function for backward compatibility
 * This is kept for any code that still uses the old flow-based approach
 * @deprecated Use fireNodeWithGraph instead
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
  const parallelKeys = Object.keys(run.node_states).filter(
    key => key.startsWith(`${nodeId}_`) && /_\d+$/.test(key)
  );

  // If parallel instances exist, fire THEM instead of the static node
  if (parallelKeys.length > 0) {
    logParallelInstanceCreation(run.id, nodeId, parallelKeys);
    
    await Promise.all(
      parallelKeys.map(async (parallelId) => {
        const state = run.node_states[parallelId];
        const input = state?.output || {};

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
    
    return;
  }

  // No parallel instances, proceed with standard static node execution
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
      const outboundEdges = getOutboundEdges(nodeId, flow);
      const downstreamNodeIds = getTargetNodes(outboundEdges);
      await fireSplitterNode(run.id, nodeId, node.data, input, downstreamNodeIds);
      break;
    }
    case 'Collector': {
      logNodeExecution(run.id, nodeId, 'Collector', input);
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
