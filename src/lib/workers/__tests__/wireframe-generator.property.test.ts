/**
 * Property-based tests for Wireframe Generator worker
 * Feature: media-library, Property 17: Worker completion creates media library entry (wireframe)
 * Validates: Requirements 8.1
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import * as fc from 'fast-check';
import { WireframeGeneratorWorker } from '../wireframe-generator';
import * as mediaService from '@/lib/media/media-service';

// Mock the media service
vi.mock('@/lib/media/media-service');

// Mock the config
vi.mock('@/lib/config', () => ({
  getConfig: () => ({
    baseUrl: 'https://test.example.com',
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-role-key',
    },
    workers: {},
  }),
}));

describe('Wireframe Generator Worker - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_BASE_URL: 'https://test.example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      IMAGE_GENERATION_ADAPTER: 'mock',
      STITCH_WORKER_USER_ID: '550e8400-e29b-41d4-a716-446655440000',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Feature: media-library, Property 17: Worker completion creates media library entry (wireframe)
   * For any content-generating worker (wireframe, video, audio) that completes successfully, 
   * a corresponding media record should exist in the stitch_media table
   * Validates: Requirements 8.1
   */
  it('Property 17: Worker completion creates media library entry (wireframe)', async () => {
    // Generator for valid scene descriptions
    const sceneDescriptionArbitrary = fc.string({ minLength: 10, maxLength: 500 })
      .filter(s => s.trim().length > 0);

    // Generator for scene indices
    const sceneIndexArbitrary = fc.nat({ max: 100 });

    // Generator for project names
    const projectNameArbitrary = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0 && !s.includes('/'));

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        sceneDescriptionArbitrary,
        sceneIndexArbitrary,
        projectNameArbitrary,
        async (runId, nodeId, sceneDescription, sceneIndex, projectName) => {
          // Mock uploadFromUrl to return a media asset
          const mockMediaAsset = {
            id: fc.sample(fc.uuid(), 1)[0],
            name: `${projectName}_scene_${sceneIndex}.png`,
            media_type: 'wireframe' as const,
            storage_path: `test-user/wireframe/123_${projectName}_scene_${sceneIndex}.png`,
            url: 'https://test.supabase.co/storage/v1/object/public/stitch-assets/test.png',
            thumbnail_url: null,
            file_size: 1024000,
            mime_type: 'image/png',
            dimensions: { width: 1024, height: 1024 },
            metadata: {
              scene_index: sceneIndex,
              prompt: sceneDescription,
              project_name: projectName,
              generated_by: 'wireframe-generator',
            },
            tags: ['wireframe', 'ai-generated', projectName],
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          (mediaService.uploadFromUrl as Mock).mockResolvedValue(mockMediaAsset);

          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as any;

          const worker = new WireframeGeneratorWorker();
          await worker.execute(runId, nodeId, {}, {
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            scene_description: sceneDescription,
            scene_index: sceneIndex,
            project_name: projectName,
          });

          // Verify uploadFromUrl was called (media library entry created)
          expect(mediaService.uploadFromUrl).toHaveBeenCalled();
          const uploadCall = (mediaService.uploadFromUrl as Mock).mock.calls[0];

          // Verify the upload parameters
          expect(uploadCall[0]).toBe('https://via.placeholder.com/1024x1024.png?text=Wireframe'); // Mock image URL
          expect(uploadCall[1]).toContain('scene'); // Filename contains 'scene'
          expect(uploadCall[2]).toBe('wireframe'); // Media type is 'wireframe'
          expect(uploadCall[3]).toBeDefined(); // Metadata is provided
          expect(uploadCall[3].scene_index).toBeDefined();
          expect(typeof uploadCall[3].scene_index).toBe('number');
          expect(uploadCall[3].prompt).toBeDefined();
          expect(uploadCall[3].project_name).toBeDefined();
          expect(Array.isArray(uploadCall[4])).toBe(true); // Tags is an array
          expect(uploadCall[4]).toContain('wireframe');
          expect(uploadCall[4]).toContain('ai-generated');
          expect(uploadCall[5]).toBe('550e8400-e29b-41d4-a716-446655440000'); // User ID

          // Verify callback was called with completed status
          expect(global.fetch).toHaveBeenCalled();
          const fetchCall = (global.fetch as Mock).mock.calls[0];
          const callbackPayload = JSON.parse(fetchCall[1].body);

          expect(callbackPayload.status).toBe('completed');
          expect(callbackPayload.output).toBeDefined();
          expect(callbackPayload.output.wireframe_id).toBeDefined();
          expect(callbackPayload.output.url).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Missing scene_description should trigger failed callback
   */
  it('Property 17 (edge case): Missing scene_description should trigger failed callback', async () => {
    // Generator for invalid inputs (missing scene_description)
    const invalidInputArbitrary = fc.oneof(
      fc.constant({}),
      fc.record({ scene_index: fc.nat() }),
      fc.record({ project_name: fc.string() }),
      fc.constant(null),
      fc.constant(undefined)
    );

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        invalidInputArbitrary,
        async (runId, nodeId, invalidInput) => {
          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as any;

          const worker = new WireframeGeneratorWorker();
          await worker.execute(runId, nodeId, {}, invalidInput);

          // Verify callback was called with failed status
          expect(global.fetch).toHaveBeenCalled();
          const fetchCall = (global.fetch as Mock).mock.calls[0];
          const callbackPayload = JSON.parse(fetchCall[1].body);

          expect(callbackPayload.status).toBe('failed');
          expect(callbackPayload.error).toBeDefined();
          expect(typeof callbackPayload.error).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Missing scene_index should trigger failed callback
   */
  it('Property 17 (edge case): Missing scene_index should trigger failed callback', async () => {
    // Generator for inputs with scene_description but missing scene_index
    const invalidInputArbitrary = fc.record({
      scene_description: fc.string({ minLength: 10 }),
      project_name: fc.option(fc.string()),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        invalidInputArbitrary,
        async (runId, nodeId, invalidInput) => {
          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as any;

          const worker = new WireframeGeneratorWorker();
          await worker.execute(runId, nodeId, {}, invalidInput);

          // Verify callback was called with failed status
          expect(global.fetch).toHaveBeenCalled();
          const fetchCall = (global.fetch as Mock).mock.calls[0];
          const callbackPayload = JSON.parse(fetchCall[1].body);

          expect(callbackPayload.status).toBe('failed');
          expect(callbackPayload.error).toBeDefined();
          expect(callbackPayload.error).toContain('scene_index');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Upload failure should trigger failed callback
   */
  it('Property 17 (edge case): Upload failure should trigger failed callback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 10 }),
        fc.nat({ max: 100 }),
        fc.string({ minLength: 1 }),
        async (runId, nodeId, sceneDescription, sceneIndex, projectName) => {
          // Mock uploadFromUrl to throw an error
          (mediaService.uploadFromUrl as Mock).mockRejectedValue(
            new Error('Storage upload failed')
          );

          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as any;

          const worker = new WireframeGeneratorWorker();
          await worker.execute(runId, nodeId, {}, {
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            scene_description: sceneDescription,
            scene_index: sceneIndex,
            project_name: projectName,
          });

          // Verify callback was called with failed status
          expect(global.fetch).toHaveBeenCalled();
          const fetchCall = (global.fetch as Mock).mock.calls[0];
          const callbackPayload = JSON.parse(fetchCall[1].body);

          expect(callbackPayload.status).toBe('failed');
          expect(callbackPayload.error).toBeDefined();
          expect(callbackPayload.error).toContain('Storage upload failed');
        }
      ),
      { numRuns: 100 }
    );
  });
});
