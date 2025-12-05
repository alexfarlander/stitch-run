#!/usr/bin/env tsx

/**
 * Test Script: Financial Value Display
 * 
 * Tests that financial nodes are properly configured with values.
 * 
 * Requirements: 9.3
 */

import { generateBMCGraph } from '../src/lib/seeds/default-bmc';

/**
 * Format currency value from cents to display format
 */
function formatCurrency(value: number, currency: string = 'USD'): string {
  const dollars = value / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

function testFinancialDisplay() {
  console.log('🔍 Testing Financial Value Display...\n');
  
  // Generate BMC graph
  const graph = generateBMCGraph();
  
  // Step 1: Find all financial nodes
  console.log('📋 Step 1: Finding financial nodes...');
  const financialNodes = graph.nodes.filter(node => 
    node.type === 'financial-item' || 
    (node.data as unknown)?.value !== undefined
  );
  
  if (financialNodes.length === 0) {
    console.error('❌ No financial nodes found in BMC');
    process.exit(1);
  }
  
  console.log(`✅ Found ${financialNodes.length} financial nodes\n`);
  
  // Step 2: Verify each financial node has proper data structure
  console.log('📋 Step 2: Verifying financial node data structure...');
  let allValid = true;
  
  for (const node of financialNodes) {
    const _data = node.data as unknown;
    const hasValue = data.value !== undefined;
    const _hasCurrency = data.currency !== undefined;
    const _hasFormat = data.format !== undefined;
    const isCorrectType = node.type === 'financial-item';
    
    console.log(`\n  Node: ${node.id}`);
    console.log(`    Label: ${data.label}`);
    console.log(`    Type: ${node.type} ${isCorrectType ? '✅' : '❌ (should be financial-item)'}`);
    console.log(`    Has value: ${hasValue ? '✅' : '❌'}`);
    
    if (hasValue) {
      console.log(`    Value (cents): ${data.value}`);
      console.log(`    Formatted: ${formatCurrency(data.value, data.currency)}`);
      console.log(`    Currency: ${data.currency || 'N/A'}`);
      console.log(`    Format: ${data.format || 'N/A'}`);
    }
    
    if (!hasValue || !isCorrectType) {
      allValid = false;
    }
  }
  
  console.log('\n');
  
  // Step 3: Test currency formatting
  console.log('📋 Step 3: Testing currency formatting...');
  const testCases = [
    { cents: 12450, expected: '$125' },  // $124.50 rounds to $125
    { cents: 149400, expected: '$1,494' },
    { cents: 5000, expected: '$50' },
    { cents: 361, expected: '$4' },  // $3.61 rounds to $4
    { cents: 150, expected: '$2' },  // $1.50 rounds to $2
    { cents: 75, expected: '$1' },   // $0.75 rounds to $1
    { cents: 200, expected: '$2' },
  ];
  
  let formattingValid = true;
  for (const testCase of testCases) {
    const formatted = formatCurrency(testCase.cents);
    const matches = formatted === testCase.expected;
    console.log(`  ${testCase.cents} cents -> ${formatted} ${matches ? '✅' : '❌ (expected ' + testCase.expected + ')'}`);
    if (!matches) {
      formattingValid = false;
    }
  }
  
  console.log('\n');
  
  // Step 4: Verify node types
  console.log('📋 Step 4: Verifying node types...');
  const financialItemNodes = financialNodes.filter(n => n.type === 'financial-item');
  const otherNodes = financialNodes.filter(n => n.type !== 'financial-item');
  
  console.log(`  Financial-item nodes: ${financialItemNodes.length}`);
  console.log(`  Other nodes with value: ${otherNodes.length}`);
  
  if (otherNodes.length > 0) {
    console.log(`  ⚠️  Warning: Some financial nodes don't use 'financial-item' type:`);
    otherNodes.forEach(n => {
      console.log(`    - ${n.id} (type: ${n.type})`);
    });
  }
  
  console.log('\n');
  
  // Final summary
  console.log('📊 Summary:');
  console.log(`  Total financial nodes: ${financialNodes.length}`);
  console.log(`  Nodes with value property: ${financialNodes.filter(n => (n.data as unknown).value !== undefined).length}`);
  console.log(`  Nodes using financial-item type: ${financialItemNodes.length}`);
  console.log(`  Data structure valid: ${allValid ? '✅' : '❌'}`);
  console.log(`  Currency formatting valid: ${formattingValid ? '✅' : '❌'}`);
  
  if (allValid && formattingValid && financialItemNodes.length === financialNodes.length) {
    console.log('\n✅ All checks passed! Financial value display is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Review the output above.');
    process.exit(1);
  }
}

// Run test
testFinancialDisplay();
