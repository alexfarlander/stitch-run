/**
 * API Error Handling Utilities
 * 
 * Provides consistent error handling and response formatting for API routes
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextResponse } from 'next/server';
import { ErrorResponse, ErrorCode } from '@/types/canvas-api';

/**
 * Custom API error class
 */
export class APIError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: string[]
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Create a standardized error response
 * Requirements: 9.1, 9.2, 9.3
 * 
 * @param error - Error object or message
 * @param statusCode - HTTP status code
 * @param code - Error code
 * @param details - Optional additional details
 * @returns NextResponse with error payload
 */
export function createErrorResponse(
  error: string | Error,
  statusCode: number,
  code: ErrorCode,
  details?: string[]
): NextResponse<ErrorResponse> {
  const message = typeof error === 'string' ? error : error.message;
  
  const errorResponse: ErrorResponse = {
    error: message,
    code,
    ...(details && details.length > 0 && { details })
  };

  // Log error for debugging (but don't expose internal details to client)
  if (statusCode >= 500) {
    console.error(`[API Error ${code}]:`, error);
  }

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Handle API errors with consistent formatting
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * @param error - Error to handle
 * @returns NextResponse with appropriate error payload
 */
export function handleAPIError(error: unknown): NextResponse<ErrorResponse> {
  // Handle custom API errors
  if (error instanceof APIError) {
    return createErrorResponse(
      error.message,
      error.statusCode,
      error.code,
      error.details
    );
  }

  // Handle standard errors
  if (error instanceof Error) {
    // Check for Mermaid parse errors (from mermaid-parser.ts)
    if (error.name === 'MermaidParseError') {
      const details: string[] = [];
      const mermaidError = error as unknown;
      
      // Add hint if available
      if (mermaidError.hint) {
        details.push(`Hint: ${mermaidError.hint}`);
      }
      
      // Add line number if available
      if (mermaidError.line) {
        details.push(`Line: ${mermaidError.line}`);
      }
      
      return createErrorResponse(
        error.message,
        400,
        'PARSE_ERROR',
        details.length > 0 ? details : undefined
      );
    }
    
    // Check for specific error types
    if (error.message.includes('not found') || error.message.includes('PGRST116')) {
      return createErrorResponse(
        'Resource not found',
        404,
        'NOT_FOUND'
      );
    }

    // Check for validation errors - must be more specific to avoid false positives
    if (error.message.toLowerCase().startsWith('invalid') || 
        error.message.toLowerCase().includes('validation failed') ||
        error.message.toLowerCase().includes('missing required')) {
      return createErrorResponse(
        error.message,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Default to internal error
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_ERROR',
      [error.message]
    );
  }

  // Handle unknown errors
  return createErrorResponse(
    'An unexpected error occurred',
    500,
    'INTERNAL_ERROR'
  );
}

/**
 * Validate request body exists
 * Requirements: 9.1
 * 
 * @param body - Request body to validate
 * @throws APIError if body is invalid
 */
export function validateRequestBody(body: unknown): void {
  if (!body || typeof body !== 'object') {
    throw new APIError(
      'BAD_REQUEST',
      400,
      'Invalid request body: Expected JSON object'
    );
  }
}

/**
 * Validate required fields in request
 * Requirements: 9.1
 * 
 * @param body - Request body
 * @param requiredFields - Array of required field names
 * @throws APIError if required fields are missing
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => !(field in body));
  
  if (missingFields.length > 0) {
    throw new APIError(
      'BAD_REQUEST',
      400,
      'Missing required fields',
      missingFields.map(field => `Missing field: ${field}`)
    );
  }
}

/**
 * Validate canvas ID format
 * Requirements: 9.2
 * 
 * @param id - Canvas ID to validate
 * @throws APIError if ID is invalid
 */
export function validateCanvasId(id: string): void {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new APIError(
      'BAD_REQUEST',
      400,
      'Invalid canvas ID'
    );
  }
}
