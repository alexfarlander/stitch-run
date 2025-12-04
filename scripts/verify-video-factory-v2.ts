#!/usr/bin/env tsx
/**
 * Verify Video Factory V2 Workflow
 * 
 * This script runs all verification checks on the Video Factory V2 workflow to validate:
 * - Foreign key relationships
 * - Node type registration
 * - Edge references
 * - Parent node consistency
 * - Splitter/Collector topology
 * - Journey edge validity
 * 
 * Run with: npx tsx scripts/verify-video-factory-v2.ts
 * 
 * Requirements: 2.2
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE importing anything else
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

/**
 * Main verification function
 */
async function main() {
  // Import after environment variables are loaded
  const { createServerClient } = await import('../src/lib/supabase/server');
  const {
    checkForeignKeys,
    checkNodeTypes,
    checkEdgeReferences,
    checkParentNodes,
    checkTopology,
    checkJourneyEdges,
  } = await import('../src/lib/verification/checks');
  const { runChecks } = await import('../src/lib/verification/utils');
  const { logResult, logInfo, logError, logSection } = await import('../src/lib/verification/logger');
  
  try {
    logSection('Video Factory V2 Workflow Verification');
    logInfo('Running all verification checks on Video Factory V2 workflow...\n');

    // Get the Video Factory V2 workflow ID
    const supabase = createServerClient();
    
    // First check if any Video Factory V2 workflow exists
    const { data: workflows, error: queryError } = await supabase
      .from('stitch_flows')
      .select('id, name, canvas_type')
      .eq('canvas_type', 'workflow')
      .eq('name', 'Video Factory V2');

    if (queryError) {
      logError('Failed to query for Video Factory V2 workflow');
      console.error('Error:', queryError.message);
      process.exit(1);
    }

    if (!workflows || workflows.length === 0) {
      logError('No Video Factory V2 workflow found in database');
      logInfo('\nTo create the workflow, run: npx tsx scripts/seed-video-factory-v2.ts');
      process.exit(1);
    }

    const workflow = workflows[0];
    logInfo(`Found workflow: ${workflow.name} (ID: ${workflow.id})`);
    logInfo(`Canvas Type: ${workflow.canvas_type}\n`);

    // Define verification checks
    const checks = [
      {
        name: 'Foreign Key Integrity',
        description: 'Validates all foreign key relationships are correct',
        run: () => checkForeignKeys(workflow.id),
      },
      {
        name: 'Node Type Registration',
        description: 'Ensures all node types are registered in React Flow',
        run: () => checkNodeTypes(workflow.id),
      },
      {
        name: 'Edge References',
        description: 'Validates all edges reference existing nodes',
        run: () => checkEdgeReferences(workflow.id),
      },
      {
        name: 'Parent Node Consistency',
        description: 'Checks parent node field usage is consistent',
        run: () => checkParentNodes(workflow.id),
      },
      {
        name: 'Topology Rules',
        description: 'Validates Splitter/Collector node configurations',
        run: () => checkTopology(workflow.id),
      },
      {
        name: 'Journey Edge Validity',
        description: 'Ensures journey events reference valid edges',
        run: () => checkJourneyEdges(workflow.id),
      },
    ];

    // Run all checks
    const result = await runChecks(checks);

    // Display results
    logResult(result, 'Video Factory V2 Workflow Verification Results');

    // Exit with appropriate status code
    if (result.passed) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    logError('Unexpected error during verification');
    console.error(error);
    process.exit(1);
  }
}

main();
