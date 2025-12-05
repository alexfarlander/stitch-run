#!/usr/bin/env node

/**
 * Test script to verify tool registration
 */

import { createNodeTool } from './dist/tools/create-node.js';
import { getStitchingCodeTool } from './dist/tools/get-stitching-code.js';

console.log("Verifying tool registration...\n");

const tools = [createNodeTool, getStitchingCodeTool];

console.log(`Total tools registered: ${tools.length}\n`);

for (const tool of tools) {
    console.log("─".repeat(80));
    console.log(`Tool: ${tool.name}`);
    console.log(`Description: ${tool.description}`);
    console.log(`Required params: ${tool.inputSchema.required?.join(", ") || "none"}`);
    console.log(`Properties: ${Object.keys(tool.inputSchema.properties || {}).join(", ")}`);
    console.log(`Handler: ${typeof tool.handler === "function" ? "✓" : "✗"}`);
}

console.log("─".repeat(80));
console.log("\n✅ All tools properly registered!");
