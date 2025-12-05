/**
 * Tests for POST /api/flows/[id]/run endpoint
 * 
 * Validates: Requirements 5.1, 5.2
 */

// beforeEach import removed as unused
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as versionManager from '@/lib/canvas/version-manager';
import * as edgeWalker from '@/lib/engine/edge-walker';
import * as flowsDb from '@/lib/db/flows';
import { VisualGraph } from '@/types/canvas-schema';

// Mock dependencies
vi.mock('@/lib/canvas/version-manager');
vi.mock('@/lib/engine/edge-walker');
vi.mock('@/lib/db/flows');

describe('POST /api/flows/[id]/run', () => {
  const mockFlowId = 'flow-123';
  const mockVersionId = 'version-456';
  const mockRunId = 'run-789';

  const mockFlow = {
    id: mockFlowId,
    name: 'Test Flow',
    current_version_id: mockVersionId,
    user_id: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockRun = {
    id: mockRunId,
    flow_id: mockFlowId,
    flow_version_id: mockVersionId,
    node_states: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockVisualGraph: VisualGraph = {
    nodes: [
      {
        id: 'node1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: {
          label: 'Test Node',
          worker_type: 'claude',
        },
      },
    ],
    edges: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run flow with current version when no visual graph provided', async () => {
    // Setup mocks
    vi.mocked(flowsDb.getFlow).mockResolvedValue(mockFlow);
    vi.mocked(edgeWalker.startRun).mockResolvedValue(mockRun as unknown);

    // Create request
    const request = new NextRequest('http://localhost/api/flows/flow-123/run', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // Call endpoint
    const response = await POST(request, { params: { id: mockFlowId } });
    const _data = await response.json();

    // Verify
    expect(response.status).toBe(200);
    expect(data.runId).toBe(mockRunId);
    expect(data.versionId).toBe(mockVersionId);
    expect(data.status).toBe('started');

    // Verify startRun was called with current version
    expect(edgeWalker.startRun).toHaveBeenCalledWith(mockFlowId, {
      entityId: null,
      input: {},
      flow_version_id: mockVersionId,
    });

    // Verify autoVersionOnRun was NOT called
    expect(versionManager.autoVersionOnRun).not.toHaveBeenCalled();
  });

  it('should auto-version when visual graph provided (Requirement 5.1)', async () => {
    // Setup mocks
    vi.mocked(flowsDb.getFlow).mockResolvedValue(mockFlow);
    vi.mocked(versionManager.autoVersionOnRun).mockResolvedValue('new-version-123');
    vi.mocked(edgeWalker.startRun).mockResolvedValue({
      ...mockRun,
      flow_version_id: 'new-version-123',
    } as unknown);

    // Create request with visual graph
    const request = new NextRequest('http://localhost/api/flows/flow-123/run', {
      method: 'POST',
      body: JSON.stringify({ visualGraph: mockVisualGraph }),
    });

    // Call endpoint
    const response = await POST(request, { params: { id: mockFlowId } });
    const _data = await response.json();

    // Verify
    expect(response.status).toBe(200);
    expect(data.runId).toBe(mockRunId);
    expect(data.versionId).toBe('new-version-123');
    expect(data.status).toBe('started');

    // Verify autoVersionOnRun was called
    expect(versionManager.autoVersionOnRun).toHaveBeenCalledWith(
      mockFlowId,
      mockVisualGraph
    );

    // Verify startRun was called with new version (Requirement 5.2)
    expect(edgeWalker.startRun).toHaveBeenCalledWith(mockFlowId, {
      entityId: null,
      input: {},
      flow_version_id: 'new-version-123',
    });
  });

  it('should pass entity ID and input to startRun', async () => {
    // Setup mocks
    vi.mocked(flowsDb.getFlow).mockResolvedValue(mockFlow);
    vi.mocked(edgeWalker.startRun).mockResolvedValue(mockRun as unknown);

    // Create request with entity and input
    const request = new NextRequest('http://localhost/api/flows/flow-123/run', {
      method: 'POST',
      body: JSON.stringify({
        entityId: 'entity-123',
        input: { prompt: 'test prompt' },
      }),
    });

    // Call endpoint
    const response = await POST(request, { params: { id: mockFlowId } });

    // Verify
    expect(response.status).toBe(200);
    expect(edgeWalker.startRun).toHaveBeenCalledWith(mockFlowId, {
      entityId: 'entity-123',
      input: { prompt: 'test prompt' },
      flow_version_id: mockVersionId,
    });
  });

  it('should return 404 when flow not found', async () => {
    // Setup mocks
    vi.mocked(flowsDb.getFlow).mockResolvedValue(null);

    // Create request
    const request = new NextRequest('http://localhost/api/flows/flow-123/run', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // Call endpoint
    const response = await POST(request, { params: { id: mockFlowId } });
    const _data = await response.json();

    // Verify
    expect(response.status).toBe(404);
    expect(data.error).toBe('Flow not found');
  });

  it('should return 400 when flow has no current version and no graph provided', async () => {
    // Setup mocks
    vi.mocked(flowsDb.getFlow).mockResolvedValue({
      ...mockFlow,
      current_version_id: null,
    });

    // Create request without visual graph
    const request = new NextRequest('http://localhost/api/flows/flow-123/run', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // Call endpoint
    const response = await POST(request, { params: { id: mockFlowId } });
    const _data = await response.json();

    // Verify
    expect(response.status).toBe(400);
    expect(data.error).toContain('no current version');
  });

  it('should return 400 when auto-versioning fails', async () => {
    // Setup mocks
    vi.mocked(flowsDb.getFlow).mockResolvedValue(mockFlow);
    vi.mocked(versionManager.autoVersionOnRun).mockRejectedValue(
      new Error('Graph validation failed')
    );

    // Create request with visual graph
    const request = new NextRequest('http://localhost/api/flows/flow-123/run', {
      method: 'POST',
      body: JSON.stringify({ visualGraph: mockVisualGraph }),
    });

    // Call endpoint
    const response = await POST(request, { params: { id: mockFlowId } });
    const _data = await response.json();

    // Verify
    expect(response.status).toBe(400);
    expect(data.error).toBe('Failed to create version');
    expect(data.details).toContain('Graph validation failed');
  });

  it('should return 500 when startRun fails', async () => {
    // Setup mocks
    vi.mocked(flowsDb.getFlow).mockResolvedValue(mockFlow);
    vi.mocked(edgeWalker.startRun).mockRejectedValue(
      new Error('Failed to start execution')
    );

    // Create request
    const request = new NextRequest('http://localhost/api/flows/flow-123/run', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // Call endpoint
    const response = await POST(request, { params: { id: mockFlowId } });
    const _data = await response.json();

    // Verify
    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
