/**
 * Media Library Worker Tests
 * Tests the various input formats the worker needs to handle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaLibraryWorker } from '../media-library';

// Mock the media service
vi.mock('@/lib/media/media-service', () => ({
  getMedia: vi.fn((id: string) => Promise.resolve({
    id,
    name: `Asset ${id}`,
    media_type: 'wireframe',
    url: `https://example.com/${id}`,
    storage_path: `path/${id}`,
    metadata: {},
    tags: [],
    user_id: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  listMedia: vi.fn(() => Promise.resolve([])),
}));

// Mock the utils
vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();
  return {
    ...actual,
    triggerCallback: vi.fn(),
    logWorker: vi.fn(),
  };
});

describe('MediaLibraryWorker', () => {
  let worker: MediaLibraryWorker;
  const mockRunId = 'test-run-id';
  const mockNodeId = 'test-node-id';
  const mockConfig = { operation: 'load-metadata' };

  beforeEach(() => {
    worker = new MediaLibraryWorker();
    vi.clearAllMocks();
  });

  it('should handle raw array input (Case A)', async () => {
    const input = [
      { media_id: 'asset-1' },
      { media_id: 'asset-2' },
    ];

    await worker.execute(mockRunId, mockNodeId, mockConfig, input);

    const { triggerCallback } = await import('../utils');
    expect(triggerCallback).toHaveBeenCalledWith(
      mockRunId,
      mockNodeId,
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          wireframes: expect.arrayContaining([
            expect.objectContaining({ id: 'asset-1' }),
            expect.objectContaining({ id: 'asset-2' }),
          ]),
          count: 2,
        }),
      })
    );
  });

  it('should handle wireframes property input (Case B)', async () => {
    const input = {
      wireframes: [
        { media_id: 'asset-1' },
        { media_id: 'asset-2' },
      ],
    };

    await worker.execute(mockRunId, mockNodeId, mockConfig, input);

    const { triggerCallback } = await import('../utils');
    expect(triggerCallback).toHaveBeenCalledWith(
      mockRunId,
      mockNodeId,
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          wireframes: expect.arrayContaining([
            expect.objectContaining({ id: 'asset-1' }),
            expect.objectContaining({ id: 'asset-2' }),
          ]),
          count: 2,
        }),
      })
    );
  });

  it('should handle node-keyed array input (Case C)', async () => {
    const input = {
      'select-wireframes': [
        { media_id: 'asset-1' },
        { media_id: 'asset-2' },
      ],
    };

    await worker.execute(mockRunId, mockNodeId, mockConfig, input);

    const { triggerCallback } = await import('../utils');
    expect(triggerCallback).toHaveBeenCalledWith(
      mockRunId,
      mockNodeId,
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          wireframes: expect.arrayContaining([
            expect.objectContaining({ id: 'asset-1' }),
            expect.objectContaining({ id: 'asset-2' }),
          ]),
          count: 2,
        }),
      })
    );
  });

  it('should handle single item input (Case D)', async () => {
    const input = {
      media_id: 'asset-1',
    };

    await worker.execute(mockRunId, mockNodeId, mockConfig, input);

    const { triggerCallback } = await import('../utils');
    expect(triggerCallback).toHaveBeenCalledWith(
      mockRunId,
      mockNodeId,
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          id: 'asset-1',
        }),
      })
    );
  });

  it('should handle items with id instead of media_id', async () => {
    const input = [
      { id: 'asset-1' },
      { id: 'asset-2' },
    ];

    await worker.execute(mockRunId, mockNodeId, mockConfig, input);

    const { triggerCallback } = await import('../utils');
    expect(triggerCallback).toHaveBeenCalledWith(
      mockRunId,
      mockNodeId,
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({
          count: 2,
        }),
      })
    );
  });

  it('should throw error for invalid input', async () => {
    const input = {
      someOtherProperty: 'value',
    };

    await worker.execute(mockRunId, mockNodeId, mockConfig, input);

    const { triggerCallback } = await import('../utils');
    expect(triggerCallback).toHaveBeenCalledWith(
      mockRunId,
      mockNodeId,
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('No valid media IDs found'),
      })
    );
  });
});
