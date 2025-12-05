#!/usr/bin/env node

/**
 * Test script for MCP resources
 * 
 * Verifies that all resources are properly registered and can be read.
 */

import { dictionaryResource } from './dist/resources/dictionary.js';
import { overviewResource, landingPageResource } from './dist/resources/instructions.js';

async function testResources() {
  console.log('Testing MCP Resources...\n');
  
  const resources = [
    dictionaryResource,
    overviewResource,
    landingPageResource,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const resource of resources) {
    try {
      console.log(`Testing: ${resource.name}`);
      console.log(`  URI: ${resource.uri}`);
      console.log(`  MIME Type: ${resource.mimeType}`);
      
      // Test reading the resource
      const result = await resource.read();
      
      if (!result.contents || result.contents.length === 0) {
        throw new Error('No contents returned');
      }
      
      const content = result.contents[0];
      
      if (content.uri !== resource.uri) {
        throw new Error(`URI mismatch: expected ${resource.uri}, got ${content.uri}`);
      }
      
      if (content.mimeType !== resource.mimeType) {
        throw new Error(`MIME type mismatch: expected ${resource.mimeType}, got ${content.mimeType}`);
      }
      
      if (!content.text || content.text.length === 0) {
        throw new Error('Empty content text');
      }
      
      // Validate content based on type
      if (resource.mimeType === 'application/json') {
        JSON.parse(content.text); // Should not throw
        console.log(`  ✓ Valid JSON content (${content.text.length} chars)`);
      } else if (resource.mimeType === 'text/markdown') {
        if (!content.text.includes('#')) {
          throw new Error('Markdown content missing headers');
        }
        console.log(`  ✓ Valid Markdown content (${content.text.length} chars)`);
      }
      
      console.log(`  ✓ PASSED\n`);
      passed++;
      
    } catch (error) {
      console.log(`  ✗ FAILED: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  if (failed > 0) {
    process.exit(1);
  }
}

testResources().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
