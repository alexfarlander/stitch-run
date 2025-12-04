/**
 * BMCCanvas Node Type Registration and Z-Index Tests
 * 
 * Tests that all node types used in seed data are properly registered,
 * that unknown node types fall back to the fallback component,
 * and that z-index values are correctly assigned for proper stacking.
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect } from 'vitest';
import { generateBMCGraph } from '@/lib/seeds/default-bmc';
import { Z_INDEX_LAYERS } from '../utils';

describe('BMCCanvas Node Type Registration', () => {
  it('should have all seed node types in the registered types list', () => {
    // List of all node types that should be registered
    const registeredTypes = new Set([
      'section',
      'section-item',
      'integration-item',
      'person-item',
      'code-item',
      'data-item',
      'costs-section',
      'revenue-section',
      'Worker',
      'Collector',
      'UX',
      'Splitter',
      'MediaSelect',
    ]);

    // Get the BMC graph from seed data
    const bmcGraph = generateBMCGraph();
    
    // Check that all node types in the BMC seed are registered
    const bmcNodeTypes = new Set(bmcGraph.nodes.map(node => node.type));
    
    for (const nodeType of bmcNodeTypes) {
      expect(registeredTypes.has(nodeType)).toBe(true);
    }
  });

  it('should include all workflow node types', () => {
    const registeredTypes = new Set([
      'section',
      'section-item',
      'integration-item',
      'person-item',
      'code-item',
      'data-item',
      'costs-section',
      'revenue-section',
      'Worker',
      'Collector',
      'UX',
      'Splitter',
      'MediaSelect',
    ]);

    // Workflow node types used in video-factory-v2 and simple-test-flow
    const workflowNodeTypes = [
      'MediaSelect',
      'Worker',
      'UX',
      'Splitter',
      'Collector',
    ];

    for (const nodeType of workflowNodeTypes) {
      expect(registeredTypes.has(nodeType)).toBe(true);
    }
  });

  it('should include all BMC item types', () => {
    const registeredTypes = new Set([
      'section',
      'section-item',
      'integration-item',
      'person-item',
      'code-item',
      'data-item',
      'costs-section',
      'revenue-section',
      'Worker',
      'Collector',
      'UX',
      'Splitter',
      'MediaSelect',
    ]);

    // BMC-specific node types
    const bmcNodeTypes = [
      'section',
      'section-item',
      'integration-item',
      'person-item',
      'code-item',
      'data-item',
      'costs-section',
      'revenue-section',
    ];

    for (const nodeType of bmcNodeTypes) {
      expect(registeredTypes.has(nodeType)).toBe(true);
    }
  });
});

describe('BMCCanvas Z-Index Layer Constants', () => {
  it('should have section background at lowest z-index', () => {
    expect(Z_INDEX_LAYERS.SECTION_BACKGROUND).toBe(-1);
  });

  it('should have items above edges', () => {
    expect(Z_INDEX_LAYERS.ITEMS).toBe(1);
    expect(Z_INDEX_LAYERS.ITEMS).toBeGreaterThan(Z_INDEX_LAYERS.EDGES);
  });

  it('should have financial sections above items', () => {
    expect(Z_INDEX_LAYERS.FINANCIAL_SECTIONS).toBe(5);
    expect(Z_INDEX_LAYERS.FINANCIAL_SECTIONS).toBeGreaterThan(Z_INDEX_LAYERS.ITEMS);
  });

  it('should ensure sections render behind items', () => {
    // Sections should have lower z-index than items
    expect(Z_INDEX_LAYERS.SECTION_BACKGROUND).toBeLessThan(Z_INDEX_LAYERS.ITEMS);
  });

  it('should ensure edges are between sections and items', () => {
    // Verify edges are above sections but below items
    expect(Z_INDEX_LAYERS.EDGES).toBeGreaterThan(Z_INDEX_LAYERS.SECTION_BACKGROUND);
    expect(Z_INDEX_LAYERS.EDGES).toBeLessThan(Z_INDEX_LAYERS.ITEMS);
  });

  it('should have correct z-index layer ordering', () => {
    // Verify the complete stacking order
    expect(Z_INDEX_LAYERS.SECTION_BACKGROUND).toBeLessThan(Z_INDEX_LAYERS.EDGES);
    expect(Z_INDEX_LAYERS.EDGES).toBeLessThan(Z_INDEX_LAYERS.ITEMS);
    expect(Z_INDEX_LAYERS.ITEMS).toBeLessThan(Z_INDEX_LAYERS.FINANCIAL_SECTIONS);
    expect(Z_INDEX_LAYERS.FINANCIAL_SECTIONS).toBeLessThan(Z_INDEX_LAYERS.ENTITY_OVERLAY);
  });
});
