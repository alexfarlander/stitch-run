# Requirements Document

## Introduction

The Stitch MCP (Model Context Protocol) Server enables AI assistants like Claude to interact with the Stitch platform programmatically. This integration allows AI agents to create nodes on the Stitch canvas, retrieve integration code snippets, and access documentation resources. The MCP server acts as a bridge between AI assistants and the Stitch platform, enabling conversational workflow creation and asset integration.

## Glossary

- **MCP Server**: A Model Context Protocol server that exposes tools and resources to AI assistants
- **Stitch Platform**: The Living Business Model Canvas application that orchestrates workflows
- **Canvas**: A visual workspace in Stitch containing nodes and edges representing workflows
- **Node**: A visual element on the canvas representing an asset, worker, or integration point
- **Asset**: An external application (landing page, API, etc.) that integrates with Stitch
- **Stitching Code**: Integration code snippets that connect external assets to the Stitch platform
- **Webhook URL**: An endpoint that receives events from external assets
- **Uptime Monitoring**: System for tracking the health status of external assets
- **Resource**: Static documentation or data exposed by the MCP server
- **Tool**: An executable function exposed by the MCP server

## Requirements

### Requirement 1

**User Story:** As an AI assistant, I want to create nodes on the Stitch canvas, so that I can help users build workflows conversationally.

#### Acceptance Criteria

1. WHEN the AI assistant calls the `stitch_create_node` tool with valid parameters THEN the Stitch Platform SHALL create a new node on the specified canvas
2. WHEN a node is created THEN the Stitch Platform SHALL return the node ID, webhook URL, and uptime monitoring URL
3. WHEN the AI assistant provides a position for the node THEN the Stitch Platform SHALL place the node at the specified coordinates
4. WHEN the AI assistant omits the position THEN the Stitch Platform SHALL place the node at default coordinates (100, 100)
5. WHEN the AI assistant specifies a node type THEN the Stitch Platform SHALL validate it against allowed types (asset, worker, integration)

### Requirement 2

**User Story:** As an AI assistant, I want to retrieve integration code for different frameworks, so that I can provide users with ready-to-use code snippets.

#### Acceptance Criteria

1. WHEN the AI assistant calls `stitch_get_stitching_code` with a framework parameter THEN the MCP Server SHALL return framework-specific integration code
2. WHEN the framework is "nextjs" THEN the MCP Server SHALL provide Next.js API route code and helper utilities
3. WHEN the framework is "express" THEN the MCP Server SHALL provide Express.js middleware and route handlers
4. WHEN the framework is "python-flask" THEN the MCP Server SHALL provide Flask route handlers and helper functions
5. WHEN the asset type is "landing-page" THEN the MCP Server SHALL include form submission and analytics tracking code
6. WHEN the asset type is "api" THEN the MCP Server SHALL include webhook notification and health check code

### Requirement 3

**User Story:** As an AI assistant, I want to access Stitch documentation and terminology, so that I can provide accurate guidance to users.

#### Acceptance Criteria

1. WHEN the AI assistant requests the `stitch://dictionary/core` resource THEN the MCP Server SHALL return the Stitch terminology dictionary
2. WHEN the AI assistant requests the `stitch://instructions/overview` resource THEN the MCP Server SHALL return high-level integration guidance
3. WHEN the AI assistant requests the `stitch://instructions/landing-page` resource THEN the MCP Server SHALL return landing page integration specifics
4. WHEN the dictionary is updated in the main Stitch application THEN the MCP Server SHALL reflect those changes without code modifications
5. WHEN instruction resources are requested THEN the MCP Server SHALL return markdown-formatted content

### Requirement 4

**User Story:** As an external asset, I want to send events to Stitch via webhooks, so that I can notify the platform of important occurrences.

#### Acceptance Criteria

1. WHEN an external asset sends a POST request to `/api/webhooks/node/[nodeId]` THEN the Stitch Platform SHALL accept and store the event
2. WHEN a webhook event is received THEN the Stitch Platform SHALL validate the node ID exists
3. WHEN a webhook event is stored THEN the Stitch Platform SHALL record the timestamp, payload, and node ID
4. WHEN a webhook request is malformed THEN the Stitch Platform SHALL return a 400 error with details
5. WHEN a webhook request references a non-existent node THEN the Stitch Platform SHALL return a 404 error

### Requirement 5

**User Story:** As an external asset, I want to report my health status to Stitch, so that the platform can monitor my uptime.

#### Acceptance Criteria

1. WHEN an external asset sends a POST request to `/api/uptime/ping/[nodeId]` THEN the Stitch Platform SHALL update the node's last seen timestamp
2. WHEN an uptime ping is received THEN the Stitch Platform SHALL record the current timestamp
3. WHEN an uptime ping includes status information THEN the Stitch Platform SHALL store the status details
4. WHEN an uptime ping references a non-existent node THEN the Stitch Platform SHALL return a 404 error
5. WHEN the Stitch Platform displays a node THEN the Stitch Platform SHALL indicate uptime status based on recent pings

### Requirement 6

**User Story:** As a Stitch administrator, I want the MCP server to authenticate API requests, so that only authorized AI assistants can modify the canvas.

#### Acceptance Criteria

1. WHEN the MCP Server makes an API request THEN the MCP Server SHALL include the API key in the Authorization header
2. WHEN the STITCH_API_KEY environment variable is not set THEN the MCP Server SHALL throw an error on startup
3. WHEN the Stitch Platform receives an API request without valid authentication THEN the Stitch Platform SHALL return a 401 error
4. WHEN the MCP Server is configured with STITCH_URL THEN the MCP Server SHALL use that URL for all API requests
5. WHEN the STITCH_URL is not provided THEN the MCP Server SHALL default to http://localhost:3000

### Requirement 7

**User Story:** As a developer, I want the MCP server to handle errors gracefully, so that AI assistants receive helpful error messages.

#### Acceptance Criteria

1. WHEN a Stitch API request fails THEN the MCP Server SHALL return a descriptive error message including the status code
2. WHEN a tool receives invalid parameters THEN the MCP Server SHALL validate inputs and return clear validation errors
3. WHEN a network error occurs THEN the MCP Server SHALL catch the error and return a user-friendly message
4. WHEN a resource is not found THEN the MCP Server SHALL return a 404-style error with the resource URI
5. WHEN an unknown tool is called THEN the MCP Server SHALL return an error indicating the tool name is not recognized

### Requirement 8

**User Story:** As a developer, I want to build and deploy the MCP server package, so that it can be used by AI assistants.

#### Acceptance Criteria

1. WHEN running `npm run build` in the stitch-mcp package THEN the TypeScript SHALL compile to JavaScript in the dist directory
2. WHEN running `npm run dev` THEN the MCP Server SHALL start in development mode with hot reloading
3. WHEN running `npm start` THEN the MCP Server SHALL execute the compiled JavaScript from the dist directory
4. WHEN the MCP Server starts THEN the MCP Server SHALL connect via stdio transport for communication with AI assistants
5. WHEN the MCP Server is configured in Claude Desktop THEN Claude SHALL be able to list and call the available tools
