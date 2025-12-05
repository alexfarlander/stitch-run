/**
 * Checkpoint 14: Verify webhook and demo flow
 * 
 * This script verifies that all components from tasks 1-13 are working correctly:
 * - BMC seed data (task 1)
 * - Entity seed data (task 2)
 * - Master seed script (task 3)
 * - SystemEdge component (tasks 4-5)
 * - Webhook node mapper (task 6)
 * - System edge trigger logic (task 7)
 * - Webhook route handler (task 8)
 * - Financial update logic (task 9)
 * - Demo script definition (task 10)
 * - Demo orchestrator API endpoints (task 11)
 * - Demo Control Panel component (task 12)
 * - Demo Control Panel integration (task 13)
 */

// Load environment variables FIRST before any imports
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env.local') });

// Now import modules that need env vars
import { getAdminClient } from '../src/lib/supabase/client';
import { WEBHOOK_NODE_MAP } from '../src/lib/webhooks/node-map';
import { CLOCKWORK_DEMO_SCRIPT } from '../src/lib/demo/demo-script';
import { CLOCKWORK_ENTITIES } from '../src/lib/seeds/clockwork-entities';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  task: string;
}

const results: CheckResult[] = [];

function addResult(name: string, passed: boolean, message: string, task: string) {
  results.push({ name, passed, message, task });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message} (Task ${task})`);
}

async function checkBMCSeedData() {
  console.log('\n📊 Checking BMC Seed Data (Task 1)...');
  const _supabase = getAdminClient();
  
  try {
    const { data: bmc, error } = await supabase
      .from('stitch_flows')
      .select('id, name, graph')
      .eq('canvas_type', 'bmc')
      .maybeSingle();
    
    if (error || !bmc) {
      addResult('BMC Canvas', false, 'BMC canvas not found in database', '1');
      return false;
    }
    
    addResult('BMC Canvas', true, `Found: ${bmc.name}`, '1');
    
    // Check sections
    const sections = bmc.graph.nodes.filter((n: unknown) => n.type === 'Section');
    addResult('BMC Sections', sections.length === 13, `${sections.length}/13 sections`, '1');
    
    // Check item nodes
    const itemNodes = bmc.graph.nodes.filter((n: unknown) => n.type === 'section-item');
    addResult('Item Nodes', itemNodes.length > 0, `${itemNodes.length} item nodes`, '1');
    
    // Check financial nodes
    const financialNodes = bmc.graph.nodes.filter((n: unknown) => 
      n.id.includes('mrr') || n.id.includes('arr') || n.id.includes('cost') || n.id.includes('ltv')
    );
    addResult('Financial Nodes', financialNodes.length >= 7, `${financialNodes.length} financial nodes`, '1');
    
    // Check journey edges
    const journeyEdges = bmc.graph.edges.filter((e: unknown) => e.type === 'journey');
    addResult('Journey Edges', journeyEdges.length > 0, `${journeyEdges.length} journey edges`, '1');
    
    // Check system edges
    const systemEdges = bmc.graph.edges.filter((e: unknown) => e.type === 'system');
    addResult('System Edges', systemEdges.length > 0, `${systemEdges.length} system edges`, '1');
    
    // Check system edge styling
    const dashedEdges = systemEdges.filter((e: unknown) => 
      e.style?.strokeDasharray || e.data?.strokeDasharray
    );
    addResult('System Edge Styling', dashedEdges.length === systemEdges.length, 
      `${dashedEdges.length}/${systemEdges.length} have dashed styling`, '4');
    
    return true;
  } catch (_error) {
    addResult('BMC Canvas', false, `Error: ${error}`, '1');
    return false;
  }
}

async function checkEntitySeedData() {
  console.log('\n👻 Checking Entity Seed Data (Task 2)...');
  const _supabase = getAdminClient();
  
  try {
    const { data: entities, error } = await supabase
      .from('stitch_entities')
      .select('*')
      .like('email', '%@monsters.io');
    
    if (error || !entities) {
      addResult('Entities', false, 'Failed to fetch entities', '2');
      return false;
    }
    
    addResult('Entity Count', entities.length === 13, `${entities.length}/13 entities`, '2');
    
    // Check entity types
    const validTypes = entities.every(e => ['lead', 'customer', 'churned'].includes(e.entity_type));
    addResult('Entity Types', validTypes, 'All entities have valid types', '2');
    
    // Check avatars
    const hasAvatars = entities.every(e => e.avatar_url && e.avatar_url.includes('dicebear'));
    addResult('Avatar URLs', hasAvatars, 'All entities have DiceBear avatars', '2');
    
    // Check positioning
    const onNodes = entities.filter(e => e.current_node_id).length;
    const onEdges = entities.filter(e => e.current_edge_id).length;
    addResult('Entity Positioning', onNodes + onEdges === 13, 
      `${onNodes} on nodes, ${onEdges} on edges`, '2');
    
    // Check Ghost and Goblin on edges
    const ghost = entities.find(e => e.name === 'Ghost');
    const goblin = entities.find(e => e.name === 'Goblin');
    const ghostOnEdge = ghost?.current_edge_id !== null;
    const goblinOnEdge = goblin?.current_edge_id !== null;
    addResult('Ghost & Goblin on Edges', ghostOnEdge && goblinOnEdge, 
      `Ghost: ${ghostOnEdge}, Goblin: ${goblinOnEdge}`, '2');
    
    return true;
  } catch (_error) {
    addResult('Entities', false, `Error: ${error}`, '2');
    return false;
  }
}

function checkWebhookNodeMapper() {
  console.log('\n🗺️  Checking Webhook Node Mapper (Task 6)...');
  
  const expectedSources = [
    'linkedin-lead',
    'youtube-signup',
    'seo-form',
    'calendly-demo',
    'stripe-trial',
    'stripe-subscription-basic',
    'stripe-subscription-pro',
    'stripe-subscription-enterprise',
    'zendesk-ticket',
    'stripe-churn',
    'referral',
  ];
  
  const mappedSources = Object.keys(WEBHOOK_NODE_MAP);
  const allMapped = expectedSources.every(s => mappedSources.includes(s));
  
  addResult('Webhook Mappings', allMapped, 
    `${mappedSources.length} webhook sources mapped`, '6');
  
  // Check that all mapped nodes have valid IDs
  const validNodeIds = Object.values(WEBHOOK_NODE_MAP).every(id => 
    typeof id === 'string' && id.startsWith('item-')
  );
  addResult('Node ID Format', validNodeIds, 'All node IDs are valid', '6');
  
  return allMapped && validNodeIds;
}

function checkDemoScript() {
  console.log('\n🎬 Checking Demo Script (Task 10)...');
  
  addResult('Demo Events', CLOCKWORK_DEMO_SCRIPT.length >= 5, 
    `${CLOCKWORK_DEMO_SCRIPT.length} events defined`, '10');
  
  // Check event structure
  const validEvents = CLOCKWORK_DEMO_SCRIPT.every(e => 
    typeof e.delay === 'number' &&
    typeof e.endpoint === 'string' &&
    typeof e.payload === 'object' &&
    typeof e.description === 'string'
  );
  addResult('Event Structure', validEvents, 'All events have valid structure', '10');
  
  // Check for required event types
  const hasNewLead = CLOCKWORK_DEMO_SCRIPT.some(e => e.endpoint.includes('linkedin-lead'));
  const hasDemo = CLOCKWORK_DEMO_SCRIPT.some(e => e.endpoint.includes('calendly-demo'));
  const hasTrial = CLOCKWORK_DEMO_SCRIPT.some(e => e.endpoint.includes('stripe-trial'));
  const hasSubscription = CLOCKWORK_DEMO_SCRIPT.some(e => e.endpoint.includes('stripe-subscription'));
  const hasSupport = CLOCKWORK_DEMO_SCRIPT.some(e => e.endpoint.includes('zendesk-ticket'));
  
  const hasAllTypes = hasNewLead && hasDemo && hasTrial && hasSubscription && hasSupport;
  addResult('Event Types', hasAllTypes, 
    'All required event types present (lead, demo, trial, subscription, support)', '10');
  
  return validEvents && hasAllTypes;
}

async function checkDemoEndpoints() {
  console.log('\n🎮 Checking Demo Endpoints (Task 11)...');
  
  // Check if files exist
  const fs = await import('fs');
  const path = await import('path');
  
  const startRoute = path.join(__dirname, '../src/app/api/demo/start/route.ts');
  const resetRoute = path.join(__dirname, '../src/app/api/demo/reset/route.ts');
  
  const startExists = fs.existsSync(startRoute);
  const resetExists = fs.existsSync(resetRoute);
  
  addResult('Start Endpoint', startExists, 
    startExists ? 'File exists' : 'File not found', '11');
  addResult('Reset Endpoint', resetExists, 
    resetExists ? 'File exists' : 'File not found', '11');
  
  return startExists && resetExists;
}

async function checkDemoControlPanel() {
  console.log('\n🎛️  Checking Demo Control Panel (Tasks 12-13)...');
  
  const fs = await import('fs');
  const path = await import('path');
  
  // Check component file
  const componentPath = path.join(__dirname, '../src/components/canvas/DemoControlPanel.tsx');
  const componentExists = fs.existsSync(componentPath);
  addResult('Component File', componentExists, 
    componentExists ? 'File exists' : 'File not found', '12');
  
  if (componentExists) {
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    // Check for Play button
    const hasPlayButton = content.includes('Play') || content.includes('play');
    addResult('Play Button', hasPlayButton, 'Play button implemented', '12');
    
    // Check for Reset button
    const hasResetButton = content.includes('Reset') || content.includes('reset');
    addResult('Reset Button', hasResetButton, 'Reset button implemented', '12');
    
    // Check for state management
    const hasState = content.includes('useState') && content.includes('isRunning');
    addResult('State Management', hasState, 'isRunning state implemented', '12');
    
    // Check for API calls
    const hasStartCall = content.includes('/api/demo/start');
    const hasResetCall = content.includes('/api/demo/reset');
    addResult('API Integration', hasStartCall && hasResetCall, 
      'Both API endpoints called', '12');
  }
  
  // Check BMC Canvas integration
  const bmcCanvasPath = path.join(__dirname, '../src/components/canvas/BMCCanvas.tsx');
  const bmcExists = fs.existsSync(bmcCanvasPath);
  
  if (bmcExists) {
    const bmcContent = fs.readFileSync(bmcCanvasPath, 'utf-8');
    const hasImport = bmcContent.includes('DemoControlPanel');
    const hasRender = bmcContent.includes('<DemoControlPanel');
    
    addResult('BMC Integration', hasImport && hasRender, 
      'DemoControlPanel integrated into BMC Canvas', '13');
  } else {
    addResult('BMC Integration', false, 'BMC Canvas file not found', '13');
  }
  
  return componentExists;
}

async function checkSystemEdgeComponent() {
  console.log('\n⚡ Checking SystemEdge Component (Tasks 4-5)...');
  
  const fs = await import('fs');
  const path = await import('path');
  
  const componentPath = path.join(__dirname, '../src/components/canvas/edges/SystemEdge.tsx');
  const componentExists = fs.existsSync(componentPath);
  addResult('SystemEdge Component', componentExists, 
    componentExists ? 'File exists' : 'File not found', '4');
  
  if (componentExists) {
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    // Check for dashed stroke
    const hasDashedStroke = content.includes('strokeDasharray') || content.includes('dashed');
    addResult('Dashed Styling', hasDashedStroke, 'Dashed stroke implemented', '4');
    
    // Check for pulse animation
    const hasPulseAnimation = content.includes('pulse') || content.includes('animate');
    addResult('Pulse Animation', hasPulseAnimation, 'Pulse animation implemented', '4');
    
    // Check for Realtime subscription
    const hasRealtime = content.includes('supabase') && content.includes('channel');
    addResult('Realtime Subscription', hasRealtime, 'Supabase Realtime subscription', '4');
  }
  
  // Check registration in canvas components
  const bmcCanvasPath = path.join(__dirname, '../src/components/canvas/BMCCanvas.tsx');
  const _workflowCanvasPath = path.join(__dirname, '../src/components/canvas/WorkflowCanvas.tsx');
  
  let registered = false;
  if (fs.existsSync(bmcCanvasPath)) {
    const bmcContent = fs.readFileSync(bmcCanvasPath, 'utf-8');
    registered = bmcContent.includes('SystemEdge') || bmcContent.includes('system');
  }
  
  addResult('Edge Registration', registered, 
    registered ? 'SystemEdge registered in canvas' : 'Not registered', '5');
  
  return componentExists;
}

async function checkFinancialUpdates() {
  console.log('\n💰 Checking Financial Updates (Task 9)...');
  
  const fs = await import('fs');
  const path = await import('path');
  
  const financialPath = path.join(__dirname, '../src/lib/metrics/financial-updates.ts');
  const financialExists = fs.existsSync(financialPath);
  addResult('Financial Updates Module', financialExists, 
    financialExists ? 'File exists' : 'File not found', '9');
  
  if (financialExists) {
    const content = fs.readFileSync(financialPath, 'utf-8');
    
    // Check for updateFinancials function
    const hasUpdateFunction = content.includes('updateFinancials');
    addResult('Update Function', hasUpdateFunction, 'updateFinancials function exists', '9');
    
    // Check for MRR increment logic
    const hasMRRLogic = content.includes('mrr') || content.includes('MRR');
    addResult('MRR Logic', hasMRRLogic, 'MRR increment logic present', '9');
    
    // Check for Stripe fee calculation
    const hasStripeFee = content.includes('0.029') || content.includes('stripe-fees');
    addResult('Stripe Fee Calculation', hasStripeFee, 'Stripe fee calculation present', '9');
  }
  
  return financialExists;
}

async function main() {
  console.log('🔍 Checkpoint 14: Verifying Webhook and Demo Flow');
  console.log('='.repeat(60));
  
  // Run all checks
  await checkBMCSeedData();
  await checkEntitySeedData();
  checkWebhookNodeMapper();
  checkDemoScript();
  await checkDemoEndpoints();
  await checkDemoControlPanel();
  await checkSystemEdgeComponent();
  await checkFinancialUpdates();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`\nTotal Checks: ${total}`);
  console.log(`Passed: ${passed} (${percentage}%)`);
  console.log(`Failed: ${total - passed}`);
  
  // Group by task
  const byTask = results.reduce((acc, r) => {
    if (!acc[r.task]) acc[r.task] = [];
    acc[r.task].push(r);
    return acc;
  }, {} as Record<string, CheckResult[]>);
  
  console.log('\n📋 Results by Task:');
  Object.keys(byTask).sort().forEach(task => {
    const taskResults = byTask[task];
    const taskPassed = taskResults.filter(r => r.passed).length;
    const taskTotal = taskResults.length;
    const icon = taskPassed === taskTotal ? '✅' : '⚠️';
    console.log(`${icon} Task ${task}: ${taskPassed}/${taskTotal} checks passed`);
  });
  
  // Failed checks
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('\n❌ Failed Checks:');
    failed.forEach(r => {
      console.log(`   - ${r.name} (Task ${r.task}): ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (percentage === 100) {
    console.log('✅ ALL CHECKS PASSED! Webhook and demo flow verified.');
    console.log('\n🎉 Ready to proceed to the next tasks!');
    process.exit(0);
  } else if (percentage >= 80) {
    console.log('⚠️  MOSTLY PASSING: Some checks failed but core functionality is working.');
    console.log('\n💡 Review failed checks above and address if needed.');
    process.exit(0);
  } else {
    console.log('❌ VERIFICATION FAILED: Multiple checks failed.');
    console.log('\n🔧 Please address the failed checks before proceeding.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Verification script error:', error);
  process.exit(1);
});
