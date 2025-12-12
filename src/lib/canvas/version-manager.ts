/**
 * Version Manager
 * 
 * Manages flow versions including creation, retrieval, and auto-versioning.
 * Handles compilation, validation, and database operations for versioning.
 * 
 * Requirements: 1.2, 1.5, 5.1, 5.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { createServerClient } from '../supabase/server';
import { getAdminClient } from '../supabase/client';
import { VisualGraph } from '@/types/canvas-schema';
import { ExecutionGraph } from '@/types/execution-graph';
import { compileToOEG } from './compile-oeg';
import { ValidationError } from './validate-graph';

// ============================================================================
// Types
// ============================================================================

/**
 * Flow version record from database
 */
export interface FlowVersion {
  id: string;
  flow_id: string;
  visual_graph: VisualGraph;
  execution_graph: ExecutionGraph;
  commit_message: string | null;
  created_at: string;
}

/**
 * Lightweight version metadata (without heavy graph blobs)
 * Used for listing versions to avoid bandwidth issues
 */
export interface FlowVersionMetadata {
  id: string;
  flow_id: string;
  commit_message: string | null;
  created_at: string;
}

/**
 * Custom error for validation failures
 */
export class ValidationFailureError extends Error {
  constructor(
    message: string,
    public errors: ValidationError[]
  ) {
    super(message);
    this.name = 'ValidationFailureError';
  }
}

// ============================================================================
// Version Creation
// ============================================================================

/**
 * Create a new version of a flow
 * Compiles visual graph to execution graph and stores both
 * 
 * Process:
 * 1. Compile visual graph to OEG (validates and optimizes)
 * 2. Insert version record with both graphs
 * 3. Update current_version_id in stitch_flows
 * 
 * Requirements: 1.2, 1.5, 10.1, 10.2, 10.3
 * 
 * @param flowId - The flow to create a version for
 * @param visualGraph - The visual graph to version
 * @param commitMessage - Optional commit message describing changes
 * @returns Version ID and execution graph
 * @throws ValidationFailureError if graph validation fails
 * @throws Error if database operations fail
 */
export async function createVersion(
  flowId: string,
  visualGraph: VisualGraph,
  commitMessage?: string
): Promise<{ versionId: string; executionGraph: ExecutionGraph }> {
  // Compile to OEG (Requirement 10.1)
  const compileResult = compileToOEG(visualGraph);
  
  // Reject invalid graphs (Requirement 10.2)
  if (!compileResult.success) {
    throw new ValidationFailureError(
      'Graph validation failed',
      compileResult.errors || []
    );
  }
  
  const supabase = createServerClient();
  
  // Insert version (Requirement 10.3)
  const { data: version, error: insertError } = await supabase
    .from('stitch_flow_versions')
    .insert({
      flow_id: flowId,
      visual_graph: visualGraph,
      execution_graph: compileResult.executionGraph,
      commit_message: commitMessage || null
    })
    .select()
    .single();
  
  if (insertError) {
    throw new Error(`Failed to create version: ${insertError.message}`);
  }
  
  // Update current_version_id (Requirements 1.5, 5.5)
  const { error: updateError } = await supabase
    .from('stitch_flows')
    .update({ current_version_id: version.id })
    .eq('id', flowId);
  
  if (updateError) {
    throw new Error(`Failed to update current_version_id: ${updateError.message}`);
  }
  
  return {
    versionId: version.id,
    executionGraph: compileResult.executionGraph!
  };
}

// ============================================================================
// Version Retrieval
// ============================================================================

/**
 * Get a specific version by ID
 * 
 * Requirement: 10.4
 * 
 * @param versionId - The version ID to retrieve
 * @returns FlowVersion or null if not found
 * @throws Error if database operation fails
 */
