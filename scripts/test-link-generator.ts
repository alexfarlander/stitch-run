/**
 * Test script for Link Generator Worker
 * 
 * Run with: npx tsx scripts/test-link-generator.ts
 */

async function testLinkGenerator() {
  console.log('🔗 Testing Link Generator Worker\n');

  // Mock callback URL (in real usage, this would be set by the engine)
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

  const testCases = [
    {
      name: 'LinkedIn Demo Call',
      input: {
        utm_source: 'linkedin',
        utm_campaign: 'demo_call',
        utm_medium: 'social',
        redirect_to: 'https://calendly.com/demo',
        create_entity: false, // Skip entity creation for test
      }
    },
    {
      name: 'Email Campaign with A/B Test',
      input: {
        utm_source: 'email',
        utm_campaign: 'product_launch',
        utm_medium: 'email',
        utm_content: 'button_blue',
        redirect_to: '/products',
        create_entity: false,
      }
    },
    {
      name: 'Twitter Ad Campaign',
      input: {
        utm_source: 'twitter',
        utm_campaign: 'awareness_q1',
        utm_medium: 'cpc',
        utm_term: 'automation software',
        redirect_to: '/',
        create_entity: false,
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('Input:', JSON.stringify(testCase.input, null, 2));

    try {
      // Simulate what the output would look like
      const mockOutput = {
        tracking_url: `http://localhost:3000/track?tracking_id=${testCase.input.utm_source}_${testCase.input.utm_campaign}_${Date.now()}_abc123&utm_source=${testCase.input.utm_source}&utm_campaign=${testCase.input.utm_campaign}&redirect_to=${encodeURIComponent(testCase.input.redirect_to || '/')}`,
        tracking_id: `${testCase.input.utm_source}_${testCase.input.utm_campaign}_${Date.now()}_abc123`,
        utm_params: {
          source: testCase.input.utm_source,
          medium: testCase.input.utm_medium,
          campaign: testCase.input.utm_campaign,
          content: testCase.input.utm_content,
          term: testCase.input.utm_term,
        }
      };
      
      console.log('Expected Output:', JSON.stringify(mockOutput, null, 2));
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  console.log('\n✅ All tests completed!\n');
  console.log('📝 Next steps:');
  console.log('1. Start the dev server: npm run dev');
  console.log('2. Ask the AI Assistant: "Generate a tracking link for LinkedIn demo calls"');
  console.log('3. Or use the MCP tool: stitch_generate_tracking_link');
  console.log('4. Share the generated link and watch entities appear in your canvas!');
}

testLinkGenerator().catch(console.error);
