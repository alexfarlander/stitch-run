/**
 * FallbackNode Tests
 * 
 * Tests the fallback component that renders when an unknown node type is encountered.
 * 
 * Validates: Requirements 6.2
 */

import { describe, it, expect } from 'vitest';
import { FallbackNode } from '../FallbackNode';

describe('FallbackNode', () => {
  it('should be defined and exportable', () => {
    expect(FallbackNode).toBeDefined();
    expect(typeof FallbackNode).toBe('object'); // memo returns an object
  });

  it('should have a displayName', () => {
    expect(FallbackNode.displayName).toBe('FallbackNode');
  });
});
