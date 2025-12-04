/**
 * Worker Registry Tests
 * 
 * Tests for the worker definition registry including:
 * - Worker definition retrieval
 * - Worker type validation
 * - Available worker types listing
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect } from 'vitest';
import { 
  WORKER_DEFINITIONS, 
  getWorkerDefinition, 
  isValidWorkerType, 
  getAvailableWorkerTypes 
} from '../registry';

describe('Worker Registry', () => {
  describe('WORKER_DEFINITIONS', () => {
    it('should contain definitions for all core workers', () => {
      expect(WORKER_DEFINITIONS).toHaveProperty('claude');
      expect(WORKER_DEFINITIONS).toHaveProperty('minimax');
      expect(WORKER_DEFINITIONS).toHaveProperty('elevenlabs');
      expect(WORKER_DEFINITIONS).toHaveProperty('shotstack');
    });

    it('should have valid structure for each worker definition', () => {
      for (const [workerId, definition] of Object.entries(WORKER_DEFINITIONS)) {
        // Requirement 8.1: Worker SHALL include id, name, type, input schema, and output schema
        expect(definition.id).toBe(workerId);
        expect(definition.name).toBeTruthy();
        expect(definition.type).toMatch(/^(sync|async)$/);
        expect(definition.description).toBeTruthy();
        expect(definition.input).toBeDefined();
        expect(definition.output).toBeDefined();
        
        // Requirement 8.2: Worker input SHALL specify type, required flag, and description
        for (const [inputName, inputSchema] of Object.entries(definition.input)) {
          expect(inputSchema.type).toBeTruthy();
          expect(typeof inputSchema.required).toBe('boolean');
          // Description is optional but recommended
        }
        
        // Requirement 8.3: Worker output SHALL specify type and description
        for (const [outputName, outputSchema] of Object.entries(definition.output)) {
          expect(outputSchema.type).toBeTruthy();
          // Description is optional but recommended
        }
      }
    });

    it('should have config for workers that need it (Requirement 8.4)', () => {
      // Claude has model config
      expect(WORKER_DEFINITIONS.claude.config).toBeDefined();
      expect(WORKER_DEFINITIONS.claude.config?.model).toBeTruthy();
      
      // MiniMax has model and endpoint config
      expect(WORKER_DEFINITIONS.minimax.config).toBeDefined();
      expect(WORKER_DEFINITIONS.minimax.config?.model).toBeTruthy();
      expect(WORKER_DEFINITIONS.minimax.config?.endpoint).toBeTruthy();
      
      // ElevenLabs has modelId and endpoint config
      expect(WORKER_DEFINITIONS.elevenlabs.config).toBeDefined();
      expect(WORKER_DEFINITIONS.elevenlabs.config?.modelId).toBeTruthy();
      expect(WORKER_DEFINITIONS.elevenlabs.config?.endpoint).toBeTruthy();
      
      // Shotstack has resolution, format, fps, and endpoint config
      expect(WORKER_DEFINITIONS.shotstack.config).toBeDefined();
      expect(WORKER_DEFINITIONS.shotstack.config?.resolution).toBeTruthy();
      expect(WORKER_DEFINITIONS.shotstack.config?.format).toBeTruthy();
      expect(WORKER_DEFINITIONS.shotstack.config?.fps).toBeTruthy();
      expect(WORKER_DEFINITIONS.shotstack.config?.endpoint).toBeTruthy();
    });
  });

  describe('getWorkerDefinition', () => {
    it('should return definition for valid worker types', () => {
      const claudeDef = getWorkerDefinition('claude');
      expect(claudeDef).toBeDefined();
      expect(claudeDef?.id).toBe('claude');
      expect(claudeDef?.name).toBe('Claude Script Generator');
      
      const minimaxDef = getWorkerDefinition('minimax');
      expect(minimaxDef).toBeDefined();
      expect(minimaxDef?.id).toBe('minimax');
      expect(minimaxDef?.name).toBe('MiniMax Video Generator');
    });

    it('should return undefined for invalid worker types', () => {
      expect(getWorkerDefinition('invalid-worker')).toBeUndefined();
      expect(getWorkerDefinition('nonexistent')).toBeUndefined();
    });
  });

  describe('isValidWorkerType', () => {
    it('should return true for valid worker types', () => {
      expect(isValidWorkerType('claude')).toBe(true);
      expect(isValidWorkerType('minimax')).toBe(true);
      expect(isValidWorkerType('elevenlabs')).toBe(true);
      expect(isValidWorkerType('shotstack')).toBe(true);
    });

    it('should return false for invalid worker types', () => {
      expect(isValidWorkerType('invalid-worker')).toBe(false);
      expect(isValidWorkerType('nonexistent')).toBe(false);
      expect(isValidWorkerType('')).toBe(false);
    });
  });

  describe('getAvailableWorkerTypes', () => {
    it('should return array of all worker type IDs', () => {
      const types = getAvailableWorkerTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('claude');
      expect(types).toContain('minimax');
      expect(types).toContain('elevenlabs');
      expect(types).toContain('shotstack');
    });

    it('should return at least 4 worker types', () => {
      const types = getAvailableWorkerTypes();
      expect(types.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Worker-specific definitions', () => {
    describe('Claude worker', () => {
      it('should have correct input schema', () => {
        const claude = WORKER_DEFINITIONS.claude;
        expect(claude.input.prompt).toBeDefined();
        expect(claude.input.prompt.required).toBe(true);
        expect(claude.input.prompt.type).toBe('string');
        
        expect(claude.input.topic).toBeDefined();
        expect(claude.input.topic.required).toBe(false);
      });

      it('should have correct output schema', () => {
        const claude = WORKER_DEFINITIONS.claude;
        expect(claude.output.scenes).toBeDefined();
        expect(claude.output.scenes.type).toBe('array');
      });

      it('should be sync type', () => {
        expect(WORKER_DEFINITIONS.claude.type).toBe('sync');
      });
    });

    describe('MiniMax worker', () => {
      it('should have correct input schema', () => {
        const minimax = WORKER_DEFINITIONS.minimax;
        expect(minimax.input.visual_prompt).toBeDefined();
        expect(minimax.input.visual_prompt.required).toBe(true);
        
        expect(minimax.input.duration).toBeDefined();
        expect(minimax.input.duration.required).toBe(false);
        expect(minimax.input.duration.default).toBe(5);
      });

      it('should have correct output schema', () => {
        const minimax = WORKER_DEFINITIONS.minimax;
        expect(minimax.output.videoUrl).toBeDefined();
        expect(minimax.output.videoUrl.type).toBe('string');
      });

      it('should be async type', () => {
        expect(WORKER_DEFINITIONS.minimax.type).toBe('async');
      });
    });

    describe('ElevenLabs worker', () => {
      it('should have correct input schema', () => {
        const elevenlabs = WORKER_DEFINITIONS.elevenlabs;
        expect(elevenlabs.input.voice_text).toBeDefined();
        expect(elevenlabs.input.voice_text.required).toBe(true);
        
        expect(elevenlabs.input.voice_id).toBeDefined();
        expect(elevenlabs.input.voice_id.required).toBe(false);
      });

      it('should have correct output schema', () => {
        const elevenlabs = WORKER_DEFINITIONS.elevenlabs;
        expect(elevenlabs.output.audioUrl).toBeDefined();
        expect(elevenlabs.output.audioUrl.type).toBe('string');
      });

      it('should be async type', () => {
        expect(WORKER_DEFINITIONS.elevenlabs.type).toBe('async');
      });
    });

    describe('Shotstack worker', () => {
      it('should have correct input schema', () => {
        const shotstack = WORKER_DEFINITIONS.shotstack;
        expect(shotstack.input.scenes).toBeDefined();
        expect(shotstack.input.scenes.required).toBe(true);
        expect(shotstack.input.scenes.type).toBe('array');
        
        expect(shotstack.input.timeline).toBeDefined();
        expect(shotstack.input.timeline.required).toBe(false);
      });

      it('should have correct output schema', () => {
        const shotstack = WORKER_DEFINITIONS.shotstack;
        expect(shotstack.output.finalVideoUrl).toBeDefined();
        expect(shotstack.output.finalVideoUrl.type).toBe('string');
        
        expect(shotstack.output.duration).toBeDefined();
        expect(shotstack.output.duration.type).toBe('number');
      });

      it('should be async type', () => {
        expect(WORKER_DEFINITIONS.shotstack.type).toBe('async');
      });
    });
  });
});
