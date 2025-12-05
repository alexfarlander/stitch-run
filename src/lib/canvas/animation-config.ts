/**
 * Animation Configuration
 * 
 * Centralized configuration for canvas animations to ensure synchronization
 * between entity movement and edge traversal animations.
 * 
 * Requirements: 17.1, 17.2, 17.4, 17.5
 * Properties: 47, 48, 49
 */

/**
 * Default animation duration for entity movement along edges (in seconds)
 * This is used for both entity movement and edge traversal animations
 * to ensure they are perfectly synchronized.
 * 
 * Requirement 17.2: Both animations complete at the same time
 */
export const ENTITY_TRAVEL_DURATION_SECONDS = 2;

/**
 * Animation duration in milliseconds (for timeout-based operations)
 */
export const ENTITY_TRAVEL_DURATION_MS = ENTITY_TRAVEL_DURATION_SECONDS * 1000;

/**
 * Animation duration for node-to-node jumps (when no edge animation needed)
 */
export const NODE_JUMP_DURATION_SECONDS = 0.5;

/**
 * Cinematic mode configuration
 * Can be extended in the future to support different animation speeds
 */
export interface CinematicModeConfig {
  enabled: boolean;
  travelDuration: number; // in seconds
  jumpDuration: number; // in seconds
}

/**
 * Default cinematic mode configuration
 * 
 * Requirement 17.4: Use cinematic mode duration for both animations
 */
export const DEFAULT_CINEMATIC_CONFIG: Readonly<CinematicModeConfig> = Object.freeze({
  enabled: true,
  travelDuration: ENTITY_TRAVEL_DURATION_SECONDS,
  jumpDuration: NODE_JUMP_DURATION_SECONDS,
});

/**
 * Get the animation duration based on whether the entity is traveling along an edge
 * 
 * @param isMovingAlongEdge - Whether the entity is moving along an edge
 * @param config - Optional cinematic mode configuration
 * @returns Animation duration in seconds
 */
export function getAnimationDuration(
  isMovingAlongEdge: boolean,
  config: CinematicModeConfig = DEFAULT_CINEMATIC_CONFIG
): number {
  if (!config.enabled) {
    return 0; // Instant movement when animations disabled
  }
  
  return isMovingAlongEdge ? config.travelDuration : config.jumpDuration;
}

/**
 * Check if animations are enabled
 * 
 * Requirement 17.5: Handle animation disabling for both entity and edge
 */
export function areAnimationsEnabled(
  config: CinematicModeConfig = DEFAULT_CINEMATIC_CONFIG
): boolean {
  return config.enabled;
}
