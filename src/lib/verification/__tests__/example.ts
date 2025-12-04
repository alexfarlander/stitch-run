/**
 * Example usage of verification functions
 * This file demonstrates how to use the verification checks
 */

import {
  checkForeignKeys,
  checkNodeTypes,
  checkEdgeReferences,
  checkParentNodes,
  checkTopology,
  checkJourneyEdges,
  checkRealtimeConfig,
  checkRLSPolicies,
} from '../checks';

/**
 * Example: Run all verification checks for a flow
 */
export async function verifyFlow(flowId: string) {
  console.log(`🔍 Verifying flow ${flowId}...\n`);

  const checks = [
    { name: 'Foreign Keys', fn: () => checkForeignKeys(flowId) },
    { name: 'Node Types', fn: () => checkNodeTypes(flowId) },
    { name: 'Edge References', fn: () => checkEdgeReferences(flowId) },
    { name: 'Parent Nodes', fn: () => checkParentNodes(flowId) },
    { name: 'Topology', fn: () => checkTopology(flowId) },
    { name: 'Journey Edges', fn: () => checkJourneyEdges(flowId) },
  ];

  let totalErrors = 0;

  for (const check of checks) {
    const errors = await check.fn();
    
    if (errors.length === 0) {
      console.log(`✅ ${check.name}: PASSED`);
    } else {
      console.log(`❌ ${check.name}: FAILED (${errors.length} errors)`);
      errors.forEach((error) => {
        console.log(`   - ${error.message}`);
        if (error.context) {
          console.log(`     Context:`, JSON.stringify(error.context, null, 2));
        }
      });
      totalErrors += errors.length;
    }
  }

  console.log(`\n📊 Summary: ${totalErrors} total errors`);
  return totalErrors === 0;
}

/**
 * Example: Run system-wide checks
 */
export async function verifySystem() {
  console.log('🔍 Verifying system configuration...\n');

  const checks = [
    { name: 'Realtime Config', fn: checkRealtimeConfig },
    { name: 'RLS Policies', fn: checkRLSPolicies },
  ];

  let totalErrors = 0;

  for (const check of checks) {
    const errors = await check.fn();
    
    if (errors.length === 0) {
      console.log(`✅ ${check.name}: PASSED`);
    } else {
      console.log(`❌ ${check.name}: FAILED (${errors.length} errors)`);
      errors.forEach((error) => {
        console.log(`   - ${error.message}`);
      });
      totalErrors += errors.length;
    }
  }

  console.log(`\n📊 Summary: ${totalErrors} total errors`);
  return totalErrors === 0;
}

/**
 * Example: Check journey edges specifically
 */
export async function verifyJourneyData(flowId: string) {
  console.log(`🔍 Verifying journey data for flow ${flowId}...\n`);

  const errors = await checkJourneyEdges(flowId);

  if (errors.length === 0) {
    console.log('✅ All journey events reference valid edges');
    return true;
  }

  console.log(`❌ Found ${errors.length} journey validation errors:\n`);
  
  errors.forEach((error) => {
    console.log(`${error.message}`);
    if (error.context) {
      if (error.context.entityName) {
        console.log(`  Entity: ${error.context.entityName}`);
      }
      if (error.context.edgeId) {
        console.log(`  Invalid Edge ID: ${error.context.edgeId}`);
      }
      if (error.context.eventType) {
        console.log(`  Event Type: ${error.context.eventType}`);
      }
      console.log('');
    }
  });

  return false;
}
