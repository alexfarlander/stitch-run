import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { dictionaryResource } from './dictionary.js';
import { overviewResource, landingPageResource } from './instructions.js';
// Registry of all available resources
const resources = [
    dictionaryResource,
    overviewResource,
    landingPageResource,
];
export function registerResources(server) {
    // Handle resource listing
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        try {
            return {
                resources: resources.map(resource => ({
                    uri: resource.uri,
                    name: resource.name,
                    description: resource.description,
                    mimeType: resource.mimeType,
                })),
            };
        }
        catch (_error) {
            const errorMessage = _error instanceof Error ? _error.message : String(_error);
            throw new Error(`Failed to list resources: ${errorMessage}`);
        }
    });
    // Handle resource reading
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
        try {
            // Find the matching resource
            const resource = resources.find(r => r.uri === uri);
            if (!resource) {
                // Provide helpful error with available resources
                const availableUris = resources.map(r => r.uri).join(', ');
                throw new Error(`Resource not found: ${uri}\n\n` +
                    `Available resources:\n${availableUris}\n\n` +
                    `Please check the URI and try again.`);
            }
            // Call the resource's read method
            return await resource.read();
        }
        catch (_error) {
            // If it's already our formatted error, re-throw it
            if (_error instanceof Error && _error.message.includes('Resource not found:')) {
                throw _error;
            }
            // Otherwise, wrap it with context
            const errorMessage = _error instanceof Error ? _error.message : String(_error);
            throw new Error(`Failed to read resource '${uri}': ${errorMessage}`);
        }
    });
}
