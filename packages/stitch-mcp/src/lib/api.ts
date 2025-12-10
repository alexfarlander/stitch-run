// z import removed as unused

const STITCH_URL = process.env.STITCH_URL || "http://localhost:3000";
const STITCH_API_KEY = process.env.STITCH_API_KEY;

/**
 * Custom error class for Stitch API errors
 * Includes status code and detailed error information
 */
export class StitchAPIError extends Error {
    constructor(
        public statusCode: number,
        public statusText: string,
        public responseBody: string,
        public url: string
    ) {
        super(`Stitch API error (${statusCode} ${statusText}): ${responseBody}`);
        this.name = "StitchAPIError";
    }
}

/**
 * Custom error class for network errors
 * Provides user-friendly messages for connection issues
 */
export class StitchNetworkError extends Error {
    constructor(
        public url: string,
        public originalError: Error
    ) {
        super(`Network error connecting to Stitch at ${url}: ${originalError.message}`);
        this.name = "StitchNetworkError";
    }
}

/**
 * Make an authenticated request to the Stitch API
 * 
 * @param path - API endpoint path (e.g., "/api/canvas/123/nodes")
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws {Error} If STITCH_API_KEY is not set
 * @throws {StitchAPIError} If the API returns an error response
 * @throws {StitchNetworkError} If a network error occurs
 */
export async function stitchRequest(path: string, options: RequestInit = {}) {
    if (!STITCH_API_KEY) {
        throw new Error(
            "STITCH_API_KEY environment variable is not set. " +
            "Please configure your API key in the MCP server environment."
        );
    }

    const url = `${STITCH_URL}${path}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${STITCH_API_KEY}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            // Try to parse error response as JSON first
            let errorBody: string;
            const contentType = response.headers.get("content-type");
            
            if (contentType?.includes("application/json")) {
                try {
                    const errorJson = await response.json();
                    errorBody = JSON.stringify(errorJson, null, 2);
                } catch {
                    errorBody = await response.text();
                }
            } else {
                errorBody = await response.text();
            }
            
            throw new StitchAPIError(
                response.status,
                response.statusText,
                errorBody,
                url
            );
        }

        return response.json();
    } catch (_error) {
        // If it's already a StitchAPIError, re-throw it
        if (_error instanceof StitchAPIError) {
            throw _error;
        }

        // If it's a network error (fetch failed), wrap it
        if (_error instanceof Error) {
            throw new StitchNetworkError(url, _error);
        }

        // Unknown error type
        throw new Error(`Unexpected error calling Stitch API: ${String(_error)}`);
    }
}
