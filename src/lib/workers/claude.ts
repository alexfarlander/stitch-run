/**
 * Claude Worker
 * Synchronous worker that uses Anthropic's Claude API to generate scene descriptions
 */

import Anthropic from '@anthropic-ai/sdk';
import { IWorker } from './base';
import { NodeConfig, Scene } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { triggerCallback, logWorker } from './utils';

/**
 * Claude worker implementation
 * Generates structured scene descriptions from text prompts
 */
export class ClaudeWorker implements IWorker {
  private client: Anthropic;

  constructor() {
    const config = getConfig();
    
    if (!config.workers.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude worker');
    }

    this.client = new Anthropic({
      apiKey: config.workers.anthropicApiKey,
    });
  }

  /**
   * Executes the Claude worker
   * Calls Claude API, parses response, validates scenes, and triggers callback
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    logWorker('info', 'Claude worker execution started', {
      worker: 'claude',
      runId,
      nodeId,
    });

    try {
      // Extract configuration with defaults
      const model = config.model || 'claude-3-5-sonnet-20241022';
      const maxTokens = config.maxTokens || 4096;
      const prompt = input?.prompt || input;

      if (!prompt) {
        throw new Error('No prompt provided in input');
      }

      // Define the System Prompt to enforce JSON output
      const systemPrompt = `You are a viral video script writer for an AI video generation pipeline.
Output ONLY valid JSON. Do not include any conversational text.

Output Schema:
{
  "scenes": [
    {
      "visual_prompt": "Detailed description for AI video generator (photorealistic, cinematic)",
      "voice_text": "The narration text for this scene (approx 15 words)"
    }
  ]
}

Create exactly 4 scenes that tell a cohesive story based on the user's topic.`;

      logWorker('info', 'Calling Claude API', {
        worker: 'claude',
        runId,
        nodeId,
        model,
        maxTokens,
      });

      // Call Claude API with System Prompt
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
          },
        ],
      });

      logWorker('info', 'Claude API response received', {
        worker: 'claude',
        runId,
        nodeId,
        status: response.stop_reason,
      });

      // Extract text content from response
      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      // Clean Markdown code blocks before parsing (CRITICAL)
      const cleanJson = textContent.text
        .replace(/^```json\s*/, '') // Remove start of JSON code block
        .replace(/^```\s*/, '')     // Remove generic code block start
        .replace(/\s*```$/, '');    // Remove code block end

      // Parse JSON response
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(cleanJson);
      } catch (error) {
        // Log the raw text so we can debug why it failed
        console.error('Failed to parse raw output:', cleanJson);
        throw new Error(`Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Validate response structure
      if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
        throw new Error('Claude response must contain a "scenes" array');
      }

      // Validate each scene
      const scenes: Scene[] = parsedResponse.scenes;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene.visual_prompt || typeof scene.visual_prompt !== 'string') {
          throw new Error(`Scene ${i} missing or invalid visual_prompt field`);
        }
        if (!scene.voice_text || typeof scene.voice_text !== 'string') {
          throw new Error(`Scene ${i} missing or invalid voice_text field`);
        }
      }

      const duration = Date.now() - startTime;
      logWorker('info', 'Claude worker completed successfully', {
        worker: 'claude',
        runId,
        nodeId,
        sceneCount: scenes.length,
        duration,
      });

      // Trigger success callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: { scenes },
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logWorker('error', 'Claude worker failed', {
        worker: 'claude',
        runId,
        nodeId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      // Trigger failure callback
      await triggerCallback(runId, nodeId, {
        status: 'failed',
        error: errorMessage,
      });
    }
  }
}
