/**
 * Logging utilities for verification output
 * Provides formatted console output for verification results
 */

import {
  VerificationResult,
  VerificationError,
  VerificationWarning,
} from './types';
import { groupErrorsByType, countErrorsByType } from './utils';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

/**
 * Format a verification error for display
 */
function formatError(error: VerificationError, index: number): string {
  const lines: string[] = [];
  
  lines.push(`${colors.red}${colors.bold}Error ${index + 1}:${colors.reset} ${error.message}`);
  lines.push(`  ${colors.dim}Type: ${error.type}${colors.reset}`);
  
  if (error.context && Object.keys(error.context).length > 0) {
    lines.push(`  ${colors.dim}Context:${colors.reset}`);
    for (const [key, value] of Object.entries(error.context)) {
      const valueStr = typeof value === 'object' 
        ? JSON.stringify(value, null, 2).split('\n').join('\n    ')
        : String(value);
      lines.push(`    ${key}: ${valueStr}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format a verification warning for display
 */
function formatWarning(warning: VerificationWarning, index: number): string {
  const lines: string[] = [];
  
  lines.push(`${colors.yellow}${colors.bold}Warning ${index + 1}:${colors.reset} ${warning.message}`);
  lines.push(`  ${colors.dim}Type: ${warning.type}${colors.reset}`);
  
  if (warning.context && Object.keys(warning.context).length > 0) {
    lines.push(`  ${colors.dim}Context:${colors.reset}`);
    for (const [key, value] of Object.entries(warning.context)) {
      const valueStr = typeof value === 'object' 
        ? JSON.stringify(value, null, 2).split('\n').join('\n    ')
        : String(value);
      lines.push(`    ${key}: ${valueStr}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Log verification result to console with formatting
 */
export function logResult(result: VerificationResult, title?: string): void {
  console.log('\n' + '='.repeat(80));
  
  if (title) {
    console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
    console.log('='.repeat(80));
  }
  
  // Summary
  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`  Total Checks: ${result.summary.totalChecks}`);
  console.log(`  ${colors.green}Passed: ${result.summary.passedChecks}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${result.summary.failedChecks}${colors.reset}`);
  
  // Overall status
  if (result.passed) {
    console.log(`\n${colors.green}${colors.bold}✓ All checks passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}✗ Verification failed${colors.reset}`);
  }
  
  // Errors by type
  if (result.errors.length > 0) {
    console.log(`\n${colors.bold}Errors by Type:${colors.reset}`);
    const errorCounts = countErrorsByType(result.errors);
    for (const [type, count] of Object.entries(errorCounts)) {
      console.log(`  ${type}: ${colors.red}${count}${colors.reset}`);
    }
    
    // Detailed errors
    console.log(`\n${colors.bold}Detailed Errors:${colors.reset}\n`);
    result.errors.forEach((error, index) => {
      console.log(formatError(error, index));
      console.log(''); // Empty line between errors
    });
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    console.log(`\n${colors.bold}Warnings:${colors.reset}\n`);
    result.warnings.forEach((warning, index) => {
      console.log(formatWarning(warning, index));
      console.log(''); // Empty line between warnings
    });
  }
  
  console.log('='.repeat(80) + '\n');
}

/**
 * Log a simple message with color
 */
export function logInfo(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Log a success message
 */
export function logSuccess(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

/**
 * Log an error message
 */
export function logError(message: string): void {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

/**
 * Log a warning message
 */
export function logWarning(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

/**
 * Log a section header
 */
export function logSection(title: string): void {
  console.log(`\n${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log('-'.repeat(title.length));
}

/**
 * Log check progress
 */
export function logCheckStart(checkName: string): void {
  console.log(`${colors.dim}Running check: ${checkName}...${colors.reset}`);
}

/**
 * Log check completion
 */
export function logCheckComplete(checkName: string, passed: boolean): void {
  if (passed) {
    console.log(`${colors.green}✓${colors.reset} ${checkName}`);
  } else {
    console.log(`${colors.red}✗${colors.reset} ${checkName}`);
  }
}
