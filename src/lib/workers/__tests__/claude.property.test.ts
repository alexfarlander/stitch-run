/**
 * Property-based tests for Claude worker
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import * as fc from 'fast-check';
import { ClaudeWorker } from '../claude';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

describe('Claude Worker - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_BASE_URL: 'https://test.example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Feature: worker-integrations, Property 6: Scene validation
  it('Property 6: Scene validation - for any Claude response, each scene should contain visual_prompt and voice_text', async () => {
    // Generator for valid scenes
    const validSceneArbitrary = fc.record({
      visual_prompt: fc.string({ minLength: 1 }),
      voice_text: fc.string({ minLength: 1 }),
      duration: fc.option(fc.nat(), { nil: undefined }),
    });

    // Generator for scene arrays
    const scenesArbitrary = fc.array(validSceneArbitrary, { minLength: 1, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1 }),
        scenesArbitrary,
        async (runId, nodeId, prompt, scenes) => {
          // Mock the Anthropic client
          const mockCreate = vi.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify({ scenes }),
              },
            ],
            stop_reason: 'end_turn',
          });

          const MockAnthropicConstructor = Anthropic as unknown as Mock;
          MockAnthropicConstructor.mockImplementation(function(this: any) {
            this.messages = {
              create: mockCreate,
            };
          });

          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as any;

          const worker = new ClaudeWorker();
          await worker.execute(runId, nodeId, {}, { prompt });

          // Verify callback was called with completed status
          expect(global.fetch).toHaveBeenCalled();
          const fetchCall = (global.fetch as Mock).mock.calls[0];
          const callbackPayload = JSON.parse(fetchCall[1].body);

          expect(callbackPayload.status).toBe('completed');
          expect(callbackPayload.output).toBeDefined();
          expect(callbackPayload.output.scenes).toBeDefined();
          expect(Array.isArray(callbackPayload.output.scenes)).toBe(true);

          // Verify each scene has required fields
          for (const scene of callbackPayload.output.scenes) {
            expect(scene).toHaveProperty('visual_prompt');
            expect(scene).toHaveProperty('voice_text');
            expect(typeof scene.visual_prompt).toBe('string');
            expect(typeof scene.voice_text).toBe('string');
            expect(scene.visual_prompt.length).toBeGreaterThan(0);
            expect(scene.voice_text.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test that invalid scenes are rejected
  it('Property 6 (edge case): Invalid scenes should trigger failed callback', async () => {
    // Generator for invalid scenes (missing required fields)
    const invalidSceneArbitrary = fc.oneof(
      fc.record({ visual_prompt: fc.string() }), // missing voice_text
      fc.record({ voice_text: fc.string() }), // missing visual_prompt
      fc.record({ visual_prompt: fc.constant(''), voice_text: fc.string() }), // empty visual_prompt
      fc.record({ visual_prompt: fc.string(), voice_text: fc.constant('') }), // empty voice_text
      fc.record({ visual_prompt: fc.nat(), voice_text: fc.string() }), // wrong type
      fc.record({ visual_prompt: fc.string(), voice_text: fc.nat() }) // wrong type
    );

    const invalidScenesArbitrary = fc.array(invalidSceneArbitrary, { minLength: 1, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1 }),
        invalidScenesArbitrary,
        async (runId, nodeId, prompt, scenes) => {
          // Mock the Anthropic client
          const mockCreate = vi.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify({ scenes }),
              },
            ],
            stop_reason: 'end_turn',
          });

          const MockAnthropicConstructor = Anthropic as unknown as Mock;
          MockAnthropicConstructor.mockImplementation(function(this: any) {
            this.messages = {
              create: mockCreate,
            };
          });

          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as any;

          const worker = new ClaudeWorker();
          await worker.execute(runId, nodeId, {}, { prompt });

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
});
