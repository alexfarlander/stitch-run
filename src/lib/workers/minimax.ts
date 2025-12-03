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
  private apiKey: string;
  private groupId: string;

  constructor() {
    const config = getConfig();
    
    if (!config.workers.minimaxApiKey) {
      throw new Error('MINIMAX_API_KEY environment variable is required for MiniMax worker');
    }

    if (!config.workers.minimaxGroupId) {
      throw new Error('MINIMAX_GROUP_ID environment variable is required for MiniMax worker');
    }

    this.apiKey = config.workers.minimaxApiKey;
    this.groupId = config.workers.minimaxGroupId;
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
          'X-Group-Id': this.groupId,
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

      logWorker('error', 'MiniMax worker failed', {
        worker: 'minimax',
        runId,
        nodeId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      // For async workers, we need to trigger a failed callback
      // since the external service won't call back if we never made the request
      const { triggerCallback } = await import('./utils');
      await triggerCallback(runId, nodeId, {
        status: 'failed',
        error: errorMessage,
      });
    }
  }
}
