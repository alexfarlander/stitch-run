/**
 * End-to-End Workflow Integration Tests
 * 
 * These tests verify complete workflows from creation through execution:
 * 1. Canvas creation via API to execution
 * 2. AI Manager workflow creation to execution
 * 3. Mermaid workflow creation to execution
 * 4. Workflow modification and re-execution
 * 
 * Requirements: All (comprehensive integration testing)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as createCanvas } from '../canvas/route';
import { POST as runCanvas } from '../canvas/[id]/run/route';
import { GET as getStatus } from '../canvas/[id]/status/route';
import { PUT as updateCanvas } from '../canvas/[id]/route';
import { handleCreateWorkflow, handleModifyWorkflow, handleRunWorkflow, handleGetStatus } from '@/lib/ai/action-executor';
import { deleteFlow } from '@/lib/db/flows';
import { NextRequest } from 'next/server';
import { VisualGraph } from '@/types/canvas-schema';

describe('End-to-End Workflow Integration Tests', () => {
  let testCanvasIds: string[] = [];

  afterEach(async () => {
    // Clean up test canvases
    for (const canvasId of testCanvasIds) {
      try {
        await deleteFlow(canvasId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    testCanvasIds = [];
  });

  describe('1. Canvas creation via API to execution', () => {
    it('should create a canvas via API and execute it successfully', async () => {
      // Step 1: Create canvas via API
      const visualGraph: VisualGraph = {
        nodes: [
          {
            id: 'ux-1',
            type: 'UX',
            position: { x: 100, y: 100 },
            data: {
              label: 'User Input',
              config: {
                prompt: 'Enter your topic'
              }
            }
          },
          {
            id: 'worker-1',
            type: 'Worker',
            position: { x: 300, y: 100 },
            data: {
              label: 'Process Input',
              worker_type: 'testing',
              config: {
                delay: 100
              }
            }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'ux-1',
            target: 'worker-1'
          }
        ]
      };

      const createRequest = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'E2E Test Canvas',
          format: 'json',
          content: visualGraph
        })
      });

      const createResponse = await createCanvas(createRequest);
      expect(createResponse.status).toBe(201);
      
      const createData = await createResponse.json();
      expect(createData).toHaveProperty('id');
      expect(createData).toHaveProperty('canvas');
      
      const canvasId = createData.id;
      testCanvasIds.push(canvasId);

      // Step 2: Execute the canvas
      const runRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${canvasId}/run`,
        {
          method: 'POST',
          body: JSON.stringify({
            input: { topic: 'AI Testing' }
          })
        }
      );

      const runResponse = await runCanvas(runRequest, { params: { id: canvasId } });
      expect(runResponse.status).toBe(200);
      
      const runData = await runResponse.json();
      expect(runData).toHaveProperty('runId');
      expect(runData).toHaveProperty('versionId');
      expect(runData).toHaveProperty('status');
      expect(runData.status).toBe('running');

      // Step 3: Check execution status
      const statusRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${canvasId}/status?runId=${runData.runId}`
      );

      const statusResponse = await getStatus(statusRequest, { params: { id: canvasId } });
      expect(statusResponse.status).toBe(200);
      
      const statusData = await statusResponse.json();
      expect(statusData).toHaveProperty('runId');
      expect(statusData).toHaveProperty('status');
      expect(statusData).toHaveProperty('nodes');
      expect(statusData).toHaveProperty('statusUrl');
      
      // Verify nodes are tracked
      expect(statusData.nodes).toHaveProperty('ux-1');
      expect(statusData.nodes).toHaveProperty('worker-1');
    });

    it('should handle canvas with multiple workers in sequence', async () => {
      // Create a more complex workflow
      const visualGraph: VisualGraph = {
        nodes: [
          {
            id: 'ux-1',
            type: 'UX',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'worker-1',
            type: 'Worker',
            position: { x: 300, y: 100 },
            data: {
              label: 'Step 1',
              worker_type: 'testing',
              config: { delay: 50 }
            }
          },
          {
            id: 'worker-2',
            type: 'Worker',
            position: { x: 500, y: 100 },
            data: {
              label: 'Step 2',
              worker_type: 'testing',
              config: { delay: 50 }
            }
          },
          {
            id: 'worker-3',
            type: 'Worker',
            position: { x: 700, y: 100 },
            data: {
              label: 'Step 3',
              worker_type: 'testing',
              config: { delay: 50 }
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'ux-1', target: 'worker-1' },
          { id: 'e2', source: 'worker-1', target: 'worker-2' },
          { id: 'e3', source: 'worker-2', target: 'worker-3' }
        ]
      };

      const createRequest = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Sequential Workflow',
          format: 'json',
          content: visualGraph
        })
      });

      const createResponse = await createCanvas(createRequest);
      const createData = await createResponse.json();
      testCanvasIds.push(createData.id);

      // Execute
      const runRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/run`,
        {
          method: 'POST',
          body: JSON.stringify({ input: {} })
        }
      );

      const runResponse = await runCanvas(runRequest, { params: { id: createData.id } });
      const runData = await runResponse.json();

      expect(runData.runId).toBeTruthy();
      expect(runData.status).toBe('running');

      // Check status
      const statusRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/status?runId=${runData.runId}`
      );

      const statusResponse = await getStatus(statusRequest, { params: { id: createData.id } });
      const statusData = await statusResponse.json();

      // All nodes should be tracked
      expect(Object.keys(statusData.nodes)).toHaveLength(4);
    });
  });

  describe('2. AI Manager workflow creation to execution', () => {
    it('should create workflow via AI Manager and execute it', async () => {
      // Step 1: Create workflow via AI Manager
      const createPayload = {
        name: 'AI Manager E2E Test',
        canvas: {
          nodes: [
            {
              id: 'ux-start',
              type: 'UX',
              position: { x: 100, y: 100 },
              data: {
                label: 'Input',
                config: { prompt: 'Enter data' }
              }
            },
            {
              id: 'worker-process',
              type: 'Worker',
              position: { x: 300, y: 100 },
              data: {
                label: 'Process',
                worker_type: 'testing',
                config: { delay: 100 }
              }
            }
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'ux-start',
              target: 'worker-process'
            }
          ]
        }
      };

      const createResult = await handleCreateWorkflow(createPayload);
      expect(createResult).toHaveProperty('canvasId');
      expect(createResult).toHaveProperty('canvas');
      
      testCanvasIds.push(createResult.canvasId);

      // Step 2: Execute via AI Manager
      const runPayload = {
        canvasId: createResult.canvasId,
        input: { data: 'test input' }
      };

      const runResult = await handleRunWorkflow(runPayload);
      expect(runResult).toHaveProperty('runId');
      expect(runResult).toHaveProperty('status');
      expect(runResult.status).toBe('running');

      // Step 3: Check status via AI Manager
      const statusPayload = {
        runId: runResult.runId
      };

      const statusResult = await handleGetStatus(statusPayload);
      expect(statusResult).toHaveProperty('runId');
      expect(statusResult).toHaveProperty('status');
      expect(statusResult).toHaveProperty('nodes');
      expect(statusResult.runId).toBe(runResult.runId);
    });

    it('should handle AI Manager workflow with entity movement', async () => {
      // Create workflow with entity movement configuration
      const createPayload = {
        name: 'Entity Movement Workflow',
        canvas: {
          nodes: [
            {
              id: 'section-marketing',
              type: 'Section',
              position: { x: 100, y: 100 },
              data: { label: 'Marketing' }
            },
            {
              id: 'section-sales',
              type: 'Section',
              position: { x: 500, y: 100 },
              data: { label: 'Sales' }
            },
            {
              id: 'worker-qualify',
              type: 'Worker',
              position: { x: 300, y: 100 },
              data: {
                label: 'Qualify Lead',
                worker_type: 'testing',
                entityMovement: {
                  onSuccess: {
                    targetSectionId: 'section-sales',
                    completeAs: 'success',
                    setEntityType: 'customer'
                  },
                  onFailure: {
                    targetSectionId: 'section-marketing',
                    completeAs: 'failure'
                  }
                }
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'section-marketing', target: 'worker-qualify' },
            { id: 'e2', source: 'worker-qualify', target: 'section-sales' }
          ]
        }
      };

      const createResult = await handleCreateWorkflow(createPayload);
      testCanvasIds.push(createResult.canvasId);

      // Verify entity movement was preserved
      const workerNode = createResult.canvas.nodes.find(n => n.id === 'worker-qualify');
      expect(workerNode?.data.entityMovement).toBeDefined();
      expect(workerNode?.data.entityMovement?.onSuccess?.targetSectionId).toBe('section-sales');

      // Execute the workflow
      const runResult = await handleRunWorkflow({
        canvasId: createResult.canvasId,
        input: { leadData: 'test' }
      });

      expect(runResult.runId).toBeTruthy();
      expect(runResult.status).toBe('running');
    });
  });

  describe('3. Mermaid workflow creation to execution', () => {
    it('should create workflow from Mermaid and execute it', async () => {
      // Step 1: Create canvas from Mermaid
      const mermaidContent = `flowchart LR
  Start[UX Input] --> Process[Worker: Process]
  Process --> End[UX Output]`;

      const createRequest = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Mermaid E2E Test',
          format: 'mermaid',
          content: mermaidContent
        })
      });

      const createResponse = await createCanvas(createRequest);
      expect(createResponse.status).toBe(201);
      
      const createData = await createResponse.json();
      expect(createData).toHaveProperty('id');
      expect(createData.canvas.nodes.length).toBeGreaterThan(0);
      expect(createData.canvas.edges.length).toBeGreaterThan(0);
      
      testCanvasIds.push(createData.id);

      // Step 2: Execute the Mermaid-created canvas
      const runRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/run`,
        {
          method: 'POST',
          body: JSON.stringify({
            input: { data: 'mermaid test' }
          })
        }
      );

      const runResponse = await runCanvas(runRequest, { params: { id: createData.id } });
      expect(runResponse.status).toBe(200);
      
      const runData = await runResponse.json();
      expect(runData).toHaveProperty('runId');
      expect(runData.status).toBe('running');

      // Step 3: Verify execution status
      const statusRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/status?runId=${runData.runId}`
      );

      const statusResponse = await getStatus(statusRequest, { params: { id: createData.id } });
      const statusData = await statusResponse.json();

      expect(statusData.runId).toBe(runData.runId);
      expect(statusData).toHaveProperty('nodes');
      expect(Object.keys(statusData.nodes).length).toBeGreaterThan(0);
    });

    it('should handle complex Mermaid workflow with multiple paths', async () => {
      const mermaidContent = `flowchart TB
  A[Start] --> B[Worker 1]
  A --> C[Worker 2]
  B --> D[Collector]
  C --> D
  D --> E[Final Worker]`;

      const createRequest = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Complex Mermaid Workflow',
          format: 'mermaid',
          content: mermaidContent
        })
      });

      const createResponse = await createCanvas(createRequest);
      const createData = await createResponse.json();
      testCanvasIds.push(createData.id);

      // Verify structure
      expect(createData.canvas.nodes.length).toBe(5);
      expect(createData.canvas.edges.length).toBe(5);

      // Execute
      const runRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/run`,
        {
          method: 'POST',
          body: JSON.stringify({ input: {} })
        }
      );

      const runResponse = await runCanvas(runRequest, { params: { id: createData.id } });
      const runData = await runResponse.json();

      expect(runData.runId).toBeTruthy();
      expect(runData.status).toBe('running');
    });
  });

  describe('4. Workflow modification and re-execution', () => {
    it('should modify workflow and execute both versions', async () => {
      // Step 1: Create initial workflow
      const initialGraph: VisualGraph = {
        nodes: [
          {
            id: 'ux-1',
            type: 'UX',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'worker-1',
            type: 'Worker',
            position: { x: 300, y: 100 },
            data: {
              label: 'Original Worker',
              worker_type: 'testing',
              config: { delay: 50 }
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'ux-1', target: 'worker-1' }
        ]
      };

      const createRequest = new NextRequest('http://localhost:3000/api/canvas', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Modifiable Workflow',
          format: 'json',
          content: initialGraph
        })
      });

      const createResponse = await createCanvas(createRequest);
      const createData = await createResponse.json();
      testCanvasIds.push(createData.id);

      // Step 2: Execute original version
      const run1Request = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/run`,
        {
          method: 'POST',
          body: JSON.stringify({ input: { version: 'original' } })
        }
      );

      const run1Response = await runCanvas(run1Request, { params: { id: createData.id } });
      const run1Data = await run1Response.json();
      const originalVersionId = run1Data.versionId;

      expect(run1Data.runId).toBeTruthy();
      expect(run1Data.versionId).toBeTruthy();

      // Step 3: Modify the workflow
      const modifiedGraph: VisualGraph = {
        nodes: [
          {
            id: 'ux-1',
            type: 'UX',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'worker-1',
            type: 'Worker',
            position: { x: 300, y: 100 },
            data: {
              label: 'Modified Worker',
              worker_type: 'testing',
              config: { delay: 100 }
            }
          },
          {
            id: 'worker-2',
            type: 'Worker',
            position: { x: 500, y: 100 },
            data: {
              label: 'New Worker',
              worker_type: 'testing',
              config: { delay: 50 }
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'ux-1', target: 'worker-1' },
          { id: 'e2', source: 'worker-1', target: 'worker-2' }
        ]
      };

      const updateRequest = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            canvas: modifiedGraph
          })
        }
      );

      const updateResponse = await updateCanvas(updateRequest, { params: { id: createData.id } });
      expect(updateResponse.status).toBe(200);

      // Step 4: Execute modified version
      const run2Request = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/run`,
        {
          method: 'POST',
          body: JSON.stringify({ input: { version: 'modified' } })
        }
      );

      const run2Response = await runCanvas(run2Request, { params: { id: createData.id } });
      const run2Data = await run2Response.json();
      const modifiedVersionId = run2Data.versionId;

      expect(run2Data.runId).toBeTruthy();
      expect(run2Data.versionId).toBeTruthy();

      // Step 5: Verify different versions were created
      expect(modifiedVersionId).not.toBe(originalVersionId);

      // Step 6: Check status of both runs
      const status1Request = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/status?runId=${run1Data.runId}`
      );
      const status1Response = await getStatus(status1Request, { params: { id: createData.id } });
      const status1Data = await status1Response.json();

      const status2Request = new NextRequest(
        `http://localhost:3000/api/canvas/${createData.id}/status?runId=${run2Data.runId}`
      );
      const status2Response = await getStatus(status2Request, { params: { id: createData.id } });
      const status2Data = await status2Response.json();

      // Original run should have 2 nodes
      expect(Object.keys(status1Data.nodes).length).toBe(2);
      
      // Modified run should have 3 nodes
      expect(Object.keys(status2Data.nodes).length).toBe(3);
    });

    it('should handle AI Manager workflow modification and re-execution', async () => {
      // Step 1: Create initial workflow via AI Manager
      const createPayload = {
        name: 'AI Modifiable Workflow',
        canvas: {
          nodes: [
            {
              id: 'ux-1',
              type: 'UX',
              position: { x: 100, y: 100 },
              data: { label: 'Input' }
            },
            {
              id: 'worker-1',
              type: 'Worker',
              position: { x: 300, y: 100 },
              data: {
                label: 'Process',
                worker_type: 'testing'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'ux-1', target: 'worker-1' }
          ]
        }
      };

      const createResult = await handleCreateWorkflow(createPayload);
      testCanvasIds.push(createResult.canvasId);

      // Step 2: Execute original
      const run1Result = await handleRunWorkflow({
        canvasId: createResult.canvasId,
        input: { version: 'v1' }
      });

      expect(run1Result.runId).toBeTruthy();

      // Step 3: Modify via AI Manager
      const modifyPayload = {
        canvasId: createResult.canvasId,
        canvas: {
          nodes: [
            {
              id: 'ux-1',
              type: 'UX',
              position: { x: 100, y: 100 },
              data: { label: 'Input' }
            },
            {
              id: 'worker-1',
              type: 'Worker',
              position: { x: 300, y: 100 },
              data: {
                label: 'Process',
                worker_type: 'testing'
              }
            },
            {
              id: 'worker-2',
              type: 'Worker',
              position: { x: 500, y: 100 },
              data: {
                label: 'Additional Step',
                worker_type: 'testing'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'ux-1', target: 'worker-1' },
            { id: 'e2', source: 'worker-1', target: 'worker-2' }
          ]
        },
        changes: ['Added worker-2 node']
      };

      const modifyResult = await handleModifyWorkflow(modifyPayload);
      expect(modifyResult.canvas.nodes.length).toBe(3);

      // Step 4: Execute modified version
      const run2Result = await handleRunWorkflow({
        canvasId: createResult.canvasId,
        input: { version: 'v2' }
      });

      expect(run2Result.runId).toBeTruthy();
      expect(run2Result.runId).not.toBe(run1Result.runId);

      // Step 5: Verify both runs have different node counts
      const status1Result = await handleGetStatus({ runId: run1Result.runId });
      const status2Result = await handleGetStatus({ runId: run2Result.runId });

      expect(Object.keys(status1Result.nodes).length).toBe(2);
      expect(Object.keys(status2Result.nodes).length).toBe(3);
    });
  });
});
