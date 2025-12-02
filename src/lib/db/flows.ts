/**
 * Database operations for stitch_flows table
 * Handles CRUD operations for flow definitions
 */

import { createServerClient } from '../supabase/server';
import { StitchFlow, StitchNode, StitchEdge } from '@/types/stitch';

/**
 * Create a new flow in the database
 */
export async function createFlow(
  name: string,
  graph: { nodes: StitchNode[]; edges: StitchEdge[] }
): Promise<StitchFlow> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_flows')
    .insert({
      name,
      graph,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create flow: ${error.message}`);
  }

  return data as StitchFlow;
}

/**
 * Get a flow by ID
 */
export async function getFlow(flowId: string): Promise<StitchFlow | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_flows')
    .select('*')
    .eq('id', flowId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get flow: ${error.message}`);
  }

  return data as StitchFlow;
}

/**
 * Get a flow by ID using admin client (for webhooks/callbacks without auth)
 * Use this in webhook endpoints where there are no cookies/session
 */
export async function getFlowAdmin(flowId: string): Promise<StitchFlow | null> {
  const { getAdminClient } = await import('../supabase/client');
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('stitch_flows')
    .select('*')
    .eq('id', flowId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get flow: ${error.message}`);
  }

  return data as StitchFlow;
}

/**
 * Get all flows
 */
export async function getAllFlows(): Promise<StitchFlow[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_flows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get flows: ${error.message}`);
  }

  return data as StitchFlow[];
}

/**
 * Update a flow's graph
 */
export async function updateFlow(
  flowId: string,
  updates: {
    name?: string;
    graph?: { nodes: StitchNode[]; edges: StitchEdge[] };
  }
): Promise<StitchFlow> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_flows')
    .update(updates)
    .eq('id', flowId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update flow: ${error.message}`);
  }

  return data as StitchFlow;
}

/**
 * Delete a flow
 */
export async function deleteFlow(flowId: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('stitch_flows')
    .delete()
    .eq('id', flowId);

  if (error) {
    throw new Error(`Failed to delete flow: ${error.message}`);
  }
}
