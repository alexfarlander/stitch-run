/**
 * MCP Authentication Middleware
 * 
 * Provides authentication for MCP server requests using Bearer token validation.
 * The MCP server authenticates using a shared API key (STITCH_API_KEY).
 */

/**
 * Validates MCP authentication from request headers
 * 
 * @param request - The incoming HTTP request
 * @returns true if authentication is valid, false otherwise
 */
export function validateMCPAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  const apiKey = process.env.STITCH_API_KEY;
  
  if (!apiKey) {
    console.error('STITCH_API_KEY environment variable is not set');
    return false;
  }
  
  return token === apiKey;
}

/**
 * Higher-order function that wraps API route handlers with MCP authentication
 * 
 * @param handler - The API route handler function to protect
 * @returns Wrapped handler that validates authentication before executing
 * 
 * @example
 * export const POST = requireMCPAuth(async (request: Request, context: unknown) => {
 *   // Your protected handler logic here
 * });
 */
export function requireMCPAuth<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    if (!validateMCPAuth(request)) {
      return Response.json(
        { 
          error: 'Unauthorized', 
          message: 'Invalid or missing API key',
          statusCode: 401
        },
        { status: 401 }
      );
    }
    
    return handler(request, ...args);
  };
}

/**
 * Validates that STITCH_API_KEY is configured at startup
 * Throws an error if the API key is not set
 */
export function validateMCPAuthConfig(): void {
  if (!process.env.STITCH_API_KEY) {
    throw new Error(
      'STITCH_API_KEY environment variable is required for MCP authentication. ' +
      'Generate one using: openssl rand -hex 32'
    );
  }
}
