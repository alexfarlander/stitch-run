/**
 * Verification script for BMC seed data
 * Checks that all required nodes and edges are present
 */

// Mock environment variables to avoid import errors
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';

import { generateBMCGraph } from '../src/lib/seeds/default-bmc';

function verifyBMCSeed() {
  console.log('🔍 Verifying BMC seed data...\n');
  
  const graph = generateBMCGraph();
  
  // Count nodes by type
  const sectionNodes = graph.nodes.filter((n: any) => n.type === 'section');
  const itemNodes = graph.nodes.filter((n: any) => n.type === 'section-item');
  const financialNodes = itemNodes.filter((n: any) => n.data.itemType === 'financial');
  
  console.log('📊 Node Statistics:');
  console.log(`  - Section nodes: ${sectionNodes.length} (expected: 13)`);
  console.log(`  - Item nodes: ${itemNodes.length}`);
  console.log(`  - Financial nodes: ${financialNodes.length} (expected: 7)`);
  console.log(`  - Total nodes: ${graph.nodes.length}\n`);
  
  // Count edges by type
  const journeyEdges = graph.edges.filter(e => e.type === 'journey');
  const systemEdges = graph.edges.filter(e => e.type === 'system');
  
  console.log('🔗 Edge Statistics:');
  console.log(`  - Journey edges: ${journeyEdges.length}`);
  console.log(`  - System edges: ${systemEdges.length}`);
  console.log(`  - Total edges: ${graph.edges.length}\n`);
  
  // Verify financial nodes have values
  console.log('💰 Financial Nodes:');
  financialNodes.forEach((node: any) => {
    const hasValue = node.data.value !== undefined;
    const _hasCurrency = node.data.currency === 'USD';
    const _hasFormat = node.data.format === 'currency';
    const status = hasValue && hasCurrency && hasFormat ? '✅' : '❌';
    console.log(`  ${status} ${node.data.label}: $${node.data.value || 0} (${node.id})`);
  });
  console.log();
  
  // Verify system edges have systemAction
  console.log('⚙️  System Edges:');
  const systemEdgesWithAction = systemEdges.filter(e => e.data?.systemAction);
  console.log(`  - System edges with action: ${systemEdgesWithAction.length}/${systemEdges.length}`);
  
  const actionCounts: Record<string, number> = {};
  systemEdges.forEach(edge => {
    const action = edge.data?.systemAction || 'none';
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });
  
  Object.entries(actionCounts).forEach(([action, count]) => {
    console.log(`    - ${action}: ${count}`);
  });
  console.log();
  
  // Verify system edges have correct styling
  const systemEdgesWithStyle = systemEdges.filter(e => 
    e.style?.strokeDasharray === '5 5' && 
    e.style?.stroke === '#64748b'
  );
  console.log(`  - System edges with dashed style: ${systemEdgesWithStyle.length}/${systemEdges.length}\n`);
  
  // Verify sections
  console.log('📦 Sections:');
  const expectedSections = [
    'Marketing', 'Sales', 'Offers', 'Products', 'Support', 
    'Recommendations', 'Paying Customers', 'Data', 'People', 
    'Integrations', 'Code', 'Revenue', 'Costs'
  ];
  
  expectedSections.forEach(section => {
    const found = sectionNodes.find(n => n.data.label === section);
    const status = found ? '✅' : '❌';
    console.log(`  ${status} ${section}`);
  });
  console.log();
  
  // Summary
  const allChecks = [
    sectionNodes.length === 13,
    financialNodes.length === 7,
    systemEdges.length > 0,
    journeyEdges.length > 0,
    systemEdgesWithAction.length === systemEdges.length,
    systemEdgesWithStyle.length === systemEdges.length,
    financialNodes.every(n => n.data.value !== undefined)
  ];
  
  const passed = allChecks.filter(Boolean).length;
  const total = allChecks.length;
  
  console.log('📋 Summary:');
  console.log(`  ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('\n✅ All verification checks passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some verification checks failed!');
    process.exit(1);
  }
}

verifyBMCSeed();
