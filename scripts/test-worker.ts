#!/usr/bin/env tsx
/**
 * Test Worker - Individual Worker Testing Script
 * 
 * This script tests individual workers in isolation to verify they can:
 * - Initialize correctly with or without API keys
 * - Execute their core functionality
 * - Receive callbacks successfully
 * 
 * Usage:
 *   npx tsx scripts/test-worker.ts <worker-name> [--mock]
 * 
 * Examples:
 *   npx tsx scripts/test-worker.ts claude
 *   npx tsx scripts/test-worker.ts minimax --mock
 *   npx tsx scripts/test-worker.ts elevenlabs
 *   npx tsx scripts/test-worker.ts shotstack
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE importing anything else
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

/**
 * Supported worker names
 */
type WorkerName = 'claude' | 'minimax' | 'elevenlabs' | 'shotstack';

/**
 * Validate worker name
 */
function isValidWorkerName(name: string): name is WorkerName {
  return ['claude', 'minimax', 'elevenlabs', 'shotstack'].includes(name);
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log('Usage: npx tsx scripts/test-worker.ts <worker-name> [--mock]');
  console.log('');
  console.log('Supported workers:');
  console.log('  claude      - Test Claude AI worker (Anthropic API)');
  console.log('  minimax     - Test MiniMax video generation worker');
  console.log('  elevenlabs  - Test ElevenLabs text-to-speech worker');
  console.log('  shotstack   - Test Shotstack video assembly worker');
  console.log('');
  console.log('Options:');
  console.log('  --mock      - Use mock mode (no API calls)');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/test-worker.ts claude');
  console.log('  npx tsx scripts/test-worker.ts minimax --mock');
}

/**
 * Main test function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const workerName = args[0];
  const mockMode = args.includes('--mock');

  // Validate worker name
  if (!isValidWorkerName(workerName)) {
    console.error(`❌ Error: Invalid worker name "${workerName}"`);
    console.error('');
    printUsage();
    process.exit(1);
  }

  // Import testing utilities after environment is loaded
  const { 
    testWorker, 
    checkApiKey, 
    getRequiredEnvVars 
  } = await import('../src/lib/workers/testing');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  Worker Test: ${workerName.toUpperCase().padEnd(46)} ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Check API key status
  const apiKeyPresent = checkApiKey(workerName);
  const requiredVars = getRequiredEnvVars(workerName);

  console.log('📋 Configuration:');
  console.log(`   Worker: ${workerName}`);
  console.log(`   Mode: ${mockMode ? 'Mock (no API calls)' : 'Real (live API calls)'}`);
  console.log('');

  console.log('🔑 API Key Status:');
  if (apiKeyPresent) {
    console.log(`   ✅ API keys present: ${requiredVars.join(', ')}`);
  } else {
    console.log(`   ⚠️  Missing API keys: ${requiredVars.join(', ')}`);
    if (!mockMode) {
      console.log('   💡 Tip: Use --mock flag to test without API keys');
    }
  }
  console.log('');

  // Generate appropriate test input for each worker
  let testInput: unknown;
  switch (workerName) {
    case 'claude':
      testInput = { 
        prompt: 'Create a short video about the benefits of renewable energy' 
      };
      console.log('📝 Test Input:');
      console.log(`   Prompt: "${testInput.prompt}"`);
      break;
    case 'minimax':
      testInput = { 
        visual_prompt: 'A serene mountain landscape at sunrise with golden light' 
      };
      console.log('📝 Test Input:');
      console.log(`   Visual Prompt: "${testInput.visual_prompt}"`);
      break;
    case 'elevenlabs':
      testInput = { 
        voice_text: 'This is a test narration for the worker testing system.' 
      };
      console.log('📝 Test Input:');
      console.log(`   Voice Text: "${testInput.voice_text}"`);
      break;
    case 'shotstack':
      testInput = {
        scenes: [
          {
            visual_prompt: 'Test scene 1',
            voice_text: 'Test narration 1',
            videoUrl: 'https://example.com/video1.mp4',
            audioUrl: 'https://example.com/audio1.mp3',
            duration: 5,
          },
          {
            visual_prompt: 'Test scene 2',
            voice_text: 'Test narration 2',
            videoUrl: 'https://example.com/video2.mp4',
            audioUrl: 'https://example.com/audio2.mp3',
            duration: 5,
          },
        ],
      };
      console.log('📝 Test Input:');
      console.log(`   Scenes: ${testInput.scenes.length} scenes with video and audio URLs`);
      break;
  }
  console.log('');

  // Run the test
  console.log('🚀 Starting worker test...');
  console.log('');

  try {
    const result = await testWorker({
      workerName,
      mockMode,
      testInput,
    });

    // Display results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Test Results:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    console.log(`⏱️  Duration: ${formatDuration(result.duration)}`);
    console.log(`🔑 API Key Present: ${result.apiKeyPresent ? '✅ Yes' : '❌ No'}`);
    console.log(`📞 Callback Received: ${result.callbackReceived ? '✅ Yes' : '❌ No'}`);
    console.log('');

    if (result.success) {
      console.log('✅ Test Status: PASSED');
      console.log('');
      
      if (result.output) {
        console.log('📦 Output:');
        const outputKeys = Object.keys(result.output);
        for (const key of outputKeys) {
          const value = result.output[key];
          if (typeof value === 'string' && value.length > 100) {
            console.log(`   ${key}: ${value.substring(0, 100)}...`);
          } else if (Array.isArray(value)) {
            console.log(`   ${key}: Array(${value.length})`);
          } else if (typeof value === 'object') {
            console.log(`   ${key}: ${JSON.stringify(value).substring(0, 100)}...`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        }
        console.log('');
      }

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ Worker test completed successfully!                    ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      process.exit(0);
    } else {
      console.log('❌ Test Status: FAILED');
      console.log('');
      
      if (result.error) {
        console.log('❌ Error:');
        console.log(`   ${result.error}`);
        console.log('');
      }

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ❌ Worker test failed                                      ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      
      // Provide helpful suggestions
      if (!result.apiKeyPresent && !mockMode) {
        console.log('💡 Suggestions:');
        console.log(`   1. Set the required environment variables: ${requiredVars.join(', ')}`);
        console.log('   2. Or use --mock flag to test without API keys');
        console.log('');
      } else if (!result.callbackReceived) {
        console.log('💡 Suggestions:');
        console.log('   1. Check that NEXT_PUBLIC_BASE_URL is set correctly');
        console.log('   2. Verify the worker is generating callback URLs properly');
        console.log('   3. Check network connectivity if using real API calls');
        console.log('');
      }

      process.exit(1);
    }
  } catch (_error) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ Unexpected Error:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.error(_error);
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ❌ Worker test failed with unexpected error               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    process.exit(1);
  }
}

main();
