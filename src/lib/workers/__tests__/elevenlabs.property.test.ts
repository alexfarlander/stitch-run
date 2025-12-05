/**
 * Property-based tests for ElevenLabs worker
 */

// beforeEach import removed as unused
import * as fc from 'fast-check';
import { ElevenLabsWorker } from '../elevenlabs';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  })),
}));

describe('ElevenLabs Worker - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_BASE_URL: 'https://test.example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      ELEVENLABS_API_KEY: 'test-elevenlabs-key',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Feature: worker-integrations, Property 10: Storage upload and URL retrieval
  it('Property 10: Storage upload and URL retrieval - for any successful ElevenLabs execution, audio should be uploaded and URL returned', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.webUrl(),
        async (runId, nodeId, voiceText, voiceId, expectedUrl) => {
          // Mock audio data
          const mockAudioBuffer = new ArrayBuffer(1024);

          // Mock ElevenLabs API response
          global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('elevenlabs.io')) {
              return Promise.resolve({
                ok: true,
                status: 200,
                arrayBuffer: () => Promise.resolve(mockAudioBuffer),
              });
            }
            // Mock callback
            return Promise.resolve({
              ok: true,
              status: 200,
            });
          }) as unknown;

          // Mock Supabase storage
          const { createServerClient } = await import('@/lib/supabase/server');
          const mockUpload = vi.fn().mockResolvedValue({
            data: { path: `${runId}/${nodeId}/test.mp3` },
            error: null,
          });
          const mockGetPublicUrl = vi.fn().mockReturnValue({
            data: { publicUrl: expectedUrl },
          });

          (createServerClient as Mock).mockReturnValue({
            storage: {
              from: vi.fn(() => ({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl,
              })),
            },
          });

          const worker = new ElevenLabsWorker();
          await worker.execute(runId, nodeId, { voiceId }, { voice_text: voiceText });

          // Verify upload was called with audio buffer
          expect(mockUpload).toHaveBeenCalled();
          const uploadCall = mockUpload.mock.calls[0];
          // Escape special regex characters in runId and nodeId
          const escapedRunId = runId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          expect(uploadCall[0]).toMatch(new RegExp(`^${escapedRunId}/${escapedNodeId}/`)); // fileName pattern
          expect(uploadCall[1]).toBeInstanceOf(ArrayBuffer);
          expect(uploadCall[2]).toMatchObject({
            contentType: 'audio/mpeg',
            upsert: false,
          });

          // Verify getPublicUrl was called
          expect(mockGetPublicUrl).toHaveBeenCalled();

          // Verify callback was called with completed status and audio URL
          const fetchCalls = (global.fetch as Mock).mock.calls;
          const callbackCall = fetchCalls.find(call => call[0].includes('/api/stitch/callback/'));
          expect(callbackCall).toBeDefined();

          const callbackPayload = JSON.parse(callbackCall[1].body);
          expect(callbackPayload.status).toBe('completed');
          expect(callbackPayload.output).toBeDefined();
          expect(callbackPayload.output.audioUrl).toBe(expectedUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test upload failure handling
  it('Property 10 (edge case): Upload failures should trigger failed callback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1 }),
        async (runId, nodeId, voiceText, voiceId, errorMessage) => {
          // Mock audio data
          const mockAudioBuffer = new ArrayBuffer(1024);

          // Mock ElevenLabs API response
          global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('elevenlabs.io')) {
              return Promise.resolve({
                ok: true,
                status: 200,
                arrayBuffer: () => Promise.resolve(mockAudioBuffer),
              });
            }
            // Mock callback
            return Promise.resolve({
              ok: true,
              status: 200,
            });
          }) as unknown;

          // Mock Supabase storage with upload failure
          const { createServerClient } = await import('@/lib/supabase/server');
          const mockUpload = vi.fn().mockResolvedValue({
            data: null,
            error: { message: errorMessage },
          });

          (createServerClient as Mock).mockReturnValue({
            storage: {
              from: vi.fn(() => ({
                upload: mockUpload,
              })),
            },
          });

          const worker = new ElevenLabsWorker();
          await worker.execute(runId, nodeId, { voiceId }, { voice_text: voiceText });

          // Verify callback was called with failed status
          const fetchCalls = (global.fetch as Mock).mock.calls;
          const callbackCall = fetchCalls.find(call => call[0].includes('/api/stitch/callback/'));
          expect(callbackCall).toBeDefined();

          const callbackPayload = JSON.parse(callbackCall[1].body);
          expect(callbackPayload.status).toBe('failed');
          expect(callbackPayload.error).toBeDefined();
          expect(typeof callbackPayload.error).toBe('string');
          expect(callbackPayload.error).toContain('upload');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test URL retrieval failure handling
  it('Property 10 (edge case): URL retrieval failures should trigger failed callback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (runId, nodeId, voiceText, voiceId) => {
          // Mock audio data
          const mockAudioBuffer = new ArrayBuffer(1024);

          // Mock ElevenLabs API response
          global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('elevenlabs.io')) {
              return Promise.resolve({
                ok: true,
                status: 200,
                arrayBuffer: () => Promise.resolve(mockAudioBuffer),
              });
            }
            // Mock callback
            return Promise.resolve({
              ok: true,
              status: 200,
            });
          }) as unknown;

          // Mock Supabase storage with successful upload but failed URL retrieval
          const { createServerClient } = await import('@/lib/supabase/server');
          const mockUpload = vi.fn().mockResolvedValue({
            data: { path: `${runId}/${nodeId}/test.mp3` },
            error: null,
          });
          const mockGetPublicUrl = vi.fn().mockReturnValue({
            data: { publicUrl: null }, // URL retrieval fails
          });

          (createServerClient as Mock).mockReturnValue({
            storage: {
              from: vi.fn(() => ({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl,
              })),
            },
          });

          const worker = new ElevenLabsWorker();
          await worker.execute(runId, nodeId, { voiceId }, { voice_text: voiceText });

          // Verify callback was called with failed status
          const fetchCalls = (global.fetch as Mock).mock.calls;
          const callbackCall = fetchCalls.find(call => call[0].includes('/api/stitch/callback/'));
          expect(callbackCall).toBeDefined();

          const callbackPayload = JSON.parse(callbackCall[1].body);
          expect(callbackPayload.status).toBe('failed');
          expect(callbackPayload.error).toBeDefined();
          expect(typeof callbackPayload.error).toBe('string');
          expect(callbackPayload.error).toContain('public URL');
        }
      ),
      { numRuns: 100 }
    );
  });
});
