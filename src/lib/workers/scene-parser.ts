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
  private client: Anthropic;

  constructor() {
    const config = getConfig();
    
    if (!config.workers.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for Scene Parser worker');
    }

    this.client = new Anthropic({
      apiKey: config.workers.anthropicApiKey,
    });
  }

  /**
   * Executes the Scene Parser worker
   * Calls Claude API to parse script into scenes, validates structure, and triggers callback
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

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
      const model = config.model || 'claude-3-5-sonnet-20241022';
      const maxTokens = config.maxTokens || 4096;
      const targetSceneCount = config.target_scene_count || 4;

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
      const response = await this.client.messages.create({
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
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(cleanJson);
      } catch (error) {
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

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logWorker('error', 'Scene Parser worker failed', {
        worker: 'scene-parser',
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
