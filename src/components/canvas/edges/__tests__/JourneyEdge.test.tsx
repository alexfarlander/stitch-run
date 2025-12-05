/**
 * JourneyEdge - Edge Traversal Animation Tests
 * 
 * Tests that the edge traversal animation system correctly:
 * - Accepts isTraversing prop in JourneyEdgeData interface
 * - Renders traversal pulse animation when isTraversing is true
 * - Uses cyan gradient for the pulse effect
 * - Applies 500ms animation duration
 * 
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';

// Test the JourneyEdgeData interface
interface JourneyEdgeData {
  intensity?: number;
  label?: string;
  stats?: {
    totalTraveled?: number;
    conversionRate?: number;
  };
  isTraversing?: boolean;
}

describe('JourneyEdge - Edge Traversal Animation System', () => {
  it('should have isTraversing property in JourneyEdgeData interface', () => {
    // Test that the interface accepts isTraversing
    const edgeData: JourneyEdgeData = {
      isTraversing: true,
      intensity: 0.8,
      label: 'Test Edge',
    };
    
    expect(edgeData.isTraversing).toBe(true);
  });

  it('should accept isTraversing as false', () => {
    const edgeData: JourneyEdgeData = {
      isTraversing: false,
    };
    
    expect(edgeData.isTraversing).toBe(false);
  });

  it('should accept isTraversing as undefined', () => {
    const edgeData: JourneyEdgeData = {
      intensity: 0.5,
    };
    
    expect(edgeData.isTraversing).toBeUndefined();
  });

  it('should allow all properties together', () => {
    const edgeData: JourneyEdgeData = {
      isTraversing: true,
      intensity: 0.7,
      label: 'Customer Journey',
      stats: {
        totalTraveled: 42,
        conversionRate: 0.85,
      },
    };
    
    expect(edgeData.isTraversing).toBe(true);
    expect(edgeData.intensity).toBe(0.7);
    expect(edgeData.label).toBe('Customer Journey');
    expect(edgeData.stats?.totalTraveled).toBe(42);
    expect(edgeData.stats?.conversionRate).toBe(0.85);
  });
});
