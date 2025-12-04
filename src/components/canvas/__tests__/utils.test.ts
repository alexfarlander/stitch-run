import { describe, it, expect } from 'vitest';
import { Node } from '@xyflow/react';
import { sortNodesForRendering, Z_INDEX_LAYERS } from '../utils';

describe('sortNodesForRendering', () => {
  it('should sort nodes by zIndex in ascending order', () => {
    const nodes: Node[] = [
      {
        id: 'item1',
        type: 'section-item',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: Z_INDEX_LAYERS.ITEMS },
      },
      {
        id: 'section1',
        type: 'section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: Z_INDEX_LAYERS.SECTION_BACKGROUND },
      },
      {
        id: 'financial1',
        type: 'costs-section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: Z_INDEX_LAYERS.FINANCIAL_SECTIONS },
      },
    ];

    const sorted = sortNodesForRendering(nodes);

    // Should be sorted: section (-1), financial (5), item (1)
    expect(sorted[0].id).toBe('section1');
    expect(sorted[0].style?.zIndex).toBe(Z_INDEX_LAYERS.SECTION_BACKGROUND);
    
    expect(sorted[1].id).toBe('item1');
    expect(sorted[1].style?.zIndex).toBe(Z_INDEX_LAYERS.ITEMS);
    
    expect(sorted[2].id).toBe('financial1');
    expect(sorted[2].style?.zIndex).toBe(Z_INDEX_LAYERS.FINANCIAL_SECTIONS);
  });

  it('should not mutate the original array', () => {
    const nodes: Node[] = [
      {
        id: 'item1',
        type: 'section-item',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: 10 },
      },
      {
        id: 'section1',
        type: 'section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: -1 },
      },
    ];

    const originalOrder = nodes.map(n => n.id);
    sortNodesForRendering(nodes);
    const afterSortOrder = nodes.map(n => n.id);

    expect(originalOrder).toEqual(afterSortOrder);
  });

  it('should handle nodes without explicit zIndex (defaults to 0)', () => {
    const nodes: Node[] = [
      {
        id: 'node1',
        type: 'Worker',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: 5 },
      },
      {
        id: 'node2',
        type: 'UX',
        position: { x: 0, y: 0 },
        data: {},
        // No style.zIndex - should default to 0
      },
      {
        id: 'node3',
        type: 'section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: -1 },
      },
    ];

    const sorted = sortNodesForRendering(nodes);

    expect(sorted[0].id).toBe('node3'); // zIndex: -1
    expect(sorted[1].id).toBe('node2'); // zIndex: 0 (default)
    expect(sorted[2].id).toBe('node1'); // zIndex: 5
  });

  it('should maintain stable sort for nodes with same zIndex', () => {
    const nodes: Node[] = [
      {
        id: 'item1',
        type: 'section-item',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: 1 },
      },
      {
        id: 'item2',
        type: 'integration-item',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: 1 },
      },
      {
        id: 'item3',
        type: 'person-item',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: 1 },
      },
    ];

    const sorted = sortNodesForRendering(nodes);

    // All have same zIndex, so order should be preserved
    expect(sorted[0].id).toBe('item1');
    expect(sorted[1].id).toBe('item2');
    expect(sorted[2].id).toBe('item3');
  });

  it('should handle empty array', () => {
    const nodes: Node[] = [];
    const sorted = sortNodesForRendering(nodes);
    expect(sorted).toEqual([]);
  });

  it('should handle single node', () => {
    const nodes: Node[] = [
      {
        id: 'node1',
        type: 'section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: -1 },
      },
    ];

    const sorted = sortNodesForRendering(nodes);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('node1');
  });

  it('should correctly order sections, items, and financial sections', () => {
    const nodes: Node[] = [
      {
        id: 'revenue',
        type: 'revenue-section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: Z_INDEX_LAYERS.FINANCIAL_SECTIONS },
      },
      {
        id: 'item',
        type: 'code-item',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: Z_INDEX_LAYERS.ITEMS },
      },
      {
        id: 'section',
        type: 'section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: Z_INDEX_LAYERS.SECTION_BACKGROUND },
      },
      {
        id: 'costs',
        type: 'costs-section',
        position: { x: 0, y: 0 },
        data: {},
        style: { zIndex: Z_INDEX_LAYERS.FINANCIAL_SECTIONS },
      },
    ];

    const sorted = sortNodesForRendering(nodes);

    // Expected order: section (-1), item (1), revenue (5), costs (5)
    expect(sorted[0].id).toBe('section');
    expect(sorted[0].style?.zIndex).toBe(-1);
    
    expect(sorted[1].id).toBe('item');
    expect(sorted[1].style?.zIndex).toBe(1);
    
    // Financial sections should be last (both have zIndex 5)
    expect([sorted[2].id, sorted[3].id]).toContain('revenue');
    expect([sorted[2].id, sorted[3].id]).toContain('costs');
  });
});

describe('Z_INDEX_LAYERS constants', () => {
  it('should have correct layer ordering', () => {
    expect(Z_INDEX_LAYERS.SECTION_BACKGROUND).toBeLessThan(Z_INDEX_LAYERS.EDGES);
    expect(Z_INDEX_LAYERS.EDGES).toBeLessThan(Z_INDEX_LAYERS.ITEMS);
    expect(Z_INDEX_LAYERS.ITEMS).toBeLessThan(Z_INDEX_LAYERS.FINANCIAL_SECTIONS);
    expect(Z_INDEX_LAYERS.FINANCIAL_SECTIONS).toBeLessThan(Z_INDEX_LAYERS.ENTITY_OVERLAY);
  });

  it('should have expected values', () => {
    expect(Z_INDEX_LAYERS.SECTION_BACKGROUND).toBe(-1);
    expect(Z_INDEX_LAYERS.EDGES).toBe(0);
    expect(Z_INDEX_LAYERS.ITEMS).toBe(1);
    expect(Z_INDEX_LAYERS.FINANCIAL_SECTIONS).toBe(5);
    expect(Z_INDEX_LAYERS.ENTITY_OVERLAY).toBe(100);
  });
});
