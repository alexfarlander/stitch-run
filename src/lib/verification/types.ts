/**
 * Type definitions for verification system
 * Provides interfaces for verification results, errors, and warnings
 */

/**
 * Type of verification error
 */
export type VerificationErrorType =
  | 'foreign_key'
  | 'node_type'
  | 'edge_reference'
  | 'parent_node'
  | 'topology'
  | 'realtime'
  | 'rls'
  | 'journey_edge';

/**
 * Type of verification warning
 */
export type VerificationWarningType =
  | 'missing_optional'
  | 'deprecated'
  | 'performance';

/**
 * Represents a verification error found during checks
 */
export interface VerificationError {
  type: VerificationErrorType;
  message: string;
  context?: Record<string, any>;
}

/**
 * Represents a verification warning (non-critical issue)
 */
export interface VerificationWarning {
  type: VerificationWarningType;
  message: string;
  context?: Record<string, any>;
}

/**
 * Summary statistics for verification run
 */
export interface VerificationSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
}

/**
 * Complete result of a verification run
 */
export interface VerificationResult {
  passed: boolean;
  errors: VerificationError[];
  warnings: VerificationWarning[];
  summary: VerificationSummary;
}

/**
 * Configuration for a verification check
 */
export interface VerificationCheck {
  name: string;
  description: string;
  run: () => Promise<VerificationError[]>;
}
