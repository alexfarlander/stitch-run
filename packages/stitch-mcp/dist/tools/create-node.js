import { z } from "zod";
import { stitchRequest, StitchAPIError, StitchNetworkError } from "../lib/api.js";
const STITCH_URL = process.env.STITCH_URL || "http://localhost:3000";
// Input validation schema
const CreateNodeParamsSchema = z.object({
    canvasId: z.string().uuid("Canvas ID must be a valid UUID"),
    label: z.string().min(1, "Label is required"),
    nodeType: z.enum(["asset", "worker", "integration"], {
        errorMap: () => ({ message: "Node type must be 'asset', 'worker', or 'integration'" })
    }),
    icon: z.string().optional(),
    url: z.string().url("URL must be a valid URL").optional(),
    position: z.object({
        x: z.number(),
        y: z.number()
    }).optional()
});
export const createNodeTool = {
    name: "stitch_create_node",
    description: "Create a new node on the Stitch canvas representing an asset (landing page, API, etc.)",
    inputSchema: {
        type: "object",
        properties: {
            canvasId: { type: "string", description: "Target canvas UUID" },
            label: { type: "string", description: "Display name of the node" },
            nodeType: {
                type: "string",
                enum: ["asset", "worker", "integration"],
                description: "Type of node"
            },
            icon: { type: "string", description: "Lucide icon name (e.g., 'Globe', 'Server')" },
            url: { type: "string", description: "URL of the deployed asset (for uptime monitoring)" },
            position: {
                type: "object",
                properties: {
                    x: { type: "number" },
                    y: { type: "number" }
                },
                description: "Position on canvas (defaults to {x: 100, y: 100})"
            }
        },
        required: ["canvasId", "label", "nodeType"]
    },
    handler: async (params) => {
        try {
            // Validate input parameters
            const validatedParams = CreateNodeParamsSchema.parse(params);
            // Construct the node object
            const nodeData = {
                label: validatedParams.label,
                type: validatedParams.nodeType,
                data: {
                    label: validatedParams.label,
                    icon: validatedParams.icon,
                    url: validatedParams.url,
                    uptime: { enabled: !!validatedParams.url },
                    mcp: {
                        createdBy: "mcp",
                        createdAt: new Date().toISOString()
                    }
                },
                position: validatedParams.position || { x: 100, y: 100 }
            };
            // Call the Stitch API to create the node
            const node = await stitchRequest(`/api/canvas/${validatedParams.canvasId}/nodes`, {
                method: "POST",
                body: JSON.stringify(nodeData)
            });
            // Generate webhook and uptime URLs
            const webhookUrl = `${STITCH_URL}/api/webhooks/node/${node.id}`;
            const uptimeUrl = `${STITCH_URL}/api/uptime/ping/${node.id}`;
            // Format response with node metadata
            const response = {
                success: true,
                nodeId: node.id,
                label: node.data?.label || validatedParams.label,
                type: node.type,
                position: node.position,
                webhookUrl,
                uptimeUrl,
                message: `Node created successfully on canvas ${validatedParams.canvasId}`
            };
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response, null, 2)
                    }
                ]
            };
        }
        catch (_error) {
            // Handle validation errors with clear parameter names
            if (error instanceof z.ZodError) {
                const errorDetails = error.errors.map(e => ({
                    parameter: e.path.join('.') || 'root',
                    message: e.message,
                    code: e.code
                }));
                const errorMessages = errorDetails
                    .map(e => `Parameter '${e.parameter}': ${e.message}`)
                    .join('\n');
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: "Validation Error",
                                message: "Invalid parameters provided",
                                details: errorDetails,
                                help: errorMessages
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
            }
            // Handle Stitch API errors with status codes
            if (error instanceof StitchAPIError) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: "Stitch API Error",
                                statusCode: error.statusCode,
                                statusText: error.statusText,
                                message: error.responseBody,
                                url: error.url
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
            }
            // Handle network errors
            if (error instanceof StitchNetworkError) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: "Network Error",
                                message: "Failed to connect to Stitch platform",
                                details: error.message,
                                url: error.url,
                                help: "Please check that the Stitch platform is running and accessible"
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
            }
            // Handle other errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: "Unexpected Error",
                            message: errorMessage
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }
};
