/**
 * Integration Tests for CREATE_WORKFLOW Handler
 * 
 * Tests the complete flow of creating a workflow via AI Manager,
 * including database storage and retrieval.
 */

// beforeEach import removed as unused
import { handleCreateWorkflow, CreateWorkflowPayload } from '../action-executor';
import { getFlow, deleteFlow } from '@/lib/db/flows';

describe('CREATE_WORKFLOW Integration Tests', () => {
  // Track created flows for cleanup
  const createdFlowIds: string[] = [];

  // Cleanup after each test
  beforeEach(async () => {
    // Clean up any flows from previous tests
    for (const flowId of createdFlowIds) {
      try {
        await deleteFlow(flowId);
      } catch (_error) {
        // Ignore errors if flow doesn't exist
      }
    }
    createdFlowIds.length = 0;
  });

  it('should create a simple workflow with one UX node', async () => {
    const payload: CreateWorkflowPayload = {
      name: 'Simple Test Workflow',
      canvas: {
        nodes: [
          {
            id: 'ux-1',
            type: 'ux',
            position: { x: 100, y: 100 },
            data: {
              label: 'Start',
            },
          },
        ],
        edges: [],
      },
    };

    const result = await handleCreateWorkflow(payload);
    createdFlowIds.push(result.canvasId);

    // Verify result structure
    expect(result).toHaveProperty('canvasId');
    expect(result).toHaveProperty('canvas');
    expect(result.canvasId).toBeTruthy();
    expect(result.canvas).toEqual(payload.canvas);

    // Verify flow was stored in database
    const storedFlow = await getFlow(result.canvasId, true);
    expect(storedFlow).toBeTruthy();
    expect(storedFlow?.name).toBe('Simple Test Workflow');
  });

  it('should create a workflow with worker nodes', async () => {
    const payload: CreateWorkflowPayload = {
      name: 'Worker Test Workflow',
      canvas: {
        nodes: [
          {
            id: 'ux-1',
            type: 'ux',
            position: { x: 100, y: 100 },
            data: {
              label: 'Start',
            },
          },
          {
            id: 'worker-1',
            type: 'worker',
            position: { x: 300, y: 100 },
            data: {
              label: 'Generate Script',
              worker_type: 'claude',
              config: {
                model: 'claude-sonnet-4-20250514',
              },
            },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'ux-1',
            target: 'worker-1',
          },
        ],
      },
    };

    const result = await handleCreateWorkflow(payload);
    createdFlowIds.push(result.canvasId);

    // Verify result
    expect(result.canvasId).toBeTruthy();
    expect(result.canvas.nodes).toHaveLength(2);
    expect(result.canvas.edges).toHaveLength(1);

    // Verify flow was stored
    const storedFlow = await getFlow(result.canvasId, true);
    expect(storedFlow).toBeTruthy();
    expect(storedFlow?.name).toBe('Worker Test Workflow');
  });

  it('should create a workflow with entity movement configuration', async () => {
    const payload: CreateWorkflowPayload = {
      name: 'Entity Movement Workflow',
      canvas: {
        nodes: [
          {
            id: 'section-1',
            type: 'section',
            position: { x: 100, y: 100 },
            data: {
              label: 'Marketing',
            },
          },
          {
            id: 'section-2',
            type: 'section',
            position: { x: 500, y: 100 },
            data: {
              label: 'Sales',
            },
          },
          {
            id: 'worker-1',
            type: 'worker',
            position: { x: 300, y: 100 },
            data: {
              label: 'Qualify Lead',
              worker_type: 'claude',
              entityMovement: {
                onSuccess: {
                  targetSectionId: 'section-2',
                  completeAs: 'success',
                  setEntityType: 'customer',
                },
                onFailure: {
                  targetSectionId: 'section-1',
                  completeAs: 'failure',
                },
              },
            },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'section-1',
            target: 'worker-1',
          },
          {
            id: 'edge-2',
            source: 'worker-1',
            target: 'section-2',
          },
        ],
      },
    };

    const result = await handleCreateWorkflow(payload);
    createdFlowIds.push(result.canvasId);

    // Verify result
    expect(result.canvasId).toBeTruthy();
    expect(result.canvas.nodes).toHaveLength(3);

    // Verify entity movement configuration was preserved
    const workerNode = result.canvas.nodes.find(n => n.id === 'worker-1');
    expect(workerNode?.data.entityMovement).toBeDefined();
    expect(workerNode?.data.entityMovement?.onSuccess?.targetSectionId).toBe('section-2');
    expect(workerNode?.data.entityMovement?.onSuccess?.completeAs).toBe('success');
    expect(workerNode?.data.entityMovement?.onSuccess?.setEntityType).toBe('customer');
  });

  it('should create a workflow with multiple worker types', async () => {
    const payload: CreateWorkflowPayload = {
      name: 'Multi-Worker Workflow',
      canvas: {
        nodes: [
          {
            id: 'worker-claude',
            type: 'worker',
            position: { x: 100, y: 100 },
            data: {
              label: 'Generate Script',
              worker_type: 'claude',
            },
          },
          {
            id: 'worker-minimax',
            type: 'worker',
            position: { x: 300, y: 100 },
            data: {
              label: 'Generate Video',
              worker_type: 'minimax',
            },
          },
          {
            id: 'worker-elevenlabs',
            type: 'worker',
            position: { x: 500, y: 100 },
            data: {
              label: 'Generate Voice',
              worker_type: 'elevenlabs',
            },
          },
          {
            id: 'worker-shotstack',
            type: 'worker',
            position: { x: 700, y: 100 },
            data: {
              label: 'Assemble Video',
              worker_type: 'shotstack',
            },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'worker-claude',
            target: 'worker-minimax',
          },
          {
            id: 'edge-2',
            source: 'worker-claude',
            target: 'worker-elevenlabs',
          },
          {
            id: 'edge-3',
            source: 'worker-minimax',
            target: 'worker-shotstack',
          },
          {
            id: 'edge-4',
            source: 'worker-elevenlabs',
            target: 'worker-shotstack',
          },
        ],
      },
    };

    const result = await handleCreateWorkflow(payload);
    createdFlowIds.push(result.canvasId);

    // Verify all worker types are valid
    expect(result.canvasId).toBeTruthy();
    expect(result.canvas.nodes).toHaveLength(4);
    expect(result.canvas.edges).toHaveLength(4);

    // Verify each worker type
    const workerTypes = result.canvas.nodes.map(n => n.data.worker_type);
    expect(workerTypes).toContain('claude');
    expect(workerTypes).toContain('minimax');
    expect(workerTypes).toContain('elevenlabs');
    expect(workerTypes).toContain('shotstack');
  });
});
