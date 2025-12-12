/**
 * Wireframe Generator Worker
 * Generates wireframe images from scene descriptions using AI image generation APIs
 * Validates: Requirements 5.2, 5.4, 8.1, 8.4, 8.5
 */

import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { triggerCallback, logWorker } from './utils';
import { uploadFromUrl } from '@/lib/media/media-service';

/**
 * Image generation API adapter interface
 */
interface ImageGenerationAdapter {
  generateImage(prompt: string, config: any): Promise<string>;
}

/**
 * Mock adapter for testing and development
 */
class MockImageAdapter implements ImageGenerationAdapter {
  async generateImage(prompt: string, config: any): Promise<string> {
    logWorker('info', 'Mock image generation', { prompt, config });
    // Return a placeholder image URL
    return 'https://via.placeholder.com/1024x1024.png?text=Wireframe';
  }
}

/**
 * Ideogram API adapter
 * Note: Requires IDEOGRAM_API_KEY environment variable
 */
class IdeogramAdapter implements ImageGenerationAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(prompt: string, config: any): Promise<string> {
    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': this.apiKey,
      },
      body: JSON.stringify({
        image_request: {
          prompt,
          aspect_ratio: config.aspectRatio || 'ASPECT_16_9',
          model: config.model || 'V_2',
          magic_prompt_option: config.magicPrompt || 'AUTO',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ideogram API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response from Ideogram API');
    }

    return data.data[0].url;
  }
}

/**
 * DALL-E API adapter
 * Note: Requires OPENAI_API_KEY environment variable
 */
