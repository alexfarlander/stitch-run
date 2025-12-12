/**
 * Property-based tests for Shotstack worker
 */

// beforeEach import removed as unused
import * as fc from 'fast-check';
import { ShotstackWorker } from '../shotstack';
import { Scene } from '@/types/stitch';

describe('Shotstack Worker - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_BASE_URL: 'https://test.example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      SHOTSTACK_API_KEY: 'test-shotstack-key',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Feature: worker-integrations, Property 12: Clip timing calculation
  it('Property 12: Clip timing calculation - for any array of scenes with durations, start time should equal sum of previous durations', async () => {
    // Generator for scenes with explicit durations
    const sceneWithDurationArbitrary = fc.record({
      visual_prompt: fc.string({ minLength: 1 }),
      voice_text: fc.string({ minLength: 1 }),
      videoUrl: fc.webUrl(),
      audioUrl: fc.webUrl(),
      duration: fc.integer({ min: 1, max: 30 }), // 1-30 seconds
    });

    // Generator for scene arrays
    const scenesArbitrary = fc.array(sceneWithDurationArbitrary, { minLength: 1, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        scenesArbitrary,
        async (runId, nodeId, scenes) => {
          // Mock fetch for Shotstack API
          let capturedPayload: unknown = null;
          global.fetch = vi.fn().mockImplementation(async (url, options) => {
            if (typeof url === 'string' && url.includes('shotstack.io')) {
              capturedPayload = JSON.parse(options?.body as string);
              return {
                ok: true,
                status: 200,
                json: async () => ({ response: { id: 'test-render-id' } }),
              };
            }
            // Callback URL
            return {
              ok: true,
              status: 200,
            };
          }) as unknown;

          const worker = new ShotstackWorker();
          await worker.execute(runId, nodeId, {}, scenes);

          // Verify payload was captured
          expect(capturedPayload).toBeDefined();
          expect(capturedPayload.timeline).toBeDefined();
          expect(capturedPayload.timeline.tracks).toBeDefined();
          expect(Array.isArray(capturedPayload.timeline.tracks)).toBe(true);

          // Calculate expected start times
          const expectedStartTimes: number[] = [];
          let cumulativeTime = 0;
          for (const scene of scenes) {
            expectedStartTimes.push(cumulativeTime);
            cumulativeTime += scene.duration;
          }

          // Verify video track clips have correct start times
          const videoTrack = capturedPayload.timeline.tracks[0];
          expect(videoTrack).toBeDefined();
          expect(videoTrack.clips).toBeDefined();
          expect(Array.isArray(videoTrack.clips)).toBe(true);
          expect(videoTrack.clips.length).toBe(scenes.length);

          for (let i = 0; i < videoTrack.clips.length; i++) {
            const clip = videoTrack.clips[i];
            expect(clip.start).toBe(expectedStartTimes[i]);
            expect(clip.length).toBe(scenes[i].duration);
          }

          // Verify audio track clips have correct start times
          const audioTrack = capturedPayload.timeline.tracks[1];
          expect(audioTrack).toBeDefined();
          expect(audioTrack.clips).toBeDefined();
          expect(Array.isArray(audioTrack.clips)).toBe(true);
          expect(audioTrack.clips.length).toBe(scenes.length);

          for (let i = 0; i < audioTrack.clips.length; i++) {
            const clip = audioTrack.clips[i];
            expect(clip.start).toBe(expectedStartTimes[i]);
            expect(clip.length).toBe(scenes[i].duration);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test with default durations (when duration is not specified)
  it('Property 12 (edge case): Scenes without explicit duration should use default duration', async () => {
    // Generator for scenes without duration
    const sceneWithoutDurationArbitrary = fc.record({
      visual_prompt: fc.string({ minLength: 1 }),
      voice_text: fc.string({ minLength: 1 }),
      videoUrl: fc.webUrl(),
      audioUrl: fc.webUrl(),
    });

    const scenesArbitrary = fc.array(sceneWithoutDurationArbitrary, { minLength: 1, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        scenesArbitrary,
        async (runId, nodeId, scenes) => {
          // Mock fetch for Shotstack API
          let capturedPayload: unknown = null;
          global.fetch = vi.fn().mockImplementation(async (url, options) => {
            if (typeof url === 'string' && url.includes('shotstack.io')) {
              capturedPayload = JSON.parse(options?.body as string);
              return {
                ok: true,
                status: 200,
                json: async () => ({ response: { id: 'test-render-id' } }),
              };
            }
            return {
              ok: true,
              status: 200,
            };
          }) as unknown;

          const worker = new ShotstackWorker();
          await worker.execute(runId, nodeId, {}, scenes);

          // Verify payload was captured
          expect(capturedPayload).toBeDefined();

          // Calculate expected start times with default duration of 5
          const defaultDuration = 5;
          const expectedStartTimes: number[] = [];
          let cumulativeTime = 0;
          for (let i = 0; i < scenes.length; i++) {
            expectedStartTimes.push(cumulativeTime);
            cumulativeTime += defaultDuration;
          }

          // Verify video track clips
          const videoTrack = capturedPayload.timeline.tracks[0];
          for (let i = 0; i < videoTrack.clips.length; i++) {
            const clip = videoTrack.clips[i];
            expect(clip.start).toBe(expectedStartTimes[i]);
            expect(clip.length).toBe(defaultDuration);
          }

          // Verify audio track clips
          const audioTrack = capturedPayload.timeline.tracks[1];
          for (let i = 0; i < audioTrack.clips.length; i++) {
            const clip = audioTrack.clips[i];
            expect(clip.start).toBe(expectedStartTimes[i]);
            expect(clip.length).toBe(defaultDuration);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
