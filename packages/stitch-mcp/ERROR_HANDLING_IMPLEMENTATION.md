# Error Handling Implementation

## Overview

This document describes the comprehensive error handling implementation for the Stitch MCP Server, completed as part of Task 9 in the implementation plan.

## Requirements Addressed

- **Requirement 7.1**: API errors include status codes in error messages
- **Requirement 7.2**: Tool parameter validation returns clear validation errors
- **Requirement 7.3**: Network errors are handled gracefully with user-friendly messages
- **Requirement 7.4**: Missing resources return descriptive errors with resource URI
- **Requirement 7.5**: Unknown tools return errors with tool name

## Implementation Details

### 1. Enhanced API Client Error Handling (Task 9.1)

**File**: `src/lib/api.ts`

#### New Error Classes

##### StitchAPIError
Custom error class for API errors that includes:
- `statusCode`: HTTP status code (e.g., 404, 500)
- `statusText`: HTTP status text (e.g., "Not Found", "Internal Server Error")
- `responseBody`: Full response body from the API
- `url`: The URL that was called

```typescript
throw new StitchAPIError(
    response.status,
    response.statusText,
    errorBody,
    url
);
```

##### StitchNetworkError
Custom error class for network errors that includes:
- `url`: The URL that failed to connect
- `originalError`: The underlying error from fetch

```typescript
throw new StitchNetworkError(url, error);
```

#### Enhanced stitchRequest Function

The `stitchRequest` function now:
1. Provides clearer error message when `STITCH_API_KEY` is not set
2. Attempts to parse error responses as JSON first, falls back to text
3. Distinguishes between API errors (bad response) and network errors (connection failed)
4. Includes full context in all error messages

### 2. Tool Parameter Validation (Task 9.2)

**Files**: 
- `src/tools/create-node.ts`
- `src/tools/get-stitching-code.ts`

#### Enhanced Validation Error Messages

Both tools now provide:
- **Parameter names** in error messages (e.g., "Parameter 'canvasId': must be a valid UUID")
- **Structured error details** with parameter, message, and error code
- **Helpful guidance** on valid values
- **Multiple error types** handled separately:
  - Zod validation errors
  - Stitch API errors (with status codes)
  - Network errors (with connection details)
  - Unexpected errors

#### Example Error Response

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid parameters provided",
  "details": [
    {
      "parameter": "canvasId",
      "message": "Canvas ID must be a valid UUID",
      "code": "invalid_string"
    }
  ],
  "help": "Parameter 'canvasId': Canvas ID must be a valid UUID"
}
```

### 3. Resource Error Handling (Task 9.3)

**Files**:
- `src/resources/index.ts`
- `src/tools/index.ts`

#### Resource Not Found Errors

When a resource is not found, the error message now includes:
- The requested resource URI
- List of all available resource URIs
- Helpful guidance to check the URI

```
Resource not found: stitch://dictionary/invalid

Available resources:
stitch://dictionary/core, stitch://instructions/overview, stitch://instructions/landing-page

Please check the URI and try again.
```

#### Unknown Tool Errors

When an unknown tool is called, the error message now includes:
- The requested tool name
- List of all available tool names
- Helpful guidance to check the tool name

```
Unknown tool: 'invalid_tool'

Available tools:
stitch_create_node, stitch_get_stitching_code

