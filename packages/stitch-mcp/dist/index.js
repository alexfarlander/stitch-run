#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import dotenv from "dotenv";
// Load environment variables
dotenv.config();
const server = new Server({
    name: "stitch-mcp",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
        resources: {},
    },
});
// Register capabilities
registerTools(server);
registerResources(server);
// Connect via stdio
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
    console.error("Failed to start Stitch MCP server:", error);
    process.exit(1);
});
console.error("Stitch MCP Server running on stdio");
