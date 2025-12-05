/**
 * Verification script for Clockwork Canvas Demo Script
 * 
 * Validates that the demo script is properly structured and contains
 * the required events for showcasing the customer journey.
 */

import {
  CLOCKWORK_DEMO_SCRIPT,
  getDemoScriptDuration,
  getDemoScriptEventCount,
  validateDemoScript,
} from '../src/lib/demo/demo-script';

console.log('🎬 Clockwork Canvas Demo Script Verification\n');
console.log('='.repeat(60));

// Check event count
const eventCount = getDemoScriptEventCount();
console.log(`\n✓ Event Count: ${eventCount}`);
if (eventCount < 5 || eventCount > 7) {
  console.error(`❌ Expected 5-7 events, got ${eventCount}`);
  process.exit(1);
}

// Check duration
const duration = getDemoScriptDuration();
console.log(`✓ Total Duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);

// Validate endpoints
const isValid = validateDemoScript();
console.log(`✓ Endpoint Validation: ${isValid ? 'PASS' : 'FAIL'}`);
if (!isValid) {
  console.error('❌ Some endpoints are invalid');
  process.exit(1);
}

// Display all events
console.log('\n📋 Demo Events:');
console.log('='.repeat(60));

CLOCKWORK_DEMO_SCRIPT.forEach((event, index) => {
  const delaySeconds = (event.delay / 1000).toFixed(1);
  console.log(`\n${index + 1}. [${delaySeconds}s] ${event.description}`);
  console.log(`   Endpoint: ${event.endpoint}`);
  console.log(`   Entity: ${event.payload.name} (${event.payload.email})`);
  
  // Show additional payload details
  const { name, email, ...otherFields } = event.payload;
  if (Object.keys(otherFields).length > 0) {
    console.log(`   Details: ${JSON.stringify(otherFields, null, 2).replace(/\n/g, '\n   ')}`);
  }
});

// Verify required event types are present
console.log('\n🎯 Required Event Types:');
console.log('='.repeat(60));

const requiredTypes = [
  { type: 'new lead', pattern: /linkedin-lead|seo-form|youtube-signup/ },
  { type: 'demo booking', pattern: /calendly-demo/ },
  { type: 'trial start', pattern: /stripe-trial/ },
  { type: 'subscription', pattern: /stripe-subscription/ },
  { type: 'support ticket', pattern: /zendesk-ticket/ },
];

let allTypesPresent = true;

requiredTypes.forEach(({ type, pattern }) => {
  const hasType = CLOCKWORK_DEMO_SCRIPT.some(event => pattern.test(event.endpoint));
  console.log(`${hasType ? '✓' : '❌'} ${type}: ${hasType ? 'Present' : 'Missing'}`);
  if (!hasType) {
    allTypesPresent = false;
  }
});

// Final summary
console.log('\n' + '='.repeat(60));
if (allTypesPresent && isValid && eventCount >= 5 && eventCount <= 7) {
  console.log('✅ Demo script verification PASSED');
  console.log(`\n📊 Summary:`);
  console.log(`   - ${eventCount} events defined`);
  console.log(`   - ${(duration / 1000).toFixed(1)}s total duration`);
  console.log(`   - All required event types present`);
  console.log(`   - All endpoints valid`);
  process.exit(0);
} else {
  console.error('❌ Demo script verification FAILED');
  process.exit(1);
}
