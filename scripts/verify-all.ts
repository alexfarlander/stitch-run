#!/usr/bin/env tsx
/**
 * Verify All - Master Verification Script
 * 
 * This script runs all individual verification scripts and aggregates their results:
 * - BMC Canvas verification
 * - Video Factory V2 workflow verification
 * 
 * It provides a comprehensive summary of all verification checks across the system.
 * 
 * Run with: npx tsx scripts/verify-all.ts
 * 
 * Requirements: 2.3
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE importing anything else
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

/**
 * Run a verification script and capture its result
 */
async function runVerificationScript(
  scriptName: string,
  flowId: string | null
): Promise<{ name: string; result: unknown; error?: string }> {
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

  if (!flowId) {
    return {
      name: scriptName,
      result: {
        passed: false,
        errors: [{ type: 'foreign_key', message: `${scriptName} not found in database` }],
        warnings: [],
        summary: { totalChecks: 0, passedChecks: 0, failedChecks: 1 },
      },
      error: `${scriptName} not found`,
    };
  }

  try {
    // Define verification checks
    const checks = [
      {
        name: 'Foreign Key Integrity',
        description: 'Validates all foreign key relationships are correct',
        run: () => checkForeignKeys(flowId),
      },
      {
        name: 'Node Type Registration',
        description: 'Ensures all node types are registered in React Flow',
        run: () => checkNodeTypes(flowId),
      },
      {
        name: 'Edge References',
        description: 'Validates all edges reference existing nodes',
        run: () => checkEdgeReferences(flowId),
      },
      {
        name: 'Parent Node Consistency',
        description: 'Checks parent node field usage is consistent',
        run: () => checkParentNodes(flowId),
      },
      {
        name: 'Topology Rules',
        description: 'Validates Splitter/Collector node configurations',
        run: () => checkTopology(flowId),
      },
      {
        name: 'Journey Edge Validity',
        description: 'Ensures journey events reference valid edges',
        run: () => checkJourneyEdges(flowId),
      },
    ];

    // Run all checks
    const result = await runChecks(checks);

    return {
      name: scriptName,
      result,
    };
  } catch (_error) {
    return {
      name: scriptName,
      result: {
        passed: false,
        errors: [
          {
            type: 'foreign_key',
            message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        warnings: [],
        summary: { totalChecks: 0, passedChecks: 0, failedChecks: 1 },
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main verification function
 */
async function main() {
  // Import after environment variables are loaded
  const { createServerClient } = await import('../src/lib/supabase/server');
  const { mergeResults } = await import('../src/lib/verification/utils');
  const { logResult, logInfo, logError, logSection, logSuccess } = await import(
    '../src/lib/verification/logger'
  );

  try {
    logSection('Master Verification - All Systems');
    logInfo('Running all verification scripts...\n');

    const _supabase = createServerClient();

    // Get BMC canvas
    const { data: bmcs } = await _supabase
      .from('stitch_flows')
      .select('id, name, canvas_type')
      .eq('canvas_type', 'bmc');

    let bmcId: string | null = null;
    if (bmcs && bmcs.length > 0) {
      const bmc = bmcs.find((b) => b.name === 'Default Business Model Canvas') || bmcs[0];
      bmcId = bmc.id;
      logInfo(`✓ Found BMC: ${bmc.name}`);
    } else {
      logError('✗ No BMC canvas found');
    }

    // Get Video Factory V2 workflow
    const { data: workflows } = await _supabase
      .from('stitch_flows')
      .select('id, name, canvas_type')
      .eq('canvas_type', 'workflow')
      .eq('name', 'Video Factory V2');

    let workflowId: string | null = null;
    if (workflows && workflows.length > 0) {
      workflowId = workflows[0].id;
      logInfo(`✓ Found Video Factory V2: ${workflows[0].name}`);
    } else {
      logError('✗ No Video Factory V2 workflow found');
    }

    logInfo('');

    // Run all verification scripts
    const results = await Promise.all([
      runVerificationScript('BMC Canvas', bmcId),
      runVerificationScript('Video Factory V2', workflowId),
    ]);

    // Display individual results
    for (const { name, result, error } of results) {
      logSection(`${name} Verification`);
      if (error) {
        logError(`Failed to run verification: ${error}`);
      } else {
        logResult(result, `${name} Results`);
      }
      console.log('');
    }

    // Aggregate results
    const aggregatedResult = mergeResults(results.map((r) => r.result));

    // Display comprehensive summary
    logSection('Comprehensive Summary');
    logInfo(`Total Verification Scripts: ${results.length}`);
    logInfo(`Total Checks: ${aggregatedResult.summary.totalChecks}`);
    logInfo(`Passed Checks: ${aggregatedResult.summary.passedChecks}`);
    logInfo(`Failed Checks: ${aggregatedResult.summary.failedChecks}`);
    logInfo(`Total Errors: ${aggregatedResult.errors.length}`);
    logInfo(`Total Warnings: ${aggregatedResult.warnings.length}`);
    console.log('');

    if (aggregatedResult.passed) {
      logSuccess('✓ All verification checks passed!');
      logInfo('\nThe system is in a valid state.');
      process.exit(0);
    } else {
      logError('✗ Some verification checks failed');
      logInfo('\nPlease review the errors above and fix the issues.');
      logInfo('You can run individual verification scripts for more details:');
      logInfo('  - npx tsx scripts/verify-bmc.ts');
      logInfo('  - npx tsx scripts/verify-video-factory-v2.ts');
      process.exit(1);
    }
  } catch (_error) {
    logError('Unexpected error during master verification');
    console.error(_error);
    process.exit(1);
  }
}

main();
