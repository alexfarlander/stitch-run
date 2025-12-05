/**
 * Test Demo Start Endpoint
 * 
 * Tests the /api/demo/start endpoint to verify it:
 * 1. Returns success response
 * 2. Includes event count and duration
 * 3. Schedules webhook calls correctly
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testDemoStart() {
  console.log('=== Testing Demo Start Endpoint ===\n');
  
  try {
    console.log(`Calling POST ${BASE_URL}/api/demo/start`);
    
    const response = await fetch(`${BASE_URL}/api/demo/start`, {
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
    
    console.log('\n✅ Demo start response:');
    console.log(JSON.stringify(result, null, 2));
    
    // Validate response structure
    if (!result.success) {
      console.error('\n❌ Response does not indicate success');
      process.exit(1);
    }
    
    if (typeof result.events !== 'number' || result.events <= 0) {
      console.error('\n❌ Invalid event count:', result.events);
      process.exit(1);
    }
    
    if (typeof result.duration !== 'number' || result.duration <= 0) {
      console.error('\n❌ Invalid duration:', result.duration);
      process.exit(1);
    }
    
    if (!Array.isArray(result.script) || result.script.length === 0) {
      console.error('\n❌ Invalid script array:', result.script);
      process.exit(1);
    }
    
    console.log('\n✅ All validations passed!');
    console.log(`\nDemo will execute ${result.events} events over ${result.duration}ms`);
    console.log('\nScheduled events:');
    result.script.forEach((event: any, index: number) => {
      console.log(`  ${index + 1}. [${event.delay}ms] ${event.description}`);
    });
    
    console.log('\n⏳ Demo is now running in the background...');
    console.log('   Check the server logs to see events firing.');
    console.log(`   Demo will complete in approximately ${Math.ceil(result.duration / 1000)} seconds.`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testDemoStart();
