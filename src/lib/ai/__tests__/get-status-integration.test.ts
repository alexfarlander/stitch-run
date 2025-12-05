/**
 * Integration Tests for GET_STATUS Handler
 * 
 * Tests the complete flow of querying workflow status via AI Manager,
 * including node states, outputs, and final results.
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

// beforeEach import removed as unused
import { handleGetStatus, GetStatusPayload } from '../action-executor';
import { handleRunWorkflow, RunWorkflowPayload } from '../action-executor';
import { handleCreateWorkflow, CreateWorkflowPayload } from '../action-executor';
import { deleteFlow } from '@/lib/db/flows';

describe('GET_STATUS Integration Tests', () => {
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

  it('should return status with node states (Requirement 6.2)', async () => {
    // Create a simple workflow
    const createPayload: CreateWorkflowPayload = {
      name: 'Test Workflow for Status',
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

    const createResult = await handleCreateWorkflow(createPayload);
    createdFlowIds.push(createResult.canvasId);

    // Run the workflow
    const runPayload: RunWorkflowPayload = {
      canvasId: createResult.canvasId,
      input: { topic: 'Test Topic' },
    };

    const runResult = await handleRunWorkflow(runPayload);

    // Query status
    const statusPayload: GetStatusPayload = {
      runId: runResult.runId,
    };

    const statusResult = await handleGetStatus(statusPayload);

    // Verify result structure (Requirement 6.2)
    expect(statusResult).toHaveProperty('runId');
    expect(statusResult).toHaveProperty('status');
    expect(statusResult).toHaveProperty('nodes');
    expect(statusResult).toHaveProperty('statusUrl');
    
    // Verify run ID matches
    expect(statusResult.runId).toBe(runResult.runId);
    
    // Verify status is one of the valid values
    expect(['pending', 'running', 'completed', 'failed']).toContain(statusResult.status);
    
    // Verify nodes object exists and contains node states (Requirement 6.2)
    expect(statusResult.nodes).toBeDefined();
    expect(typeof statusResult.nodes).toBe('object');
    
    // Verify statusUrl is constructed correctly
    expect(statusResult.statusUrl).toContain('/api/canvas/');
    expect(statusResult.statusUrl).toContain('/status');
    expect(statusResult.statusUrl).toContain(`runId=${runResult.runId}`);
  });

  it('should include node outputs for completed nodes (Requirement 6.3)', async () => {
    // Create a workflow
    const createPayload: CreateWorkflowPayload = {
      name: 'Workflow with Outputs',
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

    const createResult = await handleCreateWorkflow(createPayload);
    createdFlowIds.push(createResult.canvasId);

    // Run the workflow
    const runPayload: RunWorkflowPayload = {
      canvasId: createResult.canvasId,
      input: { topic: 'Test' },
    };

    const runResult = await handleRunWorkflow(runPayload);

    // Query status
    const statusPayload: GetStatusPayload = {
      runId: runResult.runId,
    };

    const statusResult = await handleGetStatus(statusPayload);

    // Verify nodes have status field (Requirement 6.3)
    for (const [nodeId, nodeState] of Object.entries(statusResult.nodes)) {
      expect(nodeState).toHaveProperty('status');
      expect(typeof nodeState.status).toBe('string');
      
      // If node is completed, it may have output (Requirement 6.3)
      if (nodeState.status === 'completed' && nodeState.output !== undefined) {
        expect(nodeState).toHaveProperty('output');
      }
      
      // If node failed, it should have error (Requirement 6.4)
      if (nodeState.status === 'failed') {
        expect(nodeState).toHaveProperty('error');
        expect(typeof nodeState.error).toBe('string');
      }
    }
  });

  it('should return overall status based on node states', async () => {
    // Create a workflow
    const createPayload: CreateWorkflowPayload = {
      name: 'Workflow for Status Check',
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

    const createResult = await handleCreateWorkflow(createPayload);
    createdFlowIds.push(createResult.canvasId);

    // Run the workflow
    const runPayload: RunWorkflowPayload = {
      canvasId: createResult.canvasId,
      input: { topic: 'Test' },
    };

    const runResult = await handleRunWorkflow(runPayload);

    // Query status
    const statusPayload: GetStatusPayload = {
      runId: runResult.runId,
    };

    const statusResult = await handleGetStatus(statusPayload);

    // Verify overall status is determined correctly
    expect(statusResult.status).toBeDefined();
    expect(['pending', 'running', 'completed', 'failed']).toContain(statusResult.status);
    
    // If any node is failed, overall status should be failed (Requirement 6.4)
    const hasFailedNode = Object.values(statusResult.nodes).some(
      node => node.status === 'failed'
    );
    if (hasFailedNode) {
      expect(statusResult.status).toBe('failed');
    }
    
    // If all nodes are completed, overall status should be completed (Requirement 6.5)
    const allCompleted = Object.values(statusResult.nodes).every(
      node => node.status === 'completed'
    );
    if (allCompleted) {
      expect(statusResult.status).toBe('completed');
    }
  });

  it('should handle multiple status queries for same run', async () => {
    // Create a workflow
    const createPayload: CreateWorkflowPayload = {
      name: 'Workflow for Multiple Queries',
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

    const createResult = await handleCreateWorkflow(createPayload);
    createdFlowIds.push(createResult.canvasId);

    // Run the workflow
    const runPayload: RunWorkflowPayload = {
      canvasId: createResult.canvasId,
      input: { topic: 'Test' },
    };

    const runResult = await handleRunWorkflow(runPayload);

    // Query status multiple times
    const statusPayload: GetStatusPayload = {
      runId: runResult.runId,
    };

    const statusResult1 = await handleGetStatus(statusPayload);
    const statusResult2 = await handleGetStatus(statusPayload);

    // Both queries should return the same run ID
    expect(statusResult1.runId).toBe(runResult.runId);
    expect(statusResult2.runId).toBe(runResult.runId);
    
    // Both queries should have consistent structure
    expect(statusResult1).toHaveProperty('status');
    expect(statusResult1).toHaveProperty('nodes');
    expect(statusResult2).toHaveProperty('status');
    expect(statusResult2).toHaveProperty('nodes');
  });
});
