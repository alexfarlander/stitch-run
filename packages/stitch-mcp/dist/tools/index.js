import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createNodeTool } from "./create-node.js";
import { getStitchingCodeTool } from "./get-stitching-code.js";
import { generateTrackingLinkTool } from "./generate-tracking-link.js";
// Registry of all available tools
const tools = [
    createNodeTool,
    getStitchingCodeTool,
    generateTrackingLinkTool
];
export function registerTools(server) {
    // List all available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        try {
            return {
                tools: tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                }))
            };
        }
        catch (_error) {
            const errorMessage = _error instanceof Error ? _error.message : String(_error);
            throw new Error(`Failed to list tools: ${errorMessage}`);
        }
    });
    // Handle tool execution
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const toolName = request.params.name;
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
            // Provide helpful error with available tools
            const availableTools = tools.map(t => t.name).join(', ');
            throw new Error(`Unknown tool: '${toolName}'\n\n` +
                `Available tools:\n${availableTools}\n\n` +
                `Please check the tool name and try again.`);
        }
        try {
            return await tool.handler(request.params.arguments);
        }
        catch (_error) {
            // Tool handlers already format their own errors nicely
            // Just re-throw to preserve the error structure
            throw _error;
        }
    });
}
