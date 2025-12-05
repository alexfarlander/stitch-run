#!/bin/bash

# Test Demo Orchestrator Endpoints
# Simple curl-based test to verify endpoints are accessible

echo "=== Testing Demo Orchestrator Endpoints ==="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"

echo "Base URL: $BASE_URL"
echo ""

# Test 1: Demo Reset
echo "Test 1: POST /api/demo/reset"
echo "-----------------------------------"
RESET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/demo/reset")

HTTP_STATUS=$(echo "$RESET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESET_BODY=$(echo "$RESET_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$RESET_BODY" | jq '.' 2>/dev/null || echo "$RESET_BODY"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Reset endpoint failed with status $HTTP_STATUS"
  exit 1
fi

echo "✅ Reset endpoint working"
echo ""

# Test 2: Demo Start
echo "Test 2: POST /api/demo/start"
echo "-----------------------------------"
START_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/demo/start")

HTTP_STATUS=$(echo "$START_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
START_BODY=$(echo "$START_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$START_BODY" | jq '.' 2>/dev/null || echo "$START_BODY"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Start endpoint failed with status $HTTP_STATUS"
  exit 1
fi

echo "✅ Start endpoint working"
echo ""

# Summary
echo "=== Test Summary ==="
echo "✅ Demo reset endpoint: Working"
echo "✅ Demo start endpoint: Working"
echo ""
echo "🎉 All endpoint tests passed!"
