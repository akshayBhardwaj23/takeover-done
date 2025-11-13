#!/bin/bash

# Test script for Shopify Compliance Webhooks
# This helps debug why Shopify's automated checks are failing

echo "🔍 Testing Shopify Compliance Webhook Endpoint"
echo "=============================================="
echo ""

# Test 1: GET request (verification)
echo "Test 1: GET request (verification)"
echo "-----------------------------------"
curl -s -X GET https://www.zyyp.ai/api/webhooks/shopify/compliance | jq .
echo ""
echo ""

# Test 2: POST request without HMAC (should handle gracefully)
echo "Test 2: POST request without HMAC"
echo "----------------------------------"
curl -s -X POST https://www.zyyp.ai/api/webhooks/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: customers/redact" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -d '{"test": true}' | jq .
echo ""
echo ""

# Test 3: POST request with invalid HMAC (should return 401)
echo "Test 3: POST request with invalid HMAC"
echo "--------------------------------------"
curl -s -X POST https://www.zyyp.ai/api/webhooks/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: customers/redact" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: invalid-hmac-signature" \
  -d '{"test": true}' | jq .
echo ""
echo ""

echo "✅ Tests complete!"
echo ""
echo "Next steps:"
echo "1. Check Vercel function logs for detailed error messages"
echo "2. Verify SHOPIFY_API_SECRET is set correctly in Vercel"
echo "3. Verify webhooks are registered in Shopify Partners dashboard"
echo "4. Use Shopify CLI to trigger test webhook: shopify app webhook trigger --topic customers/redact"

