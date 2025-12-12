/**
 * MCP Authentication Middleware Tests
 * 
 * Tests authentication validation for MCP server requests
 * Requirements: 6.1, 6.2, 6.3
 */

// beforeEach import removed as unused
import {
  validateMCPAuth,
  requireMCPAuth,
  validateMCPAuthConfig
} from '../mcp-auth';

describe('MCP Authentication Middleware', () => {
  const originalApiKey = process.env.STITCH_API_KEY;

  beforeEach(() => {
    // Set a test API key for each test
    process.env.STITCH_API_KEY = 'test-api-key-12345';
  });

  afterEach(() => {
    // Restore original API key
    if (originalApiKey) {
      process.env.STITCH_API_KEY = originalApiKey;
    } else {
      delete process.env.STITCH_API_KEY;
    }
  });

  describe('validateMCPAuth', () => {
    it('should return true for valid Bearer token (Requirement 6.1)', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer test-api-key-12345'
        }
      });

      expect(validateMCPAuth(request)).toBe(true);
    });

    it('should return false for missing Authorization header (Requirement 6.3)', () => {
      const request = new Request('http://localhost:3000/api/test');

      expect(validateMCPAuth(request)).toBe(false);
    });

    it('should return false for invalid Bearer token (Requirement 6.3)', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer wrong-api-key'
        }
      });

      expect(validateMCPAuth(request)).toBe(false);
    });

    it('should return false for non-Bearer auth scheme (Requirement 6.3)', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Basic dXNlcjpwYXNz'
        }
      });

      expect(validateMCPAuth(request)).toBe(false);
    });

    it('should return false for malformed Authorization header (Requirement 6.3)', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer'
        }
      });

      expect(validateMCPAuth(request)).toBe(false);
    });

    it('should return false when STITCH_API_KEY is not set (Requirement 6.2)', () => {
      delete process.env.STITCH_API_KEY;

      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer test-api-key-12345'
        }
      });

      expect(validateMCPAuth(request)).toBe(false);
    });

    it('should handle empty Bearer token (Requirement 6.3)', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer '
        }
      });

      expect(validateMCPAuth(request)).toBe(false);
    });

    it('should be case-sensitive for Bearer scheme', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'bearer test-api-key-12345'
        }
      });

      expect(validateMCPAuth(request)).toBe(false);
    });
  });

  describe('requireMCPAuth', () => {
    it('should call handler for valid authentication (Requirement 6.1)', async () => {
      const mockHandler = async (request: Request) => {
        return Response.json({ success: true });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer test-api-key-12345'
        }
      });

      const response = await protectedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should return 401 for invalid authentication (Requirement 6.3)', async () => {
      const mockHandler = async (request: Request) => {
        return Response.json({ success: true });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer wrong-key'
        }
      });

      const response = await protectedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
        statusCode: 401
      });
    });

    it('should return 401 for missing authentication (Requirement 6.3)', async () => {
      const mockHandler = async (request: Request) => {
        return Response.json({ success: true });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      const request = new Request('http://localhost:3000/api/test');

      const response = await protectedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
        statusCode: 401
      });
    });

    it('should pass additional arguments to handler', async () => {
      const mockHandler = async (
        request: Request,
        context: { params: { id: string } }
      ) => {
        return Response.json({ id: context.params.id });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer test-api-key-12345'
        }
      });

      const context = { params: { id: 'test-123' } };
      const response = await protectedHandler(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: 'test-123' });
    });

    it('should not call handler when authentication fails (Requirement 6.3)', async () => {
      let handlerCalled = false;

      const mockHandler = async (request: Request) => {
        handlerCalled = true;
        return Response.json({ success: true });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      const request = new Request('http://localhost:3000/api/test');

      await protectedHandler(request);

      expect(handlerCalled).toBe(false);
    });
  });

  describe('validateMCPAuthConfig', () => {
    it('should not throw when STITCH_API_KEY is set (Requirement 6.2)', () => {
      process.env.STITCH_API_KEY = 'test-api-key-12345';

      expect(() => {
        validateMCPAuthConfig();
      }).not.toThrow();
    });

    it('should throw when STITCH_API_KEY is not set (Requirement 6.2)', () => {
      delete process.env.STITCH_API_KEY;

      expect(() => {
        validateMCPAuthConfig();
      }).toThrow('STITCH_API_KEY environment variable is required');
    });

    it('should provide helpful error message with generation command (Requirement 6.2)', () => {
      delete process.env.STITCH_API_KEY;

      try {
        validateMCPAuthConfig();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('openssl rand -hex 32');
      }
    });

    it('should throw when STITCH_API_KEY is empty string (Requirement 6.2)', () => {
      process.env.STITCH_API_KEY = '';

      expect(() => {
        validateMCPAuthConfig();
      }).toThrow();
    });
  });

  describe('Error Response Format', () => {
    it('should include all required error fields (Requirement 6.3)', async () => {
      const mockHandler = async (request: Request) => {
        return Response.json({ success: true });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      const request = new Request('http://localhost:3000/api/test');

      const response = await protectedHandler(request);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('statusCode');
      expect(data.statusCode).toBe(401);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with POST requests (Requirement 6.1)', async () => {
      const mockHandler = async (request: Request) => {
        const body = await request.json();
        return Response.json({ received: body });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      const request = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key-12345',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: 'test' })
      });

      const response = await protectedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: { data: 'test' } });
    });

    it('should work with different HTTP methods (Requirement 6.1)', async () => {
      const mockHandler = async (request: Request) => {
        return Response.json({ method: request.method });
      };

      const protectedHandler = requireMCPAuth(mockHandler);

      for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
        const request = new Request('http://localhost:3000/api/test', {
          method,
          headers: {
            'Authorization': 'Bearer test-api-key-12345'
          }
        });

        const response = await protectedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ method });
      }
    });
  });
});
