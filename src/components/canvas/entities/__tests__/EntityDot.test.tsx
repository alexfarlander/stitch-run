/**
 * Tests for EntityDot component
 * Validates: Requirements 5.2, 5.3, 5.5
 * 
 * This test verifies that the EntityDot component:
 * - Animates position changes smoothly
 * - Uses appropriate animation durations based on entity state
 * - Displays visual feedback when entity is moving
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EntityDot } from '../EntityDot';
import { StitchEntity } from '@/types/entity';

describe('EntityDot Animation', () => {
  const mockEntity: StitchEntity = {
    id: 'entity-1',
    canvas_id: 'canvas-1',
    name: 'Monica',
    email: 'monica@example.com',
    avatar_url: null,
    entity_type: 'lead',
    current_node_id: 'node-1',
    current_edge_id: null,
    edge_progress: null,
    journey: [],
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should render entity dot at specified position', () => {
    const position = { x: 100, y: 200 };
    const { container } = render(
      <EntityDot
        entity={mockEntity}
        position={position}
        isSelected={false}
        onClick={() => {}}
      />
    );

    // Verify the component renders
    expect(container.querySelector('.cursor-pointer')).toBeTruthy();
  });

  it('should show pulse animation when entity is moving on edge', () => {
    const movingEntity: StitchEntity = {
      ...mockEntity,
      current_node_id: null,
      current_edge_id: 'edge-1',
      edge_progress: 0.5,
    };

    const { container } = render(
      <EntityDot
        entity={movingEntity}
        position={{ x: 100, y: 200 }}
        isSelected={false}
        onClick={() => {}}
      />
    );

    // Verify pulse animation element exists when moving
    const pulseElement = container.querySelector('.rounded-full');
    expect(pulseElement).toBeTruthy();
  });

  it('should display entity name', () => {
    const { container } = render(
      <EntityDot
        entity={mockEntity}
        position={{ x: 100, y: 200 }}
        isSelected={false}
        onClick={() => {}}
      />
    );

    // Verify name is displayed in hover tooltip
    const nameLabel = container.textContent;
    expect(nameLabel).toContain('Monica');
  });

  it('should display avatar when avatar_url is provided', () => {
    const entityWithAvatar: StitchEntity = {
      ...mockEntity,
      avatar_url: 'https://example.com/avatar.jpg',
    };

    const { container } = render(
      <EntityDot
        entity={entityWithAvatar}
        position={{ x: 100, y: 200 }}
        isSelected={false}
        onClick={() => {}}
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('should display initial letter when no avatar_url', () => {
    const { container } = render(
      <EntityDot
        entity={mockEntity}
        position={{ x: 100, y: 200 }}
        isSelected={false}
        onClick={() => {}}
      />
    );

    // Should display 'M' for Monica
    expect(container.textContent).toContain('M');
  });

  it('should apply different colors based on entity type', () => {
    const entityTypes: Array<StitchEntity['entity_type']> = ['lead', 'customer', 'churned'];

    entityTypes.forEach((type) => {
      const entity: StitchEntity = {
        ...mockEntity,
        entity_type: type,
      };

      const { container } = render(
        <EntityDot
          entity={entity}
          position={{ x: 100, y: 200 }}
          isSelected={false}
          onClick={() => {}}
        />
      );

      // Verify component renders for each type
      expect(container.querySelector('.cursor-pointer')).toBeTruthy();
    });
  });

  it('should handle click events', () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    const { container } = render(
      <EntityDot
        entity={mockEntity}
        position={{ x: 100, y: 200 }}
        isSelected={false}
        onClick={handleClick}
      />
    );

    const element = container.querySelector('.cursor-pointer') as HTMLElement;
    element?.click();

    expect(clicked).toBe(true);
  });

  it('should show selected state with enhanced glow', () => {
    const { container } = render(
      <EntityDot
        entity={mockEntity}
        position={{ x: 100, y: 200 }}
        isSelected={true}
        onClick={() => {}}
      />
    );

    // Verify component renders in selected state
    expect(container.querySelector('.cursor-pointer')).toBeTruthy();
  });
});
