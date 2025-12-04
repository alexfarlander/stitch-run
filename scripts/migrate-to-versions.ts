/**
 * Data Migration Script: Migrate existing flows and runs to versioning system
 * 
 * This script migrates existing flows to the new versioning system by:
 * 1. For each existing flow:
 *    - Attempt to compile graph to OEG
 *    - If successful: create initial version, update current_version_id
 *    - If failed: set current_version_id to NULL, log error
 * 2. For each existing run:
 *    - Link to flow's current_version_id if available
 *    - Otherwise mark for manual review
 * 3. Log all migration results
 * 
 * Requirements: 9.1, 9.2, 9.3
 * 
 * Prerequisites:
 * - Run `npx tsx scripts/apply-versioning-migration.ts` first to create tables
 * - Backup your database before running (recommended)
 * 
 * Run with: npx tsx scripts/migrate-to-versions.ts
 * 
 * Note: This script uses tsx which respects tsconfig.json path aliases (@/*).
 * All imports are resolved correctly at runtime.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { compileToOEG } from '../src/lib/canvas/compile-oeg';
import { VisualGraph } from '../src/types/canvas-schema';
import { StitchFlow, StitchRun } from '../src/types/stitch';

// ============================================================================
// Configuration
// ============================================================================

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Migration Statistics
// ============================================================================

interface MigrationStats {
  flows: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  runs: {
    total: number;
    linked: number;
    needsReview: number;
  };
  errors: Array<{
    type: 'flow' | 'run';
    id: string;
    name?: string;
    error: string;
  }>;
}

const stats: MigrationStats = {
  flows: { total: 0, successful: 0, failed: 0, skipped: 0 },
  runs: { total: 0, linked: 0, needsReview: 0 },
  errors: []
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert legacy graph format to VisualGraph format
 * Legacy format uses StitchNode/StitchEdge, new format uses VisualNode/VisualEdge
 */
function convertToVisualGraph(legacyGraph: { nodes: any[]; edges: any[] }): VisualGraph {
  return {
    nodes: legacyGraph.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.data.label || node.id,
        worker_type: node.data.workerType,
        config: node.data,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
        entityMovement: node.data.entityMovement
      },
      parentNode: node.parentId,
      style: node.style,
      width: node.width,
      height: node.height
    })),
    edges: legacyGraph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      animated: edge.animated,
      style: edge.style,
      data: edge.data
    }))
  };
}

// ============================================================================
// Flow Migration
// ============================================================================

/**
 * Migrate a single flow to the versioning system
 * Requirements: 9.1, 9.2
 */
