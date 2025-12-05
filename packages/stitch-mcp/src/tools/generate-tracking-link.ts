import { z } from "zod";

const STITCH_URL = process.env.STITCH_URL || "http://localhost:3000";

// Input validation schema
const GenerateTrackingLinkParamsSchema = z.object({
    canvasId: z.string().min(1, "Canvas ID is required"),
    utmSource: z.string().min(1, "UTM source is required (e.g., 'linkedin', 'facebook', 'email')"),
    utmCampaign: z.string().optional(),
    utmMedium: z.string().optional(),
    utmContent: z.string().optional(),
    utmTerm: z.string().optional(),
    redirectTo: z.string().optional(),
    landingPath: z.string().optional(),
    createEntity: z.boolean().optional().default(true)
});

type GenerateTrackingLinkParams = z.infer<typeof GenerateTrackingLinkParamsSchema>;

/**
 * Generate a tracking link for marketing campaigns
 * 
 * This creates a unique tracking URL with UTM parameters that can be shared
 * on social media, emails, or other marketing channels. When someone clicks
 * the link, Stitch will track them as a lead/entity.
 */
async function generateTrackingLink(params: GenerateTrackingLinkParams) {
    // Validate parameters
    const validated = GenerateTrackingLinkParamsSchema.parse(params);

    // Build the tracking URL
    const baseUrl = STITCH_URL;
    const landingPath = validated.landingPath || '/track';
    const trackingId = `${validated.utmSource}_${validated.utmCampaign || 'default'}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const url = new URL(`${baseUrl}${landingPath}`);
    url.searchParams.set('tracking_id', trackingId);
    url.searchParams.set('utm_source', validated.utmSource);
    
    if (validated.utmMedium) url.searchParams.set('utm_medium', validated.utmMedium);
    if (validated.utmCampaign) url.searchParams.set('utm_campaign', validated.utmCampaign);
    if (validated.utmContent) url.searchParams.set('utm_content', validated.utmContent);
    if (validated.utmTerm) url.searchParams.set('utm_term', validated.utmTerm);
    if (validated.redirectTo) url.searchParams.set('redirect_to', validated.redirectTo);

    const trackingUrl = url.toString();

    // Optionally pre-create entity via API
    let entityId: string | undefined;
    if (validated.createEntity) {
        try {
            const response = await fetch(`${STITCH_URL}/api/entities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    canvas_id: validated.canvasId,
                    name: `Lead from ${validated.utmSource}`,
                    entity_type: 'lead',
                    metadata: {
                        source: validated.utmSource,
                        medium: validated.utmMedium,
                        campaign: validated.utmCampaign,
                        content: validated.utmContent,
                        term: validated.utmTerm,
                        tracking_id: trackingId,
                        link_generated_at: new Date().toISOString(),
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                entityId = data.id;
            }
        } catch (error) {
            // Entity creation is optional, continue without it
            console.warn('Failed to pre-create entity:', error);
        }
    }

    return {
        tracking_url: trackingUrl,
        tracking_id: trackingId,
        entity_id: entityId,
        utm_params: {
            source: validated.utmSource,
            medium: validated.utmMedium,
            campaign: validated.utmCampaign,
            content: validated.utmContent,
            term: validated.utmTerm,
        },
        instructions: [
            "Share this tracking URL on your marketing channels",
            "When someone clicks it, they'll be tracked as a lead in Stitch",
            `The link redirects to: ${validated.redirectTo || 'your home page'}`,
            "View tracked leads in the Stitch canvas entities panel"
        ]
    };
}

export const generateTrackingLinkTool = {
    name: "stitch_generate_tracking_link",
    description: "Generate a tracking link with UTM parameters for marketing campaigns. Creates a unique URL that tracks visitors as leads/entities when clicked.",
    inputSchema: {
        type: "object",
        properties: {
            canvasId: {
                type: "string",
                description: "Canvas ID to associate tracked entities with"
            },
            utmSource: {
                type: "string",
                description: "UTM source parameter (e.g., 'linkedin', 'facebook', 'email', 'twitter')"
            },
            utmCampaign: {
                type: "string",
                description: "UTM campaign parameter (e.g., 'demo_call', 'product_launch', 'webinar')"
            },
            utmMedium: {
                type: "string",
                description: "UTM medium parameter (e.g., 'social', 'cpc', 'email', 'organic')"
            },
            utmContent: {
                type: "string",
                description: "UTM content parameter for A/B testing (e.g., 'button_blue', 'header_v2')"
            },
            utmTerm: {
                type: "string",
                description: "UTM term parameter for paid search keywords"
            },
            redirectTo: {
                type: "string",
                description: "URL to redirect to after tracking (e.g., '/demo', 'https://calendly.com/...')"
            },
            landingPath: {
                type: "string",
                description: "Landing page path (default: '/track')"
            },
            createEntity: {
                type: "boolean",
                description: "Whether to pre-create an entity for tracking (default: true)"
            }
        },
        required: ["canvasId", "utmSource"]
    },
    handler: async (params: any) => {
        try {
            const result = await generateTrackingLink(params);
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                throw new Error(`Validation error: ${errorMessages}`);
            }
            throw error;
        }
    }
};
