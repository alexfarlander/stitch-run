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
  // Retry semantics:
  // - failed -> running: immediate retry (fire node again)
  // - failed -> pending: reset for re-evaluation/scheduling (e.g., /retry endpoint)
  'failed': ['running', 'pending'],
  // UX semantics:
  // - waiting_for_user -> running: resume workflow by re-firing node
  // - waiting_for_user -> completed: user completed the gate and provided output
  'waiting_for_user': ['running', 'completed'],
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
  // Idempotent updates are allowed. This supports “progress writes” that keep the same status
  // (e.g., Collector updating tracking fields while remaining 'pending').
  if (from === to) {
    return;
  }

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
  if (from === to) {
    return true;
  }
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
