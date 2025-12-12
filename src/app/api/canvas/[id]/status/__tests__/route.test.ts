/**
 * Tests for GET /api/canvas/[id]/status endpoint
 * Requirements: 2.2
 */

// beforeEach import removed as unused
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db/runs', () => ({
  getRun: vi.fn()
}));

vi.mock('@/lib/canvas/version-manager', () => ({
  getVersion: vi.fn()
}));

describe('GET /api/canvas/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if runId is missing', async () => {
    const request = new NextRequest('http://localhost/api/canvas/test-id/status');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required query parameter: runId');
  });

  it('should return 404 if run not found', async () => {
    const { getRun } = await import('@/lib/db/runs');
    vi.mocked(getRun).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/canvas/test-id/status?runId=run-123');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Run not found');
  });

  it('should return 400 if run does not belong to canvas', async () => {
    const { getRun } = await import('@/lib/db/runs');
    vi.mocked(getRun).mockResolvedValue({
      id: 'run-123',
      flow_id: 'different-canvas-id',
      flow_version_id: 'version-1',
      entity_id: null,
      node_states: {},
      trigger: {
        type: 'manual',
        source: 'api',
        event_id: null,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const request = new NextRequest('http://localhost/api/canvas/test-id/status?runId=run-123');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('does not belong to canvas');
  });

  it('should return pending status when all nodes are pending', async () => {
    const { getRun } = await import('@/lib/db/runs');
    vi.mocked(getRun).mockResolvedValue({
      id: 'run-123',
      flow_id: 'test-id',
      flow_version_id: 'version-1',
      entity_id: null,
      node_states: {
        'node-1': { status: 'pending' },
        'node-2': { status: 'pending' }
      },
      trigger: {
        type: 'manual',
        source: 'api',
        event_id: null,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const request = new NextRequest('http://localhost/api/canvas/test-id/status?runId=run-123');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('pending');
    expect(data.runId).toBe('run-123');
    expect(data.nodes).toEqual({
      'node-1': { status: 'pending' },
      'node-2': { status: 'pending' }
    });
  });

  it('should return running status when some nodes are running', async () => {
    const { getRun } = await import('@/lib/db/runs');
    vi.mocked(getRun).mockResolvedValue({
      id: 'run-123',
      flow_id: 'test-id',
      flow_version_id: 'version-1',
      entity_id: null,
      node_states: {
        'node-1': { status: 'completed', output: { result: 'done' } },
        'node-2': { status: 'running' }
      },
      trigger: {
        type: 'manual',
        source: 'api',
        event_id: null,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const request = new NextRequest('http://localhost/api/canvas/test-id/status?runId=run-123');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('running');
    expect(data.nodes['node-1'].output).toEqual({ result: 'done' });
  });

  it('should return failed status when any node has failed', async () => {
    const { getRun } = await import('@/lib/db/runs');
    vi.mocked(getRun).mockResolvedValue({
      id: 'run-123',
      flow_id: 'test-id',
      flow_version_id: 'version-1',
      entity_id: null,
      node_states: {
        'node-1': { status: 'completed', output: { result: 'done' } },
        'node-2': { status: 'failed', error: 'Something went wrong' }
      },
      trigger: {
        type: 'manual',
        source: 'api',
        event_id: null,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const request = new NextRequest('http://localhost/api/canvas/test-id/status?runId=run-123');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('failed');
    expect(data.nodes['node-2'].error).toBe('Something went wrong');
  });

  it('should return completed status and finalOutputs when all nodes completed', async () => {
    const { getRun } = await import('@/lib/db/runs');
    const { getVersion } = await import('@/lib/canvas/version-manager');

    vi.mocked(getRun).mockResolvedValue({
      id: 'run-123',
      flow_id: 'test-id',
      flow_version_id: 'version-1',
      entity_id: null,
      node_states: {
        'node-1': { status: 'completed', output: { result: 'intermediate' } },
        'node-2': { status: 'completed', output: { result: 'final' } }
      },
      trigger: {
        type: 'manual',
        source: 'api',
        event_id: null,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    vi.mocked(getVersion).mockResolvedValue({
      id: 'version-1',
      flow_id: 'test-id',
      version_number: 1,
      visual_graph: { nodes: [], edges: [] },
      execution_graph: {
        nodes: {},
        adjacency: {},
        edgeData: {},
        entryNodes: ['node-1'],
        terminalNodes: ['node-2']
      },
      description: 'Test version',
      created_at: new Date().toISOString()
    });

    const request = new NextRequest('http://localhost/api/canvas/test-id/status?runId=run-123');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('completed');
    expect(data.finalOutputs).toEqual({
      'node-2': { result: 'final' }
    });
  });

  it('should include statusUrl for polling', async () => {
    const { getRun } = await import('@/lib/db/runs');
    vi.mocked(getRun).mockResolvedValue({
      id: 'run-123',
      flow_id: 'test-id',
      flow_version_id: 'version-1',
      entity_id: null,
      node_states: {
        'node-1': { status: 'running' }
      },
      trigger: {
        type: 'manual',
        source: 'api',
        event_id: null,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const request = new NextRequest('http://localhost/api/canvas/test-id/status?runId=run-123');
    const params = { id: 'test-id' };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.statusUrl).toContain('/api/canvas/test-id/status?runId=run-123');
  });
});
