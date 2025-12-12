/**
 * Image-to-Video Worker
 * Generates videos from static images using AI video generation APIs
 * Validates: Requirements 6.2, 6.3, 6.6, 8.2, 8.4, 8.5
 */

import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { triggerCallback, logWorker } from './utils';
import { uploadFromUrl } from '@/lib/media/media-service';

/**
 * Video generation job status
 */
interface VideoGenerationJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

/**
 * Video generation API adapter interface
 */
interface VideoGenerationAdapter {
  /**
   * Initiates video generation from an image
   * @returns Job ID for polling
   */
  generateVideo(imageUrl: string, motionPrompt: string, config: any): Promise<string>;
  
  /**
   * Polls for job completion
   * @returns Job status and video URL when completed
   */
  pollJobStatus(jobId: string): Promise<VideoGenerationJob>;
}

/**
 * Mock adapter for testing and development
 */
class MockVideoAdapter implements VideoGenerationAdapter {
  async generateVideo(imageUrl: string, motionPrompt: string, config: any): Promise<string> {
    logWorker('info', 'Mock video generation initiated', { imageUrl, motionPrompt, config });
    // Return a mock job ID
    return `mock-job-${Date.now()}`;
  }

  async pollJobStatus(jobId: string): Promise<VideoGenerationJob> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      jobId,
      status: 'completed',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    };
  }
}

/**
 * Runway API adapter
 * Note: Requires RUNWAY_API_KEY environment variable
 */
class RunwayAdapter implements VideoGenerationAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.runwayml.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(imageUrl: string, motionPrompt: string, config: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/image-to-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: motionPrompt,
        duration: config.duration || 5,
        model: config.model || 'gen3',
      }),
    });

    if (!response.ok) {
      throw new Error(`Runway API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.id) {
      throw new Error('Invalid response from Runway API: missing job ID');
    }

    return data.id;
  }

  async pollJobStatus(jobId: string): Promise<VideoGenerationJob> {
    const response = await fetch(`${this.baseUrl}/tasks/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Runway API polling error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map Runway status to our status
    let status: VideoGenerationJob['status'];
    switch (data.status) {
      case 'PENDING':
      case 'RUNNING':
        status = 'processing';
        break;
      case 'SUCCEEDED':
        status = 'completed';
        break;
      case 'FAILED':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    return {
      jobId,
      status,
      videoUrl: data.output?.video_url,
      error: data.error,
    };
  }
}

/**
 * Pika API adapter
 * Note: Requires PIKA_API_KEY environment variable
 */
class PikaAdapter implements VideoGenerationAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.pika.art/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(imageUrl: string, motionPrompt: string, config: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        image: imageUrl,
        prompt: motionPrompt,
        duration: config.duration || 3,
        aspect_ratio: config.aspectRatio || '16:9',
      }),
    });

    if (!response.ok) {
      throw new Error(`Pika API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.job_id) {
      throw new Error('Invalid response from Pika API: missing job ID');
    }

    return data.job_id;
  }

  async pollJobStatus(jobId: string): Promise<VideoGenerationJob> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Pika API polling error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map Pika status to our status
    let status: VideoGenerationJob['status'];
    switch (data.status) {
      case 'queued':
      case 'processing':
        status = 'processing';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    return {
      jobId,
      status,
      videoUrl: data.video_url,
      error: data.error_message,
    };
  }
}

/**
 * Kling API adapter
 * Note: Requires KLING_API_KEY environment variable
 */
class KlingAdapter implements VideoGenerationAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.klingai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(imageUrl: string, motionPrompt: string, config: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/videos/image2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: motionPrompt,
        duration: config.duration || 5,
        cfg_scale: config.cfgScale || 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Kling API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data?.task_id) {
      throw new Error('Invalid response from Kling API: missing task ID');
    }

    return data.data.task_id;
  }

  async pollJobStatus(jobId: string): Promise<VideoGenerationJob> {
    const response = await fetch(`${this.baseUrl}/videos/image2video/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Kling API polling error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map Kling status to our status
    let status: VideoGenerationJob['status'];
    switch (data.data?.task_status) {
      case 'submitted':
      case 'processing':
        status = 'processing';
        break;
      case 'succeed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    return {
      jobId,
      status,
      videoUrl: data.data?.task_result?.videos?.[0]?.url,
      error: data.message,
    };
  }
}

