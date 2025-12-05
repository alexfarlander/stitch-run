/**
 * Scene Parser Worker
 * Parses scripts into structured scene arrays using Claude API
 * Validates: Requirements 5.1
 */

import Anthropic from '@anthropic-ai/sdk';
import { IWorker } from './base';
import { NodeConfig, Scene } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { triggerCallback, logWorker } from './utils';

/**
 * Scene Parser worker implementation
 * Takes a script as input and outputs an array of structured scenes
 */
export class SceneParserWorker implements IWorker {
  private client: Anthropic | null = null;
  private mockMode: boolean = false;

  constructor() {
    const _config = getConfig();
    
    if (!config.workers.anthropicApiKey) {
      this.mockMode = true;
      logWorker('warn', 'Scene Parser worker initialized in MOCK MODE', {
        worker: 'scene-parser',
        reason: 'ANTHROPIC_API_KEY environment variable is not set',
        message: 'Worker will return mock scene data instead of calling the API',
      });
    } else {
      this.client = new Anthropic({
        apiKey: config.workers.anthropicApiKey,
      });
      logWorker('info', 'Scene Parser worker initialized successfully', {
        worker: 'scene-parser',
        apiKeyPresent: true,
      });
    }
  }

  /**
   * Executes the Scene Parser worker
   * Calls Claude API to parse script into scenes, validates structure, and triggers callback
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: unknown
  ): Promise<void> {
    const _startTime = Date.now();

    logWorker('info', 'Scene Parser worker execution started', {
      worker: 'scene-parser',
      runId,
      nodeId,
    });

    try {
      // Extract script from input
      const script = input?.script || input;

      if (!script || typeof script !== 'string') {
        throw new Error('No valid script provided in input. Expected string in input.script or input');
      }

      // Extract configuration with defaults
      const targetSceneCount = config.target_scene_count || 4;

      // Handle mock mode
      if (this.mockMode) {
        logWorker('info', 'Scene Parser worker running in MOCK MODE', {
          worker: 'scene-parser',
          runId,
          nodeId,
          message: 'Returning mock parsed scenes',
        });

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockScenes = [
          {
            visual_description: "Opening shot of a bustling city street with people walking, cars passing, and tall buildings in the background",
            voiceover_text: "In the heart of the city, life moves at its own pace"
          },
          {
            visual_description: "Close-up of a person's face looking thoughtful, with soft natural lighting from a window",
            voiceover_text: "Every person has a story waiting to be told"
          },
          {
            visual_description: "Wide shot of a park with children playing, families picnicking, and trees swaying in the breeze",
            voiceover_text: "Moments of joy are found in the simplest places"
          },
          {
            visual_description: "Sunset over the city skyline, with warm orange and pink hues painting the sky",
            voiceover_text: "And as the day ends, we're reminded of what truly matters"
          }
        ];

        const duration = Date.now() - startTime;
        logWorker('info', 'Scene Parser worker completed successfully (MOCK MODE)', {
          worker: 'scene-parser',
          runId,
          nodeId,
          sceneCount: mockScenes.length,
          duration,
        });

        await triggerCallback(runId, nodeId, {
          status: 'completed',
          output: { 
            scenes: mockScenes,
            total_scenes: mockScenes.length,
          },
        });

        return;
      }

      const model = config.model || 'claude-3-5-sonnet-20241022';
      const maxTokens = config.maxTokens || 4096;

      // Define the System Prompt to enforce JSON output
      const systemPrompt = `You are a script parser for a video generation pipeline.
Your task is to parse the provided script into individual scenes.

Output ONLY valid JSON. Do not include any conversational text or markdown code blocks.

Output Schema:
{
  "scenes": [
    {
      "visual_description": "Detailed visual description for this scene",
      "voiceover_text": "The narration text for this scene"
    }
  ]
}

Guidelines:
- Create approximately ${targetSceneCount} scenes (adjust based on script length and natural breaks)
- Each scene should be a coherent unit with clear visual and audio components
- visual_description should be detailed enough for AI video generation
- voiceover_text should be the exact narration for this scene
- Ensure scenes flow logically and tell a cohesive story`;

      logWorker('info', 'Calling Claude API for scene parsing', {
        worker: 'scene-parser',
        runId,
        nodeId,
        model,
        maxTokens,
        targetSceneCount,
        scriptLength: script.length,
      });

      // Call Claude API
      const response = await this.client!.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: script,
          },
        ],
      });

      logWorker('info', 'Claude API response received', {
        worker: 'scene-parser',
        runId,
        nodeId,
        status: response.stop_reason,
      });

      // Extract text content from response
      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      // Clean Markdown code blocks before parsing
      const cleanJson = textContent.text
        .replace(/^```json\s*/, '') // Remove start of JSON code block
        .replace(/^```\s*/, '')     // Remove generic code block start
        .replace(/\s*```$/, '');    // Remove code block end

      // Parse JSON response
      let parsedResponse: unknown;
      try {
        parsedResponse = JSON.parse(cleanJson);
      } catch (_error) {
        // Log the raw text for debugging
        console.error('Failed to parse raw output:', cleanJson);
        throw new Error(`Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Validate response structure
      if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
        throw new Error('Claude response must contain a "scenes" array');
      }

      if (parsedResponse.scenes.length === 0) {
        throw new Error('Claude response contains empty scenes array');
      }

      // Validate each scene structure
      const scenes = parsedResponse.scenes;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        
        if (!scene.visual_description || typeof scene.visual_description !== 'string') {
          throw new Error(`Scene ${i} missing or invalid visual_description field`);
        }
        
        if (!scene.voiceover_text || typeof scene.voiceover_text !== 'string') {
          throw new Error(`Scene ${i} missing or invalid voiceover_text field`);
        }

        // Ensure non-empty strings
        if (scene.visual_description.trim().length === 0) {
          throw new Error(`Scene ${i} has empty visual_description`);
        }
        
        if (scene.voiceover_text.trim().length === 0) {
          throw new Error(`Scene ${i} has empty voiceover_text`);
        }
      }

      const duration = Date.now() - startTime;
      logWorker('info', 'Scene Parser worker completed successfully', {
        worker: 'scene-parser',
        runId,
        nodeId,
        sceneCount: scenes.length,
        duration,
      });

      // Trigger success callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: { 
          scenes,
          total_scenes: scenes.length,
        },
      });

    } catch (_error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Import error utilities
      const { extractErrorContext, categorizeError } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'Scene Parser worker failed', {
        worker: 'scene-parser',
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
        logWorker('error', 'Failed to trigger failure callback for Scene Parser worker', {
          worker: 'scene-parser',
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
