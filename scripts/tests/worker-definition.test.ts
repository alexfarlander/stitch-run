/**
 * Worker Definition Type Tests
 * 
 * Verifies that worker definition types are correctly structured
 * and can be used to define valid worker configurations.
 */

import { describe, it, expect } from 'vitest';
import type { WorkerDefinition, WorkerConfig } from '../worker-definition';

describe('WorkerDefinition Types', () => {
  it('should allow creating a complete worker definition', () => {
    const claudeWorker: WorkerDefinition = {
      id: 'claude',
      name: 'Claude Script Generator',
      type: 'sync',
      description: 'Generate scripts using Claude AI',
      input: {
        prompt: {
          type: 'string',
          required: true,
          description: 'The prompt to send to Claude'
        },
        topic: {
          type: 'string',
          required: false,
          description: 'Topic for script generation'
        }
      },
      output: {
        script: {
          type: 'object',
          description: 'Generated script with scenes'
        }
      },
      config: {
        model: 'claude-3-sonnet-20240229'
      }
    };

    expect(claudeWorker.id).toBe('claude');
    expect(claudeWorker.type).toBe('sync');
    expect(claudeWorker.input.prompt.required).toBe(true);
    expect(claudeWorker.output.script.type).toBe('object');
  });

  it('should allow creating an async worker definition', () => {
    const minimaxWorker: WorkerDefinition = {
      id: 'minimax',
      name: 'MiniMax Video Generator',
      type: 'async',
      description: 'Generate videos from text prompts',
      input: {
        prompt: {
          type: 'string',
          required: true,
          description: 'Visual description for video generation'
        },
        duration: {
          type: 'number',
          required: false,
          description: 'Video duration in seconds',
          default: 5
        }
      },
      output: {
        videoUrl: {
          type: 'string',
          description: 'URL to generated video'
        }
      }
    };

    expect(minimaxWorker.type).toBe('async');
    expect(minimaxWorker.input.duration.default).toBe(5);
  });

  it('should allow worker config with custom fields', () => {
    const config: WorkerConfig = {
      endpoint: 'https://api.example.com',
      model: 'gpt-4',
      customField: 'custom-value',
      timeout: 30000
    };

    expect(config.endpoint).toBe('https://api.example.com');
    expect(config.customField).toBe('custom-value');
    expect(config.timeout).toBe(30000);
  });

  it('should allow worker without config', () => {
    const simpleWorker: WorkerDefinition = {
      id: 'simple',
      name: 'Simple Worker',
      type: 'sync',
      description: 'A simple worker without config',
      input: {
        data: {
          type: 'string',
          required: true
        }
      },
      output: {
        result: {
          type: 'string'
        }
      }
    };

    expect(simpleWorker.config).toBeUndefined();
  });

  it('should support all input schema types', () => {
    const worker: WorkerDefinition = {
      id: 'test',
      name: 'Test Worker',
      type: 'sync',
      description: 'Tests all input types',
      input: {
        stringInput: { type: 'string', required: true },
        numberInput: { type: 'number', required: true },
        objectInput: { type: 'object', required: true },
        arrayInput: { type: 'array', required: true },
        booleanInput: { type: 'boolean', required: true }
      },
      output: {
        result: { type: 'string' }
      }
    };

    expect(worker.input.stringInput.type).toBe('string');
    expect(worker.input.numberInput.type).toBe('number');
    expect(worker.input.objectInput.type).toBe('object');
    expect(worker.input.arrayInput.type).toBe('array');
    expect(worker.input.booleanInput.type).toBe('boolean');
  });

  it('should support all output schema types', () => {
    const worker: WorkerDefinition = {
      id: 'test',
      name: 'Test Worker',
      type: 'sync',
      description: 'Tests all output types',
      input: {
        data: { type: 'string', required: true }
      },
      output: {
        stringOutput: { type: 'string', description: 'String result' },
        numberOutput: { type: 'number', description: 'Number result' },
        objectOutput: { type: 'object', description: 'Object result' },
        arrayOutput: { type: 'array', description: 'Array result' },
        booleanOutput: { type: 'boolean', description: 'Boolean result' }
      }
    };

    expect(worker.output.stringOutput.type).toBe('string');
    expect(worker.output.numberOutput.type).toBe('number');
    expect(worker.output.objectOutput.type).toBe('object');
    expect(worker.output.arrayOutput.type).toBe('array');
    expect(worker.output.booleanOutput.type).toBe('boolean');
  });
});
