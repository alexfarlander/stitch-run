/**
 * ElevenLabs Worker
 * Pseudo-asynchronous worker that uses ElevenLabs API to generate voice narration
 * Performs async operations internally but completes within a single request cycle
 */

import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { getConfig } from '@/lib/config';
import { triggerCallback, logWorker } from './utils';
import { createServerClient } from '@/lib/supabase/server';

/**
 * ElevenLabs worker implementation
 * Generates voice narration from text and uploads to Supabase Storage
 */
export class ElevenLabsWorker implements IWorker {
  private apiKey: string | null = null;
  private mockMode: boolean = false;

  constructor() {
    const _config = getConfig();
    
    if (!config.workers.elevenlabsApiKey) {
      this.mockMode = true;
      logWorker('warn', 'ElevenLabs worker initialized in MOCK MODE', {
        worker: 'elevenlabs',
        reason: 'ELEVENLABS_API_KEY environment variable is not set',
        message: 'Worker will return mock audio URLs instead of calling the API',
      });
    } else {
      this.apiKey = config.workers.elevenlabsApiKey;
      logWorker('info', 'ElevenLabs worker initialized successfully', {
        worker: 'elevenlabs',
        apiKeyPresent: true,
      });
    }
  }

  /**
   * Executes the ElevenLabs worker
   * Calls TTS API, uploads audio to storage, and triggers callback with URL
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: unknown
  ): Promise<void> {
    const _startTime = Date.now();

    logWorker('info', 'ElevenLabs worker execution started', {
      worker: 'elevenlabs',
      runId,
      nodeId,
    });

    try {
      // Extract voice_text from input
      const voiceText = input?.voice_text || input?.voiceText;

      if (!voiceText) {
        throw new Error('No voice_text provided in input');
      }

      // Handle mock mode
      if (this.mockMode) {
        logWorker('info', 'ElevenLabs worker running in MOCK MODE', {
          worker: 'elevenlabs',
          runId,
          nodeId,
          message: 'Returning mock audio URL',
        });

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockAudioUrl = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';

        const duration = Date.now() - startTime;
        logWorker('info', 'ElevenLabs worker completed successfully (MOCK MODE)', {
          worker: 'elevenlabs',
          runId,
          nodeId,
          audioUrl: mockAudioUrl,
          duration,
        });

        await triggerCallback(runId, nodeId, {
          status: 'completed',
          output: {
            ...input,
            audioUrl: mockAudioUrl,
          },
        });

        return;
      }

      // Extract configuration with defaults
      const voiceId = config.voiceId;
      if (!voiceId) {
        throw new Error('voiceId is required in node config');
      }

      const modelId = config.modelId || 'eleven_multilingual_v2';

      logWorker('info', 'Calling ElevenLabs TTS API', {
        worker: 'elevenlabs',
        runId,
        nodeId,
        voiceId,
        modelId,
        textLength: voiceText.length,
      });

      // Call ElevenLabs TTS API
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey!,
          },
          body: JSON.stringify({
            text: voiceText,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API request failed with status ${response.status}: ${errorText}`);
      }

      logWorker('info', 'ElevenLabs API response received', {
        worker: 'elevenlabs',
        runId,
        nodeId,
        status: response.status,
      });

      // Receive audio data as ArrayBuffer
      const audioBuffer = await response.arrayBuffer();

      logWorker('info', 'Audio data received, uploading to Supabase Storage', {
        worker: 'elevenlabs',
        runId,
        nodeId,
        audioSize: audioBuffer.byteLength,
      });

      // Upload ArrayBuffer to Supabase Storage
      const _supabase = createServerClient();
      const fileName = `${runId}/${nodeId}/${Date.now()}.mp3`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stitch-assets')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload audio to Supabase Storage: ${uploadError.message}`);
      }

      logWorker('info', 'Audio uploaded to Supabase Storage', {
        worker: 'elevenlabs',
        runId,
        nodeId,
        path: uploadData.path,
      });

      // Retrieve public URL from Supabase
      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to retrieve public URL from Supabase Storage');
      }

      const audioUrl = urlData.publicUrl;

      const duration = Date.now() - startTime;
      logWorker('info', 'ElevenLabs worker completed successfully', {
        worker: 'elevenlabs',
        runId,
        nodeId,
        audioUrl,
        duration,
      });

      // Trigger success callback with audio URL
      // Pass through original input so downstream nodes have access to all data
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: {
          ...input, // Pass through everything (visual_prompt, voice_text, videoUrl, etc.)
          audioUrl, // Add the new audio URL
        },
      });

    } catch (_error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Import error utilities
      const { extractErrorContext, categorizeError } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'ElevenLabs worker failed', {
        worker: 'elevenlabs',
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
        logWorker('error', 'Failed to trigger failure callback for ElevenLabs worker', {
          worker: 'elevenlabs',
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
