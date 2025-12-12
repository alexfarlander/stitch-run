/**
 * Comprehensive Error Handler Tests
 * 
 * Tests all error handling scenarios across the API
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect } from 'vitest';
import {
  APIError,
  createErrorResponse,
  handleAPIError,
  validateRequestBody,
  validateRequiredFields,
  validateCanvasId
} from '../error-handler';

describe('Error Handler', () => {
  describe('APIError class', () => {
    it('should create APIError with all properties', () => {
      const error = new APIError(
        'BAD_REQUEST',
        400,
        'Test error message',
        ['detail 1', 'detail 2']
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('APIError');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual(['detail 1', 'detail 2']);
    });

    it('should create APIError without details', () => {
      const error = new APIError(
        'NOT_FOUND',
        404,
        'Resource not found'
      );

      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.details).toBeUndefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from string (Requirement 9.1)', () => {
      const response = createErrorResponse(
        'Invalid request',
        400,
        'BAD_REQUEST'
      );

      expect(response.status).toBe(400);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Invalid request',
        code: 'BAD_REQUEST'
      });
    });

    it('should create error response from Error object (Requirement 9.3)', () => {
      const error = new Error('Database connection failed');
      const response = createErrorResponse(
        error,
        500,
        'INTERNAL_ERROR'
      );

      expect(response.status).toBe(500);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Database connection failed',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should include details when provided (Requirement 9.1)', () => {
      const response = createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        ['Field "name" is required', 'Field "email" is invalid']
      );

      expect(response.status).toBe(400);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: ['Field "name" is required', 'Field "email" is invalid']
      });
    });

    it('should not include details when empty array (Requirement 9.1)', () => {
      const response = createErrorResponse(
        'Error message',
        400,
        'BAD_REQUEST',
        []
      );

      const json = response.json();
      expect(json).resolves.not.toHaveProperty('details');
    });
  });

  describe('handleAPIError', () => {
    it('should handle APIError instances (Requirement 9.1)', () => {
      const error = new APIError(
        'BAD_REQUEST',
        400,
        'Invalid input',
        ['Missing field: name']
      );

      const response = handleAPIError(error);

      expect(response.status).toBe(400);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Invalid input',
        code: 'BAD_REQUEST',
        details: ['Missing field: name']
      });
    });

    it('should handle MermaidParseError (Requirement 9.4)', () => {
      const error = new Error('Invalid flowchart direction: INVALID');
      error.name = 'MermaidParseError';
      (error as unknown).hint = 'Use LR, RL, TB, or BT';
      (error as unknown).line = 1;

      const response = handleAPIError(error);

      expect(response.status).toBe(400);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Invalid flowchart direction: INVALID',
        code: 'PARSE_ERROR',
        details: ['Hint: Use LR, RL, TB, or BT', 'Line: 1']
      });
    });

    it('should handle not found errors (Requirement 9.2)', () => {
      const error = new Error('Canvas not found');

      const response = handleAPIError(error);

      expect(response.status).toBe(404);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Resource not found',
        code: 'NOT_FOUND'
      });
    });

    it('should handle Supabase not found errors (Requirement 9.2)', () => {
      const error = new Error('PGRST116: No rows found');

      const response = handleAPIError(error);

      expect(response.status).toBe(404);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Resource not found',
        code: 'NOT_FOUND'
      });
    });

    it('should handle validation errors (Requirement 9.5)', () => {
      const error = new Error('Invalid canvas structure: missing nodes');

      const response = handleAPIError(error);

      expect(response.status).toBe(400);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Invalid canvas structure: missing nodes',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should handle generic errors as internal errors (Requirement 9.3)', () => {
      const error = new Error('Unexpected error occurred');

      const response = handleAPIError(error);

      expect(response.status).toBe(500);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: ['Unexpected error occurred']
      });
    });

    it('should handle unknown error types (Requirement 9.3)', () => {
      const error = { unknown: 'error' };

      const response = handleAPIError(error);

      expect(response.status).toBe(500);
      const json = response.json();
      expect(json).resolves.toMatchObject({
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      });
    });
  });

  describe('validateRequestBody', () => {
    it('should pass for valid object (Requirement 9.1)', () => {
      expect(() => {
        validateRequestBody({ name: 'test' });
      }).not.toThrow();
    });

    it('should throw for null body (Requirement 9.1)', () => {
      expect(() => {
        validateRequestBody(null);
      }).toThrow(APIError);

      try {
        validateRequestBody(null);
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).code).toBe('BAD_REQUEST');
        expect((error as APIError).statusCode).toBe(400);
        expect((error as APIError).message).toContain('Invalid request body');
      }
    });

    it('should throw for undefined body (Requirement 9.1)', () => {
      expect(() => {
        validateRequestBody(undefined);
      }).toThrow(APIError);
    });

    it('should throw for non-object body (Requirement 9.1)', () => {
      expect(() => {
        validateRequestBody('string');
      }).toThrow(APIError);

      expect(() => {
        validateRequestBody(123);
      }).toThrow(APIError);

      expect(() => {
        validateRequestBody(true);
      }).toThrow(APIError);
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass when all required fields present (Requirement 9.1)', () => {
      expect(() => {
        validateRequiredFields(
          { name: 'test', email: 'test@example.com' },
          ['name', 'email']
        );
      }).not.toThrow();
    });

    it('should throw when single field missing (Requirement 9.1)', () => {
      expect(() => {
        validateRequiredFields(
          { name: 'test' },
          ['name', 'email']
        );
      }).toThrow(APIError);

      try {
        validateRequiredFields(
          { name: 'test' },
          ['name', 'email']
        );
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).code).toBe('BAD_REQUEST');
        expect((error as APIError).statusCode).toBe(400);
        expect((error as APIError).message).toBe('Missing required fields');
        expect((error as APIError).details).toEqual(['Missing field: email']);
      }
    });

    it('should throw when multiple fields missing (Requirement 9.1)', () => {
      try {
        validateRequiredFields(
          {},
          ['name', 'email', 'password']
        );
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).details).toEqual([
          'Missing field: name',
          'Missing field: email',
          'Missing field: password'
        ]);
      }
    });

    it('should pass when no fields required', () => {
      expect(() => {
        validateRequiredFields({ name: 'test' }, []);
      }).not.toThrow();
    });
  });

  describe('validateCanvasId', () => {
    it('should pass for valid canvas ID (Requirement 9.2)', () => {
      expect(() => {
        validateCanvasId('canvas-123');
      }).not.toThrow();

      expect(() => {
        validateCanvasId('550e8400-e29b-41d4-a716-446655440000');
      }).not.toThrow();
    });

    it('should throw for empty string (Requirement 9.2)', () => {
      expect(() => {
        validateCanvasId('');
      }).toThrow(APIError);

      try {
        validateCanvasId('');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).code).toBe('BAD_REQUEST');
        expect((error as APIError).statusCode).toBe(400);
        expect((error as APIError).message).toBe('Invalid canvas ID');
      }
    });

    it('should throw for whitespace-only string (Requirement 9.2)', () => {
      expect(() => {
        validateCanvasId('   ');
      }).toThrow(APIError);
    });

    it('should throw for non-string ID (Requirement 9.2)', () => {
      expect(() => {
        validateCanvasId(null as unknown);
      }).toThrow(APIError);

      expect(() => {
        validateCanvasId(undefined as unknown);
      }).toThrow(APIError);

      expect(() => {
        validateCanvasId(123 as unknown);
      }).toThrow(APIError);
    });
  });

  describe('Error Response Format', () => {
    it('should always include error and code fields (Requirement 9.1)', () => {
      const response = createErrorResponse(
        'Test error',
        400,
        'BAD_REQUEST'
      );

      const json = response.json();
      expect(json).resolves.toHaveProperty('error');
      expect(json).resolves.toHaveProperty('code');
    });

    it('should include details only when provided (Requirement 9.1)', () => {
      const responseWithDetails = createErrorResponse(
        'Test error',
        400,
        'BAD_REQUEST',
        ['detail 1']
      );

      const responseWithoutDetails = createErrorResponse(
        'Test error',
        400,
        'BAD_REQUEST'
      );

      expect(responseWithDetails.json()).resolves.toHaveProperty('details');
      expect(responseWithoutDetails.json()).resolves.not.toHaveProperty('details');
    });
  });

  describe('HTTP Status Codes', () => {
    it('should use 400 for bad requests (Requirement 9.1)', () => {
      const error = new APIError('BAD_REQUEST', 400, 'Invalid input');
      const response = handleAPIError(error);
      expect(response.status).toBe(400);
    });

    it('should use 404 for not found (Requirement 9.2)', () => {
      const error = new APIError('NOT_FOUND', 404, 'Resource not found');
      const response = handleAPIError(error);
      expect(response.status).toBe(404);
    });

    it('should use 500 for internal errors (Requirement 9.3)', () => {
      const error = new APIError('INTERNAL_ERROR', 500, 'Server error');
      const response = handleAPIError(error);
      expect(response.status).toBe(500);
    });

    it('should use 400 for parse errors (Requirement 9.4)', () => {
      const error = new APIError('PARSE_ERROR', 400, 'Parse failed');
      const response = handleAPIError(error);
      expect(response.status).toBe(400);
    });

    it('should use 400 for validation errors (Requirement 9.5)', () => {
      const error = new APIError('VALIDATION_ERROR', 400, 'Validation failed');
      const response = handleAPIError(error);
      expect(response.status).toBe(400);
    });
  });
});
