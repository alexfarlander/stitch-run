/**
 * Prompt Template Tests
 * 
 * Tests for AI Manager prompt template generation
 */

import { describe, it, expect } from 'vitest';
import {
  buildAIManagerPrompt,
  buildSimplePrompt,
  PromptTemplateConfig,
} from '../prompt-template';
import { WorkerDefinition } from '@/types/worker-definition';

describe('Prompt Template', () => {
  // Sample worker definitions for testing
  const sampleWorkers: WorkerDefinition[] = [
    {
      id: 'claude',
      name: 'Claude Script Generator',
      type: 'sync',
      description: 'Generate structured scene descriptions',
      input: {
        prompt: {
          type: 'string',
          required: true,
          description: 'The prompt to send to Claude',
        },
      },
      output: {
        scenes: {
          type: 'array',
          description: 'Array of scene objects',
        },
      },
      config: {
        model: 'claude-sonnet-4-20250514',
      },
    },
    {
      id: 'minimax',
      name: 'MiniMax Video Generator',
      type: 'async',
      description: 'Generate video clips from text prompts',
      input: {
        visual_prompt: {
          type: 'string',
          required: true,
          description: 'Visual description for video generation',
        },
      },
      output: {
        videoUrl: {
          type: 'string',
          description: 'URL to the generated video file',
        },
      },
    },
  ];

  describe('buildSimplePrompt', () => {
    it('should create a simple prompt with user request', () => {
      const userRequest = 'Create a video generation workflow';
      const prompt = buildSimplePrompt(userRequest);

      expect(prompt).toContain('Stitch AI Manager');
      expect(prompt).toContain('User Request');
      expect(prompt).toContain(userRequest);
      expect(prompt).toContain('Output Format');
    });

    it('should include action types in simple prompt', () => {
      const prompt = buildSimplePrompt('test request');

      expect(prompt).toContain('CREATE_WORKFLOW');
      expect(prompt).toContain('MODIFY_WORKFLOW');
      expect(prompt).toContain('RUN_WORKFLOW');
      expect(prompt).toContain('GET_STATUS');
    });
  });

  describe('buildAIManagerPrompt', () => {
    it('should create a complete prompt with all sections', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'Create a video generation workflow',
      };

      const prompt = buildAIManagerPrompt(config);

      // Check for all major sections
      expect(prompt).toContain('Stitch AI Manager');
      expect(prompt).toContain('Available Workers');
      expect(prompt).toContain('Entity Movement Rules');
      expect(prompt).toContain('Output Format');
      expect(prompt).toContain('Examples');
      expect(prompt).toContain('User Request');
    });

    it('should include worker definitions with input/output schemas', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Check Claude worker
      expect(prompt).toContain('Claude Script Generator');
      expect(prompt).toContain('claude');
      expect(prompt).toContain('prompt');
      expect(prompt).toContain('(required)');
      expect(prompt).toContain('scenes');

      // Check MiniMax worker
      expect(prompt).toContain('MiniMax Video Generator');
      expect(prompt).toContain('minimax');
      expect(prompt).toContain('visual_prompt');
      expect(prompt).toContain('videoUrl');
    });

    it('should include entity movement rules explanation', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('Entity Movement Rules');
      expect(prompt).toContain('entityMovement');
      expect(prompt).toContain('onSuccess');
      expect(prompt).toContain('onFailure');
      expect(prompt).toContain('targetSectionId');
      expect(prompt).toContain('completeAs');
    });

    it('should include output format specification', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('Output Format');
      expect(prompt).toContain('valid JSON');
      expect(prompt).toContain('"action"');
      expect(prompt).toContain('"payload"');
    });

    it('should include example requests and responses', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('Examples');
      expect(prompt).toContain('Example 1');
      expect(prompt).toContain('Example 2');
      expect(prompt).toContain('splitter');
      expect(prompt).toContain('collector');
    });

    it('should include current canvas context when modifying', () => {
      const currentCanvas = {
        nodes: [
          {
            id: 'node-1',
            type: 'worker',
            data: {
              label: 'Test Node',
              worker_type: 'claude',
            },
          },
        ],
        edges: [],
      };

      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        currentCanvas,
        userRequest: 'Add a video generation step',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('Current Canvas State');
      expect(prompt).toContain('node-1');
      expect(prompt).toContain('Test Node');
      expect(prompt).toContain('Preserve existing node IDs');
    });

    it('should not include canvas context when creating new workflow', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'Create a new workflow',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).not.toContain('Current Canvas State');
    });

    it('should include user request at the end', () => {
      const userRequest = 'Create a workflow that generates videos with narration';
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest,
      };

      const prompt = buildAIManagerPrompt(config);

      // User request should be near the end
      const requestIndex = prompt.indexOf('User Request');
      const examplesIndex = prompt.indexOf('Examples');
      
      expect(requestIndex).toBeGreaterThan(examplesIndex);
      expect(prompt).toContain(userRequest);
    });

    it('should format worker config as JSON', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Check that Claude config is formatted
      expect(prompt).toContain('"model": "claude-sonnet-4-20250514"');
    });

    it('should include node type descriptions', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('worker');
      expect(prompt).toContain('ux');
      expect(prompt).toContain('splitter');
      expect(prompt).toContain('collector');
    });

    it('should include edge mapping explanation', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('Edge Mappings');
      expect(prompt).toContain('mapping');
      expect(prompt).toContain('targetField');
      expect(prompt).toContain('sourceField');
    });

    it('should include parallel workflow example with splitter/collector', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Check for parallel workflow example
      expect(prompt).toContain('Parallel Video Production');
      expect(prompt).toContain('split_count');
      expect(prompt).toContain('expected_count');
      expect(prompt).toContain('split_field');
      expect(prompt).toContain('collect_field');
    });

    it('should handle workers with no config', () => {
      const workersWithoutConfig: WorkerDefinition[] = [
        {
          id: 'test-worker',
          name: 'Test Worker',
          type: 'sync',
          description: 'A test worker',
          input: {
            data: {
              type: 'string',
              required: true,
              description: 'Input data',
            },
          },
          output: {
            result: {
              type: 'string',
              description: 'Output result',
            },
          },
        },
      ];

      const config: PromptTemplateConfig = {
        workers: workersWithoutConfig,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('Test Worker');
      expect(prompt).toContain('test-worker');
    });

    it('should include all action types in examples', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Check that all action types have examples
      expect(prompt).toContain('CREATE_WORKFLOW');
      expect(prompt).toContain('MODIFY_WORKFLOW');
      expect(prompt).toContain('RUN_WORKFLOW');
      expect(prompt).toContain('GET_STATUS');
    });
  });

  describe('Prompt Requirements Validation', () => {
    it('should satisfy Requirement 4.1: Generate valid canvas', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Should explain canvas structure
      expect(prompt).toContain('Canvas Structure');
      expect(prompt).toContain('nodes');
      expect(prompt).toContain('edges');
    });

    it('should satisfy Requirement 4.2: Select appropriate worker types', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Should list all available workers with descriptions
      expect(prompt).toContain('Available Workers');
      expect(prompt).toContain('Description:');
    });

    it('should satisfy Requirement 4.3: Include splitter/collector', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Should have examples with splitter/collector
      expect(prompt).toContain('splitter');
      expect(prompt).toContain('collector');
      expect(prompt).toContain('split_count');
      expect(prompt).toContain('expected_count');
    });

    it('should satisfy Requirement 4.4: Configure entity movement', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      // Should explain entity movement
      expect(prompt).toContain('Entity Movement Rules');
      expect(prompt).toContain('entityMovement');
    });

    it('should satisfy Requirement 10.1: Include entity movement config', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('entityMovement');
      expect(prompt).toContain('Configuring Entity Movement');
    });

    it('should satisfy Requirement 10.2: Specify onSuccess behavior', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('onSuccess');
      expect(prompt).toContain('targetSectionId');
    });

    it('should satisfy Requirement 10.3: Specify onFailure behavior', () => {
      const config: PromptTemplateConfig = {
        workers: sampleWorkers,
        userRequest: 'test',
      };

      const prompt = buildAIManagerPrompt(config);

      expect(prompt).toContain('onFailure');
      expect(prompt).toContain('targetSectionId');
    });
  });
});
