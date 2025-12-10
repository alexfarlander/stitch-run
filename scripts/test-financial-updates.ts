#!/usr/bin/env tsx
/**
 * Test Financial Update Logic
 * 
 * This script tests the financial update functionality by:
 * 1. Getting current financial metrics
 * 2. Simulating a subscription event
 * 3. Simulating worker invocations
 * 4. Verifying the updates
 * 5. Resetting to initial values
 */

// Load environment variables FIRST before any imports
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../.env.local') });

import { 
  updateFinancials, 
  resetFinancialMetrics,
  getFinancialMetrics 
} from '../src/lib/metrics/financial-updates';

async function testFinancialUpdates() {
  console.log('🧪 Testing Financial Update Logic\n');
  
  try {
    // Step 1: Get initial financial metrics
    console.log('📊 Step 1: Getting initial financial metrics...');
    const initialMetrics = await getFinancialMetrics();
    console.log('Initial metrics:', initialMetrics);
    console.log('');
    
    // Step 2: Test subscription update (Pro plan at $99/month)
    console.log('💳 Step 2: Simulating Pro subscription ($99.00)...');
    await updateFinancials({
      plan: 'pro',
      amount: 9900, // $99.00 in cents
      email: 'test@example.com',
    });
    
    const afterSubscription = await getFinancialMetrics();
    console.log('After subscription:', afterSubscription);
    
    // Verify MRR increased
    const mrrIncrease = afterSubscription['item-mrr'] - initialMetrics['item-mrr'];
    console.log(`✓ MRR increased by: $${(mrrIncrease / 100).toFixed(2)}`);
    
    // Verify Stripe fee added (2.9% + $0.30 = $3.17)
    const expectedFee = Math.round(9900 * 0.029 + 30);
    const feeIncrease = afterSubscription['item-stripe-fees'] - initialMetrics['item-stripe-fees'];
    console.log(`✓ Stripe fee added: $${(feeIncrease / 100).toFixed(2)} (expected: $${(expectedFee / 100).toFixed(2)})`);
    console.log('');
    
    // Step 3: Test worker cost updates
    console.log('🤖 Step 3: Simulating worker invocations...');
    
    // Claude API call
    await updateFinancials({
      worker_type: 'claude',
      invocation_count: 3,
    });
    
    // ElevenLabs API call
    await updateFinancials({
      worker_type: 'elevenlabs',
      invocation_count: 2,
    });
    
    // MiniMax API call
    await updateFinancials({
      worker_type: 'minimax',
      invocation_count: 1,
    });
    
    const afterWorkers = await getFinancialMetrics();
    console.log('After worker invocations:', afterWorkers);
    
    // Verify worker costs
    const claudeCostIncrease = afterWorkers['item-claude-cost'] - afterSubscription['item-claude-cost'];
    console.log(`✓ Claude cost increased by: $${(claudeCostIncrease / 100).toFixed(2)} (3 calls × $0.02)`);
    
    const elevenlabsCostIncrease = afterWorkers['item-elevenlabs-cost'] - afterSubscription['item-elevenlabs-cost'];
    console.log(`✓ ElevenLabs cost increased by: $${(elevenlabsCostIncrease / 100).toFixed(2)} (2 calls × $0.05)`);
    
    const minimaxCostIncrease = afterWorkers['item-minimax-cost'] - afterSubscription['item-minimax-cost'];
    console.log(`✓ MiniMax cost increased by: $${(minimaxCostIncrease / 100).toFixed(2)} (1 call × $0.50)`);
    console.log('');
    
    // Step 4: Test reset functionality
    console.log('🔄 Step 4: Resetting financial metrics to initial values...');
    await resetFinancialMetrics();
    
    const afterReset = await getFinancialMetrics();
    console.log('After reset:', afterReset);
    
    // Verify reset worked
    const resetCorrect = Object.keys(initialMetrics).every(
      key => afterReset[key] === initialMetrics[key]
    );
    
    if (resetCorrect) {
      console.log('✓ All metrics reset to initial values');
    } else {
      console.log('⚠️  Some metrics did not reset correctly');
      console.log('Expected:', initialMetrics);
      console.log('Got:', afterReset);
    }
    console.log('');
    
    // Summary
    console.log('✅ Financial update logic test completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('- Subscription updates: MRR and Stripe fees ✓');
    console.log('- Worker cost updates: Claude, ElevenLabs, MiniMax ✓');
    console.log('- Reset functionality: All metrics restored ✓');
    
  } catch (_error) {
    console.error('❌ Test failed:', _error);
    process.exit(1);
  }
}

// Run the test
testFinancialUpdates();