class DallEAdapter implements ImageGenerationAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(prompt: string, config: any): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'dall-e-3',
        prompt,
        n: 1,
        size: config.size || '1792x1024',
        quality: config.quality || 'standard',
      }),
    });

    if (!response.ok) {
      throw new Error(`DALL-E API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response from DALL-E API');
    }

    return data.data[0].url;
  }
}

/**
 * Wireframe Generator worker implementation
 * Generates wireframe images and uploads them to the Media Library
 */
export class WireframeGeneratorWorker implements IWorker {
  private adapter: ImageGenerationAdapter;

  constructor() {
    const config = getConfig();
    
    // Determine which adapter to use based on configuration
    const adapterType = process.env.IMAGE_GENERATION_ADAPTER || 'mock';
    
    switch (adapterType.toLowerCase()) {
      case 'ideogram':
        if (!process.env.IDEOGRAM_API_KEY) {
          logWorker('warn', 'Wireframe Generator falling back to MOCK MODE', {
            worker: 'wireframe-generator',
            reason: 'IDEOGRAM_API_KEY environment variable is not set',
            requestedAdapter: 'ideogram',
            message: 'Using mock adapter instead',
          });
          this.adapter = new MockImageAdapter();
        } else {
          this.adapter = new IdeogramAdapter(process.env.IDEOGRAM_API_KEY);
          logWorker('info', 'Wireframe Generator initialized with Ideogram adapter', {
            worker: 'wireframe-generator',
            adapter: 'ideogram',
            apiKeyPresent: true,
          });
        }
        break;
      
      case 'dalle':
      case 'dall-e':
        if (!process.env.OPENAI_API_KEY) {
          logWorker('warn', 'Wireframe Generator falling back to MOCK MODE', {
            worker: 'wireframe-generator',
            reason: 'OPENAI_API_KEY environment variable is not set',
            requestedAdapter: 'dalle',
            message: 'Using mock adapter instead',
          });
          this.adapter = new MockImageAdapter();
        } else {
          this.adapter = new DallEAdapter(process.env.OPENAI_API_KEY);
          logWorker('info', 'Wireframe Generator initialized with DALL-E adapter', {
            worker: 'wireframe-generator',
            adapter: 'dalle',
            apiKeyPresent: true,
          });
        }
        break;
      
      case 'mock':
      default:
        this.adapter = new MockImageAdapter();
        logWorker('info', 'Wireframe Generator initialized in MOCK MODE', {
          worker: 'wireframe-generator',
          adapter: 'mock',
          message: 'Using placeholder images',
        });
        break;
    }
  }

  /**
   * Executes the Wireframe Generator worker
   * Generates wireframe image, uploads to Media Library, and triggers callback
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    logWorker('info', 'Wireframe Generator worker execution started', {
      worker: 'wireframe-generator',
      runId,
      nodeId,
    });

    try {
      // Extract user ID from input (required for multi-user system)
      const userId = input?.user_id || process.env.STITCH_WORKER_USER_ID;
      
      if (!userId) {
        throw new Error('user_id is required in input for Media Library ownership');
      }

      // Extract required inputs
      const sceneDescription = input?.scene_description || input?.visual_description;
      const sceneIndex = input?.scene_index ?? input?.index;
      const projectName = input?.project_name || config.project_name || 'untitled';

      if (!sceneDescription || typeof sceneDescription !== 'string') {
        throw new Error('No valid scene_description provided in input');
      }

      if (sceneIndex === undefined || sceneIndex === null) {
        throw new Error('No scene_index provided in input');
      }

      // Build prompt with optional style reference
      let fullPrompt = sceneDescription;
      
      if (input?.style_reference || config.style_reference) {
        const styleRef = input?.style_reference || config.style_reference;
        fullPrompt = `${styleRef}\n\n${sceneDescription}`;
      }

      logWorker('info', 'Generating wireframe image', {
        worker: 'wireframe-generator',
        runId,
        nodeId,
        sceneIndex,
        projectName,
        promptLength: fullPrompt.length,
      });

      // Generate image with retry logic
      let imageUrl: string;
      let lastError: Error | null = null;
      const maxRetries = config.maxRetries || 3;
      const timeout = config.timeout || 60000; // 60 seconds default

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise<never>((resolve, reject) => {
            void resolve;
            setTimeout(() => reject(new Error('Image generation timeout')), timeout);
          });

          const generationPromise = this.adapter.generateImage(fullPrompt, config);
          
          imageUrl = await Promise.race([generationPromise, timeoutPromise]);
          lastError = null;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          logWorker('warn', `Image generation attempt ${attempt} failed`, {
            worker: 'wireframe-generator',
            runId,
            nodeId,
            attempt,
            error: lastError.message,
          });

          if (attempt === maxRetries) {
            throw lastError;
          }

          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      if (!imageUrl!) {
        throw lastError || new Error('Failed to generate image');
      }

      logWorker('info', 'Image generated successfully, uploading to Media Library', {
        worker: 'wireframe-generator',
        runId,
        nodeId,
        imageUrl,
      });

      // Upload to Media Library
      const filename = `${projectName}_scene_${sceneIndex}.png`;
      const targetMediaType = config.media_type || 'wireframe';
      const tags = [targetMediaType, 'ai-generated', projectName];
      const metadata = {
        scene_index: sceneIndex,
        prompt: fullPrompt,
        project_name: projectName,
        generated_by: 'wireframe-generator',
        generation_config: config,
      };

      const mediaAsset = await uploadFromUrl(
        imageUrl,
        filename,
        targetMediaType,
        metadata,
        tags,
        userId
      );

      const duration = Date.now() - startTime;
      logWorker('info', 'Wireframe Generator worker completed successfully', {
        worker: 'wireframe-generator',
        runId,
        nodeId,
        wireframeId: mediaAsset.id,
        duration,
      });

      // Trigger success callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: {
          wireframe_id: mediaAsset.id,
          url: mediaAsset.url,
          thumbnail_url: mediaAsset.thumbnail_url,
          scene_index: sceneIndex,
        },
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Import error utilities
      const { extractErrorContext, categorizeError } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'Wireframe Generator worker failed', {
        worker: 'wireframe-generator',
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
        logWorker('error', 'Failed to trigger failure callback for Wireframe Generator worker', {
          worker: 'wireframe-generator',
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
