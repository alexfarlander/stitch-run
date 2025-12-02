/**
 * Database operations for stitch_runs table
 * Handles CRUD operations for run execution state
 */

import { createServerClient } from '../supabase/server';
import { getAdminClient } from '../supabase/client';
import { StitchRun, NodeState, StitchFlow } from '@/types/stitch';
import { getFlow } from './flows';

/**
 * Create a new run for a flow
 * Initializes all nodes to 'pending' status
 * Validates: Requirements 2.6
 */
export async function createRun(flowId: string): Promise<StitchRun> {
  const supabase = createServerClient();

  // Get the flow to initialize node states
  const flow = await getFlow(flowId);
  if (!flow) {
    throw new Error(`Flow not found: ${flowId}`);
  }

  // Initialize all nodes to 'pending' status
  const nodeStates: Record<string, NodeState> = {};
  for (const node of flow.graph.nodes) {
    nodeStates[node.id] = {
      status: 'pending',
    };
  }

  const { data, error } = await supabase
    .from('stitch_runs')
    .insert({
      flow_id: flowId,
      node_states: nodeStates,
    })
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
 * Validates: Requirements 11.2, 11.5
 */
export async function updateNodeState(
  runId: string,
  nodeId: string,
  state: NodeState
): Promise<StitchRun> {
  // Use Admin Client to bypass RLS and Auth issues for webhooks
  const supabase = getAdminClient();

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
 * Validates: Requirements 11.2, 11.5
 */
export async function updateNodeStates(
  runId: string,
  updates: Record<string, NodeState>
): Promise<StitchRun> {
  // Use Admin Client for consistent permissions
  const supabase = getAdminClient();

  // Read current run state
  const run = await getRun(runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  // Merge updates with existing state
  const updatedNodeStates = {
    ...run.node_states,
    ...updates,
  };

  // Write back atomically
  const { data, error } = await supabase
    .from('stitch_runs')
    .update({
      node_states: updatedNodeStates,
    })
    .eq('id', runId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update node states: ${error.message}`);
  }

  return data as StitchRun;
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
