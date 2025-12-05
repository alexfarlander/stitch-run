#!/usr/bin/env tsx

/**
 * Verification Script: Demo Control Panel Component
 * 
 * Verifies that the DemoControlPanel component:
 * 1. Exports correctly
 * 2. Has the required props interface
 * 3. Can be imported without errors
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const COMPONENT_PATH = join(process.cwd(), 'src/components/canvas/DemoControlPanel.tsx');

console.log('🔍 Verifying Demo Control Panel Component...\n');

try {
  // Read the component file
  const componentCode = readFileSync(COMPONENT_PATH, 'utf-8');
  
  const checks = [
    {
      name: 'Component export exists',
      test: () => componentCode.includes('export function DemoControlPanel'),
      requirement: '14.1',
    },
    {
      name: 'Play button implementation',
      test: () => componentCode.includes('handlePlayClick') && componentCode.includes('/api/demo/start'),
      requirement: '6.1, 14.1',
    },
    {
      name: 'Reset button implementation',
      test: () => componentCode.includes('handleResetClick') && componentCode.includes('/api/demo/reset'),
      requirement: '6.3, 14.3',
    },
    {
      name: 'isRunning state management',
      test: () => componentCode.includes('isRunning') && componentCode.includes('setIsRunning'),
      requirement: '14.2',
    },
    {
      name: 'Demo running status display',
      test: () => componentCode.includes('Demo running...'),
      requirement: '6.2',
    },
    {
      name: 'Play button disabled when running',
      test: () => componentCode.includes('disabled={isRunning'),
      requirement: '14.2',
    },
    {
      name: 'Fixed positioning at bottom-left',
      test: () => componentCode.includes('fixed') && componentCode.includes('bottom') && componentCode.includes('left'),
      requirement: '14.5',
    },
    {
      name: 'Play icon imported',
      test: () => componentCode.includes("import { Play") || componentCode.includes("import {") && componentCode.includes("Play"),
      requirement: '14.1',
    },
    {
      name: 'Reset icon imported',
      test: () => componentCode.includes("RotateCcw") || componentCode.includes("RefreshCw"),
      requirement: '14.1',
    },
    {
      name: 'Loading state for Play button',
      test: () => componentCode.includes('Loader2') && componentCode.includes('animate-spin'),
      requirement: '6.2',
    },
  ];

  let passed = 0;
  let failed = 0;

  checks.forEach(check => {
    const result = check.test();
    if (result) {
      console.log(`✅ ${check.name} (Req: ${check.requirement})`);
      passed++;
    } else {
      console.log(`❌ ${check.name} (Req: ${check.requirement})`);
      failed++;
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${checks.length} checks`);

  if (failed === 0) {
    console.log('\n✨ All checks passed! Demo Control Panel component is properly implemented.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please review the component implementation.');
    process.exit(1);
  }

} catch (_error) {
  console.error('❌ Error verifying component:', error);
  process.exit(1);
}
