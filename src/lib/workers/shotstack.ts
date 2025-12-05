/**
 * Shotstack Worker
 * Asynchronous worker that uses Shotstack API to assemble video and audio clips into a final video
 */

import { IWorker } from './base';
import { NodeConfig, Scene, ShotstackPayload, ShotstackTimeline, ShotstackTrack, ShotstackClip } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { buildCallbackUrl, logWorker, triggerCallback } from './utils';

/**
 * Shotstack worker implementation
 * Assembles multiple video and audio clips into a final composed video
 */
export class ShotstackWorker implements IWorker {
  private apiKey: string | null = null;
  private mockMode: boolean = false;

  constructor() {
    const _config = getConfig();
    
    if (!config.workers.shotstackApiKey) {
      this.mockMode = true;
      logWorker('warn', 'Shotstack worker initialized in MOCK MODE', {
        worker: 'shotstack',
        reason: 'SHOTSTACK_API_KEY environment variable is not set',
        message: 'Worker will return mock video URLs instead of calling the API',
      });
    } else {
      this.apiKey = config.workers.shotstackApiKey;
      logWorker('info', 'Shotstack worker initialized successfully', {
        worker: 'shotstack',
        apiKeyPresent: true,
      });
    }
  }

  /**
   * Executes the Shotstack worker
   * Builds timeline from scenes and initiates async video rendering
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: unknown
  ): Promise<void> {
    const _startTime = Date.now();

    logWorker('info', 'Shotstack worker execution started', {
      worker: 'shotstack',
      runId,
      nodeId,
    });

    try {
      // Extract scenes array from input
      // Input could be { scenes: [...] } or just [...]
      let scenes: Scene[];
      
      if (Array.isArray(input)) {
        scenes = input;
      } else if (input?.scenes && Array.isArray(input.scenes)) {
        scenes = input.scenes;
      } else {
        throw new Error('No valid scene array provided in input. Expected array or object with scenes property.');
      }

      if (scenes.length === 0) {
        throw new Error('Scene array is empty');
      }

      // Validate each scene has required fields
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene.visual_prompt && !scene.videoUrl) {
          throw new Error(`Scene ${i} missing visual_prompt or videoUrl`);
        }
        if (!scene.voice_text && !scene.audioUrl) {
          throw new Error(`Scene ${i} missing voice_text or audioUrl`);
        }
      }

      // Handle mock mode
      if (this.mockMode) {
        logWorker('info', 'Shotstack worker running in MOCK MODE', {
          worker: 'shotstack',
          runId,
          nodeId,
          sceneCount: scenes.length,
          message: 'Returning mock final video URL',
        });

        // Simulate async behavior with a delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate callback after a delay
        setTimeout(async () => {
          await triggerCallback(runId, nodeId, {
            status: 'completed',
            output: {
              finalVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              duration: scenes.length * 5,
            },
          });
        }, 5000);

        const duration = Date.now() - startTime;
        logWorker('info', 'Shotstack worker initiated successfully (MOCK MODE)', {
          worker: 'shotstack',
          runId,
          nodeId,
          duration,
        });

        return;
      }

      // Build callback URL
      const callbackUrl = buildCallbackUrl(runId, nodeId);

      // Extract configuration with defaults
      const resolution = config.resolution || 'sd';
      const format = config.format || 'mp4';
      const _fps = config.fps || 25;

      // Build timeline structure
      const timeline = this.buildTimeline(scenes);

      // Construct payload for Shotstack API
      const payload: ShotstackPayload = {
        timeline,
        output: {
          format,
          resolution,
        },
        callback: callbackUrl,
      };

      logWorker('info', 'Calling Shotstack API', {
        worker: 'shotstack',
        runId,
        nodeId,
        sceneCount: scenes.length,
        resolution,
        format,
      });

      // Send POST request to Shotstack API
      const response = await fetch('https://api.shotstack.io/v1/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shotstack API request failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      const duration = Date.now() - startTime;
      logWorker('info', 'Shotstack worker initiated successfully', {
        worker: 'shotstack',
        runId,
        nodeId,
        duration,
        renderId: responseData.response?.id,
      });

      // Node is now marked as "running" by the engine
      // Shotstack will call back when video rendering is complete
      // No callback is triggered here - this is async pattern

    } catch (_error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Import error utilities
      const { extractErrorContext, categorizeError } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'Shotstack worker failed', {
        worker: 'shotstack',
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
        logWorker('error', 'Failed to trigger failure callback for Shotstack worker', {
          worker: 'shotstack',
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

  /**
   * Builds a Shotstack timeline from an array of scenes
   * Creates two tracks: one for video clips and one for audio clips
   * Calculates start times based on cumulative duration
   * 
   * @param scenes - Array of scenes with video and audio URLs
   * @returns Shotstack timeline structure
   */
  private buildTimeline(scenes: Scene[]): ShotstackTimeline {
    const videoClips: ShotstackClip[] = [];
    const audioClips: ShotstackClip[] = [];
    let cumulativeTime = 0;

    for (const scene of scenes) {
      // Default duration if not specified
      const duration = scene.duration || 5;

      // Add video clip if videoUrl exists
      if (scene.videoUrl) {
        videoClips.push({
          asset: {
            type: 'video',
            src: scene.videoUrl,
          },
          start: cumulativeTime,
          length: duration,
        });
      }

      // Add audio clip if audioUrl exists
      if (scene.audioUrl) {
        audioClips.push({
          asset: {
            type: 'audio',
            src: scene.audioUrl,
          },
          start: cumulativeTime,
          length: duration,
        });
      }

      // Update cumulative time for next clip
      cumulativeTime += duration;
    }

    // Create two tracks: video and audio
    const tracks: ShotstackTrack[] = [
      { clips: videoClips },
      { clips: audioClips },
    ];

    return {
      background: '#000000',
      tracks,
    };
  }
}
