/**
 * AI Manager API Endpoint Tests
 * 
 * Tests the POST /api/ai-manager endpoint with various scenarios
 */

// beforeEach import removed as unused
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/ai/llm-client');
vi.mock('@/lib/ai/context-builder');
vi.mock('@/lib/ai/prompt-template');
vi.mock('@/lib/ai/action-executor');
vi.mock('@/lib/db/flows');
vi.mock('@/lib/canvas/version-manager');

describe('POST /api/ai-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should reject invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should reject missing request field', async () => {
      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
      expect(data.details).toBeDefined();
      expect(data.details[0]).toContain('request');
    });

    it('should reject empty request string', async () => {
      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('non-empty string');
    });

    it('should reject non-string request', async () => {
      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: 123 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('non-empty string');
    });

    it('should reject invalid canvasId type', async () => {
      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Create a workflow',
          canvasId: 123 
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('canvasId must be a string');
    });
  });

  describe('Canvas Loading', () => {
    it('should return 404 for non-existent canvas', async () => {
      const { getFlow } = await import('@/lib/db/flows');
      vi.mocked(getFlow).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Modify this workflow',
          canvasId: 'non-existent-id'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Canvas not found');
    });

    it('should return 400 for canvas without visual graph', async () => {
      const { getFlow } = await import('@/lib/db/flows');
      const { getVersion } = await import('@/lib/canvas/version-manager');
      
      vi.mocked(getFlow).mockResolvedValue({
        id: 'canvas-1',
        name: 'Test Canvas',
        current_version_id: 'version-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown);

      vi.mocked(getVersion).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Modify this workflow',
          canvasId: 'canvas-1'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('no visual graph data');
    });
  });

  describe('LLM Integration', () => {
    it('should call LLM client with proper context', async () => {
      const { createLLMClient } = await import('@/lib/ai/llm-client');
      const { buildAIManagerContext } = await import('@/lib/ai/context-builder');
      const { buildAIManagerPrompt } = await import('@/lib/ai/prompt-template');
      const { parseAndValidateResponse, executeAction } = await import('@/lib/ai/action-executor');
      
      const mockClient = {
        complete: vi.fn().mockResolvedValue('{"action": "CREATE_WORKFLOW", "payload": {}}')
      };
      
      const mockResponse = {
        action: 'CREATE_WORKFLOW' as const,
        payload: {
          name: 'Test',
          canvas: { nodes: [], edges: [] }
        }
      };

      const mockResult = {
        canvasId: 'canvas-123',
        canvas: { nodes: [], edges: [] }
      };
      
      vi.mocked(createLLMClient).mockReturnValue(mockClient as unknown);
      vi.mocked(buildAIManagerContext).mockReturnValue({
        workers: [],
        request: 'Create a workflow'
      });
      vi.mocked(buildAIManagerPrompt).mockReturnValue('test prompt');
      vi.mocked(parseAndValidateResponse).mockReturnValue(mockResponse);
      vi.mocked(executeAction).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Create a workflow'
        }),
      });

      await POST(request);

      expect(mockClient.complete).toHaveBeenCalledWith('test prompt');
      expect(buildAIManagerContext).toHaveBeenCalledWith('Create a workflow', undefined);
    });
  });

  describe('Response Parsing', () => {
    it('should handle invalid LLM response format', async () => {
      const { createLLMClient } = await import('@/lib/ai/llm-client');
      const { buildAIManagerContext } = await import('@/lib/ai/context-builder');
      const { buildAIManagerPrompt } = await import('@/lib/ai/prompt-template');
      const { parseAndValidateResponse, ActionExecutorError } = await import('@/lib/ai/action-executor');
      
      const mockClient = {
        complete: vi.fn().mockResolvedValue('invalid response')
      };
      
      vi.mocked(createLLMClient).mockReturnValue(mockClient as unknown);
      vi.mocked(buildAIManagerContext).mockReturnValue({
        workers: [],
        request: 'Create a workflow'
      });
      vi.mocked(buildAIManagerPrompt).mockReturnValue('test prompt');
      vi.mocked(parseAndValidateResponse).mockImplementation(() => {
        throw new ActionExecutorError('No valid JSON found', 'PARSE_ERROR');
      });

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Create a workflow'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Failed to parse LLM response');
    });
  });

  describe('Action Execution', () => {
    it('should handle CREATE_WORKFLOW action', async () => {
      const { createLLMClient } = await import('@/lib/ai/llm-client');
      const { buildAIManagerContext } = await import('@/lib/ai/context-builder');
      const { buildAIManagerPrompt } = await import('@/lib/ai/prompt-template');
      const { parseAndValidateResponse, executeAction } = await import('@/lib/ai/action-executor');
      
      const mockClient = {
        complete: vi.fn().mockResolvedValue('{"action": "CREATE_WORKFLOW", "payload": {}}')
      };
      
      const mockResponse = {
        action: 'CREATE_WORKFLOW' as const,
        payload: {
          name: 'Test Workflow',
          canvas: { nodes: [], edges: [] }
        }
      };

      const mockResult = {
        canvasId: 'canvas-123',
        canvas: { nodes: [], edges: [] }
      };
      
      vi.mocked(createLLMClient).mockReturnValue(mockClient as unknown);
      vi.mocked(buildAIManagerContext).mockReturnValue({
        workers: [],
        request: 'Create a workflow'
      });
      vi.mocked(buildAIManagerPrompt).mockReturnValue('test prompt');
      vi.mocked(parseAndValidateResponse).mockReturnValue(mockResponse);
      vi.mocked(executeAction).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Create a workflow'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('CREATE_WORKFLOW');
      expect(data.result).toEqual(mockResult);
    });

    it('should call executeAction with correct handlers', async () => {
      const { createLLMClient } = await import('@/lib/ai/llm-client');
      const { buildAIManagerContext } = await import('@/lib/ai/context-builder');
      const { buildAIManagerPrompt } = await import('@/lib/ai/prompt-template');
      const { parseAndValidateResponse, executeAction } = await import('@/lib/ai/action-executor');
      
      const mockClient = {
        complete: vi.fn().mockResolvedValue('{"action": "CREATE_WORKFLOW", "payload": {}}')
      };
      
      const mockResponse = {
        action: 'CREATE_WORKFLOW' as const,
        payload: {
          name: 'Test',
          canvas: { nodes: [], edges: [] }
        }
      };

      const mockResult = {
        canvasId: 'canvas-123',
        canvas: { nodes: [], edges: [] }
      };
      
      vi.mocked(createLLMClient).mockReturnValue(mockClient as unknown);
      vi.mocked(buildAIManagerContext).mockReturnValue({
        workers: [],
        request: 'Create a workflow'
      });
      vi.mocked(buildAIManagerPrompt).mockReturnValue('test prompt');
      vi.mocked(parseAndValidateResponse).mockReturnValue(mockResponse);
      vi.mocked(executeAction).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Create a workflow'
        }),
      });

      await POST(request);

      expect(executeAction).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          createWorkflow: expect.any(Function),
          modifyWorkflow: expect.any(Function),
          runWorkflow: expect.any(Function),
          getStatus: expect.any(Function)
        })
      );
    });
  });

  describe('End-to-End Success Cases', () => {
    it('should successfully create a workflow', async () => {
      const { createLLMClient } = await import('@/lib/ai/llm-client');
      const { buildAIManagerContext } = await import('@/lib/ai/context-builder');
      const { buildAIManagerPrompt } = await import('@/lib/ai/prompt-template');
      const { parseAndValidateResponse, executeAction } = await import('@/lib/ai/action-executor');
      
      const mockClient = {
        complete: vi.fn().mockResolvedValue(JSON.stringify({
          action: 'CREATE_WORKFLOW',
          payload: {
            name: 'Video Generation',
            canvas: {
              nodes: [
                { id: 'input-1', type: 'ux', data: { label: 'Input' } },
                { id: 'worker-1', type: 'worker', data: { label: 'Generate', worker_type: 'minimax' } }
              ],
              edges: [
                { id: 'e1', source: 'input-1', target: 'worker-1' }
              ]
            }
          }
        }))
      };
      
      const mockResponse = {
        action: 'CREATE_WORKFLOW' as const,
        payload: {
          name: 'Video Generation',
          canvas: {
            nodes: [
              { id: 'input-1', type: 'ux', data: { label: 'Input' } },
              { id: 'worker-1', type: 'worker', data: { label: 'Generate', worker_type: 'minimax' } }
            ],
            edges: [
              { id: 'e1', source: 'input-1', target: 'worker-1' }
            ]
          }
        }
      };

      const mockResult = {
        canvasId: 'canvas-abc',
        canvas: mockResponse.payload.canvas
      };
      
      vi.mocked(createLLMClient).mockReturnValue(mockClient as unknown);
      vi.mocked(buildAIManagerContext).mockReturnValue({
        workers: [],
        request: 'Create a video generation workflow'
      });
      vi.mocked(buildAIManagerPrompt).mockReturnValue('test prompt');
      vi.mocked(parseAndValidateResponse).mockReturnValue(mockResponse);
      vi.mocked(executeAction).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Create a video generation workflow'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('CREATE_WORKFLOW');
      expect(data.result.canvasId).toBe('canvas-abc');
      expect(data.result.canvas.nodes).toHaveLength(2);
    });

    it('should successfully modify a workflow', async () => {
      const { createLLMClient } = await import('@/lib/ai/llm-client');
      const { buildAIManagerContext } = await import('@/lib/ai/context-builder');
      const { buildAIManagerPrompt } = await import('@/lib/ai/prompt-template');
      const { parseAndValidateResponse, executeAction } = await import('@/lib/ai/action-executor');
      const { getFlow } = await import('@/lib/db/flows');
      const { getVersion } = await import('@/lib/canvas/version-manager');
      
      const existingCanvas = {
        nodes: [
          { id: 'input-1', type: 'ux', data: { label: 'Input' } }
        ],
        edges: []
      };

      vi.mocked(getFlow).mockResolvedValue({
        id: 'canvas-1',
        name: 'Test Canvas',
        current_version_id: 'version-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown);

      vi.mocked(getVersion).mockResolvedValue({
        id: 'version-1',
        flow_id: 'canvas-1',
        visual_graph: existingCanvas,
        execution_graph: {} as unknown,
        version_number: 1,
        created_at: new Date().toISOString(),
      });

      const mockClient = {
        complete: vi.fn().mockResolvedValue(JSON.stringify({
          action: 'MODIFY_WORKFLOW',
          payload: {
            canvasId: 'canvas-1',
            canvas: {
              nodes: [
                { id: 'input-1', type: 'ux', data: { label: 'Input' } },
                { id: 'worker-1', type: 'worker', data: { label: 'Generate', worker_type: 'minimax' } }
              ],
              edges: [
                { id: 'e1', source: 'input-1', target: 'worker-1' }
              ]
            },
            changes: ['Added video generation worker']
          }
        }))
      };
      
      const mockResponse = {
        action: 'MODIFY_WORKFLOW' as const,
        payload: {
          canvasId: 'canvas-1',
          canvas: {
            nodes: [
              { id: 'input-1', type: 'ux', data: { label: 'Input' } },
              { id: 'worker-1', type: 'worker', data: { label: 'Generate', worker_type: 'minimax' } }
            ],
            edges: [
              { id: 'e1', source: 'input-1', target: 'worker-1' }
            ]
          },
          changes: ['Added video generation worker']
        }
      };

      const mockResult = {
        canvasId: 'canvas-1',
        canvas: mockResponse.payload.canvas
      };
      
      vi.mocked(createLLMClient).mockReturnValue(mockClient as unknown);
      vi.mocked(buildAIManagerContext).mockReturnValue({
        workers: [],
        currentCanvas: existingCanvas,
        request: 'Add a video generation worker'
      });
      vi.mocked(buildAIManagerPrompt).mockReturnValue('test prompt');
      vi.mocked(parseAndValidateResponse).mockReturnValue(mockResponse);
      vi.mocked(executeAction).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request: 'Add a video generation worker',
          canvasId: 'canvas-1'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('MODIFY_WORKFLOW');
      expect(data.result.canvas.nodes).toHaveLength(2);
    });
  });
});
