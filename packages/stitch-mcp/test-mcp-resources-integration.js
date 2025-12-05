#!/usr/bin/env node

/**
 * Integration test for MCP server resources
 * 
 * Tests that resources are properly registered and can be accessed.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerResources } from './dist/resources/index.js';

async function testMCPResourcesIntegration() {
  console.log('Testing MCP Resources Integration...\n');
  
  // Create a test server
  const server = new Server({
    name: "stitch-mcp-test",
    version: "0.1.0",
  }, {
    capabilities: {
      resources: {},
    },
  });
  
  // Register resources
  registerResources(server);
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Verify resources are registered
  try {
    console.log('Test 1: Verify resources are registered');
    
    // Check that handlers are registered
    const hasListHandler = server._requestHandlers.has('resources/list');
    const hasReadHandler = server._requestHandlers.has('resources/read');
    
    if (!hasListHandler) {
      throw new Error('List resources handler not registered');
    }
    
    if (!hasReadHandler) {
      throw new Error('Read resource handler not registered');
    }
    
    console.log('  ✓ List resources handler registered');
    console.log('  ✓ Read resource handler registered');
    console.log('  ✓ PASSED\n');
    passed++;
    
  } catch (_error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }
  
  // Test 2: Verify resource modules load correctly
  try {
    console.log('Test 2: Verify resource modules load correctly');
    
    const { dictionaryResource } = await import('./dist/resources/dictionary.js');
    const { overviewResource, landingPageResource } = await import('./dist/resources/instructions.js');
    
    if (!dictionaryResource || !dictionaryResource.uri) {
      throw new Error('Dictionary resource not properly exported');
    }
    
    if (!overviewResource || !overviewResource.uri) {
      throw new Error('Overview resource not properly exported');
    }
    
    if (!landingPageResource || !landingPageResource.uri) {
      throw new Error('Landing page resource not properly exported');
    }
    
    console.log('  ✓ Dictionary resource: ' + dictionaryResource.uri);
    console.log('  ✓ Overview resource: ' + overviewResource.uri);
    console.log('  ✓ Landing page resource: ' + landingPageResource.uri);
    console.log('  ✓ PASSED\n');
    passed++;
    
  } catch (_error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }
  
  // Test 3: Verify resource content
  try {
    console.log('Test 3: Verify resource content');
    
    const { dictionaryResource } = await import('./dist/resources/dictionary.js');
    const { overviewResource, landingPageResource } = await import('./dist/resources/instructions.js');
    
    // Test dictionary
    const dictResult = await dictionaryResource.read();
    if (!dictResult.contents || dictResult.contents.length === 0) {
      throw new Error('Dictionary has no contents');
    }
    const dictContent = JSON.parse(dictResult.contents[0].text);
    if (!dictContent.concepts || !dictContent.nodeTypes) {
      throw new Error('Dictionary missing expected sections');
    }
    console.log(`  ✓ Dictionary has ${Object.keys(dictContent.concepts).length} concepts`);
    
    // Test overview
    const overviewResult = await overviewResource.read();
    if (!overviewResult.contents || overviewResult.contents.length === 0) {
      throw new Error('Overview has no contents');
    }
    if (!overviewResult.contents[0].text.includes('# Stitch Integration Overview')) {
      throw new Error('Overview missing expected header');
    }
    console.log(`  ✓ Overview instructions (${overviewResult.contents[0].text.length} chars)`);
    
    // Test landing page
    const landingResult = await landingPageResource.read();
    if (!landingResult.contents || landingResult.contents.length === 0) {
      throw new Error('Landing page has no contents');
    }
    if (!landingResult.contents[0].text.includes('# Landing Page Integration Guide')) {
      throw new Error('Landing page missing expected header');
    }
    console.log(`  ✓ Landing page instructions (${landingResult.contents[0].text.length} chars)`);
    
    console.log('  ✓ PASSED\n');
    passed++;
    
  } catch (_error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }
  
  console.log('='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  if (failed > 0) {
    process.exit(1);
  }
}

testMCPResourcesIntegration().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
