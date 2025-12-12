import { describe, it, expect } from 'vitest';
import { extractValue } from '../json-path';

describe('extractValue', () => {
  const testPayload = {
    customer: {
      name: 'Alice',
      email: 'alice@example.com',
      metadata: {
        plan: 'premium'
      }
    },
    items: [
      { id: 'item1', price: 100 },
      { id: 'item2', price: 200 }
    ],
    amount: 300
  };

  it('should extract top-level field', () => {
    expect(extractValue(testPayload, '$.amount')).toBe(300);
  });

  it('should extract nested field', () => {
    expect(extractValue(testPayload, '$.customer.name')).toBe('Alice');
    expect(extractValue(testPayload, '$.customer.email')).toBe('alice@example.com');
  });

  it('should extract deeply nested field', () => {
    expect(extractValue(testPayload, '$.customer.metadata.plan')).toBe('premium');
  });

  it('should extract array element by index', () => {
    expect(extractValue(testPayload, '$.items[0].id')).toBe('item1');
    expect(extractValue(testPayload, '$.items[1].price')).toBe(200);
  });

  it('should return undefined for missing paths', () => {
    expect(extractValue(testPayload, '$.missing')).toBeUndefined();
    expect(extractValue(testPayload, '$.customer.missing')).toBeUndefined();
    expect(extractValue(testPayload, '$.items[5]')).toBeUndefined();
  });

  it('should return static string values', () => {
    expect(extractValue(testPayload, 'customer')).toBe('customer');
    expect(extractValue(testPayload, 'static-value')).toBe('static-value');
  });

  it('should handle null and undefined gracefully', () => {
    const nullPayload = { data: null };
    expect(extractValue(nullPayload, '$.data.field')).toBeUndefined();
  });

  it('should handle array access on non-arrays', () => {
    expect(extractValue(testPayload, '$.customer[0]')).toBeUndefined();
  });
});
