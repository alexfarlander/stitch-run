/**
 * Tests for worker testing infrastructure
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  testWorker,
  createMockWorker,
  checkApiKey,
  getRequiredEnvVars,
  testAllWorkers,
} from '../testing';

describe('Worker Testing Infrastructure', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe('checkApiKey', () => {
    it('should return false when API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(checkApiKey('claude')).toBe(false);
    });

    it('should return true when API key is present', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      expect(checkApiKey('claude')).toBe(true);
    });

    it('should check both API key and group ID for minimax', () => {
      // Clear both env vars first
      delete process.env.MINIMAX_API_KEY;
      delete process.env.MINIMAX_GROUP_ID;
      
      process.env.MINIMAX_API_KEY = 'test-key';
      expect(checkApiKey('minimax')).toBe(false); // Missing group ID

      process.env.MINIMAX_GROUP_ID = 'test-group';
      expect(checkApiKey('minimax')).toBe(true);
    });
  });

  describe('getRequiredEnvVars', () => {
    it('should return correct env vars for claude', () => {
      const vars = getRequiredEnvVars('claude');
      expect(vars).toEqual(['ANTHROPIC_API_KEY']);
    });

    it('should return correct env vars for minimax', () => {
      const vars = getRequiredEnvVars('minimax');
      expect(vars).toEqual(['MINIMAX_API_KEY', 'MINIMAX_GROUP_ID']);
    });

    it('should return correct env vars for elevenlabs', () => {
      const vars = getRequiredEnvVars('elevenlabs');
      expect(vars).toEqual(['ELEVENLABS_API_KEY']);
    });

    it('should return correct env vars for shotstack', () => {
      const vars = getRequiredEnvVars('shotstack');
      expect(vars).toEqual(['SHOTSTACK_API_KEY']);
    });
  });

  describe('createMockWorker', () => {
    it('should create a mock worker instance', () => {
      const mockWorker = createMockWorker('claude');
      expect(mockWorker).toBeDefined();
      expect(typeof mockWorker.execute).toBe('function');
    });
  });

  describe('testWorker', () => {
    it('should fail when API key is missing and not in mock mode', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const result = await testWorker({
        workerName: 'claude',
        mockMode: false,
        testInput: { prompt: 'test' },
      });

      expect(result.success).toBe(false);
      expect(result.apiKeyPresent).toBe(false);
      expect(result.error).toContain('Missing required environment variables');
    });

    it('should succeed in mock mode without API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const result = await testWorker({
        workerName: 'claude',
        mockMode: true,
        testInput: { prompt: 'test' },
      });

      expect(result.success).toBe(true);
      expect(result.apiKeyPresent).toBe(false);
      expect(result.callbackReceived).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should generate appropriate mock output for claude', async () => {
      const result = await testWorker({
        workerName: 'claude',
        mockMode: true,
        testInput: { prompt: 'test' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('scenes');
      expect(Array.isArray(result.output.scenes)).toBe(true);
      expect(result.output.scenes.length).toBeGreaterThan(0);
      expect(result.output.scenes[0]).toHaveProperty('visual_prompt');
      expect(result.output.scenes[0]).toHaveProperty('voice_text');
    });

    it('should generate appropriate mock output for minimax', async () => {
      const result = await testWorker({
        workerName: 'minimax',
        mockMode: true,
        testInput: { visual_prompt: 'test scene' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('videoUrl');
      expect(result.output.videoUrl).toContain('mock-video-url');
    });

    it('should generate appropriate mock output for elevenlabs', async () => {
      const result = await testWorker({
        workerName: 'elevenlabs',
        mockMode: true,
        testInput: { voice_text: 'test narration' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('audioUrl');
      expect(result.output.audioUrl).toContain('mock-audio-url');
    });

    it('should generate appropriate mock output for shotstack', async () => {
      const result = await testWorker({
        workerName: 'shotstack',
        mockMode: true,
        testInput: {
          scenes: [
            {
              visual_prompt: 'test',
              voice_text: 'test',
              videoUrl: 'https://example.com/video.mp4',
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('videoUrl');
      expect(result.output).toHaveProperty('renderId');
    });

    it('should track execution duration', async () => {
      const result = await testWorker({
        workerName: 'claude',
        mockMode: true,
        testInput: { prompt: 'test' },
      });

      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('testAllWorkers', () => {
    it('should test all workers in mock mode', async () => {
      const results = await testAllWorkers(true);

      expect(results).toHaveProperty('claude');
      expect(results).toHaveProperty('minimax');
      expect(results).toHaveProperty('elevenlabs');
      expect(results).toHaveProperty('shotstack');

      // All should succeed in mock mode
      expect(results.claude.success).toBe(true);
      expect(results.minimax.success).toBe(true);
      expect(results.elevenlabs.success).toBe(true);
      expect(results.shotstack.success).toBe(true);
    });

    it('should provide appropriate test inputs for each worker', async () => {
      const results = await testAllWorkers(true);

      // Claude should output scenes
      expect(results.claude.output).toHaveProperty('scenes');

      // Minimax should output videoUrl
      expect(results.minimax.output).toHaveProperty('videoUrl');

      // ElevenLabs should output audioUrl
      expect(results.elevenlabs.output).toHaveProperty('audioUrl');

      // Shotstack should output videoUrl and renderId
      expect(results.shotstack.output).toHaveProperty('videoUrl');
      expect(results.shotstack.output).toHaveProperty('renderId');
    });
  });
});
