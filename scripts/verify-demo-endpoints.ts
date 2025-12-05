/**
 * Verify Demo Endpoints
 * 
 * Verifies that the demo orchestrator endpoints are properly implemented:
 * 1. Files exist
 * 2. Exports are correct
 * 3. Dependencies are available
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

async function verifyEndpoints() {
  console.log('=== Verifying Demo Orchestrator Implementation ===\n');

  let errors = 0;

  // Check file existence
  const files = [
    'src/app/api/demo/start/route.ts',
    'src/app/api/demo/reset/route.ts',
    'src/lib/demo/demo-script.ts',
    'src/lib/metrics/financial-updates.ts',
  ];

  console.log('Step 1: Checking file existence...');
  for (const file of files) {
    const fullPath = resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - NOT FOUND`);
      errors++;
    }
  }
  console.log('');

  // Check imports
  console.log('Step 2: Checking imports...');
  try {
    const demoScript = await import('../src/lib/demo/demo-script');
  
  if (typeof demoScript.CLOCKWORK_DEMO_SCRIPT === 'undefined') {
    console.log('❌ CLOCKWORK_DEMO_SCRIPT not exported from demo-script.ts');
    errors++;
  } else if (!Array.isArray(demoScript.CLOCKWORK_DEMO_SCRIPT)) {
    console.log('❌ CLOCKWORK_DEMO_SCRIPT is not an array');
    errors++;
  } else {
    console.log(`✅ CLOCKWORK_DEMO_SCRIPT: ${demoScript.CLOCKWORK_DEMO_SCRIPT.length} events`);
  }
  
  if (typeof demoScript.getDemoScriptDuration !== 'function') {
    console.log('❌ getDemoScriptDuration not exported');
    errors++;
  } else {
    const duration = demoScript.getDemoScriptDuration();
    console.log(`✅ getDemoScriptDuration: ${duration}ms`);
  }
  
  if (typeof demoScript.getDemoScriptEventCount !== 'function') {
    console.log('❌ getDemoScriptEventCount not exported');
    errors++;
  } else {
    const count = demoScript.getDemoScriptEventCount();
    console.log(`✅ getDemoScriptEventCount: ${count} events`);
  }
} catch (error) {
  console.log('❌ Failed to import demo-script.ts:', error);
  errors++;
}
console.log('');

  // Check financial updates
  console.log('Step 3: Checking financial updates module...');
  try {
    const financialUpdates = await import('../src/lib/metrics/financial-updates');
  
  if (typeof financialUpdates.resetFinancialMetrics !== 'function') {
    console.log('❌ resetFinancialMetrics not exported');
    errors++;
  } else {
    console.log('✅ resetFinancialMetrics exported');
  }
  
  if (typeof financialUpdates.updateFinancials !== 'function') {
    console.log('❌ updateFinancials not exported');
    errors++;
  } else {
    console.log('✅ updateFinancials exported');
  }
  } catch (error) {
    console.log('❌ Failed to import financial-updates.ts:', error);
    errors++;
  }
  console.log('');

  // Check clockwork entities
  console.log('Step 4: Checking clockwork entities...');
  try {
    const clockworkEntities = await import('../src/lib/seeds/clockwork-entities');
  
  if (typeof clockworkEntities.CLOCKWORK_ENTITIES === 'undefined') {
    console.log('❌ CLOCKWORK_ENTITIES not exported');
    errors++;
  } else if (!Array.isArray(clockworkEntities.CLOCKWORK_ENTITIES)) {
    console.log('❌ CLOCKWORK_ENTITIES is not an array');
    errors++;
  } else {
    console.log(`✅ CLOCKWORK_ENTITIES: ${clockworkEntities.CLOCKWORK_ENTITIES.length} entities`);
  }
  } catch (error) {
    console.log('❌ Failed to import clockwork-entities.ts:', error);
    errors++;
  }
  console.log('');

  // Summary
  console.log('=== Verification Summary ===');
  if (errors === 0) {
    console.log('✅ All checks passed!');
    console.log('');
    console.log('Demo orchestrator endpoints are properly implemented:');
    console.log('  - POST /api/demo/start - Executes demo script');
    console.log('  - POST /api/demo/reset - Resets entities and financials');
    console.log('');
    console.log('To test the endpoints, ensure the Next.js server is running and use:');
    console.log('  npm run dev');
    console.log('  ./scripts/test-demo-endpoints.sh');
    process.exit(0);
  } else {
    console.log(`❌ ${errors} error(s) found`);
    process.exit(1);
  }
}

verifyEndpoints().catch(console.error);
