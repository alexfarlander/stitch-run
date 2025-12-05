#!/bin/bash

# Test all Clockwork Canvas webhook sources
# Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7

BASE_URL="http://localhost:3000"

echo "🚀 Testing Clockwork Canvas Webhook Endpoints"
echo "=============================================="
echo ""

# Test 1: LinkedIn Lead
echo "📍 Test 1: LinkedIn Lead"
curl -X POST "$BASE_URL/api/webhooks/clockwork/linkedin-lead" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Werewolf", "email": "test-werewolf@monsters.io"}' \
  -s | jq .
echo ""

# Test 2: Calendly Demo
echo "📍 Test 2: Calendly Demo"
curl -X POST "$BASE_URL/api/webhooks/clockwork/calendly-demo" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Goblin", "email": "test-goblin@monsters.io"}' \
  -s | jq .
echo ""

# Test 3: Stripe Trial
echo "📍 Test 3: Stripe Trial"
curl -X POST "$BASE_URL/api/webhooks/clockwork/stripe-trial" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Witch", "email": "test-witch@monsters.io"}' \
  -s | jq .
echo ""

# Test 4: Stripe Pro Subscription
echo "📍 Test 4: Stripe Pro Subscription"
curl -X POST "$BASE_URL/api/webhooks/clockwork/stripe-subscription-pro" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Ghost", "email": "test-ghost@monsters.io", "plan": "pro", "amount": 99}' \
  -s | jq .
echo ""

# Test 5: Zendesk Support Ticket
echo "📍 Test 5: Zendesk Support Ticket"
curl -X POST "$BASE_URL/api/webhooks/clockwork/zendesk-ticket" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Mummy", "email": "test-mummy@monsters.io", "subject": "Help needed"}' \
  -s | jq .
echo ""

# Test 6: Stripe Churn
echo "📍 Test 6: Stripe Churn"
curl -X POST "$BASE_URL/api/webhooks/clockwork/stripe-churn" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Zombie", "email": "test-zombie@monsters.io"}' \
  -s | jq .
echo ""

# Test 7: Invalid Source (should fail)
echo "📍 Test 7: Invalid Source (should fail)"
curl -X POST "$BASE_URL/api/webhooks/clockwork/invalid-source" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "test@example.com"}' \
  -s | jq .
echo ""

# Test 8: Missing Email (should fail)
echo "📍 Test 8: Missing Email (should fail)"
curl -X POST "$BASE_URL/api/webhooks/clockwork/linkedin-lead" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}' \
  -s | jq .
echo ""

echo "✅ All webhook tests complete!"
