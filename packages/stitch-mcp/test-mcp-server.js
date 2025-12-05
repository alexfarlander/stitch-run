#!/usr/bin/env node

/**
 * Test script to verify MCP server startup and basic functionality
 * 
 * This script:
 * 1. Spawns the MCP server process
 * 2. Sends MCP protocol messages via stdio
 * 3. Verifies responses
 * 4. Tests tool and resource listing
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const SERVER_PATH = join(__dirname, 'dist', 'index.js');
const TIMEOUT = 5000;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createMCPRequest(method, params = {}) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  }) + '\n';
}

async function testMCPServer() {
  log('\n=== Testing Stitch MCP Server ===\n', 'blue');

  return new Promise((resolve, reject) => {
    const results = {
      startup: false,
      initialize: false,
      listTools: false,
      listResources: false,
      toolsFound: [],
      resourcesFound: [],
    };

    // Spawn the server process
    log('1. Starting MCP server...', 'yellow');
    const server = spawn('node', [SERVER_PATH], {
      env: {
        ...process.env,
        STITCH_API_KEY: 'test-key-12345',
        STITCH_URL: 'http://localhost:3000',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let responseBuffer = '';
    let initializeSent = false;
    let testTimeout;

    // Handle server output
    server.stdout.on('data', (data) => {
      responseBuffer += data.toString();
      
      // Process complete JSON-RPC messages
      const lines = responseBuffer.split('\n');
      responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);
          
          if (response.result) {
            // Handle initialize response
            if (response.result.capabilities) {
              log('✓ Server initialized successfully', 'green');
              results.initialize = true;
              
              // Request tools list
              log('\n2. Requesting tools list...', 'yellow');
              server.stdin.write(createMCPRequest('tools/list'));
              
              // Request resources list
              setTimeout(() => {
                log('\n3. Requesting resources list...', 'yellow');
                server.stdin.write(createMCPRequest('resources/list'));
              }, 100);
            }
            
            // Handle tools list response
            if (response.result.tools) {
              log('✓ Received tools list', 'green');
              results.listTools = true;
              results.toolsFound = response.result.tools.map(t => t.name);
              
              log('\nAvailable tools:', 'blue');
              response.result.tools.forEach(tool => {
                log(`  - ${tool.name}: ${tool.description}`, 'reset');
              });
            }
            
            // Handle resources list response
            if (response.result.resources) {
              log('\n✓ Received resources list', 'green');
              results.listResources = true;
              results.resourcesFound = response.result.resources.map(r => r.uri);
              
              log('\nAvailable resources:', 'blue');
              response.result.resources.forEach(resource => {
                log(`  - ${resource.uri}: ${resource.name}`, 'reset');
              });
              
              // All tests complete
              clearTimeout(testTimeout);
              server.kill();
              resolve(results);
            }
          }
        } catch (_err) {
          // Ignore parse errors for non-JSON lines
        }
      }
    });

    // Handle server stderr (logs)
    server.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message.includes('running')) {
        log('✓ Server started successfully', 'green');
        results.startup = true;
        
        // Send initialize request
        if (!initializeSent) {
          initializeSent = true;
          log('\n2. Sending initialize request...', 'yellow');
          server.stdin.write(createMCPRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'test-client',
              version: '1.0.0',
            },
          }));
        }
      }
    });

    // Handle server exit
    server.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Handle errors
    server.on('error', (err) => {
      reject(err);
    });

    // Set timeout
    testTimeout = setTimeout(() => {
      server.kill();
      reject(new Error('Test timeout'));
    }, TIMEOUT);
  });
}

// Run tests
testMCPServer()
  .then((results) => {
    log('\n=== Test Results ===\n', 'blue');
    log(`Startup: ${results.startup ? '✓' : '✗'}`, results.startup ? 'green' : 'red');
    log(`Initialize: ${results.initialize ? '✓' : '✗'}`, results.initialize ? 'green' : 'red');
    log(`List Tools: ${results.listTools ? '✓' : '✗'}`, results.listTools ? 'green' : 'red');
    log(`List Resources: ${results.listResources ? '✓' : '✗'}`, results.listResources ? 'green' : 'red');
    
    log(`\nTools found: ${results.toolsFound.length}`, 'blue');
    results.toolsFound.forEach(name => log(`  - ${name}`, 'reset'));
    
    log(`\nResources found: ${results.resourcesFound.length}`, 'blue');
    results.resourcesFound.forEach(uri => log(`  - ${uri}`, 'reset'));
    
    const allPassed = results.startup && results.initialize && results.listTools && results.listResources;
    
    if (allPassed) {
      log('\n✓ All tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n✗ Some tests failed', 'red');
      process.exit(1);
    }
  })
  .catch((err) => {
    log(`\n✗ Test failed: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  });
