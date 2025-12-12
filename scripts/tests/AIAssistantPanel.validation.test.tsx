/**
 * AI Assistant Panel Validation Integration Tests
 * 
 * Tests that the AI Assistant Panel properly validates graph updates
 * and displays error messages for invalid operations.
 * 
 * Requirements: 9.3, 9.4, 9.5, 20.4, 20.5
 */

import { describe, it, expect } from 'vitest';
import { validateGraphUpdate, formatValidationErrors } from '@/lib/ai/validation';
import type { Node, Edge } from '@xyflow/react';

describe('AIAssistantPanel - Validation Integration', () => {
  const existingNodes: Node[] = [
    {
      id: 'node1',
      type: 'worker',
      position: { x: 0, y: 0 },
      data: { workerType: 'claude' }
    }
  ];

  it('should validate and accept valid graph updates from AI', () => {
    /**
     * Property 31: AI worker type validation
     * Property 32: AI edge validation
     * Validates: Requirements 9.3, 9.4
     */
    const validGraph = {
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
          source: 'node1',
          target: 'new1'
        }
      ]
    };

    const result = validateGraphUpdate(validGraph, existingNodes);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject graph updates with invalid worker types', () => {
    /**
     * Property 31: AI worker type validation
     * For any node created by the AI, the worker type SHALL exist in the WORKER_DEFINITIONS registry.
     * Validates: Requirements 9.3
     */
    const invalidGraph = {
      nodes: [
        {
          id: 'new1',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { workerType: 'invalid-worker-type' }
        }
      ],
      edges: []
    };

    const result = validateGraphUpdate(invalidGraph, existingNodes);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Invalid worker type');
    expect(result.errors[0].message).toContain('invalid-worker-type');
  });

  it('should reject graph updates with invalid edge connections', () => {
    /**
     * Property 32: AI edge validation
     * For any edge created by the AI, both the source and target nodes SHALL exist in the canvas.
     * Validates: Requirements 9.4
     */
    const invalidGraph = {
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
          source: 'nonexistent-node',
          target: 'new1'
        }
      ]
    };

    const result = validateGraphUpdate(invalidGraph, existingNodes);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('non-existent source node');
  });

  it('should collect and format multiple validation errors', () => {
    /**
     * Validates: Requirements 9.5
     * Display error messages in chat for invalid operations
     */
    const invalidGraph = {
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
          source: 'nonexistent',
          target: 'new1'
        }
      ]
    };

    const result = validateGraphUpdate(invalidGraph, existingNodes);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    
    // Format errors for display
    const errorMessage = formatValidationErrors(result.errors);
    expect(errorMessage).toContain('Invalid worker type');
    expect(errorMessage).toContain('non-existent');
    expect(errorMessage).toContain('Please try again');
  });

  it('should validate edges connecting new nodes to each other', () => {
    /**
     * Property 32: AI edge validation
     * Edges can connect new nodes to existing nodes or new nodes to each other
     */
    const validGraph = {
      nodes: [
        {
          id: 'new1',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { workerType: 'minimax' }
        },
        {
          id: 'new2',
          type: 'worker',
          position: { x: 200, y: 0 },
          data: { workerType: 'elevenlabs' }
        }
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'new1'
        },
        {
          id: 'edge2',
          source: 'new1',
          target: 'new2'
        }
      ]
    };

    const result = validateGraphUpdate(validGraph, existingNodes);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate nodes with missing worker types', () => {
    /**
     * Property 31: AI worker type validation
     * Nodes must have a worker type specified
     */
    const invalidGraph = {
      nodes: [
        {
          id: 'new1',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: {}
        }
      ],
      edges: []
    };

    const result = validateGraphUpdate(invalidGraph, existingNodes);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('missing a worker type');
  });

  it('should validate all worker types from registry', () => {
    /**
     * Property 31: AI worker type validation
     * Test all valid worker types are accepted
     */
    const validWorkerTypes = ['claude', 'minimax', 'elevenlabs', 'shotstack'];
    
    for (const workerType of validWorkerTypes) {
      const graph = {
        nodes: [
          {
            id: `new-${workerType}`,
            type: 'worker',
            position: { x: 100, y: 0 },
            data: { workerType }
          }
        ],
        edges: []
      };

      const result = validateGraphUpdate(graph, existingNodes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it('should provide helpful error messages with valid worker types list', () => {
    /**
     * Validates: Requirements 9.5
     * Error messages should be helpful and guide users to valid options
     */
    const invalidGraph = {
      nodes: [
        {
          id: 'new1',
          type: 'worker',
          position: { x: 100, y: 0 },
          data: { workerType: 'gpt-4' }
        }
      ],
      edges: []
    };

    const result = validateGraphUpdate(invalidGraph, existingNodes);
    
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('Valid types are:');
    expect(result.errors[0].message).toContain('claude');
    expect(result.errors[0].message).toContain('minimax');
  });
});
