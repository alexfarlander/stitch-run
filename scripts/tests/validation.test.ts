/**
 * AI Graph Validation Tests
 * 
 * Tests validation of AI-generated graph updates to ensure they use valid
 * worker types and connect to existing nodes.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

import { describe, it, expect } from 'vitest';
import {
  validateWorkerTypes,
  validateEdgeConnections,
  validateGraphUpdate,
  formatValidationErrors
} from '../validation';
import type { Node, Edge } from '@xyflow/react';

describe('AI Graph Validation', () => {
  describe('validateWorkerTypes', () => {
    it('should pass validation for valid worker types', () => {
      const nodes: Node[] = [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { workerType: 'claude' }
        },
        {
          id: 'node2',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { workerType: 'minimax' }
        }
      ];

      const result = validateWorkerTypes(nodes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid worker types', () => {
      const nodes: Node[] = [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { workerType: 'invalid-worker' }
        }
      ];

      const result = validateWorkerTypes(nodes);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid worker type');
      expect(result.errors[0].message).toContain('invalid-worker');
    });

    it('should fail validation for nodes missing worker type', () => {
      const nodes: Node[] = [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: {}
        }
      ];

      const result = validateWorkerTypes(nodes);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('missing a worker type');
    });

    it('should validate multiple nodes and collect all errors', () => {
      const nodes: Node[] = [
        {
          id: 'node1',
          type: 'worker',
          position: { x: 0, y: 0 },
          data: { workerType: 'invalid1' }
        },
        {
          id: 'node2',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { workerType: 'invalid2' }
        },
        {
          id: 'node3',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: {}
        }
      ];

      const result = validateWorkerTypes(nodes);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('validateEdgeConnections', () => {
    const existingNodes: Node[] = [
      {
        id: 'existing1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { workerType: 'claude' }
      },
      {
        id: 'existing2',
        type: 'worker',
        position: { x: 100, y: 0 },
        data: { workerType: 'minimax' }
      }
    ];

    it('should pass validation for edges connecting to existing nodes', () => {
      const edges: Edge[] = [
        {
          id: 'edge1',
          source: 'existing1',
          target: 'existing2'
        }
      ];

      const result = validateEdgeConnections(edges, existingNodes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for edges connecting to new nodes', () => {
      const newNodes: Node[] = [
        {
          id: 'new1',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { workerType: 'elevenlabs' }
        }
      ];

      const edges: Edge[] = [
        {
          id: 'edge1',
          source: 'existing1',
          target: 'new1'
        }
      ];

      const result = validateEdgeConnections(edges, existingNodes, newNodes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for edges with non-existent source', () => {
      const edges: Edge[] = [
        {
          id: 'edge1',
          source: 'nonexistent',
          target: 'existing1'
        }
      ];

      const result = validateEdgeConnections(edges, existingNodes);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('non-existent source node');
    });

    it('should fail validation for edges with non-existent target', () => {
      const edges: Edge[] = [
        {
          id: 'edge1',
          source: 'existing1',
          target: 'nonexistent'
        }
      ];

      const result = validateEdgeConnections(edges, existingNodes);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('non-existent target node');
    });

    it('should fail validation for edges missing source or target', () => {
      const edges: Edge[] = [
        {
          id: 'edge1',
          source: '',
          target: 'existing1'
        },
        {
          id: 'edge2',
          source: 'existing1',
          target: ''
        }
      ];

      const result = validateEdgeConnections(edges, existingNodes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate multiple edges and collect all errors', () => {
      const edges: Edge[] = [
        {
          id: 'edge1',
          source: 'nonexistent1',
          target: 'existing1'
        },
        {
          id: 'edge2',
          source: 'existing1',
          target: 'nonexistent2'
        }
      ];

      const result = validateEdgeConnections(edges, existingNodes);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateGraphUpdate', () => {
    const existingNodes: Node[] = [
      {
        id: 'existing1',
        type: 'worker',
        position: { x: 0, y: 0 },
        data: { workerType: 'claude' }
      }
    ];

    it('should pass validation for valid graph update', () => {
      const graph = {
        nodes: [
          {
            id: 'new1',
            type: 'worker',
            position: { x: 100, y: 0 },
            data: { workerType: 'minimax' }
          }
        ],
        edges: [
          {
            id: 'edge1',
            source: 'existing1',
            target: 'new1'
          }
        ]
      };

      const result = validateGraphUpdate(graph, existingNodes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid worker types and edges', () => {
      const graph = {
        nodes: [
          {
            id: 'new1',
            type: 'worker',
            position: { x: 100, y: 0 },
            data: { workerType: 'invalid-worker' }
          }
        ],
        edges: [
          {
            id: 'edge1',
            source: 'existing1',
            target: 'nonexistent'
          }
        ]
      };

      const result = validateGraphUpdate(graph, existingNodes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect all validation errors from both worker types and edges', () => {
      const graph = {
        nodes: [
          {
            id: 'new1',
            type: 'worker',
            position: { x: 100, y: 0 },
            data: { workerType: 'invalid1' }
          },
          {
            id: 'new2',
            type: 'worker',
            position: { x: 200, y: 0 },
            data: {}
          }
        ],
        edges: [
          {
            id: 'edge1',
            source: 'nonexistent1',
            target: 'new1'
          },
          {
            id: 'edge2',
            source: 'new1',
            target: 'nonexistent2'
          }
        ]
      };

      const result = validateGraphUpdate(graph, existingNodes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('formatValidationErrors', () => {
    it('should return empty string for no errors', () => {
      const result = formatValidationErrors([]);
      expect(result).toBe('');
    });

    it('should format single error', () => {
      const errors = [
        {
          field: 'node.1.workerType',
          message: 'Invalid worker type'
        }
      ];

      const result = formatValidationErrors(errors);
      expect(result).toContain('Invalid worker type');
      expect(result).toContain('•');
    });

    it('should format multiple errors', () => {
      const errors = [
        {
          field: 'node.1.workerType',
          message: 'Invalid worker type "invalid1"'
        },
        {
          field: 'edge.1.source',
          message: 'Non-existent source node'
        }
      ];

      const result = formatValidationErrors(errors);
      expect(result).toContain('Invalid worker type');
      expect(result).toContain('Non-existent source node');
      expect(result.split('•').length - 1).toBe(2);
    });

    it('should include helpful message about trying again', () => {
      const errors = [
        {
          field: 'node.1.workerType',
          message: 'Invalid worker type'
        }
      ];

      const result = formatValidationErrors(errors);
      expect(result).toContain('Please try again');
    });
  });
});
