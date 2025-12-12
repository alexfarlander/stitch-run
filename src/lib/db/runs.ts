/**
 * Database operations for stitch_runs table
 * Handles CRUD operations for run execution state
 */

import { createServerClient } from '../supabase/server';
import { getAdminClient } from '../supabase/client';
import { StitchRun, NodeState, StitchFlow, TriggerMetadata } from '@/types/stitch';
import { getFlow, getFlowAdmin } from './flows';
import { getVersion, getVersionAdmin } from '../canvas/version-manager';
import { ExecutionGraph } from '@/types/execution-graph';

/**
 * Create a new run for a flow
 * Initializes all nodes to 'pending' status from execution graph
 * Supports optional entity_id and trigger metadata for webhook-triggered runs
 * Requirements: 1.3, 5.2
 */
export async function createRun(
  flowId: string,
  options?: {
    flow_version_id?: string;
    entity_id?: string | null;
    trigger?: TriggerMetadata;
  }
): Promise<StitchRun> {
  const supabase = createServerClient();

  let executionGraph: ExecutionGraph;
  let versionId: string;

  // If flow_version_id is provided, use it directly
  if (options?.flow_version_id) {
    versionId = options.flow_version_id;
    const version = await getVersion(versionId);
    if (!version) {
      throw new Error(`Flow version not found: ${versionId}`);
    }
    executionGraph = version.execution_graph;
  } else {
    // Otherwise, get the current version from the flow
    const flow = await getFlow(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    if (!flow.current_version_id) {
      throw new Error(`Flow has no current version: ${flowId}`);
    }

    versionId = flow.current_version_id;
    const version = await getVersion(versionId);
    if (!version) {
      throw new Error(`Current version not found: ${versionId}`);
    }
    executionGraph = version.execution_graph;
  }

  // Initialize all nodes to 'pending' status from execution graph
  const nodeStates: Record<string, NodeState> = {};
  for (const nodeId of Object.keys(executionGraph.nodes)) {
    nodeStates[nodeId] = {
      status: 'pending',
    };
  }

  // Build insert payload with optional fields
  const insertPayload: Record<string, unknown> = {
    flow_id: flowId,
    flow_version_id: versionId,
    node_states: nodeStates,
  };

  // Add entity_id if provided
  if (options?.entity_id !== undefined) {
    insertPayload.entity_id = options.entity_id;
  }

  // Add trigger metadata if provided, otherwise use default manual trigger
  if (options?.trigger) {
    insertPayload.trigger = options.trigger;
  } else {
    insertPayload.trigger = {
      type: 'manual',
      source: null,
      event_id: null,
      timestamp: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('stitch_runs')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create run: ${error.message}`);
  }

  return data as StitchRun;
}

/**
 * Create a new run for a flow using admin client (for webhooks without auth)
 * Initializes all nodes to 'pending' status from execution graph
 * Supports optional entity_id and trigger metadata for webhook-triggered runs
 * Use this in webhook endpoints where there are no cookies/session
 * Requirements: 1.3, 5.2
 */
export async function createRunAdmin(
  flowId: string,
  options?: {
    flow_version_id?: string;
    entity_id?: string | null;
    trigger?: TriggerMetadata;
  }
): Promise<StitchRun> {
  const supabase = getAdminClient();

  let executionGraph: ExecutionGraph;
  let versionId: string;

  // If flow_version_id is provided, use it directly
  if (options?.flow_version_id) {
    versionId = options.flow_version_id;
    const version = await getVersionAdmin(versionId);
    if (!version) {
      throw new Error(`Flow version not found: ${versionId}`);
    }
    executionGraph = version.execution_graph;
  } else {
    // Otherwise, get the current version from the flow
    const flow = await getFlowAdmin(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    if (!flow.current_version_id) {
      throw new Error(`Flow has no current version: ${flowId}`);
    }

    versionId = flow.current_version_id;
    const version = await getVersionAdmin(versionId);
    if (!version) {
      throw new Error(`Current version not found: ${versionId}`);
    }
    executionGraph = version.execution_graph;
  }

  // Initialize all nodes to 'pending' status from execution graph
  const nodeStates: Record<string, NodeState> = {};
  for (const nodeId of Object.keys(executionGraph.nodes)) {
    nodeStates[nodeId] = {
      status: 'pending',
    };
  }

  // Build insert payload with optional fields
  const insertPayload: Record<string, unknown> = {
    flow_id: flowId,
    flow_version_id: versionId,
    node_states: nodeStates,
  };

  // Add entity_id if provided
  if (options?.entity_id !== undefined) {
    insertPayload.entity_id = options.entity_id;
  }

  // Add trigger metadata if provided, otherwise use default manual trigger
  if (options?.trigger) {
    insertPayload.trigger = options.trigger;
  } else {
    insertPayload.trigger = {
      type: 'manual',
      source: null,
      event_id: null,
      timestamp: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('stitch_runs')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create run: ${error.message}`);
  }

  return data as StitchRun;
}

/**
 * Get a run by ID
 */
export async function getRun(runId: string): Promise<StitchRun | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get run: ${error.message}`);
  }

  return data as StitchRun;
}

/**
 * Get a run by ID using admin client (for webhooks/callbacks without auth)
 * Use this in webhook endpoints where there are no cookies/session
 */
export async function getRunAdmin(runId: string): Promise<StitchRun | null> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get run: ${error.message}`);
  }

  return data as StitchRun;
}

