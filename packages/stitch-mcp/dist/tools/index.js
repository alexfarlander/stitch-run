import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createNodeTool } from "./create-node.js";
import { getStitchingCodeTool } from "./get-stitching-code.js";
// Registry of all available tools
const tools = [
    createNodeTool,
    getStitchingCodeTool
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
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
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
        catch (error) {
            // Tool handlers already format their own errors nicely
            // Just re-throw to preserve the error structure
            throw error;
        }
    });
}
