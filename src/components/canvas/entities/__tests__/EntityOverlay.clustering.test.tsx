/**
 * EntityOverlay Clustering Logic Tests
 * 
 * Tests the clustering behavior of EntityOverlay component:
 * - Property 11: Cluster when >5 entities at same node
 * - Property 13: Individual dots when ≤5 entities at same node
 * - Property 14: Real-time cluster count updates
 * 
 * Requirements: 4.1, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityOverlay } from '../EntityOverlay';
import { StitchEntity } from '@/types/entity';

// Mock the hooks
vi.mock('@/hooks/useEntities', () => ({
  useEntities: vi.fn(),
}));

vi.mock('@/hooks/useEntityPosition', () => ({
  useEntityPositions: vi.fn(),
}));

vi.mock('@/components/panels/EntityDetailPanel', () => ({
  EntityDetailPanel: () => null,
}));

import { useEntities } from '@/hooks/useEntities';
import { useEntityPositions } from '@/hooks/useEntityPosition';

describe('EntityOverlay - Clustering Logic', () => {
  const mockCanvasId = 'test-canvas-id';
  const mockPosition = { x: 100, y: 100 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 11: Entity clustering threshold
   * For any node with more than 5 entities, the Canvas SHALL display a single cluster badge
   * Validates: Requirements 4.1
   */
  it('should display EntityCluster when more than 5 entities at same node', () => {
    // Create 6 entities at the same node
    const entities: StitchEntity[] = Array.from({ length: 6 }, (_, i) => ({
      id: `entity-${i}`,
      name: `Entity ${i}`,
      entity_type: 'lead' as const,
      current_node_id: 'node-1',
      current_section_id: 'section-1',
      canvas_id: mockCanvasId,
      run_id: 'run-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const positionMap = new Map(
      entities.map(e => [e.id, mockPosition])
    );

    vi.mocked(useEntities).mockReturnValue({
      entities,
      isLoading: false,
      error: null,
    });

    vi.mocked(useEntityPositions).mockReturnValue(positionMap);

    const { container } = render(<EntityOverlay canvasId={mockCanvasId} />);

    // Should render a cluster badge with count
    const clusterBadge = container.querySelector('.w-12.h-12.rounded-full');
    expect(clusterBadge).toBeTruthy();
    expect(clusterBadge?.textContent).toBe('6');

    // Should NOT render individual EntityDots
    const entityDots = container.querySelectorAll('.w-7.h-7.rounded-full');
    expect(entityDots.length).toBe(0);
  });

  /**
   * Property 13: Individual entity display threshold
   * For any node with 5 or fewer entities, the Canvas SHALL display individual entity dots
   * Validates: Requirements 4.4
   */
  it('should display individual EntityDots when 5 or fewer entities at same node', () => {
    // Create 5 entities at the same node
    const entities: StitchEntity[] = Array.from({ length: 5 }, (_, i) => ({
      id: `entity-${i}`,
      name: `Entity ${i}`,
      entity_type: 'lead' as const,
      current_node_id: 'node-1',
      current_section_id: 'section-1',
      canvas_id: mockCanvasId,
      run_id: 'run-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const positionMap = new Map(
      entities.map(e => [e.id, mockPosition])
    );

    vi.mocked(useEntities).mockReturnValue({
      entities,
      isLoading: false,
      error: null,
    });

    vi.mocked(useEntityPositions).mockReturnValue(positionMap);

    const { container } = render(<EntityOverlay canvasId={mockCanvasId} />);

    // Should render individual EntityDots
    const entityDots = container.querySelectorAll('.w-7.h-7.rounded-full');
    expect(entityDots.length).toBe(5);

    // Should NOT render a cluster badge
    const clusterBadge = container.querySelector('.w-12.h-12.rounded-full');
    expect(clusterBadge).toBeFalsy();
  });

  /**
   * Property 14: Cluster count reactivity
   * For any change in the number of entities at a node, the cluster count SHALL update
   * Validates: Requirements 4.5
   */
  it('should update cluster count when entities are added or removed', () => {
    // Start with 6 entities
    const initialEntities: StitchEntity[] = Array.from({ length: 6 }, (_, i) => ({
      id: `entity-${i}`,
      name: `Entity ${i}`,
      entity_type: 'lead' as const,
      current_node_id: 'node-1',
      current_section_id: 'section-1',
      canvas_id: mockCanvasId,
      run_id: 'run-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const positionMap = new Map(
      initialEntities.map(e => [e.id, mockPosition])
    );

    vi.mocked(useEntities).mockReturnValue({
      entities: initialEntities,
      isLoading: false,
      error: null,
    });

    vi.mocked(useEntityPositions).mockReturnValue(positionMap);

    const { container, rerender } = render(<EntityOverlay canvasId={mockCanvasId} />);

    // Initial state: cluster with 6 entities
    let clusterBadge = container.querySelector('.w-12.h-12.rounded-full');
    expect(clusterBadge?.textContent).toBe('6');

    // Add 2 more entities (now 8 total)
    const updatedEntities: StitchEntity[] = Array.from({ length: 8 }, (_, i) => ({
      id: `entity-${i}`,
      name: `Entity ${i}`,
      entity_type: 'lead' as const,
      current_node_id: 'node-1',
      current_section_id: 'section-1',
      canvas_id: mockCanvasId,
      run_id: 'run-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const updatedPositionMap = new Map(
      updatedEntities.map(e => [e.id, mockPosition])
    );

    vi.mocked(useEntities).mockReturnValue({
      entities: updatedEntities,
      isLoading: false,
      error: null,
    });

    vi.mocked(useEntityPositions).mockReturnValue(updatedPositionMap);

    rerender(<EntityOverlay canvasId={mockCanvasId} />);

    // Updated state: cluster with 8 entities
    clusterBadge = container.querySelector('.w-12.h-12.rounded-full');
    expect(clusterBadge?.textContent).toBe('8');
  });

  it('should handle multiple nodes with different clustering states', () => {
    // Node 1: 7 entities (should cluster)
    // Node 2: 3 entities (should show individual dots)
    const entities: StitchEntity[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `entity-node1-${i}`,
        name: `Entity Node1 ${i}`,
        entity_type: 'lead' as const,
        current_node_id: 'node-1',
        current_section_id: 'section-1',
        canvas_id: mockCanvasId,
        run_id: 'run-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `entity-node2-${i}`,
        name: `Entity Node2 ${i}`,
        entity_type: 'customer' as const,
        current_node_id: 'node-2',
        current_section_id: 'section-1',
        canvas_id: mockCanvasId,
        run_id: 'run-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    ];

    const positionMap = new Map(
      entities.map(e => [e.id, e.current_node_id === 'node-1' ? { x: 100, y: 100 } : { x: 200, y: 200 }])
    );

    vi.mocked(useEntities).mockReturnValue({
      entities,
      isLoading: false,
      error: null,
    });

    vi.mocked(useEntityPositions).mockReturnValue(positionMap);

    const { container } = render(<EntityOverlay canvasId={mockCanvasId} />);

    // Should have 1 cluster badge (for node-1 with 7 entities)
    const clusterBadges = container.querySelectorAll('.w-12.h-12.rounded-full');
    expect(clusterBadges.length).toBe(1);
    expect(clusterBadges[0].textContent).toBe('7');

    // Should have 3 individual dots (for node-2 with 3 entities)
    const entityDots = container.querySelectorAll('.w-7.h-7.rounded-full');
    expect(entityDots.length).toBe(3);
  });

  it('should transition from cluster to individual dots when count drops to 5', () => {
    // Start with 6 entities (cluster)
    const initialEntities: StitchEntity[] = Array.from({ length: 6 }, (_, i) => ({
      id: `entity-${i}`,
      name: `Entity ${i}`,
      entity_type: 'lead' as const,
      current_node_id: 'node-1',
      current_section_id: 'section-1',
      canvas_id: mockCanvasId,
      run_id: 'run-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const positionMap = new Map(
      initialEntities.map(e => [e.id, mockPosition])
    );

    vi.mocked(useEntities).mockReturnValue({
      entities: initialEntities,
      isLoading: false,
      error: null,
    });

    vi.mocked(useEntityPositions).mockReturnValue(positionMap);

    const { container, rerender } = render(<EntityOverlay canvasId={mockCanvasId} />);

    // Initial: cluster
    let clusterBadge = container.querySelector('.w-12.h-12.rounded-full');
    expect(clusterBadge).toBeTruthy();

    // Remove 1 entity (now 5 total - should show individual dots)
    const updatedEntities = initialEntities.slice(0, 5);
    const updatedPositionMap = new Map(
      updatedEntities.map(e => [e.id, mockPosition])
    );

    vi.mocked(useEntities).mockReturnValue({
      entities: updatedEntities,
      isLoading: false,
      error: null,
    });

    vi.mocked(useEntityPositions).mockReturnValue(updatedPositionMap);

    rerender(<EntityOverlay canvasId={mockCanvasId} />);

    // Updated: individual dots
    clusterBadge = container.querySelector('.w-12.h-12.rounded-full');
    expect(clusterBadge).toBeFalsy();

    const entityDots = container.querySelectorAll('.w-7.h-7.rounded-full');
    expect(entityDots.length).toBe(5);
  });
});
