/**
 * Worker Registry
 * Centralized mapping system that associates worker types with their implementations
 * and provides schema definitions for validation and edge mapping
 */

import { IWorker } from './base';
import { WorkerDefinition } from '@/types/worker-definition';

/**
 * Worker Registry interface
 */
export interface IWorkerRegistry {
  /**
   * Registers a worker type with its implementation
   * @param type - The worker type identifier
   * @param workerClass - The worker class constructor
   */
  register(type: string, workerClass: new () => IWorker): void;
  
  /**
   * Retrieves a worker instance for a given type
   * @param type - The worker type identifier
   * @returns Worker instance
   * @throws Error if type is not registered
   */
  getWorker(type: string): IWorker;
  
  /**
   * Checks if a worker type is registered
   * @param type - The worker type identifier
   * @returns true if registered, false otherwise
   */
  hasWorker(type: string): boolean;
}

/**
 * Worker Registry implementation
 * Singleton pattern for global registry access
 */
export class WorkerRegistry implements IWorkerRegistry {
  private static instance: WorkerRegistry;
  private workers: Map<string, new () => IWorker>;

  private constructor() {
    this.workers = new Map();
  }

  /**
   * Gets the singleton instance of the registry
   */
  public static getInstance(): WorkerRegistry {
    if (!WorkerRegistry.instance) {
      WorkerRegistry.instance = new WorkerRegistry();
    }
    return WorkerRegistry.instance;
  }

  /**
   * Registers a worker type with its implementation
   */
  public register(type: string, workerClass: new () => IWorker): void {
    this.workers.set(type, workerClass);
  }

  /**
   * Retrieves a worker instance for a given type
   * @throws Error if type is not registered
   */
  public getWorker(type: string): IWorker {
    const WorkerClass = this.workers.get(type);
    if (!WorkerClass) {
      throw new Error(`Worker type "${type}" is not registered`);
    }
    return new WorkerClass();
  }

  /**
   * Checks if a worker type is registered
   */
  public hasWorker(type: string): boolean {
    return this.workers.has(type);
  }
}

/**
 * Global registry instance
 */
export const workerRegistry = WorkerRegistry.getInstance();

// ============================================================================
// Worker Definitions (Schema Registry)
// ============================================================================

/**
 * Worker definitions registry
 * Defines input/output schemas and configuration for each worker type
 * Used for validation, edge mapping, and UI generation
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export const WORKER_DEFINITIONS: Record<string, WorkerDefinition> = {
  claude: {
    id: 'claude',
    name: 'Claude Script Generator',
    type: 'sync',
    description: 'Generate structured scene descriptions using Claude AI for video production pipelines',
    input: {
      prompt: {
        type: 'string',
        required: true,
        description: 'The prompt to send to Claude for script generation'
      },
      topic: {
        type: 'string',
        required: false,
        description: 'Optional topic for script generation context'
      }
    },
    output: {
      scenes: {
        type: 'array',
        description: 'Array of scene objects with visual_prompt and voice_text properties'
      }
    },
    config: {
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096
    }
  },

  minimax: {
    id: 'minimax',
    name: 'MiniMax Video Generator',
    type: 'async',
    description: 'Generate video clips from text prompts using MiniMax AI video generation',
    input: {
      visual_prompt: {
        type: 'string',
        required: true,
        description: 'Visual description for video generation (photorealistic, cinematic)'
      },
      visualPrompt: {
        type: 'string',
        required: false,
        description: 'Alternative field name for visual_prompt (for compatibility)'
      },
      duration: {
        type: 'number',
        required: false,
        description: 'Video duration in seconds',
        default: 5
      }
    },
    output: {
      videoUrl: {
        type: 'string',
        description: 'URL to the generated video file'
      }
    },
    config: {
      model: 'video-01',
      endpoint: 'https://api.minimax.io/v1/video/generate'
    }
  },

  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs Voice Generator',
    type: 'async',
    description: 'Generate voice narration from text using ElevenLabs text-to-speech API',
    input: {
      voice_text: {
        type: 'string',
        required: true,
        description: 'Text to convert to speech narration'
      },
      voiceText: {
        type: 'string',
        required: false,
        description: 'Alternative field name for voice_text (for compatibility)'
      },
      voice_id: {
        type: 'string',
        required: false,
        description: 'ElevenLabs voice ID to use for generation'
      }
    },
    output: {
      audioUrl: {
        type: 'string',
        description: 'URL to the generated audio file'
      }
    },
    config: {
      modelId: 'eleven_multilingual_v2',
      endpoint: 'https://api.elevenlabs.io/v1/text-to-speech'
    }
  },

  shotstack: {
    id: 'shotstack',
    name: 'Shotstack Video Assembler',
    type: 'async',
    description: 'Assemble multiple video and audio clips into a final composed video',
    input: {
      scenes: {
        type: 'array',
        required: true,
        description: 'Array of scene objects with videoUrl and audioUrl properties'
      },
      timeline: {
        type: 'object',
        required: false,
        description: 'Optional Shotstack timeline configuration (overrides scenes)'
      }
    },
    output: {
      finalVideoUrl: {
        type: 'string',
        description: 'URL to the final assembled video'
      },
      duration: {
        type: 'number',
        description: 'Total duration of the final video in seconds'
      }
    },
    config: {
      resolution: 'sd',
      format: 'mp4',
      fps: 25,
      endpoint: 'https://api.shotstack.io/v1/render'
    }
  }
};

/**
 * Get worker definition by ID
 * Helper function to retrieve worker schema definitions
 * 
 * @param workerId - The worker type identifier
 * @returns Worker definition or undefined if not found
 */
export function getWorkerDefinition(workerId: string): WorkerDefinition | undefined {
  return WORKER_DEFINITIONS[workerId];
}

/**
 * Check if a worker type is valid
 * 
 * @param workerId - The worker type identifier
 * @returns true if the worker type exists in the registry
 */
export function isValidWorkerType(workerId: string): boolean {
  return workerId in WORKER_DEFINITIONS;
}

/**
 * Get all available worker IDs
 * 
 * @returns Array of all registered worker type identifiers
 */
export function getAvailableWorkerTypes(): string[] {
  return Object.keys(WORKER_DEFINITIONS);
}
