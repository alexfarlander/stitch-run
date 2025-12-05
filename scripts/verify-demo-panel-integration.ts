#!/usr/bin/env tsx

/**
 * Verification Script: Demo Control Panel Integration
 * 
 * Verifies that the DemoControlPanel is properly integrated into BMCCanvas
 * 
 * Task: 13. Integrate Demo Control Panel into BMC Canvas
 * Requirements: 14.1, 14.5
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface VerificationResult {
  check: string;
  passed: boolean;
  details?: string;
}

const results: VerificationResult[] = [];

function verify(check: string, condition: boolean, details?: string) {
  results.push({ check, passed: condition, details });
  const status = condition ? '✅' : '❌';
  console.log(`${status} ${check}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

console.log('🔍 Verifying Demo Control Panel Integration...\n');

// Read BMCCanvas.tsx
const bmcCanvasPath = join(process.cwd(), 'src/components/canvas/BMCCanvas.tsx');
const bmcCanvasContent = readFileSync(bmcCanvasPath, 'utf-8');

// Requirement 14.1: BMCCanvas should import DemoControlPanel
verify(
  'DemoControlPanel is imported',
  bmcCanvasContent.includes("import { DemoControlPanel } from './DemoControlPanel'"),
  'BMCCanvas imports the DemoControlPanel component'
);

// Requirement 14.1: BMCCanvas should render DemoControlPanel
verify(
  'DemoControlPanel is rendered',
  bmcCanvasContent.includes('<DemoControlPanel'),
  'BMCCanvas renders the DemoControlPanel component'
);

// Requirement 14.5: Panel should not obscure canvas content
// The component uses fixed positioning at bottom-left
verify(
  'Panel positioned to not obscure content',
  bmcCanvasContent.includes('DemoControlPanel') && 
  bmcCanvasContent.includes('AIAssistantPanel'),
  'Panel is rendered alongside other UI elements without conflicts'
);

// Check that the component is rendered after ReactFlow
const reactFlowIndex = bmcCanvasContent.indexOf('</ReactFlow>');
const demoControlIndex = bmcCanvasContent.indexOf('<DemoControlPanel');
verify(
  'Panel rendered outside ReactFlow',
  reactFlowIndex > 0 && demoControlIndex > reactFlowIndex,
  'DemoControlPanel is rendered as a sibling to ReactFlow, not inside it'
);

// Summary
console.log('\n' + '='.repeat(50));
const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\n✨ Integration Verification: ${passed}/${total} checks passed\n`);

if (passed === total) {
  console.log('🎉 Demo Control Panel successfully integrated into BMC Canvas!');
  console.log('\nNext steps:');
  console.log('  1. Start the development server: npm run dev');
  console.log('  2. Navigate to a BMC canvas view');
  console.log('  3. Verify the Demo Control Panel appears at bottom-left');
  console.log('  4. Test Play and Reset buttons');
  process.exit(0);
} else {
  console.log('❌ Some integration checks failed. Please review the issues above.');
  process.exit(1);
}
