#!/usr/bin/env tsx
/**
 * Verify BMC Canvas
 * 
 * This script runs all verification checks on the BMC canvas to validate:
 * - Foreign key relationships
 * - Node type registration
 * - Edge references
 * - Parent node consistency
 * - Splitter/Collector topology
 * - Journey edge validity
 * 
 * Run with: npx tsx scripts/verify-bmc.ts
 * 
 * Requirements: 2.1
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
    logSection('BMC Canvas Verification');
    logInfo('Running all verification checks on BMC canvas...\n');

    // Get the BMC canvas ID
    const supabase = createServerClient();
    
    // First check if any BMC exists
    const { data: bmcs, error: queryError } = await supabase
      .from('stitch_flows')
      .select('id, name, canvas_type')
      .eq('canvas_type', 'bmc');

    if (queryError) {
      logError('Failed to query for BMC canvases');
      console.error('Error:', queryError.message);
      process.exit(1);
    }

    if (!bmcs || bmcs.length === 0) {
      logError('No BMC canvas found in database');
      logInfo('\nTo create a BMC, run: npx tsx scripts/seed-bmc.ts');
      process.exit(1);
    }

    // Try to find the default BMC, or use the first one
    let bmc = bmcs.find(b => b.name === 'Default Business Model Canvas');
    if (!bmc) {
      bmc = bmcs[0];
      logInfo(`Using BMC: ${bmc.name} (no "Default Business Model Canvas" found)`);
    }

    logInfo(`Found BMC: ${bmc.name} (ID: ${bmc.id})`);
    logInfo(`Canvas Type: ${bmc.canvas_type}\n`);

    // Define verification checks
    const checks = [
      {
        name: 'Foreign Key Integrity',
        description: 'Validates all foreign key relationships are correct',
        run: () => checkForeignKeys(bmc.id),
      },
      {
        name: 'Node Type Registration',
        description: 'Ensures all node types are registered in React Flow',
        run: () => checkNodeTypes(bmc.id),
      },
      {
        name: 'Edge References',
        description: 'Validates all edges reference existing nodes',
        run: () => checkEdgeReferences(bmc.id),
      },
      {
        name: 'Parent Node Consistency',
        description: 'Checks parent node field usage is consistent',
        run: () => checkParentNodes(bmc.id),
      },
      {
        name: 'Topology Rules',
        description: 'Validates Splitter/Collector node configurations',
        run: () => checkTopology(bmc.id),
      },
      {
        name: 'Journey Edge Validity',
        description: 'Ensures journey events reference valid edges',
        run: () => checkJourneyEdges(bmc.id),
      },
    ];

    // Run all checks
    const result = await runChecks(checks);

    // Display results
    logResult(result, 'BMC Canvas Verification Results');

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
