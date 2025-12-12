/**
 * Unit tests for retry API endpoint
 * Tests: Requirements 10.2, 10.3, 10.5
 */

import { describe, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as runs from '@/lib/db/runs';
import * as versions from '@/lib/canvas/version-manager';
import { fireNodeWithGraph } from '@/lib/engine/edge-walker';
import type { ExecutionGraph } from '@/types/execution-graph';
import type { StitchRun } from '@/types/stitch';

vi.mock('@/lib/db/runs');
vi.mock('@/lib/canvas/version-manager');
vi.mock('@/lib/engine/edge-walker', () => ({
  fireNodeWithGraph: vi.fn(),
}));

function createMockRequest(): NextRequest {
  return new NextRequest('http://localhost/api/stitch/retry/run/node', { method: 'POST' });
}

function baseRun(partial: Partial<StitchRun>): StitchRun {
  return {
    id: partial.id ?? '550e8400-e29b-41d4-a716-446655440000',
    flow_id: partial.flow_id ?? 'flow-123',
    flow_version_id: partial.flow_version_id ?? 'version-123',
    entity_id: partial.entity_id ?? null,
    trigger: partial.trigger ?? {
      type: 'manual',
      source: null,
      event_id: null,
      timestamp: new Date().toISOString(),
    },
    node_states: partial.node_states ?? {},
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? new Date().toISOString(),
  };
}

describe('Retry API Endpoint', () => {
  const runId = '550e8400-e29b-41d4-a716-446655440000';
  const nodeId = 'worker-1';

  it('returns 404 if run not found', async () => {
    vi.mocked(runs.getRunAdmin).mockResolvedValue(null);

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ runId, nodeId }) });

    expect(response.status).toBe(404);
  });

  it('returns 404 if node not found in run', async () => {
    vi.mocked(runs.getRunAdmin).mockResolvedValue(
      baseRun({
        id: runId,
        node_states: {},
      })
    );

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ runId, nodeId }) });

    expect(response.status).toBe(404);
  });

  it('returns 400 if node is not failed', async () => {
    vi.mocked(runs.getRunAdmin).mockResolvedValue(
      baseRun({
        id: runId,
        node_states: {
          [nodeId]: { status: 'running' },
        },
      })
    );

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ runId, nodeId }) });

    expect(response.status).toBe(400);
  });

  it('resets failed node to pending', async () => {
    const failedRun = baseRun({
      id: runId,
      node_states: {
        [nodeId]: { status: 'failed', error: 'timeout' },
      },
    });

    const afterReset = baseRun({
      id: runId,
      node_states: {
        [nodeId]: { status: 'pending' },
      },
    });

    vi.mocked(runs.getRunAdmin)
      .mockResolvedValueOnce(failedRun)
      .mockResolvedValueOnce(afterReset);

    vi.mocked(runs.updateNodeState).mockResolvedValue(afterReset);

    // Provide a version so the handler proceeds
    const executionGraph: ExecutionGraph = {
      nodes: { [nodeId]: { id: nodeId, type: 'Worker' } as any },
      adjacency: { upstream: [nodeId] },
      edgeData: {},
      entryNodes: [],
      terminalNodes: [],
    };
    vi.mocked(versions.getVersion).mockResolvedValue({
      id: 'version-123',
      flow_id: 'flow-123',
      visual_graph: { nodes: [], edges: [] },
      execution_graph: executionGraph,
      commit_message: null,
      created_at: new Date().toISOString(),
    });

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ runId, nodeId }) });

    expect(runs.updateNodeState).toHaveBeenCalledWith(runId, nodeId, { status: 'pending' });
    expect(response.status).toBe(200);
  });

  it('fires node when upstream dependencies are completed', async () => {
    const failedRun = baseRun({
      id: runId,
      node_states: {
        upstream: { status: 'completed' },
        [nodeId]: { status: 'failed', error: 'timeout' },
      },
    });

    const afterReset = baseRun({
      id: runId,
      node_states: {
        upstream: { status: 'completed' },
        [nodeId]: { status: 'pending' },
      },
    });

    vi.mocked(runs.getRunAdmin)
      .mockResolvedValueOnce(failedRun)
      .mockResolvedValueOnce(afterReset);

    vi.mocked(runs.updateNodeState).mockResolvedValue(afterReset);

    const executionGraph: ExecutionGraph = {
      nodes: { [nodeId]: { id: nodeId, type: 'Worker' } as any },
      adjacency: { upstream: [nodeId] },
      edgeData: {},
      entryNodes: [],
      terminalNodes: [],
    };

    vi.mocked(versions.getVersion).mockResolvedValue({
      id: 'version-123',
      flow_id: 'flow-123',
      visual_graph: { nodes: [], edges: [] },
      execution_graph: executionGraph,
      commit_message: null,
      created_at: new Date().toISOString(),
    });

    vi.mocked(fireNodeWithGraph).mockResolvedValue(undefined);

    const request = createMockRequest();
    await POST(request, { params: Promise.resolve({ runId, nodeId }) });

    expect(fireNodeWithGraph).toHaveBeenCalledWith(nodeId, executionGraph, afterReset);
  });

  it('does not fire node when upstream is not completed', async () => {
    const failedRun = baseRun({
      id: runId,
      node_states: {
        upstream: { status: 'pending' },
        [nodeId]: { status: 'failed', error: 'timeout' },
      },
    });

    const afterReset = baseRun({
      id: runId,
      node_states: {
        upstream: { status: 'pending' },
        [nodeId]: { status: 'pending' },
      },
    });

    vi.mocked(runs.getRunAdmin)
      .mockResolvedValueOnce(failedRun)
      .mockResolvedValueOnce(afterReset);

    vi.mocked(runs.updateNodeState).mockResolvedValue(afterReset);

    const executionGraph: ExecutionGraph = {
      nodes: { [nodeId]: { id: nodeId, type: 'Worker' } as any },
      adjacency: { upstream: [nodeId] },
      edgeData: {},
      entryNodes: [],
      terminalNodes: [],
    };

    vi.mocked(versions.getVersion).mockResolvedValue({
      id: 'version-123',
      flow_id: 'flow-123',
      visual_graph: { nodes: [], edges: [] },
      execution_graph: executionGraph,
      commit_message: null,
      created_at: new Date().toISOString(),
    });

    const request = createMockRequest();
    await POST(request, { params: Promise.resolve({ runId, nodeId }) });

    expect(fireNodeWithGraph).not.toHaveBeenCalled();
  });
});


