/**
 * Shared verification utilities
 * Provides helper functions for creating and aggregating verification results
 */

import {
  VerificationResult,
  VerificationError,
  VerificationWarning,
  VerificationCheck,
  VerificationErrorType,
  VerificationWarningType,
} from './types';

/**
 * Create a verification error
 */
export function createError(
  type: VerificationErrorType,
  message: string,
  context?: Record<string, unknown>
): VerificationError {
  return {
    type,
    message,
    context,
  };
}

/**
 * Create a verification warning
 */
export function createWarning(
  type: VerificationWarningType,
  message: string,
  context?: Record<string, unknown>
): VerificationWarning {
  return {
    type,
    message,
    context,
  };
}

/**
 * Create an empty verification result
 */
export function createEmptyResult(): VerificationResult {
  return {
    passed: true,
    errors: [],
    warnings: [],
    summary: {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
    },
  };
}

/**
 * Run a set of verification checks and aggregate results
 */
export async function runChecks(
  checks: VerificationCheck[]
): Promise<VerificationResult> {
  const result = createEmptyResult();
  result.summary.totalChecks = checks.length;

  for (const check of checks) {
    try {
      const errors = await check.run();
      
      if (errors.length > 0) {
        result.errors.push(...errors);
        result.summary.failedChecks++;
      } else {
        result.summary.passedChecks++;
      }
    } catch (error) {
      // If a check throws an exception, treat it as a failed check
      result.errors.push(
        createError(
          'foreign_key', // Default type for unexpected errors
          `Check "${check.name}" failed with exception: ${error instanceof Error ? error.message : String(error)}`,
          { checkName: check.name, checkDescription: check.description }
        )
      );
      result.summary.failedChecks++;
    }
  }

  result.passed = result.errors.length === 0;
  return result;
}

/**
 * Merge multiple verification results into one
 */
export function mergeResults(
  results: VerificationResult[]
): VerificationResult {
  const merged = createEmptyResult();

  for (const result of results) {
    merged.errors.push(...result.errors);
    merged.warnings.push(...result.warnings);
    merged.summary.totalChecks += result.summary.totalChecks;
    merged.summary.passedChecks += result.summary.passedChecks;
    merged.summary.failedChecks += result.summary.failedChecks;
  }

  merged.passed = merged.errors.length === 0;
  return merged;
}

/**
 * Filter errors by type
 */
export function filterErrorsByType(
  errors: VerificationError[],
  type: VerificationErrorType
): VerificationError[] {
  return errors.filter((error) => error.type === type);
}

/**
 * Group errors by type
 */
export function groupErrorsByType(
  errors: VerificationError[]
): Record<VerificationErrorType, VerificationError[]> {
  const grouped: Partial<Record<VerificationErrorType, VerificationError[]>> = {};

  for (const error of errors) {
    if (!grouped[error.type]) {
      grouped[error.type] = [];
    }
    grouped[error.type]!.push(error);
  }

  return grouped as Record<VerificationErrorType, VerificationError[]>;
}

/**
 * Count errors by type
 */
export function countErrorsByType(
  errors: VerificationError[]
): Record<VerificationErrorType, number> {
  const counts: Partial<Record<VerificationErrorType, number>> = {};

  for (const error of errors) {
    counts[error.type] = (counts[error.type] || 0) + 1;
  }

  return counts as Record<VerificationErrorType, number>;
}
