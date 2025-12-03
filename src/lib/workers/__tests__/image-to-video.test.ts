/**
 * Image-to-Video Worker Tests
 * Basic unit tests for the Image-to-Video worker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageToVideoWorker } from '../image-to-video';

// Mock dependencies
vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(() => ({
    baseUrl: 'http://localhost:3000',
  })),
}));

vi.mock('../utils', () => ({
  triggerCallback: vi.fn(),
  logWorker: vi.fn(),
}));

vi.mock('@/lib/media/media-service', () => ({
  uploadFromUrl: vi.fn(async (url, name, type) => ({
    id: 'test-video-id',
    name,
    media_type: type,
    url: 'https://example.com/video.mp4',
    storage_path: 'test/path/video.mp4',
    metadata: {},
    tags: [],
    user_id: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
}));

vi.mock('@/lib/supabase/client', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}));

describe('ImageToVideoWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set mock adapter
    process.env.VIDEO_GENERATION_ADAPTER = 'mock';
  });

  it('should instantiate successfully with mock adapter', () => {
    expect(() => new ImageToVideoWorker()).not.toThrow();
  });

  it('should execute successfully with valid input', async () => {
    const worker = new ImageToVideoWorker();
    const { triggerCallback } = await import('../utils');

    await worker.execute(
      'test-run-id',
      'test-node-id',
      { motion_prompt: 'smooth pan' },
      {
        user_id: 'test-user-id',
        image_url: 'https://example.com/image.png',
        image_id: 'test-image-id',
        motion_prompt: 'camera zoom',
        duration_seconds: 5,
      }
    );

    // Verify success callback was triggered
    expect(triggerCallback).toHaveBeenCalledWith(
      'test-run-id',
      'test-node-id',
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          video_id: 'test-video-id',
          url: expect.any(String),
          duration_seconds: 5,
        }),
      })
    );
  });

  it('should handle missing image_url gracefully', async () => {
    const worker = new ImageToVideoWorker();
    const { triggerCallback } = await import('../utils');

    await worker.execute(
      'test-run-id',
      'test-node-id',
      {},
      { user_id: 'test-user-id' } // Missing image_url
    );

    // Verify failure callback was triggered
    expect(triggerCallback).toHaveBeenCalledWith(
      'test-run-id',
      'test-node-id',
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('image_url'),
      })
    );
  });

  it('should use motion_prompt from config if not in input', async () => {
    const worker = new ImageToVideoWorker();
    const { uploadFromUrl } = await import('@/lib/media/media-service');

    await worker.execute(
      'test-run-id',
      'test-node-id',
      { motion_prompt: 'config prompt' },
      {
        user_id: 'test-user-id',
        image_url: 'https://example.com/image.png',
      }
    );

    // Verify uploadFromUrl was called with metadata containing the config prompt
    expect(uploadFromUrl).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'video',
      expect.objectContaining({
        motion_prompt: 'config prompt',
      }),
      expect.any(Array),
      expect.any(String)
    );
  });

  it('should throw error if Runway adapter is selected without API key', () => {
    process.env.VIDEO_GENERATION_ADAPTER = 'runway';
    delete process.env.RUNWAY_API_KEY;

    expect(() => new ImageToVideoWorker()).toThrow('RUNWAY_API_KEY');
  });

  it('should throw error if Pika adapter is selected without API key', () => {
    process.env.VIDEO_GENERATION_ADAPTER = 'pika';
    delete process.env.PIKA_API_KEY;

    expect(() => new ImageToVideoWorker()).toThrow('PIKA_API_KEY');
  });

  it('should throw error if Kling adapter is selected without API key', () => {
    process.env.VIDEO_GENERATION_ADAPTER = 'kling';
    delete process.env.KLING_API_KEY;

    expect(() => new ImageToVideoWorker()).toThrow('KLING_API_KEY');
  });
});
