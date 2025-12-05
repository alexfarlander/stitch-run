/**
 * Integration tests for animation synchronization
 * 
 * Verifies that edge traversal and entity movement animations are synchronized.
 * 
 * Requirements: 17.1, 17.2, 17.4, 17.5
 * Properties: 47, 48, 49
 */

import { describe, it, expect } from 'vitest';
import { 
  ENTITY_TRAVEL_DURATION_SECONDS,
  ENTITY_TRAVEL_DURATION_MS,
  getAnimationDuration,
  areAnimationsEnabled,
} from '../../../lib/canvas/animation-config';

describe('Animation Synchronization', () => {
  describe('Property 47: Animation synchronization start', () => {
    it('should use the same duration constant for both animations', () => {
      // For any entity movement, the edge traversal animation SHALL start 
      // at the same time as the entity animation.
      // 
      // This is verified by both animations using the same duration constant
      
      // Edge traversal uses ENTITY_TRAVEL_DURATION_MS (imported in useEdgeTraversal)
      // Entity movement uses ENTITY_TRAVEL_DURATION_SECONDS (imported in EntityDot)
      
      // Verify they are synchronized
      expect(ENTITY_TRAVEL_DURATION_MS).toBe(ENTITY_TRAVEL_DURATION_SECONDS * 1000);
      expect(ENTITY_TRAVEL_DURATION_SECONDS).toBe(2);
      expect(ENTITY_TRAVEL_DURATION_MS).toBe(2000);
    });
  });

  describe('Property 48: Animation synchronization end', () => {
    it('should complete both animations at the same time', () => {
      // For any entity movement, the edge traversal animation SHALL complete 
      // at the same time as the entity animation.
      
      // Both animations use the same duration
      const entityDuration = ENTITY_TRAVEL_DURATION_SECONDS;
      const edgeDuration = ENTITY_TRAVEL_DURATION_MS / 1000;
      
      expect(entityDuration).toBe(edgeDuration);
      expect(entityDuration).toBe(2);
    });

    it('should have matching animation timing', () => {
      // Verify the durations are exactly equal
      const entityDurationMs = ENTITY_TRAVEL_DURATION_SECONDS * 1000;
      const edgeDurationMs = ENTITY_TRAVEL_DURATION_MS;
      
      expect(entityDurationMs).toBe(edgeDurationMs);
    });
  });

  describe('Property 49: Cinematic mode duration consistency', () => {
    it('should use configured duration for both animations', () => {
      // For any entity movement in cinematic mode, both the entity and edge 
      // animations SHALL use the configured duration.
      
      const isMovingAlongEdge = true;
      const duration = getAnimationDuration(isMovingAlongEdge);
      
      // Should return the standard travel duration
      expect(duration).toBe(ENTITY_TRAVEL_DURATION_SECONDS);
      expect(duration).toBe(2);
    });

    it('should support custom cinematic durations', () => {
      const customConfig = {
        enabled: true,
        travelDuration: 3,
        jumpDuration: 1,
      };
      
      const travelDuration = getAnimationDuration(true, customConfig);
      const jumpDuration = getAnimationDuration(false, customConfig);
      
      expect(travelDuration).toBe(3);
      expect(jumpDuration).toBe(1);
    });
  });

  describe('Requirement 17.5: Animation disabling', () => {
    it('should disable both entity and edge animations', () => {
      // When animations are disabled, both entity and edge animations 
      // should be skipped
      
      const disabledConfig = {
        enabled: false,
        travelDuration: 2,
        jumpDuration: 0.5,
      };
      
      expect(areAnimationsEnabled(disabledConfig)).toBe(false);
      expect(getAnimationDuration(true, disabledConfig)).toBe(0);
      expect(getAnimationDuration(false, disabledConfig)).toBe(0);
    });

    it('should enable both animations when enabled', () => {
      const enabledConfig = {
        enabled: true,
        travelDuration: 2,
        jumpDuration: 0.5,
      };
      
      expect(areAnimationsEnabled(enabledConfig)).toBe(true);
      expect(getAnimationDuration(true, enabledConfig)).toBeGreaterThan(0);
      expect(getAnimationDuration(false, enabledConfig)).toBeGreaterThan(0);
    });
  });

  describe('Duration Consistency Across Components', () => {
    it('should maintain consistent durations for edge and entity', () => {
      // This test verifies that the durations used by different components
      // are derived from the same source constants
      
      // EntityDot uses ENTITY_TRAVEL_DURATION_SECONDS
      const entityDuration = ENTITY_TRAVEL_DURATION_SECONDS;
      
      // useEdgeTraversal uses ENTITY_TRAVEL_DURATION_MS
      const edgeDuration = ENTITY_TRAVEL_DURATION_MS;
      
      // Convert to same unit and compare
      expect(entityDuration * 1000).toBe(edgeDuration);
    });

    it('should use 2 second duration for synchronized animations', () => {
      // Verify the standard duration is 2 seconds
      expect(ENTITY_TRAVEL_DURATION_SECONDS).toBe(2);
      expect(ENTITY_TRAVEL_DURATION_MS).toBe(2000);
    });
  });
});