Please check the tool name and try again.
```

## Error Handling Flow

### API Errors
1. Request fails with HTTP error status
2. Response body is parsed (JSON or text)
3. `StitchAPIError` is thrown with full context
4. Tool handler catches and formats for MCP response
5. User receives structured error with status code

### Network Errors
1. Fetch fails (connection refused, timeout, etc.)
2. `StitchNetworkError` is thrown with URL and original error
3. Tool handler catches and formats for MCP response
4. User receives friendly message about connection issues

### Validation Errors
1. Zod schema validation fails
2. All validation errors are collected
3. Errors are formatted with parameter names
4. User receives structured error with all invalid parameters

### Resource/Tool Not Found
1. Requested resource/tool is not in registry
2. Error includes the invalid name
3. Error lists all available options
4. User receives helpful guidance

## Testing

A test script (`test-error-handling.js`) verifies:
- Error classes are properly exported
- Error classes extend Error
- Error names are correct
- Error messages include required information

Run the test:
```bash
npm run build
node test-error-handling.js
```

## Benefits

### For AI Assistants
- Clear understanding of what went wrong
- Actionable information to fix the issue
- Context about available options

### For Developers
- Easy debugging with full error context
- Status codes for API errors
- Network vs API error distinction

### For End Users
- User-friendly error messages
- No exposure of internal implementation details
- Helpful guidance on how to proceed

## Examples

### Example 1: Invalid Canvas ID

**Request**:
```javascript
stitch_create_node({
  canvasId: "not-a-uuid",
  label: "Test Node",
  nodeType: "asset"
})
```

**Response**:
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid parameters provided",
  "details": [
    {
      "parameter": "canvasId",
      "message": "Canvas ID must be a valid UUID",
      "code": "invalid_string"
    }
  ],
  "help": "Parameter 'canvasId': Canvas ID must be a valid UUID"
}
```

### Example 2: Canvas Not Found

**Request**:
```javascript
stitch_create_node({
  canvasId: "00000000-0000-0000-0000-000000000000",
  label: "Test Node",
  nodeType: "asset"
})
```

**Response**:
```json
{
  "success": false,
  "error": "Stitch API Error",
  "statusCode": 404,
  "statusText": "Not Found",
  "message": "{\"error\": \"Canvas not found\"}",
  "url": "http://localhost:3000/api/canvas/00000000-0000-0000-0000-000000000000/nodes"
}
```

### Example 3: Network Error

**Request**:
```javascript
stitch_create_node({
  canvasId: "valid-uuid",
  label: "Test Node",
  nodeType: "asset"
})
```

**Response** (when Stitch is not running):
```json
{
  "success": false,
  "error": "Network Error",
  "message": "Failed to connect to Stitch platform",
  "details": "Network error connecting to Stitch at http://localhost:3000/api/canvas/valid-uuid/nodes: fetch failed",
  "url": "http://localhost:3000/api/canvas/valid-uuid/nodes",
  "help": "Please check that the Stitch platform is running and accessible"
}
```

### Example 4: Invalid Framework

**Request**:
```javascript
stitch_get_stitching_code({
  nodeId: "test-node",
  framework: "ruby",
  assetType: "landing-page"
})
```

**Response**:
```
**Error: Invalid Parameters**

The following parameters are invalid:

- Parameter 'framework': Invalid enum value. Expected 'nextjs' | 'express' | 'python-flask', received 'ruby'

**Valid values:**
- framework: "nextjs", "express", or "python-flask"
- assetType: "landing-page" or "api"
- nodeId: non-empty string
```

### Example 5: Unknown Resource

**Request**:
```
Read resource: stitch://dictionary/invalid
```

**Response**:
```
Resource not found: stitch://dictionary/invalid

Available resources:
stitch://dictionary/core, stitch://instructions/overview, stitch://instructions/landing-page

Please check the URI and try again.
```

## Compliance with Requirements

✅ **Requirement 7.1**: API errors include status codes
- `StitchAPIError` includes `statusCode` and `statusText`
- Error messages display status code prominently

✅ **Requirement 7.2**: Clear validation errors with parameter names
- Zod errors are parsed to extract parameter names
- Each error includes the parameter name and message
- Multiple validation errors are all reported

✅ **Requirement 7.3**: Network errors handled gracefully
- `StitchNetworkError` provides user-friendly messages
- Distinguishes network errors from API errors
- Includes helpful guidance about checking connectivity

✅ **Requirement 7.4**: Missing resources return descriptive errors
- Error includes the requested resource URI
- Lists all available resources
- Provides guidance on how to fix

✅ **Requirement 7.5**: Unknown tools return descriptive errors
- Error includes the requested tool name
- Lists all available tools
- Provides guidance on how to fix

## Future Enhancements

Potential improvements for future versions:
1. Error codes for programmatic error handling
2. Retry logic for transient network errors
3. Rate limiting error handling
4. Structured logging of errors
5. Error metrics and monitoring
