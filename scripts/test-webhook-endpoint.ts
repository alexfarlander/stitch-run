/**
 * Test script for Clockwork Canvas webhook endpoint
 * 
 * Tests the webhook route handler with sample POST requests
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables FIRST
config({ path: join(__dirname, '../.env.local') });

import { getAdminClient } from '../src/lib/supabase/client';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface WebhookTestCase {
  name: string;
  source: string;
  payload: Record<string, unknown>;
  expectedStatus: number;
}

const testCases: WebhookTestCase[] = [
  {
    name: 'LinkedIn Lead',
    source: 'linkedin-lead',
    payload: {
      name: 'Test Werewolf',
      email: 'test-werewolf@monsters.io',
    },
    expectedStatus: 200,
  },
  {
    name: 'Calendly Demo Booking',
    source: 'calendly-demo',
    payload: {
      name: 'Test Goblin',
      email: 'test-goblin@monsters.io',
    },
    expectedStatus: 200,
  },
  {
    name: 'Stripe Trial Start',
    source: 'stripe-trial',
    payload: {
      name: 'Test Witch',
      email: 'test-witch@monsters.io',
    },
    expectedStatus: 200,
  },
  {
    name: 'Stripe Pro Subscription',
    source: 'stripe-subscription-pro',
    payload: {
      name: 'Test Ghost',
      email: 'test-ghost@monsters.io',
      plan: 'pro',
      amount: 99,
    },
    expectedStatus: 200,
  },
  {
    name: 'Zendesk Support Ticket',
    source: 'zendesk-ticket',
    payload: {
      name: 'Test Mummy',
      email: 'test-mummy@monsters.io',
      subject: 'Help needed',
    },
    expectedStatus: 200,
  },
  {
    name: 'Invalid Source',
    source: 'invalid-source',
    payload: {
      name: 'Test Entity',
      email: 'test@example.com',
    },
    expectedStatus: 400,
  },
  {
    name: 'Missing Email',
    source: 'linkedin-lead',
    payload: {
      name: 'Test Entity',
    },
    expectedStatus: 400,
  },
];

async function testWebhook(testCase: WebhookTestCase): Promise<void> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Source: ${testCase.source}`);
  console.log(`   Payload:`, JSON.stringify(testCase.payload, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/clockwork/${testCase.source}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.payload),
    });
    
    const _data = await response.json();
    
    console.log(`   Status: ${response.status} (expected: ${testCase.expectedStatus})`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === testCase.expectedStatus) {
      console.log(`   ✅ PASS`);
      
      // If successful, verify entity was created/updated
      if (response.status === 200 && data.entity_id) {
        await verifyEntity(data.entity_id, testCase);
      }
    } else {
      console.log(`   ❌ FAIL: Expected status ${testCase.expectedStatus}, got ${response.status}`);
    }
  } catch (_error) {
    console.error(`   ❌ ERROR:`, error);
  }
}

async function verifyEntity(entityId: string, testCase: WebhookTestCase): Promise<void> {
  const _supabase = getAdminClient();
  
  // Verify entity exists
  const { data: entity, error: entityError } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('id', entityId)
    .single();
  
  if (entityError || !entity) {
    console.log(`   ⚠️  Entity verification failed: ${entityError?.message}`);
    return;
  }
  
  console.log(`   📍 Entity verified:`);
  console.log(`      - Name: ${entity.name}`);
  console.log(`      - Email: ${entity.email}`);
  console.log(`      - Type: ${entity.entity_type}`);
  console.log(`      - Current Node: ${entity.current_node_id}`);
  
  // Verify journey event was created
  const { data: events, error: eventsError } = await supabase
    .from('stitch_journey_events')
    .select('*')
    .eq('entity_id', entityId)
    .order('timestamp', { ascending: false })
    .limit(1);
  
  if (eventsError) {
    console.log(`   ⚠️  Journey event verification failed: ${eventsError.message}`);
    return;
  }
  
  if (events && events.length > 0) {
    const latestEvent = events[0];
    console.log(`   📝 Latest journey event:`);
    console.log(`      - Type: ${latestEvent.event_type}`);
    console.log(`      - Node: ${latestEvent.node_id}`);
    console.log(`      - Timestamp: ${latestEvent.timestamp}`);
  }
}

async function checkBMCExists(): Promise<boolean> {
  const _supabase = getAdminClient();
  
  const { data: bmc, error } = await supabase
    .from('stitch_flows')
    .select('id, name')
    .eq('canvas_type', 'bmc')
    .maybeSingle();
  
  if (error || !bmc) {
    console.error('❌ BMC canvas not found. Please run the seed script first:');
    console.error('   tsx scripts/seed-clockwork.ts');
    return false;
  }
  
  console.log(`✅ BMC canvas found: ${bmc.name} (${bmc.id})`);
  return true;
}

async function cleanupTestEntities(): Promise<void> {
  console.log('\n🧹 Cleaning up test entities...');
  const _supabase = getAdminClient();
  
  const { error } = await supabase
    .from('stitch_entities')
    .delete()
    .like('email', 'test-%@monsters.io');
  
  if (error) {
    console.error('⚠️  Cleanup failed:', error.message);
  } else {
    console.log('✅ Test entities cleaned up');
  }
}

async function main() {
  console.log('🚀 Clockwork Canvas Webhook Endpoint Test');
  console.log('==========================================');
  
  // Check if BMC exists
  const bmcExists = await checkBMCExists();
  if (!bmcExists) {
    process.exit(1);
  }
  
  // Run all test cases
  for (const testCase of testCases) {
    await testWebhook(testCase);
  }
  
  // Cleanup test entities
  await cleanupTestEntities();
  
  console.log('\n✅ All tests complete!');
}

main().catch(console.error);
