# Stitch MCP Server

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with the Stitch platform programmatically. This server allows AI agents to create nodes on the Stitch canvas, retrieve integration code snippets, and access documentation resources.

## Features

- **Node Creation**: Create nodes on the Stitch canvas conversationally
- **Code Generation**: Get framework-specific integration code (Next.js, Express, Flask)
- **Documentation Access**: Access Stitch terminology and integration guides
- **Webhook Support**: Receive events from external assets
- **Uptime Monitoring**: Track health status of external assets

## Installation

```bash
cd packages/stitch-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

The MCP server requires the following environment variables:

- **`STITCH_API_KEY`** (required): API key for authenticating with the Stitch platform
- **`STITCH_URL`** (optional): Base URL of your Stitch instance (defaults to `http://localhost:3000`)

### Generating an API Key

Generate a secure API key using OpenSSL:

```bash
openssl rand -hex 32
```

Add this key to both:
1. Your Stitch platform's `.env.local` file:
   ```
   STITCH_API_KEY=your-generated-key-here
   ```

2. Your MCP server configuration (see Claude Desktop setup below)

### Claude Desktop Configuration

To use the Stitch MCP server with Claude Desktop, add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stitch": {
      "command": "node",
      "args": ["/absolute/path/to/stitch-run/packages/stitch-mcp/dist/index.js"],
      "env": {
        "STITCH_URL": "http://localhost:3000",
        "STITCH_API_KEY": "your-generated-key-here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/stitch-run` with the actual absolute path to your project directory.

For production deployments, update `STITCH_URL` to your production URL:
```json
"STITCH_URL": "https://your-stitch-instance.com"
```

### Kiro CLI Configuration

To use with Kiro CLI, add to `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "node",
      "args": ["/absolute/path/to/stitch-run/packages/stitch-mcp/dist/index.js"],
      "env": {
        "STITCH_URL": "http://localhost:3000",
        "STITCH_API_KEY": "your-generated-key-here"
      }
    }
  }
}
```

## Usage

### Starting the Server

**Development mode** (with hot reloading):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

### Available Tools

Once configured, the following tools are available to AI assistants:

#### `stitch_create_node`

Creates a new node on the Stitch canvas.

**Parameters**:
- `canvasId` (string, required): ID of the canvas to add the node to
- `label` (string, required): Display label for the node
- `nodeType` (string, required): Type of node - "asset", "worker", or "integration"
- `icon` (string, optional): Icon identifier for the node
- `url` (string, optional): URL associated with the node
- `position` (object, optional): Position coordinates `{x: number, y: number}`

**Returns**:
- `nodeId`: Unique identifier for the created node
- `webhookUrl`: URL for receiving webhook events
- `uptimeUrl`: URL for uptime monitoring pings

**Example**:
```typescript
{
  "canvasId": "canvas-123",
  "label": "Landing Page",
  "nodeType": "asset",
  "icon": "globe",
  "url": "https://example.com",
  "position": { "x": 100, "y": 200 }
}
```

#### `stitch_get_stitching_code`

Generates framework-specific integration code for connecting external assets to Stitch.

**Parameters**:
- `nodeId` (string, required): ID of the node to generate code for
- `framework` (string, required): Target framework - "nextjs", "express", or "python-flask"
- `assetType` (string, required): Type of asset - "landing-page" or "api"

**Returns**: Markdown-formatted code snippets with integration instructions

**Example**:
```typescript
{
  "nodeId": "node-456",
  "framework": "nextjs",
  "assetType": "landing-page"
}
```

### Available Resources

#### `stitch://dictionary/core`

Returns the Stitch terminology dictionary with definitions of core concepts, node types, and edge types.

#### `stitch://instructions/overview`

Provides high-level integration guidance for connecting external assets to Stitch.

#### `stitch://instructions/landing-page`

Offers specific guidance for integrating landing pages with Stitch, including form handling and analytics.

## API Endpoints

The Stitch platform exposes the following endpoints for MCP integration:

### Node Creation
```
POST /api/canvas/[id]/nodes
Authorization: Bearer <STITCH_API_KEY>
```

### Webhook Events
```
POST /api/webhooks/node/[nodeId]
```

### Uptime Monitoring
```
POST /api/uptime/ping/[nodeId]
```

## Troubleshooting

### Server won't start

**Error**: `STITCH_API_KEY environment variable is required`

**Solution**: Ensure you've set the `STITCH_API_KEY` in your MCP configuration. Generate a new key using `openssl rand -hex 32`.

---

**Error**: `Failed to connect to Stitch platform`

**Solution**: 
1. Verify `STITCH_URL` is correct
2. Ensure the Stitch platform is running
3. Check that the API key matches between MCP server and Stitch platform

### Tools not appearing in Claude

**Solution**:
1. Verify the configuration file path is correct for your OS
2. Ensure the `args` path is absolute, not relative
3. Restart Claude Desktop after configuration changes
4. Check Claude Desktop logs for errors

### Authentication errors

**Error**: `401 Unauthorized`

**Solution**: The API key doesn't match between the MCP server and Stitch platform. Regenerate the key and update both configurations.

### Build errors

**Error**: TypeScript compilation errors

**Solution**:
1. Ensure you're using Node.js 18 or higher
2. Run `npm install` to ensure all dependencies are installed
3. Check that `tsconfig.json` is present and valid

## Development

### Project Structure

```
packages/stitch-mcp/
├── src/
│   ├── index.ts              # Server entry point
│   ├── lib/
│   │   └── api.ts            # API client helper
│   ├── tools/
│   │   ├── index.ts          # Tool registration
│   │   ├── create-node.ts    # Node creation tool
│   │   └── get-stitching-code.ts  # Code generation tool
│   └── resources/
│       ├── index.ts          # Resource registration
│       ├── dictionary.ts     # Terminology resource
│       └── instructions.ts   # Documentation resources
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Testing

Run the test scripts to verify functionality:

```bash
# Test tool registration
node test-tool-registration.js

# Test resource access
node test-resources.js

# Test error handling
node test-error-handling.js

# Test code generation
node test-get-stitching-code.js

# Test requirements validation
node test-requirements-validation.js
```

## Security

- **API Key Storage**: Never commit API keys to version control
- **Environment Variables**: Use `.env` files (excluded from git) for local development
- **Production**: Use secure secret management for production deployments
- **HTTPS**: Always use HTTPS for production Stitch instances

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the Stitch platform documentation
3. Verify your configuration matches the examples

## License

Part of the Stitch platform.
