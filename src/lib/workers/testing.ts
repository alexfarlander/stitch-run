/**
 * Worker Testing Infrastructure
 * Provides utilities for testing individual workers in isolation
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { IWorker } from './base';
import { NodeConfig, WorkerCallback } from '@/types/stitch';
import { workerRegistry } from './registry';
import { getConfig } from '@/lib/config';
import { logWorker } from './utils';

/**
 * Configuration for testing a worker
 */
export interface WorkerTestConfig {
  workerName: 'claude' | 'minimax' | 'elevenlabs' | 'shotstack';
  mockMode: boolean;
  testInput: any;
  expectedOutputSchema?: Record<string, any>;
}

/**
 * Result of a worker test execution
 */
export interface WorkerTestResult {
  success: boolean;
  duration: number;
  output?: any;
  error?: string;
  apiKeyPresent: boolean;
  callbackReceived: boolean;
}

/**
 * Mock worker implementation for testing without API keys
 * Simulates worker behavior without making external API calls
 */
class MockWorker implements IWorker {
  constructor(private workerName: string) {}

  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    logWorker('info', 'Mock worker execution started', {
      worker: this.workerName,
      runId,
      nodeId,
      mockMode: true,
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate mock output based on worker type
    let mockOutput: any;
    switch (this.workerName) {
      case 'claude':
        mockOutput = {
          scenes: [
            {
              visual_prompt: 'Mock visual prompt for scene 1',
              voice_text: 'Mock narration for scene 1',
            },
            {
              visual_prompt: 'Mock visual prompt for scene 2',
              voice_text: 'Mock narration for scene 2',
            },
          ],
        };
        break;
      case 'minimax':
        mockOutput = {
          ...input,
          videoUrl: 'https://mock-video-url.com/video.mp4',
        };
        break;
      case 'elevenlabs':
        mockOutput = {
          ...input,
          audioUrl: 'https://mock-audio-url.com/audio.mp3',
        };
        break;
      case 'shotstack':
        mockOutput = {
          videoUrl: 'https://mock-final-video.com/final.mp4',
          renderId: 'mock-render-id',
        };
        break;
      default:
        mockOutput = { mockData: true };
    }

    logWorker('info', 'Mock worker completed successfully', {
      worker: this.workerName,
      runId,
      nodeId,
      mockMode: true,
    });

    // Trigger callback with mock output
    const { triggerCallback } = await import('./utils');
    await triggerCallback(runId, nodeId, {
      status: 'completed',
      output: mockOutput,
    });
  }
}

/**
 * Creates a mock worker instance for testing
 * @param workerName - Name of the worker to mock
 * @returns Mock worker instance
 */
export function createMockWorker(workerName: string): IWorker {
  return new MockWorker(workerName);
}

/**
 * Checks if API key is present for a given worker
 * @param workerName - Name of the worker to check
 * @returns true if API key is present, false otherwise
 */
export function checkApiKey(workerName: string): boolean {
  const config = getConfig();
  
  switch (workerName) {
    case 'claude':
      return !!config.workers.anthropicApiKey;
    case 'minimax':
      return !!config.workers.minimaxApiKey && !!config.workers.minimaxGroupId;
    case 'elevenlabs':
      return !!config.workers.elevenlabsApiKey;
    case 'shotstack':
      return !!config.workers.shotstackApiKey;
    default:
      return false;
  }
}

/**
 * Gets the required environment variable names for a worker
 * @param workerName - Name of the worker
 * @returns Array of required environment variable names
 */
export function getRequiredEnvVars(workerName: string): string[] {
  switch (workerName) {
    case 'claude':
      return ['ANTHROPIC_API_KEY'];
    case 'minimax':
      return ['MINIMAX_API_KEY', 'MINIMAX_GROUP_ID'];
    case 'elevenlabs':
      return ['ELEVENLABS_API_KEY'];
    case 'shotstack':
      return ['SHOTSTACK_API_KEY'];
    default:
      return [];
  }
}

/**
 * Tests a worker with the given configuration
 * @param config - Worker test configuration
 * @returns Test result with success status and details
 */
export async function testWorker(config: WorkerTestConfig): Promise<WorkerTestResult> {
  const startTime = Date.now();
  const { workerName, mockMode, testInput } = config;

  logWorker('info', 'Worker test started', {
    workerName,
    mockMode,
  });

  // Check if API key is present
  const apiKeyPresent = checkApiKey(workerName);

  // If API key is missing and not in mock mode, return error
  if (!apiKeyPresent && !mockMode) {
    const requiredVars = getRequiredEnvVars(workerName);
    const errorMessage = `Missing required environment variables for ${workerName}: ${requiredVars.join(', ')}`;
    
    logWorker('error', 'Worker test failed - missing API keys', {
      workerName,
      requiredVars,
    });

    return {
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage,
      apiKeyPresent: false,
      callbackReceived: false,
    };
  }

  // Create worker instance (mock or real)
  let worker: IWorker;
  try {
    if (mockMode || !apiKeyPresent) {
      logWorker('info', 'Using mock worker', { workerName });
      worker = createMockWorker(workerName);
    } else {
      logWorker('info', 'Using real worker', { workerName });
      worker = workerRegistry.getWorker(workerName);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWorker('error', 'Failed to create worker instance', {
      workerName,
      error: errorMessage,
    });

    return {
      success: false,
      duration: Date.now() - startTime,
      error: errorMessage,
      apiKeyPresent,
      callbackReceived: false,
    };
  }

  // Generate test IDs
  const testRunId = `test-run-${Date.now()}`;
  const testNodeId = `test-node-${workerName}`;

  // Set up callback listener
  let callbackReceived = false;
  let callbackOutput: any = undefined;
  let callbackError: string | undefined = undefined;

  // Mock the callback endpoint by intercepting fetch calls
  const originalFetch = global.fetch;
  global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Check if this is a callback URL
    if (urlString.includes('/api/stitch/callback/')) {
      callbackReceived = true;
      
      // Parse the callback payload
      if (init?.body) {
        const payload = JSON.parse(init.body as string) as WorkerCallback;
        if (payload.status === 'completed') {
          callbackOutput = payload.output;
        } else {
          callbackError = payload.error;
        }
      }
      
      // Return mock success response
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // For non-callback URLs, use original fetch
    return originalFetch(url, init);
  };

  try {
    // Execute the worker
    await worker.execute(testRunId, testNodeId, {}, testInput);

    // For async workers, wait a bit for callback
    if (['minimax', 'shotstack'].includes(workerName)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const duration = Date.now() - startTime;

    // Restore original fetch
    global.fetch = originalFetch;

    // Check if callback was received
    if (!callbackReceived) {
      logWorker('warn', 'Worker test completed but no callback received', {
        workerName,
        duration,
      });

      return {
        success: false,
        duration,
        error: 'No callback received from worker',
        apiKeyPresent,
        callbackReceived: false,
      };
    }

    // Check if callback indicated failure
    if (callbackError) {
      logWorker('error', 'Worker test received failure callback', {
        workerName,
        error: callbackError,
        duration,
      });

      return {
        success: false,
        duration,
        error: callbackError,
        apiKeyPresent,
        callbackReceived: true,
      };
    }

    logWorker('info', 'Worker test completed successfully', {
      workerName,
      duration,
      outputKeys: callbackOutput ? Object.keys(callbackOutput) : [],
    });

    return {
      success: true,
      duration,
      output: callbackOutput,
      apiKeyPresent,
      callbackReceived: true,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Restore original fetch
    global.fetch = originalFetch;

    logWorker('error', 'Worker test failed with exception', {
      workerName,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    return {
      success: false,
      duration,
      error: errorMessage,
      apiKeyPresent,
      callbackReceived,
    };
  }
}

/**
 * Tests all registered workers
 * @param mockMode - Whether to use mock mode for all workers
 * @returns Map of worker names to test results
 */
export async function testAllWorkers(mockMode: boolean = false): Promise<Record<string, WorkerTestResult>> {
  const workers: Array<'claude' | 'minimax' | 'elevenlabs' | 'shotstack'> = [
    'claude',
    'minimax',
    'elevenlabs',
    'shotstack',
  ];

  const results: Record<string, WorkerTestResult> = {};

  for (const workerName of workers) {
    // Generate appropriate test input for each worker
    let testInput: any;
    switch (workerName) {
      case 'claude':
        testInput = { prompt: 'Create a short video about AI technology' };
        break;
      case 'minimax':
        testInput = { visual_prompt: 'A futuristic cityscape at sunset' };
        break;
      case 'elevenlabs':
        testInput = { voice_text: 'This is a test narration' };
        break;
      case 'shotstack':
        testInput = {
          scenes: [
            {
              visual_prompt: 'Test scene',
              voice_text: 'Test narration',
              videoUrl: 'https://example.com/video.mp4',
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
        };
        break;
    }

    results[workerName] = await testWorker({
      workerName,
      mockMode,
      testInput,
    });
  }

  return results;
}