/**
 * Image-to-Video worker implementation
 * Generates videos from images and uploads them to the Media Library
 */
export class ImageToVideoWorker implements IWorker {
  private adapter: VideoGenerationAdapter;
  public mockMode: boolean = false;

  constructor() {
    // Determine which adapter to use based on configuration
    const adapterType = process.env.VIDEO_GENERATION_ADAPTER || 'mock';
    
    switch (adapterType.toLowerCase()) {
      case 'runway':
        if (!process.env.RUNWAY_API_KEY) {
          this.mockMode = true;
          logWorker('warn', 'Image-to-Video falling back to MOCK MODE', {
            worker: 'image-to-video',
            reason: 'RUNWAY_API_KEY environment variable is not set',
            requestedAdapter: 'runway',
            message: 'Using mock adapter instead',
          });
          this.adapter = new MockVideoAdapter();
        } else {
          this.adapter = new RunwayAdapter(process.env.RUNWAY_API_KEY);
          logWorker('info', 'Image-to-Video initialized with Runway adapter', {
            worker: 'image-to-video',
            adapter: 'runway',
            apiKeyPresent: true,
          });
        }
        break;
      
      case 'pika':
        if (!process.env.PIKA_API_KEY) {
          this.mockMode = true;
          logWorker('warn', 'Image-to-Video falling back to MOCK MODE', {
            worker: 'image-to-video',
            reason: 'PIKA_API_KEY environment variable is not set',
            requestedAdapter: 'pika',
            message: 'Using mock adapter instead',
          });
          this.adapter = new MockVideoAdapter();
        } else {
          this.adapter = new PikaAdapter(process.env.PIKA_API_KEY);
          logWorker('info', 'Image-to-Video initialized with Pika adapter', {
            worker: 'image-to-video',
            adapter: 'pika',
            apiKeyPresent: true,
          });
        }
        break;
      
      case 'kling':
        if (!process.env.KLING_API_KEY) {
          this.mockMode = true;
          logWorker('warn', 'Image-to-Video falling back to MOCK MODE', {
            worker: 'image-to-video',
            reason: 'KLING_API_KEY environment variable is not set',
            requestedAdapter: 'kling',
            message: 'Using mock adapter instead',
          });
          this.adapter = new MockVideoAdapter();
        } else {
          this.adapter = new KlingAdapter(process.env.KLING_API_KEY);
          logWorker('info', 'Image-to-Video initialized with Kling adapter', {
            worker: 'image-to-video',
            adapter: 'kling',
            apiKeyPresent: true,
          });
        }
        break;
      
      case 'mock':
      default:
        this.mockMode = true;
        this.adapter = new MockVideoAdapter();
        logWorker('info', 'Image-to-Video initialized in MOCK MODE', {
          worker: 'image-to-video',
          adapter: 'mock',
          message: 'Using sample video URLs',
        });
        break;
    }
  }

  /**
   * Polls for job completion with exponential backoff
   * @param jobId - The job ID to poll
   * @param maxDuration - Maximum polling duration in milliseconds (default: 5 minutes)
   * @returns Completed job with video URL
   */
  private async pollUntilComplete(
    jobId: string,
    maxDuration: number = 5 * 60 * 1000
  ): Promise<VideoGenerationJob> {
    const startTime = Date.now();
    let pollInterval = 5000; // Start with 5 seconds
    const maxPollInterval = 30000; // Max 30 seconds between polls

    while (Date.now() - startTime < maxDuration) {
      const job = await this.adapter.pollJobStatus(jobId);

      if (job.status === 'completed') {
        if (!job.videoUrl) {
          throw new Error('Job completed but no video URL provided');
        }
        return job;
      }

      if (job.status === 'failed') {
        throw new Error(`Video generation failed: ${job.error || 'Unknown error'}`);
      }

      // Wait before next poll with exponential backoff
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
    }

    throw new Error(`Video generation timeout after ${maxDuration / 1000} seconds`);
  }

