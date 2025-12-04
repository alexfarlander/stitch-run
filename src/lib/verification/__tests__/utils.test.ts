/**
 * Tests for verification utilities
 */

import { describe, it, expect } from 'vitest';
import {
  createError,
  createWarning,
  createEmptyResult,
  runChecks,
  mergeResults,
  filterErrorsByType,
  groupErrorsByType,
  countErrorsByType,
} from '../utils';
import { VerificationCheck } from '../types';

describe('Verification Utils', () => {
  describe('createError', () => {
    it('should create a verification error with type and message', () => {
      const error = createError('foreign_key', 'Invalid foreign key reference');
      
      expect(error.type).toBe('foreign_key');
      expect(error.message).toBe('Invalid foreign key reference');
      expect(error.context).toBeUndefined();
    });

    it('should create a verification error with context', () => {
      const error = createError(
        'node_type',
        'Unknown node type',
        { nodeId: 'node-1', nodeType: 'unknown' }
      );
      
      expect(error.type).toBe('node_type');
      expect(error.message).toBe('Unknown node type');
      expect(error.context).toEqual({ nodeId: 'node-1', nodeType: 'unknown' });
    });
  });

  describe('createWarning', () => {
    it('should create a verification warning', () => {
      const warning = createWarning('deprecated', 'Using deprecated field');
      
      expect(warning.type).toBe('deprecated');
      expect(warning.message).toBe('Using deprecated field');
    });
  });

  describe('createEmptyResult', () => {
    it('should create an empty result with passed status', () => {
      const result = createEmptyResult();
      
      expect(result.passed).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.summary.totalChecks).toBe(0);
      expect(result.summary.passedChecks).toBe(0);
      expect(result.summary.failedChecks).toBe(0);
    });
  });

  describe('runChecks', () => {
    it('should run all checks and aggregate results', async () => {
      const checks: VerificationCheck[] = [
        {
          name: 'Check 1',
          description: 'First check',
          run: async () => [],
        },
        {
          name: 'Check 2',
          description: 'Second check',
          run: async () => [createError('foreign_key', 'Error in check 2')],
        },
        {
          name: 'Check 3',
          description: 'Third check',
          run: async () => [],
        },
      ];

      const result = await runChecks(checks);

      expect(result.summary.totalChecks).toBe(3);
      expect(result.summary.passedChecks).toBe(2);
      expect(result.summary.failedChecks).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.passed).toBe(false);
    });

    it('should handle check exceptions', async () => {
      const checks: VerificationCheck[] = [
        {
          name: 'Failing Check',
          description: 'This check throws',
          run: async () => {
            throw new Error('Check failed');
          },
        },
      ];

      const result = await runChecks(checks);

      expect(result.summary.totalChecks).toBe(1);
      expect(result.summary.failedChecks).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Check failed');
    });
  });

  describe('mergeResults', () => {
    it('should merge multiple verification results', () => {
      const result1 = createEmptyResult();
      result1.errors.push(createError('foreign_key', 'Error 1'));
      result1.summary.totalChecks = 2;
      result1.summary.passedChecks = 1;
      result1.summary.failedChecks = 1;
      result1.passed = false;

      const result2 = createEmptyResult();
      result2.errors.push(createError('node_type', 'Error 2'));
      result2.summary.totalChecks = 3;
      result2.summary.passedChecks = 2;
      result2.summary.failedChecks = 1;
      result2.passed = false;

      const merged = mergeResults([result1, result2]);

      expect(merged.errors).toHaveLength(2);
      expect(merged.summary.totalChecks).toBe(5);
      expect(merged.summary.passedChecks).toBe(3);
      expect(merged.summary.failedChecks).toBe(2);
      expect(merged.passed).toBe(false);
    });
  });

  describe('filterErrorsByType', () => {
    it('should filter errors by type', () => {
      const errors = [
        createError('foreign_key', 'FK Error 1'),
        createError('node_type', 'Node Error'),
        createError('foreign_key', 'FK Error 2'),
      ];

      const filtered = filterErrorsByType(errors, 'foreign_key');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].message).toBe('FK Error 1');
      expect(filtered[1].message).toBe('FK Error 2');
    });
  });

  describe('groupErrorsByType', () => {
    it('should group errors by type', () => {
      const errors = [
        createError('foreign_key', 'FK Error 1'),
        createError('node_type', 'Node Error'),
        createError('foreign_key', 'FK Error 2'),
        createError('topology', 'Topology Error'),
      ];

      const grouped = groupErrorsByType(errors);

      expect(grouped.foreign_key).toHaveLength(2);
      expect(grouped.node_type).toHaveLength(1);
      expect(grouped.topology).toHaveLength(1);
    });
  });

  describe('countErrorsByType', () => {
    it('should count errors by type', () => {
      const errors = [
        createError('foreign_key', 'FK Error 1'),
        createError('node_type', 'Node Error'),
        createError('foreign_key', 'FK Error 2'),
        createError('foreign_key', 'FK Error 3'),
      ];

      const counts = countErrorsByType(errors);

      expect(counts.foreign_key).toBe(3);
      expect(counts.node_type).toBe(1);
    });
  });
});
