/**
 * Database operations for stitch_flows table
 * Handles CRUD operations for flow definitions
 */

import { createServerClient } from '../supabase/server';
import { StitchFlow, StitchNode, StitchEdge } from '@/types/stitch';
import { VisualGraph } from '@/types/canvas-schema';
import { createVersion } from '../canvas/version-manager';

/**
 * Create a new flow in the database
 * 
 * Requirements: 1.1
 * 
 * @param name - Flow name
 * @param graph - Flow graph structure (legacy format)
 * @param canvasType - Type of canvas (bmc, workflow, detail)
 * @param parentId - Parent flow ID for nested canvases
 * @returns Created flow
 */
export async function createFlow(
  name: string,
  graph: { nodes: StitchNode[]; edges: StitchEdge[] },
  canvasType: 'bmc' | 'workflow' | 'detail' = 'workflow',
  parentId?: string
): Promise<StitchFlow> {
  const _supabase = createServerClient();

  const { data, error } = await supabase
    .from('stitch_flows')
    .insert({
      name,
      graph,
      canvas_type: canvasType,
      parent_id: parentId || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create flow: ${error.message}`);
  }

  return data as StitchFlow;
}

/**
 * Create a new flow with an initial version
 * This is the recommended way to create flows in the versioning system
 * 
 * Process:
 * 1. Create flow record (metadata container)
 * 2. Create initial version with visual and execution graphs
 * 3. Update flow's current_version_id
 * 
 * Requirements: 1.1, 1.6, 5.6
 * 
 * @param name - Flow name
 * @param visualGraph - Visual graph structure
 * @param canvasType - Type of canvas (bmc, workflow, detail)
 * @param parentId - Parent flow ID for nested canvases
 * @param commitMessage - Optional commit message for initial version
 * @returns Created flow with version information
 */
export async function createFlowWithVersion(
  name: string,
  visualGraph: VisualGraph,
  canvasType: 'bmc' | 'workflow' | 'detail' = 'workflow',
  parentId?: string,
  commitMessage?: string
): Promise<{ flow: StitchFlow; versionId: string }> {
  const _supabase = createServerClient();

  // Step 1: Create flow record (Requirement 1.1)
  const { data: flow, error: flowError } = await supabase
    .from('stitch_flows')
    .insert({
      name,
      graph: { nodes: [], edges: [] }, // Empty graph, versions hold the real data
      canvas_type: canvasType,
      parent_id: parentId || null,
    })
    .select()
    .single();

  if (flowError) {
    throw new Error(`Failed to create flow: ${flowError.message}`);
  }

  // Step 2: Create initial version (Requirements 1.6, 5.6)
  const { versionId } = await createVersion(
    flow.id,
    visualGraph,
    commitMessage || 'Initial version'
  );

  // Step 3: Fetch updated flow with current_version_id set
  const { data: updatedFlow, error: fetchError } = await supabase
    .from('stitch_flows')
    .select('*')
    .eq('id', flow.id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch updated flow: ${fetchError.message}`);
  }

  return {
    flow: updatedFlow as StitchFlow,
    versionId
  };
}

/**
 * Get a flow by ID
 * 
 * @param flowId - Flow ID to retrieve
 * @param includeCurrentVersion - If true, includes the current version data
 * @returns Flow or null if not found
 */
export async function getFlow(
  flowId: string,
  includeCurrentVersion: boolean = false
): Promise<StitchFlow | null> {
  const _supabase = createServerClient();

  let query = supabase
    .from('stitch_flows')
    .select('*')
    .eq('id', flowId);

  // Optionally include current version data
  if (includeCurrentVersion) {
    query = supabase
      .from('stitch_flows')
      .select(`
        *,
        current_version:stitch_flow_versions!current_version_id(*)
      `)
      .eq('id', flowId);
  }

  const { data, error } = await query.single();

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
 * 
 * @param flowId - Flow ID to retrieve
 * @param includeCurrentVersion - If true, includes the current version data
 * @returns Flow or null if not found
 */
export async function getFlowAdmin(
  flowId: string,
  includeCurrentVersion: boolean = false
): Promise<StitchFlow | null> {
  const { getAdminClient } = await import('../supabase/client');
  const _supabase = getAdminClient();

  let query = supabase
    .from('stitch_flows')
    .select('*')
    .eq('id', flowId);

  // Optionally include current version data
  if (includeCurrentVersion) {
    query = supabase
      .from('stitch_flows')
      .select(`
        *,
        current_version:stitch_flow_versions!current_version_id(*)
      `)
      .eq('id', flowId);
  }

  const { data, error } = await query.single();

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
 * 
 * @param includeCurrentVersion - If true, includes the current version data
 * @returns Array of flows
 */
export async function getAllFlows(
  includeCurrentVersion: boolean = false
): Promise<StitchFlow[]> {
  const _supabase = createServerClient();

  let query = supabase
    .from('stitch_flows')
    .select('*')
    .order('created_at', { ascending: false });

  // Optionally include current version data
  if (includeCurrentVersion) {
    query = supabase
      .from('stitch_flows')
      .select(`
        *,
        current_version:stitch_flow_versions!current_version_id(*)
      `)
      .order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get flows: ${error.message}`);
  }

  return data as StitchFlow[];
}

/**
 * Update a flow's metadata (name only)
 * 
 * @deprecated DO NOT use this function to update canvas graph data!
 * This function bypasses the versioning system and OEG compiler.
 * 
 * ⚠️ CRITICAL: Only use this for updating flow metadata (name).
 * To update canvas structure, use createVersion() from version-manager.ts
 * 
 * The Risk: Updating the 'graph' field directly will:
 * - Bypass the OEG compiler
 * - Leave current_version_id pointing to stale data
 * - Cause the Run button to execute the old version
 * - Break the versioning system
 * 
 * Correct approach for canvas updates:
 * 1. Call createVersion(flowId, visualGraph, commitMessage)
 * 2. This automatically updates current_version_id
 * 3. The new version is compiled and ready for execution
 * 
 * @param flowId - Flow ID to update
 * @param updates - Only name should be updated here
 * @returns Updated flow
 */
export async function updateFlow(
  flowId: string,
  updates: {
    name?: string;
    /** @deprecated DO NOT UPDATE GRAPH - Use createVersion() instead */
    graph?: { nodes: StitchNode[]; edges: StitchEdge[] };
  }
): Promise<StitchFlow> {
  const _supabase = createServerClient();

  // Warn if trying to update graph
  if (updates.graph) {
    console.warn(
      '⚠️ WARNING: updateFlow() called with graph data. ' +
      'This bypasses versioning! Use createVersion() instead.'
    );
  }

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
  const _supabase = createServerClient();

  const { error } = await supabase
    .from('stitch_flows')
    .delete()
    .eq('id', flowId);

  if (error) {
    throw new Error(`Failed to delete flow: ${error.message}`);
  }
}
