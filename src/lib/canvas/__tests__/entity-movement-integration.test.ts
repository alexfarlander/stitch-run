/**
 * Entity Movement Validation Integration Test
 * 
 * Tests that entity movement validation is properly integrated into
 * the canvas validation pipeline and compile-oeg process.
 * 
 * Requirements: 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';
import { compileToOEG } from '../compile-oeg';
import { VisualGraph } from '@/types/canvas-schema';

describe('Entity Movement Validation Integration', () => {
  it('should reject canvas with invalid entity movement during compilation (Requirement 10.4)', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'worker1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Worker',
            worker_type: 'claude',
            config: {},
            inputs: {},
            outputs: {},
            entityMovement: {
              onSuccess: {
                targetSectionId: 'non-existent-node',
                completeAs: 'success'
              }
            }
          }
        }
      ],
      edges: []
    };

    const result = compileToOEG(graph);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0].type).toBe('invalid_entity_movement');
    expect(result.errors![0].message).toContain('non-existent-node');
  });

  it('should reject canvas with invalid completeAs during compilation (Requirement 10.5)', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'worker1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Worker',
            worker_type: 'claude',
            config: {},
            inputs: {},
            outputs: {},
            entityMovement: {
              onSuccess: {
                targetSectionId: 'section1',
                completeAs: 'invalid-value' as unknown
              }
            }
          }
        },
        {
          id: 'section1',
          type: 'section',
          position: { x: 100, y: 0 },
          data: {
            label: 'Section 1',
            inputs: {},
            outputs: {}
          }
        }
      ],
      edges: []
    };

    const result = compileToOEG(graph);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0].type).toBe('invalid_entity_movement');
    expect(result.errors![0].message).toContain('invalid value');
  });

  it('should accept canvas with valid entity movement during compilation (Requirement 10.4, 10.5)', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'worker1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Worker',
            worker_type: 'claude',
            config: {},
            inputs: {},
            outputs: {},
            entityMovement: {
              onSuccess: {
                targetSectionId: 'section1',
                completeAs: 'success',
                setEntityType: 'customer'
              },
              onFailure: {
                targetSectionId: 'section2',
                completeAs: 'failure'
              }
            }
          }
        },
        {
          id: 'section1',
          type: 'section',
          position: { x: 100, y: 0 },
          data: {
            label: 'Section 1',
            inputs: {},
            outputs: {}
          }
        },
        {
          id: 'section2',
          type: 'section',
          position: { x: 200, y: 0 },
          data: {
            label: 'Section 2',
            inputs: {},
            outputs: {}
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'worker1',
          target: 'section1'
        }
      ]
    };

    const result = compileToOEG(graph);
    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();
  });

  it('should accept canvas without entity movement (optional feature)', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'worker1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {
            label: 'Worker',
            worker_type: 'claude',
            config: {},
            inputs: {},
            outputs: {}
            // No entityMovement - this is valid
          }
        }
      ],
      edges: []
    };

    const result = compileToOEG(graph);
    expect(result.success).toBe(true);
    expect(result.executionGraph).toBeDefined();
  });
});
