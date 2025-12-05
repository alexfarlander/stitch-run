/**
 * Node status transition validation using state machine
 * Prevents invalid status transitions and ensures workflow integrity
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { NodeStatus } from '@/types/stitch';

/**
 * Valid status transitions for each node status
 * Defines the state machine for node execution
 */
export const VALID_TRANSITIONS: Record<NodeStatus, NodeStatus[]> = {
  'pending': ['running'],
  'running': ['completed', 'failed', 'waiting_for_user'],
  'completed': [], // Terminal state - no transitions allowed
  'failed': ['running'], // Allow retry by transitioning back to running
  'waiting_for_user': ['running'], // User provides input, resume execution
};

/**
 * Error thrown when an invalid status transition is attempted
 */
export class StatusTransitionError extends Error {
  constructor(
    public readonly from: NodeStatus,
    public readonly to: NodeStatus
  ) {
    super(`Invalid status transition from '${from}' to '${to}'`);
    this.name = 'StatusTransitionError';
  }
}

/**
 * Validate a status transition
 * @throws StatusTransitionError if transition is invalid
 * Requirements: 7.2, 7.5
 */
export function validateTransition(from: NodeStatus, to: NodeStatus): void {
  const validTargets = VALID_TRANSITIONS[from];
  
  // Guard against undefined if 'from' is invalid (e.g., database corruption)
  if (!validTargets || !validTargets.includes(to)) {
    throw new StatusTransitionError(from, to);
  }
}

/**
 * Check if a transition is valid without throwing
 * Requirements: 7.2
 */
export function isValidTransition(from: NodeStatus, to: NodeStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
