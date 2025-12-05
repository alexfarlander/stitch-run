/**
 * Tests for animation configuration
 * 
 * Verifies that animation durations are properly synchronized between
 * entity movement and edge traversal animations.
 * 
 * Requirements: 17.1, 17.2, 17.4, 17.5
 * Properties: 47, 48, 49
 */

import { describe, it, expect } from 'vitest';
import {
  ENTITY_TRAVEL_DURATION_SECONDS,
  ENTITY_TRAVEL_DURATION_MS,
  NODE_JUMP_DURATION_SECONDS,
  DEFAULT_CINEMATIC_CONFIG,
  getAnimationDuration,
  areAnimationsEnabled,
} from '../animation-config';

describe('Animation Configuration', () => {
  describe('Duration Constants', () => {
    it('should have consistent duration values', () => {
      // Verify milliseconds matches seconds
      expect(ENTITY_TRAVEL_DURATION_MS).toBe(ENTITY_TRAVEL_DURATION_SECONDS * 1000);
    });

    it('should have travel duration of 2 seconds', () => {
      // Requirement 17.2: Both animations complete at the same time
      expect(ENTITY_TRAVEL_DURATION_SECONDS).toBe(2);
      expect(ENTITY_TRAVEL_DURATION_MS).toBe(2000);
    });

    it('should have jump duration of 0.5 seconds', () => {
      expect(NODE_JUMP_DURATION_SECONDS).toBe(0.5);
    });
  });

  describe('getAnimationDuration', () => {
    it('should return travel duration when moving along edge', () => {
      // Requirement 17.4: Use cinematic mode duration for both animations
      const duration = getAnimationDuration(true);
      expect(duration).toBe(ENTITY_TRAVEL_DURATION_SECONDS);
    });

    it('should return jump duration when not moving along edge', () => {
      const duration = getAnimationDuration(false);
      expect(duration).toBe(NODE_JUMP_DURATION_SECONDS);
    });

    it('should return 0 when animations are disabled', () => {
      // Requirement 17.5: Handle animation disabling for both entity and edge
      const _config = { ...DEFAULT_CINEMATIC_CONFIG, enabled: false };
      const travelDuration = getAnimationDuration(true, config);
      const jumpDuration = getAnimationDuration(false, config);
      
      expect(travelDuration).toBe(0);
      expect(jumpDuration).toBe(0);
    });

    it('should use custom duration from config', () => {
      const _config = {
        enabled: true,
        travelDuration: 3,
        jumpDuration: 1,
      };
      
      expect(getAnimationDuration(true, config)).toBe(3);
      expect(getAnimationDuration(false, config)).toBe(1);
    });
  });

  describe('areAnimationsEnabled', () => {
    it('should return true by default', () => {
      expect(areAnimationsEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const _config = { ...DEFAULT_CINEMATIC_CONFIG, enabled: false };
      expect(areAnimationsEnabled(config)).toBe(false);
    });

    it('should return true when explicitly enabled', () => {
      const _config = { ...DEFAULT_CINEMATIC_CONFIG, enabled: true };
      expect(areAnimationsEnabled(config)).toBe(true);
    });
  });

  describe('Default Cinematic Config', () => {
    it('should be enabled by default', () => {
      expect(DEFAULT_CINEMATIC_CONFIG.enabled).toBe(true);
    });

    it('should use standard travel duration', () => {
      expect(DEFAULT_CINEMATIC_CONFIG.travelDuration).toBe(ENTITY_TRAVEL_DURATION_SECONDS);
    });

    it('should use standard jump duration', () => {
      expect(DEFAULT_CINEMATIC_CONFIG.jumpDuration).toBe(NODE_JUMP_DURATION_SECONDS);
    });
  });
});
