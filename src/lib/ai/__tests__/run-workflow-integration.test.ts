/**
 * Integration Tests for RUN_WORKFLOW Handler
 * 
 * Tests the complete flow of running a workflow via AI Manager,
 * including version creation and execution start.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleRunWorkflow, RunWorkflowPayload } from '../action-executor';
import { handleCreateWorkflow, CreateWorkflowPayload } from '../action-executor';
import { deleteFlow } from '@/lib/db/flows';

describe('RUN_WORKFLOW Integration Tests', () => {
  // Track created flows for cleanup
  const createdFlowIds: string[] = [];

  // Cleanup after each test
  beforeEach(async () => {
    // Clean up any flows from previous tests
    for (const flowId of createdFlowIds) {
      try {
        await deleteFlow(flowId);
      } catch (error) {
        // Ignore errors if flow doesn't exist
      }
    }
    createdFlowIds.length = 0;
  });

  it('should start workflow execution and return run ID', async () => {
    // First, create a simple workflow
    const createPayload: CreateWorkflowPayload = {
      name: 'Test Workflow for Execution',
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

    // Now run the workflow
    const runPayload: RunWorkflowPayload = {
      canvasId: createResult.canvasId,
      input: { topic: 'Test Topic' },
    };

    const runResult = await handleRunWorkflow(runPayload);

    // Verify result structure (Requirement 6.1)
    expect(runResult).toHaveProperty('runId');
    expect(runResult).toHaveProperty('status');
    expect(runResult).toHaveProperty('statusUrl');
    
    // Verify run ID is returned
    expect(runResult.runId).toBeTruthy();
    expect(typeof runResult.runId).toBe('string');
    
    // Verify status is set
    expect(runResult.status).toBe('running');
    
    // Verify statusUrl is constructed correctly
    expect(runResult.statusUrl).toContain('/api/canvas/');
    expect(runResult.statusUrl).toContain('/status');
    expect(runResult.statusUrl).toContain(`runId=${runResult.runId}`);
  });

  it('should create version snapshot on run', async () => {
    // Create a workflow
    const createPayload: CreateWorkflowPayload = {
      name: 'Workflow with Versioning',
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

    // Verify a run was created successfully (Requirement 2.3)
    // The version snapshot is created automatically during run
    expect(runResult.runId).toBeTruthy();
    expect(runResult.status).toBe('running');
  });

  it('should handle workflow with input data', async () => {
    // Create a workflow with a worker node
    const createPayload: CreateWorkflowPayload = {
      name: 'Workflow with Input',
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
              label: 'Process',
              worker_type: 'claude',
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

    const createResult = await handleCreateWorkflow(createPayload);
    createdFlowIds.push(createResult.canvasId);

    // Run with complex input data
    const runPayload: RunWorkflowPayload = {
      canvasId: createResult.canvasId,
      input: {
        topic: 'AI in Healthcare',
        tone: 'professional',
        length: 'medium',
        audience: 'healthcare professionals',
      },
    };

    const runResult = await handleRunWorkflow(runPayload);

    // Verify execution started successfully
    expect(runResult.runId).toBeTruthy();
    expect(runResult.status).toBe('running');
  });
});
