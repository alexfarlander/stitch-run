import { describe, it, expect } from 'vitest';
import { isValidTransition, validateTransition } from '../status-transitions';
import type { NodeStatus } from '@/types/stitch';

describe('status-transitions', () => {
  it('allows idempotent transitions (status -> same status)', () => {
    const statuses: NodeStatus[] = [
      'pending',
      'running',
      'completed',
      'failed',
      'waiting_for_user',
    ];

    for (const s of statuses) {
      expect(isValidTransition(s, s)).toBe(true);
      expect(() => validateTransition(s, s)).not.toThrow();
    }
  });

  it('allows waiting_for_user -> completed (UX completion)', () => {
    expect(isValidTransition('waiting_for_user', 'completed')).toBe(true);
    expect(() => validateTransition('waiting_for_user', 'completed')).not.toThrow();
  });

  it('allows failed -> pending (retry reset)', () => {
    expect(isValidTransition('failed', 'pending')).toBe(true);
    expect(() => validateTransition('failed', 'pending')).not.toThrow();
  });

  it('still rejects invalid transitions', () => {
    // pending cannot directly complete
    expect(isValidTransition('pending', 'completed')).toBe(false);
    expect(() => validateTransition('pending', 'completed')).toThrow();
  });
});



