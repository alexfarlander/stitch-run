# Implementation Plan

- [ ] 1. Set up MCP authentication infrastructure
  - Create API key authentication middleware for Stitch platform
  - Add environment variable validation
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 1.1 Create MCP authentication middleware
  - Write `src/lib/api/mcp-auth.ts` with `validateMCPAuth` and `requireMCPAuth` functions
  - Validate Bearer token against `STITCH_API_KEY` environment variable
  - Return 401 errors for invalid authentication
  - _Requirements: 6.1, 6.3_

- [ ] 2. Implement webhook event endpoint
  - Create API route for receiving webhook events from external assets
  - Validate node existence and store events in database
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2.1 Create webhook database table
  - Add migration for `stitch_webhook_events` table
  - Include indexes for node_id and received_at
  - _Requirements: 4.3_

- [ ] 2.2 Implement webhook API route
  - Write `src/app/api/webhooks/node/[nodeId]/route.ts`
  - Validate node existence in database
  - Parse and validate webhook payload
  - Store event with timestamp
  - Return appropriate error codes (400, 404, 500)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3. Implement uptime monitoring endpoint
  - Create API route for receiving uptime pings from external assets
  - Update node timestamps and status
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.1 Create uptime database table
  - Add migration for `stitch_node_uptime` table
  - Include index for last_seen
  - _Requirements: 5.1, 5.2_

- [ ] 3.2 Implement uptime API route
  - Write `src/app/api/uptime/ping/[nodeId]/route.ts`
  - Validate node existence
  - Update last_seen timestamp
  - Store optional status information
  - Return appropriate error codes (404, 500)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 4. Implement node creation endpoint
  - Create API route for creating nodes on canvas via MCP
  - Validate canvas existence and node data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4.1 Implement node creation API route
  - Write `src/app/api/canvas/[id]/nodes/route.ts`
  - Protect with MCP authentication middleware
  - Validate canvas exists
  - Validate node type against allowed values
  - Generate unique node ID
  - Apply default position if not provided
  - Add node to canvas graph JSON
  - Update canvas in database
  - Return created node with metadata
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 5. Checkpoint - Ensure all backend endpoints work
  - Test manually, ask the user if questions arise.

- [ ] 6. Implement MCP tool: stitch_create_node
  - Complete the create-node tool implementation
  - Wire up to tools registry
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 6.1 Complete create-node tool handler
  - Update `packages/stitch-mcp/src/tools/create-node.ts`
  - Call node creation API endpoint
  - Generate webhook and uptime URLs
  - Format response with node metadata
  - Handle API errors gracefully
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 6.2 Register create-node tool
  - Update `packages/stitch-mcp/src/tools/index.ts`
  - Import and register createNodeTool
  - Add to tools list
  - Wire up tool handler
  - _Requirements: 1.1_

- [ ] 7. Implement MCP tool: stitch_get_stitching_code
  - Create tool for generating framework-specific integration code
  - Support Next.js, Express, and Flask frameworks
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 7.1 Create get-stitching-code tool
  - Write `packages/stitch-mcp/src/tools/get-stitching-code.ts`
  - Define input schema (nodeId, framework, assetType)
  - Implement Next.js template with API routes and helpers
  - Implement Express template with middleware and routes
  - Implement Flask template with route handlers
  - Include asset-type-specific examples (forms for landing-page, webhooks for api)
  - Format as markdown with code blocks
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 7.2 Register get-stitching-code tool
  - Update `packages/stitch-mcp/src/tools/index.ts`
  - Import and register getStitchingCodeTool
  - Add to tools list
  - Wire up tool handler
  - _Requirements: 2.1_

- [ ] 8. Implement MCP resources
  - Create dictionary and instruction resources
  - Wire up to resources registry
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 8.1 Create Stitch dictionary in main app
  - Write `src/lib/dictionary/index.ts` in main Stitch app
  - Define STITCH_DICTIONARY constant with core concepts
  - Include node types, edge types, entity types
  - Export as JSON-serializable object
  - _Requirements: 3.1_

- [ ] 8.2 Create dictionary resource
  - Write `packages/stitch-mcp/src/resources/dictionary.ts`
  - Implement `stitch://dictionary/core` resource
  - Import dictionary from main app (or fetch via API)
  - Return as JSON content
  - _Requirements: 3.1_

- [ ] 8.3 Create instruction resources
  - Write `packages/stitch-mcp/src/resources/instructions.ts`
  - Implement `stitch://instructions/overview` resource
  - Implement `stitch://instructions/landing-page` resource
  - Return markdown-formatted content
  - Include Stitch protocol details, integration patterns, best practices
  - _Requirements: 3.2, 3.3, 3.5_

- [ ] 8.4 Register resources
  - Update `packages/stitch-mcp/src/resources/index.ts`
  - Import and register dictionary and instruction resources
  - Add to resources list
  - Wire up resource handlers
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 9. Implement error handling
  - Add comprehensive error handling across all components
  - Ensure descriptive error messages
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9.1 Enhance API client error handling
  - Update `packages/stitch-mcp/src/lib/api.ts`
  - Include status codes in error messages
  - Handle network errors gracefully
  - Provide user-friendly error messages
  - _Requirements: 7.1, 7.3_

- [ ] 9.2 Add tool parameter validation
  - Add Zod schemas for all tool inputs
  - Return clear validation errors
  - Include parameter names in error messages
  - _Requirements: 7.2_

- [ ] 9.3 Add resource error handling
  - Handle missing resources with descriptive errors
  - Include resource URI in error messages
  - Handle unknown tools with tool name in error
  - _Requirements: 7.4, 7.5_

- [ ] 10. Build and configure MCP server
  - Build the MCP server package
  - Create configuration documentation
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [ ] 10.1 Verify build configuration
  - Ensure `package.json` scripts are correct
  - Verify TypeScript compilation settings
  - Test build process
  - _Requirements: 8.1_

- [ ] 10.2 Create configuration guide
  - Write README.md in packages/stitch-mcp
  - Document environment variables
  - Provide Claude Desktop configuration example
  - Include API key generation instructions
  - Add troubleshooting section
  - _Requirements: 8.5_

- [ ] 10.3 Test MCP server startup
  - Run `npm run build`
  - Run `npm start`
  - Verify stdio transport connection
  - Test with sample MCP client
  - _Requirements: 8.3, 8.4_

- [ ] 11. Manual testing with Claude Desktop
  - Configure MCP server in Claude Desktop
  - Test conversational node creation
  - Test code generation
  - Test resource access
  - Verify error handling
  - _Requirements: 8.5_

- [ ] 12. Final checkpoint - Complete system verification
  - Verify all components work together, ask the user if questions arise.
