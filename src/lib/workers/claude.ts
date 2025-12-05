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
  private client: Anthropic | null = null;
  private mockMode: boolean = false;

  constructor() {
    const _config = getConfig();
    
    if (!config.workers.anthropicApiKey) {
      this.mockMode = true;
      logWorker('warn', 'Claude worker initialized in MOCK MODE', {
        worker: 'claude',
        reason: 'ANTHROPIC_API_KEY environment variable is not set',
        message: 'Worker will return mock data instead of calling the API',
      });
    } else {
      this.client = new Anthropic({
        apiKey: config.workers.anthropicApiKey,
      });
      logWorker('info', 'Claude worker initialized successfully', {
        worker: 'claude',
        apiKeyPresent: true,
      });
    }
  }

  /**
   * Executes the Claude worker
   * Calls Claude API, parses response, validates scenes, and triggers callback
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: unknown
  ): Promise<void> {
    const _startTime = Date.now();

    logWorker('info', 'Claude worker execution started', {
      worker: 'claude',
      runId,
      nodeId,
    });

    try {
      // Extract configuration with defaults
      const model = config.model || 'claude-sonnet-4-20250514';
      const maxTokens = config.maxTokens || 4096;
      const prompt = input?.prompt || input;

      if (!prompt) {
        throw new Error('No prompt provided in input');
      }

      // Handle mock mode
      if (this.mockMode) {
        logWorker('info', 'Claude worker running in MOCK MODE', {
          worker: 'claude',
          runId,
          nodeId,
          message: 'Returning mock scene data',
        });

        // Return mock scenes after a short delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockScenes = [
          {
            visual_prompt: "A stunning aerial view of a modern city skyline at golden hour, with glass buildings reflecting warm sunlight",
            voice_text: "Welcome to the future of innovation and technology"
          },
          {
            visual_prompt: "Close-up of hands typing on a sleek laptop, with code visible on the screen, in a minimalist workspace",
            voice_text: "Where ideas transform into reality through the power of code"
          },
          {
            visual_prompt: "A diverse team collaborating around a digital whiteboard, pointing at colorful diagrams and charts",
            voice_text: "Teams working together to solve tomorrow's challenges today"
          },
          {
            visual_prompt: "A rocket launching into a clear blue sky, leaving a trail of white smoke behind",
            voice_text: "Taking your vision to new heights and beyond"
          }
        ];

        const duration = Date.now() - startTime;
        logWorker('info', 'Claude worker completed successfully (MOCK MODE)', {
          worker: 'claude',
          runId,
          nodeId,
          sceneCount: mockScenes.length,
          duration,
        });

        await triggerCallback(runId, nodeId, {
          status: 'completed',
          output: { scenes: mockScenes },
        });

        return;
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
      const response = await this.client!.messages.create({
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
      let parsedResponse: unknown;
      try {
        parsedResponse = JSON.parse(cleanJson);
      } catch (_error) {
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

    } catch (_error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Import error utilities
      const { extractErrorContext, categorizeError } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'Claude worker failed', {
        worker: 'claude',
        runId,
        nodeId,
        error: errorMessage,
        ...errorContext,
        duration,
        phase: 'execution',
      });

      // Trigger failure callback with detailed error information
      try {
        await triggerCallback(runId, nodeId, {
          status: 'failed',
          error: errorMessage,
        });
      } catch (callbackError) {
        // Log callback failure but don't throw - we've already failed
        const callbackErrorContext = extractErrorContext(callbackError);
        logWorker('error', 'Failed to trigger failure callback for Claude worker', {
          worker: 'claude',
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
