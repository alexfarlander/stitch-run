/**
 * Entity Movement Validation Tests
 * 
 * Tests validation of entity movement configuration on worker nodes.
 * Requirements: 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';
import { validateGraph, validateEntityMovement } from '../validate-graph';
import { VisualGraph } from '@/types/canvas-schema';

describe('Entity Movement Validation', () => {
  describe('validateEntityMovement', () => {
    it('should accept valid entity movement configuration (Requirement 10.4, 10.5)', () => {
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
                  completeAs: 'success'
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
        edges: []
      };

      const errors = validateEntityMovement(graph);
      expect(errors).toHaveLength(0);
    });

    it('should reject targetSectionId that references non-existent node (Requirement 10.4)', () => {
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

      const errors = validateEntityMovement(graph);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('invalid_entity_movement');
      expect(errors[0].message).toContain('non-existent-node');
      expect(errors[0].message).toContain('references non-existent node');
    });

    it('should reject missing targetSectionId (Requirement 10.4)', () => {
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
                  completeAs: 'success'
                }
              }
            }
          }
        ],
        edges: []
      };

      const errors = validateEntityMovement(graph);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('invalid_entity_movement');
      expect(errors[0].message).toContain('missing required "targetSectionId"');
    });

    it('should reject invalid completeAs value (Requirement 10.5)', () => {
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
                  completeAs: 'invalid-value'
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

      const errors = validateEntityMovement(graph);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('invalid_entity_movement');
      expect(errors[0].message).toContain('invalid value');
      expect(errors[0].message).toContain('success, failure, neutral');
    });

    it('should accept all valid completeAs values (Requirement 10.5)', () => {
      const validValues = ['success', 'failure', 'neutral'];

      for (const value of validValues) {
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
                    completeAs: value
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

        const errors = validateEntityMovement(graph);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject missing completeAs (Requirement 10.5)', () => {
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
                  targetSectionId: 'section1'
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

      const errors = validateEntityMovement(graph);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('invalid_entity_movement');
      expect(errors[0].message).toContain('missing required "completeAs"');
    });

    it('should accept valid setEntityType values (Requirement 10.5)', () => {
      const validEntityTypes = ['customer', 'churned', 'lead'];

      for (const entityType of validEntityTypes) {
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
                    setEntityType: entityType
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

        const errors = validateEntityMovement(graph);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid setEntityType value (Requirement 10.5)', () => {
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
                  setEntityType: 'invalid-type'
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

      const errors = validateEntityMovement(graph);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('invalid_entity_movement');
      expect(errors[0].message).toContain('invalid value');
      expect(errors[0].message).toContain('customer, churned, lead');
    });

    it('should allow setEntityType to be optional (Requirement 10.5)', () => {
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
                  completeAs: 'success'
                  // setEntityType is optional
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

      const errors = validateEntityMovement(graph);
      expect(errors).toHaveLength(0);
    });

    it('should validate both onSuccess and onFailure (Requirement 10.4, 10.5)', () => {
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
                  targetSectionId: 'non-existent-1',
                  completeAs: 'success'
                },
                onFailure: {
                  targetSectionId: 'non-existent-2',
                  completeAs: 'failure'
                }
              }
            }
          }
        ],
        edges: []
      };

      const errors = validateEntityMovement(graph);
      expect(errors.length).toBe(2);
      expect(errors[0].message).toContain('non-existent-1');
      expect(errors[1].message).toContain('non-existent-2');
    });

    it('should allow entityMovement to be optional', () => {
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

      const errors = validateEntityMovement(graph);
      expect(errors).toHaveLength(0);
    });

    it('should only validate worker nodes', () => {
      const graph: VisualGraph = {
        nodes: [
          {
            id: 'ux1',
            type: 'ux',
            position: { x: 0, y: 0 },
            data: {
              label: 'UX Node',
              inputs: {},
              outputs: {},
              entityMovement: {
                onSuccess: {
                  targetSectionId: 'non-existent',
                  completeAs: 'success'
                }
              }
            }
          }
        ],
        edges: []
      };

      const errors = validateEntityMovement(graph);
      // Should not validate non-worker nodes
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateGraph integration', () => {
    it('should include entity movement errors in validateGraph (Requirement 10.4, 10.5)', () => {
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
                  targetSectionId: 'non-existent',
                  completeAs: 'invalid-value'
                }
              }
            }
          }
        ],
        edges: []
      };

      const errors = validateGraph(graph);
      const entityMovementErrors = errors.filter(e => e.type === 'invalid_entity_movement');
      expect(entityMovementErrors.length).toBeGreaterThan(0);
    });
  });
});