  /**
   * Executes the Image-to-Video worker
   * Generates video from image, uploads to Media Library, and triggers callback
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    logWorker('info', 'Image-to-Video worker execution started', {
      worker: 'image-to-video',
      runId,
      nodeId,
    });

    try {
      // Extract userId dynamically from input for multi-user support
      const userId = input?.user_id || process.env.STITCH_WORKER_USER_ID;
      if (!userId) {
        throw new Error('user_id is required in input for Media Library ownership');
      }

      // Extract required inputs
      const imageUrl = input?.image_url || input?.url;
      const imageId = input?.image_id || input?.wireframe_id || input?.media_id;
      const motionPrompt = input?.motion_prompt || config.motion_prompt || 'smooth camera movement';
      const duration = input?.duration_seconds || config.duration || 5;

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('No valid image_url provided in input');
      }

      logWorker('info', 'Initiating video generation', {
        worker: 'image-to-video',
        runId,
        nodeId,
        imageUrl,
        motionPrompt,
        duration,
      });

      // Initiate video generation
      const jobId = await this.adapter.generateVideo(imageUrl, motionPrompt, {
        duration,
        ...config,
      });

      logWorker('info', 'Video generation job created, polling for completion', {
        worker: 'image-to-video',
        runId,
        nodeId,
        jobId,
      });

      // Poll until completion (max 5 minutes)
      const maxPollingDuration = config.maxPollingDuration || 5 * 60 * 1000;
      const completedJob = await this.pollUntilComplete(jobId, maxPollingDuration);

      logWorker('info', 'Video generation completed, uploading to Media Library', {
        worker: 'image-to-video',
        runId,
        nodeId,
        videoUrl: completedJob.videoUrl,
      });

      // Upload to Media Library
      const filename = `video_${Date.now()}.mp4`;
      const tags = ['video', 'ai-generated', 'image-to-video'];
      const metadata = {
        motion_prompt: motionPrompt,
        duration_seconds: duration,
        model: config.model || process.env.VIDEO_GENERATION_ADAPTER || 'mock',
        generated_by: 'image-to-video',
        generation_config: config,
        source_job_id: jobId,
      };

      const mediaAsset = await uploadFromUrl(
        completedJob.videoUrl!,
        filename,
        'video',
        metadata,
        tags,
        userId
      );

      // Update the media record to set source_image_id if provided
      if (imageId) {
        const { getAdminClient } = await import('@/lib/supabase/client');
        const adminClient = getAdminClient();
        
        await adminClient
          .from('stitch_media')
          .update({ source_image_id: imageId })
          .eq('id', mediaAsset.id);
        
        logWorker('info', 'Updated video with source image reference', {
          worker: 'image-to-video',
          runId,
          nodeId,
          videoId: mediaAsset.id,
          sourceImageId: imageId,
        });
      }

      const totalDuration = Date.now() - startTime;
      logWorker('info', 'Image-to-Video worker completed successfully', {
        worker: 'image-to-video',
        runId,
        nodeId,
        videoId: mediaAsset.id,
        duration: totalDuration,
      });

      // Trigger success callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: {
          video_id: mediaAsset.id,
          url: mediaAsset.url,
          duration_seconds: duration,
        },
      });

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Import error utilities
      const { extractErrorContext, categorizeError } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'Image-to-Video worker failed', {
        worker: 'image-to-video',
        runId,
        nodeId,
        error: errorMessage,
        ...errorContext,
        duration: totalDuration,
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
        logWorker('error', 'Failed to trigger failure callback for Image-to-Video worker', {
          worker: 'image-to-video',
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
