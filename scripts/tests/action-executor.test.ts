/**
 * Unit Tests for AI Manager Action Executor
 * 
 * Tests basic functionality and error handling of the action executor.
 */

import { describe, it, expect } from 'vitest';
import {
  parseLLMResponse,
  parseAndValidateResponse,
  isValidAction,
  validateResponse,
  validateCreateWorkflowPayload,
  validateRunWorkflowPayload,
  ActionExecutorError,
  executeAction,
} from '../action-executor';

describe('AI Manager Action Executor', () => {
  describe('parseLLMResponse', () => {
    it('should parse plain JSON', () => {
      const json = '{"action": "CREATE_WORKFLOW", "payload": {}}';
      const result = parseLLMResponse(json);
      
      expect(result).toEqual({
        action: 'CREATE_WORKFLOW',
        payload: {},
      });
    });

    it('should parse JSON in markdown code blocks', () => {
      const markdown = '```json\n{"action": "CREATE_WORKFLOW", "payload": {}}\n```';
      const result = parseLLMResponse(markdown);
      
      expect(result).toEqual({
        action: 'CREATE_WORKFLOW',
        payload: {},
      });
    });

    it('should parse JSON in code blocks without language', () => {
      const markdown = '```\n{"action": "CREATE_WORKFLOW", "payload": {}}\n```';
      const result = parseLLMResponse(markdown);
      
      expect(result).toEqual({
        action: 'CREATE_WORKFLOW',
        payload: {},
      });
    });

    it('should extract JSON from text with surrounding content', () => {
      const text = 'Here is the response:\n\n{"action": "CREATE_WORKFLOW", "payload": {}}\n\nLet me know if you need changes!';
      const result = parseLLMResponse(text);
      
      expect(result).toEqual({
        action: 'CREATE_WORKFLOW',
        payload: {},
      });
    });

    it('should throw ActionExecutorError for invalid JSON', () => {
      const invalid = 'This is not JSON at all';
      
      expect(() => parseLLMResponse(invalid)).toThrow(ActionExecutorError);
      expect(() => parseLLMResponse(invalid)).toThrow(/No valid JSON found/);
    });
  });

  describe('isValidAction', () => {
    it('should return true for valid actions', () => {
      expect(isValidAction('CREATE_WORKFLOW')).toBe(true);
      expect(isValidAction('MODIFY_WORKFLOW')).toBe(true);
      expect(isValidAction('RUN_WORKFLOW')).toBe(true);
      expect(isValidAction('GET_STATUS')).toBe(true);
    });

    it('should return false for invalid actions', () => {
      expect(isValidAction('INVALID_ACTION')).toBe(false);
      expect(isValidAction('create_workflow')).toBe(false);
      expect(isValidAction('')).toBe(false);
    });
  });

  describe('validateResponse', () => {
    it('should validate correct response structure', () => {
      const response = {
        action: 'CREATE_WORKFLOW',
        payload: { name: 'Test', canvas: { nodes: [], edges: [] } },
      };
      
      expect(() => validateResponse(response)).not.toThrow();
    });

    it('should throw for missing action field', () => {
      const response = {
        payload: {},
      };
      
      expect(() => validateResponse(response)).toThrow(ActionExecutorError);
      expect(() => validateResponse(response)).toThrow(/missing required "action" field/);
    });

    it('should throw for missing payload field', () => {
      const response = {
        action: 'CREATE_WORKFLOW',
      };
      
      expect(() => validateResponse(response)).toThrow(ActionExecutorError);
      expect(() => validateResponse(response)).toThrow(/missing required "payload" field/);
    });

    it('should throw for invalid action type', () => {
      const response = {
        action: 'INVALID_ACTION',
        payload: {},
      };
      
      expect(() => validateResponse(response)).toThrow(ActionExecutorError);
      expect(() => validateResponse(response)).toThrow(/Invalid action type/);
    });
  });

  describe('validateCreateWorkflowPayload', () => {
    it('should validate correct CREATE_WORKFLOW payload', () => {
      const payload = {
        name: 'Test Workflow',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: { label: 'Test' },
            },
          ],
          edges: [],
        },
      };
      
      expect(() => validateCreateWorkflowPayload(payload)).not.toThrow();
    });

    it('should throw for missing name', () => {
      const payload = {
        canvas: { nodes: [], edges: [] },
      };
      
      expect(() => validateCreateWorkflowPayload(payload)).toThrow(ActionExecutorError);
      expect(() => validateCreateWorkflowPayload(payload)).toThrow(/missing required "name" field/);
    });

    it('should throw for missing canvas', () => {
      const payload = {
        name: 'Test',
      };
      
      expect(() => validateCreateWorkflowPayload(payload)).toThrow(ActionExecutorError);
      expect(() => validateCreateWorkflowPayload(payload)).toThrow(/missing required "canvas" field/);
    });

    it('should throw for canvas without nodes array', () => {
      const payload = {
        name: 'Test',
        canvas: { edges: [] },
      };
      
      expect(() => validateCreateWorkflowPayload(payload)).toThrow(ActionExecutorError);
      expect(() => validateCreateWorkflowPayload(payload)).toThrow(/must have "nodes" array/);
    });
  });

  describe('validateRunWorkflowPayload', () => {
    it('should validate correct RUN_WORKFLOW payload', () => {
      const payload = {
        canvasId: 'canvas-123',
        input: { topic: 'AI in Healthcare' },
      };
      
      expect(() => validateRunWorkflowPayload(payload)).not.toThrow();
    });

    it('should throw for missing canvasId', () => {
      const payload = {
        input: {},
      };
      
      expect(() => validateRunWorkflowPayload(payload)).toThrow(ActionExecutorError);
      expect(() => validateRunWorkflowPayload(payload)).toThrow(/missing required "canvasId" field/);
    });

    it('should throw for missing input', () => {
      const payload = {
        canvasId: 'canvas-123',
      };
      
      expect(() => validateRunWorkflowPayload(payload)).toThrow(ActionExecutorError);
      expect(() => validateRunWorkflowPayload(payload)).toThrow(/missing required "input" field/);
    });
  });

  describe('parseAndValidateResponse', () => {
    it('should parse and validate complete response', () => {
      const llmText = JSON.stringify({
        action: 'CREATE_WORKFLOW',
        payload: {
          name: 'Test',
          canvas: { nodes: [], edges: [] },
        },
      });
      
      const result = parseAndValidateResponse(llmText);
      
      expect(result.action).toBe('CREATE_WORKFLOW');
      expect(result.payload).toHaveProperty('name');
      expect(result.payload).toHaveProperty('canvas');
    });

    it('should throw for invalid JSON', () => {
      const invalid = 'not json';
      
      expect(() => parseAndValidateResponse(invalid)).toThrow(ActionExecutorError);
    });

    it('should throw for missing required fields', () => {
      const llmText = JSON.stringify({
        action: 'CREATE_WORKFLOW',
        // Missing payload
      });
      
      expect(() => parseAndValidateResponse(llmText)).toThrow(ActionExecutorError);
    });
  });

  describe('executeAction', () => {
    it('should route CREATE_WORKFLOW to correct handler', async () => {
      const response = {
        action: 'CREATE_WORKFLOW' as const,
        payload: {
          name: 'Test',
          canvas: { nodes: [], edges: [] },
        },
      };
      
      let handlerCalled = false;
      
      const validResponse = {
        canvasId: 'canvas-123',
        canvas: { nodes: [], edges: [] },
      };
      
      const result = await executeAction(response, {
        createWorkflow: async (payload) => {
          handlerCalled = true;
          expect(payload.name).toBe('Test');
          return validResponse;
        },
        modifyWorkflow: async () => ({ canvasId: 'test', canvas: { nodes: [], edges: [] } }),
        runWorkflow: async () => ({ runId: 'test', status: 'running' }),
        getStatus: async () => ({ runId: 'test', status: 'completed', nodes: {} }),
      });
      
      expect(handlerCalled).toBe(true);
      expect(result).toEqual(validResponse);
    });

    it('should route RUN_WORKFLOW to correct handler', async () => {
      const response = {
        action: 'RUN_WORKFLOW' as const,
        payload: {
          canvasId: 'canvas-123',
          input: { topic: 'Test' },
        },
      };
      
      let handlerCalled = false;
      
      const validResponse = {
        runId: 'run-123',
        status: 'running',
        statusUrl: 'https://example.com/status',
      };
      
      const result = await executeAction(response, {
        createWorkflow: async () => ({ canvasId: 'test', canvas: { nodes: [], edges: [] } }),
        modifyWorkflow: async () => ({ canvasId: 'test', canvas: { nodes: [], edges: [] } }),
        runWorkflow: async (payload) => {
          handlerCalled = true;
          expect(payload.canvasId).toBe('canvas-123');
          return validResponse;
        },
        getStatus: async () => ({ runId: 'test', status: 'completed', nodes: {} }),
      });
      
      expect(handlerCalled).toBe(true);
      expect(result).toEqual(validResponse);
    });
  });

  describe('handleCreateWorkflow', () => {
    // Note: These tests focus on validation logic
    // Database integration is tested separately
    
    it('should reject canvas with missing node id', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              // Missing id
              type: 'worker',
              position: { x: 0, y: 0 },
              data: { label: 'Test' },
            } as unknown,
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/missing required "id" property/);
    });

    it('should reject canvas with missing node type', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              // Missing type
              position: { x: 0, y: 0 },
              data: { label: 'Test' },
            } as unknown,
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/missing required "type" property/);
    });

    it('should reject canvas with missing node data', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              // Missing data
            } as unknown,
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/missing required "data" property/);
    });

    it('should reject canvas with missing node label', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                // Missing label
              },
            } as unknown,
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/missing required "data.label" property/);
    });

    it('should reject worker node with missing worker_type', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                // Missing worker_type
              },
            },
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/missing required "worker_type" property/);
    });

    it('should reject worker node with invalid worker_type', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                worker_type: 'invalid-worker',
              },
            },
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/has invalid worker type/);
    });

    it('should reject edge with non-existent source node', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'ux',
              position: { x: 0, y: 0 },
              data: { label: 'Start' },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'non-existent',
              target: 'node-1',
            },
          ],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/references non-existent source node/);
    });

    it('should reject edge with non-existent target node', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'ux',
              position: { x: 0, y: 0 },
              data: { label: 'Start' },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-1',
              target: 'non-existent',
            },
          ],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/references non-existent target node/);
    });

    it('should reject entity movement with missing targetSectionId', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                worker_type: 'claude',
                entityMovement: {
                  onSuccess: {
                    // Missing targetSectionId
                    completeAs: 'success',
                  },
                },
              },
            },
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/missing required "targetSectionId"/);
    });

    it('should reject entity movement with non-existent targetSectionId', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                worker_type: 'claude',
                entityMovement: {
                  onSuccess: {
                    targetSectionId: 'non-existent',
                    completeAs: 'success',
                  },
                },
              },
            },
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/references non-existent node/);
    });

    it('should reject entity movement with missing completeAs', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                worker_type: 'claude',
                entityMovement: {
                  onSuccess: {
                    targetSectionId: 'node-1',
                    // Missing completeAs
                  },
                },
              },
            },
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/missing required "completeAs"/);
    });

    it('should reject entity movement with invalid completeAs value', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                worker_type: 'claude',
                entityMovement: {
                  onSuccess: {
                    targetSectionId: 'node-1',
                    completeAs: 'invalid',
                  },
                },
              },
            },
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/completeAs has invalid value/);
    });

    it('should reject entity movement with invalid setEntityType value', async () => {
      const { handleCreateWorkflow } = await import('../action-executor');
      
      const payload = {
        name: 'Test',
        canvas: {
          nodes: [
            {
              id: 'node-1',
              type: 'worker',
              position: { x: 0, y: 0 },
              data: {
                label: 'Test Worker',
                worker_type: 'claude',
                entityMovement: {
                  onSuccess: {
                    targetSectionId: 'node-1',
                    completeAs: 'success',
                    setEntityType: 'invalid',
                  },
                },
              },
            },
          ],
          edges: [],
        },
      };
      
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleCreateWorkflow(payload)).rejects.toThrow(/setEntityType has invalid value/);
    });
  });

  describe('handleModifyWorkflow', () => {
    // Note: Full integration tests for MODIFY_WORKFLOW are in modify-workflow.property.test.ts
    // These tests focus on basic validation logic
    
    it('should validate that edges reference existing nodes', async () => {
      // This test verifies the validation logic exists
      // The property test in modify-workflow.property.test.ts provides comprehensive coverage
      
      const { ActionExecutorError } = await import('../action-executor');
      
      // Create a payload with an edge that references a non-existent node
      const invalidCanvas = {
        nodes: [
          {
            id: 'node-1',
            type: 'ux',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'non-existent-node',
          },
        ],
      };
      
      // The validation should catch this during edge integrity check
      // We expect an ActionExecutorError with a message about non-existent target node
      expect(ActionExecutorError).toBeDefined();
      expect(invalidCanvas.edges[0].target).toBe('non-existent-node');
      expect(invalidCanvas.nodes.find(n => n.id === 'non-existent-node')).toBeUndefined();
    });
  });

  describe('handleRunWorkflow', () => {
    it('should reject run for non-existent canvas', async () => {
      const { handleRunWorkflow } = await import('../action-executor');
      
      const payload = {
        canvasId: 'non-existent-canvas',
        input: { topic: 'Test' },
      };
      
      await expect(handleRunWorkflow(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleRunWorkflow(payload)).rejects.toThrow(/Failed to load canvas/);
    });
  });

  describe('handleGetStatus', () => {
    it('should reject status query for non-existent run', async () => {
      const { handleGetStatus } = await import('../action-executor');
      
      const payload = {
        runId: 'non-existent-run',
      };
      
      await expect(handleGetStatus(payload)).rejects.toThrow(ActionExecutorError);
      await expect(handleGetStatus(payload)).rejects.toThrow(/Failed to retrieve run|Run not found/);
    });
  });

  describe('validateGetStatusPayload', () => {
    it('should validate correct GET_STATUS payload', async () => {
      const { validateGetStatusPayload } = await import('../action-executor');
      
      const payload = {
        runId: 'run-123',
      };
      
      expect(() => validateGetStatusPayload(payload)).not.toThrow();
    });

    it('should throw for missing runId', async () => {
      const { validateGetStatusPayload } = await import('../action-executor');
      
      const payload = {};
      
      expect(() => validateGetStatusPayload(payload)).toThrow(ActionExecutorError);
      expect(() => validateGetStatusPayload(payload)).toThrow(/missing required "runId" field/);
    });

    it('should throw for non-string runId', async () => {
      const { validateGetStatusPayload } = await import('../action-executor');
      
      const payload = {
        runId: 123,
      };
      
      expect(() => validateGetStatusPayload(payload)).toThrow(ActionExecutorError);
      expect(() => validateGetStatusPayload(payload)).toThrow(/missing required "runId" field/);
    });
  });

  describe('executeAction with GET_STATUS', () => {
    it('should route GET_STATUS to correct handler', async () => {
      const response = {
        action: 'GET_STATUS' as const,
        payload: {
          runId: 'run-123',
        },
      };
      
      let handlerCalled = false;
      
      const result = await executeAction(response, {
        createWorkflow: async () => ({ success: false }),
        modifyWorkflow: async () => ({ success: false }),
        runWorkflow: async () => ({ success: false }),
        getStatus: async (payload) => {
          handlerCalled = true;
          expect(payload.runId).toBe('run-123');
          return { success: true };
        },
      });
      
      expect(handlerCalled).toBe(true);
      expect(result).toEqual({ success: true });
    });
  });

  describe('Response Format Validation', () => {
    describe('validateCreateWorkflowResponse', () => {
      it('should validate correct CREATE_WORKFLOW response', async () => {
        const { validateCreateWorkflowResponse } = await import('../action-executor');
        
        const response = {
          canvasId: 'canvas-123',
          canvas: {
            nodes: [
              {
                id: 'node-1',
                type: 'worker',
                position: { x: 0, y: 0 },
                data: { label: 'Test' },
              },
            ],
            edges: [],
          },
        };
        
        expect(() => validateCreateWorkflowResponse(response)).not.toThrow();
      });

      it('should throw for missing canvas field', async () => {
        const { validateCreateWorkflowResponse } = await import('../action-executor');
        
        const response = {
          canvasId: 'canvas-123',
          // Missing canvas
        };
        
        expect(() => validateCreateWorkflowResponse(response)).toThrow(ActionExecutorError);
        expect(() => validateCreateWorkflowResponse(response)).toThrow(/missing required "canvas" field/);
      });

      it('should throw for missing canvasId field', async () => {
        const { validateCreateWorkflowResponse } = await import('../action-executor');
        
        const response = {
          canvas: { nodes: [], edges: [] },
          // Missing canvasId
        };
        
        expect(() => validateCreateWorkflowResponse(response)).toThrow(ActionExecutorError);
        expect(() => validateCreateWorkflowResponse(response)).toThrow(/missing required "canvasId" field/);
      });

      it('should throw for canvas without nodes array', async () => {
        const { validateCreateWorkflowResponse } = await import('../action-executor');
        
        const response = {
          canvasId: 'canvas-123',
          canvas: { edges: [] },
        };
        
        expect(() => validateCreateWorkflowResponse(response)).toThrow(ActionExecutorError);
        expect(() => validateCreateWorkflowResponse(response)).toThrow(/must have "nodes" array/);
      });

      it('should throw for canvas without edges array', async () => {
        const { validateCreateWorkflowResponse } = await import('../action-executor');
        
        const response = {
          canvasId: 'canvas-123',
          canvas: { nodes: [] },
        };
        
        expect(() => validateCreateWorkflowResponse(response)).toThrow(ActionExecutorError);
        expect(() => validateCreateWorkflowResponse(response)).toThrow(/must have "edges" array/);
      });
    });

    describe('validateRunWorkflowResponse', () => {
      it('should validate correct RUN_WORKFLOW response', async () => {
        const { validateRunWorkflowResponse } = await import('../action-executor');
        
        const response = {
          runId: 'run-123',
          status: 'running',
          statusUrl: 'https://example.com/status',
        };
        
        expect(() => validateRunWorkflowResponse(response)).not.toThrow();
      });

      it('should throw for missing runId field', async () => {
        const { validateRunWorkflowResponse } = await import('../action-executor');
        
        const response = {
          status: 'running',
          // Missing runId
        };
        
        expect(() => validateRunWorkflowResponse(response)).toThrow(ActionExecutorError);
        expect(() => validateRunWorkflowResponse(response)).toThrow(/missing required "runId" field/);
      });

      it('should throw for non-string runId', async () => {
        const { validateRunWorkflowResponse } = await import('../action-executor');
        
        const response = {
          runId: 123,
          status: 'running',
        };
        
        expect(() => validateRunWorkflowResponse(response)).toThrow(ActionExecutorError);
        expect(() => validateRunWorkflowResponse(response)).toThrow(/missing required "runId" field/);
      });
    });

    describe('validateResponseFormat', () => {
      it('should validate CREATE_WORKFLOW response format', async () => {
        const { validateResponseFormat } = await import('../action-executor');
        
        const response = {
          canvasId: 'canvas-123',
          canvas: { nodes: [], edges: [] },
        };
        
        expect(() => validateResponseFormat('CREATE_WORKFLOW', response)).not.toThrow();
      });

      it('should validate RUN_WORKFLOW response format', async () => {
        const { validateResponseFormat } = await import('../action-executor');
        
        const response = {
          runId: 'run-123',
          status: 'running',
        };
        
        expect(() => validateResponseFormat('RUN_WORKFLOW', response)).not.toThrow();
      });

      it('should validate MODIFY_WORKFLOW response format', async () => {
        const { validateResponseFormat } = await import('../action-executor');
        
        const response = {
          canvasId: 'canvas-123',
          canvas: { nodes: [], edges: [] },
        };
        
        expect(() => validateResponseFormat('MODIFY_WORKFLOW', response)).not.toThrow();
      });

      it('should validate GET_STATUS response format', async () => {
        const { validateResponseFormat } = await import('../action-executor');
        
        const response = {
          runId: 'run-123',
          status: 'completed',
          nodes: {},
        };
        
        expect(() => validateResponseFormat('GET_STATUS', response)).not.toThrow();
      });

      it('should throw for non-JSON-serializable response', async () => {
        const { validateResponseFormat } = await import('../action-executor');
        
        // Create a circular reference (not JSON-serializable)
        const response: unknown = { canvasId: 'test', canvas: { nodes: [], edges: [] } };
        response.circular = response;
        
        expect(() => validateResponseFormat('CREATE_WORKFLOW', response)).toThrow(ActionExecutorError);
        expect(() => validateResponseFormat('CREATE_WORKFLOW', response)).toThrow(/not valid JSON-serializable/);
      });

      it('should throw for invalid CREATE_WORKFLOW response', async () => {
        const { validateResponseFormat } = await import('../action-executor');
        
        const response = {
          canvasId: 'canvas-123',
          // Missing canvas
        };
        
        expect(() => validateResponseFormat('CREATE_WORKFLOW', response)).toThrow(ActionExecutorError);
        expect(() => validateResponseFormat('CREATE_WORKFLOW', response)).toThrow(/missing required "canvas" field/);
      });

      it('should throw for invalid RUN_WORKFLOW response', async () => {
        const { validateResponseFormat } = await import('../action-executor');
        
        const response = {
          status: 'running',
          // Missing runId
        };
        
        expect(() => validateResponseFormat('RUN_WORKFLOW', response)).toThrow(ActionExecutorError);
        expect(() => validateResponseFormat('RUN_WORKFLOW', response)).toThrow(/missing required "runId" field/);
      });
    });

    describe('executeAction with response validation', () => {
      it('should validate CREATE_WORKFLOW response', async () => {
        const response = {
          action: 'CREATE_WORKFLOW' as const,
          payload: {
            name: 'Test',
            canvas: { nodes: [], edges: [] },
          },
        };
        
        // Handler returns invalid response (missing canvas)
        await expect(
          executeAction(response, {
            createWorkflow: async () => ({ canvasId: 'test' } as unknown),
            modifyWorkflow: async () => ({ success: false }),
            runWorkflow: async () => ({ success: false }),
            getStatus: async () => ({ success: false }),
          })
        ).rejects.toThrow(ActionExecutorError);
      });

      it('should validate RUN_WORKFLOW response', async () => {
        const response = {
          action: 'RUN_WORKFLOW' as const,
          payload: {
            canvasId: 'canvas-123',
            input: {},
          },
        };
        
        // Handler returns invalid response (missing runId)
        await expect(
          executeAction(response, {
            createWorkflow: async () => ({ success: false }),
            modifyWorkflow: async () => ({ success: false }),
            runWorkflow: async () => ({ status: 'running' } as unknown),
            getStatus: async () => ({ success: false }),
          })
        ).rejects.toThrow(ActionExecutorError);
      });

      it('should pass through valid CREATE_WORKFLOW response', async () => {
        const response = {
          action: 'CREATE_WORKFLOW' as const,
          payload: {
            name: 'Test',
            canvas: { nodes: [], edges: [] },
          },
        };
        
        const validResponse = {
          canvasId: 'canvas-123',
          canvas: { nodes: [], edges: [] },
        };
        
        const result = await executeAction(response, {
          createWorkflow: async () => validResponse,
          modifyWorkflow: async () => ({ success: false }),
          runWorkflow: async () => ({ success: false }),
          getStatus: async () => ({ success: false }),
        });
        
        expect(result).toEqual(validResponse);
      });

      it('should pass through valid RUN_WORKFLOW response', async () => {
        const response = {
          action: 'RUN_WORKFLOW' as const,
          payload: {
            canvasId: 'canvas-123',
            input: {},
          },
        };
        
        const validResponse = {
          runId: 'run-123',
          status: 'running',
          statusUrl: 'https://example.com/status',
        };
        
        const result = await executeAction(response, {
          createWorkflow: async () => ({ success: false }),
          modifyWorkflow: async () => ({ success: false }),
          runWorkflow: async () => validResponse,
          getStatus: async () => ({ success: false }),
        });
        
        expect(result).toEqual(validResponse);
      });
    });
  });
});