/**
 * Get all runs for a flow
 */
export async function getRunsForFlow(flowId: string): Promise<StitchRun[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_runs')
    .select('*')
    .eq('flow_id', flowId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get runs: ${error.message}`);
  }

  return data as StitchRun[];
}

/**
 * Update a single node's state atomically
 * Uses database RPC function to prevent race conditions when multiple workers complete simultaneously
 * Uses admin client to bypass RLS and auth issues for webhook callbacks
 * Validates status transitions before updating
 * Validates: Requirements 7.2, 7.5, 11.2, 11.5
 */
export async function updateNodeState(
  runId: string,
  nodeId: string,
  state: NodeState
): Promise<StitchRun> {
  // Use Admin Client to bypass RLS and Auth issues for webhooks
  const supabase = getAdminClient();

  // Get current run state to validate transition
  const currentRun = await getRunAdmin(runId);
  if (!currentRun) {
    throw new Error(`Run not found: ${runId}`);
  }

  // Validate status transition if node already exists
  const currentNodeState = currentRun.node_states[nodeId];
  if (currentNodeState) {
    const { validateTransition } = await import('../engine/status-transitions');
    try {
      validateTransition(currentNodeState.status, state.status);
    } catch (error) {
      // Re-throw with context about which node failed
      if (error instanceof Error) {
        throw new Error(`Node ${nodeId}: ${error.message}`);
      }
      throw error;
    }
  }

  const { data, error } = await supabase.rpc('update_node_state', {
    p_run_id: runId,
    p_node_id: nodeId,
    p_status: state.status,
    p_output: state.output || null,
    p_error: state.error || null,
  });

  if (error) {
    // Check if it's a "no rows" error which means run doesn't exist
    if (error.message.includes('Cannot coerce') || error.code === 'PGRST116') {
      throw new Error(`Run not found: ${runId}`);
    }
    throw new Error(`Failed to update node state atomically: ${error.message}`);
  }

  // RPC returns an array, check if it's empty (run not found)
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error(`Run not found: ${runId}`);
  }

  // Get the first row from the result
  const result = Array.isArray(data) ? data[0] : data;
  return result as StitchRun;
}

/**
 * Update multiple node states atomically
 * For bulk updates (e.g., initializing parallel paths), we use the admin client
 * Note: This still has a read-modify-write pattern, but it's typically used in
 * single-threaded scenarios (like splitter initialization) rather than concurrent callbacks
 * Validates status transitions before updating
 * Validates: Requirements 7.2, 7.5, 11.2, 11.5
 */
export async function updateNodeStates(
  runId: string,
  updates: Record<string, NodeState>
): Promise<StitchRun> {
  // Use Admin Client for consistent permissions
  const supabase = getAdminClient();

  // Read current run state
  const run = await getRunAdmin(runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  // Validate all status transitions before applying updates
  const { validateTransition } = await import('../engine/status-transitions');
  for (const [nodeId, newState] of Object.entries(updates)) {
    const currentNodeState = run.node_states[nodeId];
    if (currentNodeState) {
      try {
        validateTransition(currentNodeState.status, newState.status);
      } catch (error) {
        // Re-throw with context about which node failed
        if (error instanceof Error) {
          throw new Error(`Node ${nodeId}: ${error.message}`);
        }
        throw error;
      }
    }
  }

  // Use atomic RPC function to merge updates
  const { data, error } = await supabase.rpc('update_node_states', {
    p_run_id: runId,
    p_updates: updates
  });

  if (error) {
    throw new Error(`Failed to update node states atomically: ${error.message}`);
  }

  // RPC returns an array
  if (!data || (Array.isArray(data) && data.length === 0)) {
     throw new Error(`Run not found: ${runId}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return result as StitchRun;
}

/**
 * Delete a run
 */
export async function deleteRun(runId: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('stitch_runs')
    .delete()
    .eq('id', runId);

  if (error) {
    throw new Error(`Failed to delete run: ${error.message}`);
  }
}
