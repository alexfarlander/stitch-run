/**
 * Verification Script: Node Sorting for Z-Index
 * 
 * This script verifies that nodes are correctly sorted by z-index
 * to ensure proper DOM stacking order in the canvas.
 * 
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { sortNodesForRendering, Z_INDEX_LAYERS } from '../src/components/canvas/utils';
import { Node } from '@xyflow/react';

// Mock BMC nodes for testing (avoiding Supabase dependency)
function createMockBMCNodes(): Node[] {
  return [
    // Section nodes (should render first)
    {
      id: 'section-marketing',
      type: 'section',
      position: { x: 0, y: 0 },
      data: { label: 'Marketing' },
      style: { zIndex: Z_INDEX_LAYERS.SECTION_BACKGROUND },
    },
    {
      id: 'section-sales',
      type: 'section',
      position: { x: 300, y: 0 },
      data: { label: 'Sales' },
      style: { zIndex: Z_INDEX_LAYERS.SECTION_BACKGROUND },
    },
    // Item nodes (should render after sections)
    {
      id: 'item-crm',
      type: 'integration-item',
      position: { x: 20, y: 50 },
      data: { label: 'CRM' },
      style: { zIndex: Z_INDEX_LAYERS.ITEMS },
    },
    {
      id: 'item-api',
      type: 'code-item',
      position: { x: 140, y: 50 },
      data: { label: 'API' },
      style: { zIndex: Z_INDEX_LAYERS.ITEMS },
    },
    // Financial sections (should render last)
    {
      id: 'costs-section',
      type: 'costs-section',
      position: { x: 0, y: 640 },
      data: { label: 'Costs' },
      style: { zIndex: Z_INDEX_LAYERS.FINANCIAL_SECTIONS },
    },
    {
      id: 'revenue-section',
      type: 'revenue-section',
      position: { x: 740, y: 640 },
      data: { label: 'Revenue' },
      style: { zIndex: Z_INDEX_LAYERS.FINANCIAL_SECTIONS },
    },
  ];
}

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

function verifyNodeSorting(): VerificationResult {
  const results: string[] = [];
  let allPassed = true;

  console.log('🔍 Verifying node sorting for z-index...\n');

  // Get mock BMC nodes
  const transformedNodes = createMockBMCNodes();
  console.log(`📊 Total nodes in test: ${transformedNodes.length}`);

  // Sort nodes
  const sortedNodes = sortNodesForRendering(transformedNodes);

  // Verify sorting order
  console.log('\n✅ Checking z-index sorting order...');
  let previousZIndex = -Infinity;
  let sortingCorrect = true;

  for (const node of sortedNodes) {
    const currentZIndex = typeof node.style?.zIndex === 'number' ? node.style.zIndex : 0;
    
    if (currentZIndex < previousZIndex) {
      sortingCorrect = false;
      results.push(`❌ Node ${node.id} (z-index: ${currentZIndex}) appears after node with higher z-index (${previousZIndex})`);
      allPassed = false;
    }
    
    previousZIndex = currentZIndex;
  }

  if (sortingCorrect) {
    console.log('   ✓ Nodes are correctly sorted by z-index');
    results.push('✓ Nodes are correctly sorted by z-index');
  }

  // Verify sections come first
  console.log('\n✅ Checking section nodes render first...');
  const sectionNodes = sortedNodes.filter(node => node.type === 'section');
  const nonSectionNodes = sortedNodes.filter(node => node.type !== 'section');
  
  // Find the index of the last section node
  const lastSectionIndex = sortedNodes.findLastIndex(node => node.type === 'section');
  // Find the index of the first non-section node
  const firstNonSectionIndex = sortedNodes.findIndex(node => node.type !== 'section');
  
  const sectionsFirst = lastSectionIndex < firstNonSectionIndex || sectionNodes.length === 0;

  if (sectionsFirst) {
    console.log('   ✓ Section nodes render first (background)');
    results.push('✓ Section nodes render first (background)');
  } else {
    console.log('   ❌ Section nodes do not render first');
    results.push('❌ Section nodes do not render first');
    allPassed = false;
  }

  // Verify items come after sections
  console.log('\n✅ Checking item nodes render after sections...');
  const sectionIndices = sortedNodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === 'section')
    .map(({ index }) => index);
  
  const itemIndices = sortedNodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => 
      node.type === 'section-item' || 
      node.type === 'integration-item' || 
      node.type === 'person-item' || 
      node.type === 'code-item' || 
      node.type === 'data-item'
    )
    .map(({ index }) => index);

  const maxSectionIndex = Math.max(...sectionIndices, -1);
  const minItemIndex = Math.min(...itemIndices, Infinity);

  if (maxSectionIndex < minItemIndex) {
    console.log('   ✓ Item nodes render after section nodes');
    results.push('✓ Item nodes render after section nodes');
  } else {
    console.log('   ❌ Some item nodes render before section nodes');
    results.push('❌ Some item nodes render before section nodes');
    allPassed = false;
  }

  // Verify financial sections
  console.log('\n✅ Checking financial section nodes...');
  const financialNodes = sortedNodes.filter(
    node => node.type === 'costs-section' || node.type === 'revenue-section'
  );

  if (financialNodes.length > 0) {
    const financialZIndex = typeof financialNodes[0].style?.zIndex === 'number' 
      ? financialNodes[0].style.zIndex 
      : 0;
    
    if (financialZIndex === Z_INDEX_LAYERS.FINANCIAL_SECTIONS) {
      console.log('   ✓ Financial sections have correct z-index (5)');
      results.push('✓ Financial sections have correct z-index (5)');
    } else {
      console.log(`   ❌ Financial sections have incorrect z-index (${financialZIndex})`);
      results.push(`❌ Financial sections have incorrect z-index (${financialZIndex})`);
      allPassed = false;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ All node sorting checks passed!');
    return {
      passed: true,
      message: 'All node sorting checks passed',
      details: results,
    };
  } else {
    console.log('❌ Some node sorting checks failed');
    return {
      passed: false,
      message: 'Some node sorting checks failed',
      details: results,
    };
  }
}

// Run verification
const result = verifyNodeSorting();
process.exit(result.passed ? 0 : 1);
