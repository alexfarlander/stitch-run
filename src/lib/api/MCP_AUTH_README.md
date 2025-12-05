# MCP Authentication Middleware

## Overview

The MCP authentication middleware provides Bearer token authentication for MCP server requests to the Stitch platform. This is a system-level authentication mechanism separate from Supabase user authentication.

## Setup

### 1. Generate API Key

Generate a secure API key using:

```bash
openssl rand -hex 32
```

### 2. Configure Environment Variable

Add the API key to your `.env.local` file:

```bash
STITCH_API_KEY=your-generated-key-here
```

### 3. Configure MCP Server

Add the same API key to your MCP server configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "stitch": {
      "command": "node",
      "args": ["/path/to/stitch-mcp/dist/index.js"],
      "env": {
        "STITCH_URL": "http://localhost:3000",
        "STITCH_API_KEY": "your-generated-key-here"
      }
    }
  }
}
```

## Usage

### Protecting API Routes

Use the `requireMCPAuth` wrapper to protect API routes:

```typescript
import { requireMCPAuth } from '@/lib/api/mcp-auth';

export const POST = requireMCPAuth(async (request: Request, context: any) => {
  // Your protected handler logic here
  const body = await request.json();
  
  // Process the request
  return Response.json({ success: true });
});
```

### Manual Validation

For custom authentication logic, use `validateMCPAuth`:

```typescript
import { validateMCPAuth } from '@/lib/api/mcp-auth';

export async function POST(request: Request) {
  if (!validateMCPAuth(request)) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Your handler logic
}
```

### Startup Validation

Validate configuration at application startup:

```typescript
import { validateMCPAuthConfig } from '@/lib/api/mcp-auth';

// In your server startup code
try {
  validateMCPAuthConfig();
  console.log('MCP authentication configured successfully');
} catch (error) {
  console.error('MCP authentication configuration error:', error);
  process.exit(1);
}
```

## API Reference

### `validateMCPAuth(request: Request): boolean`

Validates the Bearer token in the Authorization header against the `STITCH_API_KEY` environment variable.

**Parameters:**
- `request`: The incoming HTTP request

**Returns:**
- `true` if authentication is valid
- `false` if authentication is invalid or missing

### `requireMCPAuth(handler: Function): Function`

Higher-order function that wraps API route handlers with authentication.

**Parameters:**
- `handler`: The API route handler function to protect

**Returns:**
- Wrapped handler that validates authentication before executing

**Error Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key",
  "statusCode": 401
}
```

### `validateMCPAuthConfig(): void`

Validates that the `STITCH_API_KEY` environment variable is set. Throws an error if not configured.

**Throws:**
- `Error` if `STITCH_API_KEY` is not set or empty

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control. Use environment variables.
2. **Key Rotation**: Periodically rotate API keys for security.
3. **HTTPS**: Always use HTTPS in production to protect the Bearer token in transit.
4. **Scope**: This authentication is for system-level MCP server requests only, not end-user authentication.

## Testing

Run the test suite:

```bash
npm test src/lib/api/__tests__/mcp-auth.test.ts
```

The test suite covers:
- Valid and invalid Bearer tokens
- Missing authentication headers
- Environment variable validation
- Error response format
- Integration with different HTTP methods

## Requirements Validation

This implementation satisfies:
- **Requirement 6.1**: MCP Server includes API key in Authorization header
- **Requirement 6.2**: Validates STITCH_API_KEY environment variable
- **Requirement 6.3**: Returns 401 errors for invalid authentication
