/**
 * Test Demo Reset Endpoint
 * 
 * Tests the /api/demo/reset endpoint to verify it:
 * 1. Returns success response
 * 2. Resets entities to initial positions
 * 3. Resets financial metrics
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testDemoReset() {
  console.log('=== Testing Demo Reset Endpoint ===\n');
  
  try {
    console.log(`Calling POST ${BASE_URL}/api/demo/reset`);
    
    const response = await fetch(`${BASE_URL}/api/demo/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      process.exit(1);
    }
    
    const result = await response.json();
    
    console.log('\n✅ Demo reset response:');
    console.log(JSON.stringify(result, null, 2));
    
    // Validate response structure
    if (!result.success) {
      console.error('\n❌ Response does not indicate success');
      process.exit(1);
    }
    
    if (typeof result.entities_reset !== 'number') {
      console.error('\n❌ Invalid entities_reset count:', result.entities_reset);
      process.exit(1);
    }
    
    if (typeof result.total_entities !== 'number' || result.total_entities !== 13) {
      console.error('\n❌ Expected 13 total entities, got:', result.total_entities);
      process.exit(1);
    }
    
    if (result.financial_metrics_reset !== true) {
      console.error('\n❌ Financial metrics not reset');
      process.exit(1);
    }
    
    console.log('\n✅ All validations passed!');
    console.log(`\nReset ${result.entities_reset} entities`);
    
    if (result.entities_not_found > 0) {
      console.log(`⚠️  Warning: ${result.entities_not_found} entities not found`);
      console.log('   This may be expected if the demo hasn\'t been seeded yet.');
    }
    
    console.log('✅ Financial metrics reset to initial values');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testDemoReset();
