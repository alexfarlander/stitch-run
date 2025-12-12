/**
 * MiniMax Worker
 * Asynchronous worker that uses MiniMax API to generate video clips from text prompts
 */

import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { buildCallbackUrl, logWorker } from './utils';

/**
 * MiniMax worker implementation
 * Generates video clips from visual prompts asynchronously
 */
export class MiniMaxWorker implements IWorker {
  private apiKey: string | null = null;
  private groupId: string | null = null;
  private mockMode: boolean = false;

  constructor() {
    const config = getConfig();
    
    if (!config.workers.minimaxApiKey || !config.workers.minimaxGroupId) {
      this.mockMode = true;
      const missingVars = [];
      if (!config.workers.minimaxApiKey) missingVars.push('MINIMAX_API_KEY');
      if (!config.workers.minimaxGroupId) missingVars.push('MINIMAX_GROUP_ID');
      
      logWorker('warn', 'MiniMax worker initialized in MOCK MODE', {
        worker: 'minimax',
        reason: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Worker will return mock video URLs instead of calling the API',
      });
    } else {
      this.apiKey = config.workers.minimaxApiKey;
      this.groupId = config.workers.minimaxGroupId;
      logWorker('info', 'MiniMax worker initialized successfully', {
        worker: 'minimax',
        apiKeyPresent: true,
        groupIdPresent: true,
      });
    }
  }

  /**
   * Executes the MiniMax worker
   * Initiates async video generation and returns immediately
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    logWorker('info', 'MiniMax worker execution started', {
      worker: 'minimax',
      runId,
      nodeId,
    });

    try {
      // Extract visual_prompt from input
      const visualPrompt = input?.visual_prompt || input?.visualPrompt;

      if (!visualPrompt) {
        throw new Error('No visual_prompt provided in input');
      }

      // Handle mock mode
      if (this.mockMode) {
        logWorker('info', 'MiniMax worker running in MOCK MODE', {
          worker: 'minimax',
          runId,
          nodeId,
          message: 'Returning mock video URL',
        });

        // Simulate async behavior with a delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Store the original input in the node state
        const { updateNodeState } = await import('@/lib/db/runs');
        await updateNodeState(runId, nodeId, {
          status: 'running',
          output: input,
        });

        // Simulate callback after a delay
        setTimeout(async () => {
          const { triggerCallback } = await import('./utils');
          await triggerCallback(runId, nodeId, {
            status: 'completed',
            output: {
              ...input,
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            },
          });
        }, 3000);

        const duration = Date.now() - startTime;
        logWorker('info', 'MiniMax worker initiated successfully (MOCK MODE)', {
          worker: 'minimax',
          runId,
          nodeId,
          duration,
        });

        return;
      }

      // Build callback URL
      const callbackUrl = buildCallbackUrl(runId, nodeId);

      // Extract configuration with defaults
      const model = config.model || 'video-01';

      // Construct payload for MiniMax API
      const payload = {
        model,
        prompt: visualPrompt,
        callback_url: callbackUrl,
      };

      logWorker('info', 'Calling MiniMax API', {
        worker: 'minimax',
        runId,
        nodeId,
        model,
        promptLength: visualPrompt.length,
      });

      // Send POST request to MiniMax API
      const response = await fetch('https://api.minimax.io/v1/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Group-Id': this.groupId!,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MiniMax API request failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      const duration = Date.now() - startTime;
      logWorker('info', 'MiniMax worker initiated successfully', {
        worker: 'minimax',
        runId,
        nodeId,
        duration,
        responseData,
      });

      // Store the original input in the node state so it can be merged with the callback
      // This ensures data flows through the pipeline (e.g., voice_text survives for ElevenLabs)
      const { updateNodeState } = await import('@/lib/db/runs');
      await updateNodeState(runId, nodeId, {
        status: 'running',
        output: input, // Store original input for later merging
      });

      // Node is now marked as "running" with original input stored
      // MiniMax will call back when video generation is complete
      // The callback handler will merge the videoUrl with this stored input

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Import error utilities
      const { triggerCallback, extractErrorContext, categorizeError } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'MiniMax worker failed', {
        worker: 'minimax',
        runId,
        nodeId,
        error: errorMessage,
        ...errorContext,
        duration,
        phase: 'execution',
      });

      // For async workers, we need to trigger a failed callback
      // since the external service won't call back if we never made the request
      try {
        await triggerCallback(runId, nodeId, {
          status: 'failed',
          error: errorMessage,
        });
      } catch (callbackError) {
        // Log callback failure but don't throw - we've already failed
        const callbackErrorContext = extractErrorContext(callbackError);
        logWorker('error', 'Failed to trigger failure callback for MiniMax worker', {
          worker: 'minimax',
          runId,
          nodeId,
          originalError: errorMessage,
          callbackError: callbackError instanceof Error ? callbackError.message : 'Unknown error',
          ...callbackErrorContext,
          phase: 'callback',
        });
      }
    }
  }
}
