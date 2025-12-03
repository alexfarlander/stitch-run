/**
 * Unit tests for PersonItem component
 */

import { describe, it, expect } from 'vitest';
import { PersonItem } from '../PersonItem';

describe('PersonItem Component', () => {
  it('should be defined and exportable', () => {
    expect(PersonItem).toBeDefined();
    expect(typeof PersonItem).toBe('object');
  });

  it('should have correct display name', () => {
    expect(PersonItem.displayName).toBe('PersonItem');
  });
});
