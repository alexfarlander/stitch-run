/**
 * Verify Demo Implementation
 * Simple file-based verification without imports
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== Verifying Demo Orchestrator Implementation ===\n');

let errors = 0;

// Check files exist and contain key exports
const checks = [
  {
    file: 'src/app/api/demo/start/route.ts',
    contains: ['export async function POST', 'CLOCKWORK_DEMO_SCRIPT', 'setTimeout'],
  },
  {
    file: 'src/app/api/demo/reset/route.ts',
    contains: ['export async function POST', 'CLOCKWORK_ENTITIES', 'resetFinancialMetrics'],
  },
];

for (const check of checks) {
  const fullPath = resolve(process.cwd(), check.file);
  
  if (!existsSync(fullPath)) {
    console.log(`❌ ${check.file} - NOT FOUND`);
    errors++;
    continue;
  }
  
  const content = readFileSync(fullPath, 'utf-8');
  const missing = check.contains.filter(str => !content.includes(str));
  
  if (missing.length > 0) {
    console.log(`❌ ${check.file} - Missing: ${missing.join(', ')}`);
    errors++;
  } else {
    console.log(`✅ ${check.file}`);
  }
}

console.log('');

if (errors === 0) {
  console.log('✅ All implementation checks passed!\n');
  console.log('Demo orchestrator endpoints implemented:');
  console.log('  - POST /api/demo/start');
  console.log('  - POST /api/demo/reset\n');
  console.log('To test, start the dev server and run:');
  console.log('  npm run dev');
  console.log('  ./scripts/test-demo-endpoints.sh');
  process.exit(0);
} else {
  console.log(`❌ ${errors} error(s) found`);
  process.exit(1);
}
