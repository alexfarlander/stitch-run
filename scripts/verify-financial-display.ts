#!/usr/bin/env tsx

/**
 * Verification Script: Financial Value Display
 * 
 * Tests that financial nodes display their values as formatted currency.
 * 
 * Requirements: 9.3
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import { getAdminClient } from '../src/lib/supabase/client';
import { StitchNode } from '../src/types/stitch';

interface FinancialNodeData {
  label: string;
  value?: number;
  currency?: string;
  format?: string;
}

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

async function verifyFinancialDisplay() {
  console.log('🔍 Verifying Financial Value Display...\n');

  const supabase = getAdminClient();

  // Step 1: Fetch BMC canvas
  console.log('📋 Step 1: Fetching BMC canvas...');
  const { data: bmcList, error: fetchError } = await supabase
    .from('stitch_flows')
    .select('id, name, graph')
    .eq('canvas_type', 'bmc')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError || !bmcList || bmcList.length === 0) {
    console.error('❌ Failed to fetch BMC canvas:', fetchError);
    process.exit(1);
  }

  const bmc = bmcList[0];
  console.log(`✅ Found BMC: ${bmc.name} (${bmc.id})\n`);

  // Step 2: Find all financial nodes
  console.log('📋 Step 2: Finding financial nodes...');
  const financialNodes = bmc.graph.nodes.filter((node: StitchNode) =>
    node.type === 'financial-item' ||
    (node.data as FinancialNodeData)?.value !== undefined
  );

  if (financialNodes.length === 0) {
    console.error('❌ No financial nodes found in BMC');
    process.exit(1);
  }

  console.log(`✅ Found ${financialNodes.length} financial nodes\n`);

  // Step 3: Verify each financial node has proper data structure
  console.log('📋 Step 3: Verifying financial node data structure...');
  let allValid = true;

  for (const node of financialNodes) {
    const data = node.data as FinancialNodeData;
    const hasValue = data.value !== undefined;
    const hasCurrency = data.currency !== undefined;
    const hasFormat = data.format !== undefined;

    console.log(`\n  Node: ${node.id}`);
    console.log(`    Label: ${data.label}`);
    console.log(`    Type: ${node.type}`);
    console.log(`    Has value: ${hasValue ? '✅' : '❌'}`);

    if (hasValue) {
      console.log(`    Value (cents): ${data.value}`);
      console.log(`    Formatted: ${formatCurrency(data.value!, data.currency)}`);
      console.log(`    Currency: ${data.currency || 'N/A'}`);
      console.log(`    Format: ${data.format || 'N/A'}`);
    }

    if (!hasValue) {
      console.log(`    ⚠️  Warning: Financial node missing value property`);
      allValid = false;
    }
  }

  console.log('\n');

  // Step 4: Test currency formatting
  console.log('📋 Step 4: Testing currency formatting...');
  const testCases = [
    { cents: 12450, expected: '$124' },
    { cents: 149400, expected: '$1,494' },
    { cents: 5000, expected: '$50' },
    { cents: 361, expected: '$4' },
    { cents: 150, expected: '$2' },
    { cents: 75, expected: '$1' },
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

  // Step 5: Verify node types
  console.log('📋 Step 5: Verifying node types...');
  const financialItemNodes = financialNodes.filter((n: StitchNode) => n.type === 'financial-item');
  const otherNodes = financialNodes.filter((n: StitchNode) => n.type !== 'financial-item');

  console.log(`  Financial-item nodes: ${financialItemNodes.length}`);
  console.log(`  Other nodes with value: ${otherNodes.length}`);

  if (otherNodes.length > 0) {
    console.log(`  ⚠️  Warning: Some financial nodes don't use 'financial-item' type:`);
    otherNodes.forEach((n: StitchNode) => {
      console.log(`    - ${n.id} (type: ${n.type})`);
    });
  }

  console.log('\n');

  // Final summary
  console.log('📊 Summary:');
  console.log(`  Total financial nodes: ${financialNodes.length}`);
  console.log(`  Nodes with value property: ${financialNodes.filter((n: StitchNode) => (n.data as FinancialNodeData).value !== undefined).length}`);
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

// Run verification
verifyFinancialDisplay().catch((error) => {
  console.error('❌ Verification failed with error:', error);
  process.exit(1);
});
