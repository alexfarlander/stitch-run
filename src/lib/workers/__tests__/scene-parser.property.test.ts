/**
 * Property-based tests for Scene Parser worker
 * Feature: media-library, Property 13: Scene parser produces valid scene structure
 * Validates: Requirements 5.1
 */

// beforeEach import removed as unused
import * as fc from 'fast-check';
import { SceneParserWorker } from '../scene-parser';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

describe('Scene Parser Worker - Property Tests', () => {
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

  /**
   * Feature: media-library, Property 13: Scene parser produces valid scene structure
   * For any script input to the scene parser, the output should contain a scenes array 
   * where each scene has visual_description and voiceover_text fields
   * Validates: Requirements 5.1
   */
  it('Property 13: Scene parser produces valid scene structure', async () => {
    // Generator for valid scenes with the correct field names
    // Ensure strings are not just whitespace by filtering
    const validSceneArbitrary = fc.record({
      visual_description: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      voiceover_text: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    });

    // Generator for scene arrays
    const scenesArbitrary = fc.array(validSceneArbitrary, { minLength: 1, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 10 }), // Script should be reasonably long
        scenesArbitrary,
        async (runId, nodeId, script, scenes) => {
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
          MockAnthropicConstructor.mockImplementation(function(this: unknown) {
            this.messages = {
              create: mockCreate,
            };
          });

          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as unknown;

          const worker = new SceneParserWorker();
          await worker.execute(runId, nodeId, {}, { script });

          // Verify callback was called with completed status
          expect(global.fetch).toHaveBeenCalled();
          const fetchCall = (global.fetch as Mock).mock.calls[0];
          const callbackPayload = JSON.parse(fetchCall[1].body);

          expect(callbackPayload.status).toBe('completed');
          expect(callbackPayload.output).toBeDefined();
          expect(callbackPayload.output.scenes).toBeDefined();
          expect(Array.isArray(callbackPayload.output.scenes)).toBe(true);
          expect(callbackPayload.output.scenes.length).toBeGreaterThan(0);

          // Verify each scene has required fields with correct names
          for (const scene of callbackPayload.output.scenes) {
            expect(scene).toHaveProperty('visual_description');
            expect(scene).toHaveProperty('voiceover_text');
            expect(typeof scene.visual_description).toBe('string');
            expect(typeof scene.voiceover_text).toBe('string');
            expect(scene.visual_description.length).toBeGreaterThan(0);
            expect(scene.voiceover_text.length).toBeGreaterThan(0);
          }

          // Verify total_scenes is included
          expect(callbackPayload.output.total_scenes).toBe(callbackPayload.output.scenes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Invalid scenes should trigger failed callback
   */
  it('Property 13 (edge case): Invalid scenes should trigger failed callback', async () => {
    // Generator for invalid scenes (missing required fields or wrong types)
    const invalidSceneArbitrary = fc.oneof(
      fc.record({ visual_description: fc.string() }), // missing voiceover_text
      fc.record({ voiceover_text: fc.string() }), // missing visual_description
      fc.record({ visual_description: fc.constant(''), voiceover_text: fc.string() }), // empty visual_description
      fc.record({ visual_description: fc.string(), voiceover_text: fc.constant('') }), // empty voiceover_text
      fc.record({ visual_description: fc.nat(), voiceover_text: fc.string() }), // wrong type
      fc.record({ visual_description: fc.string(), voiceover_text: fc.nat() }) // wrong type
    );

    const invalidScenesArbitrary = fc.array(invalidSceneArbitrary, { minLength: 1, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 10 }),
        invalidScenesArbitrary,
        async (runId, nodeId, script, scenes) => {
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
          MockAnthropicConstructor.mockImplementation(function(this: unknown) {
            this.messages = {
              create: mockCreate,
            };
          });

          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as unknown;

          const worker = new SceneParserWorker();
          await worker.execute(runId, nodeId, {}, { script });

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
   * Edge case: Empty scenes array should trigger failed callback
   */
  it('Property 13 (edge case): Empty scenes array should trigger failed callback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 10 }),
        async (runId, nodeId, script) => {
          // Mock the Anthropic client to return empty scenes array
          const mockCreate = vi.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify({ scenes: [] }),
              },
            ],
            stop_reason: 'end_turn',
          });

          const MockAnthropicConstructor = Anthropic as unknown as Mock;
          MockAnthropicConstructor.mockImplementation(function(this: unknown) {
            this.messages = {
              create: mockCreate,
            };
          });

          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as unknown;

          const worker = new SceneParserWorker();
          await worker.execute(runId, nodeId, {}, { script });

          // Verify callback was called with failed status
          expect(global.fetch).toHaveBeenCalled();
          const fetchCall = (global.fetch as Mock).mock.calls[0];
          const callbackPayload = JSON.parse(fetchCall[1].body);

          expect(callbackPayload.status).toBe('failed');
          expect(callbackPayload.error).toBeDefined();
          expect(callbackPayload.error).toContain('empty');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Missing or invalid script input should trigger failed callback
   */
  it('Property 13 (edge case): Missing or invalid script should trigger failed callback', async () => {
    // Generator for invalid script inputs
    const invalidScriptArbitrary = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(''),
      fc.nat(),
      fc.record({}),
      fc.array(fc.string())
    );

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
        invalidScriptArbitrary,
        async (runId, nodeId, invalidScript) => {
          // Mock fetch for callback
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
          }) as unknown;

          const worker = new SceneParserWorker();
          await worker.execute(runId, nodeId, {}, invalidScript);

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