export async function getVersion(versionId: string): Promise<FlowVersion | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('stitch_flow_versions')
    .select('*')
    .eq('id', versionId)
    .single();
  
  if (error) {
    // PGRST116 is "not found" error code
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get version: ${error.message}`);
  }
  
  return data as FlowVersion;
}

/**
 * Get a specific version by ID using admin client (for webhooks without auth)
 * Use this in webhook endpoints where there are no cookies/session
 * 
 * Requirement: 10.4
 * 
 * @param versionId - The version ID to retrieve
 * @returns FlowVersion or null if not found
 * @throws Error if database operation fails
 */
export async function getVersionAdmin(versionId: string): Promise<FlowVersion | null> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('stitch_flow_versions')
    .select('*')
    .eq('id', versionId)
    .single();
  
  if (error) {
    // PGRST116 is "not found" error code
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get version: ${error.message}`);
  }
  
  return data as FlowVersion;
}

/**
 * List all versions for a flow
 * Returns lightweight metadata only (no graph blobs) to avoid bandwidth issues
 * Returns versions ordered by creation date descending (newest first)
 * 
 * Performance Note: This function intentionally excludes visual_graph and 
 * execution_graph to prevent downloading potentially megabytes of JSON when
 * listing version history. Use getVersion() to fetch full version data.
 * 
 * Requirement: 10.5
 * 
 * @param flowId - The flow to list versions for
 * @returns Array of FlowVersionMetadata ordered by created_at DESC
 * @throws Error if database operation fails
 */
export async function listVersions(flowId: string): Promise<FlowVersionMetadata[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('stitch_flow_versions')
    // ONLY select metadata, exclude the heavy JSON blobs
    .select('id, flow_id, commit_message, created_at')
    .eq('flow_id', flowId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to list versions: ${error.message}`);
  }
  
  return data as FlowVersionMetadata[];
}

// ============================================================================
// Auto-Versioning
// ============================================================================

/**
 * Auto-version on run
 * If there are unsaved changes, create a version first
 * 
 * Process:
 * 1. Get current version from flow
 * 2. If no version exists, create first version
 * 3. If version exists, compare with current graph
 * 4. If changes detected, create new version
 * 5. Return version ID to use for run
 * 
 * Requirement: 5.1
 * 
 * @param flowId - The flow to auto-version
 * @param currentVisualGraph - The current visual graph from UI
 * @returns Version ID to use for the run
 * @throws Error if database operations fail
 */
export async function autoVersionOnRun(
  flowId: string,
  currentVisualGraph: VisualGraph
): Promise<string> {
  const supabase = createServerClient();
  
  // Get current version
  const { data: flow, error: flowError } = await supabase
    .from('stitch_flows')
    .select('current_version_id')
    .eq('id', flowId)
    .single();
  
  if (flowError) {
    throw new Error(`Failed to get flow: ${flowError.message}`);
  }
  
  // No version exists, create first version
  if (!flow?.current_version_id) {
    const { versionId } = await createVersion(
      flowId,
      currentVisualGraph,
      'Initial version (auto-created on run)'
    );
    return versionId;
  }
  
  // Check if current graph differs from saved version
  const currentVersion = await getVersion(flow.current_version_id);
  
  if (!currentVersion) {
    throw new Error('Current version not found');
  }
  
  // Deep equality check for changes
  const hasChanges = !deepEqual(
    currentVisualGraph,
    currentVersion.visual_graph
  );
  
  if (hasChanges) {
    // Create new version
    const { versionId } = await createVersion(
      flowId,
      currentVisualGraph,
      'Auto-versioned on run'
    );
    return versionId;
  }
  
  // No changes, use current version
  return flow.current_version_id;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep equality check for objects
 * Uses sorted JSON serialization to handle property order differences
 * 
 * Note: This approach works for JSON-serializable objects but has limitations:
 * - Doesn't handle functions, undefined, or circular references
 * - Good enough for comparing visual graphs which are pure JSON
 * 
 * @param a - First object
 * @param b - Second object
 * @returns true if objects are deeply equal
 */
function deepEqual(a: any, b: unknown): boolean {
  // Sort object keys recursively to ensure consistent comparison
  const sortKeys = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    
    const rec = obj as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    Object.keys(rec).sort().forEach((key) => {
      sorted[key] = sortKeys(rec[key]);
    });
    return sorted as unknown;
  };
  
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}
