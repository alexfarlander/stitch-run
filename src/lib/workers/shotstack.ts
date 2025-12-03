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
  private apiKey: string;

  constructor() {
    const config = getConfig();
    
    if (!config.workers.shotstackApiKey) {
      throw new Error('SHOTSTACK_API_KEY environment variable is required for Shotstack worker');
    }

    this.apiKey = config.workers.shotstackApiKey;
  }

  /**
   * Executes the Shotstack worker
   * Builds timeline from scenes and initiates async video rendering
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

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

      // Build callback URL
      const callbackUrl = buildCallbackUrl(runId, nodeId);

      // Extract configuration with defaults
      const resolution = config.resolution || 'sd';
      const format = config.format || 'mp4';
      const fps = config.fps || 25;

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
          'x-api-key': this.apiKey,
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

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logWorker('error', 'Shotstack worker failed', {
        worker: 'shotstack',
        runId,
        nodeId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      // For async workers, we need to trigger a failed callback
      // since the external service won't call back if we never made the request
      await triggerCallback(runId, nodeId, {
        status: 'failed',
        error: errorMessage,
      });
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