async function migrateFlow(flow: StitchFlow): Promise<void> {
  console.log(`\n📦 Migrating flow: ${flow.name} (${flow.id})`);
  
  // Skip if already has a version
  if (flow.current_version_id) {
    console.log('   ↳ Already has version, skipping');
    stats.flows.skipped++;
    return;
  }
  
  try {
    // Convert legacy graph to visual graph format
    const visualGraph = convertToVisualGraph(flow.graph);
    
    // Attempt to compile to OEG
    console.log('   ↳ Compiling graph to OEG...');
    const compileResult = compileToOEG(visualGraph);
    
    if (!compileResult.success) {
      // Compilation failed - log errors and set current_version_id to NULL
      console.log('   ❌ Compilation failed:');
      compileResult.errors?.forEach(err => {
        console.log(`      - ${err.type}: ${err.message}`);
        if (err.node) console.log(`        Node: ${err.node}`);
        if (err.field) console.log(`        Field: ${err.field}`);
      });
      
      // Set current_version_id to NULL
      const { error: updateError } = await supabase
        .from('stitch_flows')
        .update({ current_version_id: null })
        .eq('id', flow.id);
      
      if (updateError) {
        throw new Error(`Failed to update flow: ${updateError.message}`);
      }
      
      stats.flows.failed++;
      stats.errors.push({
        type: 'flow',
        id: flow.id,
        name: flow.name,
        error: compileResult.errors?.map(e => e.message).join('; ') || 'Unknown compilation error'
      });
      
      return;
    }
    
    // Compilation successful - create initial version
    console.log('   ↳ Creating initial version...');
    const { data: version, error: versionError } = await supabase
      .from('stitch_flow_versions')
      .insert({
        flow_id: flow.id,
        visual_graph: visualGraph,
        execution_graph: compileResult.executionGraph,
        commit_message: 'Initial version (migrated from legacy format)'
      })
      .select()
      .single();
    
    if (versionError) {
      throw new Error(`Failed to create version: ${versionError.message}`);
    }
    
    // Update current_version_id
    console.log('   ↳ Updating current_version_id...');
    const { error: updateError } = await supabase
      .from('stitch_flows')
      .update({ current_version_id: version.id })
      .eq('id', flow.id);
    
    if (updateError) {
      throw new Error(`Failed to update current_version_id: ${updateError.message}`);
    }
    
    console.log('   ✅ Successfully migrated');
    stats.flows.successful++;
    
  } catch (error) {
    console.log(`   ❌ Migration failed: ${error}`);
    stats.flows.failed++;
    stats.errors.push({
      type: 'flow',
      id: flow.id,
      name: flow.name,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Migrate all flows
 */
async function migrateFlows(): Promise<void> {
  console.log('\n🔄 Starting flow migration...');
  
  // Fetch all flows
  const { data: flows, error } = await supabase
    .from('stitch_flows')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch flows: ${error.message}`);
  }
  
  stats.flows.total = flows.length;
  console.log(`Found ${flows.length} flows to migrate`);
  
  // Migrate each flow
  for (const flow of flows) {
    await migrateFlow(flow as StitchFlow);
  }
}

// ============================================================================
// Run Migration
// ============================================================================

/**
 * Migrate a single run to link it to a flow version
 * Requirement: 9.3
 */
async function migrateRun(run: StitchRun): Promise<void> {
  // Skip if already has flow_version_id
  if (run.flow_version_id) {
    stats.runs.linked++;
    return;
  }
  
  try {
    // Get the flow's current_version_id
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('current_version_id')
      .eq('id', run.flow_id)
      .single();
    
    if (flowError) {
      throw new Error(`Failed to fetch flow: ${flowError.message}`);
    }
    
    if (!flow.current_version_id) {
      // Flow has no version - mark for manual review
      console.log(`   ⚠️  Run ${run.id} needs manual review (flow has no version)`);
      stats.runs.needsReview++;
      stats.errors.push({
        type: 'run',
        id: run.id,
        error: `Flow ${run.flow_id} has no current version - run needs manual review`
      });
      return;
    }
    
    // Link run to flow's current version
    const { error: updateError } = await supabase
      .from('stitch_runs')
      .update({ flow_version_id: flow.current_version_id })
      .eq('id', run.id);
    
    if (updateError) {
      throw new Error(`Failed to update run: ${updateError.message}`);
    }
    
    stats.runs.linked++;
    
  } catch (error) {
    console.log(`   ❌ Failed to migrate run ${run.id}: ${error}`);
    stats.runs.needsReview++;
    stats.errors.push({
      type: 'run',
      id: run.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Migrate all runs
 */
async function migrateRuns(): Promise<void> {
  console.log('\n🔄 Starting run migration...');
  
  // Fetch all runs
  const { data: runs, error } = await supabase
    .from('stitch_runs')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch runs: ${error.message}`);
  }
  
  stats.runs.total = runs.length;
  console.log(`Found ${runs.length} runs to migrate`);
  
  // Migrate each run
  for (const run of runs) {
    await migrateRun(run as StitchRun);
  }
}

// ============================================================================
// Main Migration Function
// ============================================================================

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Stitch Canvas Versioning Migration                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // Step 0: Verify versioning tables exist
    console.log('\n🔍 Verifying versioning tables exist...');
    const { data: tables, error: tableError } = await supabase
      .from('stitch_flow_versions')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist
      console.error('\n❌ Error: stitch_flow_versions table does not exist!');
      console.error('   Please run the versioning migration first:');
      console.error('   npx tsx scripts/apply-versioning-migration.ts\n');
      process.exit(1);
    }
    
    console.log('   ✅ Versioning tables exist');
    
    // Step 1: Migrate flows
    await migrateFlows();
    
    // Step 2: Migrate runs
    await migrateRuns();
    
    // Step 3: Print summary
    printSummary();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// Summary Report
// ============================================================================

function printSummary(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Migration Summary                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log('\n📊 Flows:');
  console.log(`   Total:      ${stats.flows.total}`);
  console.log(`   ✅ Success:  ${stats.flows.successful}`);
  console.log(`   ⏭️  Skipped:  ${stats.flows.skipped}`);
  console.log(`   ❌ Failed:   ${stats.flows.failed}`);
  
  console.log('\n📊 Runs:');
  console.log(`   Total:      ${stats.runs.total}`);
  console.log(`   ✅ Linked:   ${stats.runs.linked}`);
  console.log(`   ⚠️  Review:   ${stats.runs.needsReview}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(err => {
      console.log(`\n   ${err.type.toUpperCase()}: ${err.id}`);
      if (err.name) console.log(`   Name: ${err.name}`);
      console.log(`   Error: ${err.error}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  
  if (stats.flows.failed > 0 || stats.runs.needsReview > 0) {
    console.log('\n⚠️  Some items need manual review. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ Migration completed successfully!');
  }
}

// ============================================================================
// Execute Migration
// ============================================================================

migrate();
